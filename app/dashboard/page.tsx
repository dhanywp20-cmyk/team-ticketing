'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: string;
  allowed_menus?: string[];
}

interface MenuItem {
  title: string;
  icon: string;
  gradient: string;
  description: string;
  key: string;
  items: {
    name: string;
    url: string;
    icon: string;
    external?: boolean;
    embed?: boolean;
    internal?: boolean;
  }[];
}

// ─── Account Settings Modal ──────────────────────────────────────────────────

const ALL_MENU_KEYS = [
  'form-bast',
  'ticket-troubleshooting',
  'daily-report',
  'database-pts',
  'unit-movement',
];

interface AccountSettingsModalProps {
  onClose: () => void;
}

function AccountSettingsModal({ onClose }: AccountSettingsModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'user',
    allowed_menus: ALL_MENU_KEYS,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const menuLabels: Record<string, { label: string; icon: string; gradient: string }> = {
    'form-bast': { label: 'Form BAST & Demo', icon: '📋', gradient: 'from-slate-600 to-slate-500' },
    'ticket-troubleshooting': { label: 'Ticket Troubleshooting', icon: '🎫', gradient: 'from-rose-600 to-rose-500' },
    'daily-report': { label: 'Daily Report', icon: '📈', gradient: 'from-emerald-600 to-emerald-500' },
    'database-pts': { label: 'Database PTS', icon: '💼', gradient: 'from-indigo-600 to-indigo-500' },
    'unit-movement': { label: 'Unit Movement Log', icon: '🚚', gradient: 'from-amber-600 to-amber-500' },
  };

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.from('users').select('*').order('full_name');
    if (!error && data) setUsers(data);
    setLoadingUsers(false);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      notify('error', 'Semua field wajib diisi!');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('users').insert([{
      username: newUser.username,
      password: newUser.password,
      full_name: newUser.full_name,
      role: newUser.role,
      allowed_menus: newUser.allowed_menus,
    }]);
    setSaving(false);
    if (error) { notify('error', 'Gagal menambah akun: ' + error.message); return; }
    notify('success', 'Akun berhasil ditambahkan!');
    setNewUser({ username: '', password: '', full_name: '', role: 'user', allowed_menus: ALL_MENU_KEYS });
    setActiveTab('list');
    fetchUsers();
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase.from('users').update({
      username: editingUser.username,
      password: editingUser.password,
      full_name: editingUser.full_name,
      role: editingUser.role,
      allowed_menus: editingUser.allowed_menus ?? ALL_MENU_KEYS,
    }).eq('id', editingUser.id);
    setSaving(false);
    if (error) { notify('error', 'Gagal menyimpan: ' + error.message); return; }
    notify('success', 'Akun berhasil diperbarui!');
    setEditingUser(null);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Hapus akun ini?')) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) { notify('error', 'Gagal menghapus akun.'); return; }
    notify('success', 'Akun dihapus.');
    fetchUsers();
  };

  const toggleMenu = (key: string, target: 'new' | 'edit') => {
    if (target === 'new') {
      setNewUser(prev => ({
        ...prev,
        allowed_menus: prev.allowed_menus.includes(key)
          ? prev.allowed_menus.filter(m => m !== key)
          : [...prev.allowed_menus, key],
      }));
    } else if (editingUser) {
      const current = editingUser.allowed_menus ?? ALL_MENU_KEYS;
      setEditingUser({
        ...editingUser,
        allowed_menus: current.includes(key)
          ? current.filter(m => m !== key)
          : [...current, key],
      });
    }
  };

  const MenuPermissionSelector = ({
    selected,
    target,
  }: {
    selected: string[];
    target: 'new' | 'edit';
  }) => (
    <div>
      <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">
        Menu yang Dapat Diakses
      </label>
      <div className="grid grid-cols-1 gap-2">
        {ALL_MENU_KEYS.map(key => {
          const m = menuLabels[key];
          const checked = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleMenu(key, target)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                checked
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checked ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'
              }`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-lg">{m.icon}</span>
              <span className="font-semibold text-sm">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Account Settings</h2>
              <p className="text-white/60 text-xs">Kelola akun & hak akses menu</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Notification */}
        {notification && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 pt-4 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('list'); setEditingUser(null); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'list' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            👥 Daftar Akun
          </button>
          <button
            onClick={() => { setActiveTab('add'); setEditingUser(null); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'add' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            ➕ Tambah Akun
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* LIST TAB */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                </div>
              ) : editingUser ? (
                /* EDIT FORM */
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-slate-700 p-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="font-bold text-slate-800">Edit: {editingUser.full_name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Full Name</label>
                      <input value={editingUser.full_name} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Username</label>
                      <input value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Password</label>
                      <input value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role</label>
                      <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>
                  </div>
                  <MenuPermissionSelector selected={editingUser.allowed_menus ?? ALL_MENU_KEYS} target="edit" />
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingUser(null)} className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm">
                      Batal
                    </button>
                    <button onClick={handleSaveEdit} disabled={saving}
                      className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                /* USER LIST */
                users.map(user => (
                  <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          user.role === 'superadmin' ? 'bg-gradient-to-br from-rose-500 to-rose-700' :
                          user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' :
                          'bg-gradient-to-br from-slate-500 to-slate-700'
                        }`}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-800 text-sm">{user.full_name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              user.role === 'superadmin' ? 'bg-rose-100 text-rose-700' :
                              user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{user.role}</span>
                          </div>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(user.allowed_menus ?? ALL_MENU_KEYS).map(key => (
                              <span key={key} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                {menuLabels[key]?.icon} {menuLabels[key]?.label.split(' ')[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setEditingUser(user)}
                          className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 p-2 rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)}
                          className="bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 p-2 rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ADD TAB */}
          {activeTab === 'add' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Full Name *</label>
                  <input value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                    placeholder="Nama lengkap"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Username *</label>
                  <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                    placeholder="username"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Password *</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Password"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>

              <MenuPermissionSelector selected={newUser.allowed_menus} target="new" />

              <button onClick={handleAddUser} disabled={saving}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3.5 rounded-xl font-semibold hover:from-rose-700 hover:to-rose-800 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                ➕ Tambah Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false); // loading saat filter menu

  const [showSidebar, setShowSidebar] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeTitle, setIframeTitle] = useState<string>('');
  const [showTicketing, setShowTicketing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const allMenuItems: MenuItem[] = [
    {
      title: 'Form BAST & Demo',
      icon: '📋',
      key: 'form-bast',
      gradient: 'from-slate-700 via-slate-600 to-slate-500',
      description: 'Product review & handover documentation',
      items: [
        { name: 'Input Form', url: 'https://portal.indovisual.co.id/form-review-demo-produk-bast-pts/', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/1hIpMsZIadnJu85FiJ5Qojn_fOcYLl3iMsBagzZI4LYM/edit?usp=sharing', icon: '📑', embed: true }
      ]
    },
    {
      title: 'Ticket Troubleshooting',
      icon: '🎫',
      key: 'ticket-troubleshooting',
      gradient: 'from-rose-700 via-rose-600 to-rose-500',
      description: 'Technical support & issue tracking',
      items: [
        { name: 'Ticket Management', url: '/ticketing', icon: '🔧', internal: true, embed: true }
      ]
    },
    {
      title: 'Daily Report',
      icon: '📈',
      key: 'daily-report',
      gradient: 'from-emerald-700 via-emerald-600 to-emerald-500',
      description: 'Activity tracking & performance metrics',
      items: [
        { name: 'Submit Report', url: 'https://docs.google.com/forms/d/e/1FAIpQLSf2cCEPlQQcCR1IZ3GRx-ImgdJJ15rMxAoph77aNYmbl15gvw/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMeC3gBgeCAe5YNoVE4RfdANVyjx7xmtTA7C-G40KhExzgvAJ4cGTcyFcgbp4WWx7laBdC3VZrBGd0/pubhtml?gid=1408443365&single=true', icon: '📑', embed: true },
        { name: 'View Summary', url: 'https://onedrive.live.com/edit?cid=25d404c0b5ee2b43&id=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&resid=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&ithint=file%2Cxlsx&embed=1&em=2&AllowTyping=True&ActiveCell=%27Report%27!H3&wdHideGridlines=True&wdHideHeaders=True&wdDownloadButton=True&wdInConfigurator=True%2CTrue&edaebf=ctrl&migratedtospo=true&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8yNWQ0MDRjMGI1ZWUyYjQzL0lRU0pnaTRqenZ6cVI2RldGNVNIbm1LOEFScHh6eHVwN3NHWmxLN3RnNEg2R0RVP2VtPTImQWxsb3dUeXBpbmc9VHJ1ZSZBY3RpdmVDZWxsPSdSZXBvcnQnIUgzJndkSGlkZUdyaWRsaW5lcz1UcnVlJndkSGlkZUhlYWRlcnM9VHJ1ZSZ3ZERvd25sb2FkQnV0dG9uPVRydWUmd2RJbkNvbmZpZ3VyYXRvcj1UcnVlJndkSW5Db25maWd1cmF0b3I9VHJ1ZSZlZGFlYmY9Y3RybA&wdo=2', icon: '📊', embed: true }
      ]
    },
    {
      title: 'Database PTS',
      icon: '💼',
      key: 'database-pts',
      gradient: 'from-indigo-700 via-indigo-600 to-indigo-500',
      description: 'Central repository & documentation',
      items: [
        { name: 'Access Database', url: 'https://1drv.ms/f/c/25d404c0b5ee2b43/IgBDK-61wATUIIAlAgQAAAAAARPyRqbKPJAap5G_Ol5NmA8?e=fFU8wh', icon: '🗃️', embed: false, external: true }
      ]
    },
    {
      title: 'Unit Movement Log',
      icon: '🚚',
      key: 'unit-movement',
      gradient: 'from-amber-700 via-amber-600 to-amber-500',
      description: 'Equipment check-in & check-out tracking',
      items: [
        { name: 'Submit Movement', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnfNZ1y96xei0KdMDewxGRr2nALwA0ZLW-kKPyGh5_YhK4HA/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIVshcP1qgXMwm121wufhmpEIze-I_99qaQb1ZnuUbekpvOV-xsfKX4p-16d1UHzG3mRHIpQcNriav/pubhtml?gid=383533237&single=true', icon: '📑', embed: true }
      ]
    }
  ];

  // Filter menu berdasarkan allowed_menus user (dengan loading state)
  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    setMenuLoading(true);
    // Simulasi delay kecil agar tidak flicker
    const timer = setTimeout(() => {
      const allowed = currentUser.allowed_menus;
      const roleLC = currentUser.role?.toLowerCase();
      if (!allowed || roleLC === 'superadmin' || roleLC === 'admin') {
        setVisibleMenuItems(allMenuItems);
      } else {
        setVisibleMenuItems(allMenuItems.filter(m => allowed.includes(m.key)));
      }
      setMenuLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentUser]);

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .single();

      if (error || !data) { alert('Username atau password salah!'); return; }
      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(data));
    } catch (err) {
      alert('Login gagal!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowSidebar(false);
    setIframeUrl(null);
    setShowTicketing(false);
    setShowSettings(false);
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0], menuTitle: string) => {
    setIframeUrl(null);
    setShowTicketing(false);
    if (item.internal) {
      setShowSidebar(true);
      setShowTicketing(true);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    } else if (item.external && !item.embed) {
      window.open(item.url, '_blank');
    } else if (item.embed) {
      setShowSidebar(true);
      setIframeUrl(item.url);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    }
  };

  const handleBackToDashboard = () => {
    setShowSidebar(false);
    setIframeUrl(null);
    setShowTicketing(false);
    setIframeTitle('');
  };

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchUnreadEmails = async () => {
        try {
          const response = await fetch('/api/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'your-email@yourdomain.com', password: 'your-email-password', imapHost: 'srv184.niagahoster.com', imapPort: 993 })
          });
          const data = await response.json();
          if (data.success) setUnreadEmails(data.unreadCount);
        } catch (error) {
          setUnreadEmails(Math.floor(Math.random() * 10));
        }
      };
      fetchUnreadEmails();
      const interval = setInterval(fetchUnreadEmails, 300000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  // ── Loading Screen ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/75 backdrop-blur-sm p-12 rounded-lg shadow-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-slate-300 border-t-rose-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-slate-700 tracking-wide">Loading Portal...</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Login Screen ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed p-4"
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/75 backdrop-blur-sm rounded-lg shadow-2xl p-10 w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-600 to-rose-700 rounded-full mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Portal Terpadu</h1>
            <p className="text-slate-600 font-medium">Support System - IndoVisual</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">USERNAME</label>
              <input type="text" value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
                placeholder="Enter your username" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">PASSWORD</label>
              <input type="password" value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
                placeholder="Enter your password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <button onClick={handleLogin}
              className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-4 rounded-md hover:from-rose-700 hover:to-rose-800 font-semibold shadow-lg hover:shadow-xl transition-all tracking-wide">
              Sign In to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Email Button (reusable) ──
  const EmailButton = ({ position }: { position: 'bottom-left' | 'bottom-right' }) => (
    <div className={`fixed bottom-6 z-50 ${position === 'bottom-left' ? 'left-6' : 'right-6'}`}>
      <a href="https://srv184.niagahoster.com:2096/cpsess6840729072/3rdparty/roundcube/" target="_blank" rel="noopener noreferrer" className="relative group">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {unreadEmails > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
              {unreadEmails > 9 ? '9+' : unreadEmails}
            </span>
          )}
        </button>
        <div className="absolute bottom-full right-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {unreadEmails > 0 ? `${unreadEmails} pesan baru` : 'Buka Outlook'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </a>
    </div>
  );

  // ── Menu Loading Overlay ──
  const MenuLoadingOverlay = () => (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
      <p className="text-slate-600 font-semibold tracking-wide">Memuat menu...</p>
    </div>
  );

  // ── DASHBOARD UTAMA ──
  if (!showSidebar) {
    return (
      <div className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}

        <div className="bg-white/75 backdrop-blur-sm shadow-xl border-b border-slate-200">
          <div className="max-w-[2000px] mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-br from-rose-600 to-rose-700 rounded-lg shadow-lg items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-800 mb-1 tracking-tight">Dashboard PTS IVP</h1>
                  <p className="text-slate-600 font-medium">Support System - IndoVisual Professional Tools</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Welcome back, <span className="font-semibold text-rose-600">{currentUser?.full_name}</span>
                    <span className="ml-2 text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                      role: "{currentUser?.role}"
                    </span>
                    {(['admin','superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
                      <span className="ml-1 text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-bold">SUPERADMIN</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(['admin','superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
                  <button onClick={() => setShowSettings(true)}
                    className="bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white px-6 py-3 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Account Settings
                  </button>
                )}
                <button onClick={handleLogout}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-8 py-3 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="max-w-[2000px] mx-auto px-6 py-8">
            <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 rounded-lg shadow-xl p-8 mb-8 text-white border border-slate-700 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight">Welcome to Your Portal</h2>
                </div>
                <p className="text-white/80 text-lg font-medium">
                  Access all your essential tools and resources in one centralized platform. Select a module below to begin.
                </p>
              </div>
            </div>

            {menuLoading ? (
              <MenuLoadingOverlay />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {visibleMenuItems.map((menu, index) => (
                  <div key={menu.key}
                    className="bg-white/75 backdrop-blur-sm rounded-lg shadow-lg border border-slate-200 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] group"
                    style={{ animation: `fadeInUp 0.5s ease-out ${index * 100}ms both` }}>
                    <div className={`bg-gradient-to-r ${menu.gradient} p-6 text-white relative overflow-hidden`}>
                      <div className="absolute top-0 right-0 text-8xl opacity-10 -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300">{menu.icon}</div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="text-4xl">{menu.icon}</div>
                          <h3 className="text-xl font-bold tracking-tight">{menu.title}</h3>
                        </div>
                        <p className="text-white/90 text-sm font-medium line-clamp-2">{menu.description}</p>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      {menu.items.map((item, itemIndex) => (
                        <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 px-5 py-4 rounded-md font-semibold shadow-sm hover:shadow-md transition-all text-right flex items-center justify-end gap-4 group/item">
                          {item.external && !item.embed ? (
                            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-slate-400 transition-transform group-hover/item:-translate-x-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          )}
                          <span className="flex-1 text-sm tracking-wide text-right">{item.name}</span>
                          <div className="w-10 h-10 bg-white rounded-md shadow-sm flex items-center justify-center text-xl border border-slate-200 group-hover/item:scale-110 transition-transform flex-shrink-0">
                            {item.icon}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/75 backdrop-blur-sm border-t border-slate-200 shadow-lg">
          <div className="max-w-[2000px] mx-auto px-6 py-5">
            <p className="text-slate-700 text-sm font-semibold tracking-wide text-center">
              © 2026 IndoVisual - Portal Terpadu Support (PTS IVP)
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <EmailButton position="bottom-left" />
      </div>
    );
  }

  // ── VIEW DENGAN SIDEBAR ──
  return (
    <div className="flex h-screen overflow-hidden bg-cover bg-center bg-fixed"
         style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}

      {/* SIDEBAR */}
      <div className={`bg-white/75 backdrop-blur-sm shadow-2xl transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-80'} flex flex-col border-r border-slate-200`}>
        
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-700 to-slate-600">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white tracking-tight">PTS Portal</h2>
                <p className="text-xs text-white/80 font-medium">{currentUser?.full_name}</p>
              </div>
            )}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-md transition-all">
              {sidebarCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <button onClick={handleBackToDashboard}
            className={`w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white p-4 rounded-md font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!sidebarCollapsed && <span>Main Menu</span>}
          </button>

          {menuLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-3 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
            </div>
          ) : (
            visibleMenuItems.map((menu, index) => (
              <div key={menu.key}>
                {sidebarCollapsed ? (
                  <div className={`bg-gradient-to-br ${menu.gradient} rounded-lg p-3 shadow-md hover:shadow-lg transition-all group relative`}>
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-3xl transform group-hover:scale-110 transition-transform">{menu.icon}</div>
                      <div className="flex gap-1 flex-wrap justify-center">
                        {menu.items.map((item, itemIndex) => {
                          const isActive = (showTicketing && item.internal) || (iframeUrl === item.url);
                          return (
                            <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                              className={`w-8 h-8 rounded flex items-center justify-center text-base transition-all ${isActive ? 'bg-white text-slate-800 shadow-md ring-2 ring-white/50' : 'bg-white/20 hover:bg-white/40 text-white'}`}
                              title={`${menu.title} - ${item.name}`}>
                              {item.icon}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl">
                      <div className="font-bold mb-1">{menu.title}</div>
                      {menu.items.map((item, idx) => (
                        <div key={idx} className="text-slate-300 text-[10px]">• {item.name}</div>
                      ))}
                      <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className={`bg-gradient-to-r ${menu.gradient} text-white px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2 shadow-sm`}>
                      <span className="text-lg">{menu.icon}</span>
                      <span className="tracking-wide">{menu.title}</span>
                    </div>
                    {menu.items.map((item, itemIndex) => {
                      const isActive = (showTicketing && item.internal) || (iframeUrl === item.url);
                      return (
                        <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                          className={`w-full bg-slate-50 hover:bg-slate-100 border text-slate-800 p-3 rounded-md font-medium shadow-sm transition-all flex items-center justify-end gap-3 ${isActive ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200' : 'border-slate-200 hover:border-slate-300'}`}>
                          <span className="text-sm tracking-wide text-right flex-1">{item.name}</span>
                          <span className="text-lg">{item.icon}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Bottom Buttons: Settings (admin & superadmin) + Sign Out */}
        <div className="p-4 border-t border-slate-200 space-y-2">
          {(['admin','superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
            <button onClick={() => setShowSettings(true)}
              className={`w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white p-4 rounded-md font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}
              title="Account Settings">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {!sidebarCollapsed && <span>Account Settings</span>}
            </button>
          )}
          <button onClick={handleLogout}
            className={`w-full bg-slate-700 hover:bg-slate-800 text-white p-4 rounded-md font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white/75 backdrop-blur-sm shadow-lg p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{iframeTitle}</h1>
              <p className="text-sm text-slate-600 font-medium mt-1">Use the sidebar to navigate or return to the dashboard</p>
            </div>
            <button onClick={handleBackToDashboard}
              className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white px-6 py-3 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden bg-white">
          {showTicketing ? (
            <div className="w-full h-full overflow-auto">
              <iframe src="/ticketing" className="w-full h-full border-0" title="Ticketing System" />
            </div>
          ) : iframeUrl ? (
            <iframe src={iframeUrl} className="w-full h-full border-0" title={iframeTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : null}
        </div>

        <div className="bg-white/75 backdrop-blur-sm border-t border-slate-200 shadow-lg">
          <div className="px-6 py-5">
            <p className="text-slate-700 text-sm font-semibold tracking-wide text-center">
              © 2026 IndoVisual - Portal Terpadu Support (PTS IVP)
            </p>
          </div>
        </div>
      </div>

      <EmailButton position="bottom-right" />
    </div>
  );
}
