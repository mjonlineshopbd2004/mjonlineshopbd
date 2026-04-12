import { getStorageInstance } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class FirebaseStorageService {
  public async uploadFile(filePath: string, fileName: string, mimeType: string): Promise<string | null> {
    const storage = getStorageInstance();
    let bucket = storage.bucket();
    const destination = `products/${uuidv4()}_${fileName}`;
    
    const performUpload = async (targetBucket: any) => {
      console.log(`Attempting Firebase Storage upload to bucket: ${targetBucket.name}, destination: ${destination}`);
      const file = targetBucket.file(destination);
      const fileBuffer = fs.readFileSync(filePath);
      
      await file.save(fileBuffer, {
        metadata: { contentType: mimeType },
        resumable: false,
      });

      try {
        await file.makePublic();
      } catch (e) {
        console.warn('Could not make file public, continuing anyway.');
      }

      return `https://storage.googleapis.com/${targetBucket.name}/${destination}`;
    };

    try {
      return await performUpload(bucket);
    } catch (error: any) {
      console.error('Initial Firebase Storage upload failed:', error.message);
      
      // If bucket not found, try common fallbacks
      if (error.code === 404 || error.message?.includes('bucket does not exist')) {
        const projectId = process.env.GOOGLE_CLOUD_PROJECT;
        const fallbacks = [
          `${projectId}.appspot.com`,
          `${projectId}.firebasestorage.app`,
          projectId
        ].filter(b => b && b !== bucket.name);

        for (const fallbackName of fallbacks) {
          try {
            console.log(`Trying fallback bucket: ${fallbackName}`);
            const fallbackBucket = storage.bucket(fallbackName as string);
            return await performUpload(fallbackBucket);
          } catch (fallbackError: any) {
            console.warn(`Fallback bucket ${fallbackName} also failed:`, fallbackError.message);
          }
        }
      }

      console.error('All Firebase Storage upload attempts failed.');
      if (error.response) {
        console.error('Firebase Storage API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      return null;
    }
  }

  public async deleteFile(fileUrl: string): Promise<boolean> {
    try {
      const storage = getStorageInstance();
      const bucket = storage.bucket();
      
      // Extract the path from the URL
      // URL format: https://storage.googleapis.com/BUCKET_NAME/products/FILENAME
      const urlParts = fileUrl.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `products/${fileName}`;

      await bucket.file(filePath).delete();
      return true;
    } catch (error) {
      console.error('Error deleting from Firebase Storage:', error);
      return false;
    }
  }
}

export const firebaseStorageService = new FirebaseStorageService();
