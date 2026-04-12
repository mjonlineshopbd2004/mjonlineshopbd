import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithCustomToken,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile } from '../types';

import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isLoggingIn: boolean;
  isAuthModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  checkEmail: (email: string) => Promise<{ exists: boolean }>;
  sendEmailOTP: (email: string, isForgotPassword?: boolean) => Promise<void>;
  verifyEmailOTP: (email: string, otp: string) => Promise<boolean>;
  verifyRegister: (data: { email: string; code: string; password: string; phone: string; name: string }) => Promise<void>;
  resetPassword: (data: { email: string; code: string; newPassword: string }) => Promise<void>;
  sendPhoneOTP: (phoneNumber: string) => Promise<void>;
  verifyPhoneOTP: (otp: string, userData?: { name: string; email: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string, name: string, phone: string) => Promise<void>;
  updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [simulatedOTP, setSimulatedOTP] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setProfile(userDoc.data() as UserProfile);
          } else {
            // This part is mainly for Google Login or if profile creation failed during signup
            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              role: user.email === 'mjonlineshopbd@gmail.com' ? 'admin' : 'customer',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', user.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching/creating user profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (isLoggingIn) return;
    
    setIsLoggingIn(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Logged in successfully!');
      setAuthModalOpen(false);
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        console.log('Login popup was closed or cancelled.');
      } else {
        console.error('Google login error details:', {
          code: error.code,
          message: error.message
        });
        if (error.code === 'auth/unauthorized-domain') {
          toast.error('This domain is not authorized for Google Login. Please add it to the "Authorized domains" list in the Firebase Console.');
        } else {
          toast.error('Failed to login with Google.');
        }
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const checkEmail = async (email: string) => {
    try {
      const response = await fetch('/api/auth/check-email', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      return await response.json();
    } catch (error) {
      console.error('Error checking email:', error);
      return { exists: false };
    }
  };

  const sendEmailOTP = async (email: string, isForgotPassword = false) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, isForgotPassword })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to send OTP');
      
      if (data.code) {
        toast.info(`Demo OTP Code: ${data.code}`, {
          description: `এটি একটি ডেমো। প্রোডাকশনে এই কোডটি ${email} নাম্বারে ইমেইল যাবে।`,
          duration: 10000,
        });
      }

      toast.success('OTP sent to your email!');
    } catch (error: any) {
      console.error('Error sending email OTP:', error);
      toast.error(error.message || 'Failed to send OTP.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifyEmailOTP = async (email: string, otp: string) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, code: otp })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to verify OTP');
      
      return true;
    } catch (error: any) {
      console.error('Error verifying email OTP:', error);
      toast.error(error.message || 'Invalid OTP code. Please try again.');
      return false;
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifyRegister = async (data: { email: string; code: string; password: string; phone: string; name: string }) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/verify-register', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || 'Failed to register');
      
      if (resData.customToken) {
        await signInWithCustomToken(auth, resData.customToken);
        toast.success('Account created and logged in!');
        setAuthModalOpen(false);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to complete registration.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const resetPassword = async (data: { email: string; code: string; newPassword: string }) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const resData = await response.json();
      if (!response.ok) throw new Error(resData.message || 'Failed to reset password');
      
      toast.success('Password reset successfully! Please login.');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reset password.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const setupRecaptcha = (containerId: string) => {
    if ((window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier.clear();
    }
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      'size': 'invisible',
      'callback': () => {
        // reCAPTCHA solved, allow signInWithPhoneNumber.
      }
    });
  };

  const sendPhoneOTP = async (phoneNumber: string) => {
    setIsLoggingIn(true);
    try {
      // Simulation mode to avoid billing-not-enabled error
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setSimulatedOTP(otp);
      
      console.log(`[DEMO ONLY] OTP for ${phoneNumber}: ${otp}`);
      toast.info(`Demo OTP Code: ${otp}`, {
        description: `এটি একটি ডেমো। প্রোডাকশনে এই কোডটি ${phoneNumber} নাম্বারে SMS যাবে।`,
        duration: 10000,
      });
      
      // Mock confirmation result for simulation
      setConfirmationResult({
        confirm: async (code: string) => {
          if (code === otp) {
            // Return a mock user object
            return {
              user: {
                uid: `demo_${phoneNumber.replace(/\D/g, '')}`,
                phoneNumber: phoneNumber,
                displayName: '',
                email: ''
              }
            };
          } else {
            throw new Error('Invalid OTP');
          }
        }
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('OTP sent! (Check the notification above)');
    } catch (error: any) {
      console.error('Error sending phone OTP:', error);
      toast.error('Failed to send OTP.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const verifyPhoneOTP = async (otp: string, userData?: { name: string; email: string }) => {
    if (!confirmationResult) return;
    setIsLoggingIn(true);
    try {
      const result = await confirmationResult.confirm(otp);
      const user = result.user;
      
      // Check if profile exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists() && userData) {
        const newProfile: UserProfile = {
          uid: user.uid,
          email: userData.email,
          displayName: userData.name,
          phone: user.phoneNumber || '',
          role: userData.email === 'mjonlineshopbd@gmail.com' ? 'admin' : 'customer',
          createdAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'users', user.uid), newProfile);
        setProfile(newProfile);
        await updateProfile(user, { displayName: userData.name });
      }
      
      toast.success('Logged in successfully!');
      setAuthModalOpen(false);
      setConfirmationResult(null);
    } catch (error: any) {
      console.error('Error verifying OTP:', error);
      toast.error('Invalid OTP code. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email, password: pass })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Invalid email or password');
      
      // If the backend returns a customToken, use it to sign in with Firebase
      if (data.customToken) {
        await signInWithCustomToken(auth, data.customToken);
      } else if (data.token) {
        // Fallback or handle JWT if needed, but customToken is preferred for Firebase Auth
        // For now, let's assume we need customToken for Firebase Auth state
        toast.error('Server did not return a valid authentication token.');
        return;
      }

      toast.success('Logged in successfully!');
      setAuthModalOpen(false);
    } catch (error: any) {
      console.error('Email login error:', error);
      toast.error(error.message || 'Failed to login. Please check your credentials.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const signupWithEmail = async (email: string, pass: string, name: string, phone: string) => {
    setIsLoggingIn(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: name });

      const newProfile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        displayName: name,
        photoURL: '',
        phone: phone,
        role: user.email === 'mjonlineshopbd@gmail.com' ? 'admin' : 'customer',
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, 'users', user.uid), newProfile);
      setProfile(newProfile);
      
      toast.success('Account created successfully!');
      setAuthModalOpen(false);
    } catch (error: any) {
      console.error('Signup error details:', {
        code: error.code,
        message: error.message,
        email: email
      });
      if (error.code === 'auth/operation-not-allowed') {
        toast.error('Email/Password signup is not enabled in Firebase. Please enable it in the Firebase Console under Authentication > Sign-in method.');
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error('This email is already in use. Please try logging in.');
      } else if (error.code === 'auth/weak-password') {
        toast.error('Password is too weak. Please use at least 6 characters.');
      } else {
        toast.error(error.message || 'Failed to create account.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Logged out successfully!');
    } catch (error) {
      console.error("Logout error:", error);
      toast.error('Failed to logout.');
    }
  };

  const updateUserProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { ...profile, ...data }, { merge: true });
      setProfile(prev => prev ? { ...prev, ...data } : null);
      
      if (data.displayName) {
        await updateProfile(user, { displayName: data.displayName });
      }
      
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error('Failed to update profile.');
      throw error;
    }
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      isAdmin, 
      isLoggingIn, 
      isAuthModalOpen, 
      setAuthModalOpen,
      checkEmail,
      sendEmailOTP,
      verifyEmailOTP,
      verifyRegister,
      resetPassword,
      sendPhoneOTP,
      verifyPhoneOTP,
      loginWithGoogle, 
      loginWithEmail,
      signupWithEmail,
      updateUserProfile,
      logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
