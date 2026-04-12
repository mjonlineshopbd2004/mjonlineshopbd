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
  geminiApiKey: string;
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
  bkashLogo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/bkash.png',
  nagadLogo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/nagad.png',
  rocketLogo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/rocket.png',
  upayLogo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/upay.png',
  bankLogo: '🏦',
  visaLogo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/visa.png',
  mastercardLogo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/mastercard.png',
  bankName: 'Nexus Bank',
  bankAccountNumber: '123.456.7890',
  bankAccountName: 'MJ Online Shop',
  primaryColor: '#10b981',
  geminiApiKey: '',
  bannerTextColor: '#ffffff',
  bannerBgColor: '#111827',
  banners: [],
  smallBanners: [],
  categories: [],
  banks: [
    { id: 'nexus', name: 'Nexus', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/dbbl.png' },
    { id: 'citybank', name: 'City Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/thecitybank.com' },
    { id: 'bracbank', name: 'Brac Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/bracbank.com' },
    { id: 'trustbank', name: 'Trust Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/tblbd.com' },
    { id: 'primebank', name: 'Prime Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/primebank.com.bd' },
    { id: 'nrbcbank', name: 'NRBC Bank', accountName: 'MJ Online Shop', accountNumber: '123.456.7890', logo: 'https://logo.clearbit.com/nrbcommercialbank.com' },
  ],
  mobileBanking: [
    { id: 'bkash', name: 'bKash', number: '01810580592', type: 'personal', logo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/bkash.png' },
    { id: 'nagad', name: 'Nagad', number: '01810580592', type: 'personal', logo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/nagad.png' },
    { id: 'rocket', name: 'Rocket', number: '01810580592', type: 'personal', logo: 'https://raw.githubusercontent.com/tusharnit/bangladesh-payment-gateways/master/logos/rocket.png' },
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
        
        // Handle broken/expired OpenAI logo URL
        if (data.logoUrl && data.logoUrl.includes('files.oaiusercontent.com')) {
          data.logoUrl = defaultSettings.logoUrl;
        }

        // Fix broken Vecteezy and Trust Bank logos that return 403/500
        const fixLogo = (url: string, name?: string) => {
          if (!url) return url;
          const lowerUrl = url.toLowerCase();
          const lowerName = (name || '').toLowerCase();

          // If the URL is from a known problematic domain, replace it with a reliable one
          if (lowerUrl.includes('vecteezy.com') || lowerUrl.includes('tblbd.com') || lowerUrl.includes('oaiusercontent.com')) {
            if (lowerName.includes('bkash') || lowerUrl.includes('bkash')) 
              return 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways/logos/bkash.png';
            if (lowerName.includes('nagad') || lowerUrl.includes('nagad')) 
              return 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways/logos/nagad.png';
            if (lowerName.includes('rocket') || lowerUrl.includes('rocket')) 
              return 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways/logos/rocket.png';
            if (lowerName.includes('upay') || lowerUrl.includes('upay')) 
              return 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways/logos/upay.png';
            if (lowerName.includes('nexus') || lowerName.includes('dbbl') || lowerUrl.includes('nexus') || lowerUrl.includes('dbbl')) 
              return 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways/logos/dbbl.png';
            if (lowerName.includes('visa') || lowerUrl.includes('visa')) 
              return 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways/logos/visa.png';
            if (lowerName.includes('mastercard') || lowerUrl.includes('mastercard')) 
              return 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways/logos/mastercard.png';
            if (lowerName.includes('trust bank') || lowerUrl.includes('tbl_logo')) 
              return 'https://logo.clearbit.com/tblbd.com';
          }
          return url;
        };

        if (data.bkashLogo) data.bkashLogo = fixLogo(data.bkashLogo, 'bkash');
        if (data.nagadLogo) data.nagadLogo = fixLogo(data.nagadLogo, 'nagad');
        if (data.rocketLogo) data.rocketLogo = fixLogo(data.rocketLogo, 'rocket');
        if (data.upayLogo) data.upayLogo = fixLogo(data.upayLogo, 'upay');
        if (data.visaLogo) data.visaLogo = fixLogo(data.visaLogo, 'visa');
        if (data.mastercardLogo) data.mastercardLogo = fixLogo(data.mastercardLogo, 'mastercard');

        if (data.banks) {
          data.banks = data.banks.map((bank: any) => ({
            ...bank,
            logo: fixLogo(bank.logo, bank.name)
          }));
        }

        if (data.mobileBanking) {
          data.mobileBanking = data.mobileBanking.map((mb: any) => ({
            ...mb,
            logo: fixLogo(mb.logo, mb.name)
          }));
        }

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
