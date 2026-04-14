import { Router } from 'express';
import * as authController from '../controllers/authController.ts';
import * as productController from '../controllers/productController.ts';
import * as orderController from '../controllers/orderController.ts';
import * as adminController from '../controllers/adminController.ts';
import * as couponController from '../controllers/couponController.ts';
import * as paymentController from '../controllers/paymentController.ts';
import * as uploadController from '../controllers/uploadController.ts';
import * as scraperController from '../controllers/scraperController.ts';
import { authenticate, authorize } from '../middleware/auth.ts';
import { upload } from '../middleware/upload.ts';

const router = Router();

// Auth Routes
router.get('/auth/health', async (req, res) => {
  try {
    const { testFirestoreConnection } = await import('../config/firebase');
    const result = await testFirestoreConnection();
    const resendStatus = !!process.env.RESEND_API_KEY;
    
    res.json({
      firebase: result,
      resend: {
        configured: resendStatus,
        message: resendStatus ? 'API Key present' : 'API Key missing',
        prefix: process.env.RESEND_API_KEY ? process.env.RESEND_API_KEY.substring(0, 5) : null
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/auth/check-email', authController.checkEmail);
router.post('/auth/register', authController.registerUser);
router.post('/auth/login', authController.loginUser);
router.post('/auth/send-otp', authController.sendOTP);
router.post('/auth/verify-register', authController.verifyOTPAndRegister);
router.post('/auth/reset-password', authController.resetPassword);
router.get('/auth/profile', authenticate, authController.getProfile);

// Product Routes
router.get('/products', productController.getAllProducts);
router.get('/products/:id', productController.getSingleProduct);
router.post('/products', authenticate, authorize(['admin']), productController.createProduct);
router.put('/products/:id', authenticate, authorize(['admin']), productController.updateProduct);
router.delete('/products/:id', authenticate, authorize(['admin']), productController.deleteProduct);

// Scraper Routes
router.get('/scraper/status', authenticate, authorize(['admin']), scraperController.getScraperStatus);
router.post('/scraper/product', authenticate, authorize(['admin']), scraperController.scrapeProduct);

// Order Routes
router.get('/orders/next-id', authenticate, orderController.getNextOrderId);
router.post('/orders', authenticate, orderController.createOrder);
router.get('/orders/my', authenticate, orderController.getUserOrders);
router.get('/orders/:id', authenticate, orderController.getOrderById);
router.get('/admin/orders', authenticate, authorize(['admin']), orderController.getAllOrders);
router.put('/admin/orders/:id', authenticate, authorize(['admin']), orderController.updateOrderStatus);

// Admin Routes
router.post('/admin/seed', adminController.seedDatabase);
router.get('/admin/stats', authenticate, authorize(['admin']), adminController.getDashboardStats);
router.get('/admin/users', authenticate, authorize(['admin']), adminController.getAllUsers);
router.put('/admin/users/:id/role', authenticate, authorize(['admin']), adminController.updateUserRole);
router.delete('/admin/users/:id', authenticate, authorize(['admin']), adminController.deleteUser);
router.get('/admin/settings/google-sheet', authenticate, authorize(['admin']), adminController.getGoogleSheetSettings);
router.put('/admin/settings/google-sheet', authenticate, authorize(['admin']), adminController.updateGoogleSheetSettings);
router.post('/admin/settings/google-sheet/test', authenticate, authorize(['admin']), adminController.testGoogleSheetConnection);

// Top-level sync route to avoid proxy blocks
router.post('/sync-products', authenticate, authorize(['admin']), adminController.syncProductsFromSheet);

// Firebase Debug Route
router.get('/admin/test-firebase', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { testFirestoreConnection, getDb } = await import('../config/firebase');
    const result = await testFirestoreConnection();
    
    const db = getDb();
    const settings = await db.collection('settings').doc('googleSheet').get().catch((e: any) => ({ error: e.message }));
    
    res.json({
      status: result.success ? 'success' : 'error',
      connectionTest: result,
      settingsDoc: {
        exists: (settings as any).exists,
        error: (settings as any).error,
        data: (settings as any).exists ? 'REDACTED' : null
      },
      env: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT,
        hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT,
        hasGoogleCreds: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Drive Debug Route
router.get('/admin/test-drive', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { googleDriveService } = await import('../services/googleDriveService');
    const { ensureDriveConfigured } = await import('../controllers/uploadController');
    const { auth, db } = await import('../config/firebase');
    
    // Force refresh configuration from Firestore before testing
    await ensureDriveConfigured(true);
    
    const isConfigured = googleDriveService.isConfigured();
    
    const envStatus = {
      hasEmail: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      hasKey: !!process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
      hasFolderId: !!process.env.GOOGLE_DRIVE_FOLDER_ID,
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? `${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.substring(0, 5)}...` : 'missing',
      folderId: process.env.GOOGLE_DRIVE_FOLDER_ID ? `${process.env.GOOGLE_DRIVE_FOLDER_ID.substring(0, 5)}...` : 'missing',
      firebaseAuth: !!auth,
      firebaseDb: !!db
    };

    if (!isConfigured) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Google Drive is not configured. Check environment variables.',
        env: envStatus
      });
    }

    // Try to list files in the folder to verify access
    try {
      const drive = (googleDriveService as any).drive;
      const folderId = (googleDriveService as any).currentConfig?.folderId;
      const email = (googleDriveService as any).currentConfig?.email;
      
      if (!folderId) {
        throw new Error('Folder ID is missing in configuration');
      }

      console.log(`Testing Drive access for folder: ${folderId} with email: ${email}`);

      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 5,
        fields: 'files(id, name)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
      });

      res.json({ 
        status: 'success', 
        message: 'Google Drive service is initialized and folder access is verified.',
        folderId,
        filesFound: response.data.files?.length || 0,
        files: response.data.files,
        env: envStatus
      });
    } catch (driveError: any) {
      console.error('Drive access verification failed:', driveError);
      
      let message = `Google Drive is initialized but folder access failed: ${driveError.message}`;
      let details = driveError.message;

      if (driveError.message.includes('File not found') || driveError.code === 404) {
        details = `The folder ID "${(googleDriveService as any).currentConfig?.folderId}" was not found or is not accessible. 
          
          FIX:
          1. Open the folder in Google Drive.
          2. Click "Share".
          3. Add the service account email: ${(googleDriveService as any).currentConfig?.email}
          4. Grant "Editor" access.`;
      } else if (driveError.message.includes('quota')) {
        details = `Storage Quota Exceeded. Service accounts have 0GB quota. You MUST share a folder with the service account and upload to THAT folder (using its ID), not to the root "My Drive".`;
      }

      res.status(400).json({
        status: 'error',
        message,
        details,
        env: envStatus
      });
    }
  } catch (error: any) {
    console.error('Test drive route error:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Internal server error in test-drive route',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Coupon Routes
router.get('/coupons', authenticate, authorize(['admin']), couponController.getAllCoupons);
router.post('/coupons', authenticate, authorize(['admin']), couponController.createCoupon);
router.post('/coupons/validate', authenticate, couponController.validateCoupon);
router.delete('/coupons/:id', authenticate, authorize(['admin']), couponController.deleteCoupon);

// Payment Routes
router.post('/payment/init', authenticate, paymentController.initPayment);
router.post('/payment/success/:trans_id', paymentController.paymentSuccess);
router.post('/payment/fail/:trans_id', paymentController.paymentFail);
router.post('/payment/cancel/:trans_id', paymentController.paymentCancel);
router.post('/payment/ipn', paymentController.paymentIPN);

// Upload Routes
router.post('/upload/single', authenticate, upload.single('file'), uploadController.uploadFile);
router.post('/upload/multiple', authenticate, upload.array('files', 10), uploadController.uploadMultipleFiles);

export default router;
