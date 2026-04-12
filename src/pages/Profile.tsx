import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Save, 
  Loader2, 
  LogOut, 
  Download, 
  Home, 
  ShoppingBag, 
  CreditCard, 
  Truck, 
  Settings, 
  Clock, 
  Package,
  ChevronRight,
  Camera
} from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { getProxyUrl } from '../lib/utils';

export default function Profile() {
  const { profile, updateUserProfile, logout } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('account'); // 'account' or 'settings'
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phone: profile.phone || '',
        address: profile.address || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile(formData);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    { name: 'Dashboard', icon: Home, path: '/profile/dashboard', color: 'text-gray-600' },
    { name: 'Orders', icon: ShoppingBag, path: '/orders', color: 'text-gray-600' },
    { name: 'Payments', icon: CreditCard, path: '/payments', color: 'text-gray-600' },
    { name: 'Delivery', icon: Package, path: '/delivery', color: 'text-gray-600' },
    { name: 'Settings', icon: Settings, path: '/profile/settings', color: 'text-gray-600' },
    { name: 'Logout', icon: LogOut, action: logout, color: 'text-gray-600' },
  ];

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Profile Header */}
      <div className="bg-white pt-12 pb-8 px-6 text-center border-b border-gray-100">
        <div className="relative inline-block">
          <div className="relative">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-3xl font-bold shadow-inner mx-auto overflow-hidden border-4 border-white">
              {profile.photoURL ? (
                <img src={getProxyUrl(profile.photoURL)} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.displayName?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase()
              )}
            </div>
            {/* Online Status Indicator - Adjusted for visibility */}
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-green-500 border-[3px] border-white rounded-full shadow-md z-10"></div>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Active</p>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight font-display">
            {profile.displayName || 'User'}
          </h1>
        </div>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-2 border-b border-gray-100 bg-white">
        {menuItems.map((item, idx) => (
          <div 
            key={item.name}
            className={`
              p-6 flex items-center gap-4 border-gray-50
              ${idx % 2 === 0 ? 'border-r' : ''}
              ${idx < 4 ? 'border-b' : ''}
            `}
          >
            {item.path ? (
              <Link to={item.path} className="flex items-center gap-3 w-full">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm font-bold text-gray-800">{item.name}</span>
              </Link>
            ) : (
              <button onClick={item.action} className="flex items-center gap-3 w-full text-left">
                <item.icon className={`h-5 w-5 ${item.color}`} />
                <span className="text-sm font-bold text-gray-800">{item.name}</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* App Install Banner (if available) */}
      {deferredPrompt && (
        <div className="px-6 mt-8">
          <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary p-2 rounded-lg text-white">
                <Download className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-900">Install Mobile App</p>
                <p className="text-[10px] text-gray-500">For better experience</p>
              </div>
            </div>
            <button 
              onClick={() => {
                deferredPrompt.prompt();
                setDeferredPrompt(null);
              }}
              className="bg-primary text-white px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase"
            >
              Install
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
