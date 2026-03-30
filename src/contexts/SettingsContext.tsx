import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES } from '../constants';

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

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
}

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
  banners: [],
  smallBanners: [],
  categories: [
    { name: 'Shoes', image: 'https://picsum.photos/seed/shoes/600/800' },
    { name: 'Bags', image: 'https://picsum.photos/seed/bags/600/800' },
    { name: 'Jewelry', image: 'https://picsum.photos/seed/jewelry/600/800' },
    { name: 'Women\'s Clothing', image: 'https://picsum.photos/seed/women-clothing/600/800' },
    { name: 'Watches', image: 'https://picsum.photos/seed/watches/600/800' },
    { name: 'Electronics & Gadgets', image: 'https://picsum.photos/seed/electronics/600/800' },
    { name: 'Home & Kitchen', image: 'https://picsum.photos/seed/kitchen/600/800' },
  ],
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'site'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as any;
        const categories = data.categories && data.categories.length > 0 
          ? data.categories 
          : defaultSettings.categories;
        setSettings({ ...defaultSettings, ...data, categories } as SiteSettings);
      }
      setLoading(false);
    }, (error) => {
      console.error('Error fetching settings:', error);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
