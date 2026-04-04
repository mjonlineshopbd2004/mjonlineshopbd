import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, OrderStatus } from '../types';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { Search, Filter, Eye, Clock, Package, Truck, CheckCircle2, XCircle, ChevronDown, X, MapPin, Phone, User, CreditCard, RefreshCcw, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setOrders(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === 'refunded') {
        updateData.paymentStatus = 'pending';
      }
      await updateDoc(doc(db, 'orders', orderId), updateData);
      setOrders(orders.map(o => o.id === orderId ? { ...o, ...updateData } : o));
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updateData });
      }
      toast.success(`Order status updated to ${newStatus}`);
    } catch (error) {
      toast.error('Failed to update order status');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'refunded': return <RefreshCcw className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'processing': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'shipped': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'delivered': return 'bg-primary/10 text-primary border-primary/20';
      case 'cancelled': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'refunded': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default: return 'bg-white/5 text-gray-400 border-white/10';
    }
  };

  const filteredOrders = orders.filter(o => {
    const matchesSearch = 
      o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.phone.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-white">Orders</h1>
          <p className="text-gray-400 font-bold">Manage customer orders and fulfillment</p>
        </div>
      </div>

      {/* Status Filters */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={cn(
              "px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all border",
              statusFilter === status 
                ? "bg-primary-dark border-primary-dark text-white shadow-lg shadow-primary-dark/20" 
                : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10"
            )}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <input
            type="text"
            placeholder="Search orders by ID, customer name, or phone..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-4 outline-none focus:border-primary transition-all font-bold text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
        </div>
        <button className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all text-gray-400">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-black border-b border-white/10">
                <th className="px-8 py-6">Order</th>
                <th className="px-8 py-6">Customer</th>
                <th className="px-8 py-6">Date</th>
                <th className="px-8 py-6">Total</th>
                <th className="px-8 py-6">Status</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6"><div className="h-12 bg-white/5 rounded-xl"></div></td>
                  </tr>
                ))
              ) : filteredOrders.map((order) => (
                <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      {order.items[0] && (
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/5">
                          <img src={getProxyUrl(order.items[0].images[0])} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div>
                        <p className="font-black text-white group-hover:text-primary transition-colors">#{order.id.slice(-8).toUpperCase()}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{order.paymentMethod} ({order.paymentType})</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-white">{order.customerName}</p>
                    <p className="text-xs text-gray-500">{order.phone}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-gray-300">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </td>
                  <td className="px-8 py-6 font-black text-white">{formatPrice(order.total)}</td>
                  <td className="px-8 py-6">
                    <div className="relative group inline-block">
                      <div className={cn(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full border font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all",
                        getStatusColor(order.status)
                      )}>
                        {getStatusIcon(order.status)}
                        <span>{order.status}</span>
                        <ChevronDown className="h-3 w-3" />
                      </div>
                      <div className="absolute left-0 mt-2 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <div className="py-2">
                          {(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as OrderStatus[]).map((status) => (
                            <button
                              key={status}
                              onClick={() => handleStatusChange(order.id, status)}
                              className="flex items-center w-full px-4 py-2 text-xs text-gray-400 hover:bg-white/5 hover:text-primary capitalize font-black transition-colors"
                            >
                              {status}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => setSelectedOrder(order)}
                      className="p-3 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Details Modal */}
      <AnimatePresence>
        {selectedOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#111111] w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div>
                  <h2 className="text-2xl font-black text-white">Order Details</h2>
                  <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">#{selectedOrder.id.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="p-3 hover:bg-white/5 rounded-full transition-colors group"
                >
                  <X className="h-6 w-6 text-gray-500 group-hover:text-white" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12">
                {/* Status & Quick Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white/5 p-6 rounded-3xl space-y-3 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</p>
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-black text-[10px] uppercase tracking-widest",
                      getStatusColor(selectedOrder.status)
                    )}>
                      {getStatusIcon(selectedOrder.status)}
                      <span>{selectedOrder.status}</span>
                    </div>
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl space-y-3 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payment</p>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-gray-500" />
                        <span className="font-black text-white uppercase text-sm">{selectedOrder.paymentMethod} ({selectedOrder.paymentType})</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-[10px] font-black uppercase",
                          selectedOrder.paymentStatus === 'paid' ? "bg-primary/10 text-primary" : "bg-yellow-500/10 text-yellow-500"
                        )}>
                          {selectedOrder.paymentStatus}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-400">
                        Payable: <span className="text-primary">{formatPrice(selectedOrder.payableAmount)}</span> 
                        {selectedOrder.paymentType === '50%' && ` (of ${formatPrice(selectedOrder.total)})`}
                      </p>
                    </div>
                    {selectedOrder.transactionId && (
                      <p className="text-xs font-black text-primary mt-2">TXID: {selectedOrder.transactionId}</p>
                    )}
                  </div>
                  <div className="bg-white/5 p-6 rounded-3xl space-y-3 border border-white/5">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Date</p>
                    <p className="font-black text-white">{new Date(selectedOrder.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {/* Payment Screenshot */}
                {selectedOrder.paymentScreenshot && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Payment Screenshot
                    </h3>
                    <div className="bg-white/5 p-4 rounded-3xl border border-white/5 max-w-sm">
                      <a href={selectedOrder.paymentScreenshot} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-2xl">
                        <img src={getProxyUrl(selectedOrder.paymentScreenshot)} alt="Payment Screenshot" className="w-full h-auto object-cover transition-transform group-hover:scale-105" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white text-black px-4 py-2 rounded-xl font-black text-xs">View Full Size</span>
                        </div>
                      </a>
                    </div>
                  </div>
                )}

                {/* Customer & Shipping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" />
                      Customer Information
                    </h3>
                    <div className="bg-white/5 p-8 rounded-3xl space-y-6 border border-white/5">
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Name</p>
                        <p className="font-black text-white">{selectedOrder.customerName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Phone</p>
                        <p className="font-black text-white">{selectedOrder.phone}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Email</p>
                        <p className="font-black text-white">{selectedOrder.customerEmail}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-white flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Shipping Address
                    </h3>
                    <div className="bg-white/5 p-8 rounded-3xl h-full border border-white/5">
                      <p className="font-black text-white leading-relaxed">{selectedOrder.address}</p>
                      <p className="mt-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Area: {selectedOrder.deliveryArea.replace('-', ' ')}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Note */}
                {selectedOrder.customerNote && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-black text-white">Customer Note</h3>
                    <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                      <p className="text-primary font-bold italic">"{selectedOrder.customerNote}"</p>
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div className="space-y-4">
                  <h3 className="text-lg font-black text-white">Items</h3>
                  <div className="space-y-4">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-6 bg-white/5 border border-white/5 p-6 rounded-3xl group">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/5">
                          <img src={getProxyUrl(item.images[0])} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black text-white text-lg truncate group-hover:text-primary transition-colors">{item.name}</p>
                          <p className="text-xs text-gray-500 font-black uppercase tracking-widest mt-1">
                            {item.selectedSize && `Size: ${item.selectedSize}`} 
                            {item.selectedColor && ` | Color: ${item.selectedColor}`}
                          </p>
                          <p className="text-sm text-primary font-black mt-2">Qty: {item.quantity} × {formatPrice(item.discountPrice || item.price)}</p>
                        </div>
                        <p className="font-black text-white text-xl">{formatPrice((item.discountPrice || item.price) * item.quantity)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Summary */}
                <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] space-y-6">
                  <div className="flex justify-between text-gray-400 font-black text-xs uppercase tracking-widest">
                    <span>Subtotal</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-gray-400 font-black text-xs uppercase tracking-widest">
                    <span>Delivery Charge</span>
                    <span>{formatPrice(selectedOrder.deliveryCharge)}</span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-red-500 font-black text-xs uppercase tracking-widest">
                      <span>Discount</span>
                      <span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-white/5 pt-6 flex justify-between items-center">
                    <span className="text-xl font-black">Total</span>
                    <span className="text-3xl font-black text-primary">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-8 py-4 rounded-xl font-black text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  Close
                </button>
                {selectedOrder.paymentStatus === 'pending' && (
                  <button
                    onClick={async () => {
                      try {
                        await updateDoc(doc(db, 'orders', selectedOrder.id), { paymentStatus: 'paid' });
                        setOrders(orders.map(o => o.id === selectedOrder.id ? { ...o, paymentStatus: 'paid' } : o));
                        setSelectedOrder({ ...selectedOrder, paymentStatus: 'paid' });
                        toast.success('Payment marked as paid');
                      } catch (error) {
                        toast.error('Failed to update payment status');
                      }
                    }}
                    className="bg-primary-dark text-white px-8 py-4 rounded-xl font-black hover:bg-primary transition-all flex items-center gap-2 shadow-lg shadow-primary-dark/20"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Mark as Paid
                  </button>
                )}
                <div className="relative group">
                  <button className="bg-primary-dark text-white px-8 py-4 rounded-xl font-black hover:bg-primary transition-all flex items-center gap-2 shadow-lg shadow-primary-dark/20">
                    <span>Update Status</span>
                    <ChevronDown className="h-5 w-5" />
                  </button>
                  <div className="absolute bottom-full right-0 mb-2 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                    <div className="py-2">
                      {(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as OrderStatus[]).map((status) => (
                        <button
                          key={status}
                          onClick={() => handleStatusChange(selectedOrder.id, status)}
                          className="flex items-center w-full px-4 py-3 text-xs text-gray-400 hover:bg-white/5 hover:text-primary capitalize font-black transition-colors"
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
