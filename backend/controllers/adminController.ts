import { Request, Response } from 'express';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { getDb } from '../config/firebase';
import { UserProfile, Order, Product } from '../models/types';
import { getProductsFromSheet } from '../services/googleSheetService';
import bcrypt from 'bcryptjs';

interface GoogleSheetSettings {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
  driveFolderId?: string;
  enabled: boolean;
}

export const seedDatabase = async (req: Request, res: Response) => {
  try {
    // 1. Seed Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const adminUser = {
      uid: 'admin_user_id',
      email: 'mjonlineshopbd@gmail.com',
      password: adminPassword,
      displayName: 'Admin MJ',
      role: 'admin',
      createdAt: new Date().toISOString(),
    };
    await getDb().collection('users').doc(adminUser.uid).set(adminUser);

    // 2. Seed Products
    const products = [
      {
        name: 'Premium Cotton Polo Shirt',
        description: 'High-quality 100% cotton polo shirt for men. Comfortable and stylish.',
        price: 1200,
        discountPrice: 990,
        category: 'Men',
        stock: 50,
        images: ['https://picsum.photos/seed/polo/800/1000'],
        rating: 4.5,
        reviewsCount: 12,
        createdAt: new Date().toISOString(),
      },
      {
        name: 'Silk Party Saree',
        description: 'Elegant silk saree with intricate embroidery. Perfect for weddings and parties.',
        price: 4500,
        discountPrice: 3800,
        category: 'Women',
        stock: 20,
        images: ['https://picsum.photos/seed/saree/800/1000'],
        rating: 4.8,
        reviewsCount: 8,
        createdAt: new Date().toISOString(),
      },
      {
        name: 'Wireless Noise Cancelling Earbuds',
        description: 'Premium wireless earbuds with active noise cancellation and 24h battery life.',
        price: 3500,
        discountPrice: 2900,
        category: 'Electronics',
        stock: 30,
        images: ['https://picsum.photos/seed/earbuds/800/1000'],
        rating: 4.7,
        reviewsCount: 25,
        createdAt: new Date().toISOString(),
      }
    ];

    for (const product of products) {
      const id = getDb().collection('products').doc().id;
      await getDb().collection('products').doc(id).set({ ...product, id });
    }

    // 3. Seed Coupons
    const coupons = [
      {
        code: 'WELCOME10',
        discountType: 'percentage',
        value: 10,
        minOrder: 1000,
        expiryDate: '2026-12-31T23:59:59Z',
        active: true,
      },
      {
        code: 'SAVE500',
        discountType: 'fixed',
        value: 500,
        minOrder: 5000,
        expiryDate: '2026-12-31T23:59:59Z',
        active: true,
      }
    ];

    for (const coupon of coupons) {
      const id = getDb().collection('coupons').doc().id;
      await getDb().collection('coupons').doc(id).set({ ...coupon, id });
    }

    res.json({ message: 'Database seeded successfully' });
  } catch (error) {
    console.error('Seeding error:', error);
    res.status(500).json({ message: 'Server error during seeding' });
  }
};

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const usersCount = (await getDb().collection('users').get()).size;
    const productsCount = (await getDb().collection('products').get()).size;
    
    const ordersSnapshot = await getDb().collection('orders').get();
    const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);
    
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((acc, order) => acc + (order.total || 0), 0);
    
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

    res.json({
      totalUsers: usersCount,
      totalProducts: productsCount,
      totalOrders,
      totalRevenue,
      pendingOrders,
      deliveredOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching stats' });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const snapshot = await getDb().collection('users').get();
    const users = snapshot.docs.map(doc => {
      const { password: _, ...userWithoutPassword } = doc.data() as UserProfile;
      return userWithoutPassword;
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

export const updateUserRole = async (req: Request, res: Response) => {
  const { role } = req.body;
  try {
    const userRef = getDb().collection('users').doc(req.params.id);
    const userDoc = await userRef.get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    await userRef.update({ role });
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error updating user' });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await getDb().collection('users').doc(req.params.id).delete();
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

export const getGoogleSheetSettings = async (req: Request, res: Response) => {
  try {
    const settingsDoc = await getDb().collection('settings').doc('googleSheet').get();
    if (!settingsDoc.exists) {
      return res.json({
        spreadsheetId: '',
        clientEmail: '',
        privateKey: '',
        driveFolderId: '',
        enabled: false
      });
    }
    res.json(settingsDoc.data());
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching Google Sheet settings' });
  }
};

export const updateGoogleSheetSettings = async (req: Request, res: Response) => {
  const { spreadsheetId, clientEmail, privateKey, driveFolderId, enabled } = req.body;
  console.log('Updating Google Sheet settings:', { spreadsheetId, clientEmail, driveFolderId, enabled, hasPrivateKey: !!privateKey });
  try {
    await getDb().collection('settings').doc('googleSheet').set({
      spreadsheetId,
      clientEmail,
      privateKey,
      driveFolderId: driveFolderId || '',
      enabled,
      updatedAt: new Date().toISOString()
    });
    res.json({ message: 'Google Sheet settings updated successfully' });
  } catch (error: any) {
    console.error('Error updating Google Sheet settings:', error);
    res.status(500).json({ 
      message: 'Server error updating Google Sheet settings',
      error: error.message 
    });
  }
};

export const testGoogleSheetConnection = async (req: Request, res: Response) => {
  const spreadsheetId = req.body.spreadsheetId?.trim();
  const clientEmail = req.body.clientEmail?.trim();
  const privateKey = req.body.privateKey?.trim();
  
  if (!spreadsheetId || !clientEmail || !privateKey) {
    return res.status(400).json({ message: 'Missing credentials' });
  }

  try {
    const { GoogleSpreadsheet } = await import('google-spreadsheet');
    const { JWT } = await import('google-auth-library');

    // Super-robust key cleaning with enhanced diagnostics
    const getFormattedKey = (key: string) => {
      if (!key) return { key: '', error: 'Private Key is empty. Please paste the key from your JSON file.' };
      
      let cleaned = key.trim();

      // 1. Try to parse as JSON first (handles pasting the whole file)
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.private_key) {
          cleaned = parsed.private_key;
        } else if (parsed.key) {
          cleaned = parsed.key;
        }
      } catch (e) {
        // If not JSON, check if it's a quoted string (common when copying from JSON)
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.substring(1, cleaned.length - 1);
        }
      }
      
      // 2. Handle JSON-escaped newlines (literal \n)
      cleaned = cleaned.replace(/\\n/g, '\n');
      
      // 3. Extract the base64 part by removing ANY headers and all whitespace
      // This is the most reliable way to normalize the key
      const base64 = cleaned
        .replace(/-----BEGIN [^-]+-----/g, '')
        .replace(/-----END [^-]+-----/g, '')
        .replace(/\s/g, '');
      
      // Check if it looks like a private_key_id (usually 40 char hex)
      if (base64.length === 40 && /^[0-9a-fA-F]+$/.test(base64)) {
        return { 
          key: '', 
          error: 'You seem to have pasted the "private_key_id" instead of the "private_key". Please copy the much longer "private_key" value (which starts with "-----BEGIN PRIVATE KEY-----") from your JSON file.' 
        };
      }

      if (base64.length < 100) {
        return { 
          key: '', 
          error: `The provided key seems too short (${base64.length} characters). A valid private key is usually over 1500 characters. Please ensure you copied the entire "private_key" value from your JSON file, not the "private_key_id".` 
        };
      }

      // 4. Reconstruct the PEM string with strict 64-character wrapping
      // OpenSSL 3 is extremely sensitive to this structure
      const wrappedBase64 = base64.match(/.{1,64}/g)?.join('\n') || base64;
      const finalKey = `-----BEGIN PRIVATE KEY-----\n${wrappedBase64}\n-----END PRIVATE KEY-----\n`;
      
      return { key: finalKey };
    };

    const { key: formattedKey, error: keyError } = getFormattedKey(privateKey);

    if (keyError) {
      return res.status(400).json({ message: keyError });
    }

    console.log('--- Google Sheet Connection Test ---');
    console.log('Client Email:', clientEmail);
    console.log('Spreadsheet ID:', spreadsheetId);
    console.log('Key Length:', formattedKey.length);
    console.log('Key Start:', formattedKey.substring(0, 40));
    console.log('------------------------------------');

    const serviceAccountAuth = new JWT({
      email: clientEmail,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Sanitize Spreadsheet ID (extract from URL if needed)
    const extractId = (id: string): { id?: string; error?: string } => {
      if (!id) return { error: 'Spreadsheet ID is required' };
      
      // Check if it's a folder link
      if (id.includes('/drive/folders/') || id.includes('/drive/u/0/folders/')) {
        return { error: 'You provided a Google Drive FOLDER link. Please open a specific Google SHEET and copy its URL instead.' };
      }

      // Check if it's a Google Doc link
      if (id.includes('/document/d/')) {
        return { error: 'You provided a Google DOC link. Please open a Google SHEET (Spreadsheet) and copy its URL instead.' };
      }

      const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      const extracted = match ? match[1] : id.trim().replace(/^["']|["']$/g, '');
      return { id: extracted };
    };
    
    const extractionResult = extractId(spreadsheetId);
    if (extractionResult.error) {
      return res.status(400).json({ message: extractionResult.error });
    }
    const sanitizedId = extractionResult.id!;

    if (sanitizedId.length < 40) {
      return res.status(400).json({ 
        message: `The Spreadsheet ID "${sanitizedId}" seems too short (${sanitizedId.length} characters). A standard Google Spreadsheet ID is exactly 44 characters long. Please copy the FULL ID from the URL of a Google SHEET, not a folder.` 
      });
    }

    const doc = new GoogleSpreadsheet(sanitizedId, serviceAccountAuth);
    console.log('Step 1: Loading spreadsheet info...');
    await doc.loadInfo();
    console.log('Step 1 Success: Spreadsheet info loaded.');

    let sheet = doc.sheetsByTitle['Orders'];
    if (!sheet) {
      console.log('Step 2: Creating "Orders" sheet...');
      sheet = await doc.addSheet({ 
        title: 'Orders', 
        headerValues: [
          'Order ID', 
          'Date', 
          'Customer Name', 
          'Phone', 
          'Address', 
          'Total Amount', 
          'Payment Status', 
          'Order Status', 
          'Items'
        ] 
      });
      console.log('Step 2 Success: "Orders" sheet created.');
    }

    console.log('Step 3: Adding test row...');
    await sheet.addRow({
      'Order ID': 'TEST-123',
      'Date': new Date().toLocaleString(),
      'Customer Name': 'Test User',
      'Phone': '0123456789',
      'Address': 'Test Address',
      'Total Amount': 0,
      'Payment Status': 'pending',
      'Order Status': 'pending',
      'Items': 'Test Item (x1)'
    });
    console.log('Step 3 Success: Test row added.');

    res.json({ 
      message: 'Connection successful! A test row has been added to the "Orders" sheet.',
      sheetTitle: 'Orders',
      spreadsheetName: doc.title
    });
  } catch (error: any) {
    console.error('Test connection error details:', error);
    let errorMessage = error.message || 'Failed to connect to Google Sheet';
    
    if (errorMessage.includes('unsupported') || errorMessage.includes('DECODER')) {
      errorMessage = 'Invalid Private Key format. Please ensure you are using the full "private_key" from your Google Service Account JSON file.';
    } else if (errorMessage.includes('ENOTFOUND')) {
      errorMessage = 'Network error: Could not reach Google APIs. Please check your internet connection.';
    } else if (errorMessage.includes('400')) {
      // Log the full error for debugging
      console.error('Google API 400 Error Details:', JSON.stringify(error.response?.data || error, null, 2));
      errorMessage = 'Invalid request: Please check your Spreadsheet ID. It might be incomplete or incorrect. Also ensure the sheet is not empty or malformed.';
    } else if (errorMessage.includes('403')) {
      errorMessage = 'Access denied: Please make sure you have shared the spreadsheet with the Service Account email and granted "Editor" access.';
    } else if (errorMessage.includes('404')) {
      errorMessage = 'Spreadsheet not found: Please check your Spreadsheet ID.';
    }

    res.status(500).json({ message: errorMessage });
  }
};

export const uploadToDrive = async (req: any, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const settingsDoc = await getDb().collection('settings').doc('googleSheet').get();
    if (!settingsDoc.exists) {
      return res.status(400).json({ message: 'Google Drive settings not found' });
    }

    const { clientEmail, privateKey, driveFolderId } = settingsDoc.data() as GoogleSheetSettings;

    if (!clientEmail || !privateKey || !driveFolderId) {
      return res.status(400).json({ message: 'Google Drive is not fully configured. Please provide Client Email, Private Key, and Folder ID in settings.' });
    }

    const getFormattedKey = (key: string) => {
      if (!key) return '';
      let cleaned = key.trim();
      try {
        const parsed = JSON.parse(cleaned);
        if (parsed.private_key) cleaned = parsed.private_key;
      } catch (e) {}
      cleaned = cleaned.replace(/\\n/g, '\n');
      const base64 = cleaned.replace(/-----BEGIN [^-]+-----/g, '').replace(/-----END [^-]+-----/g, '').replace(/\s/g, '');
      const wrappedBase64 = base64.match(/.{1,64}/g)?.join('\n') || base64;
      return `-----BEGIN PRIVATE KEY-----\n${wrappedBase64}\n-----END PRIVATE KEY-----\n`;
    };

    const formattedKey = getFormattedKey(privateKey);

    const { JWT } = await import('google-auth-library');
    const auth = new JWT({
      email: clientEmail,
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    });

    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
      name: `${Date.now()}-${req.file.originalname}`,
      parents: [driveFolderId],
    };

    const media = {
      mimeType: req.file.mimetype,
      body: fs.createReadStream(req.file.path),
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    // Make the file public so it can be viewed on the website
    await drive.permissions.create({
      fileId: response.data.id!,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Clean up local file
    fs.unlinkSync(req.file.path);

    // Construct a direct link that works for <img> and <video> tags
    const fileId = response.data.id;
    const directLink = `https://drive.google.com/uc?export=view&id=${fileId}`;

    res.json({ 
      id: fileId,
      url: directLink,
      webViewLink: response.data.webViewLink
    });
  } catch (error: any) {
    console.error('Drive upload error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: error.message || 'Failed to upload to Google Drive' });
  }
};

export const syncProductsFromSheet = async (req: Request, res: Response) => {
  try {
    console.log('Starting product sync from Google Sheet...');
    const products = await getProductsFromSheet();
    
    if (products === null) {
      return res.status(400).json({ 
        message: 'Google Sheet sync is not configured or is disabled. Please check your settings and ensure all credentials are provided and the "Enabled" toggle is on.' 
      });
    }

    if (products.length === 0) {
      return res.status(400).json({ message: 'No products found in your Google Sheet. Please ensure your "Products" sheet has data rows below the header.' });
    }

    console.log(`Fetched ${products.length} products. Starting Firestore sync...`);

    // Firestore batch limit is 500. We need to split into multiple batches if needed.
    const BATCH_SIZE = 450;
    let syncedCount = 0;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = getDb().batch();
      const chunk = products.slice(i, i + BATCH_SIZE);
      
      for (const product of chunk) {
        if (!product.id) {
          console.warn('Skipping product without ID:', product.name);
          continue;
        }
        const productRef = getDb().collection('products').doc(product.id);
        batch.set(productRef, product, { merge: true });
        syncedCount++;
      }
      
      console.log(`Committing batch of ${chunk.length} products...`);
      await batch.commit();
    }

    console.log(`Sync completed successfully. ${syncedCount} products updated.`);
    res.json({ message: `Successfully synced ${syncedCount} products from Google Sheet.` });
  } catch (error: any) {
    console.error('Sync error:', error);
    
    // If it's a permission error, provide a very specific guide
    if (error.message.includes('PERMISSION_DENIED') || error.message.includes('Permission Denied')) {
      return res.status(403).json({ 
        message: 'Sync failed: Permission Denied',
        error: 'The server does not have permission to access your settings. This is common in remixed apps. Please go to the "Settings" menu and re-run the Firebase setup to grant the necessary permissions to this new project.'
      });
    }

    res.status(500).json({ 
      message: 'Server error during product sync',
      error: error.message 
    });
  }
};
