import React, { useState, useEffect } from 'react';
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
  const [aiStatus, setAiStatus] = useState<'checking' | 'ready' | 'missing'>('checking');

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const idToken = await user?.getIdToken();
        if (!idToken) return;

        const response = await fetch('/api/scraper/status', {
          headers: {
            'Authorization': `Bearer ${idToken}`
          }
        });
        const data = await response.json();
        setAiStatus(data.configured ? 'ready' : 'missing');
      } catch (error) {
        console.error('Failed to check AI status:', error);
        setAiStatus('missing');
      }
    };

    if (user) {
      checkStatus();
    }
  }, [user]);

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
          'Authorization': `Bearer ${idToken}`,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
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
        
        if (text.includes('FUNCTION_INVOCATION_FAILED')) {
          throw new Error('The server took too long to respond (Vercel timeout). This often happens with complex websites. Please try again or use a different URL.');
        }
        
        throw new Error(`Server returned an unexpected response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('AI Quota Exceeded. The free AI limit has been reached. Please try again in a few minutes or use a different URL.', {
            duration: 6000
          });
          setLoading(false);
          return;
        }
        if (data.error === 'API_KEY_LEAKED') {
          toast.error('Your Gemini API key has been reported as leaked by Google. Please update it in the Settings menu.', {
            duration: 10000
          });
          setLoading(false);
          return;
        }
        throw new Error(data.message || 'Failed to fetch product data');
      }

      if (data.error === 'GEMINI_API_KEY_INVALID') {
        toast.warning('AI is partially working. Please set a valid GEMINI_API_KEY for full original details.', {
          duration: 10000
        });
      }

      if (data.message) {
        toast.info(data.message, { duration: 5000 });
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
        price: Number(product.price) || 0,
        discountPrice: null,
        description: product.description || '',
        images: product.images || [],
        category: product.category || 'Imported',
        stock: 100,
        featured: false,
        trending: false,
        rating: 5,
        reviewsCount: 0,
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

  const updateProductField = (field: keyof ImportedProduct, value: any) => {
    if (!product) return;
    setProduct({ ...product, [field]: value });
  };

  const addSize = () => {
    if (!product) return;
    const sizes = [...(product.sizes || []), ''];
    updateProductField('sizes', sizes);
  };

  const removeSize = (index: number) => {
    if (!product) return;
    const sizes = (product.sizes || []).filter((_, i) => i !== index);
    updateProductField('sizes', sizes);
  };

  const updateSize = (index: number, value: string) => {
    if (!product) return;
    const sizes = [...(product.sizes || [])];
    sizes[index] = value;
    updateProductField('sizes', sizes);
  };

  const addColor = () => {
    if (!product) return;
    const colors = [...(product.colors || []), ''];
    updateProductField('colors', colors);
  };

  const removeColor = (index: number) => {
    if (!product) return;
    const colors = (product.colors || []).filter((_, i) => i !== index);
    updateProductField('colors', colors);
  };

  const updateColor = (index: number, value: string) => {
    if (!product) return;
    const colors = [...(product.colors || [])];
    colors[index] = value;
    updateProductField('colors', colors);
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
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-2xl border border-white/10">
            <div className={cn(
              "h-2 w-2 rounded-full animate-pulse",
              aiStatus === 'ready' ? "bg-emerald-500" : aiStatus === 'checking' ? "bg-blue-500" : "bg-amber-500"
            )} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              AI Status: {aiStatus === 'ready' ? 'Ready' : aiStatus === 'checking' ? 'Checking...' : 'Key Missing'}
            </span>
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
                <div className="space-y-6 flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Product Title</label>
                      <input
                        type="text"
                        value={product.title}
                        onChange={(e) => updateProductField('title', e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-lg font-bold focus:outline-none focus:border-emerald-500 transition-all"
                      />
                    </div>
                    <a 
                      href={product.sourceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-gray-400 hover:text-white shrink-0 mt-6"
                    >
                      <ExternalLink className="h-5 w-5" />
                    </a>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Price (BDT)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <DollarSign className="h-4 w-4 text-emerald-500" />
                        </div>
                        <input
                          type="number"
                          value={product.price}
                          onChange={(e) => updateProductField('price', Number(e.target.value))}
                          className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl py-3 pl-10 pr-4 text-xl font-black text-emerald-500 focus:outline-none focus:border-emerald-500 transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Category</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                          <Layers className="h-4 w-4 text-blue-500" />
                        </div>
                        <input
                          type="text"
                          value={product.category}
                          onChange={(e) => updateProductField('category', e.target.value)}
                          className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl py-3 pl-10 pr-4 text-sm font-bold text-blue-500 focus:outline-none focus:border-blue-500 transition-all"
                          placeholder="Category"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sizes & Colors Edit */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Sizes</h3>
                        <button onClick={addSize} className="p-1 bg-white/5 hover:bg-white/10 rounded-md text-emerald-500 transition-all">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes?.map((size, idx) => (
                          <div key={idx} className="relative group">
                            <input
                              type="text"
                              value={size}
                              onChange={(e) => updateSize(idx, e.target.value)}
                              className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-center focus:outline-none focus:border-emerald-500"
                            />
                            <button 
                              onClick={() => removeSize(idx)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Colors</h3>
                        <button onClick={addColor} className="p-1 bg-white/5 hover:bg-white/10 rounded-md text-emerald-500 transition-all">
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {product.colors?.map((color, idx) => (
                          <div key={idx} className="relative group">
                            <input
                              type="text"
                              value={color}
                              onChange={(e) => updateColor(idx, e.target.value)}
                              className="w-20 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-bold text-center focus:outline-none focus:border-emerald-500"
                            />
                            <button 
                              onClick={() => removeColor(idx)}
                              className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-2 w-2" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest">Description</h3>
                    <textarea
                      rows={6}
                      value={product.description}
                      onChange={(e) => updateProductField('description', e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm text-gray-300 leading-relaxed font-medium focus:outline-none focus:border-emerald-500 transition-all resize-none custom-scrollbar"
                    />
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
