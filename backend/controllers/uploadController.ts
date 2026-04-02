import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { googleDriveService } from '../services/googleDriveService';
import { getDb } from '../config/firebase';

let lastConfigFetch = 0;
const CONFIG_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const ensureDriveConfigured = async () => {
  try {
    const now = Date.now();
    const isAlreadyConfigured = googleDriveService.isConfigured();
    
    // If already configured and cache is fresh, skip entirely
    if (isAlreadyConfigured && (now - lastConfigFetch < CONFIG_CACHE_TTL)) {
      return;
    }

    // Attempt to fetch settings from Firestore
    // We do this to allow UI-based configuration to override environment variables
    const dbInstance = getDb();
    const settingsDoc = await dbInstance.collection('settings').doc('googleSheet').get().catch(async (err: any) => {
      // Only log as warning if we already have a working config from env vars
      if (isAlreadyConfigured) {
        console.warn('Could not refresh Google Drive settings from primary Firestore (Permission Denied). Using existing configuration.');
        return { exists: false } as any;
      }
      
      console.warn('Primary Firestore fetch failed, trying fallback to default database:', err.message);
      try {
        const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore');
        const defaultDb = getAdminFirestore();
        return await defaultDb.collection('settings').doc('googleSheet').get();
      } catch (fallbackErr: any) {
        if (!isAlreadyConfigured) {
          console.error('Fallback Firestore fetch also failed:', fallbackErr.message);
        }
        return { exists: false } as any;
      }
    });

    if (settingsDoc.exists) {
      const { clientEmail, privateKey, driveFolderId } = settingsDoc.data() || {};
      if (clientEmail && privateKey) {
        googleDriveService.setConfig(clientEmail, privateKey, driveFolderId || '');
        lastConfigFetch = now;
      }
    } else if (!isAlreadyConfigured) {
      // If Firestore fetch failed/doc doesn't exist AND we aren't configured via env
      console.log('Google Drive settings not found in Firestore and not configured via environment variables.');
    }
  } catch (error) {
    // Only log critical errors if we don't have any working configuration
    if (!googleDriveService.isConfigured()) {
      console.error('Error ensuring Google Drive configuration:', error);
    }
  }
};

export const uploadFile = async (req: Request, res: Response) => {
  console.log('uploadFile controller reached');
  try {
    if (!req.file) {
      console.warn('No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }
    console.log('File received:', req.file.originalname, 'Size:', req.file.size);

    await ensureDriveConfigured();

    // If Google Drive is configured, upload to Drive
    if (googleDriveService.isConfigured()) {
      try {
        const driveUrl = await googleDriveService.uploadFile(
          req.file.path,
          req.file.filename,
          req.file.mimetype
        );

        if (driveUrl) {
          // Delete local file after upload to Drive
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(200).json({ url: driveUrl });
        }
      } catch (driveError) {
        console.error('Google Drive upload failed:', driveError);
      }
    }

    // Fallback to local storage
    const fileUrl = `/uploads/${req.file.filename}`;
    res.status(200).json({ url: fileUrl });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
};

export const uploadMultipleFiles = async (req: Request, res: Response) => {
  console.log('uploadMultipleFiles controller reached');
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      console.warn('No files in request');
      return res.status(400).json({ message: 'No files uploaded' });
    }
    console.log('Files received:', files.length, 'Total size:', files.reduce((acc, f) => acc + f.size, 0));

    await ensureDriveConfigured();

    const fileUrls = [];

    for (const file of files) {
      try {
        if (googleDriveService.isConfigured()) {
          const driveUrl = await googleDriveService.uploadFile(
            file.path,
            file.filename,
            file.mimetype
          );

          if (driveUrl) {
            if (fs.existsSync(file.path)) {
              fs.unlinkSync(file.path);
            }
            fileUrls.push(driveUrl);
            continue;
          }
        }
      } catch (driveError) {
        console.error('Google Drive upload failed for file:', file.filename, driveError);
      }
      
      fileUrls.push(`/uploads/${file.filename}`);
    }

    res.status(200).json({ urls: fileUrls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
};
