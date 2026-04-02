import { Router } from 'express';
import * as authController from '../controllers/authController';
import * as productController from '../controllers/productController';
import * as orderController from '../controllers/orderController';
import * as adminController from '../controllers/adminController';
import * as couponController from '../controllers/couponController';
import * as paymentController from '../controllers/paymentController';
import * as uploadController from '../controllers/uploadController';
import * as scraperController from '../controllers/scraperController';
import { authenticate, authorize } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// Auth Routes
router.post('/auth/register', authController.registerUser);
router.post('/auth/login', authController.loginUser);
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

// Drive Debug Route
router.get('/admin/test-drive', authenticate, authorize(['admin']), async (req, res) => {
  try {
    const { googleDriveService } = await import('../services/googleDriveService');
    const { auth, db } = await import('../config/firebase');
    
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

    res.json({ 
      status: 'success', 
      message: 'Google Drive service is initialized.',
      env: envStatus
    });
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
