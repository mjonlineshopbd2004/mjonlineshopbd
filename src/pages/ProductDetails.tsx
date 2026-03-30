import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, limit, getDocs, addDoc, orderBy, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, Review } from '../types';
import { DEMO_PRODUCTS } from '../constants';
import { formatPrice, calculateDiscount, cn, getProxyUrl } from '../lib/utils';
import { useCart } from '../contexts/CartContext';
import { useWishlist } from '../contexts/WishlistContext';
import { useAuth } from '../contexts/AuthContext';
import { Star, ShoppingCart, ShoppingBag, Heart, Truck, ShieldCheck, RefreshCw, ChevronRight, Check, ChevronLeft, Plus, Minus, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '../components/ProductCard';

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const productDoc = await getDoc(doc(db, 'products', id));
        let productData: Product | null = null;

        if (productDoc.exists()) {
          productData = { id: productDoc.id, ...productDoc.data() } as Product;
        } else {
          productData = DEMO_PRODUCTS.find(p => p.id === id) || null;
        }

        if (productData) {
          setProduct(productData);
          if (productData.sizes?.length) setSelectedSize(productData.sizes[0]);
          if (productData.colors?.length) setSelectedColor(productData.colors[0]);

          // Fetch related
          const relatedQuery = query(
            collection(db, 'products'),
            where('category', '==', productData.category),
            limit(5)
          );
          const relatedSnap = await getDocs(relatedQuery);
          const related = relatedSnap.docs
            .map(doc => ({ ...doc.data(), id: doc.id } as Product))
            .filter(p => p.id !== id);
          
          if (related.length === 0) {
            setRelatedProducts(DEMO_PRODUCTS.filter(p => p.category === productData?.category && p.id !== id).slice(0, 4));
          } else {
            setRelatedProducts(related);
          }
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    window.scrollTo(0, 0);
  }, [id]);

  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const { user: authUser } = useAuth();

  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;
      try {
        const reviewsQuery = query(
          collection(db, 'reviews'),
          where('productId', '==', id),
          orderBy('createdAt', 'desc')
        );
        const reviewsSnap = await getDocs(reviewsQuery);
        const reviewsData = reviewsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Review));
        setReviews(reviewsData);
      } catch (error) {
        console.error("Error fetching reviews:", error);
      }
    };
    fetchReviews();
  }, [id]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser) {
      toast.error('Please login to leave a review');
      return;
    }
    if (!reviewForm.comment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const reviewData = {
        productId: id,
        userId: authUser.uid,
        userName: authUser.displayName || 'Anonymous',
        rating: reviewForm.rating,
        comment: reviewForm.comment,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, 'reviews'), reviewData);
      const newReview = { id: docRef.id, ...reviewData } as Review;
      
      // Update product rating and reviewsCount
      const productRef = doc(db, 'products', id);
      const newReviewsCount = (product.reviewsCount || 0) + 1;
      const newRating = ((product.rating || 0) * (product.reviewsCount || 0) + reviewForm.rating) / newReviewsCount;
      
      await setDoc(productRef, {
        rating: Number(newRating.toFixed(1)),
        reviewsCount: newReviewsCount
      }, { merge: true });

      setReviews([newReview, ...reviews]);
      setReviewForm({ rating: 5, comment: '' });
      toast.success('Review submitted successfully!');
    } catch (error) {
      console.error("Error submitting review:", error);
      toast.error('Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <div className="container-custom py-20">
        <div className="animate-pulse flex flex-col md:flex-row gap-12">
          <div className="md:w-1/2 aspect-square bg-gray-100 rounded-3xl"></div>
          <div className="md:w-1/2 space-y-6">
            <div className="h-10 bg-gray-100 rounded-xl w-3/4"></div>
            <div className="h-6 bg-gray-100 rounded-xl w-1/4"></div>
            <div className="h-32 bg-gray-100 rounded-xl"></div>
            <div className="h-12 bg-gray-100 rounded-xl w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-custom py-20 text-center">
        <h1 className="text-3xl font-bold mb-4 tracking-tight">Product Not Found</h1>
        <button onClick={() => navigate('/products')} className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold">Back to Shop</button>
      </div>
    );
  }

  const discount = calculateDiscount(product.price, product.discountPrice);

  const handleAddToCart = () => {
    addItem(product, quantity, selectedSize, selectedColor);
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = () => {
    addItem(product, quantity, selectedSize, selectedColor);
    navigate('/checkout');
  };

  return (
    <div className="container-custom py-12">
      <div className="flex flex-col lg:flex-row gap-12 mb-24">
        {/* Image Gallery */}
        <div className="lg:w-1/2 space-y-4">
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 group">
            <img
              src={getProxyUrl(product.images[activeImage])}
              alt={product.name}
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {product.images.length > 1 && (
              <>
                <button
                  onClick={() => setActiveImage(prev => (prev === 0 ? product.images.length - 1 : prev - 1))}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  onClick={() => setActiveImage(prev => (prev === product.images.length - 1 ? 0 : prev + 1))}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
              </>
            )}
            {discount > 0 && (
              <div className="absolute top-6 left-6 bg-red-500 text-white px-4 py-2 rounded-2xl font-bold text-sm uppercase tracking-widest shadow-xl">
                Save {discount}%
              </div>
            )}
          </div>
          <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
            {product.images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(idx)}
                className={cn(
                  "relative flex-shrink-0 w-24 h-24 rounded-2xl overflow-hidden border-2 transition-all",
                  activeImage === idx ? "border-orange-600 shadow-lg" : "border-transparent opacity-60 hover:opacity-100"
                )}
              >
                <img src={getProxyUrl(img)} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              </button>
            ))}
          </div>
        </div>

        {/* Product Info */}
        <div className="lg:w-1/2">
          <div className="mb-8">
            <p className="text-orange-600 font-bold uppercase tracking-[0.2em] text-sm mb-4">{product.category}</p>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight tracking-tight">{product.name}</h1>
            <div className="flex items-center space-x-4">
              <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
                <Star className="h-4 w-4 text-yellow-500 fill-current mr-1" />
                <span className="text-sm font-bold text-yellow-700">{product.rating}</span>
              </div>
              <span className="text-gray-400 font-bold">|</span>
              <span className="text-gray-500 font-bold">{product.reviewsCount} Customer Reviews</span>
              <span className="text-gray-400 font-bold">|</span>
              <span className={cn(
                "font-bold",
                product.stock > 0 ? "text-green-600" : "text-red-600"
              )}>
                {product.stock > 0 ? `In Stock (${product.stock})` : 'Out of Stock'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-10">
            <span className="text-4xl font-bold text-gray-900 tracking-tight">
              {formatPrice(product.discountPrice || product.price)}
            </span>
            {product.discountPrice && (
              <span className="text-2xl text-gray-400 line-through font-bold">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <p className="text-gray-600 text-lg leading-relaxed mb-10 border-b border-gray-100 pb-10">
            {product.description}
          </p>

          {/* Specifications */}
          {product.specifications && product.specifications.length > 0 && (
            <div className="mb-10 pb-10 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-6">Product Specifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {product.specifications.map((spec, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100">
                    <span className="text-gray-500 font-bold text-sm">{spec.key}</span>
                    <span className="text-gray-900 font-black text-sm">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-8 mb-10">
            {/* Color Selection */}
            {((product.colors && product.colors.length > 0) || (product.colorVariants && product.colorVariants.length > 0)) && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Color Family</h3>
                  <span className="text-sm font-bold text-gray-400">:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedColor || 'Select Color'}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {/* Text-based colors */}
                  {product.colors?.map(color => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={cn(
                        "px-6 py-3 rounded-xl font-bold transition-all border-2",
                        selectedColor === color
                          ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm"
                          : "bg-white border-gray-100 text-gray-600 hover:border-gray-900"
                      )}
                    >
                      {color}
                    </button>
                  ))}
                  
                  {/* Image-based color variants */}
                  {product.colorVariants?.map((variant, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedColor(variant.name)}
                      className={cn(
                        "relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all group",
                        selectedColor === variant.name
                          ? "border-orange-500 shadow-md scale-105"
                          : "border-gray-100 opacity-80 hover:opacity-100 hover:border-gray-300"
                      )}
                      title={variant.name}
                    >
                      <img src={getProxyUrl(variant.image)} alt={variant.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {selectedColor === variant.name && (
                        <div className="absolute bottom-0 right-0 bg-orange-500 text-white p-0.5 rounded-tl-lg">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Size</h3>
                  <span className="text-sm font-bold text-gray-400">:</span>
                  <span className="text-sm font-bold text-gray-900">{selectedSize || 'Select Size'}</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map(size => (
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size)}
                      className={cn(
                        "min-w-[4rem] h-14 px-4 rounded-xl flex items-center justify-center font-bold transition-all border-2",
                        selectedSize === size
                          ? "border-orange-500 bg-orange-50 text-orange-600 shadow-sm"
                          : "bg-white border-gray-100 text-gray-600 hover:border-gray-900"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest mb-4">Quantity</h3>
              <div className="flex items-center space-x-4">
                <div className="flex items-center bg-gray-50 rounded-2xl p-1 border border-gray-100">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-3 text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                  >
                    <Minus className="h-5 w-5" />
                  </button>
                  <span className="w-12 text-center font-bold text-xl text-gray-900">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                    className="p-3 text-gray-400 hover:text-gray-900 hover:bg-white hover:shadow-sm rounded-xl transition-all"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleAddToCart}
              disabled={product.stock <= 0}
              className="flex-1 bg-white text-orange-600 border-2 border-orange-600 py-4 rounded-2xl font-bold text-lg hover:bg-orange-50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingCart className="h-5 w-5" />
              <span>Add to Cart</span>
            </button>
            <button
              onClick={handleBuyNow}
              disabled={product.stock <= 0}
              className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg shadow-xl shadow-orange-100 hover:bg-orange-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ShoppingBag className="h-5 w-5" />
              <span>Buy Now</span>
            </button>
            <button
              onClick={() => toggleWishlist(product)}
              className={cn(
                "px-6 py-4 rounded-2xl border-2 transition-all flex items-center justify-center",
                isInWishlist(product.id)
                  ? "bg-red-50 border-red-500 text-red-500"
                  : "bg-white border-gray-100 text-gray-400 hover:border-red-500 hover:text-red-500"
              )}
            >
              <Heart className={cn("h-6 w-6", isInWishlist(product.id) && "fill-current")} />
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="bg-orange-50 p-3 rounded-2xl"><Truck className="h-6 w-6 text-orange-600" /></div>
              <div>
                <p className="text-sm font-bold text-gray-900">Fast Delivery</p>
                <p className="text-xs text-gray-500">Across Bangladesh</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-orange-50 p-3 rounded-2xl"><ShieldCheck className="h-6 w-6 text-orange-600" /></div>
              <div>
                <p className="text-sm font-bold text-gray-900">Secure Payment</p>
                <p className="text-xs text-gray-500">100% Protected</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-orange-50 p-3 rounded-2xl"><RefreshCw className="h-6 w-6 text-orange-600" /></div>
              <div>
                <p className="text-sm font-bold text-gray-900">Easy Returns</p>
                <p className="text-xs text-gray-500">7-Day Return Policy</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="pt-24 border-t border-gray-100 mb-24">
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-1/3">
            <h2 className="text-3xl font-bold text-gray-900 mb-4 tracking-tight">Customer Reviews</h2>
            <div className="flex items-center space-x-4 mb-8">
              <div className="flex items-center bg-yellow-50 px-4 py-2 rounded-2xl">
                <Star className="h-6 w-6 text-yellow-500 fill-current mr-2" />
                <span className="text-2xl font-bold text-yellow-700">{product.rating}</span>
              </div>
              <p className="text-gray-500 font-bold">Based on {reviews.length} reviews</p>
            </div>

            {/* Review Form */}
            <div className="bg-gray-50 p-8 rounded-[2rem] border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">Write a Review</h3>
              <form onSubmit={handleReviewSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 block">Rating</label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "h-8 w-8",
                            star <= reviewForm.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
                          )}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 block">Your Comment</label>
                  <textarea
                    rows={4}
                    className="w-full bg-white border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 outline-none transition-all font-bold"
                    placeholder="Share your thoughts about this product..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-black transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isSubmittingReview ? (
                    <div className="h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <span>Submit Review</span>
                      <Send className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="space-y-8">
              {reviews.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-[2rem] border-2 border-dashed border-gray-200">
                  <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">No reviews yet. Be the first to review this product!</p>
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-4">
                        <div className="h-12 w-12 bg-orange-100 rounded-full flex items-center justify-center font-bold text-orange-600">
                          {review.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{review.userName}</p>
                          <p className="text-xs text-gray-400 font-bold">{new Date(review.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
                        <Star className="h-3 w-3 text-yellow-500 fill-current mr-1" />
                        <span className="text-xs font-bold text-yellow-700">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-gray-600 font-medium leading-relaxed italic">"{review.comment}"</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="pt-24 border-t border-gray-100">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Similar Products</h2>
              <p className="text-gray-500 font-medium">You might also like these suggestions</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {relatedProducts.map(p => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
