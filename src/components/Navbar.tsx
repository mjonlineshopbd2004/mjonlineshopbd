import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  Heart, 
  User, 
  Search, 
  Menu, 
  X, 
  LogOut, 
  LayoutDashboard, 
  Image as ImageIcon, 
  Camera,
  Loader2,
  Phone,
  Facebook,
  Youtube,
  Twitter,
  Instagram,
  ChevronDown,
  Globe
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn, getProxyUrl } from '../lib/utils';
import { toast } from 'sonner';
import { GoogleGenAI } from "@google/genai";

export default function Navbar() {
  const { user, profile, isAdmin, logout, isLoggingIn, setAuthModalOpen } = useAuth();
  const { totalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const { settings } = useSettings();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const handleImageSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      toast.error('Search API key is not configured. Please contact the administrator.');
      return;
    }

    setIsSearching(true);
    const toastId = toast.loading('Analyzing image for search...');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.readAsDataURL(file);
      });

      const base64Data = await base64Promise;

      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: "Identify the fashion item in this image. Provide a list of 5-8 highly relevant English keywords that would likely appear in an e-commerce product title or description (e.g., 'leather handbag', 'blue denim jacket', 'silk saree'). Focus on specific attributes like color, material, and style. Output only the keywords separated by spaces, no punctuation." },
            { inlineData: { mimeType: file.type, data: base64Data } }
          ]
        },
        config: {
          maxOutputTokens: 100,
        }
      });

      const keywords = response.text?.trim();
      if (keywords) {
        toast.success(`Searching for: ${keywords}`, { id: toastId });
        navigate(`/products?search=${encodeURIComponent(keywords)}`);
        setIsMenuOpen(false);
      } else {
        toast.error('Could not identify item in image', { id: toastId });
      }
    } catch (error) {
      console.error('Image search error:', error);
      toast.error('Image search failed. Please try again.', { id: toastId });
    } finally {
      setIsSearching(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsMenuOpen(false);
    }
  };

  const categories = (settings.categories || []).map(category => 
    typeof category === 'string' ? category : category.name
  );

  const mainNavLinks = [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/about' },
    { name: 'Shop', path: '/products' },
    { name: 'Vendors', path: '/vendors' },
    { name: 'Pages', path: '/pages' },
    { name: 'Blog', path: '/blog' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full">
      {/* Top Bar */}
      <div className="bg-primary text-white py-2 hidden md:block">
        <div className="container-custom flex justify-between items-center text-[13px] font-medium">
          <div className="flex items-center gap-6">
            <Link to="/about" className="hover:text-white/80 transition-colors">About Us</Link>
            <Link to="/profile" className="hover:text-white/80 transition-colors">My Account</Link>
            <Link to="/wishlist" className="hover:text-white/80 transition-colors">Wishlist</Link>
            <Link to="/orders" className="hover:text-white/80 transition-colors">Order Tracking</Link>
          </div>
          <div className="flex-1 text-center">
            Welcome to our {settings.storeName} store!
          </div>
          <div className="flex items-center gap-4">
            <span>Follow Us:</span>
            <div className="flex items-center gap-3">
              <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Facebook className="h-3.5 w-3.5" /></a>
              <a href={settings.youtube} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Youtube className="h-3.5 w-3.5" /></a>
              <a href={settings.twitter} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Twitter className="h-3.5 w-3.5" /></a>
              <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform"><Instagram className="h-3.5 w-3.5" /></a>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white py-5 border-b border-gray-100">
        <div className="container-custom flex items-center justify-between gap-8">
          {/* Logo & Shop Name */}
          <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="relative">
              {settings.logoUrl ? (
                <img src={getProxyUrl(settings.logoUrl)} alt={settings.storeName} className="h-10 md:h-12 w-auto transition-transform group-hover:scale-105" />
              ) : (
                <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl md:text-2xl shadow-lg shadow-primary/20">
                  {settings.storeName.charAt(0)}
                </div>
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="text-sm md:text-xl font-bold tracking-tight text-gray-900 leading-none uppercase font-display">
                {settings.storeName}
              </h1>
              <p className="hidden md:block text-[9px] font-semibold text-gray-500 uppercase tracking-[0.15em] mt-1 font-sans">{settings.shopTagline || 'Premium Online Shop'}</p>
            </div>
          </Link>

          {/* Hotline */}
          <div className="hidden xl:flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-primary shadow-sm border border-gray-100">
              <Phone className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest leading-none mb-1.5 font-sans">Hotline Number</p>
              <p className="text-xl font-bold text-gray-900 leading-none font-display tracking-tight">{settings.phone}</p>
            </div>
          </div>

          {/* Search - Smaller and centered */}
          <div className="hidden lg:flex flex-1 justify-center px-4 max-w-xs">
            <div className="relative w-full flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <form onSubmit={handleSearch} className="w-full">
                  <input
                    type="text"
                    placeholder="Search products..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 outline-none focus:bg-white focus:border-primary/30 transition-all text-xs font-medium pr-10"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </form>
                {settings.enableImageSearch !== false && (
                  <button 
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50 group/imgsearch"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSearching}
                    title="Search by image"
                  >
                    {isSearching ? (
                      <Loader2 className="h-3 w-3 animate-spin text-primary" />
                    ) : (
                      <Camera className="h-3 w-3 text-primary group-hover/imgsearch:scale-110 transition-transform" />
                    )}
                  </button>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageSearch}
                />
              </div>
              <button 
                className="bg-primary hover:bg-primary-dark text-white p-2 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 border border-primary-dark/10 flex items-center justify-center"
                onClick={() => handleSearch()}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Admin Dashboard Link (Visible only to admins) */}
            {isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 font-bold hover:bg-red-100 transition-all shadow-sm text-xs"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden lg:inline">Dashboard</span>
              </Link>
            )}
            {user ? (
              <div className="relative group/account">
                <div className="flex items-center gap-2">
                  <Link to="/profile" className="nav-action-card group">
                    <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User className="h-4 w-4 text-gray-500 group-hover:text-primary" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-[9px] font-bold text-gray-400 uppercase leading-none mb-1">Account</p>
                      <p className="text-[11px] font-black text-gray-900 truncate max-w-[60px]">
                        {profile?.displayName?.split(' ')[0] || 'Profile'}
                      </p>
                    </div>
                  </Link>
                </div>
                
                {/* Dropdown */}
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 opacity-0 invisible group-hover/account:opacity-100 group-hover/account:visible transition-all z-50">
                  <Link to="/profile" className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">
                    <User className="h-4 w-4" />
                    My Profile
                  </Link>
                  <Link to="/orders" className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors">
                    <ShoppingCart className="h-4 w-4" />
                    My Orders
                  </Link>
                  <div className="h-px bg-gray-100 my-2 mx-4" />
                  <button 
                    onClick={() => logout()}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="nav-action-card group"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <User className="h-5 w-5 text-gray-500 group-hover:text-primary" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Account</p>
                  <p className="text-xs font-black text-gray-900 leading-none">Login</p>
                </div>
              </button>
            )}

            <Link to="/wishlist" className="nav-action-card group">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors relative">
                <Heart className="h-5 w-5 text-gray-500 group-hover:text-primary" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                    {wishlistItems.length}
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">Wishlist</p>
                <p className="text-xs font-black text-gray-900 leading-none">My List</p>
              </div>
            </Link>

            <Link to="/cart" className="nav-action-card group">
              <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors relative">
                <ShoppingCart className="h-5 w-5 text-gray-500 group-hover:text-primary" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[10px] font-bold text-gray-400 uppercase leading-none mb-1">My Cart</p>
                <p className="text-xs font-black text-gray-900 leading-none">Total: {totalItems}</p>
              </div>
            </Link>

            {/* Mobile Menu Toggle */}
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2 text-gray-600">
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-white border-b border-gray-100 hidden md:block">
        <div className="container-custom flex items-center justify-between h-14">
          <div className="flex items-center h-full gap-8">
            {/* Categories Dropdown */}
            <div className="relative h-full">
              <button 
                onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
                className="bg-primary hover:bg-primary-dark text-white px-6 h-full flex items-center gap-3 font-bold text-sm transition-all min-w-[240px]"
              >
                <Menu className="h-5 w-5" />
                All Categories
                <ChevronDown className={cn("h-4 w-4 ml-auto transition-transform", isCategoriesOpen && "rotate-180")} />
              </button>
              
              {isCategoriesOpen && (
                <div className="absolute top-full left-0 w-full bg-white border border-gray-100 shadow-xl py-2 z-50">
                  {categories.map((cat) => (
                    <Link
                      key={cat}
                      to={`/products?category=${encodeURIComponent(cat)}`}
                      onClick={() => setIsCategoriesOpen(false)}
                      className="block px-6 py-2.5 text-sm font-semibold text-gray-700 hover:bg-primary/5 hover:text-primary transition-colors"
                    >
                      {cat}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Main Menu */}
            <div className="flex items-center gap-8">
              {mainNavLinks.map((link) => (
                <Link
                  key={link.name}
                  to={link.path}
                  className="text-sm font-bold text-gray-700 hover:text-primary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-8">
            <Link to="/products?trending=true" className="text-sm font-bold text-gray-700 hover:text-primary transition-colors">
              Trending Products
            </Link>
            
            {/* Promo Banner */}
            <div className="bg-primary/10 h-14 flex items-center px-6 relative overflow-hidden group">
              <div className="relative z-10 flex items-center gap-3">
                <p className="text-sm font-bold text-primary">Get 30% Discount Now</p>
                <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">Sale</span>
              </div>
              <div className="absolute top-0 right-0 w-24 h-full bg-primary/20 -skew-x-12 translate-x-12 group-hover:translate-x-8 transition-transform"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Search Bar - Visible only on mobile */}
      <div className="lg:hidden px-4 pb-4 bg-white border-b border-gray-100">
        <form onSubmit={handleSearch} className="relative flex items-center group">
          <input
            type="text"
            placeholder="Search products..."
            className="w-full bg-gray-100 border-2 border-transparent focus:border-primary focus:bg-white rounded-full py-2.5 pl-10 pr-12 outline-none transition-all text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search className="absolute left-3.5 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
          
          {settings.enableImageSearch !== false && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isSearching}
              className="absolute right-2 p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-full transition-all disabled:opacity-50"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
            </button>
          )}
        </form>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white pt-20 overflow-y-auto">
          <div className="p-6 space-y-8">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Main Menu</h3>
              <div className="grid grid-cols-1 gap-2">
                {mainNavLinks.map((link) => (
                  <Link
                    key={link.name}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-bold text-gray-900 p-3 bg-gray-50 rounded-xl"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categories</h3>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/products?category=${encodeURIComponent(cat)}`}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-lg font-bold text-gray-900 p-3 bg-gray-50 rounded-xl"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>

            {user && isAdmin && (
              <Link
                to="/admin"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center gap-3 text-lg font-bold text-primary p-3 bg-primary/5 rounded-xl"
              >
                <LayoutDashboard className="h-5 w-5" />
                Admin Dashboard
              </Link>
            )}

            {user ? (
              <button
                onClick={() => { logout(); setIsMenuOpen(false); }}
                className="flex items-center gap-3 text-lg font-bold text-red-500 p-3 bg-red-50 rounded-xl w-full"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            ) : (
              <button
                onClick={() => { setAuthModalOpen(true); setIsMenuOpen(false); }}
                className="flex items-center gap-3 text-lg font-bold text-primary p-3 bg-primary/5 rounded-xl w-full"
              >
                <User className="h-5 w-5" />
                Login / Register
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
