import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, orderBy, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { Search, Filter, Eye, CreditCard, Calendar, Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState<Order | null>(null);

  const handleMarkAsPaid = async (orderId: string) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), {
        paymentStatus: 'paid'
      });
      setTransactions(transactions.map(t => t.id === orderId ? { ...t, paymentStatus: 'paid' } : t));
      if (selectedTransaction?.id === orderId) {
        setSelectedTransaction({ ...selectedTransaction, paymentStatus: 'paid' });
      }
      toast.success('Payment marked as paid');
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error('Failed to update payment status');
    }
  };

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Fetch all orders
      // This allows admins to see pending manual payments (bKash, etc.) for verification
      const q = query(
        collection(db, 'orders'), 
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);
      setTransactions(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
    } catch (error) {
      console.error("Error fetching transactions:", error);
      // Fallback: if the complex query fails (e.g. missing index), fetch all and filter
      try {
        const qAll = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
        const snapAll = await getDocs(qAll);
        setTransactions(snapAll.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } catch (err) {
        console.error("Fallback fetch failed:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = 
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.transactionId && t.transactionId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  return (
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-2 text-white">Transactions</h1>
          <p className="text-gray-400 font-bold">Monitor and manage all successful payments</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <input
            type="text"
            placeholder="Search by Order ID, Customer, or Transaction ID..."
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

      {/* Transactions Table */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-black border-b border-white/10">
                <th className="px-8 py-6">Transaction ID</th>
                <th className="px-8 py-6">Customer</th>
                <th className="px-8 py-6">Paid</th>
                <th className="px-8 py-6">Method</th>
                <th className="px-8 py-6">Date</th>
                <th className="px-8 py-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="px-8 py-6"><div className="h-12 bg-white/5 rounded-xl"></div></td>
                  </tr>
                ))
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-8 py-12 text-center text-gray-500 font-bold">
                    No transactions found.
                  </td>
                </tr>
              ) : filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <p className="font-mono text-xs text-primary font-black">
                      {transaction.transactionId || `#${transaction.id.slice(-8).toUpperCase()}`}
                    </p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold text-white">{transaction.customerName}</p>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest font-black">Order #{transaction.id.slice(-6).toUpperCase()}</p>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-black text-white text-lg">{formatPrice(transaction.payableAmount)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest",
                        transaction.paymentStatus === 'paid' ? "bg-primary/10 text-primary" : "bg-yellow-500/10 text-yellow-500"
                      )}>
                        {transaction.paymentStatus}
                      </span>
                      <span className="text-[8px] font-black text-gray-500 uppercase tracking-widest">({transaction.paymentType})</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/10 p-2 rounded-lg">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-black text-xs uppercase tracking-widest text-gray-300">{transaction.paymentMethod}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span className="font-bold text-sm">{new Date(transaction.createdAt).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => setSelectedTransaction(transaction)}
                      className="bg-primary-dark hover:bg-primary text-white px-6 py-2 rounded-xl font-black text-xs transition-all shadow-lg shadow-primary-dark/20"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <AnimatePresence>
        {selectedTransaction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#111111] w-full max-w-2xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 relative"
            >
              <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h2 className="text-2xl font-black text-white">Transaction Details</h2>
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="p-2 hover:bg-white/5 rounded-full transition-colors"
                >
                  <ArrowRight className="h-6 w-6 text-gray-500 rotate-180" />
                </button>
              </div>

              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Order ID</p>
                    <p className="font-black text-white">#{selectedTransaction.id.toUpperCase()}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Transaction ID</p>
                    <p className="font-black text-primary">{selectedTransaction.transactionId || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Customer</p>
                    <p className="font-black text-white">{selectedTransaction.customerName}</p>
                    <p className="text-xs text-gray-500">{selectedTransaction.phone}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Payment Method</p>
                    <p className="font-black text-white uppercase">{selectedTransaction.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Amount Paid</p>
                    <p className="text-2xl font-black text-primary">{formatPrice(selectedTransaction.payableAmount)}</p>
                    <p className="text-[10px] text-gray-500 font-bold mt-1">
                      {selectedTransaction.paymentType} of {formatPrice(selectedTransaction.total)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Date</p>
                    <p className="font-black text-white">{new Date(selectedTransaction.createdAt).toLocaleString()}</p>
                  </div>
                </div>

                {selectedTransaction.paymentScreenshot && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payment Proof</p>
                    <div className="rounded-2xl overflow-hidden border border-white/10">
                      <img src={getProxyUrl(selectedTransaction.paymentScreenshot)} alt="Payment Proof" className="w-full h-auto" />
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-white/5 bg-white/5 flex justify-end gap-4">
                <button
                  onClick={() => setSelectedTransaction(null)}
                  className="px-8 py-4 rounded-xl font-black text-gray-500 hover:text-white hover:bg-white/5 transition-all"
                >
                  Close
                </button>
                {selectedTransaction.paymentStatus === 'pending' && (
                  <button
                    onClick={() => handleMarkAsPaid(selectedTransaction.id)}
                    className="flex items-center gap-2 bg-primary-dark hover:bg-primary text-white px-8 py-4 rounded-xl font-black transition-all shadow-lg shadow-primary-dark/20"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Mark as Paid
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
