import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './backend/routes';
import firebaseConfig from './firebase-applet-config.json';

// Set GOOGLE_CLOUD_PROJECT early to ensure Firebase Admin SDK uses the correct project ID
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard Middlewares
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

  // API Routes
  app.use('/api', apiRoutes);

  // Image Proxy (Bypass Referrer restrictions)
  app.get('/api/proxy-image', async (req, res) => {
    let imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('URL is required');
    }

    // Normalize URL
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
    if (!imageUrl.startsWith('http')) imageUrl = 'https://' + imageUrl;

    try {
      const axios = (await import('axios')).default;
      const https = await import('https');
      
      const fetchImage = async (url: string, referer: string = '') => {
        return await axios.get(url, {
          responseType: 'arraybuffer',
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': referer || new URL(url).origin,
          },
          timeout: 20000,
          maxRedirects: 5,
          validateStatus: (status) => status < 500,
        });
      };

      let referer = '';
      const urlObj = new URL(imageUrl);
      if (imageUrl.includes('alicdn.com') || imageUrl.includes('1688.com')) {
        referer = 'https://www.1688.com/';
      } else if (imageUrl.includes('amazon.com')) {
        referer = 'https://www.amazon.com/';
      } else if (imageUrl.includes('daraz.com')) {
        referer = 'https://www.daraz.com.bd/';
      } else if (imageUrl.includes('slatic.net') || imageUrl.includes('laz-img')) {
        referer = 'https://www.daraz.com.bd/';
      } else {
        referer = urlObj.origin;
      }

      let response = await fetchImage(imageUrl, referer);
      
      // If 404 and it's an SSLCommerz URL, try different versions
      if (response.status === 404 && imageUrl.includes('sslcommerz.com')) {
        const versions = ['03', '02', '05', '01'];
        const currentVersionMatch = imageUrl.match(/All-Size-(\d+)\.png/);
        const currentVersion = currentVersionMatch ? currentVersionMatch[1] : '';
        
        for (const version of versions) {
          if (version === currentVersion) continue;
          const fallbackUrl = imageUrl.replace(/All-Size-\d+\.png/, `All-Size-${version}.png`);
          console.log(`Proxy: 404 on SSLCommerz ${currentVersion}, trying fallback: ${version}`);
          const fallbackResponse = await fetchImage(fallbackUrl, referer);
          if (fallbackResponse.status === 200) {
            response = fallbackResponse;
            break;
          }
        }
      }

      // If 404 and it's an alicdn URL, try different subdomains and patterns
      if (response.status === 404 && imageUrl.includes('alicdn.com')) {
        const subdomains = ['img.alicdn.com', 'cbu01.alicdn.com', 'gw.alicdn.com', 'ae01.alicdn.com'];
        const currentSubdomain = subdomains.find(s => imageUrl.includes(s));
        
        for (const subdomain of subdomains) {
          if (subdomain === currentSubdomain) continue;
          const fallbackUrl = imageUrl.replace(currentSubdomain || 'cbu01.alicdn.com', subdomain);
          console.log(`Proxy: 404 on ${currentSubdomain}, trying fallback: ${subdomain}`);
          const fallbackResponse = await fetchImage(fallbackUrl, referer);
          if (fallbackResponse.status === 200) {
            response = fallbackResponse;
            break;
          }
        }
      }

      if (response.status !== 200) {
        console.error(`Image proxy error: Source returned ${response.status} for URL: ${imageUrl}`);
        return res.redirect(`https://picsum.photos/seed/${encodeURIComponent(imageUrl.slice(-10))}/600/800`);
      }

      const contentType = response.headers['content-type'] || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
      res.send(Buffer.from(response.data));
    } catch (error: any) {
      console.error('Image proxy error:', error.message, 'URL:', imageUrl);
      res.redirect(`https://picsum.photos/seed/${encodeURIComponent(imageUrl.slice(-10))}/600/800`);
    }
  });
  
  // 404 for API routes - Move this here to catch all unmatched /api/* routes
  app.all('/api/*', (req, res) => {
    console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
  });
  
  // PWA Direct Routes (Ensures PWABuilder can find them)
  app.get('/manifest.json', (req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.send({
      "name": "MJ ONLINE SHOP BD",
      "short_name": "MJ SHOP",
      "description": "Premium Online Shop in Bangladesh. Quality products, fast delivery, and secure payments.",
      "theme_color": "#10b981",
      "background_color": "#ffffff",
      "display": "standalone",
      "orientation": "portrait",
      "scope": "/",
      "start_url": "/",
      "icons": [
        {
          "src": "https://picsum.photos/seed/mjshop/192/192",
          "sizes": "192x192",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "https://picsum.photos/seed/mjshop/512/512",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "any"
        },
        {
          "src": "https://picsum.photos/seed/mjshop/512/512",
          "sizes": "512x512",
          "type": "image/png",
          "purpose": "maskable"
        }
      ]
    });
  });

  app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`
      self.addEventListener('install', (e) => { self.skipWaiting(); });
      self.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request)); });
    `);
  });
  
  // Serve Public Folder
  app.use(express.static(path.join(process.cwd(), 'public')));
  
  // Serve Uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Static serving for production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Error Handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err);
    res.status(err.status || 500).json({
      message: err.message || 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? err : {}
    });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`API documentation available at http://localhost:${PORT}/api/health`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
