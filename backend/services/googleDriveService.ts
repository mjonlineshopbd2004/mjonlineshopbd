import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const SCOPES = ['https://www.googleapis.com/auth/drive'];

export class GoogleDriveService {
  private drive: any = null;
  private currentConfig: { email: string; key: string; folderId: string } | null = null;
  private lastConfigUpdate = 0;

  constructor() {
    this.initializeFromEnv();
  }

  public getConfig() {
    return this.currentConfig;
  }

  private initializeFromEnv() {
    try {
      const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
      let privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
      const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

      if (clientEmail && privateKey) {
        this.setConfig(clientEmail, privateKey, folderId || '');
      }
    } catch (error) {
      console.error('Failed to initialize Google Drive client from env:', error);
    }
  }

  public setConfig(email: string, key: string, folderId: string) {
    if (!email || !key) {
      console.warn('Attempted to set Google Drive config with missing email or key');
      return;
    }

    try {
      // Avoid re-initializing if config is identical
      if (this.currentConfig && 
          this.currentConfig.email === email && 
          this.currentConfig.folderId === folderId &&
          this.drive !== null) {
        return;
      }

      let privateKey = key.trim().replace(/^["']|["']$/g, '');
      privateKey = privateKey.replace(/\\n/g, '\n');

      // Clean folder ID - extract from URL if user pasted the whole link
      let cleanFolderId = (folderId || '').trim().replace(/^["']|["']$/g, '');
      if (cleanFolderId.includes('/folders/')) {
        const match = cleanFolderId.match(/\/folders\/([a-zA-Z0-9-_]+)/);
        if (match) cleanFolderId = match[1];
      }

      // Ensure proper PEM format
      if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
        const base64 = privateKey.replace(/\s/g, '');
        const wrappedBase64 = base64.match(/.{1,64}/g)?.join('\n') || base64;
        privateKey = `-----BEGIN PRIVATE KEY-----\n${wrappedBase64}\n-----END PRIVATE KEY-----\n`;
      }

      const auth = new google.auth.JWT({
        email: email,
        key: privateKey,
        scopes: SCOPES
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.currentConfig = { email, key: privateKey, folderId: cleanFolderId };
      this.lastConfigUpdate = Date.now();
      console.log('Google Drive Service configured successfully for:', email);
    } catch (error) {
      console.error('Error setting Google Drive config:', error);
      this.drive = null;
    }
  }

  public isConfigured(): boolean {
    return this.drive !== null;
  }

  public async uploadFile(filePath: string, fileName: string, mimeType: string, customFolderId?: string): Promise<string | null> {
    if (!this.drive) return null;

    try {
      const folderId = customFolderId || this.currentConfig?.folderId;
      
      const fileMetadata = {
        name: fileName,
        parents: folderId ? [folderId] : undefined,
      };

      const media = {
        mimeType: mimeType,
        body: fs.createReadStream(filePath),
      };

      const response = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      const fileId = response.data.id;

      // Make the file public (Anyone with the link can view)
      // We don't await this to speed up the response, but we add a catch to log errors
      this.drive.permissions.create({
        fileId: fileId!,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      }).catch((err: any) => {
        console.error(`Error setting permissions for file ${fileId}:`, err.message);
      });

      // Return the direct download link
      return `https://drive.google.com/uc?export=view&id=${fileId}`;
    } catch (error: any) {
      console.error('Error uploading to Google Drive:', error);
      if (error.response) {
        console.error('Full Google API Error Response:', JSON.stringify(error.response.data, null, 2));
      }
      
      const folderId = customFolderId || this.currentConfig?.folderId;
      const email = this.currentConfig?.email;

      if (error.message?.includes('storage quota') || (error.response?.data?.error?.message?.includes('storage quota'))) {
        throw new Error(`Google Drive Quota Error: Service Accounts have 0GB storage quota by default. To fix this, you MUST use a "Shared Drive" (Team Drive) instead of a regular folder, or share the folder from a Google Workspace account that allows service account uploads. Alternatively, consider using Firebase Storage for media.`);
      }

      if (error.message?.includes('File not found') || error.code === 404) {
        throw new Error(`Google Drive Folder not found: ${folderId}. Please ensure you have shared this folder with your Service Account email (${email}) and granted "Editor" access.`);
      }

      if (error.code === 403) {
        throw new Error(`Access Denied to Google Drive Folder: ${folderId}. Please ensure you have shared this folder with your Service Account email (${email}) and granted "Editor" access.`);
      }
      
      throw error;
    }
  }

  public async deleteFile(fileId: string): Promise<boolean> {
    if (!this.drive) return false;

    try {
      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true,
      });
      return true;
    } catch (error) {
      console.error('Error deleting from Google Drive:', error);
      return false;
    }
  }
}

export const googleDriveService = new GoogleDriveService();
