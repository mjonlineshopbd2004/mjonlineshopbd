import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, addDoc, collection, updateDoc, getDocFromServer } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { toast } from 'sonner';
import { ArrowLeft, Save, Image as ImageIcon, Plus, X, Loader2, Upload, Video, Trash2, DollarSign, Settings } from 'lucide-react';
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
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
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
          throw new Error('The server is blocking our request (403 Forbidden). Please try again later or manually add the product.');
        }
        throw new Error(`Server returned an unexpected response format (${response.status}).`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch product data');
      }

      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        price: data.price || prev.price,
        description: data.description || prev.description,
        images: data.images && data.images.length > 0 ? data.images : prev.images,
        sourceUrl: data.sourceUrl || prev.sourceUrl,
        sizes: data.sizes && data.sizes.length > 0 ? data.sizes : prev.sizes,
        colors: data.colors && data.colors.length > 0 ? data.colors : prev.colors,
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
    
    if (!formData.images || formData.images.length === 0) {
      toast.error('At least one product image is required');
      return;
    }

    setSubmitting(true);
    try {
      const { id: _, ...restData } = formData;
      const data = {
        ...restData,
        price: Number(formData.price),
        discountPrice: formData.discountPrice ? Number(formData.discountPrice) : undefined,
        stock: Number(formData.stock),
        updatedAt: new Date().toISOString(),
      };

      if (isEditing && id) {
        await updateDoc(doc(db, 'products', id), data as any);
        toast.success('Product updated successfully');
      } else {
        await addDoc(collection(db, 'products'), data);
        toast.success('Product added successfully');
      }
      navigate('/admin/products');
    } catch (error) {
      console.error("Error saving product:", error);
      toast.error('Failed to save product');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <Loader2 className="h-12 w-12 text-emerald-500 animate-spin" />
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
          className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
          <span>{isEditing ? 'Update Product' : 'Save Product'}</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          {/* Fetch from URL Section */}
          {!isEditing && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-8 rounded-[2rem] space-y-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Upload className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Import from URL</h2>
                  <p className="text-xs text-gray-400 font-bold">Paste a product URL to automatically fill the form.</p>
                </div>
              </div>
              
              <div className="flex gap-4">
                <input
                  type="url"
                  placeholder="https://chinaonlinebd.com/product/..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                />
                <button
                  type="button"
                  onClick={handleFetchFromUrl}
                  disabled={fetching}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {fetching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  <span>Fetch</span>
                </button>
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <h2 className="text-xl font-black flex items-center gap-3 text-white">
              <Plus className="h-5 w-5 text-emerald-500" />
              Basic Information
            </h2>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Product Name</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  required
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white"
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
                    className="bg-white/5 border border-white/10 hover:bg-white/10 text-emerald-500 px-6 py-4 rounded-xl font-black transition-all flex items-center gap-2 disabled:opacity-50"
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
                className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white resize-none"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Category</label>
                <select
                  className="w-full bg-[#111111] border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white"
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
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  value={formData.stock ?? 0}
                  onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <h2 className="text-xl font-black flex items-center gap-3 text-white">
              <DollarSign className="h-5 w-5 text-emerald-500" />
              Pricing
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Regular Price (৳)</label>
                <input
                  type="number"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  value={formData.price ?? 0}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Discount Price (Optional)</label>
                <input
                  type="number"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  value={formData.discountPrice || ''}
                  onChange={(e) => setFormData({ ...formData, discountPrice: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 p-8 rounded-[2rem] space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black flex items-center gap-3 text-white">
                <Settings className="h-5 w-5 text-emerald-500" />
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
                    className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all"
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
                        className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white text-xs"
                        value={size}
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
                    className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all"
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
                        className="w-24 bg-white/5 border border-white/10 rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white text-xs"
                        value={color}
                        onChange={(e) => updateColor(idx, e.target.value)}
                      />
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Color Variants (with Images)</label>
                  <button
                    type="button"
                    onClick={addColorVariant}
                    className="p-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
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
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white text-sm"
                          value={variant.name}
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
                                variant.image === img ? "border-emerald-500" : "border-transparent opacity-50"
                              )}
                            >
                              <img src={getProxyUrl(img)} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                        <input
                          type="text"
                          placeholder="Or paste image URL"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white text-xs"
                          value={variant.image}
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
                <Settings className="h-5 w-5 text-emerald-500" />
                Specifications
              </h2>
              <button
                type="button"
                onClick={addSpecification}
                className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500/20 transition-all"
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
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white text-sm"
                        value={spec.key}
                        onChange={(e) => updateSpecification(idx, 'key', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Value</label>
                      <input
                        type="text"
                        placeholder="e.g. Leather"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-all font-bold text-white text-sm"
                        value={spec.value}
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
                <ImageIcon className="h-5 w-5 text-emerald-500" />
                Images
              </h2>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                {formData.images?.length || 0}/10
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {formData.images?.map((img, idx) => (
                <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group">
                  <img src={getProxyUrl(img)} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {(formData.images?.length || 0) < 10 && (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-all bg-white/5"
                >
                  {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
                  <span className="text-[10px] font-black uppercase tracking-widest">Upload</span>
                </button>
              )}
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
              <Video className="h-5 w-5 text-emerald-500" />
              Product Video
            </h2>
            
            {formData.videoUrl ? (
              <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group">
                <video src={formData.videoUrl} className="w-full h-full object-cover" controls />
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
                className="w-full py-8 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-all bg-white/5"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Video className="h-6 w-6" />}
                <span className="text-[10px] font-black uppercase tracking-widest">Upload Video</span>
              </button>
            )}
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
