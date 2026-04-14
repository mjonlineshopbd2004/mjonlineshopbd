import React, { useEffect, useState } from 'react';
import { Bell, X, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function PushNotificationManager() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Show prompt after 10 seconds if permission is still default
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => {
          setShowPrompt(true);
        }, 10000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) return;
    
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        toast.success('Notifications enabled!', {
          description: 'You will now receive updates about your orders and special offers.'
        });
        
        // Simulate a welcome notification
        new Notification('MJ ONLINE SHOP BD', {
          body: 'Welcome! You will now receive our latest updates.',
          icon: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=192&h=192'
        });
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
    }
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-20 left-4 right-4 md:left-auto md:right-8 md:w-80 z-[60]"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 p-5">
            <div className="flex items-start gap-4">
              <div className="bg-primary/10 p-3 rounded-xl">
                <Bell className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Don't miss out!</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Enable notifications to get instant updates on your orders and exclusive flash sales.
                </p>
              </div>
              <button 
                onClick={() => setShowPrompt(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowPrompt(false)}
                className="flex-1 px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
              >
                Later
              </button>
              <button
                onClick={requestPermission}
                className="flex-1 px-4 py-2 text-xs font-bold text-white bg-primary rounded-xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
              >
                Enable Now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
