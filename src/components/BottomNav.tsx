import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Layers, ShoppingCart, Heart, User } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { cn, getProxyUrl } from '../lib/utils';

export default function BottomNav() {
  const location = useLocation();
  const { settings } = useSettings();
  const { totalItems } = useCart();
  const { items: wishlistItems } = useWishlist();
  const [logoError, setLogoError] = React.useState(false);
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
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white z-50 px-2 py-1 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] border-t border-gray-50">
      <div className="flex justify-around items-center h-14">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          if (item.isLogo) {
            return (
              <Link
                key={item.name}
                to="/"
                className="flex flex-col items-center justify-center -translate-y-2 bg-white p-1 rounded-full shadow-xl border-4 border-white w-16 h-16 transition-transform active:scale-95"
              >
                <div className="w-full h-full rounded-full overflow-hidden bg-white flex items-center justify-center border border-gray-100">
                  {settings.logoUrl && !logoError ? (
                    <img 
                      src={getProxyUrl(settings.logoUrl)} 
                      alt="Logo" 
                      className="w-full h-full object-contain"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="w-full h-full bg-primary rounded-full flex items-center justify-center text-white font-black text-xl">
                      {settings.storeName.charAt(0)}
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
              className="flex-1 flex flex-col items-center justify-center transition-all relative"
            >
              <div className={cn(
                "p-1 rounded-lg transition-all",
                isActive ? "text-primary" : "text-gray-400"
              )}>
                {Icon && <Icon className={cn("h-6 w-6", isActive && "stroke-[2.5px]")} />}
              </div>
              <span className={cn(
                "text-[10px] font-bold mt-0.5",
                isActive ? "text-primary" : "text-gray-500"
              )}>
                {item.name}
              </span>
              
              {item.badge !== undefined && item.badge > 0 && (
                <span className="absolute top-0 right-1/4 bg-primary text-white text-[8px] font-black rounded-full h-4 w-4 flex items-center justify-center border-2 border-white">
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
