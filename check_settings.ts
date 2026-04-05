import { getDb } from './backend/config/firebase';
import * as dotenv from 'dotenv';
dotenv.config();

async function checkSettings() {
  try {
    const db = getDb();
    const doc = await db.collection('settings').doc('googleSheet').get();
    if (doc.exists) {
      console.log('Current Settings:', JSON.stringify(doc.data(), null, 2));
    } else {
      console.log('Settings doc not found');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

checkSettings();
