import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, Plus } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { getProxyUrl } from '../lib/utils';

export default function HeroSection() {
  const { settings } = useSettings();
  const [bannerError, setBannerError] = React.useState(false);
  const [smallBannerError, setSmallBannerError] = React.useState(false);
  
  React.useEffect(() => {
    setBannerError(false);
    setSmallBannerError(false);
  }, [settings.banners, settings.smallBanners]);

  const [currentIndex, setCurrentIndex] = React.useState(0);
  const [smallBannerIndex, setSmallBannerIndex] = React.useState(0);
  const banners = settings.banners || [];
  const smallBanners = settings.smallBanners || [];

  // Auto-slide effect for main banners
  React.useEffect(() => {
    if (banners.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % banners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [banners.length]);

  // Auto-slide effect for small banners
  React.useEffect(() => {
    if (smallBanners.length <= 1) {
      setSmallBannerIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setSmallBannerIndex((prev) => (prev + 1) % smallBanners.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [smallBanners.length]);

  const displayBanners = banners.length > 0 ? banners : [{
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000",
    title: "Premium Collection",
    subtitle: "Quality products for your lifestyle",
    topText: "New Arrival",
    link: "/products"
  }];

  const currentBanner = displayBanners[currentIndex];

  return (
    <div className="container-custom pt-4 pb-2 md:pt-6 md:pb-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 h-auto lg:h-[500px]">
        {/* Main Left Banner */}
        <div className="lg:col-span-2 relative overflow-hidden bg-[#f3f9fb] group rounded-xl md:rounded-none h-[160px] md:h-[400px] lg:h-full">
          <div className="absolute inset-0 z-0">
            <AnimatePresence initial={false}>
              {displayBanners.map((banner, index) => index === currentIndex && (
                <motion.div
                  key={index}
                  initial={{ x: '100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                  className="absolute inset-0 w-full h-full"
                >
                  <img
                    src={getProxyUrl(banner.image && !bannerError ? banner.image : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=1000")}
                    alt={banner.title}
                    className="w-full h-full object-cover object-right group-hover:scale-105 transition-transform duration-700"
                    referrerPolicy="no-referrer"
                    onError={() => setBannerError(true)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
            {/* Subtle dark gradient overlay for text visibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-[1]" />
          </div>
          
          <div className="relative z-10 h-full flex flex-col justify-end items-start px-4 md:px-16 py-6 md:py-12 text-left">
            <motion.div
              key={`content-${currentIndex}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="max-w-[180px] md:max-w-lg mb-2 md:mb-0"
            >
              {currentBanner.topText && (
                <p className="text-primary font-black uppercase tracking-[0.2em] text-[5px] md:text-xs mb-1 md:mb-4 bg-white/95 backdrop-blur-sm inline-block px-1.5 py-0.5 md:px-4 md:py-1.5 rounded-full shadow-sm">
                  {currentBanner.topText}
                </p>
              )}
              <h2 
                className="text-sm md:text-5xl font-black mb-1 md:mb-4 leading-tight tracking-tight text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-display uppercase"
              >
                {currentBanner.title}
              </h2>
              {currentBanner.subtitle && (
                <p 
                  className="text-[7px] md:text-2xl font-medium mb-2 md:mb-8 text-white/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-sans leading-tight line-clamp-2 md:line-clamp-none"
                >
                  {currentBanner.subtitle}
                </p>
              )}
              <Link
                to={currentBanner.link || "/products"}
                className="inline-flex items-center justify-center px-4 py-2 md:px-8 md:py-3.5 bg-primary text-white font-black text-[8px] md:text-base hover:bg-primary-dark transition-all shadow-[0_4px_0_#9d1a46] hover:shadow-[0_6px_0_#9d1a46] hover:-translate-y-1 active:translate-y-0.5 active:shadow-none group/btn rounded-lg font-sans uppercase tracking-widest"
              >
                Shop Now
                <ArrowRight className="ml-1.5 h-2.5 w-2.5 md:h-5 md:w-5 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </motion.div>
          </div>

          {/* Dots Indicator */}
          {banners.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {banners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentIndex === idx ? 'bg-primary w-6' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side Banner */}
        <div className="hidden lg:flex relative overflow-hidden bg-[#fde1b6] p-6 md:p-10 flex flex-col justify-end group rounded-xl md:rounded-none h-[200px] md:h-[300px] lg:h-full">
          <div className="absolute inset-0 z-0">
            <AnimatePresence initial={false}>
              {smallBanners.length > 0 ? (
                smallBanners.map((banner, index) => index === smallBannerIndex && (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="absolute inset-0 w-full h-full"
                  >
                    <img
                      src={getProxyUrl(banner.image && !smallBannerError ? banner.image : "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=600")}
                      alt={banner.title || "Weekend Discount"}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      referrerPolicy="no-referrer"
                      onError={() => setSmallBannerError(true)}
                    />
                  </motion.div>
                ))
              ) : (
                <img
                  src="https://images.unsplash.com/photo-1621939514649-280e2ee25f60?auto=format&fit=crop&q=80&w=600"
                  alt="Weekend Discount"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              )}
            </AnimatePresence>
          </div>

          {/* Small Banner Dots */}
          {smallBanners.length > 1 && (
            <div className="absolute top-6 right-6 z-20 flex flex-col gap-1.5">
              {smallBanners.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.preventDefault();
                    setSmallBannerIndex(idx);
                  }}
                  className={`w-1.5 transition-all duration-300 rounded-full ${
                    smallBannerIndex === idx ? 'h-6 bg-primary' : 'h-1.5 bg-white/40 hover:bg-white/60'
                  }`}
                />
              ))}
            </div>
          )}

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={smallBannerIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                {smallBanners[smallBannerIndex]?.topText && (
                  <p className="text-primary font-bold uppercase tracking-[0.2em] text-[9px] mb-3 bg-white inline-block px-3 py-1 rounded-sm shadow-sm font-sans">
                    {smallBanners[smallBannerIndex].topText}
                  </p>
                )}
                <h3 
                  className="text-3xl font-bold mb-2 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-display"
                >
                  {smallBanners[smallBannerIndex]?.title || "Weekend Discount"}
                </h3>
                {smallBanners[smallBannerIndex]?.subtitle && (
                  <p 
                    className="text-base font-medium mb-6 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-sans"
                  >
                    {smallBanners[smallBannerIndex].subtitle}
                  </p>
                )}
                <Link
                  to={smallBanners[smallBannerIndex]?.link || "/products"}
                  className="inline-flex items-center gap-3 text-white font-bold hover:text-primary transition-colors group/link font-sans"
                >
                  <div className="w-10 h-10 bg-primary flex items-center justify-center text-white group-hover/link:scale-110 transition-transform shadow-lg">
                    <Plus className="h-5 w-5" />
                  </div>
                  <span className="text-lg">Shop Now</span>
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
