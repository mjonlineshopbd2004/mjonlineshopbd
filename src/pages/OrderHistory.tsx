import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { Link } from 'react-router-dom';
import { Package, ChevronRight, ShoppingBag, Clock, CheckCircle2, Truck, XCircle, RefreshCcw, AlertCircle, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import Modal from '../components/Modal';

export default function OrderHistory() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  const [showRefundModal, setShowRefundModal] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);

  const handleRefundRequest = async (orderId: string) => {
    if (!refundReason) {
      toast.error('Please enter a reason for the refund');
      return;
    }

    try {
      const orderRef = doc(db, 'orders', orderId);
      const refundData = {
        reason: refundReason,
        status: 'pending',
        requestedAt: new Date().toISOString()
      };

      await updateDoc(orderRef, {
        refundRequest: refundData
      });

      setOrders(orders.map(o => o.id === orderId ? {
        ...o,
        refundRequest: refundData
      } : o));

      toast.success('Refund request submitted successfully');
      setShowRefundModal(null);
      setRefundReason('');
    } catch (error) {
      console.error("Error submitting refund request:", error);
      toast.error('Failed to submit refund request');
    }
  };

  useEffect(() => {
    const fetchOrders = async () => {
      if (!user) return;
      try {
        const q = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [user]);

  const executeCancelOrder = async () => {
    if (!orderToCancel) return;
    try {
      await updateDoc(doc(db, 'orders', orderToCancel), { status: 'cancelled' });
      setOrders(orders.map(o => o.id === orderToCancel ? { ...o, status: 'cancelled' } : o));
      toast.success('Order cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel order');
    } finally {
      setOrderToCancel(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'processing': return <Package className="h-5 w-5 text-blue-500" />;
      case 'shipped': return <Truck className="h-5 w-5 text-orange-500" />;
      case 'delivered': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'cancelled': return <XCircle className="h-5 w-5 text-red-500" />;
      case 'refunded': return <RefreshCcw className="h-5 w-5 text-purple-500" />;
      default: return <Package className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'processing': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'shipped': return 'bg-orange-50 text-orange-700 border-orange-100';
      case 'delivered': return 'bg-green-50 text-green-700 border-green-100';
      case 'cancelled': return 'bg-red-50 text-red-700 border-red-100';
      case 'refunded': return 'bg-purple-50 text-purple-700 border-purple-100';
      default: return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="container-custom py-24">
        <div className="animate-pulse space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-100 rounded-[2rem]"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-2">Order History</h1>
          <p className="text-gray-500 font-medium">Manage and track your recent orders</p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center bg-gray-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-gray-800 transition-all"
        >
          <ShoppingBag className="mr-2 h-5 w-5" />
          Shop More
        </Link>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-8">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300"
            >
              <div className="p-8">
                <div className="flex flex-wrap justify-between items-start gap-6 mb-8 pb-8 border-b border-gray-50">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order ID</p>
                    <p className="text-lg font-bold text-gray-900">#{order.id.slice(-8).toUpperCase()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date</p>
                    <p className="text-lg font-bold text-gray-900">{new Date(order.createdAt).toLocaleDateString('en-BD', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Status</p>
                    <div className={cn(
                      "flex items-center space-x-2 px-4 py-1.5 rounded-full border font-bold text-sm capitalize",
                      getStatusColor(order.status)
                    )}>
                      {getStatusIcon(order.status)}
                      <span>{order.status}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-2xl font-bold tracking-tight text-orange-600">{formatPrice(order.total)}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <div className="flex -space-x-4 overflow-hidden flex-1">
                    {order.items.slice(0, 4).map((item, idx) => (
                      <div key={idx} className="relative w-20 h-20 rounded-2xl border-4 border-white overflow-hidden bg-gray-50 shadow-sm">
                        <img src={getProxyUrl(item.images[0])} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    {order.items.length > 4 && (
                      <div className="relative w-20 h-20 rounded-2xl border-4 border-white bg-gray-900 flex items-center justify-center text-white font-bold shadow-sm">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>
                  
                    <div className="flex flex-col sm:flex-row gap-4 items-center">
                      <Link
                        to={`/order-confirmation/${order.id}`}
                        className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gray-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-gray-800 transition-all shadow-lg"
                      >
                        <span>View Details</span>
                        <ChevronRight className="h-5 w-5" />
                      </Link>

                      {/* Refund Button for Paid Methods (bKash, Nagad, etc.) */}
                      {order.paymentMethod !== 'cod' && order.status !== 'delivered' && order.status !== 'refunded' && order.status !== 'cancelled' && !order.refundRequest && (
                        <button
                          onClick={() => setShowRefundModal(order.id)}
                          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-red-50 text-red-600 border-2 border-red-100 px-8 py-4 rounded-2xl font-bold hover:bg-red-100 transition-all"
                        >
                          <RefreshCcw className="h-5 w-5" />
                          <span>Request Refund</span>
                        </button>
                      )}

                      {/* Cancel Button for COD Pending Orders */}
                      {order.paymentMethod === 'cod' && order.status === 'pending' && (
                        <button
                          onClick={() => setOrderToCancel(order.id)}
                          className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-gray-50 text-gray-600 border-2 border-gray-100 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all"
                        >
                          <XCircle className="h-5 w-5" />
                          <span>Cancel Order</span>
                        </button>
                      )}

                      {order.refundRequest && (
                        <div className="flex items-center space-x-2 px-6 py-4 rounded-2xl bg-orange-50 text-orange-700 font-bold text-sm uppercase tracking-widest border border-orange-100">
                          <Clock className="h-5 w-5" />
                          <span>Refund: {order.refundRequest.status}</span>
                        </div>
                      )}
                    </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-gray-50 rounded-[3rem]">
          <div className="bg-white w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 shadow-sm">
            <Package className="h-12 w-12 text-gray-300" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 mb-4">No orders yet</h2>
          <p className="text-gray-500 text-lg mb-10 max-w-md mx-auto">
            You haven't placed any orders yet. Start shopping and discover our amazing products!
          </p>
          <Link
            to="/products"
            className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-orange-700 transition-all"
          >
            Start Shopping
          </Link>
        </div>
      )}

      <AnimatePresence>
        {showRefundModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center space-x-3 mb-6">
                <div className="bg-red-100 p-3 rounded-2xl">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-gray-900">Refund Request</h3>
              </div>
              
              <p className="text-gray-600 mb-6 font-bold">
                Please tell us why you are requesting a refund. Our team will review your request shortly.
              </p>

              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Reason for refund..."
                className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-6 py-4 outline-none transition-all font-bold mb-6 min-h-[120px]"
              />

              <div className="flex space-x-4">
                <button
                  onClick={() => {
                    setShowRefundModal(null);
                    setRefundReason('');
                  }}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-gray-500 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRefundRequest(showRefundModal)}
                  className="flex-1 bg-red-600 text-white px-6 py-4 rounded-2xl font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cancel Confirmation Modal */}
      <Modal
        isOpen={!!orderToCancel}
        onClose={() => setOrderToCancel(null)}
        title="Cancel Order"
        footer={
          <>
            <button
              onClick={() => setOrderToCancel(null)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              No, Keep Order
            </button>
            <button
              onClick={executeCancelOrder}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Yes, Cancel Order
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
              Are you sure you want to cancel this order?
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
