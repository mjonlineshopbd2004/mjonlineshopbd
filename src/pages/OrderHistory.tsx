import React, { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Order } from '../types';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Package, 
  ChevronLeft, 
  MoreVertical, 
  Trash2, 
  Eye, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RefreshCcw, 
  AlertCircle, 
  AlertTriangle,
  ShoppingBag,
  Undo2,
  Truck,
  Download,
  Printer
} from 'lucide-react';
import { cn, formatPrice, getProxyUrl } from '../lib/utils';
import { toast } from 'sonner';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import Modal from '../components/Modal';
import TrackingStatus from '../components/TrackingStatus';
import { useSettings } from '../contexts/SettingsContext';
import { Invoice } from '../components/Invoice';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function OrderHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'completed' | 'pending' | 'cancelled'>('pending');
  const [showOptions, setShowOptions] = useState<string | null>(null);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [orderToRefund, setOrderToRefund] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);
  
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [scale, setScale] = useState(0.8);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const baseWidth = 794;
        const newScale = Math.min(0.8, (containerWidth - 32) / baseWidth);
        setScale(newScale);
      }
    };
    if (showInvoiceModal) {
      updateScale();
      window.addEventListener('resize', updateScale);
    }
    return () => window.removeEventListener('resize', updateScale);
  }, [showInvoiceModal]);

  const handleViewInvoice = (order: Order) => {
    setSelectedOrderForInvoice(order);
    setShowInvoiceModal(true);
  };

  const handleDownloadInvoice = async () => {
    if (!selectedOrderForInvoice) return;
    setIsGenerating(true);
    const toastId = toast.loading('Generating invoice...');
    
    // Wait for state update and DOM render
    setTimeout(async () => {
      if (!invoiceRef.current) {
        setIsGenerating(false);
        toast.error('Failed to initialize invoice generator.', { id: toastId });
        return;
      }

      try {
        const canvas = await html2canvas(invoiceRef.current, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            // Ensure the cloned element is visible for capture
            const el = clonedDoc.getElementById('invoice-capture-container');
            if (el) {
              el.style.opacity = '1';
              el.style.visibility = 'visible';
              el.style.position = 'static';
              el.style.left = '0';
            }
          }
        });
        
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        // Add image scaled to fit exactly one A4 page
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`invoice-${selectedOrderForInvoice.id.slice(-8)}.pdf`);
        toast.success('Invoice downloaded successfully!', { id: toastId });
      } catch (error) {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate invoice.', { id: toastId });
      } finally {
        setIsGenerating(false);
        setSelectedOrderForInvoice(null);
      }
    }, 100);
  };

  const handlePrintInvoice = (order: Order) => {
    setSelectedOrderForInvoice(order);
    
    setTimeout(() => {
      if (!invoiceRef.current) return;
      
      const printContent = invoiceRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${order.id}</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
              @media print {
                body { padding: 0; margin: 0; }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body onload="window.print(); window.close();">
            <div class="p-10">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      setSelectedOrderForInvoice(null);
    }, 100);
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

  const filteredOrders = orders.filter(order => {
    if (activeTab === 'completed') return order.status === 'delivered';
    if (activeTab === 'pending') return ['pending', 'processing', 'shipped'].includes(order.status);
    if (activeTab === 'cancelled') return order.status === 'cancelled';
    return false;
  });

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return;
    try {
      await deleteDoc(doc(db, 'orders', orderToDelete));
      setOrders(orders.filter(o => o.id !== orderToDelete));
      toast.success('Order removed from history');
    } catch (error) {
      toast.error('Failed to remove order');
    } finally {
      setOrderToDelete(null);
    }
  };

  const handleRefundRequest = async () => {
    if (!orderToRefund || !refundReason.trim()) {
      toast.error('Please provide a reason for refund');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      await updateDoc(doc(db, 'orders', orderToRefund), {
        refundRequest: {
          reason: refundReason,
          status: 'pending',
          requestedAt: new Date().toISOString()
        }
      });
      
      setOrders(orders.map(o => o.id === orderToRefund ? {
        ...o,
        refundRequest: {
          reason: refundReason,
          status: 'pending',
          requestedAt: new Date().toISOString()
        }
      } : o));
      
      toast.success('Refund request submitted successfully');
      setOrderToRefund(null);
      setRefundReason('');
    } catch (error) {
      console.error('Refund request error:', error);
      toast.error('Failed to submit refund request');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return (
        <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1 rounded-full border border-orange-100">
          <Clock className="h-3 w-3 text-orange-500" />
          <span className="text-xs font-black text-orange-600 uppercase tracking-tighter">Pending</span>
        </div>
      );
      case 'processing': return (
        <div className="flex items-center gap-1.5 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
          <RefreshCcw className="h-3 w-3 text-blue-500 animate-spin-slow" />
          <span className="text-xs font-black text-blue-600 uppercase tracking-tighter">Processing</span>
        </div>
      );
      case 'shipped': 
      case 'out_for_delivery': return (
        <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
          <Truck className="h-3 w-3 text-indigo-500" />
          <span className="text-xs font-black text-indigo-600 uppercase tracking-tighter">Shipped</span>
        </div>
      );
      case 'delivered': return (
        <div className="flex items-center gap-1.5 bg-green-50 px-3 py-1 rounded-full border border-green-100">
          <CheckCircle2 className="h-3 w-3 text-green-500" />
          <span className="text-xs font-black text-green-600 uppercase tracking-tighter">Completed</span>
        </div>
      );
      case 'cancelled': return (
        <div className="flex items-center gap-1.5 bg-red-50 px-3 py-1 rounded-full border border-red-100">
          <XCircle className="h-3 w-3 text-red-500" />
          <span className="text-xs font-black text-red-600 uppercase tracking-tighter">Cancelled</span>
        </div>
      );
      default: return (
        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
          <span className="text-xs font-black text-gray-600 uppercase tracking-tighter">{status}</span>
        </div>
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen pb-24">
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
            <h1 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">Order History</h1>
          </div>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <MoreVertical className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="container-custom flex items-center gap-2 py-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('completed')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === 'completed' ? "bg-green-500 text-white shadow-lg shadow-green-100" : "bg-gray-100 text-gray-500"
            )}
          >
            Completed
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === 'pending' ? "bg-orange-500 text-white shadow-lg shadow-orange-100" : "bg-gray-100 text-gray-500"
            )}
          >
            Pending
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
              activeTab === 'cancelled' ? "bg-red-500 text-white shadow-lg shadow-red-100" : "bg-gray-100 text-gray-500"
            )}
          >
            Cancel
          </button>
        </div>
      </div>

      <div className="container-custom py-6">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h2 className="text-2xl font-black text-gray-900 font-display uppercase tracking-tight">Order History</h2>
            <p className="text-sm font-bold text-gray-400 mt-1">Manage and track your recent orders</p>
          </div>
          <button 
            onClick={() => navigate('/products')}
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-black transition-all shadow-lg shadow-black/10"
          >
            <ShoppingBag className="h-4 w-4" />
            Shop More
          </button>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="space-y-6">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-gray-50/50 rounded-3xl overflow-hidden shadow-sm border border-gray-200">
                {/* Order Header */}
                <div className="bg-white/50 px-6 py-5 border-b border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Order ID</p>
                    <p className="text-base font-black text-gray-900 uppercase">#{order.id}</p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-base font-bold text-gray-900">
                      {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                    {getStatusBadge(order.status)}
                  </div>
                  <div className="text-right md:text-left">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-xl font-black text-primary">{formatPrice(order.total)}</p>
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-6 flex flex-col md:flex-row items-center gap-8">
                  {/* First Item Image */}
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100 shadow-sm">
                    <img 
                      src={getProxyUrl(order.items[0].images[0])} 
                      alt={order.items[0].name} 
                      className="w-full h-full object-cover" 
                    />
                  </div>

                  {/* Tracking Status Bar */}
                  <div className="flex-1 w-full">
                    <TrackingStatus status={order.status} />
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <button
                      onClick={() => navigate(`/order-confirmation/${order.id}`)}
                      className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-black transition-all shadow-md"
                    >
                      View Details
                      <Eye className="h-4 w-4" />
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewInvoice(order)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all"
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                        View Invoice
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(order)}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-50 transition-all"
                        title="Print Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                    </div>
                    
                    {order.status !== 'cancelled' && order.status !== 'delivered' && !order.refundRequest && (
                      <button
                        onClick={() => setOrderToRefund(order.id)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all border border-red-100"
                      >
                        <Undo2 className="h-4 w-4" />
                        Request Refund
                      </button>
                    )}

                    {order.refundRequest && (
                      <div className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-50 text-orange-600 rounded-xl font-bold text-[10px] border border-orange-100 uppercase tracking-tighter">
                        Refund {order.refundRequest.status}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <Package className="h-10 w-10 text-gray-200" />
            </div>
            <h2 className="text-xl font-black text-gray-900 font-display uppercase tracking-tight">No orders found</h2>
            <p className="text-xs font-bold text-gray-400 mt-2">
              You don't have any {activeTab} orders at the moment.
            </p>
          </div>
        )}
      </div>

      {/* Refund Request Modal */}
      <Modal
        isOpen={!!orderToRefund}
        onClose={() => setOrderToRefund(null)}
        title="Request Refund"
      >
        <div className="space-y-6">
          <p className="text-sm font-bold text-gray-600">
            Please tell us why you want to request a refund for this order.
          </p>
          
          <textarea
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-4 text-sm font-medium outline-none focus:bg-white focus:border-primary transition-all min-h-[120px]"
            placeholder="Reason for refund..."
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
          />

          <div className="flex gap-4">
            <button
              onClick={() => setOrderToRefund(null)}
              className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleRefundRequest}
              disabled={isSubmittingRefund || !refundReason.trim()}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50"
            >
              {isSubmittingRefund ? 'Submitting...' : 'Submit Request'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!orderToDelete}
        onClose={() => setOrderToDelete(null)}
        title="Confirm for delete?"
      >
        <div className="text-center">
          <p className="text-sm font-bold text-gray-600 mb-8">
            Are you sure you want to delete this order from your history?
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => setOrderToDelete(null)}
              className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteOrder}
              className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-100 hover:bg-red-600 transition-all"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>

      {/* Invoice Preview Modal */}
      <Modal
        isOpen={showInvoiceModal}
        onClose={() => {
          setShowInvoiceModal(false);
          setSelectedOrderForInvoice(null);
        }}
        title="Invoice Preview"
        className="max-w-4xl"
      >
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-2xl p-2 sm:p-4 overflow-auto max-h-[80vh] border border-gray-200 flex justify-center items-start" ref={containerRef}>
            {selectedOrderForInvoice && (
              <div style={{ 
                transform: `scale(${scale})`, 
                transformOrigin: 'top center',
                width: '794px',
                height: '1123px',
                marginBottom: `${-1123 * (1 - scale)}px`
              }}>
                <Invoice order={selectedOrderForInvoice} settings={settings} />
              </div>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={() => setShowInvoiceModal(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Close
            </button>
            <button
              onClick={handleDownloadInvoice}
              disabled={isGenerating}
              className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              {isGenerating ? 'Generating...' : 'Download PDF'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Hidden Invoice for Generation */}
      <div 
        id="invoice-capture-container"
        style={{ 
          position: 'absolute', 
          left: '-9999px', 
          top: 0, 
          opacity: 0, 
          pointerEvents: 'none',
          backgroundColor: '#ffffff',
          color: '#000000'
        }}
      >
        {selectedOrderForInvoice && (
          <Invoice ref={invoiceRef} order={selectedOrderForInvoice} settings={settings} />
        )}
      </div>
    </div>
  );
}
