import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { CompareProvider } from './contexts/CompareContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import AuthModal from './components/AuthModal';
import ScrollToTop from './components/ScrollToTop';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import OfferPopup from './components/OfferPopup';
import CompareFloatingButton from './components/CompareFloatingButton';

import Wishlist from './pages/Wishlist';
import Compare from './pages/Compare';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderHistory from './pages/OrderHistory';
import Profile from './pages/Profile';
import UserDashboard from './pages/UserDashboard';
import UserSettings from './pages/UserSettings';
import Payments from './pages/Payments';
import Delivery from './pages/Delivery';
import Categories from './pages/Categories';
import Vendors from './pages/Vendors';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AdminProductForm from './pages/AdminProductForm';
import AdminOrders from './pages/AdminOrders';
import AdminRefunds from './pages/AdminRefunds';
import AdminSettings from './pages/AdminSettings';
import AdminUsers from './pages/AdminUsers';
import AdminCoupons from './pages/AdminCoupons';
import AdminCategories from './pages/AdminCategories';
import AdminTransactions from './pages/AdminTransactions';
import AdminReviews from './pages/AdminReviews';
import AdminProductImporter from './pages/AdminProductImporter';
import AdminGoogleSheetSettings from './pages/AdminGoogleSheetSettings';
import Support from './pages/Support';
import SplashScreen from './components/SplashScreen';
import FaviconUpdater from './components/FaviconUpdater';
import ThemeManager from './components/ThemeManager';
import OfflineNotice from './components/OfflineNotice';
import ErrorBoundary from './components/ErrorBoundary';
import PushNotificationManager from './components/PushNotificationManager';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation } from 'react-router-dom';

import StaticPage from './components/StaticPage';
import BottomNav from './components/BottomNav';
import { PWAInstallBanner } from './components/PWAInstallBanner';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <Routes location={location}>
      {/* Public Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products" element={<Products />} />
        <Route path="/product/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
        <Route path="/orders" element={<OrderHistory />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/dashboard" element={<UserDashboard />} />
        <Route path="/profile/settings" element={<UserSettings />} />
        <Route path="/payments" element={<Payments />} />
        <Route path="/delivery" element={<Delivery />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/vendors" element={<Vendors />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/support" element={<Support />} />
        <Route path="/about" element={<StaticPage title="About Us" content={<p>Welcome to MJ ONLINE SHOP BD, your number one source for all things fashion, electronics, and accessories. We're dedicated to giving you the very best of products, with a focus on dependability, customer service, and uniqueness.</p>} />} />
        <Route path="/contact" element={<StaticPage title="Contact Us" content={<p>If you have any questions or comments, please don't hesitate to contact us at mjonlineshopbd@gmail.com or via WhatsApp.</p>} />} />
        <Route path="/privacy" element={<StaticPage title="Privacy Policy" content={<p>Your privacy is important to us. It is MJ ONLINE SHOP BD's policy to respect your privacy regarding any information we may collect from you across our website.</p>} />} />
        <Route path="/returns" element={<StaticPage title="Return Policy" content={<p>Please note that once an order is delivered, it is no longer eligible for a refund. However, if you receive a damaged or incorrect product, please contact our support team immediately for an exchange or resolution.</p>} />} />
        <Route path="/refund" element={<StaticPage title="Refund Policy" content={<p>Our refund policy is simple. If you have paid for your order via bKash, Rocket, or Nagad and wish to cancel before delivery, please go to your <b>Order History</b> and click the <b>Request Refund</b> button. Please note that once an order is <b>Delivered</b>, it is no longer eligible for a refund.</p>} />} />
        <Route path="/after-sales" element={<StaticPage title="After Sales Service" content={<p>We provide excellent after-sales support. If you face any issues with your product after purchase, our team is here to help you with technical support and warranty claims.</p>} />} />
        <Route path="/terms" element={<StaticPage title="Terms & Conditions" content={<p>By accessing this website, you are agreeing to be bound by these website Terms and Conditions of Use, all applicable laws and regulations, and agree that you are responsible for compliance with any applicable local laws.</p>} />} />
      </Route>

      {/* Admin Routes */}
      <Route element={<ProtectedRoute adminOnly />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/products" element={<AdminProducts />} />
          <Route path="/admin/products/new" element={<AdminProductForm />} />
          <Route path="/admin/products/edit/:id" element={<AdminProductForm />} />
          <Route path="/admin/products/import" element={<AdminProductImporter />} />
          <Route path="/admin/orders" element={<AdminOrders />} />
          <Route path="/admin/transactions" element={<AdminTransactions />} />
          <Route path="/admin/reviews" element={<AdminReviews />} />
          <Route path="/admin/categories" element={<AdminCategories />} />
          <Route path="/admin/refunds" element={<AdminRefunds />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/coupons" element={<AdminCoupons />} />
          <Route path="/admin/google-sheet" element={<AdminGoogleSheetSettings />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Route>
    </Routes>
  );
}

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-grow pt-[80px] md:pt-[200px] pb-14 md:pb-0">
        <Outlet />
      </main>
      <Footer />
      <WhatsAppButton />
      <BottomNav />
      <OfflineNotice />
      <AuthModal />
      <OfferPopup />
      <CompareFloatingButton />
      <PWAInstallBanner />
    </div>
  );
}

// Trigger rebuild
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SettingsProvider>
          <ThemeManager />
          <FaviconUpdater />
          <CartProvider>
            <WishlistProvider>
              <CompareProvider>
                <Router>
                  <SplashScreen />
                  <PushNotificationManager />
                  <ScrollToTop />
                  <Toaster position="top-center" richColors />
                  <AnimatedRoutes />
                </Router>
              </CompareProvider>
            </WishlistProvider>
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
