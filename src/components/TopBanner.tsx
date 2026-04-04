import React from 'react';
import { Truck, Phone, Mail } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { Link } from 'react-router-dom';

export default function TopBanner() {
  const { settings } = useSettings();

  return (
    <div className="bg-gray-900 text-white py-2 px-4" style={{ backgroundColor: 'var(--banner-bg, #111827)' }}>
      <div className="container-custom flex flex-col sm:flex-row justify-between items-center text-[10px] sm:text-xs font-bold uppercase tracking-widest">
        <div className="flex items-center space-x-4 mb-2 sm:mb-0">
          <div className="flex items-center space-x-1">
            <Truck className="h-3 w-3 text-primary" />
            {settings.topBannerLink ? (
              <Link 
                to={settings.topBannerLink} 
                className="hover:text-primary transition-colors"
                style={{ color: 'var(--banner-text, #ffffff)' }}
              >
                {settings.topBannerText}
              </Link>
            ) : (
              <span style={{ color: 'var(--banner-text, #ffffff)' }}>{settings.topBannerText}</span>
            )}
          </div>
          <div className="hidden md:flex items-center space-x-1">
            <Phone className="h-3 w-3 text-primary" />
            <span style={{ color: 'var(--banner-text, #ffffff)' }}>{settings.phone}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <Mail className="h-3 w-3 text-primary" />
            <span style={{ color: 'var(--banner-text, #ffffff)' }}>{settings.email}</span>
          </div>
          <div className="hidden sm:block">
            <span className="text-primary">50% & 100% Payment Options</span>
          </div>
        </div>
      </div>
    </div>
  );
}
