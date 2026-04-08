import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { CheckCircle2, Package, Truck, ShoppingBag, ArrowRight, MapPin, Phone, User, XCircle, Download, Printer, FileText, Eye } from 'lucide-react';
import { formatPrice, cn, getProxyUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useSettings } from '../contexts/SettingsContext';
import { Invoice } from '../components/Invoice';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function OrderConfirmation() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const { settings } = useSettings();
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [scale, setScale] = useState(0.8);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const baseWidth = 794;
        // Allow smaller scale for mobile devices
        const newScale = Math.max(0.1, Math.min(1, (containerWidth - 16) / baseWidth));
        setScale(newScale);
      }
    };
    if (showInvoiceModal) {
      updateScale();
      window.addEventListener('resize', updateScale);
    }
    return () => window.removeEventListener('resize', updateScale);
  }, [showInvoiceModal]);

  const paymentStatus = searchParams.get('payment');

  const handleDownloadInvoice = async () => {
    if (!invoiceRef.current || !order) return;
    
    setIsGenerating(true);
    const toastId = toast.loading('Generating invoice...');
    
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
      pdf.save(`invoice-${order.id.slice(-8)}.pdf`);
      toast.success('Invoice downloaded successfully!', { id: toastId });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate invoice.', { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrintInvoice = () => {
    if (!invoiceRef.current) return;
    
    const printContent = invoiceRef.current.outerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Invoice - ${order?.id}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Dancing+Script:wght@700&display=swap');
            body { 
              margin: 0; 
              padding: 0; 
              background-color: white;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @media print {
              @page { 
                size: A4; 
                margin: 0; 
              }
              body { margin: 0; }
            }
            * { box-sizing: border-box; }
          </style>
        </head>
        <body onload="setTimeout(() => { window.print(); window.close(); }, 500);">
          <div style="display: flex; justify-content: center;">
            ${printContent}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  useEffect(() => {
    if (paymentStatus === 'success') {
      toast.success('Payment successful!');
    } else if (paymentStatus === 'failed') {
      toast.error('Payment failed. Please try again or choose another method.');
    } else if (paymentStatus === 'cancelled') {
      toast.error('Payment was cancelled.');
    }
  }, [paymentStatus]);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      try {
        const orderDoc = await getDoc(doc(db, 'orders', id));
        if (orderDoc.exists()) {
          setOrder({ id: orderDoc.id, ...orderDoc.data() } as Order);
        }
      } catch (error) {
        console.error("Error fetching order:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="container-custom py-24 text-center">
        <div className="animate-spin h-12 w-12 border-4 border-orange-600 border-t-transparent rounded-full mx-auto"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-custom py-24 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-4">Order Not Found</h1>
        <Link to="/" className="bg-orange-600 text-white px-8 py-3 rounded-xl font-bold">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="container-custom py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-gray-100"
      >
        <div className={cn(
          "p-12 text-center text-white relative overflow-hidden",
          paymentStatus === 'failed' || paymentStatus === 'cancelled' ? "bg-red-600" : "bg-orange-600"
        )}>
          <div className="relative z-10">
            <div className="bg-white/20 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 backdrop-blur-md">
              {paymentStatus === 'failed' || paymentStatus === 'cancelled' ? (
                <XCircle className="h-12 w-12 text-white" />
              ) : (
                <CheckCircle2 className="h-12 w-12 text-white" />
              )}
            </div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              {paymentStatus === 'failed' || paymentStatus === 'cancelled' ? 'Order Issue' : 'Thank You!'}
            </h1>
            <p className="text-orange-100 text-lg font-bold">
              {paymentStatus === 'failed' || paymentStatus === 'cancelled' 
                ? 'There was an issue with your payment.' 
                : 'Your order has been placed successfully.'}
            </p>
            <p className="mt-4 text-orange-200 font-bold uppercase tracking-widest text-sm">Order ID: #{order.id}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
        </div>

        <div className="p-8 md:p-12 space-y-12">
          {/* Order Status */}
            <div className="flex flex-wrap justify-between gap-4 py-6 border-b border-gray-100">
              <div className="flex items-center space-x-3 min-w-[140px]">
                <div className="bg-orange-50 p-3 rounded-xl"><Package className="h-6 w-6 text-orange-600" /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                  <p className="text-lg font-bold tracking-tight text-gray-900 capitalize">{order.status}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 min-w-[140px]">
                <div className="bg-orange-50 p-3 rounded-xl"><Truck className="h-6 w-6 text-orange-600" /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery</p>
                  <p className="text-lg font-bold tracking-tight text-gray-900 capitalize">{order.deliveryArea.replace('-', ' ')}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 min-w-[140px]">
                <div className="bg-orange-50 p-3 rounded-xl"><ShoppingBag className="h-6 w-6 text-orange-600" /></div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                  <p className="text-lg font-bold tracking-tight text-gray-900">{formatPrice(order.total)}</p>
                </div>
              </div>
            </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight text-gray-900 flex items-center">
                <User className="mr-2 h-6 w-6 text-orange-600" />
                Customer Details
              </h3>
              <div className="space-y-4 bg-gray-50 p-6 rounded-3xl">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Name</p>
                  <p className="font-bold text-gray-900">{order.customerName}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Phone</p>
                  <p className="font-bold text-gray-900">{order.phone}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Email</p>
                  <p className="font-bold text-gray-900">{order.customerEmail}</p>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xl font-bold tracking-tight text-gray-900 flex items-center">
                <MapPin className="mr-2 h-6 w-6 text-orange-600" />
                Shipping Address
              </h3>
              <div className="bg-gray-50 p-6 rounded-3xl h-full">
                <p className="font-bold text-gray-900 leading-relaxed">{order.address}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-6">
            <h3 className="text-xl font-bold tracking-tight text-gray-900">Order Items</h3>
            <div className="space-y-4">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center space-x-4 bg-white border border-gray-100 p-3 sm:p-4 rounded-2xl">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0">
                    <img src={getProxyUrl(item.images[0])} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate text-sm sm:text-base">{item.name}</p>
                    <p className="text-[10px] sm:text-sm text-gray-500 font-bold">
                      {item.selectedSize && `Size: ${item.selectedSize}`} 
                      {item.selectedColor && ` | Color: ${item.selectedColor}`}
                    </p>
                    <p className="text-[10px] sm:text-sm text-orange-600 font-bold">Qty: {item.quantity} × {formatPrice(item.discountPrice || item.price)}</p>
                  </div>
                  <p className="font-bold text-gray-900 text-sm sm:text-base">{formatPrice((item.discountPrice || item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-900 text-white p-8 rounded-[2rem] space-y-4">
            <div className="flex justify-between text-gray-400 font-bold">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-400 font-bold">
              <span>Delivery Charge</span>
              <span>{formatPrice(order.deliveryCharge)}</span>
            </div>
            <div className="border-t border-white/10 pt-4 flex justify-between items-center">
              <span className="text-xl font-bold tracking-tight">Total Paid</span>
              <span className="text-3xl font-bold tracking-tight text-orange-500">{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-8">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="flex-1 bg-gray-900 text-white py-4 rounded-2xl font-bold text-center hover:bg-black transition-all flex items-center justify-center space-x-2"
            >
              <Eye className="h-5 w-5" />
              <span>View Invoice</span>
            </button>
            <button
              onClick={handlePrintInvoice}
              className="flex-1 bg-white border-2 border-gray-900 text-gray-900 py-4 rounded-2xl font-bold text-center hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
            >
              <Printer className="h-5 w-5" />
              <span>Print Invoice</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link
              to="/orders"
              className="flex-1 bg-gray-100 text-gray-900 py-4 rounded-2xl font-bold text-center hover:bg-gray-200 transition-all flex items-center justify-center space-x-2"
            >
              <FileText className="h-5 w-5" />
              <span>View Order History</span>
            </Link>
            <Link
              to="/products"
              className="flex-1 bg-orange-600 text-white py-4 rounded-2xl font-bold text-center hover:bg-orange-700 transition-all flex items-center justify-center space-x-2"
            >
              <span>Continue Shopping</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Invoice Preview Modal */}
      <AnimatePresence>
        {showInvoiceModal && order && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[95vh]"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Invoice Preview</h2>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <XCircle className="h-6 w-6 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-auto p-2 sm:p-4 bg-gray-50 flex justify-center items-start" ref={containerRef}>
                <div style={{ 
                  transform: `scale(${scale})`, 
                  transformOrigin: 'top center',
                  width: '794px',
                  height: '1123px',
                  marginBottom: `${-1123 * (1 - scale)}px`
                }}>
                  <Invoice order={order} settings={settings} />
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all text-sm"
                >
                  Close
                </button>
                <button
                  onClick={handleDownloadInvoice}
                  disabled={isGenerating}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-xl font-bold shadow-lg shadow-orange-200 hover:bg-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm"
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
        <Invoice ref={invoiceRef} order={order} settings={settings} />
      </div>
    </div>
  );
}
