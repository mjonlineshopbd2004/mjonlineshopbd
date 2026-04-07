import { getStorageInstance } from '../config/firebase';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export class FirebaseStorageService {
  public async uploadFile(filePath: string, fileName: string, mimeType: string): Promise<string | null> {
    try {
      const storage = getStorageInstance();
      const bucket = storage.bucket();
      const destination = `products/${uuidv4()}_${fileName}`;
      
      const [file] = await bucket.upload(filePath, {
        destination,
        metadata: {
          contentType: mimeType,
        },
      });

      // Make the file public
      await file.makePublic();

      // Return the public URL
      return `https://storage.googleapis.com/${bucket.name}/${destination}`;
    } catch (error: any) {
      console.error('Error uploading to Firebase Storage:', error);
      if (error.response) {
        console.error('Firebase Storage API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      if (error.code) {
        console.error('Firebase Storage Error Code:', error.code);
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
