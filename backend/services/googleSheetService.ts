import { getDb } from '../config/firebase';

export interface GoogleSheetConfig {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
  enabled: boolean;
}

export const getGoogleSheetConfig = async (): Promise<GoogleSheetConfig | null> => {
  try {
    const dbInstance = getDb();
    const settingsDoc = await dbInstance.collection('settings').doc('googleSheet').get();
    if (!settingsDoc.exists) {
      console.log('Google Sheet settings document not found in Firestore.');
      return null;
    }
    const config = settingsDoc.data() as GoogleSheetConfig;
    console.log('Google Sheet Config fetched:', {
      spreadsheetId: config.spreadsheetId,
      clientEmail: config.clientEmail,
      hasPrivateKey: !!config.privateKey,
      enabled: config.enabled
    });
    return config;
  } catch (error: any) {
    console.error('Error fetching Google Sheet config:', error.message);
    // If it's a permission error, throw it so the caller knows something is wrong with the configuration
    if (error.message.includes('PERMISSION_DENIED') || error.code === 7) {
      throw new Error(`Firestore Permission Denied: The server does not have permission to read your settings. This often happens in remixed apps. Please re-run the Firebase setup from the settings menu. Original error: ${error.message}`);
    }
    return null;
  }
};

const getFormattedKey = (key: string) => {
  if (!key) return '';
  
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
  const base64 = cleaned
    .replace(/-----BEGIN [^-]+-----/g, '')
    .replace(/-----END [^-]+-----/g, '')
    .replace(/\s/g, '');
  
  if (base64.length < 100) {
    console.error(`Google Sheet sync failed: Private key is too short (${base64.length} chars).`);
    return '';
  }

  // 4. Reconstruct the PEM string with strict 64-character wrapping
  const wrappedBase64 = base64.match(/.{1,64}/g)?.join('\n') || base64;
  return `-----BEGIN PRIVATE KEY-----\n${wrappedBase64}\n-----END PRIVATE KEY-----\n`;
};

