import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { formatPrice, getProxyUrl } from '../lib/utils';
import { PAYMENT_METHODS } from '../constants';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { toast } from 'sonner';
import axios from 'axios';
import { ArrowLeft, CheckCircle2, CreditCard, Upload, Image as ImageIcon, Landmark, Phone, ArrowRight, Loader2, Calendar } from 'lucide-react';
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

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearCart } = useCart();
  const { user } = useAuth();
  const { settings } = useSettings();
  
  const checkoutData = location.state;

  useEffect(() => {
    if (!checkoutData) {
      navigate('/checkout');
    }
  }, [checkoutData, navigate]);

  const [activeTab, setActiveTab] = useState<'mobile' | 'card'>('mobile');
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [showBankList, setShowBankList] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [cardDetails, setCardDetails] = useState({
    holderName: '',
    cardNumber: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: '',
    acceptedTerms: true
  });
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!checkoutData) return null;

  const { formData, selectedItems, selectedSubtotal, deliveryCharge, total, payableAmount, nextOrderId } = checkoutData;

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

  const handleSubmit = async () => {
    if (!paymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    const isCard = ['visa', 'mastercard'].includes(paymentMethod);

    if (isCard) {
      if (!cardDetails.holderName || !cardDetails.cardNumber || !cardDetails.expiryMonth || !cardDetails.expiryYear || !cardDetails.cvv) {
        toast.error('Please fill in all card details');
        return;
      }
      if (!cardDetails.acceptedTerms) {
        toast.error('Please accept the terms and conditions');
        return;
      }
    } else {
      if (!transactionId) {
        toast.error('Please provide the Transaction ID');
        return;
      }

      if (!screenshotFile) {
        toast.error('Please upload a payment screenshot');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      let screenshotUrl = '';
      if (screenshotFile) {
        const idToken = await user.getIdToken();
        const uploadedUrl = await uploadFile(screenshotFile, idToken);
        if (!uploadedUrl) {
          setIsSubmitting(false);
          return;
        }
        screenshotUrl = uploadedUrl;
      }

      const orderData = {
        userId: user.uid,
        customerName: formData.name,
        customerEmail: user.email,
        phone: formData.phone,
        emergencyNumber: formData.emergencyNumber,
        district: formData.district,
        city: formData.city,
        address: formData.address,
        deliveryMethod: formData.deliveryMethod,
        items: selectedItems,
        subtotal: selectedSubtotal,
        deliveryCharge,
        discount: 0,
        total,
        payableAmount,
        status: 'pending',
        paymentMethod,
        paymentType: formData.paymentType,
        paymentStatus: 'pending',
        deliveryArea: formData.deliveryArea,
        transactionId: isCard ? `CARD-${cardDetails.cardNumber.slice(-4)}` : transactionId,
        paymentScreenshot: screenshotUrl,
        cardDetails: isCard ? {
          holderName: cardDetails.holderName,
          cardNumber: `**** **** **** ${cardDetails.cardNumber.slice(-4)}`,
          expiry: `${cardDetails.expiryMonth}/${cardDetails.expiryYear}`
        } : null,
        customerNote: formData.customerNote,
        createdAt: new Date().toISOString(),
      };

      try {
        const token = await auth.currentUser?.getIdToken();
        const response = await fetch('/api/orders', {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': 'application/json'
          },
          body: JSON.stringify(orderData)
        });
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to place order');
          }
          throw new Error(`Failed to place order (Status: ${response.status})`);
        }

        const data = await response.json();
        
        clearCart();
        navigate(`/order-confirmation/${data.id}`);
        toast.success('Order placed successfully!');
      } catch (error: any) {
        console.error('Order creation error:', error);
        toast.error(error.message || 'Failed to place order. Please try again.');
      }
    } catch (error) {
      console.error("Error placing order:", error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const mobileMethods = [
    settings.enableBkash && { 
      id: 'bkash', 
      name: 'bKash', 
      icon: settings.bkashLogo || 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/bkash.png' 
    },
    settings.enableNagad && { 
      id: 'nagad', 
      name: 'Nagad', 
      icon: settings.nagadLogo || 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/nagad.png' 
    },
    settings.enableRocket && { 
      id: 'rocket', 
      name: 'Rocket', 
      icon: settings.rocketLogo || 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/rocket.png' 
    },
    settings.enableUpay && { 
      id: 'upay', 
      name: 'Upay', 
      icon: settings.upayLogo || 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/upay.png' 
    },
  ].filter(Boolean) as { id: string, name: string, icon: string }[];

  const cardMethods = [
    settings.enableVisa && { 
      id: 'visa', 
      name: 'Visa', 
      icon: settings.visaLogo || 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/visa.png' 
    },
    settings.enableMastercard && { 
      id: 'mastercard', 
      name: 'MasterCard', 
      icon: settings.mastercardLogo || 'https://cdn.jsdelivr.net/gh/tusharnit/bangladesh-payment-gateways@master/logos/mastercard.png' 
    },
    settings.enableBankTransfer && { id: 'bank', name: 'Bank Transfer', icon: settings.bankLogo || '🏦' },
  ].filter(Boolean) as { id: string, name: string, icon: string }[];

  const specificBanks = settings.banks || [];

  return (
    <div className="min-h-screen bg-[#0f3d3e] py-12 px-4 flex items-center justify-center font-sans">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Payment Selection */}
        <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-8 md:p-10 flex-1">
            <div className="flex justify-between items-center mb-10">
              <h1 className="text-2xl font-bold text-[#4a154b]">Select Payment Method</h1>
            </div>

            {/* Tabs */}
            <div className="flex border border-gray-200 rounded-xl overflow-hidden mb-8">
              <button 
                onClick={() => setActiveTab('mobile')}
                className={cn(
                  "flex-1 py-4 px-6 font-bold text-sm transition-all flex items-center justify-center gap-2",
                  activeTab === 'mobile' ? "bg-[#6d2077] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                )}
              >
                <Phone className="h-4 w-4" />
                Mobile Banking
              </button>
              <button 
                onClick={() => setActiveTab('card')}
                className={cn(
                  "flex-1 py-4 px-6 font-bold text-sm transition-all flex items-center justify-center gap-2 border-l border-gray-200",
                  activeTab === 'card' ? "bg-[#6d2077] text-white" : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                )}
              >
                <CreditCard className="h-4 w-4" />
                Debit / Credit Card
              </button>
            </div>

            {/* Mobile Banking Section */}
            {(activeTab === 'mobile') && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-6 text-[#6d2077]">
                  <Phone className="h-5 w-5" />
                  <h2 className="font-bold uppercase tracking-wider text-sm">Mobile Banking</h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {mobileMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => setPaymentMethod(method.id as any)}
                      className={cn(
                        "relative h-16 border-2 rounded-xl flex items-center justify-center p-2 transition-all group",
                        paymentMethod === method.id 
                          ? "border-[#6d2077] bg-purple-50 shadow-md" 
                          : "border-gray-100 hover:border-purple-200"
                      )}
                    >
                      <img 
                        src={method.icon} 
                        alt={method.name} 
                        className="max-h-full max-w-full object-contain" 
                      />
                      {paymentMethod === method.id && (
                        <div className="absolute -top-2 -right-2 bg-[#6d2077] text-white rounded-full p-0.5 shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Section */}
            {(activeTab === 'card') && (
              <div className="mb-10">
                <div className="flex items-center gap-2 mb-6 text-[#6d2077]">
                  <CreditCard className="h-5 w-5" />
                  <h2 className="font-bold uppercase tracking-wider text-sm">Debit / Credit Card</h2>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 mb-6">
                  {cardMethods.map((method) => (
                    <button
                      key={method.id}
                      onClick={() => {
                        setPaymentMethod(method.id as any);
                        if (method.id === 'bank') {
                          setShowBankList(true);
                        } else {
                          setShowBankList(false);
                        }
                      }}
                      className={cn(
                        "relative h-16 border-2 rounded-xl flex items-center justify-center p-2 transition-all",
                        (paymentMethod === method.id || (method.id === 'bank' && showBankList))
                          ? "border-[#6d2077] bg-purple-50 shadow-md" 
                          : "border-gray-100 bg-white hover:border-purple-200"
                      )}
                    >
                      {method.id === 'bank' ? (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-2xl">🏦</span>
                          <span className="text-[8px] font-bold text-gray-500 uppercase">Bank</span>
                        </div>
                      ) : (
                        <img 
                          src={method.icon} 
                          alt={method.name} 
                          className="max-h-full max-w-full object-contain" 
                        />
                      )}
                      {(paymentMethod === method.id || (method.id === 'bank' && showBankList)) && (
                        <div className="absolute -top-2 -right-2 bg-[#6d2077] text-white rounded-full p-0.5 shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Specific Bank List */}
                {showBankList && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 border-t border-gray-100 pt-6">
                    <p className="text-xs font-bold text-gray-500 uppercase mb-4">Select your bank:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {specificBanks.map((bank) => (
                        <button
                          key={bank.id}
                          onClick={() => setPaymentMethod(bank.id as any)}
                          className={cn(
                            "relative h-16 border-2 rounded-xl flex items-center justify-center p-2 transition-all",
                            paymentMethod === bank.id 
                              ? "border-[#6d2077] bg-purple-50 shadow-md" 
                              : "border-gray-100 bg-white hover:border-purple-200"
                          )}
                        >
                          {bank.logo ? (
                            <img 
                              src={bank.logo} 
                              alt={bank.name} 
                              className="max-h-full max-w-full object-contain" 
                            />
                          ) : (
                            <span className="text-2xl">🏦</span>
                          )}
                          {paymentMethod === bank.id && (
                            <div className="absolute -top-2 -right-2 bg-[#6d2077] text-white rounded-full p-0.5 shadow-sm">
                              <CheckCircle2 className="h-4 w-4" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Manual Verification Fields (Integrated into the gateway look) */}
            {paymentMethod && paymentMethod !== 'cod' && (
              <div className="mt-8 p-6 bg-gray-50 rounded-2xl border border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-300">
                {['visa', 'mastercard'].includes(paymentMethod) ? (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                      <div className="flex flex-col">
                        <h3 className="font-bold text-gray-900">Credit & Debit cards</h3>
                        <p className="text-[10px] text-gray-500">Transaction fee may apply</p>
                      </div>
                      <div className="flex gap-2">
                        <div className="bg-[#1a1f71] p-1 rounded px-2 flex items-center h-6">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" className="h-3 invert" alt="Visa" />
                        </div>
                        <div className="bg-[#000] p-1 rounded px-2 flex items-center h-6">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/1280px-Mastercard-logo.svg.png" className="h-3" alt="Mastercard" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Rolwin reevan"
                          className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#6d2077] transition-all text-sm font-bold"
                          value={cardDetails.holderName}
                          onChange={(e) => setCardDetails({ ...cardDetails, holderName: e.target.value })}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-600">Card Number</label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="4124 3246 3332 6578"
                            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#6d2077] transition-all text-sm font-bold"
                            value={cardDetails.cardNumber}
                            onChange={(e) => setCardDetails({ ...cardDetails, cardNumber: e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19) })}
                          />
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#1a1f71] px-2 py-0.5 rounded">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png" className="h-2 invert" alt="" />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-600">End Date</label>
                          <div className="flex gap-2">
                            <select 
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-3 outline-none focus:border-[#6d2077] text-sm font-bold"
                              value={cardDetails.expiryMonth}
                              onChange={(e) => setCardDetails({ ...cardDetails, expiryMonth: e.target.value })}
                            >
                              <option value="">mm</option>
                              {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={String(i + 1).padStart(2, '0')}>{String(i + 1).padStart(2, '0')}</option>
                              ))}
                            </select>
                            <select 
                              className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-3 outline-none focus:border-[#6d2077] text-sm font-bold"
                              value={cardDetails.expiryYear}
                              onChange={(e) => setCardDetails({ ...cardDetails, expiryYear: e.target.value })}
                            >
                              <option value="">yyyy</option>
                              {Array.from({ length: 10 }, (_, i) => (
                                <option key={i} value={String(new Date().getFullYear() + i)}>{new Date().getFullYear() + i}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-bold text-gray-600">CVV</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="password"
                              maxLength={3}
                              placeholder="CVV"
                              className="w-24 bg-white border border-gray-200 rounded-lg px-4 py-3 outline-none focus:border-[#6d2077] text-sm font-bold"
                              value={cardDetails.cvv}
                              onChange={(e) => setCardDetails({ ...cardDetails, cvv: e.target.value.replace(/\D/g, '') })}
                            />
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                              <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center text-[8px]">i</div>
                              3 digits
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-2 pt-2">
                        <input 
                          type="checkbox" 
                          id="terms" 
                          className="mt-1 accent-[#6d2077]" 
                          checked={cardDetails.acceptedTerms}
                          onChange={(e) => setCardDetails({ ...cardDetails, acceptedTerms: e.target.checked })}
                        />
                        <label htmlFor="terms" className="text-[10px] font-bold text-gray-500 leading-tight">
                          I have read and accept the terms of use, rules of flight and privacy policy
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <h3 className="font-bold text-[#6d2077] flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5" />
                      Payment Instructions
                    </h3>
                    {(paymentMethod === 'bank' || specificBanks.some(b => b.id === paymentMethod)) ? (
                      <div className="text-sm text-gray-600 space-y-1 font-bold">
                        {(() => {
                          const bank = specificBanks.find(b => b.id === paymentMethod) || specificBanks[0];
                          if (bank) {
                            return (
                              <>
                                <p>Bank: {bank.name}</p>
                                <p>A/C Name: {bank.accountName}</p>
                                <p>A/C No: {bank.accountNumber}</p>
                              </>
                            );
                          }
                          return (
                            <>
                              <p>Bank: {settings.bankName}</p>
                              <p>A/C Name: {settings.bankAccountName}</p>
                              <p>A/C No: {settings.bankAccountNumber}</p>
                            </>
                          );
                        })()}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600 font-bold">
                        {(() => {
                          const mobile = mobileMethods.find(m => m.id === paymentMethod);
                          let number = (mobile as any)?.number;
                          
                          if (!number) {
                            if (paymentMethod === 'bkash') number = settings.bkashNumber;
                            else if (paymentMethod === 'nagad') number = settings.nagadNumber;
                            else if (paymentMethod === 'rocket') number = settings.rocketNumber;
                            else if (paymentMethod === 'upay') number = settings.upayNumber;
                            else number = settings.paymentNumber;
                          }
                          
                          if (!number) number = '01810580592';

                          return (
                            <>
                              Send <span className="text-[#6d2077]">{formatPrice(payableAmount)}</span> to <span className="text-black">{number}</span> via {mobile?.name || paymentMethod}.
                            </>
                          );
                        })()}
                      </p>
                    )}
                    <input
                      type="text"
                      placeholder="Transaction ID"
                      className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#6d2077] transition-all text-sm font-bold"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Upload Screenshot</label>
                    <div className="relative h-32">
                      <input type="file" accept="image/*" onChange={handleScreenshotChange} className="hidden" id="manual-upload" />
                      <label 
                        htmlFor="manual-upload"
                        className={cn(
                          "w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all",
                          screenshotPreview ? "border-[#6d2077] bg-white" : "border-gray-200 bg-white hover:border-gray-300"
                        )}
                      >
                        {screenshotPreview ? (
                          <img src={screenshotPreview} alt="Preview" className="h-full w-full object-contain p-2" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-gray-400 mb-1" />
                            <span className="text-[10px] font-bold text-gray-500">Click to upload</span>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
                </div>
                )}
              </div>
            )}

            {/* Security Badges */}
            <div className="mt-auto pt-8 flex items-center justify-between border-t border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-gray-400">
                  <div className="bg-[#4caf50] text-white p-1 rounded-full"><CheckCircle2 className="h-3 w-3" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter">SSL Secured</span>
                </div>
                <div className="flex items-center gap-1 text-gray-400">
                  <div className="bg-[#003d71] text-white p-1 rounded-full"><CreditCard className="h-3 w-3" /></div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter">PCI DSS Compliant</span>
                </div>
              </div>
              <div className="flex items-center gap-2 grayscale opacity-50">
                <span className="text-[10px] font-bold text-gray-400">Powered by:</span>
                <div className="bg-[#00a19a] text-white px-2 py-0.5 rounded text-[8px] font-bold italic">Unlocklive</div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:w-80 flex flex-col gap-4">
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-[#f8f9fa] p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-[#4a154b]">Order Summary</h2>
            </div>
            <div className="p-6 space-y-6 flex-1">
              <div className="space-y-4">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold">Invoice to:</span>
                  <span className="text-gray-900 font-black truncate max-w-[120px]">{formData.name}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500 font-bold">Order Id:</span>
                  <span className="text-gray-900 font-black">#{nextOrderId || '...'}</span>
                </div>
                <div className="flex justify-between text-xs pt-4 border-t border-gray-100">
                  <span className="text-gray-500 font-bold">Invoice Amount:</span>
                  <span className="text-lg font-black text-[#4a154b]">{formatPrice(payableAmount)}</span>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !paymentMethod}
                className="w-full bg-[#6d2077] text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-[#5a1a63] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <span>Pay Now</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
            
            {/* Date/Time Footer */}
            <div className="bg-[#00a19a] text-white p-4 flex justify-center items-center text-[10px] font-bold divide-x divide-white/30">
              <div className="px-4 flex items-center gap-2">
                <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
              <div className="px-4 flex items-center gap-2">
                <span>{new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => navigate('/checkout', { state: checkoutData })}
            className="text-white/60 hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Shipping Details
          </button>
        </div>

      </div>
    </div>
  );
}
