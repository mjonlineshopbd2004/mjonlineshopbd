import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useSettings } from '../contexts/SettingsContext';

export default function WhatsAppButton() {
  const { settings } = useSettings();
  const whatsappUrl = `https://wa.me/${(settings.whatsappNumber || '').replace(/\D/g, '')}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-24 right-4 z-50 bg-[#25D366] text-white p-3 md:p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all group"
      title="Chat with us on WhatsApp"
    >
      <MessageCircle className="h-6 w-6 md:h-7 md:w-7" />
      <span className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-white text-gray-900 px-4 py-2 rounded-xl text-sm font-bold shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Chat with us
      </span>
    </a>
  );
}
