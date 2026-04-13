'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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

// ─── Notification Types ───────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: 'ticket' | 'require' | 'reminder';
  title: string;
  subtitle: string;
  time: string;
  url: string;
  internalUrl?: string;
  menuTitle: string;
}

// ─── Account Settings Modal ──────────────────────────────────────────────────

const ALL_MENU_KEYS = [
  'form-bast',
  'form-require-project',
  'ticket-troubleshooting',
  'daily-report',
  'database-pts',
  'unit-movement',
  'reminder-schedule',
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
    'form-require-project': { label: 'Form Require Project', icon: '🏗️', gradient: 'from-violet-600 to-violet-500' },
    'ticket-troubleshooting': { label: 'Ticket Troubleshooting', icon: '🎫', gradient: 'from-rose-600 to-rose-500' },
    'daily-report': { label: 'Daily Report', icon: '📈', gradient: 'from-emerald-600 to-emerald-500' },
    'database-pts': { label: 'Database PTS', icon: '💼', gradient: 'from-indigo-600 to-indigo-500' },
    'unit-movement': { label: 'Unit Movement Log', icon: '🚚', gradient: 'from-amber-600 to-amber-500' },
    'reminder-schedule': { label: 'Reminder Schedule', icon: '🗓️', gradient: 'from-cyan-600 to-cyan-500' },
  };

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.from('users').select('*').order('full_name');
    if (!error && data) setUsers(data);
    setLoadingUsers(false);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      notify('error', 'Semua field wajib diisi!'); return;
    }
    setSaving(true);
    const { error } = await supabase.from('users').insert([{
      username: newUser.username, password: newUser.password,
      full_name: newUser.full_name, role: newUser.role, allowed_menus: newUser.allowed_menus,
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
      username: editingUser.username, password: editingUser.password,
      full_name: editingUser.full_name, role: editingUser.role,
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

  const MenuPermissionSelector = ({ selected, target }: { selected: string[]; target: 'new' | 'edit' }) => (
    <div>
      <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">Menu yang Dapat Diakses</label>
      <div className="grid grid-cols-1 gap-2">
        {ALL_MENU_KEYS.map(key => {
          const m = menuLabels[key];
          const checked = selected.includes(key);
          return (
            <button key={key} type="button" onClick={() => toggleMenu(key, target)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${checked ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'}`}>
                {checked && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
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
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {notification && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
          </div>
        )}

        <div className="flex border-b border-slate-200 px-6 pt-4 flex-shrink-0">
          <button onClick={() => { setActiveTab('list'); setEditingUser(null); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${activeTab === 'list' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            👥 Daftar Akun
          </button>
          <button onClick={() => { setActiveTab('add'); setEditingUser(null); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${activeTab === 'add' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            ➕ Tambah Akun
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div className="space-y-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                </div>
              ) : editingUser ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-slate-700 p-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="font-bold text-slate-800">Edit: {editingUser.full_name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Full Name</label>
                      <input value={editingUser.full_name} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Username</label>
                      <input value={editingUser.username} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Password</label>
                      <input value={editingUser.password} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role</label>
                      <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                        <option value="user">User</option>
                        <option value="sales">Sales</option>
                        <option value="team_pts">Team PTS</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>
                  </div>
                  <MenuPermissionSelector selected={editingUser.allowed_menus ?? ALL_MENU_KEYS} target="edit" />
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingUser(null)} className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm">Batal</button>
                    <button onClick={handleSaveEdit} disabled={saving}
                      className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                          style={{ background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', color: '#c8861d', border: '2px solid rgba(200,134,29,0.3)' }}>
                          {user.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-sm truncate">{user.full_name}</p>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                          <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-slate-200 text-slate-600">{user.role}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setEditingUser(user)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all">Edit</button>
                        <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all">Hapus</button>
                      </div>
                    </div>
                    {user.allowed_menus && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {user.allowed_menus.map(key => (
                          <span key={key} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-600">
                            {menuLabels[key]?.icon} {menuLabels[key]?.label ?? key}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Full Name *</label>
                  <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" placeholder="Nama lengkap" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Username *</label>
                  <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" placeholder="username" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Password *</label>
                  <input value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" placeholder="password" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                    <option value="user">User</option>
                    <option value="sales">Sales</option>
                    <option value="team_pts">Team PTS</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>
              <MenuPermissionSelector selected={newUser.allowed_menus} target="new" />
              <button onClick={handleAddUser} disabled={saving}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
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

// ─── Notification Bell Component ─────────────────────────────────────────────

interface NotifBellProps {
  icon: string;
  label: string;
  count: number;
  color: string;
  bgColor: string;
  borderColor: string;
  dotColor: string;
  items: NotificationItem[];
  onItemClick: (item: NotificationItem) => void;
}

function NotifBell({ icon, label, count, color, bgColor, borderColor, dotColor, items, onItemClick }: NotifBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Baru saja';
    if (diffMins < 60) return `${diffMins}m lalu`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}j lalu`;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  };

  return (
    <div ref={ref} className="relative flex-shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: count > 0 ? bgColor : 'rgba(255,255,255,0.55)',
          border: `1.5px solid ${count > 0 ? borderColor : 'rgba(0,0,0,0.1)'}`,
          boxShadow: count > 0 ? `0 2px 12px ${borderColor}55` : 'none',
        }}
      >
        <span className="text-base leading-none">{icon}</span>
        <span className="text-xs font-bold hidden sm:block" style={{ color: count > 0 ? color : '#64748b' }}>{label}</span>
        {count > 0 && (
          <span
            className="flex items-center justify-center rounded-full text-white font-black text-[10px] min-w-[18px] h-[18px] px-1 animate-pulse"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}88` }}
          >
            {count > 99 ? '99+' : count}
          </span>
        )}
        {count === 0 && (
          <span className="text-[10px] font-semibold text-slate-400">0</span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute top-full mt-2 right-0 z-[200] rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 320,
            background: 'rgba(255,255,255,0.97)',
            border: `1.5px solid ${borderColor}`,
            backdropFilter: 'blur(16px)',
            boxShadow: `0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px ${borderColor}33`,
            animation: 'dropIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: bgColor, borderBottom: `1px solid ${borderColor}44` }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-bold" style={{ color }}>{label}</span>
            </div>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: dotColor }}>
                {count} baru
              </span>
            )}
          </div>

          {/* Items */}
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-3xl opacity-40">✅</span>
                <p className="text-xs text-slate-400 font-medium">Tidak ada notifikasi</p>
              </div>
            ) : (
              items.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => { onItemClick(item); setOpen(false); }}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100/80 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate leading-tight">{item.title}</p>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.subtitle}</p>
                  </div>
                  <span className="text-[10px] text-slate-400 flex-shrink-0 mt-0.5">{formatTime(item.time)}</span>
                </button>
              ))
            )}
          </div>

          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100">
              <p className="text-[10px] text-center text-slate-400 font-medium">Klik item untuk membuka</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notification Bar Component ───────────────────────────────────────────────

interface NotificationBarProps {
  currentUser: User;
  onNavigate: (internalUrl: string, title: string) => void;
}

function NotificationBar({ currentUser, onNavigate }: NotificationBarProps) {
  const [ticketNotifs, setTicketNotifs]   = useState<NotificationItem[]>([]);
  const [requireNotifs, setRequireNotifs] = useState<NotificationItem[]>([]);
  const [reminderNotifs, setReminderNotifs] = useState<NotificationItem[]>([]);
  const [lastFetch, setLastFetch]         = useState(0);

  const roleLC = currentUser.role?.toLowerCase() ?? '';
  const isPTS  = ['admin', 'superadmin', 'team_pts', 'team'].includes(roleLC);
  const isAdmin = ['admin', 'superadmin'].includes(roleLC);

  const fetchAll = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetch < 15000) return; // debounce 15s
    setLastFetch(now);

    // ── 1. Ticket Troubleshooting ──
    try {
      let q = supabase.from('tickets').select('id, project_name, issue_case, assigned_to, status, created_at').neq('status', 'Solved');
      if (isAdmin) {
        // Admin: lihat semua Waiting Approval + semua Pending/In Progress
        q = q.in('status', ['Waiting Approval', 'Pending', 'In Progress', 'Call', 'Onsite']);
      } else {
        // Team: hanya yang di-assign ke mereka
        const { data: member } = await supabase
          .from('team_members')
          .select('name')
          .eq('username', currentUser.username)
          .maybeSingle();
        if (member?.name) {
          q = q.eq('assigned_to', member.name).in('status', ['Pending', 'In Progress', 'Call', 'Onsite']);
        } else {
          q = q.eq('assigned_to', currentUser.full_name).in('status', ['Pending', 'In Progress', 'Call', 'Onsite']);
        }
      }
      const { data } = await q.order('created_at', { ascending: false }).limit(20);
      if (data) {
        setTicketNotifs(data.map((t: any) => ({
          id: t.id,
          type: 'ticket' as const,
          title: t.project_name,
          subtitle: `${t.status} · ${t.issue_case}`,
          time: t.created_at,
          url: '/ticketing',
          internalUrl: '/ticketing',
          menuTitle: 'Ticket Troubleshooting',
        })));
      }
    } catch {}

    // ── 2. Form Require Project ──
    try {
      let q = supabase.from('project_requests').select('id, project_name, requester_name, status, created_at, requester_id');
      if (isPTS) {
        // PTS/Admin: semua yang pending approval atau baru
        q = q.in('status', ['pending', 'approved', 'in_progress']);
      } else {
        // User biasa / sales: hanya milik sendiri
        q = q.eq('requester_id', currentUser.id).neq('status', 'completed').neq('status', 'rejected');
      }
      const { data } = await q.order('created_at', { ascending: false }).limit(20);
      if (data) {
        setRequireNotifs(data.map((r: any) => ({
          id: r.id,
          type: 'require' as const,
          title: r.project_name,
          subtitle: `${r.status === 'pending' ? '⏳ Menunggu Approval' : r.status === 'approved' ? '✅ Approved' : '🔄 In Progress'} · ${r.requester_name}`,
          time: r.created_at,
          url: '/form-require-project',
          internalUrl: '/form-require-project',
          menuTitle: 'Form Require Project',
        })));
      }
    } catch {}

    // ── 3. Reminder Schedule ──
    try {
      let q = supabase.from('reminders').select('id, title, category, due_date, due_time, assigned_to, assigned_name, status, created_at');
      if (roleLC === 'team') {
        q = q.eq('assigned_to', currentUser.username).eq('status', 'pending');
      } else {
        q = q.eq('status', 'pending');
      }
      const { data } = await q.order('due_date', { ascending: true }).limit(20);
      if (data) {
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
        // Prioritaskan yang hari ini dan besok
        const prioritized = [...(data as any[])].sort((a, b) => {
          const aToday = a.due_date === today || a.due_date === tomorrow ? -1 : 0;
          const bToday = b.due_date === today || b.due_date === tomorrow ? -1 : 0;
          return aToday - bToday;
        });
        setReminderNotifs(prioritized.map((r: any) => ({
          id: r.id,
          type: 'reminder' as const,
          title: r.title,
          subtitle: `${r.category} · ${r.due_date === today ? '📅 Hari ini' : r.due_date === tomorrow ? '⏰ Besok' : r.due_date} ${r.due_time} · ${r.assigned_name}`,
          time: r.created_at,
          url: '/reminder-schedule',
          internalUrl: '/reminder-schedule',
          menuTitle: 'Reminder Schedule',
        })));
      }
    } catch {}
  }, [currentUser, lastFetch, isPTS, isAdmin, roleLC]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // Realtime subscriptions
  useEffect(() => {
    const ch1 = supabase.channel('dash-notif-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
        setLastFetch(0); // reset debounce
        setTimeout(fetchAll, 500);
      })
      .subscribe();
    const ch2 = supabase.channel('dash-notif-requires')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_requests' }, () => {
        setLastFetch(0);
        setTimeout(fetchAll, 500);
      })
      .subscribe();
    const ch3 = supabase.channel('dash-notif-reminders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => {
        setLastFetch(0);
        setTimeout(fetchAll, 500);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
      supabase.removeChannel(ch3);
    };
  }, [fetchAll]);

  const handleClick = (item: NotificationItem) => {
    if (item.internalUrl) {
      onNavigate(item.internalUrl, item.menuTitle);
    }
  };

  const totalCount = ticketNotifs.length + requireNotifs.length + reminderNotifs.length;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
      style={{
        background: totalCount > 0 ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.45)',
        border: totalCount > 0 ? '1.5px solid rgba(0,0,0,0.12)' : '1.5px solid rgba(0,0,0,0.07)',
        backdropFilter: 'blur(12px)',
        boxShadow: totalCount > 0 ? '0 2px 16px rgba(0,0,0,0.10)' : 'none',
      }}
    >
      {/* Total badge */}
      {totalCount > 0 && (
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-200 mr-1">
          <div className="relative">
            <div className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)' }}>
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce">
              {totalCount > 9 ? '9+' : totalCount}
            </span>
          </div>
          <span className="text-[10px] font-bold text-slate-600 hidden md:block">Notif</span>
        </div>
      )}

      {/* Ticket Bell */}
      <NotifBell
        icon="🎫"
        label="Ticket"
        count={ticketNotifs.length}
        color="#dc2626"
        bgColor="rgba(254,242,242,0.9)"
        borderColor="rgba(252,165,165,0.8)"
        dotColor="#ef4444"
        items={ticketNotifs}
        onItemClick={handleClick}
      />

      {/* Require Bell */}
      <NotifBell
        icon="🏗️"
        label="Require"
        count={requireNotifs.length}
        color="#7c3aed"
        bgColor="rgba(245,243,255,0.9)"
        borderColor="rgba(196,181,253,0.8)"
        dotColor="#8b5cf6"
        items={requireNotifs}
        onItemClick={handleClick}
      />

      {/* Reminder Bell */}
      <NotifBell
        icon="⏰"
        label="Reminder"
        count={reminderNotifs.length}
        color="#0891b2"
        bgColor="rgba(236,254,255,0.9)"
        borderColor="rgba(103,232,249,0.8)"
        dotColor="#06b6d4"
        items={reminderNotifs}
        onItemClick={handleClick}
      />
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
  const [menuLoading, setMenuLoading] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeTitle, setIframeTitle] = useState<string>('');
  const [showTicketing, setShowTicketing] = useState(false);
  const [internalUrl, setInternalUrl] = useState<string>('/ticketing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [formRequireNotifCount, setFormRequireNotifCount] = useState(0);

  const allMenuItems: MenuItem[] = [
    {
      title: 'Reminder Schedule', icon: '🗓️', key: 'reminder-schedule',
      gradient: 'from-cyan-700 via-cyan-600 to-teal-500',
      description: 'Jadwal & reminder pekerjaan team PTS',
      items: [{ name: 'Reminder', url: '/reminder-schedule', icon: '⏰', internal: true, embed: true }]
    },
    {
      title: 'Form Require Project', icon: '🏗️', key: 'form-require-project',
      gradient: 'from-violet-700 via-violet-600 to-violet-500',
      description: 'Solution request form untuk project Sales & Account',
      items: [{ name: 'Submit Require', url: '/form-require-project', icon: '📋', internal: true, embed: true }]
    },
    {
      title: 'Form BAST & Demo', icon: '📋', key: 'form-bast',
      gradient: 'from-slate-700 via-slate-600 to-slate-500',
      description: 'Product review & handover documentation',
      items: [
        { name: 'Input Form', url: 'https://portal.indovisual.co.id/form-review-demo-produk-bast-pts/', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/1hIpMsZIadnJu85FiJ5Qojn_fOcYLl3iMsBagzZI4LYM/edit?usp=sharing', icon: '📑', embed: true }
      ]
    },
    {
      title: 'Ticket Troubleshooting', icon: '🎫', key: 'ticket-troubleshooting',
      gradient: 'from-rose-700 via-rose-600 to-rose-500',
      description: 'Technical support & issue tracking',
      items: [{ name: 'Ticket Management', url: '/ticketing', icon: '🔧', internal: true, embed: true }]
    },
    {
      title: 'Daily Report', icon: '📈', key: 'daily-report',
      gradient: 'from-emerald-700 via-emerald-600 to-emerald-500',
      description: 'Activity tracking & performance metrics',
      items: [
        { name: 'Submit Report', url: 'https://docs.google.com/forms/d/e/1FAIpQLSf2cCEPlQQcCR1IZ3GRx-ImgdJJ15rMxAoph77aNYmbl15gvw/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMeC3gBgeCAe5YNoVE4RfdANVyjx7xmtTA7C-G40KhExzgvAJ4cGTcyFcgbp4WWx7laBdC3VZrBGd0/pubhtml?gid=1408443365&single=true', icon: '📑', embed: true },
        { name: 'View Summary', url: 'https://onedrive.live.com/edit?cid=25d404c0b5ee2b43&id=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&resid=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&ithint=file%2Cxlsx&embed=1&em=2&AllowTyping=True&ActiveCell=%27Report%27!H3&wdHideGridlines=True&wdHideHeaders=True&wdDownloadButton=True&wdInConfigurator=True%2CTrue&edaebf=ctrl&migratedtospo=true', icon: '📊', embed: true }
      ]
    },
    {
      title: 'Database PTS', icon: '💼', key: 'database-pts',
      gradient: 'from-indigo-700 via-indigo-600 to-indigo-500',
      description: 'Central repository & documentation',
      items: [{ name: 'Access Database', url: 'https://1drv.ms/f/c/25d404c0b5ee2b43/IgBDK-61wATUIIAlAgQAAAAAARPyRqbKPJAap5G_Ol5NmA8?e=fFU8wh', icon: '🗃️', embed: false, external: true }]
    },
    {
      title: 'Unit Movement Log', icon: '🚚', key: 'unit-movement',
      gradient: 'from-amber-700 via-amber-600 to-amber-500',
      description: 'Equipment check-in & check-out tracking',
      items: [
        { name: 'Submit Movement', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnfNZ1y96xei0KdMDewxGRr2nALwA0ZLW-kKPyGh5_YhK4HA/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIVshcP1qgXMwm121wufhmpEIze-I_99qaQb1ZnuUbekpvOV-xsfKX4p-16d1UHzG3mRHIpQcNriav/pubhtml?gid=383533237&single=true', icon: '📑', embed: true }
      ]
    },
  ];

  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    setMenuLoading(true);
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

  // Legacy bottom bell (kept for backward compat, hidden when notif bar shows)
  useEffect(() => {
    if (!currentUser || !['admin', 'superadmin', 'team_pts', 'team'].includes(currentUser.role?.toLowerCase() ?? '')) return;
    const fetchPending = async () => {
      const { count } = await supabase.from('project_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setFormRequireNotifCount(count ?? 0);
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('username', loginForm.username).eq('password', loginForm.password).single();
      if (error || !data) { alert('Username atau password salah!'); return; }
      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(data));
    } catch { alert('Login gagal!'); }
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowSidebar(false); setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing'); setShowSettings(false);
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0], menuTitle: string) => {
    setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing');
    if (item.internal) {
      setShowSidebar(true); setShowTicketing(true);
      setInternalUrl(item.url);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    } else if (item.external && !item.embed) {
      window.open(item.url, '_blank');
    } else if (item.embed) {
      setShowSidebar(true); setIframeUrl(item.url);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    }
  };

  // Handler for notification bar navigation
  const handleNotifNavigate = (navInternalUrl: string, title: string) => {
    setIframeUrl(null);
    setShowTicketing(true);
    setInternalUrl(navInternalUrl);
    setIframeTitle(title);
    setShowSidebar(true);
  };

  const handleBackToDashboard = () => {
    setShowSidebar(false); setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing'); setIframeTitle('');
  };

  useEffect(() => {
    const load = async () => {
      const saved = localStorage.getItem('currentUser');
      if (!saved) { setLoading(false); return; }
      try {
        const parsed: User = JSON.parse(saved);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
        const { data, error } = await supabase.from('users').select('*').eq('id', parsed.id).single();
        if (!error && data) {
          const fresh = data as User;
          setCurrentUser(fresh);
          localStorage.setItem('currentUser', JSON.stringify(fresh));
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <div className="bg-white/75 backdrop-blur-sm p-12 rounded-lg shadow-2xl border border-slate-200">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-slate-300 border-t-rose-600 rounded-full animate-spin"></div>
          <p className="text-lg font-medium text-slate-700 tracking-wide">Loading Portal...</p>
        </div>
      </div>
    </div>
  );

  if (!isLoggedIn) return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed p-4" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <div className="bg-white/75 backdrop-blur-sm rounded-lg shadow-2xl p-10 w-full max-w-md border border-slate-200">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-600 to-rose-700 rounded-full mb-4 shadow-lg">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Work Management</h1>
          <p className="text-slate-600 font-medium">Support System - IndoVisual</p>
        </div>
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">USERNAME</label>
            <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
              placeholder="Enter your username" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">PASSWORD</label>
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
              placeholder="Enter your password" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          </div>
          <button onClick={handleLogin} className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-4 rounded-md hover:from-rose-700 hover:to-rose-800 font-semibold shadow-lg hover:shadow-xl transition-all tracking-wide">
            Sign In to Portal
          </button>
        </div>
      </div>
    </div>
  );

  const MenuLoadingOverlay = () => (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
      <p className="text-slate-600 font-semibold tracking-wide">Memuat menu...</p>
    </div>
  );

  const PROJECT_KEYS = ['reminder-schedule', 'form-require-project', 'ticket-troubleshooting', 'form-bast'];
  const INTERNAL_KEYS = ['daily-report', 'database-pts', 'unit-movement'];

  const projectMenuItems = visibleMenuItems.filter(m => PROJECT_KEYS.includes(m.key));
  const internalMenuItems = visibleMenuItems.filter(m => INTERNAL_KEYS.includes(m.key));

  const renderMenuCard = (menu: MenuItem, index: number, _accentColor: string) => (
    <div
      key={menu.key}
      className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/60 hover:-translate-y-1"
      style={{ animation: `fadeInUp 0.5s ease forwards`, animationDelay: `${index * 80}ms`, opacity: 0 }}
    >
      <div className={`bg-gradient-to-br ${menu.gradient} p-6 relative overflow-hidden`}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white" />
          <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-white" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="text-4xl">{menu.icon}</div>
            <h3 className="text-xl font-bold tracking-tight text-white leading-tight">{menu.title}</h3>
            {menu.key === 'form-require-project' && formRequireNotifCount > 0 && (
              <span className="absolute top-3 right-3 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                {formRequireNotifCount}
              </span>
            )}
          </div>
          <p className="text-white/90 text-sm font-medium line-clamp-2">{menu.description}</p>
        </div>
      </div>
      <div className="p-5 space-y-3">
        {menu.items.map((item, itemIndex) => (
          <button
            key={itemIndex}
            onClick={() => handleMenuClick(item, menu.title)}
            className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 px-5 py-4 rounded-md font-semibold shadow-sm hover:shadow-md transition-all text-right flex items-center justify-end gap-4 group/item"
          >
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
  );

  if (!showSidebar) return (
    <div className="min-h-screen flex flex-col bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}

      {/* ── HEADER ── */}
      <div className="bg-white/80 backdrop-blur-md shadow-md border-b border-slate-200/70" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">

            {/* LEFT: Logo */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl shadow-md flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">Work Management Portal</h1>
                </div>
                <p className="text-slate-500 text-xs font-medium mt-0.5">IndoVisual Professional Tools</p>
              </div>
            </div>

            {/* CENTER: Notification Bar */}
            {currentUser && (
              <div className="flex-1 flex justify-center px-4">
                <NotificationBar
                  currentUser={currentUser}
                  onNavigate={handleNotifNavigate}
                />
              </div>
            )}

            {/* RIGHT: User + Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* User badge */}
              <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-slate-200/80 bg-white/70 backdrop-blur-sm">
                <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', color: '#78350f' }}>
                  {currentUser?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>
                <div className="leading-tight">
                  <p className="text-xs font-bold text-slate-800">{currentUser?.full_name}</p>
                  <p className="text-[9px] font-bold tracking-widest uppercase text-amber-600">{currentUser?.role}</p>
                </div>
              </div>

              {(['admin', 'superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
                <button onClick={() => setShowSettings(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', color: '#4338ca' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.08)'; }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Settings
                </button>
              )}
              <button onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.22)', color: '#b91c1c' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.13)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.07)'; }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 overflow-y-auto py-8 px-4 md:px-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {menuLoading ? <MenuLoadingOverlay /> : (
            <>
              {projectMenuItems.length > 0 && (
                <div style={{ animation: 'fadeInUp 0.45s ease forwards', opacity: 0 }}>
                  <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-xl"
                    style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #38bdf8, #0284c7)' }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-white font-bold text-sm tracking-wide">Project</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {projectMenuItems.map((menu, i) => renderMenuCard(menu, i, '#0ea5e9'))}
                  </div>
                </div>
              )}

              {internalMenuItems.length > 0 && (
                <div style={{ animation: 'fadeInUp 0.45s ease 0.1s forwards', opacity: 0 }}>
                  <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-xl"
                    style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-white font-bold text-sm tracking-wide">Internal Daily</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {internalMenuItems.map((menu, i) => renderMenuCard(menu, i, '#10b981'))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div className="bg-white/70 backdrop-blur-sm border-t border-slate-200/60">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <p className="text-slate-500 text-xs font-medium tracking-wide text-center">© 2026 IndoVisual — Work Management Support (PTS IVP)</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dropIn { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );

  // ── VIEW DENGAN SIDEBAR ──
  return (
    <div className="flex h-screen overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}

      {/* SIDEBAR */}
      <div className={`relative flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[72px]' : 'w-[288px]'}`}
        style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '4px 0 24px rgba(0,0,0,0.12)' }}>
        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #c8861d, transparent)' }} />

        <div className={`flex items-center border-b px-4 py-5 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`} style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #e2a84b, #c8861d)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#c8861d' }}>IndoVisual</p>
                <p className="font-bold text-sm leading-none tracking-wide" style={{ color: '#0f172a' }}>PTS Portal</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #e2a84b, #c8861d)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 rounded-md transition-all hover:bg-black/10 text-slate-400 hover:text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" /></svg>
            </button>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="mx-4 my-4 px-4 py-3 rounded-xl flex items-center gap-3" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold" style={{ background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', color: '#c8861d', border: '2px solid rgba(200,134,29,0.4)' }}>
              {currentUser?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-slate-900 text-xs font-bold truncate">{currentUser?.full_name}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#b8760d' }}>{currentUser?.role}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: 'none' }}>
          <button onClick={handleBackToDashboard}
            className={`w-full group flex items-center gap-3 px-3 py-2.5 mb-4 rounded-xl font-semibold text-sm transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ background: 'linear-gradient(135deg, rgba(200,134,29,0.12), rgba(200,134,29,0.06))', border: '1px solid rgba(200,134,29,0.3)', color: '#92600a' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,134,29,0.22), rgba(200,134,29,0.14))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,134,29,0.12), rgba(200,134,29,0.06))'; }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!sidebarCollapsed && <span className="tracking-wide">Main Menu</span>}
          </button>

          {!sidebarCollapsed && <p className="px-1 mb-3 text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(0,0,0,0.45)' }}>Navigation</p>}

          {menuLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(226,168,75,0.4)', borderTopColor: '#e2a84b' }}></div>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleMenuItems.map((menu) => (
                <div key={menu.key}>
                  {sidebarCollapsed ? (
                    <div className="group relative">
                      <div className="w-full rounded-xl p-2.5 flex flex-col items-center gap-1.5 cursor-default transition-all" style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <span className="text-xl relative">
                          {menu.icon}
                          {menu.key === 'form-require-project' && formRequireNotifCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{formRequireNotifCount}</span>
                          )}
                        </span>
                        <div className="flex flex-col gap-1 w-full">
                          {menu.items.map((item, itemIndex) => {
                            const isActive = (showTicketing && item.internal && internalUrl === item.url) || (iframeUrl === item.url);
                            return (
                              <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)} title={`${menu.title} — ${item.name}`}
                                className="w-full h-7 rounded-lg flex items-center justify-center text-sm transition-all"
                                style={isActive ? { background: 'rgba(200,134,29,0.18)', border: '1px solid rgba(200,134,29,0.45)', color: '#b8760d' } : { background: 'rgba(0,0,0,0.05)', border: '1px solid transparent', color: '#64748b' }}>
                                {item.icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}>
                        <div className="rounded-xl px-4 py-3 min-w-[160px]" style={{ background: '#f8fafc', border: '1px solid rgba(200,134,29,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                          <p className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: '#b8760d' }}>{menu.title}</p>
                          {menu.items.map((item, idx) => <p key={idx} className="text-xs text-slate-500 leading-5">{item.icon} {item.name}</p>)}
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent" style={{ borderRightColor: '#f8fafc' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                      <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'rgba(0,0,0,0.05)' }}>
                        <span className="text-base relative">
                          {menu.icon}
                          {menu.key === 'form-require-project' && formRequireNotifCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{formRequireNotifCount}</span>
                          )}
                        </span>
                        <span className="text-xs font-bold tracking-widest uppercase truncate" style={{ color: 'rgba(15,23,42,0.65)' }}>{menu.title}</span>
                      </div>
                      <div className="px-2 py-2 space-y-1" style={{ background: 'rgba(255,255,255,0.4)' }}>
                        {menu.items.map((item, itemIndex) => {
                          const isActive = (showTicketing && item.internal && internalUrl === item.url) || (iframeUrl === item.url);
                          return (
                            <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all"
                              style={isActive ? { background: 'rgba(200,134,29,0.12)', border: '1px solid rgba(200,134,29,0.3)', color: '#92600a' } : { background: 'transparent', border: '1px solid transparent', color: '#1e293b' }}
                              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; } }}
                              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#1e293b'; } }}>
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0" style={{ background: isActive ? 'rgba(200,134,29,0.15)' : 'rgba(0,0,0,0.06)' }}>{item.icon}</span>
                              <span className="truncate tracking-wide">{item.name}</span>
                              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#b8760d' }} />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          {sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(false)} className="w-full flex justify-center p-2 rounded-xl transition-all text-slate-400 hover:text-slate-700" style={{ background: 'rgba(0,0,0,0.05)' }} title="Expand sidebar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" /></svg>
            </button>
          )}
          <div className={`flex gap-2 ${sidebarCollapsed ? 'flex-col' : ''}`}>
            {(['admin', 'superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
              <button onClick={() => setShowSettings(true)} title="Account Settings"
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${sidebarCollapsed ? 'w-full px-2' : 'flex-1 px-3'}`}
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#4338ca' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.12)'; }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!sidebarCollapsed && <span>Settings</span>}
              </button>
            )}
            <button onClick={handleLogout} title="Sign Out"
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${sidebarCollapsed ? 'w-full px-2' : 'flex-1 px-3'}`}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-y-auto">
        <>
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
                <iframe src={internalUrl} className="w-full h-full border-0" title={iframeTitle} />
              </div>
            ) : iframeUrl ? (
              <iframe src={iframeUrl} className="w-full h-full border-0" title={iframeTitle} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : null}
          </div>

          <div className="bg-white/75 backdrop-blur-sm border-t border-slate-200 shadow-lg">
            <div className="px-6 py-5">
              <p className="text-slate-700 text-sm font-semibold tracking-wide text-center">© 2026 IndoVisual - Work Management Support (PTS IVP)</p>
            </div>
          </div>
        </>
      </div>

      <style jsx>{`
        @keyframes dropIn { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
