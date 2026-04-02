import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

// Load firebase config manually to avoid ESM import issues with JSON
const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));

// Explicitly set the project ID in the environment to avoid confusion with the AI Studio project
// But only if it's not already set, to avoid overwriting the correct project ID in remixed apps
const currentProjectId = process.env.GOOGLE_CLOUD_PROJECT;
const configProjectId = firebaseConfig.projectId;
const isRemix = currentProjectId && configProjectId && currentProjectId !== configProjectId;

if (isRemix) {
  console.warn(`REMIX DETECTED: Environment project (${currentProjectId}) does not match config project (${configProjectId}).`);
}

if (!process.env.GOOGLE_CLOUD_PROJECT) {
  process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;
} else {
  console.log('Using existing GOOGLE_CLOUD_PROJECT from environment:', process.env.GOOGLE_CLOUD_PROJECT);
}

process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId,
  storageBucket: `${process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId}.appspot.com`,
});

// Initialize Firebase Admin
const initializeAdmin = () => {
  try {
    const apps = getApps();
    if (apps.length > 0) return apps[0];
    
    console.log('Initializing Firebase Admin...');
    
    // 0. Try default initialization first (Best for Cloud Run/Ambient ADC)
    // This is the most reliable way in the AI Studio environment
    try {
      console.log('Attempting default initialization (Ambient ADC)...');
      // We don't pass any options, let it use the environment
      return initializeApp();
    } catch (e) {
      console.log('Default initialization failed, trying alternatives...');
    }
    
    // 1. Check if we have service account credentials in the environment
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('Initializing with FIREBASE_SERVICE_ACCOUNT env var');
        return initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id
        });
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT as JSON:', e);
      }
    }
    
    // 2. Check for Google Application Credentials (ADC file)
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      console.log('Initializing with GOOGLE_APPLICATION_CREDENTIALS');
      return initializeApp();
    }
    
    // 3. Fallback: Try to initialize with the project ID from environment or config
    const projectId = process.env.GOOGLE_CLOUD_PROJECT || firebaseConfig.projectId;
    if (projectId) {
      console.log('Initializing with project ID (Explicit):', projectId);
      return initializeApp({
        projectId: projectId,
      });
    }

    console.log('Initializing with default config (Final Fallback)');
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
let dbId = firebaseConfig.firestoreDatabaseId;

if (isRemix && dbId && dbId !== '(default)') {
  console.warn(`Ignoring potentially stale firestoreDatabaseId "${dbId}" from config due to remix. Falling back to default database.`);
  dbId = '(default)';
}

console.log('Firestore Database ID to use:', dbId || '(default)');

let dbInstance: any = null;
let authInstance: any = null;

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
    console.log('Firestore and Auth instances initialized successfully');
  } catch (error: any) {
    console.error('Failed to initialize Firestore/Auth:', error.message);
    try {
      // Final fallback to default database
      dbInstance = getFirestore(adminApp);
      authInstance = getAuth(adminApp);
    } catch (f) {
      console.error('Final fallback failed:', f);
    }
  }
}

export const getDb = () => {
  if (!dbInstance) {
    throw new Error('Firestore is not initialized. Check server logs for Firebase Admin errors.');
  }
  return dbInstance;
};

export const getAuthInstance = () => {
  if (!authInstance) {
    throw new Error('Firebase Auth is not initialized. Check server logs for Firebase Admin errors.');
  }
  return authInstance;
};

// Keep these for backward compatibility but they might be null if init failed
export const db = dbInstance;
export const auth = authInstance;
