import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import { getDb, handleFirestoreError, OperationType } from '../config/firebase';
import { UserProfile } from '../models/types';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
const resend = new Resend(process.env.RESEND_API_KEY);

export const sendOTP = async (req: Request, res: Response) => {
  const { email: rawEmail, isForgotPassword } = req.body;

  if (!rawEmail) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    const db = getDb();
    
    // Check if user exists for forgot password flow
    if (isForgotPassword) {
      const userSnapshot = await db.collection('users').where('email', '==', email).get();
      if (userSnapshot.empty) {
        return res.status(404).json({ message: 'User not found with this email' });
      }
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store OTP in Firestore
    try {
      await db.collection('otps').doc(email).set({
        code: otpCode,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      });
    } catch (dbError: any) {
      handleFirestoreError(dbError, OperationType.WRITE, `otps/${email}`);
    }

    if (process.env.RESEND_API_KEY) {
      console.log('Attempting to send OTP email via Resend...');
      console.log('Resend API Key starts with:', process.env.RESEND_API_KEY.substring(0, 3));
      try {
        const fromEmail = 'MJ SHOP <otp@mjonlineshopbd.pro.bd>';
        console.log('Sending from:', fromEmail);
        const data = await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: isForgotPassword ? 'Password Reset OTP - MJ SHOP' : 'Your Login OTP Code - MJ SHOP',
          html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f6; padding: 40px 20px; color: #333;">
              <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); padding: 30px; text-align: center;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; letter-spacing: 1px; text-transform: uppercase;">MJ ONLINE SHOP BD</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px; text-align: center;">
                  <h2 style="color: #1f2937; margin-bottom: 10px; font-size: 22px;">${isForgotPassword ? 'পাসওয়ার্ড রিসেট কোড' : 'আপনার লগইন কোড'}</h2>
                  <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">আপনার অ্যাকাউন্টে ${isForgotPassword ? 'পাসওয়ার্ড রিসেট' : 'লগইন'} করার জন্য নিচের ৬ ডিজিটের OTP কোডটি ব্যবহার করুন।</p>
                  
                  <div style="margin: 30px 0; padding: 20px; background-color: #fff7ed; border: 2px dashed #fdba74; border-radius: 12px; display: inline-block;">
                    <span style="font-size: 42px; font-weight: 800; letter-spacing: 8px; color: #ea580c; font-family: monospace;">${otpCode}</span>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">নিরাপত্তার স্বার্থে এই কোডটি কাউকে শেয়ার করবেন না। এটি ১০ মিনিটের জন্য কার্যকর থাকবে।</p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #f3f4f6;">
                  <p style="color: #9ca3af; font-size: 12px; margin: 0;">&copy; 2026 MJ ONLINE SHOP BD. All rights reserved.</p>
                </div>
              </div>
            </div>
          `
        });

        if (data.error) {
          console.error('Resend API Error:', data.error);
          return res.json({ 
            message: 'OTP generated (Demo Mode - Resend Error)', 
            code: otpCode,
            debug: data.error
          });
        }

        console.log('OTP Email sent successfully via Resend');
        res.json({ message: 'OTP sent successfully' });
      } catch (emailError: any) {
        console.error('Resend connection error:', emailError);
        res.json({ 
          message: 'OTP generated (Demo Mode - Connection Error)', 
          code: otpCode,
          debug: emailError.message
        });
      }
    } else {
      res.json({ message: 'OTP generated (Demo Mode)', code: otpCode });
    }
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ message: 'Failed to send OTP' });
  }
};

export const verifyOTPAndRegister = async (req: Request, res: Response) => {
  const { email: rawEmail, code, password, phone, name } = req.body;

  if (!rawEmail || !code || !password) {
    return res.status(400).json({ message: 'Email, code, and password are required' });
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    const db = getDb();
    const otpDoc = await db.collection('otps').doc(email).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const otpData = otpDoc.data();
    if (otpData?.code !== code) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Delete OTP after successful verification
    await db.collection('otps').doc(email).delete();

    // Check if user already exists
    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    let finalUser: any = null;

    if (!userSnapshot.empty) {
      const existingUserDoc = userSnapshot.docs[0];
      const existingUserData = existingUserDoc.data() as UserProfile;
      
      // If user exists but has no password (Google login), allow setting it
      if (!existingUserData.password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const updatedData = {
          password: hashedPassword,
          phone: phone || existingUserData.phone || '',
          displayName: name || existingUserData.displayName || email.split('@')[0]
        };
        await existingUserDoc.ref.update(updatedData);
        finalUser = { ...existingUserData, ...updatedData };
      } else {
        return res.status(400).json({ message: 'User already exists. Please login.' });
      }
    } else {
      // Create new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser: UserProfile = {
        uid: db.collection('users').doc().id,
        email,
        password: hashedPassword,
        displayName: name || email.split('@')[0],
        phone: phone || '',
        role: email === 'mjonlineshopbd@gmail.com' ? 'admin' : 'customer',
        createdAt: new Date().toISOString(),
      };

      await db.collection('users').doc(newUser.uid).set(newUser);
      finalUser = newUser;
    }

    // Create Firebase Custom Token for the user
    const { getAuthInstance } = await import('../config/firebase');
    const adminAuth = getAuthInstance();
    const customToken = await adminAuth.createCustomToken(finalUser.uid, {
      role: finalUser.role,
      email: finalUser.email
    });

    const { password: _, ...userWithoutPassword } = finalUser;
    res.status(201).json({ user: userWithoutPassword, customToken });
  } catch (error) {
    console.error('Verify OTP and Register error:', error);
    res.status(500).json({ message: 'Failed to complete registration' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  const { email: rawEmail, code, newPassword } = req.body;

  if (!rawEmail || !code || !newPassword) {
    return res.status(400).json({ message: 'Email, code, and new password are required' });
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    const db = getDb();
    const otpDoc = await db.collection('otps').doc(email).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const otpData = otpDoc.data();
    if (otpData?.code !== code) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    // Delete OTP
    await db.collection('otps').doc(email).delete();

    // Update user password
    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    if (userSnapshot.empty) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userDoc = userSnapshot.docs[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await db.collection('users').doc(userDoc.id).update({
      password: hashedPassword
    });

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
};

export const checkEmail = async (req: Request, res: Response) => {
  const { email: rawEmail } = req.body;
  if (!rawEmail) return res.status(400).json({ message: 'Email is required' });

  const email = rawEmail.toLowerCase().trim();

  try {
    const db = getDb();
    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    
    if (userSnapshot.empty) {
      return res.json({ exists: false });
    }

    const userData = userSnapshot.docs[0].data();
    res.json({ 
      exists: true, 
      hasPassword: !!userData.password,
      method: userData.password ? 'password' : 'google'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking email' });
  }
};

export const verifyOTP = async (req: Request, res: Response) => {
  const { email: rawEmail, code } = req.body;

  if (!rawEmail || !code) {
    return res.status(400).json({ message: 'Email and code are required' });
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    const db = getDb();
    const otpDoc = await db.collection('otps').doc(email).get();

    if (!otpDoc.exists) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    const otpData = otpDoc.data();
    if (otpData?.code !== code) {
      return res.status(400).json({ message: 'Invalid OTP code' });
    }

    if (new Date(otpData.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'OTP has expired' });
    }

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ message: 'Failed to verify OTP' });
  }
};

export const registerUser = async (req: Request, res: Response) => {
  const { name, email: rawEmail, password, phone, address } = req.body;

  if (!name || !rawEmail || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    const db = getDb();
    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    if (!userSnapshot.empty) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser: UserProfile = {
      uid: db.collection('users').doc().id,
      email,
      password: hashedPassword,
      displayName: name,
      phone,
      address,
      role: email === 'mjonlineshopbd@gmail.com' ? 'admin' : 'customer',
      createdAt: new Date().toISOString(),
    };

    await db.collection('users').doc(newUser.uid).set(newUser);

    const token = jwt.sign({ uid: newUser.uid, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { email: rawEmail, password } = req.body;

  if (!rawEmail || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const email = rawEmail.toLowerCase().trim();

  try {
    const db = getDb();
    console.log(`Login attempt for email: ${email}`);
    const userSnapshot = await db.collection('users').where('email', '==', email).get();
    
    if (userSnapshot.empty) {
      console.log(`User not found in Firestore: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const userDoc = userSnapshot.docs[0];
    const userData = userDoc.data() as UserProfile;

    if (!userData.password) {
      console.log(`User found but has no password field (likely Google login): ${email}`);
      return res.status(401).json({ message: 'This account was created with Google. Please use Google Login or "Forgot Password" to set a password.' });
    }

    const isMatch = await bcrypt.compare(password, userData.password);
    if (!isMatch) {
      console.log(`Password mismatch for user: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log(`Login successful for user: ${email}`);
    // Create Firebase Custom Token for the user
    const { getAuthInstance } = await import('../config/firebase');
    const adminAuth = getAuthInstance();
    const customToken = await adminAuth.createCustomToken(userData.uid, {
      role: userData.role,
      email: userData.email
    });

    const { password: _, ...userWithoutPassword } = userData;
    res.json({ user: userWithoutPassword, customToken });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getProfile = async (req: any, res: Response) => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = userDoc.data() as UserProfile;
    res.json(userWithoutPassword);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
