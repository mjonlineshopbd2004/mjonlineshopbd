import React from 'react';
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { SettingsProvider } from './contexts/SettingsContext';
import Navbar from './components/Navbar';
import TopBanner from './components/TopBanner';
import Footer from './components/Footer';
import WhatsAppButton from './components/WhatsAppButton';
import AuthModal from './components/AuthModal';
import ScrollToTop from './components/ScrollToTop';
import { ProtectedRoute } from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';

import Wishlist from './pages/Wishlist';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetails from './pages/ProductDetails';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import OrderHistory from './pages/OrderHistory';
import Profile from './pages/Profile';
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
import SplashScreen from './components/SplashScreen';
import FaviconUpdater from './components/FaviconUpdater';
import { AnimatePresence, motion } from 'motion/react';
import { useLocation } from 'react-router-dom';

import StaticPage from './components/StaticPage';

import BottomNav from './components/BottomNav';

function AnimatedRoutes() {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Routes location={location}>
          {/* Public Routes */}
          <Route element={<MainLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetails />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
            <Route path="/orders" element={<OrderHistory />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/wishlist" element={<Wishlist />} />
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
              <Route path="/admin/orders" element={<AdminOrders />} />
              <Route path="/admin/transactions" element={<AdminTransactions />} />
              <Route path="/admin/reviews" element={<AdminReviews />} />
              <Route path="/admin/categories" element={<AdminCategories />} />
              <Route path="/admin/refunds" element={<AdminRefunds />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/coupons" element={<AdminCoupons />} />
              <Route path="/admin/import" element={<AdminProductImporter />} />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>
          </Route>
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
}

function MainLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBanner />
      <Navbar />
      <motion.main 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="flex-grow pb-20 md:pb-0"
      >
        <Outlet />
      </motion.main>
      <Footer />
      <WhatsAppButton />
      <BottomNav />
      <AuthModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <FaviconUpdater />
        <CartProvider>
          <WishlistProvider>
            <Router>
              <SplashScreen />
              <ScrollToTop />
              <Toaster position="top-center" richColors />
              <AnimatedRoutes />
            </Router>
          </WishlistProvider>
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
