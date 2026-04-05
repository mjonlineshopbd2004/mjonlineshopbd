import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
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

interface BankDetails {
  id: string;
  name: string;
  accountName: string;
  accountNumber: string;
  branchName?: string;
  logo: string;
}

interface MobileBankingDetails {
  id: string;
  name: string;
  number: string;
  type: 'personal' | 'merchant';
  logo: string;
}

export interface SiteSettings {
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
  enableBkash: boolean;
  enableNagad: boolean;
  enableRocket: boolean;
  enableUpay: boolean;
  enableBankTransfer: boolean;
  enableVisa: boolean;
  enableMastercard: boolean;
  bkashNumber: string;
  nagadNumber: string;
  rocketNumber: string;
  upayNumber: string;
  bkashLogo: string;
  nagadLogo: string;
  rocketLogo: string;
  upayLogo: string;
  bankLogo: string;
  visaLogo: string;
  mastercardLogo: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountName: string;
  primaryColor: string;
  bannerTextColor: string;
  bannerBgColor: string;
  banners: Banner[];
  smallBanners: Banner[];
  categories: Category[];
  banks: BankDetails[];
  mobileBanking: MobileBankingDetails[];
}

interface SettingsContextType {
  settings: SiteSettings;
  updateSettings: (newSettings: SiteSettings) => Promise<void>;
  loading: boolean;
}

export const defaultSettings: SiteSettings = {
  storeName: 'MJ ONLINE SHOP BD',
  shopTagline: 'Premium Online Shop',
  logoUrl: '',
  phone: '01610880813',
  whatsappNumber: '01610880813',
  paymentNumber: '01610880813',
  email: 'mjonlineshopbd@gmail.com',
  address: 'Dhaka, Bangladesh',
  facebook: '',
  instagram: '',
  youtube: '',
  twitter: '',
  deliveryChargeInside: 80,
  deliveryChargeOutside: 150,
  topBannerText: 'Free Delivery on orders over ৳10000',
  topBannerLink: '/products',
  enableImageSearch: true,
  enableBkash: true,
  enableNagad: true,
  enableRocket: true,
  enableUpay: true,
  enableBankTransfer: true,
  enableVisa: true,
  enableMastercard: true,
  bkashNumber: '01610880813',
  nagadNumber: '01610880813',
  rocketNumber: '01610880813',
  upayNumber: '01610880813',
  bkashLogo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Bkash_logo.svg/1200px-Bkash_logo.svg.png',
  nagadLogo: 'https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png',
  rocketLogo: 'https://download.logo.wine/logo/Rocket_(mobile_banking_service)/Rocket_(mobile_banking_service)-Logo.wine.png',
  upayLogo: 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/upay.png',
  bankLogo: '🏦',
  visaLogo: 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/visa.png',
  mastercardLogo: 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/mastercard.png',
  bankName: 'Nexus Bank',
  bankAccountNumber: '123.456.7890',
  bankAccountName: 'MJ Online Shop',
  primaryColor: '#10b981',
  bannerTextColor: '#ffffff',
  bannerBgColor: '#111827',
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
  banks: [
    { id: 'nexus', name: 'Nexus', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/dutchbanglabank.com' },
    { id: 'citybank', name: 'City Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/thecitybank.com' },
    { id: 'bracbank', name: 'Brac Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/bracbank.com' },
    { id: 'trustbank', name: 'Trust Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/tblbd.com' },
    { id: 'primebank', name: 'Prime Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/primebank.com.bd' },
    { id: 'nrbcbank', name: 'NRBC Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/nrbcommercialbank.com' },
  ],
  mobileBanking: [
    { id: 'bkash', name: 'bKash', number: '01810580592', type: 'personal', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/Bkash_logo.svg/1200px-Bkash_logo.svg.png' },
    { id: 'nagad', name: 'Nagad', number: '01810580592', type: 'personal', logo: 'https://download.logo.wine/logo/Nagad/Nagad-Logo.wine.png' },
    { id: 'rocket', name: 'Rocket', number: '01810580592', type: 'personal', logo: 'https://download.logo.wine/logo/Rocket_(mobile_banking_service)/Rocket_(mobile_banking_service)-Logo.wine.png' },
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

  const updateSettings = async (newSettings: SiteSettings) => {
    try {
      const { ...dataToSave } = newSettings;
      await setDoc(doc(db, 'settings', 'site'), dataToSave);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, loading }}>
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
