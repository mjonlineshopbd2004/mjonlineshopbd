import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Facebook, Instagram, Twitter, Youtube, Phone, Mail, MapPin, Download, Headphones } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { cn, getProxyUrl, triggerHaptic } from '../lib/utils';
import { toast } from 'sonner';

export default function Footer() {
  const { settings } = useSettings();
  const [logoError, setLogoError] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    triggerHaptic('heavy');
    
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      // Fallback: If PWA prompt is not available, inform user or provide APK link
      toast.info('Install MJ SHOP App', {
        description: 'To install, click the three dots in your browser and select "Install App" or "Add to Home Screen".',
        action: {
          label: 'Got it',
          onClick: () => {}
        }
      });
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300 pt-16 pb-8 border-t border-gray-800">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <Link to="/" onClick={() => triggerHaptic('medium')} className="flex items-center mb-6">
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
            <div className="flex space-x-4 mb-8">
              {settings.facebook && <a href={settings.facebook} onClick={() => triggerHaptic('light')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Facebook className="h-5 w-5" /></a>}
              {settings.instagram && <a href={settings.instagram} onClick={() => triggerHaptic('light')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Instagram className="h-5 w-5" /></a>}
              {settings.twitter && <a href={settings.twitter} onClick={() => triggerHaptic('light')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Twitter className="h-5 w-5" /></a>}
              {settings.youtube && <a href={settings.youtube} onClick={() => triggerHaptic('light')} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors"><Youtube className="h-5 w-5" /></a>}
            </div>

            {/* App & Chat Buttons */}
            <div className="flex gap-4">
              <button 
                onClick={handleInstallApp}
                className="flex flex-col items-center justify-center bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-2xl p-4 min-w-[100px] transition-all group"
              >
                <div className="bg-white/5 p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Get App</span>
              </button>

              <button 
                onClick={() => {
                  triggerHaptic('medium');
                  navigate('/support');
                }}
                className="flex flex-col items-center justify-center bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-2xl p-4 min-w-[100px] transition-all group"
              >
                <div className="bg-white/5 p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform">
                  <Headphones className="h-6 w-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">Chat</span>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-bold text-lg mb-6 font-display uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-4 font-sans">
              <li><Link to="/products" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">Shop All</Link></li>
              {(settings.categories || []).slice(0, 4).map(category => {
                const name = typeof category === 'string' ? category : category.name;
                return (
                  <li key={name}>
                    <Link to={`/products?category=${encodeURIComponent(name)}`} onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">
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
              <li><Link to="/about" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link to="/contact" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link to="/privacy" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link to="/returns" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">Return Policy</Link></li>
              <li><Link to="/refund" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">Refund Policy</Link></li>
              <li><Link to="/after-sales" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">After Sales Service</Link></li>
              <li><Link to="/terms" onClick={() => triggerHaptic('light')} className="hover:text-primary transition-colors">Terms & Conditions</Link></li>
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
            
            {/* Newsletter in Footer */}
            <div className="mt-4">
              <h4 className="text-white font-bold text-sm mb-4 uppercase tracking-wider">Newsletter</h4>
              <form className="flex flex-col space-y-2">
                <input
                  type="email"
                  placeholder="Enter email"
                  className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:ring-1 focus:ring-primary outline-none"
                  required
                />
                <button 
                  onClick={() => triggerHaptic('medium')}
                  className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all"
                >
                  Subscribe
                </button>
              </form>
            </div>
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
