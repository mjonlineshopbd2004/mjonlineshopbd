import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, ShoppingCart, Heart, User } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { cn, getProxyUrl, triggerHaptic } from '../lib/utils';

export default function BottomNav() {
  const location = useLocation();
  const { settings } = useSettings();
  const { totalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const [logoError, setLogoError] = React.useState(false);
  
  React.useEffect(() => {
    setLogoError(false);
  }, [settings.logoUrl]);

  const hideOnPaths = ['/checkout', '/payment'];
  const shouldHide = hideOnPaths.includes(location.pathname);

  if (shouldHide) return null;

  const navItems = [
    { name: 'Categories', path: '/categories', icon: Layers },
    { name: 'Cart', path: '/cart', icon: ShoppingCart, badge: totalItems },
    { name: 'Home', path: '/', isLogo: true },
    { name: 'Wishlist', path: '/wishlist', icon: Heart, badge: wishlistItems.length },
    { name: 'Account', path: '/profile', icon: User },
  ];

  return (
    <div className="md:hidden lg:hidden fixed bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600/70 via-purple-600/70 to-pink-600/70 backdrop-blur-xl z-50 px-2 py-0.5 border-t border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.isLogo) {
            return (
              <Link
                key={item.name}
                to="/"
                onClick={() => triggerHaptic('medium')}
                className="flex flex-col items-center justify-center -translate-y-3 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 p-[3px] rounded-full shadow-[0_0_20px_rgba(168,85,247,0.6)] w-14 h-14 transition-transform active:scale-95 z-10"
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center border-2 border-white/30">
                  {settings.logoUrl && !logoError ? (
                    <img 
                      src={getProxyUrl(settings.logoUrl)} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-white">
                      <ShoppingCart className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.name}
              to={item.path}
              onClick={() => triggerHaptic('light')}
              className="flex-1 flex flex-col items-center justify-center transition-all relative"
            >
              <div className={cn(
                "p-1 rounded-lg transition-all",
                isActive ? "text-white bg-white/40" : "text-white"
              )}>
                {Icon && <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />}
              </div>
              <span className={cn(
                "text-[11px] font-black mt-0.5 uppercase tracking-normal drop-shadow-sm",
                isActive ? "text-white" : "text-white/90"
              )}>
                {item.name}
              </span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0 right-1/4 bg-primary text-white text-[7px] font-black rounded-full h-3.5 w-3.5 flex items-center justify-center border border-white/20">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