export const syncOrderToSheet = async (order: any) => {
  const config = await getGoogleSheetConfig();
  if (!config || !config.enabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    console.log('Google Sheet sync is disabled or not configured.');
    return;
  }

  try {
    console.log(`Syncing order ${order.id} to Google Sheet...`);
    const { JWT } = await import('google-auth-library');
    const { GoogleSpreadsheet } = await import('google-spreadsheet');

    const extractId = (id: string) => {
      if (!id) return '';
      const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : id.trim().replace(/^["']|["']$/g, '');
    };
    const sanitizedId = extractId(config.spreadsheetId);
    const formattedKey = getFormattedKey(config.privateKey);
    
    console.log(`Authenticating with Google Sheets API using email: ${config.clientEmail.trim()} for spreadsheet: ${sanitizedId}`);
    const serviceAccountAuth = new JWT({
      email: config.clientEmail.trim(),
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sanitizedId, serviceAccountAuth);
    try {
      await doc.loadInfo();
    } catch (loadError: any) {
      console.error(`Failed to load spreadsheet ${sanitizedId}:`, loadError.message);
      if (loadError.response) {
        console.error('Full Google API Error Response (loadInfo):', JSON.stringify(loadError.response.data, null, 2));
      }
      throw new Error(`Google Sheets Access Denied: The Service Account (${config.clientEmail.trim()}) does not have permission to access spreadsheet ${sanitizedId}. Please ensure you have shared the spreadsheet with this email and granted "Editor" access.`);
    }
    console.log(`Spreadsheet "${doc.title}" loaded.`);

    let sheet = doc.sheetsByTitle['Orders'];
    if (!sheet) {
      console.log('Creating "Orders" sheet...');
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
    }

    const itemsSummary = order.items.map((item: any) => `${item.name} (x${item.quantity})`).join(', ');

    const orderData = {
      'Order ID': order.id,
      'Date': new Date(order.createdAt).toLocaleString(),
      'Customer Name': order.customerName,
      'Phone': order.phone,
      'Address': order.address,
      'Total Amount': order.total,
      'Payment Status': order.paymentStatus,
      'Order Status': order.status,
      'Items': itemsSummary
    };

    const rows = await sheet.getRows();
    const existingRow = rows.find(row => row.get('Order ID') === order.id);

    if (existingRow) {
      Object.assign(existingRow, orderData);
      await existingRow.save();
      console.log(`Order ${order.id} updated successfully in Google Sheet.`);
    } else {
      await sheet.addRow(orderData);
      console.log(`Order ${order.id} added successfully to Google Sheet.`);
    }
  } catch (error: any) {
    console.error('Error syncing order to Google Sheet:', error.message);
    if (error.response) {
      console.error('Full Google API Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) console.error(error.stack);
  }
};

export const syncProductToSheet = async (product: any) => {
  const config = await getGoogleSheetConfig();
  if (!config || !config.enabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return;
  }

  try {
    console.log(`Syncing product ${product.id} to Google Sheet...`);
    const { JWT } = await import('google-auth-library');
    const { GoogleSpreadsheet } = await import('google-spreadsheet');

    const extractId = (id: string) => {
      if (!id) return '';
      const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : id.trim().replace(/^["']|["']$/g, '');
    };
    const sanitizedId = extractId(config.spreadsheetId);
    const formattedKey = getFormattedKey(config.privateKey);
    
    if (!formattedKey) {
      console.error('Sync failed: Invalid private key format.');
      return;
    }

    const serviceAccountAuth = new JWT({
      email: config.clientEmail.trim(),
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sanitizedId, serviceAccountAuth);
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle['Products'];
    if (!sheet) {
      console.log('Creating "Products" sheet...');
      sheet = await doc.addSheet({ 
        title: 'Products', 
        headerValues: [
          'Product ID', 
          'Name', 
          'Price', 
          'Discount Price', 
          'Category', 
          'Stock', 
          'Rating', 
          'Reviews Count', 
          'Images',
          'Last Updated'
        ] 
      });
    }

    const rows = await sheet.getRows();
    const existingRow = rows.find(row => row.get('Product ID') === product.id);

    const productData = {
      'Product ID': product.id,
      'Name': product.name,
      'Price': product.price,
      'Discount Price': product.discountPrice || '',
      'Category': product.category,
      'Stock': product.stock,
      'Rating': product.rating || 0,
      'Reviews Count': product.reviewsCount || 0,
      'Images': (product.images || []).join(', '),
      'Last Updated': new Date().toLocaleString()
    };

    if (existingRow) {
      Object.assign(existingRow, productData);
      await existingRow.save();
    } else {
      await sheet.addRow(productData);
    }

    console.log(`Product ${product.id} synced successfully.`);
  } catch (error: any) {
    console.error('Error syncing product to Google Sheet:', error.message);
    if (error.response) {
      console.error('Full Google API Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    if (error.stack) console.error(error.stack);
  }
};

export const deleteProductFromSheet = async (productId: string) => {
  const config = await getGoogleSheetConfig();
  if (!config || !config.enabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    return;
  }

  try {
    console.log(`Deleting product ${productId} from Google Sheet...`);
    const { JWT } = await import('google-auth-library');
    const { GoogleSpreadsheet } = await import('google-spreadsheet');

    const extractId = (id: string) => {
      if (!id) return '';
      const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : id.trim().replace(/^["']|["']$/g, '');
    };
    const sanitizedId = extractId(config.spreadsheetId);
    const formattedKey = getFormattedKey(config.privateKey);
    
    if (!formattedKey) return;

    const serviceAccountAuth = new JWT({
      email: config.clientEmail.trim(),
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sanitizedId, serviceAccountAuth);
    await doc.loadInfo();

    const sheet = doc.sheetsByTitle['Products'];
    if (!sheet) return;

    const rows = await sheet.getRows();
    const existingRow = rows.find(row => row.get('Product ID') === productId);

    if (existingRow) {
      await existingRow.delete();
      console.log(`Product ${productId} deleted from Google Sheet.`);
    }
  } catch (error: any) {
    console.error('Error deleting product from Google Sheet:', error.message);
  }
};

export const getProductsFromSheet = async () => {
  const config = await getGoogleSheetConfig();
  if (!config || !config.enabled || !config.spreadsheetId || !config.clientEmail || !config.privateKey) {
    console.warn('Google Sheet sync is disabled or not configured in getProductsFromSheet.');
    return null;
  }

  try {
    const { JWT } = await import('google-auth-library');
    const { GoogleSpreadsheet } = await import('google-spreadsheet');

    const extractId = (id: string) => {
      if (!id) return '';
      const match = id.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      return match ? match[1] : id.trim().replace(/^["']|["']$/g, '');
    };
    const sanitizedId = extractId(config.spreadsheetId);
    const formattedKey = getFormattedKey(config.privateKey);
    
    if (!formattedKey) {
      console.error('Invalid private key format in getProductsFromSheet.');
      return null;
    }

    console.log(`Authenticating with Google Sheets API for product sync using email: ${config.clientEmail.trim()} for spreadsheet: ${sanitizedId}`);
    const serviceAccountAuth = new JWT({
      email: config.clientEmail.trim(),
      key: formattedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const doc = new GoogleSpreadsheet(sanitizedId, serviceAccountAuth);
    console.log('Loading spreadsheet info for product sync...');
    await doc.loadInfo();

    let sheet = doc.sheetsByTitle['Products'];
    
    // If sheet doesn't exist, create it with headers to help the user
    if (!sheet) {
      console.log('Sheet "Products" not found. Creating it with default headers...');
      sheet = await doc.addSheet({ 
        title: 'Products', 
        headerValues: [
          'Product ID', 
          'Name', 
          'Price', 
          'Discount Price', 
          'Category', 
          'Stock', 
          'Rating', 
          'Reviews Count', 
          'Images',
          'Last Updated'
        ] 
      });
      
      // Add a sample row
      await sheet.addRow({
        'Product ID': 'SAMPLE-001',
        'Name': 'Sample Product Name',
        'Price': 1000,
        'Discount Price': 800,
        'Category': 'Men',
        'Stock': 10,
        'Rating': 5,
        'Reviews Count': 1,
        'Images': 'https://picsum.photos/800/1000',
        'Last Updated': new Date().toLocaleString()
      });
      
      throw new Error('The "Products" sheet was missing. I have created it for you in your Google Sheet. Please fill it with your product data and try syncing again.');
    }

    console.log('Fetching rows from "Products" sheet...');
    const rows = await sheet.getRows();
    
    if (rows.length === 0) {
      throw new Error('The "Products" sheet is empty. Please add some products to the sheet first.');
    }

    console.log(`Fetched ${rows.length} rows from sheet.`);

    return rows.map(row => ({
      id: row.get('Product ID') || `P-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: row.get('Name') || 'Unnamed Product',
      price: Number(row.get('Price')) || 0,
      discountPrice: row.get('Discount Price') ? Number(row.get('Discount Price')) : undefined,
      category: row.get('Category') || 'Uncategorized',
      stock: Number(row.get('Stock')) || 0,
      rating: Number(row.get('Rating') || 0),
      reviewsCount: Number(row.get('Reviews Count') || 0),
      images: row.get('Images') ? row.get('Images').split(',').map((s: string) => s.trim()) : [],
      createdAt: row.get('Last Updated') || new Date().toISOString()
    }));
  } catch (error: any) {
    console.error('Error fetching products from Google Sheet:', error.message);
    if (error.response) {
      console.error('Full Google API Error Response:', JSON.stringify(error.response.data, null, 2));
    }
    throw error; // Rethrow to catch in controller
  }
};
