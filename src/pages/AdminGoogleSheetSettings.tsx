import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Save, FileSpreadsheet, AlertCircle, CheckCircle2, Loader2, RefreshCw, Copy, ExternalLink, HelpCircle, ShieldCheck, Image as ImageIcon, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import Modal from '../components/Modal';

interface GoogleSheetSettings {
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
  driveFolderId: string;
  enabled: boolean;
}

const AdminGoogleSheetSettings: React.FC = () => {
  const [settings, setSettings] = useState<GoogleSheetSettings>({
    spreadsheetId: '',
    clientEmail: '',
    privateKey: '',
    driveFolderId: '',
    enabled: false
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testingDrive, setTestingDrive] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [helpModal, setHelpModal] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const settingsRef = doc(db, 'settings', 'googleSheet');
      const settingsDoc = await getDoc(settingsRef);
      if (settingsDoc.exists()) {
        setSettings(settingsDoc.data() as GoogleSheetSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    if (!settings.spreadsheetId || !settings.clientEmail || !settings.privateKey) {
      toast.error('Please provide all credentials before testing');
      return;
    }

    setTesting(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/settings/google-sheet/test', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      if (response.ok) {
        toast.success('Connection successful! A test row has been added to the "Orders" sheet.');
      } else {
        const contentType = response.headers.get('content-type');
        let data: any;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          const text = await response.text();
          console.error('Non-JSON response from test connection:', text);
          throw new Error(text.substring(0, 100) || `Server returned ${response.status} ${response.statusText}`);
        }
        
        throw new Error(data.message || 'Connection failed');
      }
    } catch (error: any) {
      console.error('Test connection error:', error);
      toast.error(`Connection failed: ${error.message}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSyncProducts = async () => {
    if (!settings.spreadsheetId || !settings.clientEmail || !settings.privateKey) {
      toast.error('Please provide and save credentials before syncing');
      return;
    }

    setShowSyncConfirm(true);
  };

  const executeSyncProducts = async () => {
    setShowSyncConfirm(false);
    setSyncing(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/sync-products', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response from sync:', text);
        // If it's a 403 HTML, provide a better explanation
        if (response.status === 403) {
          throw new Error('Access Denied (403). The request was blocked by a security layer. This often happens with certain URL patterns or headers.');
        }
        throw new Error(text.substring(0, 100) || `Server returned ${response.status} ${response.statusText}`);
      }

      if (response.ok) {
        toast.success(data.message);
      } else {
        const errorMsg = data.error || data.message || 'Sync failed';
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Sync failed: ${error.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleDebugFirebase = async () => {
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/test-firebase', {
        credentials: 'same-origin',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json'
        }
      });
      const data = await response.json();
      console.log('Firebase Debug Info:', data);
      if (data.status === 'success') {
        toast.success('Firebase connection is healthy!');
      } else {
        toast.error(`Firebase error: ${data.connectionTest?.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      toast.error(`Debug failed: ${error.message}`);
    }
  };

  const handleTestDrive = async () => {
    if (!settings.driveFolderId) {
      toast.error('Please provide a Folder ID before testing');
      return;
    }
    setTestingDrive(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/admin/test-drive', {
        credentials: 'same-origin',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Accept': 'application/json'
        }
      });
      
      const contentType = response.headers.get('content-type');
      let data: any;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(text.substring(0, 100) || 'Server error');
      }

      if (response.ok) {
        toast.success(data.message || 'Drive folder is accessible!');
      } else {
        const errorMsg = data.error || data.message || 'Drive test failed';
        if (errorMsg.includes('quota')) {
          toast.error('Quota Error: You must share the folder with the Service Account email and grant "Editor" access.');
        } else {
          toast.error(errorMsg);
        }
      }
    } catch (error: any) {
      console.error('Drive test error:', error);
      toast.error(`Drive test failed: ${error.message}`);
    } finally {
      setTestingDrive(false);
    }
  };

  const handlePasteJson = (e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    try {
      // Try to parse the text as JSON
      const json = JSON.parse(text.trim());
      
      // Check for common Google Service Account fields
      if (json.client_email || json.private_key || json.spreadsheetId) {
        setSettings(prev => ({
          ...prev,
          clientEmail: json.client_email || prev.clientEmail,
          privateKey: json.private_key || prev.privateKey,
          spreadsheetId: json.spreadsheet_id || json.spreadsheetId || prev.spreadsheetId
        }));
        
        if (json.client_email && json.private_key) {
          toast.success('Credentials extracted from JSON');
          e.preventDefault();
        }
      }
    } catch (err) {
      // Not a valid JSON, let it paste normally
    }
  };

  const handleSpreadsheetIdChange = (value: string) => {
    // Extract ID from URL if a full URL is pasted
    const match = value.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    const extractedId = match ? match[1] : value.trim().replace(/^["']|["']$/g, '');
    setSettings({ ...settings, spreadsheetId: extractedId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Save directly to Firestore using client-side SDK to avoid backend permission issues
      const settingsRef = doc(db, 'settings', 'googleSheet');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: new Date().toISOString()
      });
      
      toast.success('Settings updated successfully');
    } catch (error: any) {
      console.error('Error updating settings:', error);
      toast.error(`Failed to update settings: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileSpreadsheet className="w-8 h-8 text-green-600" />
          Google Sheet Integration
        </h1>
        <p className="text-gray-600 mt-2">
          Sync your orders automatically to a Google Sheet for easier management.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-red-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-red-900">গুরুত্বপূর্ণ: ইমেজ হারানোর ভয় (Image Loss Warning)</h3>
              <p className="text-sm text-red-800 mt-1">
                আপনি যদি কম্পিউটার থেকে সরাসরি ইমেজ আপলোড করেন এবং ফায়ারবেস স্টোরেজ বা গুগল ড্রাইভ কনফিগার করা না থাকে, তবে সেই ইমেজগুলো সার্ভার রিস্টার্ট হলে মুছে যাবে। স্থায়ীভাবে ইমেজ সেভ করতে অবশ্যই গুগল ড্রাইভ বা ফায়ারবেস স্টোরেজ ব্যবহার করুন।
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 border-b border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Configuration</h2>
              <p className="text-sm text-gray-500">Provide your Google Service Account credentials</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.enabled}
                onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">
                {settings.enabled ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Spreadsheet ID
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHelpModal({
                      title: 'Finding Spreadsheet ID',
                      content: '1. Open your Google Sheet.\n2. Look at the URL in your browser.\n3. Copy the long part between "/d/" and "/edit".\nExample: .../d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit\nID is: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ'
                    });
                  }}
                  className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  How to find ID?
                </button>
              </div>
              <input
                type="text"
                required
                className={cn(
                  "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent",
                  settings.spreadsheetId && settings.spreadsheetId.length < 40 ? "border-orange-300 bg-orange-50" : "border-gray-300"
                )}
                placeholder="Spreadsheet ID or full URL"
                value={settings.spreadsheetId || ''}
                onChange={(e) => handleSpreadsheetIdChange(e.target.value)}
              />
              {settings.spreadsheetId && settings.spreadsheetId.length < 40 && (
                <p className="mt-1 text-xs text-orange-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This ID seems too short ({settings.spreadsheetId.length} chars). A standard ID is 44 characters.
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Found in the URL of your Google Sheet: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Google Drive Folder ID (for Image/Video Uploads)
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setHelpModal({
                      title: 'Finding Folder ID',
                      content: '1. Open your Google Drive folder.\n2. Look at the URL in your browser.\n3. Copy the long part after "/folders/".\nExample: .../folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ\nID is: 1aBcDeFgHiJkLmNoPqRsTuVwXyZ'
                    });
                  }}
                  className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  How to find Folder ID?
                </button>
              </div>
              <input
                type="text"
                className={cn(
                  "w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent",
                  !settings.driveFolderId && settings.enabled ? "border-orange-300 bg-orange-50" : "border-gray-300"
                )}
                placeholder="e.g. 1aBcDeFgHiJkLmNoPqRsTuVwXyZ"
                value={settings.driveFolderId || ''}
                onChange={(e) => setSettings({ ...settings, driveFolderId: e.target.value })}
              />
              {!settings.driveFolderId && settings.enabled && (
                <p className="mt-1 text-xs text-orange-600 font-medium flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Folder ID is required for image/video uploads to work.
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Found in the URL of your Google Drive folder: drive.google.com/drive/folders/<strong>[ID]</strong>
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Service Account Email (Client Email)
                </label>
                {settings.clientEmail && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(settings.clientEmail);
                      toast.success('Email copied to clipboard');
                    }}
                    className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    Copy Email
                  </button>
                )}
              </div>
              <input
                type="email"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="your-service-account@project-id.iam.gserviceaccount.com"
                value={settings.clientEmail || ''}
                onChange={(e) => setSettings({ ...settings, clientEmail: e.target.value })}
                onPaste={handlePasteJson}
              />
              <p className="mt-1 text-xs text-gray-500">
                This is the email address you must share your Google Sheet with.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">
                  Private Key
                </label>
                <button
                  type="button"
                  onClick={() => setShowHelp(true)}
                  className="text-xs text-orange-600 hover:underline flex items-center gap-1"
                >
                  <AlertCircle className="w-3 h-3" />
                  Where to find this?
                </button>
                {settings.privateKey && (
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, privateKey: '' })}
                    className="text-xs text-red-600 hover:underline ml-auto mr-2"
                  >
                    Clear
                  </button>
                )}
              </div>
              <textarea
                required
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono text-xs"
                placeholder="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
                value={settings.privateKey || ''}
                onChange={(e) => setSettings({ ...settings, privateKey: e.target.value })}
                onPaste={handlePasteJson}
              />
              <p className="mt-1 text-xs text-gray-500">
                Include the full key including the BEGIN and END lines. You can also paste the <strong>entire JSON file</strong> content here.
              </p>
            </div>
          </div>

          {showHelp && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-xl"
              >
                <h3 className="text-xl font-bold mb-4">Finding your Private Key</h3>
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Open your downloaded Service Account JSON file. Look for the <code>"private_key"</code> field. It should look like this:
                  </p>
                  <div className="bg-gray-900 text-gray-300 p-4 rounded-lg font-mono text-xs overflow-x-auto">
                    <pre>
{`{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "40-character-id",
  "private_key": "-----BEGIN PRIVATE KEY-----\\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASC...\\n-----END PRIVATE KEY-----\\n",
  "client_email": "your-service-account@...",
  ...
}`}
                    </pre>
                  </div>
                  <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg">
                    <p className="text-sm text-orange-800 font-medium">
                      Tip: You can copy the ENTIRE content of the JSON file and paste it into the "Private Key" or "Client Email" field above. The app will automatically extract the correct values for you!
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowHelp(false)}
                      className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-orange-900">Critical: Permission Required</h3>
                <p className="text-sm text-orange-800 mt-1">
                  Google Sheets will block access unless you explicitly share your spreadsheet with the Service Account email.
                </p>
              </div>
            </div>

            <div className="bg-white/50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-gray-800">Follow these steps to fix the "Access Denied" error:</p>
              <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-2">
                <li>
                  Open your Google Sheet: 
                  {settings.spreadsheetId ? (
                    <a 
                      href={`https://docs.google.com/spreadsheets/d/${settings.spreadsheetId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-orange-600 hover:underline inline-flex items-center gap-1"
                    >
                      Open Sheet <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="ml-1 text-gray-400 italic">(Enter Spreadsheet ID first)</span>
                  )}
                </li>
                <li>Click the <span className="font-bold text-blue-600">Share</span> button at the top right.</li>
                <li>
                  Paste this email into the "Add people and groups" box:
                  <div className="mt-2 flex items-center gap-2">
                    <code className="bg-gray-100 px-2 py-1 rounded text-xs border border-gray-200 break-all">
                      {settings.clientEmail || 'your-service-account-email@...'}
                    </code>
                    {settings.clientEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(settings.clientEmail);
                          toast.success('Email copied');
                        }}
                        className="p-1.5 bg-white border border-gray-200 rounded hover:bg-gray-50 text-gray-600 transition-colors"
                        title="Copy Email"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </li>
                <li>Ensure the role is set to <span className="font-bold text-gray-900">Editor</span>.</li>
                <li>Uncheck "Notify people" and click <span className="font-bold text-blue-600">Send</span> or <span className="font-bold text-blue-600">Share</span>.</li>
                <li>
                  <span className="font-bold text-orange-900">For Google Drive:</span> Repeat the same sharing process for your Google Drive folder:
                  {settings.driveFolderId ? (
                    <a 
                      href={`https://drive.google.com/drive/folders/${settings.driveFolderId}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="ml-2 text-orange-600 hover:underline inline-flex items-center gap-1"
                    >
                      Open Drive Folder <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="ml-1 text-gray-400 italic">(Enter Folder ID first)</span>
                  )}
                </li>
                <li>Also, ensure the <span className="font-bold">Google Sheets API</span> and <span className="font-bold">Google Drive API</span> are enabled in your Google Cloud Console.</li>
              </ol>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    const json = JSON.parse(text.trim());
                    if (json.client_email && json.private_key) {
                      setSettings(prev => ({
                        ...prev,
                        clientEmail: json.client_email,
                        privateKey: json.private_key
                      }));
                      toast.success('Credentials extracted from JSON');
                    } else {
                      toast.error('Clipboard does not contain valid Service Account JSON');
                    }
                  } catch (err) {
                    toast.error('Clipboard does not contain valid JSON');
                  }
                }}
                className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
              >
                Paste Entire JSON
              </button>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testing || saving || syncing || testingDrive}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Test Google Sheet Connection"
              >
                {testing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                )}
                Test Sheet
              </button>
              <button
                type="button"
                onClick={handleTestDrive}
                disabled={testing || saving || syncing || testingDrive}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Test Google Drive Folder Access"
              >
                {testingDrive ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-blue-600" />
                )}
                Test Drive
              </button>
              <button
                type="button"
                onClick={handleSyncProducts}
                disabled={syncing || testing || saving || testingDrive}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {syncing ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                )}
                Sync Products
              </button>
              <button
                type="button"
                onClick={handleDebugFirebase}
                disabled={testing || saving || syncing || testingDrive}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
                title="Test Firebase Connection"
              >
                <ShieldCheck className="w-5 h-5 text-purple-600" />
                Debug Firebase
              </button>
            </div>
            <button
              type="submit"
              disabled={saving || testing || syncing || testingDrive}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              Save Settings
            </button>
          </div>
        </form>
      </div>

      {/* Confirmation Modals */}
      <Modal
        isOpen={showSyncConfirm}
        onClose={() => setShowSyncConfirm(false)}
        title="Sync Products"
        footer={
          <>
            <button
              onClick={() => setShowSyncConfirm(false)}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={executeSyncProducts}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
            >
              Continue Sync
            </button>
          </>
        }
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-orange-100 rounded-full">
            <RefreshCw className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-gray-600">
              This will update your products based on the data in the <strong>"Products"</strong> sheet.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Make sure your sheet headers match the required format.
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!helpModal}
        onClose={() => setHelpModal(null)}
        title={helpModal?.title || 'Help'}
        footer={
          <button
            onClick={() => setHelpModal(null)}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Got it
          </button>
        }
      >
        <div className="space-y-4">
          {helpModal?.content.split('\n').map((line, i) => (
            <p key={i} className="text-gray-600">{line}</p>
          ))}
        </div>
      </Modal>
    </div>
  );
};

export default AdminGoogleSheetSettings;
