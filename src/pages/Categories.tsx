import React from 'react';
import { Link } from 'react-router-dom';
import { useSettings } from '../contexts/SettingsContext';
import { CATEGORIES } from '../constants';
import { getProxyUrl } from '../lib/utils';
import { ChevronRight } from 'lucide-react';

export default function Categories() {
  const { settings } = useSettings();
  const categories = settings.categories && settings.categories.length > 0 ? settings.categories : CATEGORIES;

  return (
    <div className="container-custom py-8 pb-24">
      <h1 className="text-2xl font-black text-gray-900 mb-8 uppercase tracking-tight font-display">All Categories</h1>
      
      <div className="grid grid-cols-1 gap-4">
        {categories.map((category) => {
          const name = typeof category === 'string' ? category : category.name;
          const image = typeof category === 'string' ? '' : category.image;
          
          return (
            <Link
              key={name}
              to={`/products?category=${encodeURIComponent(name)}`}
              className="flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50 bg-gray-50 flex items-center justify-center">
                {getProxyUrl(image) ? (
                  <img 
                    src={getProxyUrl(image)!} 
                    alt={name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        const placeholder = document.createElement('div');
                        placeholder.className = 'w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-1 text-center';
                        placeholder.innerHTML = `
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image opacity-20 mb-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                          <span class="text-[8px] font-bold uppercase tracking-tighter leading-none">No Image</span>
                        `;
                        parent.appendChild(placeholder);
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-1 text-center">
                    <div className="text-gray-300 font-black text-xl mb-0.5">{name.charAt(0)}</div>
                    <span className="text-[8px] font-bold uppercase tracking-tighter leading-none">No Image</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors">{name}</h3>
                <p className="text-xs text-gray-400 font-medium">Explore premium {name.toLowerCase()}</p>
              </div>
              <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
