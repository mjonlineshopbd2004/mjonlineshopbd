import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, User, Phone, LogIn, UserPlus, Chrome, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSettings } from '../contexts/SettingsContext';
import { cn, getProxyUrl } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthModal() {
  const { isAuthModalOpen, setAuthModalOpen, loginWithGoogle, loginWithEmail, checkEmail, sendEmailOTP, verifyEmailOTP, verifyRegister, resetPassword, isLoggingIn } = useAuth();
  const { settings } = useSettings();
  const [logoError, setLogoError] = useState(false);
  
  const [step, setStep] = useState<'email' | 'password' | 'register' | 'forgot'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleAccount, setIsGoogleAccount] = useState(false);

  useEffect(() => {
    if (!isAuthModalOpen) {
      setStep('email');
      setEmail('');
      setPassword('');
      setOtpCode('');
      setName('');
      setPhone('');
      setIsGoogleAccount(false);
    }
  }, [isAuthModalOpen]);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    try {
      const result = await checkEmail(email);
      if (result.exists) {
        setIsGoogleAccount(result.method === 'google');
        setStep('password');
      } else {
        await sendEmailOTP(email);
        setStep('register');
      }
    } catch (error) {
      console.error('Email submit error:', error);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await loginWithEmail(email, password);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await verifyRegister({
      email,
      code: otpCode,
      password,
      phone,
      name
    });
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await resetPassword({
      email,
      code: otpCode,
      newPassword: password
    });
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl relative border-[1px] border-dashed border-gray-400"
          >
            {/* Close Button */}
            <button
              onClick={() => setAuthModalOpen(false)}
              className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <X className="h-5 w-5 text-gray-400" />
            </button>

            <div className="p-6 md:p-8">
              {/* Logo */}
              <div className="flex justify-center mb-6">
                {settings.logoUrl && !logoError ? (
                  <img 
                    src={getProxyUrl(settings.logoUrl)} 
                    alt="Logo" 
                    className="h-16 object-contain" 
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <div className="h-16 w-16 bg-primary rounded-full flex items-center justify-center text-white font-black text-2xl">
                    {settings.storeName.charAt(0)}
                  </div>
                )}
              </div>

              {/* Step 1: Email Input */}
              {step === 'email' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-6">
                    <p className="text-gray-600 text-sm font-medium leading-relaxed">
                      এখানে আপনার মোবাইল নাম্বার অথবা ইমেইল দিয়ে লগিন করুন
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div className="h-[1px] bg-gray-200 flex-grow"></div>
                      <span className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                        Email Address
                      </span>
                      <div className="h-[1px] bg-gray-200 flex-grow"></div>
                    </div>
                  </div>

                  <form onSubmit={handleEmailSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">ইমেইল</label>
                      <input
                        type="email"
                        placeholder="আপনার ইমেইল দিন"
                        required
                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.toLowerCase().trim())}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#d2235e] text-white py-3.5 rounded-xl font-bold text-base shadow-md hover:opacity-90 transition-all"
                    >
                      {isLoggingIn ? 'প্রসেসিং...' : 'সাবমিট করুন'}
                    </button>
                  </form>

                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-100"></div>
                    </div>
                    <div className="relative flex justify-center text-[10px]">
                      <span className="px-3 bg-white text-gray-400 font-bold uppercase tracking-widest">অথবা</span>
                    </div>
                  </div>

                  <button
                    onClick={loginWithGoogle}
                    disabled={isLoggingIn}
                    className="w-full bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold text-sm flex items-center justify-center space-x-3 hover:border-primary hover:text-primary transition-all"
                  >
                    <Chrome className="h-4 w-4" />
                    <span>গুগল দিয়ে লগিন</span>
                  </button>
                </motion.div>
              )}

              {/* Step 2: Password Input (Existing User) */}
              {step === 'password' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-6">
                    <p className="text-gray-600 text-sm font-medium">আপনার পাসওয়ার্ড দিয়ে লগিন করুন</p>
                    {isGoogleAccount && (
                      <p className="mt-2 text-xs font-bold text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                        এই অ্যাকাউন্টটি গুগল দিয়ে তৈরি করা হয়েছে। আপনি গুগল দিয়ে লগিন করতে পারেন অথবা "Forgot Password" ব্যবহার করে পাসওয়ার্ড সেট করতে পারেন।
                      </p>
                    )}
                  </div>

                  <form onSubmit={handleLoginSubmit} className="space-y-5">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">ইমেইল</label>
                      <input
                        type="email"
                        readOnly
                        className="w-full bg-blue-50 border border-blue-100 rounded-xl py-3.5 px-4 outline-none font-medium text-sm text-gray-600"
                        value={email}
                      />
                    </div>

                    {!isGoogleAccount && (
                      <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-900 ml-1">পাসওয়ার্ড</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            placeholder="পাসওয়ার্ড দিন"
                            required
                            className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                          >
                            {showPassword ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center px-1">
                      <button
                        type="button"
                        onClick={() => setStep('forgot')}
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-xs font-bold text-gray-400 hover:text-primary"
                      >
                        Change Email?
                      </button>
                    </div>

                    {isGoogleAccount ? (
                      <button
                        type="button"
                        onClick={loginWithGoogle}
                        disabled={isLoggingIn}
                        className="w-full bg-white border border-gray-200 text-gray-700 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center space-x-3 hover:border-primary hover:text-primary transition-all shadow-sm"
                      >
                        <Chrome className="h-4 w-4" />
                        <span>গুগল দিয়ে লগিন করুন</span>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="w-full bg-[#d2235e] text-white py-3.5 rounded-xl font-bold text-base shadow-md hover:opacity-90 transition-all"
                      >
                        {isLoggingIn ? 'লগিন হচ্ছে...' : 'লগিন করুন'}
                      </button>
                    )}
                  </form>
                </motion.div>
              )}

              {/* Step 3: Register Form (New User) */}
              {step === 'register' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-6">
                    <p className="text-gray-600 text-[11px] font-medium leading-relaxed">
                      E-Mail এ প্রাপ্ত ৬-সংখ্যার কোডটি প্রবেশ করান এবং পাসওয়ার্ড সেট করুন। পরবর্তীতে ব্যবহারের জন্য পাসওয়ার্ডটি সংরক্ষণ করুন।
                    </p>
                  </div>

                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">ইমেইল</label>
                      <input
                        type="email"
                        readOnly
                        className="w-full bg-blue-50 border border-blue-100 rounded-xl py-3.5 px-4 outline-none font-medium text-sm text-gray-600"
                        value={email}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">আপনার নাম</label>
                      <input
                        type="text"
                        placeholder="আপনার নাম দিন"
                        required
                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">OTP</label>
                      <input
                        type="text"
                        placeholder="OTP দিন"
                        required
                        maxLength={6}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">পাসওয়ার্ড (পরবর্তীতে ব্যবহারের জন্য)</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="পাসওয়ার্ড দিন"
                          required
                          className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                        >
                          {showPassword ? <ShieldCheck className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">মোবাইল নম্বর</label>
                      <input
                        type="tel"
                        placeholder="মোবাইল নম্বর দিন"
                        required
                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="text-right">
                      <button
                        type="button"
                        onClick={() => setStep('email')}
                        className="text-xs font-bold text-[#d2235e] hover:underline"
                      >
                        Change Email?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#d2235e] text-white py-3.5 rounded-xl font-bold text-base shadow-md hover:opacity-90 transition-all"
                    >
                      {isLoggingIn ? 'প্রসেসিং...' : 'সাবমিট করুন'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* Step 4: Forgot Password */}
              {step === 'forgot' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="text-center mb-6">
                    <p className="text-gray-600 text-sm font-medium">পাসওয়ার্ড রিসেট করুন</p>
                  </div>

                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">ইমেইল</label>
                      <input
                        type="email"
                        readOnly
                        className="w-full bg-blue-50 border border-blue-100 rounded-xl py-3.5 px-4 outline-none font-medium text-sm text-gray-600"
                        value={email}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">OTP</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="OTP দিন"
                          className="flex-grow bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value)}
                        />
                        <button
                          type="button"
                          onClick={() => sendEmailOTP(email, true)}
                          disabled={isLoggingIn}
                          className="bg-gray-100 px-4 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                          {isLoggingIn ? 'Sending...' : 'Send OTP'}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-bold text-gray-900 ml-1">নতুন পাসওয়ার্ড</label>
                      <input
                        type="password"
                        placeholder="নতুন পাসওয়ার্ড দিন"
                        required
                        className="w-full bg-gray-50 border border-gray-200 focus:border-primary focus:bg-white rounded-xl py-3.5 px-4 outline-none transition-all font-medium text-sm"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setStep('password')}
                        className="text-xs font-bold text-gray-400 hover:text-primary"
                      >
                        Back to Login
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoggingIn}
                      className="w-full bg-[#d2235e] text-white py-3.5 rounded-xl font-bold text-base shadow-md hover:opacity-90 transition-all"
                    >
                      {isLoggingIn ? 'প্রসেসিং...' : 'পাসওয়ার্ড রিসেট করুন'}
                    </button>
                  </form>
                </motion.div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
