import React, { useState, useEffect } from 'react';
import { useSettings, defaultSettings } from '../contexts/SettingsContext';
import { 
  Save, 
  Truck, 
  Phone, 
  CreditCard, 
  Store, 
  Globe, 
  Mail,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  Twitter,
  Plus,
  Trash2,
  Image as ImageIcon,
  Upload,
  Settings as SettingsIcon,
  Layout,
  MessageSquare,
  AlertTriangle,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { uploadFile } from '../lib/upload';
import { useAuth } from '../contexts/AuthContext';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function AdminSettings() {
  const { settings, updateSettings, loading } = useSettings();
  const { user } = useAuth();
  const [formData, setFormData] = useState(settings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings(formData);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const toastId = toast.loading('Uploading logo...');
    try {
      const idToken = await user.getIdToken();
      const url = await uploadFile(file, idToken);
      if (url) {
        setFormData({ ...formData, logoUrl: url });
        toast.success('Logo uploaded successfully', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to upload logo', { id: toastId });
    }
  };

  const handleBannerUpload = async (index: number, type: 'banners' | 'smallBanners', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const toastId = toast.loading('Uploading banner...');
    try {
      const idToken = await user.getIdToken();
      const url = await uploadFile(file, idToken);
      if (url) {
        const newBanners = [...(formData[type] || [])];
        newBanners[index] = { ...newBanners[index], image: url };
        setFormData({ ...formData, [type]: newBanners });
        toast.success('Banner uploaded successfully', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to upload banner', { id: toastId });
    }
  };

  const addBanner = (type: 'banners' | 'smallBanners') => {
    const newBanner = { topText: '', title: '', subtitle: '', image: '', link: '' };
    setFormData({ ...formData, [type]: [...(formData[type] || []), newBanner] });
  };

  const removeBanner = (type: 'banners' | 'smallBanners', index: number) => {
    const newBanners = [...(formData[type] || [])];
    newBanners.splice(index, 1);
    setFormData({ ...formData, [type]: newBanners });
  };

  const updateBanner = (type: 'banners' | 'smallBanners', index: number, field: string, value: string) => {
    const newBanners = [...(formData[type] || [])];
    newBanners[index] = { ...newBanners[index], [field]: value };
    setFormData({ ...formData, [type]: newBanners });
  };

  const handleResetSettings = () => {
    setFormData(defaultSettings);
    toast.success('Settings reset to default values. Click "Save Changes" to apply.');
  };

  const handleClearData = async () => {
    const confirm = window.confirm('CRITICAL: This will delete ALL products, orders, and reviews. This cannot be undone. Are you absolutely sure?');
    if (!confirm) return;

    const toastId = toast.loading('Clearing all store data...');
    try {
      const collections = ['products', 'orders', 'reviews', 'categories', 'coupons', 'transactions', 'refunds'];
      for (const collName of collections) {
        const snapshot = await getDocs(collection(db, collName));
        const batch = writeBatch(db);
        snapshot.docs.forEach((d) => {
          batch.delete(doc(db, collName, d.id));
        });
        await batch.commit();
      }
      toast.success('All store data cleared successfully', { id: toastId });
    } catch (error) {
      console.error('Error clearing data:', error);
      toast.error('Failed to clear store data', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32 text-gray-100 p-6">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-white">Settings</h1>
          <p className="text-gray-400 font-bold text-sm mt-1">Configure your store information and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
        >
          {isSaving ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
          ) : (
            <Save className="h-5 w-5 mr-3" />
          )}
          Save Changes
        </button>
      </div>

      <div className="space-y-8">
        {/* General Information */}
        <section className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-emerald-500/10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Store className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-emerald-500">General Information</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Store Name</label>
              <input
                type="text"
                className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-base text-white placeholder:text-gray-700"
                placeholder="Enter store name"
                value={formData.storeName}
                onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Shop Tagline</label>
              <input
                type="text"
                className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-base text-white placeholder:text-gray-700"
                placeholder="Enter shop tagline"
                value={formData.shopTagline}
                onChange={(e) => setFormData({ ...formData, shopTagline: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Store Logo</label>
              <div className="flex items-center space-x-6 bg-[#1a1a1a] p-4 rounded-2xl border border-white/10">
                <div className="w-16 h-16 rounded-2xl bg-[#111111] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group shrink-0">
                  {formData.logoUrl ? (
                    <img src={formData.logoUrl} alt="Logo" className="w-full h-full object-contain p-2" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-800" />
                  )}
                  <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <label htmlFor="logo-upload" className="cursor-pointer p-2 bg-emerald-500 rounded-xl text-white hover:scale-110 transition-transform">
                      <Upload className="h-4 w-4" />
                      <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                    </label>
                  </div>
                </div>
                <input
                  type="text"
                  className="flex-1 bg-transparent border-none focus:ring-0 py-2 outline-none font-bold text-sm text-blue-400 truncate"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                />
              </div>
              <p className="text-[10px] text-gray-600 font-black uppercase tracking-wider ml-1">Recommended: 512x512 PNG with transparent background</p>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Contact Number</label>
              <div className="relative">
                <input
                  type="tel"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
                <Phone className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">WhatsApp Number</label>
              <div className="relative">
                <input
                  type="tel"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                />
                <MessageSquare className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Payment Number (bKash/Nagad)</label>
              <div className="relative">
                <input
                  type="tel"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.paymentNumber}
                  onChange={(e) => setFormData({ ...formData, paymentNumber: e.target.value })}
                />
                <CreditCard className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email Address</label>
              <div className="relative">
                <input
                  type="email"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Store Address</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
                <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Controls */}
        <section className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-emerald-500/10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <SettingsIcon className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-emerald-500">Feature Controls</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex items-center justify-between bg-[#1a1a1a] p-8 rounded-[28px] border border-white/10">
              <div>
                <h3 className="font-black text-white text-lg">Image Search</h3>
                <p className="text-xs text-gray-500 font-black uppercase tracking-wider mt-1">Enable searching products by uploading images</p>
              </div>
              <button
                onClick={() => setFormData({ ...formData, enableImageSearch: !formData.enableImageSearch })}
                className={cn(
                  "w-16 h-8 rounded-full transition-all relative",
                  formData.enableImageSearch ? "bg-emerald-500" : "bg-gray-800"
                )}
              >
                <div className={cn(
                  "absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-md",
                  formData.enableImageSearch ? "right-1" : "left-1"
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between bg-[#1a1a1a] p-8 rounded-[28px] border border-white/10">
              <div>
                <h3 className="font-black text-white text-lg">Primary Theme Color</h3>
                <p className="text-xs text-gray-500 font-black uppercase tracking-wider mt-1">Change the main color of your shop</p>
              </div>
              <div className="flex items-center space-x-6">
                <input
                  type="color"
                  className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer"
                  value={formData.primaryColor}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                />
                <div className="w-12 h-12 rounded-xl shadow-inner border border-white/10" style={{ backgroundColor: formData.primaryColor }} />
              </div>
            </div>
          </div>
        </section>

        {/* Payment Settings */}
        <section className="bg-blue-500/5 rounded-[32px] p-8 border border-blue-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-blue-500/10">
            <div className="p-3 bg-blue-500/10 rounded-2xl">
              <CreditCard className="h-7 w-7 text-blue-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-blue-500">Payment Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* bKash */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Bkash_logo.svg/1200px-Bkash_logo.svg.png" className="w-6 h-6 object-contain" alt="bKash" />
                  </div>
                  <h3 className="font-black text-white text-base">bKash</h3>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enableBkash: !formData.enableBkash })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.enableBkash ? "bg-pink-500" : "bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    formData.enableBkash ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">bKash Number</label>
                <input
                  type="tel"
                  className="w-full bg-[#111111] border border-white/10 focus:border-pink-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                  value={formData.bkashNumber}
                  onChange={(e) => setFormData({ ...formData, bkashNumber: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>

            {/* Nagad */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center">
                    <img src="https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png" className="w-8 h-8 object-contain" alt="Nagad" />
                  </div>
                  <h3 className="font-black text-white text-base">Nagad</h3>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enableNagad: !formData.enableNagad })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.enableNagad ? "bg-orange-500" : "bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    formData.enableNagad ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Nagad Number</label>
                <input
                  type="tel"
                  className="w-full bg-[#111111] border border-white/10 focus:border-orange-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                  value={formData.nagadNumber}
                  onChange={(e) => setFormData({ ...formData, nagadNumber: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>

            {/* Rocket */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                    <img src="https://download.logo.wine/logo/Rocket_(mobile_banking_service)/Rocket_(mobile_banking_service)-Logo.wine.png" className="w-8 h-8 object-contain" alt="Rocket" />
                  </div>
                  <h3 className="font-black text-white text-base">Rocket</h3>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enableRocket: !formData.enableRocket })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.enableRocket ? "bg-purple-500" : "bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    formData.enableRocket ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rocket Number</label>
                <input
                  type="tel"
                  className="w-full bg-[#111111] border border-white/10 focus:border-purple-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                  value={formData.rocketNumber}
                  onChange={(e) => setFormData({ ...formData, rocketNumber: e.target.value })}
                  placeholder="01XXXXXXXXX"
                />
              </div>
            </div>

            {/* Bank Transfer */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-blue-500" />
                  </div>
                  <h3 className="font-black text-white text-base">Bank Transfer</h3>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enableBankTransfer: !formData.enableBankTransfer })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.enableBankTransfer ? "bg-blue-500" : "bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    formData.enableBankTransfer ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Bank Name</label>
                  <input
                    type="text"
                    className="w-full bg-[#111111] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    placeholder="Nexus Bank"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Account Name</label>
                  <input
                    type="text"
                    className="w-full bg-[#111111] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                    value={formData.bankAccountName}
                    onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                    placeholder="MJ Online Shop"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Account Number</label>
                  <input
                    type="text"
                    className="w-full bg-[#111111] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                    value={formData.bankAccountNumber}
                    onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                    placeholder="123.456.7890"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Banner & Promotions */}
        <section className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-emerald-500/10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Layout className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-emerald-500">Banner & Promotions</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Top Banner Text</label>
              <input
                type="text"
                className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-base text-white"
                value={formData.topBannerText}
                onChange={(e) => setFormData({ ...formData, topBannerText: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Top Banner Link</label>
              <input
                type="text"
                className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-base text-white"
                value={formData.topBannerLink}
                onChange={(e) => setFormData({ ...formData, topBannerLink: e.target.value })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Banner Text Color</label>
              <div className="flex items-center space-x-4 bg-[#1a1a1a] p-3 rounded-2xl border border-white/10">
                <input
                  type="color"
                  className="w-12 h-10 rounded-xl bg-transparent border-none cursor-pointer"
                  value={formData.bannerTextColor}
                  onChange={(e) => setFormData({ ...formData, bannerTextColor: e.target.value })}
                />
                <div className="flex-1 h-6 rounded-full border border-white/10" style={{ backgroundColor: formData.bannerTextColor }} />
              </div>
            </div>
          </div>

          {/* Hero Banners */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-gray-200 uppercase tracking-widest text-[10px]">Hero Banners</h3>
              <button onClick={() => addBanner('banners')} className="text-[10px] font-black text-emerald-500 uppercase hover:underline">+ Add Banner</button>
            </div>
            <div className="space-y-4">
              {(formData.banners || []).map((banner, index) => (
                <div key={index} className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 relative group">
                  <button onClick={() => removeBanner('banners', index)} className="absolute top-4 right-4 p-1.5 text-gray-700 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Top Text (Small)</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs"
                          value={banner.topText}
                          onChange={(e) => updateBanner('banners', index, 'topText', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Title</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs"
                          value={banner.title}
                          onChange={(e) => updateBanner('banners', index, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Subtitle</label>
                        <textarea
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs h-16 resize-none"
                          value={banner.subtitle}
                          onChange={(e) => updateBanner('banners', index, 'subtitle', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Link</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs"
                          value={banner.link}
                          onChange={(e) => updateBanner('banners', index, 'link', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Image</label>
                        <button className="text-[9px] font-black text-emerald-500 uppercase">Edit Image</button>
                      </div>
                      <div className="aspect-[16/9] bg-[#111111] rounded-xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group/img">
                        {banner.image ? (
                          <img src={banner.image} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-gray-800" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer p-2 bg-emerald-500 rounded-full text-white">
                            <Upload className="h-4 w-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerUpload(index, 'banners', e)} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Small Banners */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-gray-200 uppercase tracking-widest text-[10px]">Small Banners (Side)</h3>
              <button onClick={() => addBanner('smallBanners')} className="text-[10px] font-black text-emerald-500 uppercase hover:underline">+ Add Banner</button>
            </div>
            <div className="space-y-4">
              {(formData.smallBanners || []).map((banner, index) => (
                <div key={index} className="bg-[#1a1a1a] p-6 rounded-2xl border border-white/10 relative group">
                  <button onClick={() => removeBanner('smallBanners', index)} className="absolute top-4 right-4 p-1.5 text-gray-700 hover:text-red-500 transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Top Text (Small)</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs"
                          value={banner.topText}
                          onChange={(e) => updateBanner('smallBanners', index, 'topText', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Title</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs"
                          value={banner.title}
                          onChange={(e) => updateBanner('smallBanners', index, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Subtitle</label>
                        <textarea
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs h-16 resize-none"
                          value={banner.subtitle}
                          onChange={(e) => updateBanner('smallBanners', index, 'subtitle', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Link</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-lg px-3 py-2 outline-none transition-all font-bold text-xs"
                          value={banner.link}
                          onChange={(e) => updateBanner('smallBanners', index, 'link', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Banner Image</label>
                        <button className="text-[9px] font-black text-emerald-500 uppercase">Edit Image</button>
                      </div>
                      <div className="aspect-[16/9] bg-[#111111] rounded-xl border border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group/img">
                        {banner.image ? (
                          <img src={banner.image} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-8 w-8 text-gray-800" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                          <label className="cursor-pointer p-2 bg-emerald-500 rounded-full text-white">
                            <Upload className="h-4 w-4" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBannerUpload(index, 'smallBanners', e)} />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Delivery Charges */}
        <section className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-emerald-500/10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Truck className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-emerald-500">Delivery Charges</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Inside Dhaka (৳)</label>
              <input
                type="number"
                className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-base text-white"
                value={formData.deliveryChargeInside}
                onChange={(e) => setFormData({ ...formData, deliveryChargeInside: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Outside Dhaka (৳)</label>
              <input
                type="number"
                className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold text-base text-white"
                value={formData.deliveryChargeOutside}
                onChange={(e) => setFormData({ ...formData, deliveryChargeOutside: Number(e.target.value) })}
              />
            </div>
          </div>
        </section>

        {/* Social Media Links */}
        <section className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-emerald-500/10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Globe className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-emerald-500">Social Media Links</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Facebook Page URL</label>
              <div className="relative">
                <input
                  type="url"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.facebook}
                  onChange={(e) => setFormData({ ...formData, facebook: e.target.value })}
                />
                <Facebook className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Instagram URL</label>
              <div className="relative">
                <input
                  type="url"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.instagram}
                  onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                />
                <Instagram className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Youtube Channel URL</label>
              <div className="relative">
                <input
                  type="url"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.youtube}
                  onChange={(e) => setFormData({ ...formData, youtube: e.target.value })}
                />
                <Youtube className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Twitter URL</label>
              <div className="relative">
                <input
                  type="url"
                  className="w-full bg-[#1a1a1a] border border-white/10 focus:border-emerald-500 rounded-2xl px-6 py-4 pl-14 outline-none transition-all font-bold text-base text-white"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                />
                <Twitter className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-600" />
              </div>
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section className="bg-red-500/5 rounded-[32px] p-8 border border-red-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-red-500/10">
            <div className="p-3 bg-red-500/10 rounded-2xl">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-widest text-red-500">Danger Zone</h2>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-red-500/5 rounded-[24px] border border-red-500/10 gap-4">
              <div>
                <h3 className="font-black text-white text-base">Clear All Store Data</h3>
                <p className="text-sm text-gray-500 font-bold mt-1">This will permanently delete all products, orders, and reviews. This action cannot be undone.</p>
              </div>
              <button
                onClick={handleClearData}
                className="flex items-center justify-center px-6 py-3 bg-red-500/10 text-red-500 rounded-xl font-black hover:bg-red-500 hover:text-white transition-all border border-red-500/20 active:scale-95 whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Data
              </button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 bg-orange-500/5 rounded-[24px] border border-orange-500/10 gap-4">
              <div>
                <h3 className="font-black text-white text-base">Reset Site Settings</h3>
                <p className="text-sm text-gray-500 font-bold mt-1">Restore all site settings (banners, logo, colors, etc.) to their default values.</p>
              </div>
              <button
                onClick={handleResetSettings}
                className="flex items-center justify-center px-6 py-3 bg-orange-500/10 text-orange-500 rounded-xl font-black hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20 active:scale-95 whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset Settings
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
