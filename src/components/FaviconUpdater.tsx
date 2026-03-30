import { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

export default function FaviconUpdater() {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings.logoUrl) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (link) {
        link.href = settings.logoUrl;
      } else {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        newLink.href = settings.logoUrl;
        document.head.appendChild(newLink);
      }
    }
  }, [settings.logoUrl]);

  return null;
}
