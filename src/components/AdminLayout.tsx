import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Tag, Settings, LogOut, Home, Menu, X, Users, RefreshCcw, Layers, CreditCard, Star, Globe, FileSpreadsheet } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../lib/utils';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  const menuItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin' },
    { label: 'Products', icon: Package, path: '/admin/products' },
    { label: 'Orders', icon: ShoppingBag, path: '/admin/orders' },
    { label: 'Transactions', icon: CreditCard, path: '/admin/transactions' },
    { label: 'Refunds', icon: RefreshCcw, path: '/admin/refunds' },
    { label: 'Users', icon: Users, path: '/admin/users' },
    { label: 'Coupons', icon: Tag, path: '/admin/coupons' },
    { label: 'Reviews', icon: Star, path: '/admin/reviews' },
    { label: 'Categories', icon: Layers, path: '/admin/categories' },
    { label: 'Google Sheet', icon: FileSpreadsheet, path: '/admin/google-sheet' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-80 bg-[#111111] border-r border-white/5 text-white p-8 fixed top-0 left-0 bottom-0 z-30">
        <div className="flex items-center mb-12">
          <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center mr-3 shadow-lg shadow-emerald-600/20">
            <span className="text-xl font-black text-white">MJ</span>
          </div>
          <span className="text-2xl font-black text-white tracking-tight">Admin</span>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all duration-200",
                location.pathname === item.path
                  ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("h-5 w-5", location.pathname === item.path ? "text-white" : "text-gray-500")} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="pt-8 border-t border-white/5 space-y-2 mt-auto bg-[#111111]">
          <Link
            to="/admin/settings"
            className={cn(
              "flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
              location.pathname === '/admin/settings'
                ? "bg-emerald-600 text-white shadow-xl shadow-emerald-600/20"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings className={cn("h-5 w-5", location.pathname === '/admin/settings' ? "text-white" : "text-gray-500")} />
            <span>Settings</span>
          </Link>
          <Link
            to="/"
            className="flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Home className="h-5 w-5 text-gray-500" />
            <span>Go to Store</span>
          </Link>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-[#111111] border-b border-white/5 text-white p-4 z-50 flex justify-between items-center backdrop-blur-xl bg-opacity-80">
        <div className="flex items-center">
          <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center mr-2">
            <span className="text-sm font-black text-white">MJ</span>
          </div>
          <span className="text-lg font-black text-white">Admin</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/80 z-40 backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "lg:hidden fixed top-0 left-0 bottom-0 w-80 bg-[#111111] text-white p-8 z-50 transition-transform duration-300 border-r border-white/5",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center mb-12">
          <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center mr-3">
            <span className="text-xl font-black text-white">MJ</span>
          </div>
          <span className="text-2xl font-black text-white">Admin</span>
        </div>
        <nav className="flex-1 space-y-2 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsSidebarOpen(false)}
              className={cn(
                "flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
                location.pathname === item.path 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="pt-8 border-t border-white/5 space-y-2 mt-auto">
          <Link
            to="/admin/settings"
            onClick={() => setIsSidebarOpen(false)}
            className={cn(
              "flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold transition-all",
              location.pathname === '/admin/settings' 
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" 
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </Link>
          <Link
            to="/"
            onClick={() => setIsSidebarOpen(false)}
            className="flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Home className="h-5 w-5 text-gray-500" />
            <span>Go to Store</span>
          </Link>
          <button
            onClick={() => { logout(); navigate('/'); }}
            className="flex items-center space-x-4 px-6 py-4 rounded-2xl font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all w-full text-left"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-80 pt-20 lg:pt-0 overflow-y-auto bg-[#0a0a0a] min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
