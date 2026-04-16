import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';
import { getProxyUrl } from '../lib/utils';

export default function SplashScreen() {
  const { settings, loading } = useSettings();
  const [isVisible, setIsVisible] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsVisible(true);
      }
    };

    checkMobile();

    // Minimum 2 seconds display time if visible
    const timer = setTimeout(() => {
      if (!loading) {
        setIsVisible(false);
      }
    }, 2000);

    // Safety timeout: Force hide after 5 seconds no matter what
    const safetyTimer = setTimeout(() => {
      setIsVisible(false);
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(safetyTimer);
    };
  }, [loading]);

  // Hide splash screen once loading is complete (if it took longer than 2s)
  useEffect(() => {
    if (!loading && isVisible) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 500); // Small extra delay for smooth transition
      return () => clearTimeout(timer);
    }
  }, [loading, isVisible]);

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
              {settings.logoUrl && !logoError && !loading ? (
                <motion.img 
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2, duration: 0.8 }}
                  src={getProxyUrl(settings.logoUrl)} 
                  alt={settings.storeName} 
                  className="h-28 w-auto drop-shadow-2xl" 
                  onError={() => setLogoError(true)}
                />
              ) : (
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  transition={{ duration: 0.8, type: "spring" }}
                  className="w-28 h-28 bg-gradient-to-br from-primary to-primary-dark rounded-[2.5rem] flex items-center justify-center text-white font-bold text-6xl shadow-2xl shadow-primary/40"
                >
                  {settings.storeName && !loading ? settings.storeName.charAt(0) : 'M'}
                </motion.div>
              )}
              <motion.div
                animate={{ 
                  scale: [1, 1.4, 1],
                  opacity: [0.2, 0.4, 0.2]
                }}
                transition={{ 
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 bg-primary/30 rounded-[2.5rem] -z-10 blur-2xl"
              />
            </div>
            <div className="text-center mt-4">
              <motion.h1 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-3xl font-black text-gray-900 uppercase tracking-tighter font-display"
              >
                {settings.storeName}
              </motion.h1>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 0.8, duration: 1 }}
                className="h-0.5 bg-primary/20 mx-auto mt-2 rounded-full"
              />
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-[10px] font-black text-primary uppercase tracking-[0.4em] mt-3"
              >
                {settings.shopTagline || 'Premium Online Shop'}
              </motion.p>
            </div>
          </motion.div>

          <div className="absolute bottom-16 flex flex-col items-center gap-6">
            <div className="flex items-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-2 h-2 bg-primary rounded-full"
                />
              ))}
            </div>
            <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Secure Connection</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
