import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

export function getProxyUrl(url: string) {
  if (!url) return 'https://picsum.photos/seed/placeholder/600/800';
  
  // Don't proxy data URLs, blobs, or local URLs
  if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('/') || url.startsWith('http://localhost') || url.startsWith('https://localhost')) {
    return url;
  }
  
  // If it's already a proxy URL, don't proxy again
  if (url.includes('/api/proxy-image')) return url;

  // List of domains that MUST be proxied due to strict referrer/hotlinking policies
  const mustProxy = [
    'alicdn.com',
    '1688.com',
    'amazon.com',
    'daraz.com',
    'daraz.com.bd',
    'media.daraz.com.bd',
    'laz-img-sg.alicdn.com',
    'laz-img-bd.alicdn.com',
    'img.alicdn.com',
    'cbu01.alicdn.com',
    'gw.alicdn.com',
    'ae01.alicdn.com',
    'slatic.net', // Daraz static assets
    'static-01.daraz.com.bd'
  ];

  const shouldProxy = mustProxy.some(domain => url.includes(domain));

  // If it's not a domain that requires proxying, return the original URL
  // This helps when the backend proxy is not available (e.g. on some static deployments)
  if (!shouldProxy) return url;

  // Use absolute URL for the proxy if VITE_APP_URL is set, otherwise fallback to relative
  const baseUrl = import.meta.env.VITE_APP_URL || '';
  
  // Ensure baseUrl doesn't end with a slash if it's set
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  
  return `${cleanBaseUrl}/api/proxy-image?url=${encodeURIComponent(url)}`;
}
