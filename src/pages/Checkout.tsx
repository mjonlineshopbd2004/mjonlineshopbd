import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { DELIVERY_AREAS, PAYMENT_METHODS } from '../constants';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, CreditCard, Truck, MapPin, Phone, User, Upload, Image as ImageIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { uploadFile } from '../lib/upload';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function Checkout() {
  const { selectedItems, selectedSubtotal, clearCart } = useCart();
  const { user, profile, setAuthModalOpen } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: profile?.displayName || user?.displayName || '',
    phone: profile?.phone || '',
    address: profile?.address || '',
    deliveryArea: 'inside-dhaka' as 'inside-dhaka' | 'outside-dhaka',
    paymentMethod: 'bkash' as 'bkash' | 'nagad' | 'rocket',
    paymentType: '100%' as '50%' | '100%',
    transactionId: '',
    customerNote: '',
    paymentScreenshot: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || profile.displayName || '',
        phone: prev.phone || profile.phone || '',
        address: prev.address || profile.address || '',
      }));
    }
  }, [profile]);

  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedItems.length === 0) {
      navigate('/cart');
    }
  }, [selectedItems.length, navigate]);

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setScreenshotFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setScreenshotPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const { settings } = useSettings();
  const deliveryCharge = formData.deliveryArea === 'inside-dhaka' 
    ? settings.deliveryChargeInside 
    : settings.deliveryChargeOutside;
  const total = selectedSubtotal + deliveryCharge;
  const payableAmount = formData.paymentType === '50%' ? total / 2 : total;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Please login to continue');
      setAuthModalOpen(true);
      return;
    }

    if (!formData.name || !formData.phone || !formData.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    navigate('/payment', { 
      state: { 
        formData, 
        selectedItems, 
        selectedSubtotal, 
        deliveryCharge, 
        total, 
        payableAmount 
      } 
    });
  };

  if (selectedItems.length === 0) {
    return null;
  }

  return (
    <div className="container-custom py-12">
      <button
        onClick={() => navigate('/cart')}
        className="flex items-center text-gray-500 font-bold hover:text-orange-600 mb-8 transition-colors"
      >
        <ArrowLeft className="mr-2 h-5 w-5" />
        Back to Cart
      </button>

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-1">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 mb-12">Checkout</h1>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Shipping Info */}
            <section>
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-orange-100 p-3 rounded-2xl"><MapPin className="h-6 w-6 text-orange-600" /></div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Shipping Information</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Full Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-6 py-4 outline-none transition-all font-bold"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                    <User className="absolute right-4 top-4 h-6 w-6 text-gray-300" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Phone Number</label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="01XXXXXXXXX"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-6 py-4 outline-none transition-all font-bold"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                    <Phone className="absolute right-4 top-4 h-6 w-6 text-gray-300" />
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Full Address</label>
                  <textarea
                    required
                    rows={3}
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-6 py-4 outline-none transition-all font-bold"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-500 uppercase tracking-widest">Customer Note (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Any special instructions for your order?"
                    className="w-full bg-gray-50 border-2 border-transparent focus:border-orange-500 focus:bg-white rounded-2xl px-6 py-4 outline-none transition-all font-bold"
                    value={formData.customerNote}
                    onChange={(e) => setFormData({ ...formData, customerNote: e.target.value })}
                  />
                </div>
              </div>
            </section>

            {/* Delivery Area */}
            <section>
              <div className="flex items-center space-x-3 mb-8">
                <div className="bg-orange-100 p-3 rounded-2xl"><Truck className="h-6 w-6 text-orange-600" /></div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Delivery Area</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DELIVERY_AREAS.map((area) => (
                  <button
                    key={area.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryArea: area.id as any })}
                    className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border-2 transition-all",
                      formData.deliveryArea === area.id
                        ? "border-orange-600 bg-orange-50 shadow-lg shadow-orange-100"
                        : "border-gray-100 bg-white hover:border-orange-200"
                    )}
                  >
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{area.name}</p>
                      <p className="text-sm text-gray-500 font-bold">
                        Delivery Charge: {formatPrice(area.id === 'inside-dhaka' ? settings.deliveryChargeInside : settings.deliveryChargeOutside)}
                      </p>
                    </div>
                    {formData.deliveryArea === area.id && <CheckCircle2 className="h-6 w-6 text-orange-600" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Payment Type */}
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-orange-100 p-3 rounded-2xl"><CreditCard className="h-6 w-6 text-orange-600" /></div>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">Payment Type</h2>
              </div>
              <p className="text-gray-600 font-bold mb-6">নিচের রেঞ্জ থেকে আপনার অগ্রিম পেমেন্ট পার্সেন্ট সিলেক্ট করুন</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: '100%', name: 'Pay Now 100%', description: 'Pay the full amount now' }
                ].map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: type.id as any })}
                    className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border-2 transition-all",
                      formData.paymentType === type.id
                        ? "border-orange-600 bg-orange-50 shadow-lg shadow-orange-100"
                        : "border-gray-100 bg-white hover:border-orange-200"
                    )}
                  >
                    <div className="text-left">
                      <p className="font-bold text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-500 font-bold">{type.description}</p>
                    </div>
                    {formData.paymentType === type.id && <CheckCircle2 className="h-6 w-6 text-orange-600" />}
                  </button>
                ))}
              </div>
            </section>

            {/* Payment Method moved to separate page */}
        </form>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="lg:w-96">
          <div className="bg-gray-900 text-white rounded-[2.5rem] p-8 shadow-2xl sticky top-24">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Your Order</h2>
            
            <div className="max-h-60 overflow-y-auto mb-8 pr-2 space-y-4 scrollbar-hide">
              {selectedItems.map((item) => (
                <div key={`${item.id}-${item.selectedSize}-${item.selectedColor}`} className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white/10 flex-shrink-0">
                    <img src={getProxyUrl(item.images[0])} alt="" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold truncate">{item.name}</p>
                    <p className="text-xs text-gray-400">Qty: {item.quantity} × {formatPrice(item.discountPrice || item.price)}</p>
                  </div>
                  <p className="font-bold text-orange-500">{formatPrice((item.discountPrice || item.price) * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-4 mb-8 border-t border-white/10 pt-8">
              <div className="flex justify-between text-gray-400 font-bold">
                <span>Subtotal</span>
                <span className="text-white">{formatPrice(selectedSubtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-400 font-bold">
                <span>Delivery Charge</span>
                <span className="text-white">{formatPrice(deliveryCharge)}</span>
              </div>
              <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                <span className="text-xl font-bold tracking-tight">Total</span>
                <span className="text-3xl font-bold tracking-tight text-orange-500">{formatPrice(total)}</span>
              </div>
              {formData.paymentType && (
                <div className="flex justify-between items-center text-orange-400 font-bold">
                  <span>Payable Now ({formData.paymentType})</span>
                  <span className="text-xl">{formatPrice(payableAmount)}</span>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !formData.paymentType}
              className="w-full bg-orange-600 text-white py-5 rounded-2xl font-bold text-xl shadow-xl hover:bg-orange-700 transition-all flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="h-6 w-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Proceed to Payment</span>
                  <CheckCircle2 className="h-6 w-6" />
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
