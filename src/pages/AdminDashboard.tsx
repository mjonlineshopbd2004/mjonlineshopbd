import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, Product } from '../types';
import { formatPrice, cn } from '../lib/utils';
import { 
  ShoppingBag, 
  Users, 
  DollarSign, 
  TrendingUp,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  ArrowRight,
  Plus,
  Settings,
  LayoutDashboard,
  RefreshCcw,
  Tag,
  Layers,
  Star,
  FileSpreadsheet,
  Database,
  HardDrive,
  ExternalLink,
  CreditCard
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  ResponsiveContainer
} from 'recharts';

const sparklineData = [
  { value: 400 }, { value: 300 }, { value: 600 }, { value: 400 }, { value: 500 }, { value: 800 }, { value: 600 }
];

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    todayRevenue: 0,
    todayOrders: 0,
    pendingOrders: 0,
    totalUsers: 0,
    yesterdayRevenue: 0,
    yesterdayOrders: 0,
    thisMonthRevenue: 0,
    thisMonthOrders: 0,
    lastMonthRevenue: 0,
    lastMonthOrders: 0,
    allTimeRevenue: 0,
    allTimeOrders: 0,
    processingOrders: 0,
    deliveredOrders: 0,
    totalProducts: 0,
    totalCategories: 0,
    totalCoupons: 0,
    totalReviews: 0,
    totalDocuments: 0
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        const ordersRef = collection(db, 'orders');
        const ordersSnap = await getDocs(ordersRef);
        const allOrders = ordersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));

        const productsSnap = await getDocs(collection(db, 'products'));
        const usersSnap = await getDocs(collection(db, 'users'));
        const categoriesSnap = await getDocs(collection(db, 'categories'));
        const couponsSnap = await getDocs(collection(db, 'coupons'));
        const reviewsSnap = await getDocs(collection(db, 'reviews'));

        const getRevenue = (orders: Order[]) => orders.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0);

        const getOrderDate = (o: Order) => {
          if (typeof o.createdAt === 'string') return new Date(o.createdAt);
          // @ts-ignore
          if (o.createdAt?.toDate) return o.createdAt.toDate();
          return new Date();
        };

        const todayOrders = allOrders.filter(o => getOrderDate(o) >= startOfToday);
        const yesterdayOrders = allOrders.filter(o => getOrderDate(o) >= startOfYesterday && getOrderDate(o) < startOfToday);
        const thisMonthOrders = allOrders.filter(o => getOrderDate(o) >= startOfThisMonth);
        const lastMonthOrders = allOrders.filter(o => getOrderDate(o) >= startOfLastMonth && getOrderDate(o) <= endOfLastMonth);

        setStats({
          todayRevenue: getRevenue(todayOrders),
          todayOrders: todayOrders.length,
          pendingOrders: allOrders.filter(o => o.status === 'pending').length,
          totalUsers: usersSnap.size,
          yesterdayRevenue: getRevenue(yesterdayOrders),
          yesterdayOrders: yesterdayOrders.length,
          thisMonthRevenue: getRevenue(thisMonthOrders),
          thisMonthOrders: thisMonthOrders.length,
          lastMonthRevenue: getRevenue(lastMonthOrders),
          lastMonthOrders: lastMonthOrders.length,
          allTimeRevenue: getRevenue(allOrders),
          allTimeOrders: allOrders.length,
          processingOrders: allOrders.filter(o => o.status === 'processing').length,
          deliveredOrders: allOrders.filter(o => o.status === 'delivered').length,
          totalProducts: productsSnap.size,
          totalCategories: categoriesSnap.size,
          totalCoupons: couponsSnap.size,
          totalReviews: reviewsSnap.size,
          totalDocuments: ordersSnap.size + productsSnap.size + usersSnap.size + categoriesSnap.size + couponsSnap.size + reviewsSnap.size
        });

        const recentQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(5));
        const recentSnap = await getDocs(recentQuery);
        setRecentOrders(recentSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8 max-w-[1600px] mx-auto">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Dashboard Overview</h1>
          <p className="text-gray-500 font-medium mt-1">Welcome back! Here's what's happening with your store today.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="p-2.5 bg-[#111111] border border-white/5 rounded-xl text-gray-400 hover:text-white transition-colors">
            <RefreshCcw className="h-5 w-5" />
          </button>
          <Link
            to="/admin/products/new"
            className="flex items-center px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all active:scale-95"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Product
          </Link>
        </div>
      </div>

      {/* Top Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Today Revenue', value: `BDT ${stats.todayRevenue}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Today Orders', value: stats.todayOrders, icon: ShoppingBag, color: 'text-blue-500', bg: 'bg-blue-500/10' },
          { label: 'Pending Orders', value: stats.pendingOrders, icon: Clock, color: 'text-orange-500', bg: 'bg-orange-500/10' },
          { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#111111] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
            <div className="flex justify-between items-start relative z-10">
              <div className={`p-3 rounded-2xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div className="h-12 w-24">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <Area type="monotone" dataKey="value" stroke={stat.color.replace('text-', '#').replace('500', '600')} fill={stat.color.replace('text-', '#').replace('500', '600')} fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-6 relative z-10">
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{stat.label}</p>
              <p className="text-3xl font-black text-white mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#111111] p-8 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center space-x-3 mb-8">
              <DollarSign className="h-6 w-6 text-emerald-500" />
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Revenue Breakdown</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                { label: 'Yesterday', value: `BDT ${stats.yesterdayRevenue}`, orders: stats.yesterdayOrders },
                { label: 'This Month', value: `BDT ${stats.thisMonthRevenue}`, orders: stats.thisMonthOrders },
                { label: 'Last Month', value: `BDT ${stats.lastMonthRevenue}`, orders: stats.lastMonthOrders },
                { label: 'All Time', value: `BDT ${stats.allTimeRevenue}`, orders: stats.allTimeOrders },
              ].map((item, i) => (
                <div key={i} className="bg-[#0a0a0a] p-6 rounded-3xl border border-white/5 flex justify-between items-center group hover:border-emerald-500/50 transition-colors">
                  <div>
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
                    <p className="text-2xl font-black text-white mt-1">{item.value}</p>
                    <p className="text-[10px] font-bold text-gray-600 mt-1 uppercase">{item.orders} Orders</p>
                  </div>
                  <div className="h-10 w-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={sparklineData}>
                        <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-[#111111] rounded-[2.5rem] border border-white/5 overflow-hidden">
            <div className="p-8 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <ShoppingBag className="h-6 w-6 text-emerald-500" />
                <h2 className="text-xl font-black text-white uppercase tracking-wider">Recent Orders</h2>
              </div>
              <Link to="/admin/orders" className="text-[10px] font-black text-emerald-500 uppercase hover:underline flex items-center">
                View All <ArrowRight className="h-3 w-3 ml-1" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[#0a0a0a] text-left">
                    <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Order ID</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Customer</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</th>
                    <th className="px-8 py-4 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {recentOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-8 py-6 text-xs font-bold text-gray-400">
                        #{order.id.slice(-6).toUpperCase()}
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-xs font-black text-gray-200">{order.customerName}</p>
                        <p className="text-[10px] font-bold text-gray-600 mt-0.5">{order.phone}</p>
                      </td>
                      <td className="px-8 py-6 text-xs font-black text-white">
                        {formatPrice(order.total)}
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                          order.status === 'delivered' ? 'bg-emerald-500/10 text-emerald-500' :
                          order.status === 'pending' ? 'bg-orange-500/10 text-orange-500' :
                          order.status === 'processing' ? 'bg-blue-500/10 text-blue-500' :
                          'bg-gray-500/10 text-gray-500'
                        )}>
                          {order.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Order Status */}
          <div className="bg-[#111111] p-8 rounded-[2.5rem] border border-white/5">
            <div className="flex items-center space-x-3 mb-8">
              <Clock className="h-6 w-6 text-emerald-500" />
              <h2 className="text-xl font-black text-white uppercase tracking-wider">Order Status</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Pending', count: stats.pendingOrders, color: 'bg-orange-500' },
                { label: 'Processing', count: stats.processingOrders, color: 'bg-blue-500' },
                { label: 'Delivered', count: stats.deliveredOrders, color: 'bg-emerald-500' },
              ].map((status, i) => (
                <div key={i} className="bg-[#0a0a0a] p-5 rounded-2xl border border-white/5 flex items-center justify-between group">
                  <div className="flex items-center space-x-4">
                    <div className={`w-2 h-2 rounded-full ${status.color}`} />
                    <span className="text-xs font-black text-gray-300 uppercase tracking-widest">{status.label}</span>
                  </div>
                  <span className="text-xl font-black text-white">{status.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-[#111111] p-8 rounded-[2.5rem] border border-white/5">
            <h2 className="text-xl font-black text-white uppercase tracking-wider mb-8">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Products', icon: Package, path: '/admin/products', color: 'bg-blue-500' },
                { label: 'Orders', icon: ShoppingBag, path: '/admin/orders', color: 'bg-orange-500' },
                { label: 'Transactions', icon: CreditCard, path: '/admin/transactions', color: 'bg-emerald-500' },
                { label: 'Reviews', icon: Star, path: '/admin/reviews', color: 'bg-yellow-500' },
                { label: 'Users', icon: Users, path: '/admin/users', color: 'bg-purple-500' },
                { label: 'Settings', icon: Settings, path: '/admin/settings', color: 'bg-gray-500' },
              ].map((action, i) => (
                <Link key={i} to={action.path} className="bg-[#0a0a0a] p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-3 hover:border-emerald-500/50 transition-all group active:scale-95">
                  <div className={`p-3 rounded-2xl ${action.color}/10`}>
                    <action.icon className={`h-6 w-6 ${action.color.replace('bg-', 'text-')}`} />
                  </div>
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{action.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Need Help Card */}
          <div className="bg-emerald-600 p-8 rounded-[2.5rem] relative overflow-hidden group">
            <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-110 transition-transform duration-500">
              <Settings className="h-40 w-40" />
            </div>
            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-2">Need Help?</h3>
            <p className="text-emerald-100 text-xs font-bold mb-6">Check out our documentation or contact support.</p>
            <button className="bg-white text-emerald-600 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-black/10 hover:bg-emerald-50 transition-colors">
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {/* System Usage & Storage */}
      <div className="bg-[#111111] p-8 rounded-[2.5rem] border border-white/5">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-3">
            <Layers className="h-6 w-6 text-emerald-500" />
            <h2 className="text-xl font-black text-white uppercase tracking-wider">System Usage & Storage</h2>
          </div>
          <div className="flex space-x-4 text-[10px] font-black uppercase tracking-widest">
            <button className="text-emerald-500 hover:underline flex items-center">Firestore Console <ExternalLink className="h-3 w-3 ml-1" /></button>
            <button className="text-emerald-500 hover:underline flex items-center">Storage Console <ExternalLink className="h-3 w-3 ml-1" /></button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
          {[
            { label: 'Products', count: stats.totalProducts, icon: Package },
            { label: 'Orders', count: stats.allTimeOrders, icon: ShoppingBag },
            { label: 'Users', count: stats.totalUsers, icon: Users },
            { label: 'Categories', count: stats.totalCategories, icon: Layers },
            { label: 'Coupons', count: stats.totalCoupons, icon: Tag },
            { label: 'Reviews', count: stats.totalReviews, icon: Star },
          ].map((item, i) => (
            <div key={i} className="bg-[#0a0a0a] p-6 rounded-3xl border border-white/5 flex flex-col items-center justify-center space-y-3">
              <item.icon className="h-5 w-5 text-gray-700" />
              <p className="text-2xl font-black text-white">{item.count}</p>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-emerald-500" />
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Database Health</span>
              </div>
              <span className="text-xs font-black text-white uppercase tracking-widest">{stats.totalDocuments}</span>
            </div>
            <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min((stats.totalDocuments / 50000) * 100, 100)}%` }} />
            </div>
            <p className="text-[9px] text-gray-600 font-bold uppercase">* Firestore free tier allows up to 50k of data storage.</p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4 text-blue-500" />
                <span className="text-xs font-black text-gray-300 uppercase tracking-widest">Storage Estimate</span>
              </div>
              <span className="text-xs font-black text-white uppercase tracking-widest">~22.5 MB</span>
            </div>
            <div className="h-2 bg-[#0a0a0a] rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: '15%' }} />
            </div>
            <p className="text-[9px] text-gray-600 font-bold uppercase">* Estimated based on 3 images per product (avg 500KB each).</p>
          </div>
        </div>
      </div>
    </div>
  );
}
