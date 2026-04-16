import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Haptic feedback utility
export const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
    const patterns = {
      light: 10,
      medium: 20,
      heavy: 50
    };
    window.navigator.vibrate(patterns[type]);
  }
};

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number) {
  return new Intl.NumberFormat('en-BD', {
    style: 'currency',
    currency: 'BDT',
    minimumFractionDigits: 0,
  }).format(price);
}

export function calculateDiscount(price: number, discountPrice?: number) {
  if (!discountPrice) return 0;
  return Math.round(((price - discountPrice) / price) * 100);
}

export function getProxyUrl(url: string | null | undefined) {
  if (!url || url.trim() === '') return null;
  
  // Normalize protocol-relative URLs
  const normalizedUrl = url.startsWith('//') ? `https:${url}` : url;
  
  // Handle Google Drive Links
  if (normalizedUrl.includes('drive.google.com')) {
    const driveIdMatch = normalizedUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || normalizedUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveIdMatch && driveIdMatch[1]) {
      // For images, use the thumbnail/direct link
      // For videos, the uc?id=... link is usually better for the <video> tag
      return `https://drive.google.com/uc?export=view&id=${driveIdMatch[1]}`;
    }
  }

  // Don't proxy data URLs, blobs, or local URLs
  if (normalizedUrl.startsWith('data:') || normalizedUrl.startsWith('blob:') || normalizedUrl.startsWith('/') || normalizedUrl.startsWith('http://localhost') || normalizedUrl.startsWith('https://localhost')) {
    return normalizedUrl;
  }
  
  // If it's already a proxy URL, don't proxy again
  if (normalizedUrl.includes('/api/proxy-image')) return normalizedUrl;

  // Skip proxy for reliable CDNs that don't have referrer restrictions
  const reliableCDNs = [
    'images.unsplash.com',
    'firebasestorage.googleapis.com',
    'picsum.photos',
    'cloudinary.com',
    'imgbb.com',
    'raw.githubusercontent.com',
    'cdn.jsdelivr.net',
    'logo.clearbit.com',
    'taobao.com',
    'fbcdn.net',
    'akamaihd.net',
    'static.flickr.com'
  ];

  try {
    const urlObj = new URL(normalizedUrl);
    
    // Force HTTPS for all external URLs
    if (urlObj.protocol === 'http:') {
      urlObj.protocol = 'https:';
    }

    if (reliableCDNs.some(cdn => urlObj.hostname.includes(cdn))) {
      return urlObj.toString();
    }
    
    // If it's already a proxy URL, don't proxy again
    if (urlObj.pathname.includes('/api/proxy-image')) return urlObj.toString();

  } catch (e) {
    // If URL parsing fails, just return as is or proxy
  }

  // Check if it's an external URL
  const isExternal = normalizedUrl.startsWith('http');
  
  // If it's not external, it's probably a local asset
  if (!isExternal) return normalizedUrl;

  // Use absolute path for the proxy if VITE_API_URL is set (useful for APKs)
  const apiUrl = import.meta.env.VITE_API_URL || '';
  return `${apiUrl}/api/proxy-image?url=${encodeURIComponent(normalizedUrl)}`;
}
