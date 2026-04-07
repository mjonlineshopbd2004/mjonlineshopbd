import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { getProxyUrl } from '../lib/utils';

export default function Footer() {
  const { settings } = useSettings();
  const [logoError, setLogoError] = React.useState(false);

  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center mb-6">
              {settings.logoUrl && !logoError ? (
                <img 
                  src={getProxyUrl(settings.logoUrl)} 
                  alt={settings.storeName} 
                  className="h-10 w-auto" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <>
                  <span className="text-2xl font-bold text-primary">{settings.storeName.split(' ')[0]}</span>
                  <span className="text-2xl font-bold text-white ml-2">{settings.storeName.split(' ').slice(1).join(' ')}</span>
                </>
              )}
            </Link>
            <p className="text-gray-400 mb-6 leading-relaxed">
              {settings.storeName} is your ultimate destination for fashion, electronics, and accessories in Bangladesh. We provide quality products with fast delivery.
            </p>
            <div className="flex space-x-4">
              {settings.facebook && <a href={settings.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>}
              {settings.instagram && <a href={settings.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>}
              {settings.twitter && <a href={settings.twitter} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>}
              {settings.youtube && <a href={settings.youtube} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></a>}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 font-display uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-4 font-sans">
              <li><Link to="/products" className="hover:text-primary transition-colors">Shop All</Link></li>
              {(settings.categories || []).slice(0, 4).map(category => {
                const name = typeof category === 'string' ? category : category.name;
                return (
                  <li key={name}>
                    <Link to={`/products?category=${encodeURIComponent(name)}`} className="hover:text-primary transition-colors">
                      {name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 font-display uppercase tracking-wider">Information</h3>
            <ul className="space-y-4 font-sans">
              <li><Link to="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/returns" className="hover:text-primary transition-colors">Return Policy</Link></li>
              <li><Link to="/refund" className="hover:text-primary transition-colors">Refund Policy</Link></li>
              <li><Link to="/after-sales" className="hover:text-primary transition-colors">After Sales Service</Link></li>
              <li><Link to="/terms" className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 font-display uppercase tracking-wider">Contact Us</h3>
            <ul className="space-y-4 font-sans">
              <li className="flex items-start space-x-3">
                <MapPin className="h-5 w-5 text-primary mt-1" />
                <span>{settings.address}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-primary" />
                <span>{settings.phone}</span>
              </li>
              <li className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-primary" />
                <span>{settings.email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center w-full">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            © {new Date().getFullYear()} {settings.storeName}. All rights reserved.
          </p>
          <div className="flex items-center space-x-4">
            <p className="text-xs text-gray-600 font-bold">Secure Payment & Fast Delivery</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
