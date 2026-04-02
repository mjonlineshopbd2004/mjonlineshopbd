import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Review, Product } from '../types';
import { Search, Filter, Star, Trash2, Eye, Loader2, Package, User, Calendar, X, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getProxyUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Modal from '../components/Modal';

export default function AdminReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch reviews
      const reviewsQuery = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
      const reviewsSnap = await getDocs(reviewsQuery);
      const reviewsData = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Review));
      setReviews(reviewsData);

      // Fetch all products to get names and IDs
      const productsSnap = await getDocs(collection(db, 'products'));
      const productsData: Record<string, Product> = {};
      productsSnap.docs.forEach(doc => {
        productsData[doc.id] = { id: doc.id, ...doc.data() } as Product;
      });
      setProducts(productsData);
    } catch (error) {
      console.error("Error fetching reviews:", error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteReview = (reviewId: string) => {
    setReviewToDelete(reviewId);
  };

  const executeDeleteReview = async () => {
    if (!reviewToDelete) return;
    
    try {
      await deleteDoc(doc(db, 'reviews', reviewToDelete));
      setReviews(reviews.filter(r => r.id !== reviewToDelete));
      toast.success('Review deleted successfully');
      setSelectedReview(null);
    } catch (error) {
      toast.error('Failed to delete review');
    } finally {
      setReviewToDelete(null);
    }
  };

  const filteredReviews = reviews.filter(r => {
    const product = products[r.productId];
    const matchesSearch = 
      r.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product && product.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.comment.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  return (
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-emerald-500">Our reviews</h1>
          <p className="text-gray-400 font-bold">Manage customer feedback and ratings</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <input
            type="text"
            placeholder="Search reviews by product name, customer, or comment..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-4 outline-none focus:border-emerald-500 transition-all font-bold text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-emerald-500 transition-colors" />
        </div>
        <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-black transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20">
          Search <Search className="h-4 w-4" />
        </button>
      </div>

      {/* Reviews Table */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-black border-b border-white/10">
                <th className="px-8 py-6">Product Name</th>
                <th className="px-8 py-6">Product No</th>
                <th className="px-8 py-6">Name</th>
                <th className="px-8 py-6">Rating</th>
                <th className="px-8 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6"><div className="h-12 bg-white/5 rounded-xl"></div></td>
                  </tr>
                ))
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-12 text-center text-gray-500 font-bold">
                    No reviews found.
                  </td>
                </tr>
              ) : filteredReviews.map((review) => {
                const product = products[review.productId];
                return (
                  <tr key={review.id} className="hover:bg-white/5 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-4">
                        {product?.images[0] && (
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5 border border-white/5">
                            <img src={getProxyUrl(product.images[0])} alt="" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="font-bold text-white group-hover:text-emerald-500 transition-colors text-sm truncate max-w-[200px]">
                          {product?.name || 'Unknown Product'}
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-mono text-xs text-gray-400 font-black tracking-widest">
                        #{review.productId.slice(-6).toUpperCase()}
                      </p>
                    </td>
                    <td className="px-8 py-6">
                      <p className="font-bold text-white text-sm">{review.userName}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "h-3.5 w-3.5",
                              i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"
                            )}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => setSelectedReview(review)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg shadow-emerald-600/20"
                        >
                          Details
                        </button>
                        <button 
                          onClick={() => handleDeleteReview(review.id)}
                          className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Details Modal */}
      <AnimatePresence>
        {selectedReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#111111] w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h2 className="text-2xl font-black text-white">Review Details</h2>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-gray-500" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden bg-white/5 border border-white/5 flex-shrink-0">
                    <img src={getProxyUrl(products[selectedReview.productId]?.images[0])} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-black text-white mb-2">{products[selectedReview.productId]?.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400 font-bold">
                      <span className="flex items-center gap-1"><Package className="h-4 w-4 text-emerald-500" /> #{selectedReview.productId.slice(-8).toUpperCase()}</span>
                      <span className="flex items-center gap-1"><Calendar className="h-4 w-4 text-emerald-500" /> {new Date(selectedReview.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-white/5 p-8 rounded-3xl border border-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-emerald-500 rounded-full flex items-center justify-center font-black text-white">
                        {selectedReview.userName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-white">{selectedReview.userName}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Verified Customer</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < selectedReview.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <p className="text-gray-300 leading-relaxed font-bold italic">
                      "{selectedReview.comment}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4">
                <button
                  onClick={() => handleDeleteReview(selectedReview.id)}
                  className="px-8 py-4 rounded-xl font-black text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                >
                  Delete Review
                </button>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="px-8 py-4 rounded-xl font-black text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!reviewToDelete}
        onClose={() => setReviewToDelete(null)}
        title="Delete Review"
        footer={
          <>
            <button
              onClick={() => setReviewToDelete(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeDeleteReview}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Review
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-gray-600 font-bold">
              Are you sure you want to delete this review?
            </p>
            <p className="text-sm text-gray-500 mt-2">
              This action cannot be undone.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
