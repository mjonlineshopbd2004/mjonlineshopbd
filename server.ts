import dotenv from 'dotenv';
// Load environment variables at the absolute top before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import https from 'https';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './backend/routes';
import fs from 'fs';

// Load firebase config manually to avoid ESM import issues with JSON
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

import * as scraperController from './backend/controllers/scraperController';
import { authenticate } from './backend/middleware/auth';

// Set GOOGLE_CLOUD_PROJECT early to ensure Firebase Admin SDK uses the correct project ID
process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Standard Middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Log request details including size for debugging
  app.use((req, res, next) => {
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const sizeMB = (parseInt(contentLength) / (1024 * 1024)).toFixed(2);
      if (req.url.includes('/upload')) {
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Size: ${sizeMB} MB`);
      }
    }
    next();
  });

  console.log('GEMINI_API_KEY present:', !!process.env.GEMINI_API_KEY);

  // API Routes
  console.log('Registering API routes...');
  app.use('/api', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] API Request: ${req.method} ${req.url}`);
    console.log('Headers:', JSON.stringify(req.headers));
    next();
  }, apiRoutes);

  // Scraper Route (Directly in server.ts for priority and reliability)
  app.post('/api/scraper/product', authenticate, scraperController.scrapeProduct);

  // Image Proxy (Bypass Referrer restrictions)
  app.get('/api/proxy-image', async (req, res) => {
    let imageUrl = req.query.url as string;
    if (!imageUrl) {
      return res.status(400).send('URL is required');
    }

    // Normalize URL
    if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
    if (!imageUrl.startsWith('http')) imageUrl = 'https://' + imageUrl;

    const serveFallback = () => {
      const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(imageUrl.slice(-10))}/600/800`;
      res.redirect(fallbackUrl);
    };

    try {
      const fetchImage = async (url: string, referer: string = '') => {
        let origin = '';
        try {
          origin = new URL(url).origin;
        } catch (e) {
          origin = '';
        }

        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': referer || origin,
        };

        const response = await fetch(url, {
          headers,
          signal: AbortSignal.timeout(5000), // Reduced from 8000 to fit Vercel 10s limit
          redirect: 'follow',
        });

        return response;
      };

      let referer = '';
      if (imageUrl.includes('alicdn.com') || imageUrl.includes('1688.com')) {
        referer = 'https://www.1688.com/';
      } else if (imageUrl.includes('amazon.com')) {
        referer = 'https://www.amazon.com/';
      } else if (imageUrl.includes('daraz.com') || imageUrl.includes('slatic.net') || imageUrl.includes('laz-img')) {
        referer = 'https://www.daraz.com.bd/';
      } else if (imageUrl.includes('facebook.com') || imageUrl.includes('fbcdn.net')) {
        referer = 'https://www.facebook.com/';
      } else if (imageUrl.includes('googleusercontent.com')) {
        referer = 'https://www.google.com/';
      }

      let response = await fetchImage(imageUrl, referer);
      
      // If 404 and it's an alicdn URL, try different subdomains and patterns
      if (response.status === 404 && imageUrl.includes('alicdn.com')) {
        const subdomains = ['img.alicdn.com', 'cbu01.alicdn.com', 'gw.alicdn.com', 'ae01.alicdn.com'];
        const currentSubdomain = subdomains.find(s => imageUrl.includes(s));
        
        for (const subdomain of subdomains) {
          if (subdomain === currentSubdomain) continue;
          const altUrl = imageUrl.replace(currentSubdomain || 'cbu01.alicdn.com', subdomain);
          try {
            const altResponse = await fetchImage(altUrl, referer);
            if (altResponse.ok) {
              response = altResponse;
              break;
            }
          } catch (e) {
            // Ignore fallback errors
          }
        }
      }

      if (!response.ok) {
        console.error(`Image proxy error: Source returned ${response.status} for URL: ${imageUrl}`);
        return serveFallback();
      }

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24h
      
      const arrayBuffer = await response.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
    } catch (error: any) {
      console.error('Image proxy error:', error.message, 'URL:', imageUrl);
      serveFallback();
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
  const isVercel = !!process.env.VERCEL;
  const uploadDir = isVercel ? os.tmpdir() : path.join(process.cwd(), 'uploads');
  app.use('/uploads', express.static(uploadDir));

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString(), vercel: !!process.env.VERCEL });
  });

  app.get('/api/test-proxy', (req, res) => {
    res.json({ message: 'Proxy is reachable', env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
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
    console.error(`[${new Date().toISOString()}] Server error:`, err);
    
    // Always return JSON for API requests
    if (req.path.startsWith('/api/')) {
      const status = err.status || err.statusCode || 500;
      
      // Handle Multer errors specifically
      if (err.name === 'MulterError') {
        return res.status(400).json({
          message: 'File upload error',
          error: err.message,
          code: err.code
        });
      }

      return res.status(status).json({
        message: err.message || 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : {},
        path: req.path
      });
    }

    // For non-API requests, let the default handler or Vite handle it
    next(err);
  });

  // Only listen if not in a serverless environment (like Vercel)
  if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`API documentation available at http://localhost:${PORT}/api/health`);
    });
  }
  
  return app;
}

let cachedApp: any = null;

export const appPromise = (async () => {
  if (cachedApp) return cachedApp;
  cachedApp = await startServer();
  return cachedApp;
})();

// For Vercel, we need to export the app directly
// Since startServer is async, we'll handle it in api/index.ts
