import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Plus, X, Loader2, Layers, Trash2, Upload, Image as ImageIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { uploadFile } from '../lib/upload';
import { CATEGORIES } from '../constants';
import { getProxyUrl } from '../lib/utils';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Category {
  name: string;
  image: string;
}

interface SiteSettings {
  categories: Category[];
  [key: string]: any;
}

const DEFAULT_SETTINGS = {
  storeName: 'MJ ONLINE SHOP BD',
  email: 'mjonlineshopbd@gmail.com',
  deliveryChargeInside: 60,
  deliveryChargeOutside: 120,
  categories: CATEGORIES.map(name => ({ name, image: '' })),
  banners: []
};

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newCategory, setNewCategory] = useState({ name: '', image: '' });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editCategory, setEditCategory] = useState({ name: '', image: '' });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        const rawCategories = data.categories || [];
        // Migrate strings to objects if necessary
        const normalizedCategories = rawCategories.map((cat: any) => 
          typeof cat === 'string' ? { name: cat, image: '' } : cat
        );
        setCategories(normalizedCategories);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleImageUpload = async (file: File, isEdit: boolean = false) => {
    setUploading(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');
      const url = await uploadFile(file, idToken);
      if (url) {
        if (isEdit) {
          setEditCategory(prev => ({ ...prev, image: url }));
        } else {
          setNewCategory(prev => ({ ...prev, image: url }));
        }
        toast.success('Image uploaded successfully');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }
    
    if (categories.some(cat => cat.name.toLowerCase() === newCategory.name.trim().toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    
    const categoryToAdd = {
      name: newCategory.name.trim(),
      image: newCategory.image
    };

    const updatedCategories = [...categories, categoryToAdd];
    setSaving(true);
    const path = 'settings/site';
    try {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : DEFAULT_SETTINGS;
      
      await setDoc(docRef, {
        ...currentData,
        categories: updatedCategories
      });
      setCategories(updatedCategories);
      setNewCategory({ name: '', image: '' });
      toast.success('Category added successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCategory = async () => {
    if (editingIndex === null) return;
    if (!editCategory.name.trim()) {
      toast.error('Please enter a category name');
      return;
    }

    const updatedCategories = [...categories];
    updatedCategories[editingIndex] = {
      name: editCategory.name.trim(),
      image: editCategory.image
    };

    setSaving(true);
    const path = 'settings/site';
    try {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : DEFAULT_SETTINGS;

      await setDoc(docRef, {
        ...currentData,
        categories: updatedCategories
      });
      setCategories(updatedCategories);
      setEditingIndex(null);
      toast.success('Category updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCategory = async (index: number) => {
    const updatedCategories = categories.filter((_, i) => i !== index);
    setSaving(true);
    const path = 'settings/site';
    try {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : DEFAULT_SETTINGS;
      
      await setDoc(docRef, {
        ...currentData,
        categories: updatedCategories
      });
      setCategories(updatedCategories);
      toast.success('Category removed successfully');
    } catch (error) {
      toast.error('Failed to remove category. Please check your connection.');
      handleFirestoreError(error, OperationType.WRITE, path);
    } finally {
      setSaving(false);
    }
  };

  const SUGGESTED_CATEGORIES = [
    { name: 'Shoes', image: '' },
    { name: 'Bags', image: '' },
    { name: 'Jewelry', image: '' },
    { name: 'Women\'s Clothing', image: '' },
    { name: 'Watches', image: '' },
    { name: 'Electronics & Gadgets', image: '' },
    { name: 'Home & Kitchen', image: '' },
  ];

  const handleQuickAdd = async (suggested: Category) => {
    if (categories.some(cat => cat.name.toLowerCase() === suggested.name.toLowerCase())) {
      toast.error('Category already exists');
      return;
    }
    
    const updatedCategories = [...categories, suggested];
    setSaving(true);
    try {
      const docRef = doc(db, 'settings', 'site');
      const docSnap = await getDoc(docRef);
      const currentData = docSnap.exists() ? docSnap.data() : DEFAULT_SETTINGS;
      
      await setDoc(docRef, {
        ...currentData,
        categories: updatedCategories
      });
      setCategories(updatedCategories);
      toast.success(`${suggested.name} added successfully`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/site');
    } finally {
      setSaving(false);
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
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white space-y-8 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight mb-2 text-white">Category Management</h1>
          <p className="text-gray-400 font-bold">Add, remove, and organize your store categories</p>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
        <div>
          <h2 className="text-xl font-black tracking-tight mb-4 text-white">Quick Add Suggested Categories</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {SUGGESTED_CATEGORIES.map((suggested) => (
              <button
                key={suggested.name}
                onClick={() => handleQuickAdd(suggested)}
                disabled={saving || categories.some(cat => cat.name === suggested.name)}
                className="flex flex-col items-center gap-2 p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-primary/10 hover:border-primary/50 transition-all group disabled:opacity-50"
              >
                <div className="h-12 w-12 rounded-xl overflow-hidden bg-white/5">
                  {getProxyUrl(suggested.image) ? (
                    <img 
                      src={getProxyUrl(suggested.image)!} 
                      alt="" 
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform" 
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          const placeholder = document.createElement('div');
                          placeholder.className = 'w-full h-full flex items-center justify-center bg-white/5 text-gray-600';
                          placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                          parent.appendChild(placeholder);
                        }
                      }}
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-white/5 text-gray-600">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-center">{suggested.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            {editingIndex !== null ? (
              <div className="space-y-6 p-6 bg-primary/5 border border-primary/20 rounded-3xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-black text-primary">Edit Category</h3>
                  <button 
                    onClick={() => setEditingIndex(null)}
                    className="p-2 hover:bg-white/5 rounded-xl transition-all"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Category Name</label>
                  <div className="relative group">
                    <Layers className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={editCategory.name}
                      onChange={(e) => setEditCategory(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && !saving && handleUpdateCategory()}
                      placeholder="Enter category name..."
                      disabled={saving}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-primary transition-all font-bold text-white disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex justify-between">
                    <span>Category Image</span>
                    <span className="text-primary/50">Optional</span>
                  </label>
                  <div className="relative">
                    {editCategory.image ? (
                      <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group/img">
                        <img 
                          src={getProxyUrl(editCategory.image)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <label className="cursor-pointer bg-white text-black px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform">
                            Change
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                            />
                          </label>
                          <button
                            onClick={() => setEditCategory(prev => ({ ...prev, image: '' }))}
                            className="bg-red-500 text-white px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-primary/50 transition-all group/upload">
                        {uploading ? (
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-gray-500 group-hover/upload:text-primary transition-colors mb-2" />
                            <span className="text-xs font-black text-gray-500 group-hover/upload:text-primary uppercase tracking-widest">Upload Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], true)}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setEditingIndex(null)}
                    disabled={saving}
                    className="flex-1 bg-white/5 text-white py-4 rounded-2xl font-black hover:bg-white/10 transition-all disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateCategory}
                    disabled={saving || uploading}
                    className="flex-[2] bg-primary-dark text-white py-4 rounded-2xl font-black hover:bg-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-dark/20"
                  >
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Category Name</label>
                  <div className="relative group">
                    <Layers className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory(prev => ({ ...prev, name: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && !saving && handleAddCategory()}
                      placeholder="Enter category name..."
                      disabled={saving}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-primary transition-all font-bold text-white disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex justify-between">
                    <span>Category Image</span>
                    <span className="text-primary/50">Optional</span>
                  </label>
                  <div className="relative">
                    {newCategory.image ? (
                      <div className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group/img">
                        <img 
                          src={getProxyUrl(newCategory.image)} 
                          alt="" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <label className="cursor-pointer bg-white text-black px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform">
                            Change
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                            />
                          </label>
                          <button
                            onClick={() => setNewCategory(prev => ({ ...prev, image: '' }))}
                            className="bg-red-500 text-white px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center aspect-video bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-primary/50 transition-all group/upload">
                        {uploading ? (
                          <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        ) : (
                          <>
                            <Upload className="h-8 w-8 text-gray-500 group-hover/upload:text-primary transition-colors mb-2" />
                            <span className="text-xs font-black text-gray-500 group-hover/upload:text-primary uppercase tracking-widest">Upload Image</span>
                          </>
                        )}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                        />
                      </label>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleAddCategory}
                  disabled={saving || uploading}
                  className="w-full bg-primary-dark text-white py-4 rounded-2xl font-black hover:bg-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-primary-dark/20"
                >
                  {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
                  Add Category
                </button>
              </>
            )}
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Current Categories</label>
            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((category, index) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={category.name}
                  className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-4 group hover:bg-white/10 transition-all"
                >
                  <div className="h-16 w-16 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    {getProxyUrl(category.image) ? (
                      <img 
                        src={getProxyUrl(category.image)!} 
                        alt={category.name} 
                        className="h-full w-full object-cover" 
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'w-full h-full flex items-center justify-center bg-white/5 text-gray-600';
                            placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-600" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-black text-lg block text-white">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingIndex(index);
                        setEditCategory(category);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="p-3 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Plus className="h-5 w-5 rotate-45" />
                    </button>
                    <button
                      onClick={() => handleRemoveCategory(index)}
                      className="p-3 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </motion.div>
              ))}

              {categories.length === 0 && (
                <div className="text-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Layers className="h-16 w-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400 font-bold">No categories added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-primary/5 border border-primary/10 rounded-[2rem] p-8">
        <h3 className="text-lg font-black text-primary mb-2">Pro Tip</h3>
        <p className="text-gray-400 font-bold text-sm leading-relaxed">
          Categories help your customers find products faster. Make sure to use clear, descriptive names. 
          Changes saved here will reflect immediately on the Navbar, Footer, and Home page.
        </p>
      </div>
    </div>
  );
}
