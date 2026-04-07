import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { googleDriveService } from '../services/googleDriveService';
import { firebaseStorageService } from '../services/firebaseStorageService';
import { getDb } from '../config/firebase';

let lastConfigFetch = 0;
const CONFIG_CACHE_TTL = 30 * 1000; // 30 seconds (reduced from 5 mins for better responsiveness)

export const ensureDriveConfigured = async (forceRefresh = false) => {
  try {
    const now = Date.now();
    const isAlreadyConfigured = googleDriveService.isConfigured();
    
    // If already configured and cache is fresh, skip entirely
    if (!forceRefresh && isAlreadyConfigured && (now - lastConfigFetch < CONFIG_CACHE_TTL)) {
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

    // 1. Try Firebase Storage first (Preferred)
    try {
      console.log('Attempting Firebase Storage upload...');
      const firebaseUrl = await firebaseStorageService.uploadFile(
        req.file.path,
        req.file.originalname,
        req.file.mimetype
      );

      if (firebaseUrl) {
        console.log('Firebase Storage upload successful:', firebaseUrl);
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(200).json({ url: firebaseUrl });
      }
    } catch (firebaseError) {
      console.warn('Firebase Storage upload failed, trying Google Drive:', firebaseError);
    }

    await ensureDriveConfigured();

    // 2. Fallback to Google Drive
    if (googleDriveService.isConfigured()) {
      try {
        console.log('Attempting Google Drive upload...');
        const driveUrl = await googleDriveService.uploadFile(
          req.file.path,
          req.file.filename,
          req.file.mimetype
        );

        if (driveUrl) {
          console.log('Google Drive upload successful:', driveUrl);
          // Delete local file after upload to Drive
          if (fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
          }
          return res.status(200).json({ url: driveUrl });
        }
      } catch (driveError: any) {
        console.warn('Google Drive upload failed, falling back to local storage:', driveError.message);
      }
    } else {
      console.log('Google Drive not configured, falling back to local storage.');
    }

    // 3. Fallback to local storage (Last resort)
    console.log('Using local storage fallback for file:', req.file.filename);
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

    const fileUrls = [];

    for (const file of files) {
      let uploadedUrl = null;

      // 1. Try Firebase Storage
      try {
        uploadedUrl = await firebaseStorageService.uploadFile(
          file.path,
          file.originalname,
          file.mimetype
        );
      } catch (firebaseError) {
        console.error('Firebase Storage upload failed for file:', file.filename, firebaseError);
      }

      // 2. Try Google Drive if Firebase failed
      if (!uploadedUrl) {
        await ensureDriveConfigured();
        if (googleDriveService.isConfigured()) {
          try {
            uploadedUrl = await googleDriveService.uploadFile(
              file.path,
              file.filename,
              file.mimetype
            );
          } catch (driveError) {
            console.error('Google Drive upload failed for file:', file.filename, driveError);
          }
        }
      }

      if (uploadedUrl) {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        fileUrls.push(uploadedUrl);
      } else {
        // 3. Fallback to local
        fileUrls.push(`/uploads/${file.filename}`);
      }
    }

    res.status(200).json({ urls: fileUrls });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading files' });
  }
};
