import React from 'react';
import { useWishlist } from '../contexts/WishlistContext';
import { useCart } from '../contexts/CartContext';
import { Heart, ShoppingBag, ArrowRight, Trash2, ShoppingCart, ChevronLeft, Home } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { toast } from 'sonner';

export default function Wishlist() {
  const { items, removeFromWishlist } = useWishlist();
  const { addItem } = useCart();
  const navigate = useNavigate();

  const handleAddToCart = (product: any) => {
    addItem(product);
    toast.success('Added to cart');
  };

  if (items.length === 0) {
    return (
      <div className="container-custom py-24 text-center">
        <div className="bg-gray-50 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8">
          <Heart className="h-16 w-16 text-gray-300" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">Your wishlist is empty</h1>
        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
          Save items you love to your wishlist and they'll show up here.
        </p>
        <Link
          to="/products"
          className="inline-flex items-center bg-primary text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:opacity-90 transition-all"
        >
          Explore Products
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="container-custom py-4 flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronLeft className="h-6 w-6 text-gray-600" />
          </button>
          <h1 className="text-2xl font-black text-gray-900 font-display uppercase tracking-tight">Wishlist</h1>
        </div>
      </div>

      <div className="container-custom py-6 max-w-3xl">
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <p className="text-sm font-bold text-gray-900 uppercase tracking-widest">{items.length} items saved</p>
          <button className="text-primary hover:bg-primary/5 p-2 rounded-lg transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          {items.map((product) => (
            <div
              key={product.id}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex items-center p-4 gap-4"
            >
              <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                <img 
                  src={getProxyUrl(product.images[0])} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                    {product.category}
                  </p>
                  <button 
                    onClick={() => removeFromWishlist(product.id)}
                    className="text-gray-400 p-1 hover:text-red-500 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-sm font-bold text-gray-900 line-clamp-1 leading-tight mt-0.5">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base font-black text-primary font-display">
                    {formatPrice(product.discountPrice || product.price)}
                  </span>
                  {product.discountPrice && (
                    <span className="text-[10px] text-gray-400 line-through font-medium">
                      {formatPrice(product.price)}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => handleAddToCart(product)}
                    className="flex-1 bg-primary/10 text-primary py-2 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-3 w-3" />
                    Add to Cart
                  </button>
                  <Link
                    to={`/product/${product.id}`}
                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg font-bold text-[10px] uppercase tracking-wider hover:bg-gray-100 transition-all"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#003d4d] z-50 px-4 py-3 flex items-center gap-4 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <Link 
          to="/" 
          className="flex flex-col items-center justify-center text-white/80 hover:text-white transition-colors"
        >
          <Home className="h-6 w-6" />
          <span className="text-[10px] font-bold uppercase mt-0.5">Home</span>
        </Link>
        <Link
          to="/cart"
          className="flex-1 bg-white text-[#003d4d] py-3.5 rounded-xl font-black text-sm uppercase tracking-wider hover:bg-gray-100 transition-all text-center shadow-lg"
        >
          View Shopping Cart
        </Link>
      </div>
    </div>
  );
}
