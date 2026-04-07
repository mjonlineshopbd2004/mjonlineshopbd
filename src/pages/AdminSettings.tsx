import React, { useState, useEffect } from 'react';
import { useSettings, defaultSettings, SiteSettings } from '../contexts/SettingsContext';
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
  RotateCcw,
  Share2
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
  const [clearDataConfirm, setClearDataConfirm] = useState('');
  const [resetSettingsConfirm, setResetSettingsConfirm] = useState('');

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

  const handlePaymentLogoUpload = async (field: keyof SiteSettings, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const toastId = toast.loading('Uploading logo...');
    try {
      const idToken = await user.getIdToken();
      const url = await uploadFile(file, idToken);
      if (url) {
        setFormData({ ...formData, [field]: url });
        toast.success('Logo uploaded successfully', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to upload logo', { id: toastId });
    }
  };

  const addBank = () => {
    const newBank = { id: Date.now().toString(), name: '', accountName: '', accountNumber: '', logo: '' };
    setFormData({ ...formData, banks: [...(formData.banks || []), newBank] });
  };

  const removeBank = (index: number) => {
    const newBanks = [...(formData.banks || [])];
    newBanks.splice(index, 1);
    setFormData({ ...formData, banks: newBanks });
  };

  const updateBank = (index: number, field: string, value: string) => {
    const newBanks = [...(formData.banks || [])];
    newBanks[index] = { ...newBanks[index], [field]: value };
    setFormData({ ...formData, banks: newBanks });
  };

  const handleBankLogoUpload = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const toastId = toast.loading('Uploading bank logo...');
    try {
      const idToken = await user.getIdToken();
      const url = await uploadFile(file, idToken);
      if (url) {
        updateBank(index, 'logo', url);
        toast.success('Bank logo uploaded successfully', { id: toastId });
      }
    } catch (error) {
      toast.error('Failed to upload bank logo', { id: toastId });
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
    if (resetSettingsConfirm !== 'RESET SETTINGS') {
      toast.error('Please type "RESET SETTINGS" to confirm');
      return;
    }
    setFormData(defaultSettings);
    setResetSettingsConfirm('');
    toast.success('Settings reset to default values. Click "Save Changes" to apply.');
  };

  const handleClearData = async () => {
    if (clearDataConfirm !== 'DELETE ALL DATA') {
      toast.error('Please type "DELETE ALL DATA" to confirm');
      return;
    }
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
      setClearDataConfirm('');
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
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

      {/* Quick Navigation */}
      <div className="bg-[#1a1a1a] p-2 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar sticky top-4 z-40 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center space-x-2 min-w-max">
          {[
            { id: 'general', label: 'General', icon: Store },
            { id: 'features', label: 'Features', icon: SettingsIcon },
            { id: 'ai-scraper', label: 'AI Scraper', icon: Globe },
            { id: 'payments', label: 'Payments', icon: CreditCard },
            { id: 'banners', label: 'Banners', icon: ImageIcon },
            { id: 'delivery', label: 'Delivery', icon: Truck },
            { id: 'social', label: 'Social', icon: Share2 },
            { id: 'danger', label: 'Danger', icon: Trash2 },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                const element = document.getElementById(item.id);
                if (element) {
                  const offset = 100;
                  const bodyRect = document.body.getBoundingClientRect().top;
                  const elementRect = element.getBoundingClientRect().top;
                  const elementPosition = elementRect - bodyRect;
                  const offsetPosition = elementPosition - offset;

                  window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                  });
                }
              }}
              className="flex items-center px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest text-gray-400 hover:text-emerald-500 hover:bg-emerald-500/10 transition-all whitespace-nowrap group"
            >
              <item.icon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-8">
        {/* General Information */}
        <section id="general" className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
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
          <div className="flex justify-end pt-6 border-t border-emerald-500/10">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </section>

        {/* Feature Controls */}
        <section id="features" className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
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
          <div className="flex justify-end pt-6 border-t border-emerald-500/10">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </section>

        {/* AI Scraper Settings */}
        <section id="ai-scraper" className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-emerald-500/10">
            <div className="p-3 bg-emerald-500/10 rounded-2xl">
              <Globe className="h-7 w-7 text-emerald-500" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-widest text-emerald-500">AI Scraper Settings</h2>
          </div>

          <div className="bg-[#1a1a1a] p-8 rounded-[28px] border border-white/10 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 flex-1">
                <h3 className="font-black text-white text-lg">Gemini API Configuration</h3>
                <p className="text-xs text-gray-500 font-black uppercase tracking-wider">
                  The scraper uses Gemini AI to extract product details from URLs.
                </p>
                <div className="mt-4 space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Custom API Key (Optional)</label>
                  <input
                    type="password"
                    value={settings.geminiApiKey || ''}
                    onChange={(e) => updateSettings({ ...settings, geminiApiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl font-mono text-sm text-emerald-500 focus:outline-none focus:border-emerald-500/50 transition-all"
                  />
                  <p className="text-[10px] text-gray-600 font-bold italic">
                    If your environment key is leaked, you can provide a new one here. This key takes priority.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4 self-end">
                <button
                  onClick={async () => {
                    const toastId = toast.loading('Testing API Key...');
                    try {
                      const idToken = await user?.getIdToken();
                      const response = await fetch('/api/scraper/status', {
                        headers: { 'Authorization': `Bearer ${idToken}` }
                      });
                      const data = await response.json();
                      
                      if (data.status === 'active') {
                        toast.success('API Key is active and working!', { id: toastId });
                      } else if (data.status === 'leaked') {
                        toast.error('API Key is LEAKED. Please use a different key.', { id: toastId });
                      } else if (data.status === 'quota_exceeded') {
                        toast.warning('API Quota Exceeded. Try again later.', { id: toastId });
                      } else if (data.status === 'missing') {
                        toast.error('API Key is missing or invalid.', { id: toastId });
                      } else {
                        toast.error(`API Key Error: ${data.error || 'Unknown error'}`, { id: toastId });
                      }
                    } catch (error) {
                      toast.error('Failed to test API key', { id: toastId });
                    }
                  }}
                  className="px-6 py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Test API Key
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
              <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Environment Variable</span>
                <code className="block text-sm font-mono text-emerald-500">GEMINI_API_KEY</code>
                <p className="text-[10px] text-gray-500 font-bold italic">Set this in your environment variables to enable AI scraping.</p>
              </div>
              <div className="bg-black/20 p-6 rounded-2xl border border-white/5 space-y-2">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Current Status</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-black text-gray-300 uppercase tracking-wider">Managed by Server</span>
                </div>
                <p className="text-[10px] text-gray-500 font-bold italic">The server automatically re-initializes if the key is updated.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Settings */}
        <section id="payments" className="bg-blue-500/5 rounded-[32px] p-8 border border-blue-500/10 shadow-2xl space-y-8">
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
                  <div className="w-10 h-10 bg-pink-500/10 rounded-xl flex items-center justify-center overflow-hidden relative group">
                    <img src={formData.bkashLogo} className="w-full h-full object-contain p-1" alt="bKash" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-1 bg-pink-500 rounded-lg text-white">
                        <Upload className="h-3 w-3" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePaymentLogoUpload('bkashLogo', e)} />
                      </label>
                    </div>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo Link</label>
                  <input
                    type="text"
                    className="w-full bg-[#111111] border border-white/10 focus:border-pink-500 rounded-xl px-4 py-2 outline-none transition-all font-bold text-xs text-blue-400"
                    value={formData.bkashLogo}
                    onChange={(e) => setFormData({ ...formData, bkashLogo: e.target.value })}
                  />
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
            </div>

            {/* Nagad */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-xl flex items-center justify-center overflow-hidden relative group">
                    <img src={formData.nagadLogo} className="w-full h-full object-contain p-1" alt="Nagad" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-1 bg-orange-500 rounded-lg text-white">
                        <Upload className="h-3 w-3" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePaymentLogoUpload('nagadLogo', e)} />
                      </label>
                    </div>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo Link</label>
                  <input
                    type="text"
                    className="w-full bg-[#111111] border border-white/10 focus:border-orange-500 rounded-xl px-4 py-2 outline-none transition-all font-bold text-xs text-blue-400"
                    value={formData.nagadLogo}
                    onChange={(e) => setFormData({ ...formData, nagadLogo: e.target.value })}
                  />
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
            </div>

            {/* Rocket */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center overflow-hidden relative group">
                    <img src={formData.rocketLogo} className="w-full h-full object-contain p-1" alt="Rocket" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-1 bg-purple-500 rounded-lg text-white">
                        <Upload className="h-3 w-3" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePaymentLogoUpload('rocketLogo', e)} />
                      </label>
                    </div>
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
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo Link</label>
                  <input
                    type="text"
                    className="w-full bg-[#111111] border border-white/10 focus:border-purple-500 rounded-xl px-4 py-2 outline-none transition-all font-bold text-xs text-blue-400"
                    value={formData.rocketLogo}
                    onChange={(e) => setFormData({ ...formData, rocketLogo: e.target.value })}
                  />
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
            </div>

            {/* Upay */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center overflow-hidden relative group">
                    <img src={formData.upayLogo} className="w-full h-full object-contain p-1" alt="Upay" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-1 bg-blue-500 rounded-lg text-white">
                        <Upload className="h-3 w-3" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePaymentLogoUpload('upayLogo', e)} />
                      </label>
                    </div>
                  </div>
                  <h3 className="font-black text-white text-base">Upay</h3>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enableUpay: !formData.enableUpay })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.enableUpay ? "bg-blue-500" : "bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    formData.enableUpay ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo Link</label>
                  <input
                    type="text"
                    className="w-full bg-[#111111] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-2 outline-none transition-all font-bold text-xs text-blue-400"
                    value={formData.upayLogo}
                    onChange={(e) => setFormData({ ...formData, upayLogo: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Upay Number</label>
                  <input
                    type="tel"
                    className="w-full bg-[#111111] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                    value={formData.upayNumber}
                    onChange={(e) => setFormData({ ...formData, upayNumber: e.target.value })}
                    placeholder="01XXXXXXXXX"
                  />
                </div>
              </div>
            </div>

            {/* Visa */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-900/10 rounded-xl flex items-center justify-center overflow-hidden relative group">
                    <img src={formData.visaLogo} className="w-full h-full object-contain p-1" alt="Visa" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-1 bg-blue-900 rounded-lg text-white">
                        <Upload className="h-3 w-3" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePaymentLogoUpload('visaLogo', e)} />
                      </label>
                    </div>
                  </div>
                  <h3 className="font-black text-white text-base">Visa Card</h3>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enableVisa: !formData.enableVisa })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.enableVisa ? "bg-blue-900" : "bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    formData.enableVisa ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo Link</label>
                <input
                  type="text"
                  className="w-full bg-[#111111] border border-white/10 focus:border-blue-900 rounded-xl px-4 py-2 outline-none transition-all font-bold text-xs text-blue-400"
                  value={formData.visaLogo}
                  onChange={(e) => setFormData({ ...formData, visaLogo: e.target.value })}
                />
              </div>
            </div>

            {/* Mastercard */}
            <div className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center overflow-hidden relative group">
                    <img src={formData.mastercardLogo} className="w-full h-full object-contain p-1" alt="Mastercard" />
                    <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <label className="cursor-pointer p-1 bg-red-500 rounded-lg text-white">
                        <Upload className="h-3 w-3" />
                        <input type="file" className="hidden" accept="image/*" onChange={(e) => handlePaymentLogoUpload('mastercardLogo', e)} />
                      </label>
                    </div>
                  </div>
                  <h3 className="font-black text-white text-base">Mastercard</h3>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, enableMastercard: !formData.enableMastercard })}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    formData.enableMastercard ? "bg-red-500" : "bg-gray-800"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md",
                    formData.enableMastercard ? "right-1" : "left-1"
                  )} />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Logo Link</label>
                <input
                  type="text"
                  className="w-full bg-[#111111] border border-white/10 focus:border-red-500 rounded-xl px-4 py-2 outline-none transition-all font-bold text-xs text-blue-400"
                  value={formData.mastercardLogo}
                  onChange={(e) => setFormData({ ...formData, mastercardLogo: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bank Management */}
          <div className="space-y-6 pt-8 border-t border-blue-500/10">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <Globe className="h-5 w-5 text-blue-500" />
                <h3 className="font-black text-white text-lg">Bank Transfer Options</h3>
              </div>
              <button
                onClick={addBank}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl font-black text-xs hover:bg-blue-700 transition-all active:scale-95"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Bank
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(formData.banks || []).map((bank, index) => (
                <div key={bank.id} className="bg-[#1a1a1a] p-6 rounded-[28px] border border-white/10 relative group">
                  <button
                    onClick={() => removeBank(index)}
                    className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all z-20 shadow-lg border border-red-500/20"
                    title="Delete Bank"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                  <div className="flex items-center space-x-4 mb-6">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center overflow-hidden relative group/banklogo">
                      {bank.logo ? (
                        <img src={bank.logo} alt={bank.name} className="w-full h-full object-contain p-2" />
                      ) : (
                        <Globe className="h-6 w-6 text-gray-700" />
                      )}
                      <div className="absolute inset-0 bg-black/80 opacity-0 group-hover/banklogo:opacity-100 transition-opacity flex items-center justify-center">
                        <label className="cursor-pointer p-1.5 bg-blue-500 rounded-lg text-white">
                          <Upload className="h-3 w-3" />
                          <input type="file" className="hidden" accept="image/*" onChange={(e) => handleBankLogoUpload(index, e)} />
                        </label>
                      </div>
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        className="w-full bg-transparent border-none focus:ring-0 p-0 font-black text-white text-lg placeholder:text-gray-800"
                        placeholder="Bank Name"
                        value={bank.name}
                        onChange={(e) => updateBank(index, 'name', e.target.value)}
                      />
                      <input
                        type="text"
                        className="w-full bg-transparent border-none focus:ring-0 p-0 font-bold text-blue-400 text-[10px] placeholder:text-gray-800"
                        placeholder="Logo URL"
                        value={bank.logo}
                        onChange={(e) => updateBank(index, 'logo', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Name</label>
                      <input
                        type="text"
                        className="w-full bg-[#111111] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                        value={bank.accountName}
                        onChange={(e) => updateBank(index, 'accountName', e.target.value)}
                        placeholder="MJ Online Shop"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Account Number</label>
                      <input
                        type="text"
                        className="w-full bg-[#111111] border border-white/10 focus:border-blue-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                        value={bank.accountNumber}
                        onChange={(e) => updateBank(index, 'accountNumber', e.target.value)}
                        placeholder="123.456.7890"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-6 border-t border-blue-500/10">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-xl font-black text-base shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </section>

        {/* Banner & Promotions */}
        <section id="banners" className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
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
              <h3 className="font-black text-gray-100 uppercase tracking-widest text-xs">Hero Banners</h3>
              <button onClick={() => addBanner('banners')} className="text-xs font-black text-emerald-500 uppercase hover:underline">+ Add Banner</button>
            </div>
            <div className="space-y-4">
              {(formData.banners || []).map((banner, index) => (
                <div key={index} className="bg-[#1a1a1a] p-6 rounded-[32px] border border-white/10 relative group overflow-hidden">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <span className="text-emerald-500 font-black text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Hero Banner</h4>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Main Slider Configuration</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeBanner('banners', index)} 
                      className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg border border-red-500/20 active:scale-95"
                      title="Delete Banner"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Top Text (Small)</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                          value={banner.topText}
                          onChange={(e) => updateBanner('banners', index, 'topText', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Title</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                          value={banner.title}
                          onChange={(e) => updateBanner('banners', index, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Subtitle</label>
                        <textarea
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white h-24 resize-none"
                          value={banner.subtitle}
                          onChange={(e) => updateBanner('banners', index, 'subtitle', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Link</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                          value={banner.link}
                          onChange={(e) => updateBanner('banners', index, 'link', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Image</label>
                        <div className="text-[10px] font-black text-emerald-500/80 uppercase text-right tracking-wider leading-none">
                          Rec: 1920x1080px<br/>Max: 2MB
                        </div>
                      </div>
                      <div className="aspect-video bg-[#111111] rounded-[24px] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group/img shadow-inner">
                        {banner.image ? (
                          <img src={banner.image} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-gray-800" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <label className="cursor-pointer p-4 bg-emerald-500 rounded-2xl text-white shadow-2xl hover:scale-110 transition-transform flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            <span className="font-black text-xs uppercase tracking-widest">Upload Image</span>
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
              <h3 className="font-black text-gray-100 uppercase tracking-widest text-xs">Small Banners (Side)</h3>
              <button onClick={() => addBanner('smallBanners')} className="text-xs font-black text-emerald-500 uppercase hover:underline">+ Add Banner</button>
            </div>
            <div className="space-y-4">
              {(formData.smallBanners || []).map((banner, index) => (
                <div key={index} className="bg-[#1a1a1a] p-6 rounded-[32px] border border-white/10 relative group overflow-hidden">
                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                        <span className="text-emerald-500 font-black text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-widest">Small Banner</h4>
                        <p className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">Side Banner Configuration</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeBanner('smallBanners', index)} 
                      className="p-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all shadow-lg border border-red-500/20 active:scale-95"
                      title="Delete Banner"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Top Text (Small)</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                          value={banner.topText}
                          onChange={(e) => updateBanner('smallBanners', index, 'topText', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Title</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                          value={banner.title}
                          onChange={(e) => updateBanner('smallBanners', index, 'title', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Subtitle</label>
                        <textarea
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white h-24 resize-none"
                          value={banner.subtitle}
                          onChange={(e) => updateBanner('smallBanners', index, 'subtitle', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Link</label>
                        <input
                          type="text"
                          className="w-full bg-[#111111] border border-white/10 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white"
                          value={banner.link}
                          onChange={(e) => updateBanner('smallBanners', index, 'link', e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-end">
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-1">Banner Image</label>
                        <div className="text-[10px] font-black text-emerald-500/80 uppercase text-right tracking-wider leading-none">
                          Rec: 600x800px<br/>Max: 2MB
                        </div>
                      </div>
                      <div className="aspect-[3/4] max-h-[300px] bg-[#111111] rounded-[24px] border-2 border-dashed border-white/10 flex items-center justify-center overflow-hidden relative group/img shadow-inner mx-auto">
                        {banner.image ? (
                          <img src={banner.image} alt="Banner" className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-gray-800" />
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <label className="cursor-pointer p-4 bg-emerald-500 rounded-2xl text-white shadow-2xl hover:scale-110 transition-transform flex items-center gap-2">
                            <Upload className="h-5 w-5" />
                            <span className="font-black text-xs uppercase tracking-widest">Upload Image</span>
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
          <div className="flex justify-end pt-6 border-t border-emerald-500/10">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </section>

        {/* Delivery Charges */}
        <section id="delivery" className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
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
          <div className="flex justify-end pt-6 border-t border-emerald-500/10">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </section>

        {/* Social Media Links */}
        <section id="social" className="bg-emerald-500/5 rounded-[32px] p-8 border border-emerald-500/10 shadow-2xl space-y-8">
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
          <div className="flex justify-end pt-6 border-t border-emerald-500/10">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-emerald-600 text-white rounded-xl font-black text-base shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50 active:scale-95"
            >
              {isSaving ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </button>
          </div>
        </section>

        {/* Danger Zone */}
        <section id="danger" className="bg-red-500/5 rounded-[32px] p-8 border border-red-500/10 shadow-2xl space-y-8">
          <div className="flex items-center space-x-4 pb-6 border-b border-red-500/10">
            <div className="p-3 bg-red-500/10 rounded-2xl">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-widest text-red-500">Danger Zone</h2>
          </div>

          <div className="space-y-6">
            <div className="flex flex-col p-6 bg-red-500/5 rounded-[24px] border border-red-500/10 gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-white text-base">Clear All Store Data</h3>
                  <p className="text-sm text-gray-500 font-bold mt-1">This will permanently delete all products, orders, and reviews. This action cannot be undone.</p>
                </div>
                <button
                  onClick={handleClearData}
                  disabled={clearDataConfirm !== 'DELETE ALL DATA'}
                  className="flex items-center justify-center px-6 py-3 bg-red-500/10 text-red-500 rounded-xl font-black hover:bg-red-500 hover:text-white transition-all border border-red-500/20 active:scale-95 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-red-500/10 disabled:hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All Data
                </button>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.2em] ml-1">Type "DELETE ALL DATA" to confirm</label>
                <input
                  type="text"
                  placeholder="DELETE ALL DATA"
                  className="w-full bg-black/40 border border-red-500/20 focus:border-red-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white placeholder:text-red-500/20"
                  value={clearDataConfirm}
                  onChange={(e) => setClearDataConfirm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col p-6 bg-orange-500/5 rounded-[24px] border border-orange-500/10 gap-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-black text-white text-base">Reset Site Settings</h3>
                  <p className="text-sm text-gray-500 font-bold mt-1">Restore all site settings (banners, logo, colors, etc.) to their default values.</p>
                </div>
                <button
                  onClick={handleResetSettings}
                  disabled={resetSettingsConfirm !== 'RESET SETTINGS'}
                  className="flex items-center justify-center px-6 py-3 bg-orange-500/10 text-orange-500 rounded-xl font-black hover:bg-orange-500 hover:text-white transition-all border border-orange-500/20 active:scale-95 whitespace-nowrap disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-orange-500/10 disabled:hover:text-orange-500"
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset Settings
                </button>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-orange-500/60 uppercase tracking-[0.2em] ml-1">Type "RESET SETTINGS" to confirm</label>
                <input
                  type="text"
                  placeholder="RESET SETTINGS"
                  className="w-full bg-black/40 border border-orange-500/20 focus:border-orange-500 rounded-xl px-4 py-3 outline-none transition-all font-bold text-sm text-white placeholder:text-orange-500/20"
                  value={resetSettingsConfirm}
                  onChange={(e) => setResetSettingsConfirm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
