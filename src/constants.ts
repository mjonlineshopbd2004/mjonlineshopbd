import { Product, Order, UserProfile, AppConfig } from './types';

export const CATEGORIES = [
  'Shoes',
  'Bags',
  'Jewelry',
  'Women\'s Clothing',
  'Watches',
  'Electronics & Gadgets',
  'Home & Kitchen'
];

export const DELIVERY_AREAS = [
  { id: 'inside-dhaka', name: 'Inside Dhaka', charge: 60 },
  { id: 'outside-dhaka', name: 'Outside Dhaka', charge: 120 }
];

export const PAYMENT_METHODS = [
  { id: 'bkash', name: 'bKash', icon: '📱' },
  { id: 'nagad', name: 'Nagad', icon: '📱' },
  { id: 'rocket', name: 'Rocket', icon: '📱' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦' }
];

export const DEMO_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Premium Leather Handbag',
    description: 'Elegant and durable leather handbag for daily use. Features multiple compartments and a stylish design.',
    price: 3500,
    discountPrice: 2800,
    category: 'Bags',
    images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 50,
    colors: ['Brown', 'Black'],
    rating: 4.5,
    reviewsCount: 12,
    featured: true,
    trending: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p2',
    name: 'Classic Leather Shoes',
    description: 'Comfortable and stylish leather shoes for formal occasions. Made with premium materials.',
    price: 4500,
    discountPrice: 3800,
    category: 'Shoes',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 20,
    colors: ['Black', 'Brown'],
    rating: 4.8,
    reviewsCount: 8,
    featured: true,
    trending: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p3',
    name: 'Gold Plated Necklace',
    description: 'Beautiful gold plated necklace with a modern design. Perfect for parties and gifts.',
    price: 2500,
    discountPrice: 1800,
    category: 'Jewelry',
    images: ['https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 100,
    colors: ['Gold'],
    rating: 4.2,
    reviewsCount: 45,
    featured: false,
    trending: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p4',
    name: 'Travel Backpack',
    description: 'Large capacity travel backpack with laptop sleeve and waterproof material.',
    price: 2200,
    discountPrice: 1600,
    category: 'Bags',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb94c6a62?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 30,
    colors: ['Grey', 'Black'],
    rating: 4.6,
    reviewsCount: 15,
    featured: false,
    trending: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p5',
    name: 'Smart Watch Series 7',
    description: 'Advanced smart watch with heart rate monitor, GPS, and water resistance. Stay connected on the go.',
    price: 5500,
    discountPrice: 4800,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1546868871-70c122467d8b?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 15,
    colors: ['Black', 'Silver', 'Blue'],
    rating: 4.7,
    reviewsCount: 22,
    featured: true,
    trending: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p6',
    name: 'Floral Print Summer Dress',
    description: 'Lightweight and comfortable floral print dress for women. Perfect for summer outings.',
    price: 2200,
    discountPrice: 1600,
    category: 'Women',
    images: ['https://images.unsplash.com/photo-1572804013307-a9a111d72f8b?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 40,
    sizes: ['S', 'M', 'L'],
    rating: 4.4,
    reviewsCount: 18,
    featured: false,
    trending: true,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p7',
    name: 'Mechanical Gaming Keyboard',
    description: 'RGB backlit mechanical keyboard with blue switches for a tactile gaming experience.',
    price: 3500,
    discountPrice: 2900,
    category: 'Electronics',
    images: ['https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 25,
    colors: ['Black'],
    rating: 4.5,
    reviewsCount: 30,
    featured: true,
    trending: false,
    createdAt: new Date().toISOString()
  },
  {
    id: 'p8',
    name: 'Canvas Backpack',
    description: 'Durable canvas backpack with laptop compartment and padded straps. Great for students and travelers.',
    price: 1800,
    discountPrice: 1400,
    category: 'Accessories',
    images: ['https://images.unsplash.com/photo-1544816153-199d88bb1166?auto=format&fit=crop&q=80&w=600&h=800'],
    stock: 60,
    colors: ['Grey', 'Navy', 'Olive'],
    rating: 4.3,
    reviewsCount: 25,
    featured: false,
    trending: true,
    createdAt: new Date().toISOString()
  }
];

export const DEMO_CONFIG: AppConfig = {
  deliveryInsideDhaka: 60,
  deliveryOutsideDhaka: 120
};

export const BANGLADESH_DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogra", "Brahmanbaria", "Chandpur", "Chapai Nawabganj", "Chattogram", "Chuadanga", "Comilla", "Cox's Bazar", "Dhaka", "Dinajpur", "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachari", "Khulna", "Kishoreganj", "Kurigram", "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
].sort();
