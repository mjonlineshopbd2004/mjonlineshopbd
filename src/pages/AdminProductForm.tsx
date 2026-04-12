import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc, getDocFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { toast } from 'sonner';
import { ArrowLeft, Save, Image as ImageIcon, Plus, X, Loader2, Upload, Video, Trash2, DollarSign, Settings, Globe, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn, getProxyUrl } from '../lib/utils';
import { uploadFile, uploadMultipleFiles } from '../lib/upload';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';

export default function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { settings } = useSettings();
  const isEditing = !!id;

  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [sourceUrl, setSourceUrl] = useState('');
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    price: 0,
    discountPrice: 0,
    category: (typeof settings.categories[0] === 'string' ? settings.categories[0] : settings.categories[0]?.name) || '',
    stock: 0,
    images: [],
    videoUrl: '',
    sourceUrl: '',
    sizes: [],
    colors: [],
    colorVariants: [],
    featured: false,
    trending: false,
    rating: 5,
    reviewsCount: 0,
    specifications: [],
    createdAt: new Date().toISOString(),
  });

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && id) {
      const fetchProduct = async () => {
        try {
          console.log("Fetching product with ID:", id);
          const docRef = doc(db, 'products', id);
          console.log("Full document path:", docRef.path);
          
          // Try server first to avoid cache issues
          let docSnap = await getDocFromServer(docRef).catch((err) => {
            console.warn("getDocFromServer failed:", err);
            return null;
          });
          
          if (!docSnap || !docSnap.exists()) {
            console.log("Server fetch failed or not found, trying cache...");
            docSnap = await getDoc(docRef);
          }

          if (docSnap.exists()) {
            const data = docSnap.data();
            console.log("Product found successfully:", data);
            setFormData({ id: docSnap.id, ...data } as Product);
          } else {
            console.error("Product NOT found in Firestore for ID:", id);
            console.log("Attempted ID string length:", id.length);
            console.log("ID characters:", Array.from(id).map(c => c.charCodeAt(0)));
            toast.error(`Product not found (ID: ${id})`);
            navigate('/admin/products');
          }
        } catch (error: any) {
          console.error("Error fetching product details:", error);
          toast.error(`Error loading product: ${error.message}`);
          navigate('/admin/products');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [id, isEditing, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentImagesCount = formData.images?.length || 0;
    if (currentImagesCount + files.length > 10) {
      toast.error('Maximum 10 images allowed');
      return;
    }

    setUploading(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const urls = await uploadMultipleFiles(files, idToken);
      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), ...urls]
      }));
      toast.success('Images uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const url = await uploadFile(file, idToken);
      if (url) {
        setFormData(prev => ({ ...prev, videoUrl: url }));
        toast.success('Video uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload video');
    } finally {
      setUploading(false);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const handleFetchFromUrl = async () => {
    if (!sourceUrl) {
      toast.error('Please enter a product URL');
      return;
    }

    setFetching(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const response = await fetch('/api/scraper/product', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ url: sourceUrl })
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response received from /api/scraper/product:', text);
        
        if (response.status === 403) {
          throw new Error('The server is blocking our request (403 Forbidden). This often happens when the website detects automated scraping. Please try again later or manually add the product.');
        }
        
        if (text.includes('FUNCTION_INVOCATION_FAILED')) {
          throw new Error('The server took too long to respond (Vercel timeout). This often happens with complex websites. Please try again or use a different URL.');
        }
        
        throw new Error(`Server returned an unexpected response format (${response.status}).`);
      }

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('AI Quota Exceeded. The free AI limit has been reached. Please try again in a few minutes.');
        }
        if (response.status === 503) {
          throw new Error('Gemini API is currently overloaded. Please try again in a few moments.');
        }
        if (data.error === 'API_KEY_LEAKED') {
          throw new Error('Your Gemini API key has been reported as leaked by Google. Please update it in the Settings menu.');
        }
        throw new Error(data.message || 'Failed to fetch product data');
      }

      if (data.error === 'GEMINI_API_KEY_INVALID') {
        toast.warning('AI is partially working. Please set a valid GEMINI_API_KEY for full details.', {
          duration: 10000
        });
      }

      // Clean and separate sizes/colors
      let cleanedSizes = [...(data.sizes || [])];
      let cleanedColors = [...(data.colors || [])];
      
      // Move numeric values from colors to sizes
      const numericColors = cleanedColors.filter(c => /^\d+$/.test(c));
      if (numericColors.length > 0) {
        cleanedSizes = [...new Set([...cleanedSizes, ...numericColors])];
        cleanedColors = cleanedColors.filter(c => !/^\d+$/.test(c));
      }

      // Handle combined strings like "Magenta38"
      cleanedColors = cleanedColors.map(c => {
        const match = c.match(/^([a-zA-Z]+)(\d+)$/);
        if (match) {
          const colorName = match[1];
          const sizeValue = match[2];
          if (!cleanedSizes.includes(sizeValue)) {
            cleanedSizes.push(sizeValue);
          }
          return colorName;
        }
        return c;
      });
      
      // Remove duplicates
      cleanedColors = [...new Set(cleanedColors)];
      cleanedSizes = [...new Set(cleanedSizes)];

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        price: data.price || prev.price,
        description: data.description || prev.description,
        images: data.images && data.images.length > 0 ? data.images : prev.images,
        sourceUrl: data.sourceUrl || prev.sourceUrl,
        sizes: cleanedSizes.length > 0 ? cleanedSizes : prev.sizes,
        colors: cleanedColors.length > 0 ? cleanedColors : prev.colors,
        colorVariants: data.colorVariants && data.colorVariants.length > 0 ? data.colorVariants : prev.colorVariants,
        category: data.category || prev.category,
        videoUrl: data.videoUrl || prev.videoUrl,
        specifications: data.specifications && data.specifications.length > 0 ? data.specifications : prev.specifications
      }));

      toast.success('Product data fetched successfully');
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(error.message || 'Failed to fetch product data');
    } finally {
      setFetching(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index)
    }));
  };

  const moveImage = (index: number, direction: 'left' | 'right') => {
    setFormData(prev => {
      const newImages = [...(prev.images || [])];
      const newIndex = direction === 'left' ? index - 1 : index + 1;
      
      if (newIndex < 0 || newIndex >= newImages.length) return prev;
      
      const temp = newImages[index];
      newImages[index] = newImages[newIndex];
      newImages[newIndex] = temp;
      
      return { ...prev, images: newImages };
    });
  };

  const removeVideo = () => {
    setFormData(prev => ({ ...prev, videoUrl: '' }));
  };

  const addSpecification = () => {
    setFormData(prev => ({
      ...prev,
      specifications: [...(prev.specifications || []), { key: '', value: '' }]
    }));
  };

  const updateSpecification = (index: number, field: 'key' | 'value', value: string) => {
    setFormData(prev => {
      const newSpecs = [...(prev.specifications || [])];
      newSpecs[index] = { ...newSpecs[index], [field]: value };
      return { ...prev, specifications: newSpecs };
    });
  };

  const removeSpecification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specifications: prev.specifications?.filter((_, i) => i !== index)
    }));
  };

  const addSize = () => {
    setFormData(prev => ({
      ...prev,
      sizes: [...(prev.sizes || []), '']
    }));
  };

  const updateSize = (index: number, value: string) => {
    setFormData(prev => {
      const newSizes = [...(prev.sizes || [])];
      newSizes[index] = value;
      return { ...prev, sizes: newSizes };
    });
  };

  const removeSize = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes?.filter((_, i) => i !== index)
    }));
  };

  const addColor = () => {
    setFormData(prev => ({
      ...prev,
      colors: [...(prev.colors || []), '']
    }));
  };

  const updateColor = (index: number, value: string) => {
    setFormData(prev => {
      const newColors = [...(prev.colors || [])];
      newColors[index] = value;
      return { ...prev, colors: newColors };
    });
  };

  const removeColor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors?.filter((_, i) => i !== index)
    }));
  };

  const addColorVariant = () => {
    setFormData(prev => ({
      ...prev,
      colorVariants: [...(prev.colorVariants || []), { name: '', image: '' }]
    }));
  };

  const generateVariantsFromImages = () => {
    if (!formData.images || formData.images.length === 0) {
      toast.error('Please add some images first');
      return;
    }
    
    const newVariants = formData.images.map((img, idx) => ({
      name: formData.colors?.[idx] || '',
      image: img
    }));
    
    setFormData(prev => ({ ...prev, colorVariants: newVariants }));
    toast.success(`Generated ${newVariants.length} color variants from images`);
  };

  const updateColorVariant = (index: number, field: 'name' | 'image', value: string) => {
    setFormData(prev => {
      const newVariants = [...(prev.colorVariants || [])];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...prev, colorVariants: newVariants };
    });
  };

  const removeColorVariant = (index: number) => {
    setFormData(prev => ({
      ...prev,
      colorVariants: prev.colorVariants?.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    if (!formData.name?.trim()) {
      toast.error('Product name is required');
      return;
    }

    if (!formData.category) {
      toast.error('Category is required');
      return;
    }

    if (formData.price === undefined || formData.price === null || formData.price < 0) {
      toast.error('Valid price is required');
      return;
    }

    if (formData.stock === undefined || formData.stock === null || formData.stock < 0) {
      toast.error('Valid stock level is required');
      return;
    }

    if (!formData.images || formData.images.length === 0) {
      toast.error('At least one product image is required');
      return;
    }

    setSubmitting(true);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const { id: _, ...restData } = formData;
      const data = {
        ...restData,
        price: Number(formData.price) || 0,
        discountPrice: (formData.discountPrice !== undefined && formData.discountPrice !== null && formData.discountPrice !== '') ? Number(formData.discountPrice) : null,
        stock: Number(formData.stock) || 0,
      };

      if (isEditing && id) {
        const response = await fetch(`/api/products/${id}`, {
          method: 'PUT',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          let errorMsg = 'Failed to update product';
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (e) {
            try {
              const text = await response.text();
              errorMsg = text.slice(0, 100) || errorMsg;
            } catch (e2) {
              errorMsg = `Status: ${response.status} ${response.statusText}`;
            }
          }
          throw new Error(errorMsg);
        }
        
        toast.success('Product updated successfully');
      } else {
        const response = await fetch('/api/products', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`
          },
          body: JSON.stringify(data)
        });

        if (!response.ok) {
          let errorMsg = 'Failed to create product';
          try {
            const errorData = await response.json();
            errorMsg = errorData.message || errorMsg;
          } catch (e) {
            try {
              const text = await response.text();
              errorMsg = text.slice(0, 100) || errorMsg;
            } catch (e2) {
              errorMsg = `Status: ${response.status} ${response.statusText}`;
            }
          }
          throw new Error(errorMsg);
        }

        toast.success('Product added successfully');
      }
      navigate('/admin/products');
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || 'Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/products')}
            className="p-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tight mb-1 text-white">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-gray-400 font-bold text-sm">Fill in the details below to {isEditing ? 'update' : 'create'} your product.</p>
          </div>
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || uploading}
          className="flex items-center justify-center gap-2 bg-primary-dark hover:bg-primary text-white px-8 py-4 rounded-xl font-black transition-all shadow-lg shadow-primary-dark/20 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
        </button>
      </div>

      {/* Magic Import Section */}
      {!isEditing && (
        <div className="bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/20 p-8 rounded-[2rem] space-y-6 shadow-2xl shadow-primary/10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black flex items-center gap-3 text-white">
              <Globe className="h-6 w-6 text-primary" />
              Magic Import from URL
            </h2>
            <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">AI Powered</span>
          </div>
          <p className="text-gray-400 font-bold text-sm">
            Paste a product URL from any website (Amazon, Daraz, 1688, etc.) and we'll automatically fill in the details for you.
          </p>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="https://example.com/product/..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-bold text-white"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={handleFetchFromUrl}
              disabled={fetching || !sourceUrl}
              className="bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[180px]"
            >
              {fetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
              <span>Fetch Details</span>
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <h2 className="text-xl font-black flex items-center gap-3 text-white">
              <Plus className="h-5 w-5 text-primary" />
              Basic Information
            </h2>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Product Name</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  required
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-bold text-white"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                {isEditing && formData.sourceUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setSourceUrl(formData.sourceUrl || '');
                      handleFetchFromUrl();
                    }}
                    disabled={fetching}
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-primary px-6 py-4 rounded-xl font-black transition-all flex items-center gap-2 disabled:opacity-50"
                    title="Sync with Source"
                  >
                    {fetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Settings className="h-5 w-5" />}
                    <span className="hidden md:inline">Sync</span>
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Description</label>
              <textarea
                required
                rows={6}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-bold text-white resize-none"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Category</label>
                <select
                  className="w-full bg-[#111111] border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-bold text-white"
                  value={formData.category || ''}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                >
                  {settings.categories.map(category => {
                    const name = typeof category === 'string' ? category : category.name;
                    return <option key={name} value={name}>{name}</option>;
                  })}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Stock Level</label>
                <input
                  type="number"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-bold text-white"
                  value={formData.stock || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, stock: val === '' ? 0 : Number(val) });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <h2 className="text-xl font-black flex items-center gap-3 text-white">
              <DollarSign className="h-5 w-5 text-primary" />
              Pricing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Regular Price (৳)</label>
                <input
                  type="number"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-bold text-white"
                  value={formData.price || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, price: val === '' ? 0 : Number(val) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Discount Price (Optional)</label>
                <input
                  type="number"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-primary transition-all font-bold text-white"
                  value={formData.discountPrice || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData({ ...formData, discountPrice: val === '' ? null : Number(val) });
                  }}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-3 text-white">
                <Settings className="h-5 w-5 text-primary" />
                Variants (Sizes & Colors)
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Sizes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available Sizes</label>
                  <button
                    type="button"
                    onClick={addSize}
                    className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.sizes?.map((size, idx) => (
                    <div key={idx} className="relative group">
                      <input
                        type="text"
                        placeholder="Size"
                        className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-primary transition-all font-bold text-white text-xs"
                        value={size || ''}
                        onChange={(e) => updateSize(idx, e.target.value)}
                      />
                      <button
                        type="button"
                        onClick={() => removeSize(idx)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(!formData.sizes || formData.sizes.length === 0) && (
                    <p className="text-xs text-gray-500 font-bold italic">No sizes added.</p>
                  )}
                </div>
              </div>

              {/* Colors */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Available Colors</label>
                  <button
                    type="button"
                    onClick={addColor}
                    className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.colors?.map((color, idx) => (
                    <div key={idx} className="relative group">
                      <input
                        type="text"
                        placeholder="Color"
                        className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-primary transition-all font-bold text-white text-xs"
                        value={color || ''}
                        onChange={(e) => updateColor(idx, e.target.value)}
                      />
                      {formData.colorVariants?.find(v => v.name.toLowerCase() === color.toLowerCase()) && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black flex items-center justify-center" title="Has variant image">
                          <ImageIcon className="w-1.5 h-1.5 text-white" />
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeColor(idx)}
                        className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all shadow-lg"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {(!formData.colors || formData.colors.length === 0) && (
                    <p className="text-xs text-gray-500 font-bold italic">No colors added.</p>
                  )}
                </div>
              </div>

              {/* Color Variants (with Images) */}
              <div className="col-span-full space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Color Variants (with Images)</label>
                    <p className="text-[10px] text-gray-600 font-bold italic mt-1">Link specific images to color names for the thumbnail selector</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={generateVariantsFromImages}
                      className="px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                    >
                      <ImageIcon className="h-3 w-3" />
                      Auto-Generate
                    </button>
                    <button
                      type="button"
                      onClick={addColorVariant}
                      className="p-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {formData.colorVariants?.map((variant, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4 relative group">
                      <button
                        type="button"
                        onClick={() => removeColorVariant(idx)}
                        className="absolute top-2 right-2 p-1.5 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Color Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Midnight Black"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary transition-all font-bold text-white text-sm"
                          value={variant.name || ''}
                          onChange={(e) => updateColorVariant(idx, 'name', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Variant Image</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                          {formData.images?.map((img, imgIdx) => (
                            <button
                              key={imgIdx}
                              type="button"
                              onClick={() => updateColorVariant(idx, 'image', img)}
                              className={cn(
                                "w-12 h-12 rounded-lg overflow-hidden border-2 transition-all flex-shrink-0",
                                variant.image === img ? "border-primary" : "border-transparent opacity-50"
                              )}
                            >
                              {getProxyUrl(img) ? (
                                <img 
                                  src={getProxyUrl(img)!} 
                                  className="w-full h-full object-cover" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-white/5">
                                  <ImageIcon className="h-4 w-4 text-gray-700" />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Or paste image URL"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-primary transition-all font-bold text-white text-xs"
                          value={variant.image || ''}
                          onChange={(e) => updateColorVariant(idx, 'image', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-3 text-white">
                <Settings className="h-5 w-5 text-primary" />
                Specifications
              </h2>
              <button
                type="button"
                onClick={addSpecification}
                className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {formData.specifications?.map((spec, idx) => (
                <div key={idx} className="flex gap-4 items-start">
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Key</label>
                      <input
                        type="text"
                        placeholder="e.g. Material"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all font-bold text-white text-sm"
                        value={spec.key || ''}
                        onChange={(e) => updateSpecification(idx, 'key', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Value</label>
                      <input
                        type="text"
                        placeholder="e.g. Leather"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all font-bold text-white text-sm"
                        value={spec.value || ''}
                        onChange={(e) => updateSpecification(idx, 'value', e.target.value)}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSpecification(idx)}
                    className="mt-7 p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(!formData.specifications || formData.specifications.length === 0) && (
                <p className="text-center py-8 text-gray-500 font-bold text-sm border-2 border-dashed border-white/5 rounded-2xl">
                  No specifications added yet.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Options */}
        <div className="space-y-8">
          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-3 text-white">
                <ImageIcon className="h-5 w-5 text-primary" />
                Images
              </h2>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {formData.images?.length || 0}/10
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.images?.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                  {getProxyUrl(img) ? (
                    <img 
                      src={getProxyUrl(img)!} 
                      alt="" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-white/5">
                      <ImageIcon className="h-8 w-8 text-gray-700" />
                    </div>
                  )}
                  
                  {/* Image Controls Overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex flex-col justify-between p-2">
                    <div className="flex justify-between items-start">
                      <span className="bg-black/60 text-white text-[10px] font-black px-2 py-1 rounded-md">
                        #{idx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex justify-center gap-2">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveImage(idx, 'left')}
                        className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/40 disabled:opacity-30 disabled:hover:bg-white/20 transition-all"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === (formData.images?.length || 0) - 1}
                        onClick={() => moveImage(idx, 'right')}
                        className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/40 disabled:opacity-30 disabled:hover:bg-white/20 transition-all"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {(formData.images?.length || 0) < 10 && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-primary hover:text-primary transition-all bg-white/5"
                >
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                </button>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Or Add Image URL</label>
              <input
                type="text"
                placeholder="Paste image URL and press Enter"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all font-bold text-white text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const target = e.target as HTMLInputElement;
                    const url = target.value.trim();
                    if (url) {
                      if ((formData.images?.length || 0) >= 10) {
                        toast.error('Maximum 10 images allowed');
                        return;
                      }
                      setFormData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), url]
                      }));
                      target.value = '';
                      toast.success('Image URL added');
                    }
                  }
                }}
              />
            </div>

            <input
              type="file"
              ref={imageInputRef}
              onChange={handleImageUpload}
              multiple
              accept="image/*"
              className="hidden"
            />
            <p className="text-[10px] text-gray-500 font-bold text-center">Min 1, Max 10 photos. JPG, PNG supported.</p>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <h2 className="text-xl font-black flex items-center gap-3 text-white">
              <Video className="h-5 w-5 text-primary" />
              Product Video
            </h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Video URL (YouTube, Drive, etc.)</label>
                <input
                  type="text"
                  placeholder="Paste video URL"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary transition-all font-bold text-white text-sm"
                  value={formData.videoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                />
              </div>

              {formData.videoUrl && getProxyUrl(formData.videoUrl) ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                <video src={getProxyUrl(formData.videoUrl)!} className="w-full h-full object-cover" controls />
                <button
                  type="button"
                  onClick={removeVideo}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all z-10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-primary hover:text-primary transition-all bg-white/5"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Video className="h-6 w-6" />}
                <span className="text-[10px] font-black uppercase tracking-widest">Upload Video</span>
              </button>
            )}
            </div>
            <input
              type="file"
              ref={videoInputRef}
              onChange={handleVideoUpload}
              accept="video/*"
              className="hidden"
            />
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <h2 className="text-xl font-black flex items-center gap-3 text-white">
              <Settings className="h-5 w-5 text-emerald-500" />
              Visibility
            </h2>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-emerald-500/5 transition-all group border border-white/5">
                <span className="font-bold text-gray-300 group-hover:text-emerald-500">Featured Product</span>
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-emerald-600 focus:ring-emerald-500"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                />
              </label>
              <label className="flex items-center justify-between p-4 bg-white/5 rounded-2xl cursor-pointer hover:bg-emerald-500/5 transition-all group border border-white/5">
                <span className="font-bold text-gray-300 group-hover:text-emerald-500">Trending Now</span>
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded border-white/10 bg-white/5 text-emerald-600 focus:ring-emerald-500"
                  checked={formData.trending}
                  onChange={(e) => setFormData({ ...formData, trending: e.target.checked })}
                />
              </label>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
