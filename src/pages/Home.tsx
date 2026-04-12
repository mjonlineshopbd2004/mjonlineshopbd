import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, limit, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { DEMO_PRODUCTS, CATEGORIES } from '../constants';
import { useSettings } from '../contexts/SettingsContext';
import { getProxyUrl } from '../lib/utils';
import HeroSection from '../components/HeroSection';
import ProductCard from '../components/ProductCard';
import { Link } from 'react-router-dom';
import { ArrowRight, Star, Quote, Truck, ShieldCheck, RotateCcw, Headphones, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { motion } from 'motion/react';

export default function Home() {
  const { settings } = useSettings();
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [trendingProducts, setTrendingProducts] = useState<Product[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right', ref: React.RefObject<HTMLDivElement>) => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const categoryInterval = setInterval(() => {
      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' });
        }
      }
    }, 6000);

    return () => {
      clearInterval(categoryInterval);
    };
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, 'products');
        
        // Featured
        const featuredQuery = query(productsRef, where('featured', '==', true), limit(4));
        const featuredSnap = await getDocs(featuredQuery);
        const featured = featuredSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        
        // Trending
        const trendingQuery = query(productsRef, where('trending', '==', true), limit(8));
        const trendingSnap = await getDocs(trendingQuery);
        const trending = trendingSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));

        // All Products
        const allQuery = query(productsRef, orderBy('createdAt', 'desc'), limit(12));
        const allSnap = await getDocs(allQuery);
        const all = allSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));

        if (featured.length === 0) {
          setFeaturedProducts(DEMO_PRODUCTS.filter(p => p.featured).slice(0, 4));
        } else {
          setFeaturedProducts(featured);
        }

        if (trending.length === 0) {
          setTrendingProducts(DEMO_PRODUCTS.filter(p => p.trending).slice(0, 8));
        } else {
          setTrendingProducts(trending);
        }

        if (all.length === 0) {
          setAllProducts(DEMO_PRODUCTS.slice(0, 12));
        } else {
          setAllProducts(all);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
        setFeaturedProducts(DEMO_PRODUCTS.filter(p => p.featured).slice(0, 4));
        setTrendingProducts(DEMO_PRODUCTS.filter(p => p.trending).slice(0, 8));
        setAllProducts(DEMO_PRODUCTS.slice(0, 12));
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  return (
    <div className="space-y-4 md:space-y-8 pb-20">
      <HeroSection />
      
      {/* Features Bar */}
      <section className="border-b border-gray-100 bg-white">
        <div className="container-custom py-6 md:py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8">
            <div className="flex items-center space-x-3 md:space-x-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <Truck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[10px] md:text-base uppercase tracking-tight">Fast Delivery</h3>
                <p className="text-[8px] md:text-sm text-gray-500 font-medium">All over BD</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 md:space-x-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <ShieldCheck className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[10px] md:text-base uppercase tracking-tight">Secure Pay</h3>
                <p className="text-[8px] md:text-sm text-gray-500 font-medium">bKash, Nagad</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 md:space-x-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <RotateCcw className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[10px] md:text-base uppercase tracking-tight">Easy Returns</h3>
                <p className="text-[8px] md:text-sm text-gray-500 font-medium">7-day policy</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 md:space-x-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100/50">
              <div className="flex-shrink-0 w-10 h-10 md:w-12 md:h-12 bg-white rounded-xl shadow-sm flex items-center justify-center">
                <Headphones className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-[10px] md:text-base uppercase tracking-tight">24/7 Support</h3>
                <p className="text-[8px] md:text-sm text-gray-500 font-medium">WhatsApp</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Products */}
      <section className="container-custom">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shadow-lg">
              <Star className="h-4 w-4 fill-current" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight font-display uppercase">Trending Products</h2>
          </div>
          <Link to="/products" className="bg-primary/5 text-primary px-4 py-2 rounded-full font-bold text-xs flex items-center gap-2 hover:bg-primary hover:text-white transition-all">
            View More <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl h-[280px]"></div>
            ))
          ) : (
            trendingProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* Categories Section */}
      <section className="container-custom">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight font-display uppercase">Top Categories</h2>
          </div>
          <Link to="/categories" className="text-primary font-bold text-xs hover:underline">
            See All
          </Link>
        </div>
        
        <div className="relative group">
          <div 
            ref={scrollRef}
            className="flex gap-4 md:gap-8 py-2 overflow-x-auto no-scrollbar scroll-smooth px-2"
          >
            {(settings.categories && settings.categories.length > 0 ? settings.categories : CATEGORIES).map((category, idx) => {
              const name = typeof category === 'string' ? category : category.name;
              const image = typeof category === 'string' ? null : category.image;
              const proxyUrl = getProxyUrl(image);
              
              return (
                <Link
                  key={`${name}-${idx}`}
                  to={`/products?category=${encodeURIComponent(name)}`}
                  className="flex flex-col items-center gap-3 flex-shrink-0 group/cat"
                >
                  <div className="relative w-20 h-20 md:w-28 md:h-28 overflow-hidden rounded-2xl border border-gray-100 group-hover/cat:border-primary transition-all duration-500 shadow-sm bg-gray-50">
                    {proxyUrl ? (
                      <img
                        src={proxyUrl}
                        alt={name}
                        className="w-full h-full object-cover group-hover/cat:scale-110 transition-transform duration-700"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          const parent = target.parentElement;
                          if (parent) {
                            const placeholder = document.createElement('div');
                            placeholder.className = 'w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-2 text-center';
                            placeholder.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image opacity-20 mb-1"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                              <span class="text-[8px] font-bold uppercase tracking-tighter">No Image</span>
                            `;
                            parent.appendChild(placeholder);
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400 p-2 text-center">
                        <Layers className="h-8 w-8 opacity-20 mb-1" />
                        <span className="text-[8px] font-bold uppercase tracking-tighter">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover/cat:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-[10px] md:text-sm font-black text-gray-900 text-center tracking-tight leading-tight max-w-[80px] md:max-w-[112px] truncate uppercase">{name}</h3>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Our Collection */}
      <section className="container-custom">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="section-title">Our Collection</h2>
            <p className="section-subtitle">Explore all our products</p>
          </div>
          <Link to="/products" className="text-orange-600 font-bold flex items-center hover:underline">
            View All <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
          {loading ? (
            [...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl h-[280px]"></div>
            ))
          ) : (
            allProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))
          )}
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50 py-20">
        <div className="container-custom">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="section-title">Featured Products</h2>
              <p className="section-subtitle">Handpicked items for you</p>
            </div>
            <Link to="/products" className="text-orange-600 font-bold flex items-center hover:underline">
              View All <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-2 md:gap-3">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div key={i} className="animate-pulse bg-white rounded-2xl h-[280px]"></div>
              ))
            ) : (
              featuredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-orange-600 py-24 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 text-white transform -rotate-12"><Quote size={120} /></div>
          <div className="absolute bottom-10 right-10 text-white transform rotate-12"><Quote size={120} /></div>
        </div>
        <div className="container-custom relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight font-display">What Our Customers Say</h2>
            <div className="flex justify-center space-x-1">
              {[...Array(5)].map((_, i) => <Star key={i} className="h-6 w-6 text-yellow-400 fill-current" />)}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Rahat Ahmed', text: 'Amazing quality products! The delivery was super fast, and the customer service was very helpful. Highly recommended!', role: 'Verified Buyer' },
              { name: 'Sumaiya Khan', text: 'I bought a silk saree and it was exactly as shown in the pictures. The fabric is premium and the color is vibrant.', role: 'Fashion Enthusiast' },
              { name: 'Tanvir Hasan', text: 'The electronics collection is great. I got my earbuds within 24 hours in Dhaka. Great experience!', role: 'Tech Lover' }
            ].map((review, i) => (
              <div key={i} className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/20 text-white">
                <p className="text-lg italic mb-6 leading-relaxed">"{review.text}"</p>
                <div>
                  <p className="font-bold text-xl tracking-tight">{review.name}</p>
                  <p className="text-orange-200 text-sm font-bold uppercase tracking-widest">{review.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
