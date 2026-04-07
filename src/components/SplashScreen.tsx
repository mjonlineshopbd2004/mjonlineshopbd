import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';
import { getProxyUrl } from '../lib/utils';

export default function SplashScreen() {
  const { settings } = useSettings();
  const [isVisible, setIsVisible] = useState(true);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 0.8,
              ease: "easeOut"
            }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              {settings.logoUrl && !logoError ? (
                <img 
                  src={getProxyUrl(settings.logoUrl)} 
                  alt={settings.storeName} 
                  className="h-24 w-auto" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className="w-24 h-24 bg-primary rounded-[2rem] flex items-center justify-center text-white font-bold text-5xl shadow-2xl shadow-primary/30">
                  {settings.storeName.charAt(0)}
                </div>
              )}
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-primary/20 rounded-[2rem] -z-10 blur-xl"
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">
                {settings.storeName}
              </h1>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.3em] mt-1">
                {settings.shopTagline || 'Premium Online Shop'}
              </p>
            </div>
          </motion.div>

          <div className="absolute bottom-12 flex flex-col items-center gap-4">
            <div className="w-48 h-1 bg-gray-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.8, ease: "easeInOut" }}
                className="h-full bg-primary"
              />
            </div>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Loading Store...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
