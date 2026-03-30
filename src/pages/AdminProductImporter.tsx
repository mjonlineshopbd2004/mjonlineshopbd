import React, { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { 
  Globe, 
  Search, 
  Loader2, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Image as ImageIcon,
  DollarSign,
  Type as TypeIcon,
  Layers,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatPrice, getProxyUrl } from '../lib/utils';

interface ImportedProduct {
  title: string;
  price: number;
  originalPrice?: string;
  description: string;
  images: string[];
  category: string;
  sourceUrl: string;
  sizes?: string[];
  colors?: string[];
  specifications?: { key: string; value: string }[];
}

export default function AdminProductImporter() {
  const { user } = useAuth();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [product, setProduct] = useState<ImportedProduct | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const fetchProductDetails = async () => {
    if (!url) {
      toast.error('Please enter a product URL');
      return;
    }

    setLoading(true);
    setProduct(null);
    setCurrentImageIndex(0);

    try {
      const idToken = await user?.getIdToken();
      if (!idToken) {
        toast.error('Please login as admin to use this feature');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/scraper/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ url })
      });

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response from scraper:', text);
        throw new Error(`Server returned an unexpected response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch product data');
      }
      
      // Map backend fields to frontend fields
      const importedProduct: ImportedProduct = {
        title: data.name,
        price: data.price,
        originalPrice: data.originalPrice,
        description: data.description,
        images: data.images,
        category: data.category,
        sourceUrl: url,
        sizes: data.sizes,
        colors: data.colors,
        specifications: data.specifications
      };

      setProduct(importedProduct);
      toast.success('Product details extracted successfully!');
    } catch (error: any) {
      console.error('Extraction error:', error);
      toast.error(error.message || 'Failed to extract product details. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!product) return;

    setImporting(true);
    try {
      // Check for duplicates
      const q = query(collection(db, 'products'), where('name', '==', product.title));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        toast.error('A product with this name already exists in your store.');
        setImporting(false);
        return;
      }

      const newProduct = {
        name: product.title,
        price: product.price,
        description: product.description,
        images: product.images,
        category: product.category,
        stock: 100,
        isFeatured: false,
        isTrending: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        sourceUrl: product.sourceUrl,
        sizes: product.sizes || [],
        colors: product.colors || [],
        specifications: product.specifications || []
      };

      await addDoc(collection(db, 'products'), newProduct);
      toast.success('Product added to your store successfully!');
      setProduct(null);
      setUrl('');
    } catch (error: any) {
      console.error('Import error:', error);
      toast.error('Failed to add product to store.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
              <Globe className="h-8 w-8 text-emerald-500" />
              Universal Product Importer
            </h1>
            <p className="text-gray-400 font-bold">Import products from any website (1688, Amazon, Daraz, etc.) using AI.</p>
          </div>
        </div>

        {/* URL Input Section */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] shadow-2xl">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste product URL here (e.g., https://detail.1688.com/offer/...)"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-bold"
              />
            </div>
            <button
              onClick={fetchProductDetails}
              disabled={loading || !url}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-8 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 min-w-[160px] shadow-lg shadow-emerald-600/20"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-5 w-5" />
                  Fetch Details
                </>
              )}
            </button>
          </div>
          <p className="mt-4 text-[10px] text-gray-500 font-bold italic">
            * Our AI will visit the page, extract images, price (converted to BDT), and description for you.
          </p>
        </div>

        {/* Result Section */}
        <AnimatePresence mode="wait">
          {product && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              {/* Image Preview */}
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 space-y-4">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black/20 group">
                  <img
                    src={getProxyUrl(product.images[currentImageIndex])}
                    alt={product.title}
                    className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('picsum.photos')) {
                        target.src = 'https://picsum.photos/seed/mjshop/800/800';
                        toast.error('Some images could not be loaded directly.');
                      }
                    }}
                  />
                  
                  {product.images.length > 1 && (
                    <div className="absolute inset-x-4 bottom-4 flex justify-between items-center">
                      <button
                        onClick={() => setCurrentImageIndex(prev => (prev > 0 ? prev - 1 : product.images.length - 1))}
                        className="p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition-all"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <span className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold">
                        {currentImageIndex + 1} / {product.images.length}
                      </span>
                      <button
                        onClick={() => setCurrentImageIndex(prev => (prev < product.images.length - 1 ? prev + 1 : 0))}
                        className="p-2 bg-black/50 backdrop-blur-md rounded-full hover:bg-black/70 transition-all"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {product.images.slice(0, 10).map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={cn(
                        "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        currentImageIndex === idx ? "border-emerald-500 scale-95" : "border-transparent opacity-50 hover:opacity-100"
                      )}
                    >
                      <img src={getProxyUrl(img)} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Details Preview */}
              <div className="bg-white/5 border border-white/10 rounded-[2rem] p-8 space-y-6 flex flex-col">
                <div className="space-y-4 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="text-2xl font-bold tracking-tight leading-tight">{product.title}</h2>
                    <a 
                      href={product.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white shrink-0"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-500" />
                      <span className="text-xl font-black text-emerald-500">{formatPrice(product.price)}</span>
                    </div>
                    {product.originalPrice && (
                      <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl flex items-center gap-2">
                        <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Original:</span>
                        <span className="text-sm font-bold text-gray-300">{product.originalPrice}</span>
                      </div>
                    )}
                    <div className="bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-bold text-blue-500">{product.category}</span>
                    </div>
                  </div>

                  {/* Sizes & Colors Preview */}
                  <div className="grid grid-cols-2 gap-4">
                    {product.sizes && product.sizes.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sizes</h3>
                        <div className="flex flex-wrap gap-1">
                          {product.sizes.map(size => (
                            <span key={size} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold text-gray-400">
                              {size}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {product.colors && product.colors.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Colors</h3>
                        <div className="flex flex-wrap gap-1">
                          {product.colors.map(color => (
                            <span key={color} className="px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[10px] font-bold text-gray-400">
                              {color}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</h3>
                    <div className="bg-white/5 p-4 rounded-2xl border border-white/5 max-h-[200px] overflow-y-auto custom-scrollbar">
                      <p className="text-sm text-gray-300 leading-relaxed font-medium">{product.description}</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 space-y-4">
                  <div className="flex items-center gap-3 text-amber-500 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    <p className="text-[10px] font-bold leading-tight">
                      Please review the details above. You can edit the product later in the "Products" section if needed.
                    </p>
                  </div>
                  
                  <button
                    onClick={handleImport}
                    disabled={importing}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-xl shadow-emerald-600/20"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-6 w-6 animate-spin" />
                        Adding to Store...
                      </>
                    ) : (
                      <>
                        <Plus className="h-6 w-6" />
                        Add to My Store
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!product && !loading && (
          <div className="bg-white/5 border border-white/10 rounded-[2rem] p-20 text-center space-y-6">
            <div className="inline-flex items-center justify-center h-20 w-20 bg-white/5 rounded-3xl mb-4">
              <ImageIcon className="h-10 w-10 text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-300">No Product Loaded</h2>
            <p className="text-gray-500 max-w-md mx-auto font-bold">
              Paste a product URL from any website above and click "Fetch Details" to start importing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
