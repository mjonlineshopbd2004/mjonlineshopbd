import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';
import firebaseConfig from '../../firebase-applet-config.json';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    role: string;
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify the ID token first
    console.log('Verifying token for project:', firebaseConfig.projectId);
    console.log('Auth service project ID:', (auth as any).app?.options?.projectId);
    
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (verifyError: any) {
      console.error('Token verification failed details:', verifyError);
      if (verifyError.code === 'auth/argument-error' || verifyError.message?.includes('audience')) {
        console.error('AUDIENCE MISMATCH DETECTED. Expected:', firebaseConfig.projectId);
      }
      throw verifyError;
    }
    
    console.log('Token verified successfully for user:', decodedToken.uid);
    
    let role = 'customer';
    
    // Check primary admin email BEFORE calling Firestore to avoid unnecessary permission errors
    if (decodedToken.email === 'mjonlineshopbd@gmail.com') {
      role = 'admin';
      console.log('Auto-granting admin role to primary admin email:', decodedToken.email);
    } else {
      // Try to get user role from Firestore for other users
      try {
        const userDoc = await db.collection('users').doc(decodedToken.uid).get();
        if (userDoc.exists) {
          role = userDoc.data()?.role || 'customer';
        }
      } catch (firestoreError: any) {
        console.warn('Firestore role fetch failed with primary DB:', firestoreError.message);
        
        try {
          // Fallback to default database if primary fails
          const { getFirestore: getAdminFirestore } = await import('firebase-admin/firestore');
          const defaultDb = getAdminFirestore();
          const userDoc = await defaultDb.collection('users').doc(decodedToken.uid).get();
          if (userDoc.exists) {
            role = userDoc.data()?.role || 'customer';
          }
        } catch (fallbackError: any) {
          console.error('Firestore role fetch failed on both DBs:', fallbackError.message);
        }
      }
    }
    
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      role: role
    };
    
    next();
  } catch (error: any) {
    console.error('Auth verification failed:', error.message);
    return res.status(401).json({ 
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

export const authorize = (roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  };
};
