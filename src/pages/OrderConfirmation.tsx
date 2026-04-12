import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { CheckCircle2, Package, Truck, ShoppingBag, ArrowRight, MapPin, Phone, User, XCircle, Download, Printer, FileText, Eye, ZoomIn, ZoomOut } from 'lucide-react';
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
  const [zoomLevel, setZoomLevel] = useState(1); // 1 = Fit to screen, > 1 = Zoomed
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const baseWidth = 794;
        const fitScale = (containerWidth - 16) / baseWidth;
        
        // Final scale is fitScale multiplied by user's zoom level
        const newScale = Math.max(0.3, fitScale * zoomLevel);
        setScale(newScale);
      }
    };
    if (showInvoiceModal) {
      updateScale();
      window.addEventListener('resize', updateScale);
    }
    return () => window.removeEventListener('resize', updateScale);
  }, [showInvoiceModal, zoomLevel]);

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
    <div className="container-custom py-8 md:py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2rem] md:rounded-[3rem] shadow-xl overflow-hidden border border-gray-100 max-w-4xl mx-auto"
      >
        <div className={cn(
          "p-8 md:p-10 text-center text-white relative overflow-hidden",
          paymentStatus === 'failed' || paymentStatus === 'cancelled' ? "bg-red-600" : "bg-orange-600"
        )}>
          <div className="relative z-10">
            <div className="bg-white/20 w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
              {paymentStatus === 'failed' || paymentStatus === 'cancelled' ? (
                <XCircle className="h-8 w-8 md:h-10 md:w-10 text-white" />
              ) : (
                <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-white" />
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight mb-1 uppercase font-display">
              {paymentStatus === 'failed' || paymentStatus === 'cancelled' ? 'Order Issue' : 'Thank You!'}
            </h1>
            <p className="text-orange-100 text-sm md:text-base font-bold">
              {paymentStatus === 'failed' || paymentStatus === 'cancelled' 
                ? 'There was an issue with your payment.' 
                : 'Your order has been placed successfully.'}
            </p>
            <div className="mt-4 inline-block bg-black/20 backdrop-blur-sm px-4 py-1.5 rounded-full">
              <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-white">Order ID: #{order.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl"></div>
        </div>

        <div className="p-6 md:p-10 space-y-10">
          {/* Order Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl shadow-sm"><Package className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                <p className="text-sm font-black text-gray-900 capitalize">{order.status}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl shadow-sm"><Truck className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Delivery</p>
                <p className="text-sm font-black text-gray-900 capitalize">{order.deliveryArea.replace('-', ' ')}</p>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center gap-4">
              <div className="bg-white p-2.5 rounded-xl shadow-sm"><ShoppingBag className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                <p className="text-sm font-black text-gray-900">{formatPrice(order.total)}</p>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-base font-black tracking-tight text-gray-900 flex items-center uppercase font-display">
                <User className="mr-2 h-5 w-5 text-orange-600" />
                Customer Details
              </h3>
              <div className="space-y-3 bg-gray-50/50 p-5 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Name</p>
                  <p className="text-xs font-bold text-gray-900">{order.customerName}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</p>
                  <p className="text-xs font-bold text-gray-900">{order.phone}</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                  <p className="text-xs font-bold text-gray-900 truncate max-w-[150px]">{order.customerEmail}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-base font-black tracking-tight text-gray-900 flex items-center uppercase font-display">
                <MapPin className="mr-2 h-5 w-5 text-orange-600" />
                Shipping Address
              </h3>
              <div className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100 h-full">
                <p className="text-xs font-bold text-gray-900 leading-relaxed">{order.address}</p>
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="space-y-4">
            <h3 className="text-base font-black tracking-tight text-gray-900 uppercase font-display">Order Items</h3>
            <div className="space-y-3">
              {order.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4 bg-white border border-gray-100 p-3 rounded-2xl hover:shadow-sm transition-shadow">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-50 flex-shrink-0 border border-gray-100">
                    <img src={getProxyUrl(item.images[0])} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate text-xs">{item.name}</p>
                    <p className="text-[9px] text-gray-500 font-bold mt-0.5">
                      {item.selectedSize && `Size: ${item.selectedSize}`} 
                      {item.selectedColor && ` | Color: ${item.selectedColor}`}
                    </p>
                    <p className="text-[9px] text-orange-600 font-black mt-0.5 uppercase tracking-wider">Qty: {item.quantity} × {formatPrice(item.discountPrice || item.price)}</p>
                  </div>
                  <p className="font-black text-gray-900 text-xs">{formatPrice((item.discountPrice || item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-900 text-white p-6 rounded-2xl space-y-3 shadow-xl">
            <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-widest">
              <span>Subtotal</span>
              <span className="text-white">{formatPrice(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 font-black uppercase tracking-widest">
              <span>Delivery Charge</span>
              <span className="text-white">{formatPrice(order.deliveryCharge)}</span>
            </div>
            <div className="border-t border-white/10 pt-3 flex justify-between items-center">
              <span className="text-sm font-black uppercase tracking-widest">Total Paid</span>
              <span className="text-xl font-black text-orange-500">{formatPrice(order.total)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-4">
            <button
              onClick={() => setShowInvoiceModal(true)}
              className="bg-gray-900 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2"
            >
              <Eye className="h-4 w-4" />
              <span>View Invoice</span>
            </button>
            <button
              onClick={handlePrintInvoice}
              className="bg-white border border-gray-900 text-gray-900 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              <span>Print Invoice</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Link
              to="/orders"
              className="bg-gray-100 text-gray-900 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
            >
              <FileText className="h-4 w-4" />
              <span>Order History</span>
            </Link>
            <Link
              to="/products"
              className="bg-orange-600 text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center justify-center gap-2"
            >
              <span>Shop More</span>
              <ArrowRight className="h-4 w-4" />
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
              className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col h-[90vh] max-h-[95vh]"
            >
              <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-20">
                <div>
                  <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight font-display">Invoice Preview</h2>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order #{order.id.slice(-8).toUpperCase()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowInvoiceModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <XCircle className="h-6 w-6 text-gray-400" />
                  </button>
                </div>
              </div>

              {/* Red Zoom Controls in requested location - Highly Visible */}
              <div className="bg-white px-6 py-4 flex justify-end items-center border-b border-gray-100 relative z-30">
                <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border-2 border-red-100 shadow-sm">
                  <button
                    onClick={handleZoomOut}
                    className="bg-red-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <div className="px-3 flex flex-col items-center min-w-[60px]">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Zoom</span>
                    <button 
                      onClick={handleResetZoom}
                      className="text-xs font-black text-gray-900 hover:text-red-600 transition-colors"
                    >
                      {Math.round(zoomLevel * 100)}%
                    </button>
                  </div>
                  <button
                    onClick={handleZoomIn}
                    className="bg-red-600 text-white w-12 h-12 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition-all"
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
                      <Invoice order={order} settings={settings} />
                    </div>
                  </div>
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
          width: '794px',
          height: '1123px',
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
