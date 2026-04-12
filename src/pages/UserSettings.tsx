import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  User, 
  Phone, 
  MapPin, 
  Mail, 
  Save, 
  Loader2, 
  ChevronLeft,
  Camera,
  Globe,
  Building2,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getProxyUrl } from '../lib/utils';
import { BANGLADESH_DISTRICTS } from '../constants';

export default function UserSettings() {
  const { profile, updateUserProfile } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    phone: '',
    emergencyNumber: '',
    district: '',
    city: '',
    address: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.displayName || '',
        phone: profile.phone || '',
        emergencyNumber: profile.emergencyNumber || '',
        district: profile.district || '',
        city: profile.city || '',
        address: profile.address || '',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await updateUserProfile(formData);
      navigate(-1);
    } catch (error) {
      console.error("Profile update error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // In a real app, we would upload to Firebase Storage here
    console.log("Photo upload requested:", file.name);
  };

  if (!profile) return null;

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="container-custom py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">Settings</h1>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="flex flex-col items-center mb-10">
          <div className="relative group">
            <div className="w-28 h-28 bg-gray-200 rounded-full flex items-center justify-center text-gray-400 text-4xl font-bold shadow-inner overflow-hidden border-4 border-white">
              {profile.photoURL ? (
                <img src={getProxyUrl(profile.photoURL)} alt="" className="w-full h-full object-cover" />
              ) : (
                profile.displayName?.charAt(0).toUpperCase() || profile.email?.charAt(0).toUpperCase()
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-primary text-white p-2.5 rounded-full shadow-xl border-4 border-white hover:scale-110 transition-transform"
            >
              <Camera className="h-5 w-5" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload}
            />
          </div>
          <p className="text-xs font-bold text-gray-400 mt-4 uppercase tracking-widest">Change Profile Photo</p>
        </div>

        <div className="mb-8">
          <h2 className="text-lg font-black text-gray-900 font-display uppercase tracking-tight">Settings</h2>
          <p className="text-xs font-bold text-gray-400 mt-1">Update your personal information</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <span className="text-red-500 mr-1">*</span>
              <User className="h-3 w-3 mr-2 text-primary" />
              Name
            </label>
            <input
              type="text"
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-gray-900 text-sm"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <span className="text-red-500 mr-1">*</span>
              <Mail className="h-3 w-3 mr-2 text-gray-400" />
              Email
            </label>
            <input
              type="email"
              disabled
              className="w-full bg-gray-100 border border-transparent rounded-xl px-4 py-3 outline-none font-bold text-gray-500 cursor-not-allowed text-sm"
              value={profile.email}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <span className="text-red-500 mr-1">*</span>
              <Globe className="h-3 w-3 mr-2 text-primary" />
              District
            </label>
            <select
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-gray-900 text-sm appearance-none"
              value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })}
            >
              <option value="">Select District</option>
              {BANGLADESH_DISTRICTS.map(district => (
                <option key={district} value={district}>{district}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <span className="text-red-500 mr-1">*</span>
              <MapPin className="h-3 w-3 mr-2 text-primary" />
              Address
            </label>
            <textarea
              required
              rows={3}
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-gray-900 text-sm"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="House - 07, Road - 2/A, Sector - 4, Uttara, Dhaka - 1230"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <span className="text-red-500 mr-1">*</span>
              <Phone className="h-3 w-3 mr-2 text-primary" />
              Phone
            </label>
            <input
              type="tel"
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-gray-900 text-sm"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+8801xxxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <AlertCircle className="h-3 w-3 mr-2 text-primary" />
              Emergency Number
            </label>
            <input
              type="tel"
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-gray-900 text-sm"
              value={formData.emergencyNumber}
              onChange={(e) => setFormData({ ...formData, emergencyNumber: e.target.value })}
              placeholder="e.g. 017xxxxxxxx"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center">
              <span className="text-red-500 mr-1">*</span>
              <Building2 className="h-3 w-3 mr-2 text-primary" />
              City
            </label>
            <input
              type="text"
              required
              className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all font-bold text-gray-900 text-sm"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              placeholder="Dhaka"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="w-full bg-primary text-white py-4 rounded-xl font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
