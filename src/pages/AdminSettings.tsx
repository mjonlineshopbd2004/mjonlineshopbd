import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';
import { Save, Globe, Phone, Mail, MapPin, Facebook, Instagram, Youtube, Twitter, Truck, Trash2, AlertTriangle, Upload, Image as ImageIcon, Loader2, RotateCcw, X } from 'lucide-react';
import { uploadFile } from '../lib/upload';
import { useAuth } from '../contexts/AuthContext';
import { getProxyUrl } from '../lib/utils';
import Modal from '../components/Modal';

interface Banner {
  topText?: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

interface Category {
  name: string;
  image: string;
}

interface SiteSettings {
  storeName: string;
  shopTagline: string;
  logoUrl: string;
  phone: string;
  whatsappNumber: string;
  paymentNumber: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  youtube: string;
  twitter: string;
  deliveryChargeInside: number;
  deliveryChargeOutside: number;
  topBannerText: string;
  topBannerLink: string;
  enableImageSearch: boolean;
  primaryColor: string;
  bannerTextColor: string;
  banners: Banner[];
  smallBanners: Banner[];
  categories: Category[];
}

export default function AdminSettings() {
  const { user } = useAuth();
  const defaultSettings: SiteSettings = {
    storeName: 'MJ ONLINE SHOP BD',
    shopTagline: 'Premium Online Shop',
    logoUrl: '',
    phone: '01810580592',
    whatsappNumber: '01810580592',
    paymentNumber: '01810580592',
    email: 'mjonlineshopbd@gmail.com',
    address: 'Dhaka, Bangladesh',
    facebook: '',
    instagram: '',
    youtube: '',
    twitter: '',
    deliveryChargeInside: 60,
    deliveryChargeOutside: 120,
    topBannerText: 'Free Delivery on orders over ৳2000!',
    topBannerLink: '',
    enableImageSearch: true,
    primaryColor: '#10b981',
    bannerTextColor: '#111827',
    banners: [
      {
        topText: 'Exclusive Offer',
        title: 'Premium Collection 2026',
        subtitle: 'Discover the latest trends in fashion and electronics with MJ ONLINE SHOP BD.',
        image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1920',
        link: '/products',
      }
    ],
    smallBanners: [
      {
        topText: 'Limited Time',
        title: 'Weekend Discount',
        subtitle: 'Strawberry Water Drinks Flavors Awesome',
        image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=600',
        link: '/products',
      }
    ],
    categories: [
      { name: 'Bags', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600&h=800' },
      { name: 'Shoes', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600&h=800' },
      { name: 'Jewelry', image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=600&h=800' },
      { name: 'Electronics', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&q=80&w=600&h=800' }
    ],
  };

  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const handleClearData = async () => {
    setShowClearConfirm(true);
  };

  const executeClearData = async () => {
    setShowClearConfirm(false);
    setClearing(true);
    try {
      const productsSnap = await getDocs(collection(db, 'products'));
      const ordersSnap = await getDocs(collection(db, 'orders'));
      const reviewsSnap = await getDocs(collection(db, 'reviews'));

      const batch = writeBatch(db);
      
      productsSnap.docs.forEach((d) => batch.delete(d.ref));
      ordersSnap.docs.forEach((d) => batch.delete(d.ref));
      reviewsSnap.docs.forEach((d) => batch.delete(d.ref));

      await batch.commit();
      toast.success('All store data has been cleared');
      window.location.reload();
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear data');
    } finally {
      setClearing(false);
    }
  };

  const handleResetSettings = async () => {
    setShowResetConfirm(true);
  };

  const executeResetSettings = async () => {
    setShowResetConfirm(false);
    setClearing(true);
    try {
      const defaultSettings = {
        storeName: 'MJ Online Shop BD',
        storeEmail: 'mjonlineshopbd@gmail.com',
        storePhone: '+880123456789',
        storeAddress: 'Dhaka, Bangladesh',
        logoUrl: '',
        primaryColor: '#22c55e',
        enableImageSearch: true,
        banners: [
          {
            id: '1',
            image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=1920',
            title: 'Fresh Grocery Delivery',
            subtitle: 'Get up to 30% off on your first order',
            link: '/products'
          }
        ],
        smallBanners: [
          {
            id: '1',
            image: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=600',
            title: 'Weekend Special',
            subtitle: 'Fresh organic vegetables',
            link: '/products'
          }
        ],
        deliveryCharges: {
          insideDhaka: 60,
          outsideDhaka: 120
        },
        socialLinks: {
          facebook: '',
          instagram: '',
          youtube: '',
          whatsapp: ''
        }
      };
      
      await setDoc(doc(db, 'settings', 'site'), defaultSettings);
      setSettings(defaultSettings);
      toast.success('Settings reset to defaults');
      window.location.reload();
    } catch (error) {
      console.error('Error resetting settings:', error);
      toast.error('Failed to reset settings');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'site');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as any;
          const rawCategories = data.categories || [];
          const normalizedCategories = rawCategories.map((cat: any) => 
            typeof cat === 'string' ? { name: cat, image: '' } : cat
          );
          setSettings({ ...defaultSettings, ...data, categories: normalizedCategories } as SiteSettings);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleLogoUpload = async (file: File) => {
    if (!user) return;
    setUploadingLogo(true);
    try {
      const idToken = await user.getIdToken();
      const url = await uploadFile(file, idToken);
      setSettings({ ...settings, logoUrl: url });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (index: number, file: File, isSmall: boolean = false) => {
    if (!user) return;
    setUploadingIndex(isSmall ? index + 100 : index);
    try {
      const idToken = await user.getIdToken();
      const url = await uploadFile(file, idToken);
      if (isSmall) {
        const newBanners = [...(settings.smallBanners || [])];
        if (!newBanners[index]) newBanners[index] = { title: '', subtitle: '', image: '', link: '' };
        newBanners[index].image = url;
        setSettings({ ...settings, smallBanners: newBanners });
      } else {
        const newBanners = [...settings.banners];
        newBanners[index].image = url;
        setSettings({ ...settings, banners: newBanners });
      }
      toast.success('Banner image uploaded');
    } catch (error) {
      toast.error('Failed to upload banner image');
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'site'), settings);
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center min-h-[400px] bg-[#0a0a0a]">
        <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="container-custom py-8 sm:py-12 bg-[#0a0a0a] min-h-screen text-white space-y-12">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-2 text-white">Settings</h1>
        <p className="text-gray-400 font-bold">Configure your store information and preferences</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-12">
        {/* General Settings */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
          <h2 className="text-xl font-black flex items-center gap-3 text-white">
            <Globe className="h-6 w-6 text-emerald-500" />
            General Information
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Store Name</label>
              <input
                type="text"
                value={settings.storeName || ''}
                onChange={(e) => setSettings({ ...settings, storeName: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Shop Tagline</label>
              <input
                type="text"
                value={settings.shopTagline || ''}
                onChange={(e) => setSettings({ ...settings, shopTagline: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                placeholder="Premium Online Shop"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Store Logo</label>
              <div className="flex items-center gap-6">
                <div className="relative group h-24 w-24 bg-white/5 rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
                  {settings.logoUrl ? (
                    <img src={getProxyUrl(settings.logoUrl)} alt="Logo" className="h-full w-full object-contain p-2" />
                  ) : (
                    <div className="text-gray-500 font-black text-2xl">{settings.storeName.charAt(0)}</div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label className="cursor-pointer p-2 text-white hover:scale-110 transition-transform">
                      <Upload className="h-5 w-5" />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                      />
                    </label>
                  </div>
                  {uploadingLogo && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={settings.logoUrl || ''}
                    onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-3 outline-none focus:border-emerald-500 transition-all font-bold text-white text-sm"
                    placeholder="Logo URL (Optional)"
                  />
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2">Recommended: Square PNG with transparent background</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Hotline Number</label>
              <div className="relative group">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={settings.phone || ''}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">WhatsApp Number</label>
              <div className="relative group">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={settings.whatsappNumber || ''}
                  onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Payment Number (bKash/Nagad)</label>
              <div className="relative group">
                <Phone className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={settings.paymentNumber || ''}
                  onChange={(e) => setSettings({ ...settings, paymentNumber: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  required
                />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="email"
                  value={settings.email || ''}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  required
                />
              </div>
            </div>
            <div className="space-y-3 md:col-span-2">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Store Address</label>
              <div className="relative group">
                <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
                <input
                  type="text"
                  value={settings.address || ''}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Feature Controls */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
          <h2 className="text-xl font-black flex items-center gap-3 text-white">
            <Save className="h-6 w-6 text-emerald-500" />
            Feature Controls
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
              <div>
                <p className="font-black text-white">Image Search</p>
                <p className="text-xs text-gray-500 font-bold">Enable searching products by uploading images</p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, enableImageSearch: !settings.enableImageSearch })}
                className={`w-14 h-8 rounded-full transition-all relative ${settings.enableImageSearch ? 'bg-emerald-500' : 'bg-gray-700'}`}
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${settings.enableImageSearch ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/10">
              <div>
                <p className="font-black text-white">Primary Theme Color</p>
                <p className="text-xs text-gray-500 font-bold">Change the main color of your shop</p>
              </div>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-xl border border-white/20"
                  style={{ backgroundColor: settings.primaryColor }}
                />
                <input
                  type="color"
                  value={settings.primaryColor || '#10b981'}
                  onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                  className="w-12 h-12 bg-transparent border-none cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Banner Settings */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
          <h2 className="text-xl font-black flex items-center gap-3 text-white">
            <ImageIcon className="h-6 w-6 text-emerald-500" />
            Banner & Promotions
          </h2>
          
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Top Banner Text</label>
                <input
                  type="text"
                  value={settings.topBannerText || ''}
                  onChange={(e) => setSettings({ ...settings, topBannerText: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Top Banner Link</label>
                <input
                  type="text"
                  value={settings.topBannerLink || ''}
                  onChange={(e) => setSettings({ ...settings, topBannerLink: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                  placeholder="/products"
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Banner Text Color</label>
                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-6 py-3">
                  <div 
                    className="w-8 h-8 rounded-lg border border-white/20"
                    style={{ backgroundColor: settings.bannerTextColor }}
                  />
                  <input
                    type="color"
                    value={settings.bannerTextColor || '#000000'}
                    onChange={(e) => setSettings({ ...settings, bannerTextColor: e.target.value })}
                    className="w-full h-10 bg-transparent border-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 space-y-8">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-white">Hero Banners</h3>
                <button
                  type="button"
                  onClick={() => setSettings({
                    ...settings,
                    banners: [...settings.banners, { title: '', subtitle: '', image: '', link: '' }]
                  })}
                  className="bg-emerald-500/10 text-emerald-500 px-6 py-2 rounded-xl font-black text-xs hover:bg-emerald-500/20 transition-all"
                >
                  + Add Banner
                </button>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {settings.banners.map((banner, index) => (
                  <div key={index} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-8 relative group">
                    <button
                      type="button"
                      onClick={() => {
                        const newBanners = settings.banners.filter((_, i) => i !== index);
                        setSettings({ ...settings, banners: newBanners });
                      }}
                      className="absolute top-6 right-6 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Banner Top Text (Small)</label>
                        <input
                          type="text"
                          value={banner.topText || ''}
                          onChange={(e) => {
                            const newBanners = [...settings.banners];
                            newBanners[index].topText = e.target.value;
                            setSettings({ ...settings, banners: newBanners });
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                          placeholder="Exclusive Offer"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Banner Title</label>
                        <input
                          type="text"
                          value={banner.title || ''}
                          onChange={(e) => {
                            const newBanners = [...settings.banners];
                            newBanners[index].title = e.target.value;
                            setSettings({ ...settings, banners: newBanners });
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Banner Subtitle</label>
                        <input
                          type="text"
                          value={banner.subtitle || ''}
                          onChange={(e) => {
                            const newBanners = [...settings.banners];
                            newBanners[index].subtitle = e.target.value;
                            setSettings({ ...settings, banners: newBanners });
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                        />
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex justify-between">
                          <span>Banner Image</span>
                          <span className="text-emerald-500 font-black">Size: 1920x800px</span>
                        </label>
                        <div className="relative">
                          {banner.image ? (
                            <div className="relative aspect-[19/8] rounded-2xl overflow-hidden border border-white/10 group/img">
                              <img src={getProxyUrl(banner.image)} alt="" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <label className="cursor-pointer bg-white text-black px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform">
                                  Change Image
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={(e) => e.target.files?.[0] && handleBannerUpload(index, e.target.files[0])}
                                  />
                                </label>
                              </div>
                            </div>
                          ) : (
                            <label className="flex flex-col items-center justify-center aspect-[19/8] bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-all group/upload">
                              {uploadingIndex === index ? (
                                <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                              ) : (
                                <>
                                  <Upload className="h-8 w-8 text-gray-500 group-hover/upload:text-emerald-500 transition-colors mb-2" />
                                  <span className="text-xs font-black text-gray-500 group-hover/upload:text-emerald-500 uppercase tracking-widest">Upload Banner</span>
                                </>
                              )}
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => e.target.files?.[0] && handleBannerUpload(index, e.target.files[0])}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Button Link</label>
                        <input
                          type="text"
                          value={banner.link || ''}
                          onChange={(e) => {
                            const newBanners = [...settings.banners];
                            newBanners[index].link = e.target.value;
                            setSettings({ ...settings, banners: newBanners });
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                          placeholder="/products"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Small Banners */}
              <div className="pt-8 border-t border-white/5 space-y-8">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-black text-white">Small Banners (Side)</h3>
                  <button
                    type="button"
                    onClick={() => setSettings({
                      ...settings,
                      smallBanners: [...(settings.smallBanners || []), { title: '', subtitle: '', image: '', link: '' }]
                    })}
                    className="bg-emerald-500/10 text-emerald-500 px-6 py-2 rounded-xl font-black text-xs hover:bg-emerald-500/20 transition-all"
                  >
                    + Add Small Banner
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {(settings.smallBanners || []).map((banner, index) => (
                    <div key={index} className="p-8 bg-white/5 rounded-3xl border border-white/10 space-y-8 relative group">
                      <button
                        type="button"
                        onClick={() => {
                          const newBanners = settings.smallBanners.filter((_, i) => i !== index);
                          setSettings({ ...settings, smallBanners: newBanners });
                        }}
                        className="absolute top-6 right-6 p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Banner Top Text (Small)</label>
                          <input
                            type="text"
                            value={banner.topText || ''}
                            onChange={(e) => {
                              const newBanners = [...settings.smallBanners];
                              newBanners[index].topText = e.target.value;
                              setSettings({ ...settings, smallBanners: newBanners });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                            placeholder="Limited Time"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Banner Title</label>
                          <input
                            type="text"
                            value={banner.title || ''}
                            onChange={(e) => {
                              const newBanners = [...settings.smallBanners];
                              newBanners[index].title = e.target.value;
                              setSettings({ ...settings, smallBanners: newBanners });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Banner Subtitle</label>
                          <input
                            type="text"
                            value={banner.subtitle || ''}
                            onChange={(e) => {
                              const newBanners = [...settings.smallBanners];
                              newBanners[index].subtitle = e.target.value;
                              setSettings({ ...settings, smallBanners: newBanners });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                          />
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex justify-between">
                            <span>Banner Image</span>
                            <span className="text-emerald-500 font-black">Size: 600x600px</span>
                          </label>
                          <div className="relative">
                            {banner.image ? (
                              <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 group/img">
                                <img src={getProxyUrl(banner.image)} alt="" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                  <label className="cursor-pointer bg-white text-black px-6 py-2 rounded-xl font-black text-xs hover:scale-105 transition-transform">
                                    Change Image
                                    <input
                                      type="file"
                                      className="hidden"
                                      accept="image/*"
                                      onChange={(e) => e.target.files?.[0] && handleBannerUpload(index, e.target.files[0], true)}
                                    />
                                  </label>
                                </div>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center aspect-square bg-white/5 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-emerald-500/50 transition-all group/upload">
                                {uploadingIndex === index + 100 ? (
                                  <Loader2 className="h-8 w-8 text-emerald-500 animate-spin" />
                                ) : (
                                  <>
                                    <Upload className="h-8 w-8 text-gray-500 group-hover/upload:text-emerald-500 transition-colors mb-2" />
                                    <span className="text-xs font-black text-gray-500 group-hover/upload:text-emerald-500 uppercase tracking-widest">Upload Banner</span>
                                  </>
                                )}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => e.target.files?.[0] && handleBannerUpload(index, e.target.files[0], true)}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Button Link</label>
                          <input
                            type="text"
                            value={banner.link || ''}
                            onChange={(e) => {
                              const newBanners = [...settings.smallBanners];
                              newBanners[index].link = e.target.value;
                              setSettings({ ...settings, smallBanners: newBanners });
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                            placeholder="/products"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Settings */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
          <h2 className="text-xl font-black flex items-center gap-3 text-white">
            <Truck className="h-6 w-6 text-emerald-500" />
            Delivery Charges
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Inside Dhaka (৳)</label>
              <input
                type="number"
                value={settings.deliveryChargeInside ?? 0}
                onChange={(e) => setSettings({ ...settings, deliveryChargeInside: Number(e.target.value) || 0 })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                required
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Outside Dhaka (৳)</label>
              <input
                type="number"
                value={settings.deliveryChargeOutside ?? 0}
                onChange={(e) => setSettings({ ...settings, deliveryChargeOutside: Number(e.target.value) || 0 })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                required
              />
            </div>
          </div>
        </div>

        {/* Social Media */}
        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 space-y-8">
          <h2 className="text-xl font-black flex items-center gap-3 text-white">
            <Globe className="h-6 w-6 text-emerald-500" />
            Social Media Links
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Facebook className="h-4 w-4" /> Facebook
              </label>
              <input
                type="url"
                value={settings.facebook || ''}
                onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                placeholder="https://facebook.com/yourpage"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Instagram className="h-4 w-4" /> Instagram
              </label>
              <input
                type="url"
                value={settings.instagram || ''}
                onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                placeholder="https://instagram.com/yourprofile"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Youtube className="h-4 w-4" /> Youtube
              </label>
              <input
                type="url"
                value={settings.youtube || ''}
                onChange={(e) => setSettings({ ...settings, youtube: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                placeholder="https://youtube.com/yourchannel"
              />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 flex items-center gap-2">
                <Twitter className="h-4 w-4" /> Twitter
              </label>
              <input
                type="url"
                value={settings.twitter || ''}
                onChange={(e) => setSettings({ ...settings, twitter: e.target.value })}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
                placeholder="https://twitter.com/yourprofile"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end sticky bottom-8 z-10">
          <button
            type="submit"
            disabled={saving}
            className="bg-emerald-600 text-white px-12 py-5 rounded-2xl font-black hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-600/20 flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="animate-spin h-6 w-6" />
            ) : (
              <Save className="h-6 w-6" />
            )}
            <span>Save Settings</span>
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-[2.5rem] p-8 space-y-8">
        <div className="flex items-center gap-3 text-red-500">
          <AlertTriangle className="h-6 w-6" />
          <h2 className="text-xl font-black uppercase tracking-widest">Danger Zone</h2>
        </div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="font-black text-white text-lg mb-1">Clear All Store Data</p>
            <p className="text-sm text-gray-400 font-bold">This will permanently delete all products, orders, and reviews. This action cannot be undone.</p>
          </div>
          <button
            onClick={handleClearData}
            disabled={clearing}
            className="bg-red-500/10 text-red-500 px-8 py-4 rounded-2xl font-black hover:bg-red-500/20 transition-all border border-red-500/20 flex items-center gap-3 disabled:opacity-50 whitespace-nowrap"
          >
            {clearing ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <Trash2 className="h-5 w-5" />
            )}
            <span>Clear All Data</span>
          </button>
        </div>

        <div className="pt-8 border-t border-red-500/10 flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div>
            <p className="font-black text-white text-lg mb-1">Reset Site Settings</p>
            <p className="text-sm text-gray-400 font-bold">Restore all site settings (banners, logo, colors, etc.) to their default values.</p>
          </div>
          <button
            onClick={handleResetSettings}
            disabled={clearing}
            className="bg-amber-500/10 text-amber-500 px-8 py-4 rounded-2xl font-black hover:bg-amber-500/20 transition-all border border-amber-500/20 flex items-center gap-3 disabled:opacity-50 whitespace-nowrap"
          >
            {clearing ? (
              <Loader2 className="animate-spin h-5 w-5" />
            ) : (
              <RotateCcw className="h-5 w-5" />
            )}
            <span>Reset Settings</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear Store Data"
        footer={
          <>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeClearData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Clear Everything
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-gray-600 font-bold">
              Are you sure you want to clear all store data?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will permanently delete all products, orders, and reviews. This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        title="Reset Settings"
        footer={
          <>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeResetSettings}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Reset to Defaults
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-full">
            <RotateCcw className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-gray-600 font-bold">
              Reset all settings to defaults?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This will overwrite your current configuration with the default values.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
