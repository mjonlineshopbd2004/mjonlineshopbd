export type UserRole = 'admin' | 'customer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  address?: string;
  createdAt: string;
}

export interface ProductSpecification {
  key: string;
  value: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  category: string;
  images: string[];
  videoUrl?: string;
  sourceUrl?: string;
  stock: number;
  sizes?: string[];
  colors?: string[];
  colorVariants?: { name: string; image: string }[];
  rating: number;
  reviewsCount: number;
  featured?: boolean;
  trending?: boolean;
  specifications?: ProductSpecification[];
  createdAt: string;
  updatedAt?: string;
}

export interface CartItem extends Product {
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
  selected?: boolean;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
export type PaymentMethod = 'bkash' | 'nagad' | 'rocket' | 'bank';
export type PaymentType = '50%' | '100%';
export type DeliveryArea = 'inside-dhaka' | 'outside-dhaka';

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  phone: string;
  address: string;
  items: CartItem[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentType: PaymentType;
  payableAmount: number;
  paymentStatus: 'pending' | 'paid';
  deliveryArea: DeliveryArea;
  transactionId?: string;
  customerNote?: string;
  refundRequest?: {
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string;
  };
  createdAt: string;
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

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  expiryDate: string;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface AppConfig {
  deliveryInsideDhaka: number;
  deliveryOutsideDhaka: number;
}
