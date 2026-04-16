import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ShoppingCart, 
  ShoppingBag,
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
import { cn, getProxyUrl, triggerHaptic } from '../lib/utils';
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
  const [logoError, setLogoError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLogoError(false);
  }, [settings.logoUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setIsAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-1.5-flash",
        contents: {
          parts: [
            { text: "Identify the fashion item in this image. Provide a list of 5-8 highly relevant English keywords that would likely appear in an e-commerce product title or description (e.g., 'leather handbag', 'blue denim jacket', 'silk saree'). Focus on specific attributes like color, material, and style. Output only the keywords separated by spaces, no punctuation." },
            { inlineData: { mimeType: file.type, data: base64Data } }
          ]
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
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-gray-100/50 shadow-md">
      {/* Top Bar - Removed as requested */}
      {/* <div className="bg-primary text-white py-2 hidden md:block">
        ...
      </div> */}

      {/* Main Header */}
      <div className="py-2 md:py-4">
        <div className="container-custom flex items-center justify-between gap-3 md:gap-4">
          {/* Logo */}
          <Link to="/" onClick={() => triggerHaptic('medium')} className="flex-shrink-0 flex items-center gap-2.5 group">
            {settings.logoUrl && !logoError ? (
              <img 
                src={getProxyUrl(settings.logoUrl)} 
                alt={settings.storeName} 
                className="h-10 md:h-14 w-auto transition-transform group-hover:scale-105" 
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="w-10 h-10 md:w-14 md:h-14 bg-primary rounded-lg md:rounded-xl flex items-center justify-center text-white shadow-lg shadow-primary/20 group-hover:rotate-6 transition-transform">
                <ShoppingBag className="h-6 w-6 md:h-8 md:w-8" />
              </div>
            )}
            <div className="hidden sm:flex flex-col">
              <span className="font-black text-gray-900 text-[11px] md:text-[15px] tracking-[0.05em] uppercase leading-none whitespace-nowrap">
                {settings.storeName}
              </span>
              <span className="text-[7px] md:text-[8px] font-bold text-primary tracking-[0.3em] uppercase mt-0.5 opacity-80">
                Premium Store
              </span>
            </div>
          </Link>

          {/* Search - Mobile compact */}
          <div className="flex-1 max-w-md ml-4 md:ml-12">
            <form onSubmit={handleSearch} className="relative flex items-center">
              <div className="absolute left-3 text-gray-400">
                <Search className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="w-full bg-gray-100/50 border-none rounded-full pl-9 pr-10 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-primary/20 transition-all text-[11px] md:text-xs font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              
              {settings.enableImageSearch !== false && (
                <>
                  <button 
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    ) : (
                      <Camera className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageSearch}
                  />
                </>
              )}
            </form>
          </div>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-2 md:gap-2">
            {user && isAdmin && (
              <Link 
                to="/admin" 
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white text-red-600 rounded-xl border border-red-200 font-bold hover:bg-red-50 transition-all shadow-sm text-[10px]"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span className="hidden lg:inline">Dashboard</span>
              </Link>
            )}
            {user ? (
              <div className="relative" ref={accountRef}>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsAccountOpen(!isAccountOpen);
                    }}
                    className="nav-action-card group"
                  >
                    <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <User className="h-3.5 w-3.5 text-gray-500 group-hover:text-primary" />
                    </div>
                    <div className="hidden lg:block text-left">
                      <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-0.5">Account</p>
                      <p className="text-[10px] font-black text-gray-900 truncate max-w-[50px]">
                        {profile?.displayName?.split(' ')[0] || 'Profile'}
                      </p>
                    </div>
                  </button>
                </div>
                
                {isAccountOpen && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <Link 
                      to="/profile" 
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                    >
                      <User className="h-4 w-4" />
                      My Profile
                    </Link>
                    <Link 
                      to="/orders" 
                      onClick={() => setIsAccountOpen(false)}
                      className="flex items-center gap-3 px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 hover:text-primary transition-colors"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      My Orders
                    </Link>
                    <div className="h-px bg-gray-100 my-2 mx-4" />
                    <button 
                      onClick={() => {
                        logout();
                        setIsAccountOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button 
                onClick={() => setAuthModalOpen(true)}
                className="nav-action-card group"
              >
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <User className="h-4 w-4 text-gray-500 group-hover:text-primary" />
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-0.5">Account</p>
                  <p className="text-[10px] font-black text-gray-900 leading-none">Login</p>
                </div>
              </button>
            )}

            <Link to="/wishlist" className="nav-action-card group">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors relative">
                <Heart className="h-4 w-4 text-gray-500 group-hover:text-primary" />
                {wishlistItems.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">
                    {wishlistItems.length}
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-0.5">Wishlist</p>
                <p className="text-[10px] font-black text-gray-900 leading-none">My List</p>
              </div>
            </Link>

            <Link to="/cart" className="nav-action-card group">
              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors relative">
                <ShoppingCart className="h-4 w-4 text-gray-500 group-hover:text-primary" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">
                    {totalItems}
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-[8px] font-bold text-gray-400 uppercase leading-none mb-0.5">My Cart</p>
                <p className="text-[10px] font-black text-gray-900 leading-none">Total: {totalItems}</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Links - Horizontal Scroll - Hidden as requested */}
      {/* Removed as requested */}

      {/* Navigation Bar */}
      <div className="border-t border-gray-100/50 hidden md:block">
        <div className="container-custom flex items-center justify-between h-14">
          <div className="flex items-center h-full gap-8">
            {/* Categories Dropdown */}
            <div className="relative h-full">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCategoriesOpen(!isCategoriesOpen);
                }}
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
    </nav>
  );
}
