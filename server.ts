import dotenv from 'dotenv';
// Load environment variables at the absolute top before any other imports
dotenv.config();

import express from 'express';
import cors from 'cors';
import path from 'path';
import https from 'https';
import os from 'os';
import { createServer as createViteServer } from 'vite';
import apiRoutes from './backend/routes/index.ts';
import fs from 'fs';

// Load firebase config manually to avoid ESM import issues with JSON
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  } else {
    console.warn('firebase-applet-config.json not found. Using environment variables.');
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT
    };
  }
} catch (e) {
  console.error('Error loading firebase config:', e);
}

import * as scraperController from './backend/controllers/scraperController.ts';
import { authenticate } from './backend/middleware/auth.ts';

// Set GOOGLE_CLOUD_PROJECT early to ensure Firebase Admin SDK uses the correct project ID
if (firebaseConfig.projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Standard Middlewares
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
  }));
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
    const start = Date.now();
    console.log(`[${new Date().toISOString()}] API Request: ${req.method} ${req.url}`);
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`[${new Date().toISOString()}] API Response: ${req.method} ${req.url} - Status: ${res.statusCode} - Duration: ${duration}ms`);
    });
    
    next();
  }, apiRoutes);

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
      const transparentPixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(transparentPixel);
    };

    try {
      const fetchImage = async (url: string, referer: string = '', useDefaultHeaders: boolean = true) => {
        let origin = '';
        try {
          origin = new URL(url).origin;
        } catch (e) {
          origin = '';
        }

        const headers: Record<string, string> = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        };

        if (referer) {
          headers['Referer'] = referer;
        } else if (useDefaultHeaders) {
          headers['Referer'] = origin;
        }

        try {
          let response = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(15000),
            redirect: 'follow',
          });

          if (!response.ok && response.status !== 404) {
            // Try one more time with NO referer if it failed
            const { Referer, ...headersWithoutReferer } = headers;
            response = await fetch(url, {
              headers: headersWithoutReferer,
              signal: AbortSignal.timeout(10000),
            });
          }

          return response;
        } catch (e) {
          try {
            return await fetch(url, { signal: AbortSignal.timeout(10000) });
          } catch (err) {
            return { ok: false, status: 500 } as any;
          }
        }
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
      } else if (imageUrl.includes('vecteezy.com')) {
        referer = 'https://www.vecteezy.com/';
      } else if (imageUrl.includes('tblbd.com')) {
        referer = 'https://www.tblbd.com/';
      } else if (imageUrl.includes('githubusercontent.com')) {
        referer = 'https://github.com/';
      }

      let response = await fetchImage(imageUrl, referer);
      
      // If 403 or 401, try without referer and minimal headers
      if ((response.status === 403 || response.status === 401) && !imageUrl.includes('alicdn.com')) {
        const retryResponse = await fetchImage(imageUrl, '', false);
        if (retryResponse.ok) {
          response = retryResponse;
        }
      }

      // If still 404 and it's an alicdn URL, try different subdomains
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
        
        // If it's a 403/401, try a final attempt with NO headers at all
        if (response.status === 403 || response.status === 401) {
          try {
            const finalResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
            if (finalResponse.ok) {
              response = finalResponse;
            }
          } catch (e) {}
        }
        
        if (!response.ok) return serveFallback();
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

  app.get('/api/firebase-check', async (req, res) => {
    try {
      const { testFirestoreConnection } = await import('./backend/config/firebase.ts');
      const result = await testFirestoreConnection();
      res.json({
        message: 'Firebase check completed',
        ...result,
        env: {
          GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
          HAS_SERVICE_ACCOUNT: !!process.env.FIREBASE_SERVICE_ACCOUNT,
          HAS_ADC: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
        }
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/test-proxy', (req, res) => {
    res.json({ message: 'Proxy is reachable', env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
  });

  // 404 for API routes - Move this here to catch all unmatched /api/* routes
  app.all('/api/*', (req, res) => {
    console.warn(`API route not found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ message: `API route not found: ${req.originalUrl}` });
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
