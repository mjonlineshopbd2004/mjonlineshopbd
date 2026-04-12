import React, { useEffect, useState } from 'react';
import { collection, query, getDocs, deleteDoc, doc, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { formatPrice, cn, getProxyUrl } from '../lib/utils';
import { Plus, Search, Edit2, Trash2, Package, ChevronRight, Filter, RefreshCw, Loader2, Globe, Image as ImageIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export default function AdminProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      setProducts(querySnapshot.docs.map(doc => {
        const data = doc.data();
        return { ...data, id: doc.id } as Product;
      }));
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      console.log("Starting deletion for ID:", id);
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete product');
      }

      setProducts(prev => prev.filter(p => p.id !== id));
      toast.success('Product deleted successfully');
      setDeleteConfirmId(null);
    } catch (error: any) {
      console.error("Delete error details:", error);
      toast.error(`Failed to delete product: ${error.message}`);
    }
  };

  const handleSync = async (product: Product) => {
    if (!product.sourceUrl) return;

    setSyncingId(product.id);
    try {
      const idToken = await user?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');

      const response = await fetch('/api/scraper/product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ url: product.sourceUrl })
      });

      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.error('Non-JSON response received from /api/scraper/product:', text);
        throw new Error(`Server returned non-JSON response: ${text.substring(0, 100)}...`);
      }

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch product data');
      }

      const updatedData = {
        name: data.name || product.name,
        price: data.price || product.price,
        description: data.description || product.description,
        images: data.images && data.images.length > 0 ? data.images : product.images,
        updatedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'products', product.id), updatedData);
      
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updatedData } : p));
      toast.success(`Synced: ${product.name}`);
    } catch (error: any) {
      console.error('Sync error:', error);
      toast.error(`Failed to sync ${product.name}: ${error.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Inventory</h1>
          <p className="text-gray-400 font-bold">Manage your products and stock levels</p>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/admin/products/import"
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
          >
            <Globe className="h-5 w-5" />
            <span>Magic Importer</span>
          </Link>
          <Link
            to="/admin/products/new"
            className="bg-primary-dark hover:bg-primary text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary-dark/20 flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <input
            type="text"
            placeholder="Search products by name or category..."
            className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-4 outline-none focus:border-primary transition-all font-bold text-white"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
        </div>
        <button className="bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-all text-gray-400">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-bold border-b border-white/10">
                <th className="px-8 py-6">Product</th>
                <th className="px-8 py-6">Category</th>
                <th className="px-8 py-6">Price</th>
                <th className="px-8 py-6">Stock</th>
                <th className="px-8 py-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={5} className="px-8 py-6"><div className="h-12 bg-white/5 rounded-xl"></div></td>
                  </tr>
                ))
              ) : filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/5 flex-shrink-0 border border-white/5">
                        {getProxyUrl(product.images[0]) ? (
                          <img 
                            src={getProxyUrl(product.images[0])!} 
                            alt="" 
                            className="w-full h-full object-cover" 
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-6 w-6 text-gray-700" />
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-bold tracking-tight text-white group-hover:text-primary transition-colors line-clamp-1">{product.name}</p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">ID: #{product.id.slice(-6).toUpperCase()}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="bg-primary/10 text-primary px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest">
                      {product.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <p className="font-bold tracking-tight text-white">{formatPrice(product.discountPrice || product.price)}</p>
                    {product.discountPrice && <p className="text-[10px] text-gray-500 line-through">{formatPrice(product.price)}</p>}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        product.stock > 10 ? "bg-primary" : product.stock > 0 ? "bg-yellow-500" : "bg-red-500"
                      )}></div>
                      <span className="font-bold text-gray-300 text-sm">{product.stock} in stock</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {product.sourceUrl && (
                        <button
                          onClick={() => handleSync(product)}
                          disabled={syncingId === product.id}
                          className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all disabled:opacity-50"
                          title="Sync with Source"
                        >
                          {syncingId === product.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </button>
                      )}
                      <Link
                        to={`/admin/products/edit/${product.id}`}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-all"
                        title="Edit Product"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => setDeleteConfirmId(product.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title="Delete Product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111111] border border-white/10 p-8 rounded-[2rem] max-w-md w-full space-y-6 shadow-2xl">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="h-10 w-10 text-red-500" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold text-white">Delete Product?</h3>
              <p className="text-gray-400 font-bold">This action cannot be undone. Are you sure you want to delete this product?</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-6 py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-red-600/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
