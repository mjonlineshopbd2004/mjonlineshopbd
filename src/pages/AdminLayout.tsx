import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingBag, 
  Users, 
  Settings, 
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Store
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';
import { toast } from 'sonner';

const sidebarLinks = [
  { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
  { name: 'Products', path: '/admin/products', icon: Package },
  { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
  { name: 'Customers', path: '/admin/customers', icon: Users },
  { name: 'Settings', path: '/admin/settings', icon: Settings },
];

export default function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-all"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 w-72 bg-gray-900 text-white z-50 transition-transform duration-300 transform lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <Link to="/admin" className="flex items-center space-x-3 group">
              <div className="bg-orange-600 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                <Store className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">Admin Panel</span>
            </Link>
            <button 
              className="lg:hidden text-gray-400 hover:text-white"
              onClick={() => setIsSidebarOpen(false)}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3.5 rounded-xl transition-all font-medium group",
                    isActive 
                      ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" 
                      : "text-gray-400 hover:bg-gray-800 hover:text-white"
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                  )} />
                  <span>{link.name}</span>
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-gray-800">
            <div className="flex items-center space-x-3 px-4 py-4 mb-4 bg-gray-800/50 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-orange-600 flex items-center justify-center font-bold text-lg">
                {user?.email?.[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{user?.email?.split('@')[0]}</p>
                <p className="text-xs text-gray-500 truncate">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3.5 text-gray-400 hover:bg-red-600/10 hover:text-red-500 rounded-xl transition-all font-medium group"
            >
              <LogOut className="h-5 w-5 group-hover:rotate-12 transition-transform" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-72 flex flex-col min-h-screen">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-30">
          <div className="flex items-center lg:hidden">
            <button 
              className="p-2 text-gray-400 hover:text-gray-600"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>

          <div className="hidden md:flex items-center flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search anything..." 
                className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 transition-all font-medium"
              />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all relative">
              <Bell className="h-6 w-6" />
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
            </button>
            <Link 
              to="/" 
              className="hidden sm:flex items-center space-x-2 px-4 py-2.5 text-sm font-bold text-gray-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-all"
            >
              <Store className="h-5 w-5" />
              <span>View Store</span>
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="p-6 lg:p-10 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
