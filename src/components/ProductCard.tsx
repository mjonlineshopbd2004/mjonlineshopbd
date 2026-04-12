import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingCart, ShoppingBag, Star } from 'lucide-react';
import { Product } from '../types';
import { formatPrice, calculateDiscount, cn, getProxyUrl } from '../lib/utils';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const navigate = useNavigate();
  const discount = calculateDiscount(product.price, product.discountPrice);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    navigate('/checkout');
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    toggleWishlist(product);
    if (isInWishlist(product.id)) {
      toast.info('Removed from wishlist');
    } else {
      toast.success('Added to wishlist');
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group bg-white rounded-xl md:rounded-2xl overflow-hidden shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-500 border border-gray-100/50 flex flex-col h-full"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={getProxyUrl(product.images[0])}
          alt={product.name}
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
          referrerPolicy="no-referrer"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent && !parent.querySelector('.no-image-placeholder')) {
              const placeholder = document.createElement('div');
              placeholder.className = 'no-image-placeholder w-full h-full flex flex-col items-center justify-center bg-gray-100 text-gray-400';
              placeholder.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image-off h-8 w-8 mb-2"><line x1="2" x2="22" y1="2" y2="22"/><path d="M10.41 10.41a2 2 0 1 1-2.82-2.82"/><line x1="10" x2="21" y1="15" y2="15"/><path d="M21 8v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/><path d="m3 16 5-5 3 3"/></svg><span class="text-[10px] font-bold uppercase tracking-widest">No Image</span>';
              parent.appendChild(placeholder);
            }
          }}
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount > 0 && (
            <div className="bg-[#ff3b3b] text-white text-[9px] font-black px-1.5 py-0.5 rounded-lg shadow-md flex items-center justify-center min-w-[32px]">
              -{discount}%
            </div>
          )}
        </div>

        {/* Wishlist Button */}
        <button
          onClick={handleWishlist}
          className={cn(
            "absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full shadow-md transition-all duration-300 z-10 bg-white",
            isInWishlist(product.id) ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <Heart className={cn("h-4 w-4", isInWishlist(product.id) ? "fill-red-500 text-red-500" : "text-gray-400")} />
        </button>

        {/* Quick Actions Removed as requested */}
      </div>

      <div className="p-3 flex flex-col flex-1">
        <p className="text-[8px] md:text-[9px] font-black text-primary uppercase tracking-wider mb-1 font-sans">
          {product.category}
        </p>
        <h3 className="text-gray-900 font-bold text-xs md:text-sm line-clamp-2 mb-2 group-hover:text-primary transition-colors font-display tracking-tight leading-tight min-h-[2.5rem]">
          {product.name}
        </h3>
        
        <div className="mt-auto">
          <div className="flex items-center space-x-1 mb-2">
            <div className="flex text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className={cn("h-2.5 w-2.5 fill-current", i >= Math.floor(product.rating) && "text-gray-200")} />
              ))}
            </div>
            <span className="text-[10px] font-bold text-gray-400 font-sans">({product.reviewsCount})</span>
          </div>
 
          <div className="flex items-baseline gap-2">
            <span className="text-base md:text-xl font-black text-primary font-display">
              ৳ {formatPrice(product.discountPrice || product.price).replace(/[^0-9.]/g, '')}
            </span>
            {product.discountPrice && (
              <span className="text-[10px] md:text-xs text-gray-400 line-through font-medium font-sans">
                ৳ {formatPrice(product.price).replace(/[^0-9.]/g, '')}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
