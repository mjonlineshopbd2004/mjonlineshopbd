import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';

// Load firebase config manually to avoid ESM import issues with JSON
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  if (fs.existsSync(firebaseConfigPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
  } else {
    console.warn('firebase-applet-config.json not found. Using environment variables.');
    firebaseConfig = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      firestoreDatabaseId: process.env.FIREBASE_DATABASE_ID || '(default)'
    };
  }
} catch (e) {
  console.error('Error loading firebase config:', e);
}

// Explicitly set the project ID in the environment to avoid confusion with the AI Studio project
const projectId = firebaseConfig.projectId || process.env.GOOGLE_CLOUD_PROJECT;
let storageBucket = firebaseConfig.storageBucket;

// If not in config, try to derive it
if (!storageBucket && projectId) {
  // Try .firebasestorage.app first (newer) then .appspot.com (older)
  storageBucket = `${projectId}.firebasestorage.app`;
}

if (projectId) {
  process.env.GOOGLE_CLOUD_PROJECT = projectId;
  process.env.FIREBASE_CONFIG = JSON.stringify({
    projectId: projectId,
    storageBucket: storageBucket,
  });
}

// Initialize Firebase Admin
const initializeAdmin = () => {
  try {
    const apps = getApps();
    if (apps.length > 0) return apps[0];
    
    console.log('Initializing Firebase Admin for project:', projectId);
    
    // 1. Check if we have service account credentials in the environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const saString = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
        
        // Helper to parse service account JSON robustly
        const parseServiceAccount = (input: string): any => {
          if (!input) return null;
          let cleaned = input.trim();
          
          // Remove surrounding quotes
          if ((cleaned.startsWith("'") && cleaned.endsWith("'")) || 
              (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
            cleaned = cleaned.substring(1, cleaned.length - 1).trim();
          }

          // Try to find the JSON object
          const firstBrace = cleaned.indexOf('{');
          const lastBrace = cleaned.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
            cleaned = cleaned.substring(firstBrace, lastBrace + 1);
          } else if (!cleaned.startsWith('{')) {
            cleaned = '{' + cleaned + '}';
          }

          try {
            return JSON.parse(cleaned);
          } catch (e) {
            // Fix common issues
            let fixed = cleaned;
            fixed = fixed.replace(/([{,]\s*)([a-zA-Z0-9_]+)(\s*:)/g, '$1"$2"$3');
            fixed = fixed.replace(/'/g, '"');
            try {
              return JSON.parse(fixed);
            } catch (e2) {
              // Manual extraction
              const sa: any = {};
              const fields = ['type', 'project_id', 'private_key_id', 'client_email', 'client_id', 'auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 'client_x509_cert_url', 'universe_domain'];
              for (const field of fields) {
                const regex = new RegExp(`["']?${field}["']?\\s*[:=]\\s*["']?([^"'}]+)["']?`);
                const match = cleaned.match(regex);
                if (match) {
                  let val = match[1].trim();
                  if (val.endsWith(',') || val.endsWith('}')) val = val.substring(0, val.length - 1).trim();
                  if (val.endsWith('"') || val.endsWith("'")) val = val.substring(0, val.length - 1).trim();
                  sa[field] = val;
                }
              }
              const pkMatch = cleaned.match(/["']?private_key["']?\s*[:=]\s*["']?([^"']+)["']?/);
              if (pkMatch) {
                sa.private_key = pkMatch[1].replace(/\\n/g, '\n');
              }
              return (sa.project_id && sa.private_key) ? sa : null;
            }
          }
        };

        const serviceAccount = parseServiceAccount(saString);
        
        if (serviceAccount && serviceAccount.project_id && serviceAccount.private_key) {
          console.log('Initializing with FIREBASE_SERVICE_ACCOUNT env var for project:', serviceAccount.project_id);
          return initializeApp({
            credential: cert(serviceAccount),
            projectId: serviceAccount.project_id,
            storageBucket: storageBucket
          });
        } else {
          console.warn('FIREBASE_SERVICE_ACCOUNT found but could not be parsed into a valid service account object.');
        }
      } catch (e) {
        console.error('CRITICAL: Failed to process FIREBASE_SERVICE_ACCOUNT:', e);
      }
    }
    
    // 2. Check for Google Application Credentials (ADC file)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Initializing with GOOGLE_APPLICATION_CREDENTIALS file');
      return initializeApp({
        projectId: projectId,
        storageBucket: storageBucket
      });
    }
    
    // 3. Try to initialize with the project ID explicitly
    if (projectId) {
      console.log('Initializing with explicit project ID:', projectId);
      return initializeApp({
        projectId: projectId,
        storageBucket: storageBucket
      });
    }

    // 4. Final Fallback: Try default initialization
    console.log('Attempting default initialization...');
    return initializeApp();
  } catch (error: any) {
    console.error('CRITICAL: Firebase Admin initialization failed:', error);
    throw error;
  }
};

let adminApp: any;
try {
  adminApp = initializeAdmin();
} catch (e) {
  console.error('Fatal Firebase Admin Error:', e);
}

// Initialize Firestore and Auth
const dbId = firebaseConfig.firestoreDatabaseId;
console.log('Firestore Database ID to use:', dbId || '(default)');

let dbInstance: any = null;
let authInstance: any = null;
let storageInstance: any = null;

if (adminApp) {
  try {
    // Try to initialize with the named database first
    if (dbId && dbId !== '(default)') {
      try {
        console.log('Initializing Firestore with named database:', dbId);
        dbInstance = getFirestore(adminApp, dbId);
      } catch (dbError: any) {
        console.error(`Failed to initialize named database "${dbId}", falling back to default:`, dbError.message);
        dbInstance = getFirestore(adminApp);
      }
    } else {
      console.log('Initializing Firestore with default database');
      dbInstance = getFirestore(adminApp);
    }
    authInstance = getAuth(adminApp);
    storageInstance = getStorage(adminApp);
    console.log('Firestore, Auth, and Storage instances initialized successfully');
  } catch (error: any) {
    console.error('Failed to initialize Firestore/Auth/Storage:', error.message);
    try {
      // Final fallback to default database
      dbInstance = getFirestore(adminApp);
      authInstance = getAuth(adminApp);
      storageInstance = getStorage(adminApp);
    } catch (f) {
      console.error('Final fallback failed:', f);
    }
  }
}

// Error handling for Firestore operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export const handleFirestoreError = (error: any, operationType: OperationType, path: string | null) => {
  const errInfo = {
    error: error.message || String(error),
    code: error.code,
    operationType,
    path,
    projectId: projectId,
    databaseId: dbId || '(default)',
    hasServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT
  };
  
  console.error('Firestore Error Details:', JSON.stringify(errInfo, null, 2));
  
  if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
    const fixInstructions = `
      HOW TO FIX PERMISSION_DENIED:
      1. Go to Google Cloud Console: https://console.cloud.google.com/iam-admin/iam?project=${projectId}
      2. Find the Service Account: ${process.env.FIREBASE_SERVICE_ACCOUNT ? 'The one you provided in settings' : 'The default compute service account'}
      3. Add the role: "Firebase Admin" or "Cloud Datastore User"
      4. Ensure you are using the correct Database ID: ${dbId || '(default)'}
    `;
    console.error(fixInstructions);
    throw new Error(`Firebase Permission Denied for project ${projectId}. Please check IAM roles in Google Cloud Console.`);
  }
  
  throw error;
};

export const getDb = () => {
  if (!dbInstance) {
    throw new Error('Firestore is not initialized. Check server logs for Firebase Admin errors.');
  }
  return dbInstance;
};

// Helper to test if we can actually read from Firestore
export const testFirestoreConnection = async () => {
  try {
    const db = getDb();
    console.log('Testing Firestore connection to database:', dbId || '(default)');
    // Try to read a non-existent doc just to check permissions
    const docRef = db.collection('_health_check_').doc('ping');
    await docRef.get();
    return { 
      success: true, 
      projectId, 
      databaseId: dbId || '(default)',
      usingServiceAccount: !!process.env.FIREBASE_SERVICE_ACCOUNT
    };
  } catch (error: any) {
    console.error('Firestore connection test failed:', error.message);
    return { 
      success: false, 
      error: error.message, 
      code: error.code,
      projectId,
      databaseId: dbId || '(default)',
      details: 'If code is 7, check if your Service Account has permissions for this specific database.'
    };
  }
};

export const getAuthInstance = () => {
  if (!authInstance) {
    throw new Error('Firebase Auth is not initialized. Check server logs for Firebase Admin errors.');
  }
  return authInstance;
};

export const getStorageInstance = () => {
  if (!storageInstance) {
    throw new Error('Firebase Storage is not initialized. Check server logs for Firebase Admin errors.');
  }
  return storageInstance;
};

// Keep these for backward compatibility but they might be null if init failed
export const db = dbInstance;
export const auth = authInstance;
export const storage = storageInstance;
