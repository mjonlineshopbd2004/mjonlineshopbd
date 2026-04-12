import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { formatPrice, cn, getProxyUrl } from '../lib/utils';
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Home, ChevronLeft } from 'lucide-react';

export default function Cart() {
  const { items, updateQuantity, removeItem, subtotal, toggleSelection, toggleAllSelection, selectedSubtotal, selectedItems } = useCart();
  const navigate = useNavigate();

  const allSelected = items.length > 0 && items.every(item => item.selected);

  if (items.length === 0) {
    return (
      <div className="container-custom py-24 text-center">
        <div className="bg-gray-50 w-32 h-32 rounded-full flex items-center justify-center mx-auto mb-8">
          <ShoppingBag className="h-16 w-16 text-gray-300" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-4">Your cart is empty</h1>
        <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
          Looks like you haven't added anything to your cart yet. Explore our latest collections and find something you love!
        </p>
        <Link
          to="/products"
          className="inline-flex items-center bg-primary text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:opacity-90 transition-all"
        >
          Start Shopping
          <ArrowRight className="ml-2 h-5 w-5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-32">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="container-custom py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ChevronLeft className="h-6 w-6 text-gray-600" />
            </button>
            <h1 className="text-2xl font-black text-gray-900 font-display uppercase tracking-tight">Cart</h1>
          </div>
          
          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Total</p>
                <p className="text-sm font-black text-gray-900">৳ {selectedSubtotal.toFixed(2)}</p>
              </div>
              <button
                onClick={() => navigate('/checkout')}
                disabled={selectedItems.length === 0}
                className="bg-primary text-white px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-tight hover:opacity-90 transition-all disabled:opacity-50"
              >
                Go to Checkout
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="container-custom py-6 max-w-3xl">
        {/* Select All Bar */}
        <div className="bg-white rounded-2xl p-4 mb-6 shadow-sm border border-pink-50 flex items-center justify-between">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative flex items-center">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => toggleAllSelection(e.target.checked)}
                className="peer h-6 w-6 cursor-pointer appearance-none rounded-full border-2 border-gray-300 checked:border-primary checked:bg-primary transition-all"
              />
              <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <span className="text-sm font-bold text-gray-900">Select all</span>
          </label>
          <button className="text-primary hover:bg-primary/5 p-2 rounded-lg transition-colors">
            <Trash2 className="h-5 w-5" />
          </button>
        </div>

        {/* Cart Items */}
        <div className="space-y-6">
          {items.map((item) => (
            <div
              key={`${item.id}-${item.selectedSize}-${item.selectedColor}`}
              className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100"
            >
              <div className="p-4 border-b border-gray-50 flex items-start gap-4">
                <div className="relative flex items-center mt-1">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => toggleSelection(item.id, item.selectedSize, item.selectedColor)}
                    className="peer h-6 w-6 cursor-pointer appearance-none rounded-full border-2 border-gray-300 checked:border-primary checked:bg-primary transition-all"
                  />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>

                <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                  <img 
                    src={getProxyUrl(item.images[0])} 
                    alt={item.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer" 
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter truncate">
                      Cart ID: #COBD_{item.id.slice(0, 8).toUpperCase()}
                    </p>
                    <button 
                      onClick={() => removeItem(item.id, item.selectedSize, item.selectedColor)}
                      className="text-primary p-1 hover:bg-primary/5 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mt-0.5">
                    {item.name}
                  </h3>
                </div>
              </div>

              <div className="p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 bg-white flex-shrink-0">
                    <img src={getProxyUrl(item.images[0])} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="space-y-0.5">
                    {item.selectedColor && (
                      <p className="text-[11px] font-medium text-gray-600">
                        Color : <span className="text-gray-900 font-bold">{item.selectedColor}</span>
                      </p>
                    )}
                    {item.selectedSize && (
                      <p className="text-[11px] font-medium text-gray-600">
                        Specifications : <span className="text-gray-900 font-bold">{item.selectedSize}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                      className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={item.quantity}
                      onChange={(e) => {
                        let val = e.target.value;
                        // Remove non-numeric characters
                        val = val.replace(/\D/g, '');
                        // Remove leading zeros
                        if (val.length > 1) {
                          val = val.replace(/^0+/, '');
                        }
                        
                        if (val === '') {
                          updateQuantity(item.id, 1, item.selectedSize, item.selectedColor);
                        } else {
                          const numVal = parseInt(val);
                          updateQuantity(item.id, numVal, item.selectedSize, item.selectedColor);
                        }
                      }}
                      className="w-8 text-center text-xs font-black bg-transparent outline-none"
                    />
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                      className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400">
                      {item.quantity} X {formatPrice(item.discountPrice || item.price)}
                    </p>
                    <p className="text-sm font-black text-gray-900">
                      ৳ {((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-end items-center gap-4">
                  <p className="text-[11px] font-bold text-gray-900 px-3 py-1 bg-white border border-gray-200 rounded-lg">
                    {item.quantity} Items
                  </p>
                  <p className="text-sm font-black text-primary">
                    ৳ {((item.discountPrice || item.price) * item.quantity).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Cart Summary */}
        <div className="mt-12 bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-xl font-black text-gray-900 text-center mb-8 font-display uppercase tracking-tight">Cart Summary</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-gray-600">Product Price</span>
              <span className="text-base font-black text-gray-900">৳ {selectedSubtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-100">
              <span className="text-base font-black text-gray-900">Grand Total</span>
              <span className="text-lg font-black text-gray-900">৳ {selectedSubtotal.toFixed(2)}</span>
            </div>
          </div>
          
          <button
            onClick={() => navigate('/checkout')}
            disabled={selectedItems.length === 0}
            className="w-full mt-8 bg-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
          >
            Go to Checkout
          </button>
        </div>
      </div>

      {/* Sticky Bottom Bar - Removed as requested */}
    </div>
  );
}
