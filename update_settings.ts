import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

async function updateSettings() {
  try {
    const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf8'));
    const projectId = firebaseConfig.projectId;
    const dbId = firebaseConfig.firestoreDatabaseId;

    let sa: any;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
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
            const extracted: any = {};
            const fields = ['type', 'project_id', 'private_key_id', 'client_email', 'client_id', 'auth_uri', 'token_uri', 'auth_provider_x509_cert_url', 'client_x509_cert_url', 'universe_domain'];
            for (const field of fields) {
              const regex = new RegExp(`["']?${field}["']?\\s*[:=]\\s*["']?([^"'}]+)["']?`);
              const match = cleaned.match(regex);
              if (match) {
                let val = match[1].trim();
                if (val.endsWith(',') || val.endsWith('}')) val = val.substring(0, val.length - 1).trim();
                if (val.endsWith('"') || val.endsWith("'")) val = val.substring(0, val.length - 1).trim();
                extracted[field] = val;
              }
            }
            const pkMatch = cleaned.match(/["']?private_key["']?\s*[:=]\s*["']?([^"']+)["']?/);
            if (pkMatch) {
              extracted.private_key = pkMatch[1].replace(/\\n/g, '\n');
            }
            return (extracted.project_id && extracted.private_key) ? extracted : null;
          }
        }
      };

      sa = parseServiceAccount(saString);
    }

    if (!sa || !sa.project_id) {
      console.error('Could not extract valid service account');
      return;
    }

    const app = initializeApp({
      credential: cert(sa),
      projectId: sa.project_id
    });

    const db = getFirestore(app, dbId);
    
    const updateData: any = {
      spreadsheetId: '1ihR-xQdpIbRVxUJC1QxnBuBshFETto5QrKjYqsUwRl8',
      driveFolderId: '16cRDXRxmz4Pg-bsr_YiVGTa9C6ByD4JZ',
      enabled: true,
      updatedAt: new Date().toISOString()
    };

    // Also save the credentials to Firestore so the app can use them
    if (sa.client_email) updateData.clientEmail = sa.client_email;
    if (sa.private_key) updateData.privateKey = sa.private_key;

    // Update named database
    console.log('Updating named database:', dbId);
    const dbNamed = getFirestore(app, dbId);
    await dbNamed.collection('settings').doc('googleSheet').set(updateData, { merge: true });

    // Update default database as fallback
    try {
      console.log('Updating default database...');
      const dbDefault = getFirestore(app);
      await dbDefault.collection('settings').doc('googleSheet').set(updateData, { merge: true });
    } catch (e) {
      console.warn('Failed to update default database (might not exist or no permission):', e.message);
    }

    console.log('Settings updated successfully in both databases');
  } catch (error) {
    console.error('Error updating settings:', error);
  }
}

updateSettings();
