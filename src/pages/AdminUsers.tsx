import React, { useEffect, useState, useRef } from 'react';
import { collection, query, onSnapshot, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';
import { Search, User, Shield, ShieldAlert, Mail, Phone, Calendar, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getProxyUrl } from '../lib/utils';

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setUsers(querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching users:", error);
      toast.error('Failed to fetch users');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setActiveDropdown(null);
      toast.success(`User role updated to ${newRole}`);
    } catch (error) {
      console.error("Error updating role:", error);
      toast.error('Failed to update user role');
    }
  };

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.phone?.includes(searchTerm)
  );

  return (
    <div className="p-4 sm:p-8 bg-[#0a0a0a] min-h-screen text-white space-y-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight mb-2 text-white">User Management</h1>
        <p className="text-gray-400 font-bold">Manage user roles and permissions</p>
      </div>

      {/* Search */}
      <div className="relative max-w-2xl group">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-12 py-4 outline-none focus:border-primary transition-all font-bold text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500 group-focus-within:text-primary transition-colors" />
      </div>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-[2rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-[10px] uppercase tracking-widest font-black border-b border-white/10">
                <th className="px-8 py-6">User</th>
                <th className="px-8 py-6">Contact</th>
                <th className="px-8 py-6">Joined</th>
                <th className="px-8 py-6">Role</th>
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
              ) : filteredUsers.map((user) => (
                <tr key={user.uid} className="hover:bg-white/5 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                        {user.photoURL ? (
                          <img src={getProxyUrl(user.photoURL)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="font-black text-white group-hover:text-primary transition-colors">{user.displayName || 'No Name'}</p>
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{user.uid.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-300 font-bold">
                        <Mail className="h-3 w-3 mr-2 text-gray-500" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center text-sm text-gray-300 font-bold">
                          <Phone className="h-3 w-3 mr-2 text-gray-500" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center text-sm text-gray-300 font-bold">
                      <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                      {new Date(user.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={cn(
                      "inline-flex items-center gap-2 px-4 py-1.5 rounded-full border font-black text-[10px] uppercase tracking-widest",
                      user.role === 'admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-blue-500/10 text-blue-500 border-blue-500/20"
                    )}>
                      {user.role === 'admin' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                      <span>{user.role}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="relative inline-block" ref={activeDropdown === user.uid ? dropdownRef : null}>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === user.uid ? null : user.uid);
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all",
                          activeDropdown === user.uid ? "text-white border-primary/50 bg-primary/10" : "text-gray-400 hover:text-white"
                        )}
                      >
                        <span>Change Role</span>
                        <ChevronDown className={cn("h-4 w-4 transition-transform", activeDropdown === user.uid && "rotate-180")} />
                      </button>
                      
                      {activeDropdown === user.uid && (
                        <div className="absolute right-0 mt-2 w-48 bg-[#111111] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                          <div className="py-2">
                            <button
                              onClick={() => handleRoleChange(user.uid, 'admin')}
                              className="flex items-center w-full px-4 py-3 text-xs text-gray-400 hover:bg-white/5 hover:text-primary font-black uppercase tracking-widest transition-colors"
                            >
                              <Shield className="h-4 w-4 mr-2" />
                              Make Admin
                            </button>
                            <button
                              onClick={() => handleRoleChange(user.uid, 'customer')}
                              className="flex items-center w-full px-4 py-3 text-xs text-gray-400 hover:bg-white/5 hover:text-blue-500 font-black uppercase tracking-widest transition-colors"
                            >
                              <User className="h-4 w-4 mr-2" />
                              Make Customer
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
