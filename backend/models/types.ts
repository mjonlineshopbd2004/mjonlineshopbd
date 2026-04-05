export type UserRole = 'admin' | 'customer';

export interface UserProfile {
  uid: string;
  email: string;
  password?: string; // Hashed password for custom auth
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number | null;
  category: string;
  images: string[];
  videoUrl?: string;
  sourceUrl?: string;
  stock: number;
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  trending?: boolean;
  sizes?: string[];
  colors?: string[];
  colorVariants?: { name: string; image: string }[];
  specifications?: { key: string; value: string }[];
  createdAt: string;
  updatedAt?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'upay' | 'visa' | 'mastercard' | 'bank' | 'cod';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  items: any[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  payableAmount: number;
  status: OrderStatus;
  paymentMethod: string;
  paymentType: string;
  paymentStatus: 'pending' | 'paid' | 'verified';
  deliveryArea: string;
  transactionId?: string;
  paymentScreenshot?: string;
  cardDetails?: {
    holderName: string;
    cardNumber: string;
    expiry: string;
  } | null;
  customerNote?: string;
  createdAt: string;
}

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minOrder: number;
  expiryDate: string;
  active: boolean;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}
