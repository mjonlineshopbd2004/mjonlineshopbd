import React, { useEffect, useState, useRef } from 'react';
import { collection, query, getDocs, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, OrderStatus } from '../types';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { Search, Filter, Eye, Clock, Package, Truck, CheckCircle2, XCircle, ChevronDown, X, MapPin, Phone, User, CreditCard, RefreshCcw, Image as ImageIcon, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { useSettings } from '../contexts/SettingsContext';
import { Invoice } from '../components/Invoice';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [openStatusDropdown, setOpenStatusDropdown] = useState<string | null>(null);
  const { settings } = useSettings();
  
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.2, 0.5));
  const handleResetZoom = () => setZoomLevel(1);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const baseWidth = 794;
        const fitScale = Math.max(0.1, (containerWidth - 32) / baseWidth);
        setScale(fitScale * zoomLevel);
      }
    };
    if (showInvoiceModal) {
      updateScale();
      window.addEventListener('resize', updateScale);
    }
    return () => window.removeEventListener('resize', updateScale);
  }, [showInvoiceModal, zoomLevel]);

  const handleViewInvoice = (order: Order) => {
    setSelectedOrderForInvoice(order);
    setShowInvoiceModal(true);
  };

  const handleDownloadInvoice = async () => {
    if (!selectedOrderForInvoice) return;
    setIsGenerating(true);
    const toastId = toast.loading('Generating invoice...');
    
    // Small delay to ensure the hidden invoice is rendered with the correct order data
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
      }
    }, 100);
  };

  const handlePrintInvoice = (order: Order) => {
    setTimeout(() => {
      if (!invoiceRef.current) return;
      
      const printContent = invoiceRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      printWindow.document.write(`
        <html>
          <head>
            <title>Invoice - ${order.id}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
            <style>
              body { 
                margin: 0; 
                padding: 0; 
                background-color: white;
                display: flex;
                justify-content: center;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              @media print {
                @page { 
                  size: A4; 
                  margin: 0; 
                }
                body { margin: 0; }
                .no-print { display: none; }
              }
              * { box-sizing: border-box; }
              .print-container {
                width: 210mm;
                height: 297mm;
                overflow: hidden;
              }
            </style>
          </head>
          <body onload="setTimeout(() => { window.print(); window.close(); }, 1000);">
            <div class="print-container">
              ${printContent}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }, 100);
  };

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
                          {getProxyUrl(order.items[0].images[0]) ? (
                            <img 
                              src={getProxyUrl(order.items[0].images[0])!} 
                              alt="" 
                              className="w-full h-full object-cover" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-6 w-6 text-gray-700" />
                            </div>
                          )}
                        </div>
                      )}
                      <div>
                        <p className="font-black text-white group-hover:text-primary transition-colors">#{order.id}</p>
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
                    <div className="relative inline-block">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenStatusDropdown(openStatusDropdown === order.id ? null : order.id);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-1.5 rounded-full border font-black text-[10px] uppercase tracking-widest cursor-pointer transition-all active:scale-95",
                          getStatusColor(order.status)
                        )}
                      >
                        {getStatusIcon(order.status)}
                        <span>{order.status}</span>
                        <ChevronDown className={cn("h-3 w-3 transition-transform", openStatusDropdown === order.id && "rotate-180")} />
                      </button>
                      
                      <AnimatePresence>
                        {openStatusDropdown === order.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenStatusDropdown(null)}
                            />
                            <motion.div 
                              initial={{ opacity: 0, y: 10, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.95 }}
                              className="absolute left-0 mt-2 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden"
                            >
                              <div className="py-2">
                                {(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as OrderStatus[]).map((status) => (
                                  <button
                                    key={status}
                                    onClick={() => {
                                      handleStatusChange(order.id, status);
                                      setOpenStatusDropdown(null);
                                    }}
                                    className={cn(
                                      "flex items-center w-full px-4 py-2.5 text-xs capitalize font-black transition-colors",
                                      order.status === status ? "bg-primary/10 text-primary" : "text-gray-400 hover:bg-white/5 hover:text-white"
                                    )}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleViewInvoice(order)}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all border border-white/5"
                        title="Print/Download Invoice"
                      >
                        <Printer className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-primary/20"
                      >
                        <Eye className="h-4 w-4" />
                        <span>View</span>
                      </button>
                    </div>
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
                  <p className="text-gray-500 font-black uppercase tracking-widest text-[10px]">#{selectedOrder.id}</p>
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
                        Payable: <span className="text-primary">{formatPrice(selectedOrder.payableAmount || selectedOrder.total)}</span> 
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
                        {getProxyUrl(selectedOrder.paymentScreenshot) ? (
                          <img 
                            src={getProxyUrl(selectedOrder.paymentScreenshot)!} 
                            alt="Payment Screenshot" 
                            className="w-full h-auto object-cover transition-transform group-hover:scale-105" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-40 flex items-center justify-center bg-white/5">
                            <ImageIcon className="h-12 w-12 text-gray-700" />
                          </div>
                        )}
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
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Phone</p>
                          <p className="font-black text-white">{selectedOrder.phone}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Emergency</p>
                          <p className="font-black text-white">{selectedOrder.emergencyNumber || 'N/A'}</p>
                        </div>
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
                    <div className="bg-white/5 p-8 rounded-3xl h-full border border-white/5 space-y-4">
                      <p className="font-black text-white leading-relaxed">{selectedOrder.address}</p>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">District</p>
                          <p className="font-black text-white">{selectedOrder.district}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">City</p>
                          <p className="font-black text-white">{selectedOrder.city}</p>
                        </div>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Delivery Method</p>
                        <p className="font-black text-primary">{selectedOrder.deliveryMethod}</p>
                        <p className="mt-1 text-[10px] font-black text-gray-500 uppercase tracking-widest">Area: {selectedOrder.deliveryArea.replace('-', ' ')}</p>
                      </div>
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
                          {getProxyUrl(item.images[0]) ? (
                            <img 
                              src={getProxyUrl(item.images[0])!} 
                              alt="" 
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ImageIcon className="h-8 w-8 text-gray-700" />
                            </div>
                          )}
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
              <div className="p-8 border-t border-white/5 bg-white/5 flex flex-wrap justify-end gap-4">
                <div className="flex gap-2 mr-auto">
                  <button
                    onClick={() => handleViewInvoice(selectedOrder)}
                    className="bg-white/5 text-white px-6 py-4 rounded-xl font-black hover:bg-white/10 transition-all flex items-center gap-2 border border-white/10"
                  >
                    <Eye className="h-5 w-5" />
                    <span>View Invoice</span>
                  </button>
                  <button
                    onClick={() => handlePrintInvoice(selectedOrder)}
                    className="bg-white/5 text-white px-6 py-4 rounded-xl font-black hover:bg-white/10 transition-all flex items-center gap-2 border border-white/10"
                  >
                    <Printer className="h-5 w-5" />
                  </button>
                </div>

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

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {showInvoiceModal && selectedOrderForInvoice && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#111111] w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/10 flex flex-col h-[90vh] max-h-[95vh]"
            >
              <div className="p-4 sm:p-6 border-b border-white/5 flex justify-between items-center bg-white">
                <h2 className="text-xl font-black text-gray-900">Invoice Preview</h2>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              {/* Red Zoom Controls in requested location */}
              <div className="bg-white px-6 py-3 flex justify-end items-center gap-3 border-b border-gray-100">
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                  <button
                    onClick={handleZoomOut}
                    className="bg-red-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <div className="px-2 flex flex-col items-center min-w-[50px]">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Zoom</span>
                    <button 
                      onClick={handleResetZoom}
                      className="text-[10px] font-black text-gray-900 hover:text-red-600 transition-colors"
                    >
                      {Math.round(zoomLevel * 100)}%
                    </button>
                  </div>
                  <button
                    onClick={handleZoomIn}
                    className="bg-red-600 text-white w-10 h-10 rounded-lg flex items-center justify-center font-black text-xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
                    title="Zoom In"
                  >
                    +
                  </button>
                </div>
              </div>

              <div 
                className={cn(
                  "flex-1 overflow-auto p-4 sm:p-8 bg-gray-100/50 select-none",
                  isDragging ? "cursor-grabbing" : "cursor-grab"
                )}
                ref={containerRef}
                onMouseDown={handleMouseDown}
                onMouseLeave={handleMouseLeave}
                onMouseUp={handleMouseUp}
                onMouseMove={handleMouseMove}
              >
                <div className={cn(
                  "min-h-full flex items-start pointer-events-none",
                  scale > 1 ? "justify-start" : "justify-center"
                )}>
                  <div 
                    style={{ 
                      width: `${794 * scale}px`,
                      height: `${1123 * scale}px`,
                      minWidth: `${794 * scale}px`,
                      minHeight: `${1123 * scale}px`,
                    }}
                    className="relative"
                  >
                    <div 
                      className="transition-transform duration-300 ease-in-out shadow-2xl origin-top-left"
                      style={{ 
                        transform: `scale(${scale})`, 
                        width: '794px',
                        height: '1123px',
                        backgroundColor: 'white'
                      }}
                    >
                      <Invoice order={selectedOrderForInvoice} settings={settings} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-white/5 bg-white/5 flex gap-3">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 py-3 bg-white/5 text-gray-400 rounded-xl font-black hover:text-white transition-all text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadInvoice}
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-primary-dark text-white rounded-xl font-black shadow-lg shadow-primary-dark/20 hover:bg-primary transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
                >
                  <Download className="h-4 w-4" />
                  {isGenerating ? 'Generating...' : 'Download PDF'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
