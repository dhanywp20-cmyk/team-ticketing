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
  team_type?: string;
  phone_number?: string;
  sales_division?: string;
  jabatan?: string;
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

const SALES_DIVISIONS = [
  'IVP', 'MLDS', 'HAVS', 'Enterprise', 'DEC', 'ICS', 'POJ', 'VOJ', 'LOCOS',
  'VISIONMEDIA', 'UMP', 'BISOL', 'KIMS', 'IDC', 'IOCMEDAN', 'IOCPekanbaru',
  'IOCBandung', 'IOCJATENG', 'MVISEMARANG', 'POSSurabaya', 'IOCSurabaya',
  'IOCBali', 'SGP', 'OSS',
];

// Hierarki jabatan — urutan dari bawah ke atas
const JABATAN_LIST = ['Staff', 'Supervisor', 'Manager', 'General Manager', 'Direktur'] as const;
type JabatanType = typeof JABATAN_LIST[number];

const JABATAN_CONFIG: Record<JabatanType, { icon: string; color: string; bg: string; border: string; tier: number }> = {
  'Staff':           { icon: '👤', color: '#374151', bg: '#f9fafb',   border: '#d1d5db', tier: 1 },
  'Supervisor':      { icon: '👥', color: '#1e40af', bg: '#eff6ff',   border: '#93c5fd', tier: 2 },
  'Manager':         { icon: '🏅', color: '#7e22ce', bg: '#faf5ff',   border: '#c4b5fd', tier: 3 },
  'General Manager': { icon: '🎖️', color: '#b45309', bg: '#fffbeb',   border: '#fcd34d', tier: 4 },
  'Direktur':        { icon: '👑', color: '#991b1b', bg: '#fff1f2',   border: '#fca5a5', tier: 5 },
};

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
  const [searchQuery, setSearchQuery] = useState('');
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'guest',
    team_type: '',
    sales_division: '',
    jabatan: '',
    allowed_menus: ALL_MENU_KEYS,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const menuLabels: Record<string, { label: string; icon: string; gradient: string }> = {
    'form-bast': { label: 'Form Review Demo & BAST', icon: '⭐', gradient: 'from-slate-600 to-slate-500' },
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
    if (newUser.role === 'guest' && !newUser.sales_division) {
      notify('error', 'Sales Division wajib diisi untuk role Guest!'); return;
    }
    setSaving(true);
    const insertPayload: Record<string, unknown> = {
      username: newUser.username,
      password: newUser.password,
      full_name: newUser.full_name,
      role: newUser.role,
      allowed_menus: newUser.allowed_menus,
      jabatan: newUser.jabatan || null,
    };
    if (newUser.role === 'team') insertPayload.team_type = newUser.team_type || null;
    if (newUser.role === 'guest' || newUser.role === 'sales') {
      insertPayload.sales_division = newUser.sales_division || null;
    }
    const { error } = await supabase.from('users').insert([insertPayload]);
    setSaving(false);
    if (error) { notify('error', 'Gagal menambah akun: ' + error.message); return; }
    notify('success', 'Akun berhasil ditambahkan!');
    setNewUser({ username: '', password: '', full_name: '', role: 'guest', team_type: '', sales_division: '', jabatan: '', allowed_menus: ALL_MENU_KEYS });
    setActiveTab('list');
    fetchUsers();
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    const updatePayload: Record<string, unknown> = {
      username: editingUser.username,
      password: editingUser.password,
      full_name: editingUser.full_name,
      role: editingUser.role,
      allowed_menus: editingUser.allowed_menus ?? ALL_MENU_KEYS,
      jabatan: editingUser.jabatan ?? null,
    };
    if (editingUser.role === 'team') updatePayload.team_type = editingUser.team_type ?? null;
    else if (editingUser.team_type === 'Pending Approval') {
      updatePayload.team_type = null;
      updatePayload.sales_division = editingUser.sales_division ?? null;
    }
    if (editingUser.role === 'guest' || editingUser.role === 'sales') {
      updatePayload.sales_division = editingUser.sales_division ?? null;
    }
    const { error } = await supabase.from('users').update(updatePayload).eq('id', editingUser.id);
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

  function MenuPermissionSelector({ selected, target }: { selected: string[]; target: 'new' | 'edit' }) {
    const toggle = (key: string) => {
      if (target === 'new') {
        setNewUser(u => ({ ...u, allowed_menus: u.allowed_menus.includes(key) ? u.allowed_menus.filter(k => k !== key) : [...u.allowed_menus, key] }));
      } else if (editingUser) {
        const cur = editingUser.allowed_menus ?? ALL_MENU_KEYS;
        setEditingUser({ ...editingUser, allowed_menus: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] });
      }
    };
    return (
      <div>
        <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">Menu Access</label>
        <div className="grid grid-cols-1 gap-1.5">
          {ALL_MENU_KEYS.map(key => {
            const m = menuLabels[key];
            const checked = selected.includes(key);
            return (
              <button key={key} type="button" onClick={() => toggle(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${checked ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
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
  }

  const filteredUsers = users.filter(u =>
    !searchQuery ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
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
          {(['list', 'add'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setEditingUser(null); }}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-all mr-1 ${activeTab === tab ? 'border-rose-500 text-rose-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab === 'list' ? `👥 Daftar Akun (${users.length})` : '➕ Tambah Akun'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama, username, atau role..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all" />
              </div>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-rose-600 border-rose-200 animate-spin" /></div>
              ) : (
                <>
                  {editingUser ? (
                    <div className="space-y-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-800">✏️ Edit: {editingUser.full_name}</h3>
                        <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold mb-1 text-slate-600 uppercase tracking-widest">Full Name</label>
                          <input value={editingUser.full_name} onChange={e => setEditingUser({ ...editingUser, full_name: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 text-slate-600 uppercase tracking-widest">Username</label>
                          <input value={editingUser.username} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 text-slate-600 uppercase tracking-widest">Password</label>
                          <input value={editingUser.password} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400" />
                        </div>
                        <div>
                          <label className="block text-xs font-bold mb-1 text-slate-600 uppercase tracking-widest">Role</label>
                          <select value={editingUser.role} onChange={e => setEditingUser({ ...editingUser, role: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white">
                            <option value="superadmin">Superadmin</option>
                            <option value="admin">Admin</option>
                            <option value="team">Team</option>
                            <option value="guest">Guest</option>
                          </select>
                        </div>
                        {editingUser.role === 'team' && (
                          <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600 uppercase tracking-widest">Team Type</label>
                            <div className="flex gap-2">
                              {['Team PTS', 'Team Services'].map(t => (
                                <button key={t} type="button" onClick={() => setEditingUser({ ...editingUser, team_type: t })}
                                  className={`flex-1 py-2 rounded-lg border-2 text-xs font-bold transition-all ${editingUser.team_type === t ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                                  {t === 'Team PTS' ? '🏗️' : '🔧'} {t}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {(editingUser.role === 'guest' || editingUser.role === 'sales') && (
                          <div>
                            <label className="block text-xs font-bold mb-1 text-slate-600 uppercase tracking-widest">Sales Division</label>
                            <select value={editingUser.sales_division || ''} onChange={e => setEditingUser({ ...editingUser, sales_division: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white">
                              <option value="">-- Pilih Divisi --</option>
                              {SALES_DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
                            </select>
                          </div>
                        )}
                        <div className="col-span-2">
                          <label className="block text-xs font-bold mb-1 text-slate-600 uppercase tracking-widest">Jabatan / Posisi</label>
                          <select value={editingUser.jabatan || ''} onChange={e => setEditingUser({ ...editingUser, jabatan: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-400 bg-white">
                            <option value="">— Pilih Jabatan —</option>
                            {JABATAN_LIST.map(j => <option key={j} value={j}>{JABATAN_CONFIG[j].icon} {j}</option>)}
                          </select>
                        </div>
                      </div>
                      <MenuPermissionSelector selected={editingUser.allowed_menus ?? ALL_MENU_KEYS} target="edit" />
                      <div className="flex gap-3 pt-2">
                        <button onClick={handleSaveEdit} disabled={saving} className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 text-white py-2.5 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                          {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                          💾 Simpan Perubahan
                        </button>
                        <button onClick={() => setEditingUser(null)} className="px-6 py-2.5 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 text-sm transition-all">Batal</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredUsers.map(user => (
                        <div key={user.id} className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-all">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', color: '#78350f' }}>
                            {user.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{user.full_name}</p>
                            <p className="text-xs text-slate-500">@{user.username}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-slate-200 text-slate-600">{user.role}</span>
                              {user.jabatan && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">🏷️ {user.jabatan}</span>
                              )}
                              {user.team_type && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-rose-100 text-rose-600 border border-rose-200">👥 {user.team_type}</span>
                              )}
                              {user.sales_division && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase bg-violet-100 text-violet-600 border border-violet-200">🏢 {user.sales_division}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-shrink-0">
                            <button onClick={() => setEditingUser(user)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition-all">Edit</button>
                            <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-all">Hapus</button>
                          </div>
                        </div>
                      ))}
                      {filteredUsers.length === 0 && (
                        <div className="text-center py-10 text-slate-400 text-sm">
                          <div className="text-3xl mb-2">🔍</div>
                          Tidak ada akun yang cocok
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
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
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role *</label>
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                    <option value="superadmin">Superadmin</option>
                    <option value="admin">Admin</option>
                    <option value="team">Team</option>
                    <option value="guest">Guest</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Jabatan / Posisi</label>
                  <select value={newUser.jabatan} onChange={e => setNewUser({ ...newUser, jabatan: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                    <option value="">— Pilih Jabatan —</option>
                    {JABATAN_LIST.map(j => <option key={j} value={j}>{JABATAN_CONFIG[j].icon} {j}</option>)}
                  </select>
                </div>
                </div>
              </div>
              {newUser.role === 'team' && (
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">Team Type</label>
                  <div className="flex gap-2">
                    {['Team PTS', 'Team Services'].map(t => (
                      <button key={t} type="button" onClick={() => setNewUser({ ...newUser, team_type: t })}
                        className={`flex-1 py-2.5 rounded-lg border-2 text-xs font-bold transition-all ${newUser.team_type === t ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                        {t === 'Team PTS' ? '🏗️' : '🔧'} {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {(newUser.role === 'guest' || newUser.role === 'sales') && (
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">Sales Division {newUser.role === 'guest' ? '*' : ''}</label>
                  <select value={newUser.sales_division} onChange={e => setNewUser({ ...newUser, sales_division: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                    <option value="">-- Pilih Divisi --</option>
                    {SALES_DIVISIONS.map(div => <option key={div} value={div}>{div}</option>)}
                  </select>
                </div>
              )}
              <MenuPermissionSelector selected={newUser.allowed_menus} target="new" />
              <button onClick={handleAddUser} disabled={saving}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                ➕ Tambah Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UserProfileModal ─────────────────────────────────────────────────────────

const ALL_MENU_LABELS: Record<string, { label: string; icon: string }> = {
  'form-bast': { label: 'Form Review Demo & BAST', icon: '⭐' },
  'form-require-project': { label: 'Form Require Project', icon: '🏗️' },
  'ticket-troubleshooting': { label: 'Ticket Troubleshooting', icon: '🎫' },
  'daily-report': { label: 'Daily Report', icon: '📈' },
  'database-pts': { label: 'Database PTS', icon: '💼' },
  'unit-movement': { label: 'Unit Movement Log', icon: '🚚' },
  'reminder-schedule': { label: 'Reminder Schedule', icon: '🗓️' },
};

const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-rose-100 text-rose-700 border-rose-200',
  admin: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  team: 'bg-blue-100 text-blue-700 border-blue-200',
  team_pts: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  guest: 'bg-amber-100 text-amber-700 border-amber-200',
};

interface UserProfileModalProps {
  currentUser: User;
  onClose: () => void;
}

function UserProfileModal({ currentUser, onClose }: UserProfileModalProps) {
  const [userData, setUserData] = useState<User>(currentUser);
  const [editPhone, setEditPhone] = useState(false);
  const [phoneInput, setPhoneInput] = useState(currentUser.phone_number || '');
  const [editPassword, setEditPassword] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [supervisors, setSupervisors] = useState<{ full_name: string; phone_number?: string; sales_division?: string; jabatan?: string }[]>([]);
  const [subordinates, setSubordinates] = useState<{ full_name: string; username: string; sales_division?: string; jabatan?: string }[]>([]);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
      if (data) { setUserData(data); setPhoneInput(data.phone_number || ''); }

      const { data: supMaps } = await supabase.from('user_supervisor_mappings').select('supervisor_id').eq('user_id', currentUser.id);
      if (supMaps && supMaps.length > 0) {
        const ids = supMaps.map((s: any) => s.supervisor_id);
        const { data: sups } = await supabase.from('users').select('full_name, phone_number, sales_division, jabatan').in('id', ids);
        if (sups) setSupervisors(sups);
      }

      const { data: subMaps } = await supabase.from('user_supervisor_mappings').select('user_id').eq('supervisor_id', currentUser.id);
      if (subMaps && subMaps.length > 0) {
        const ids = subMaps.map((s: any) => s.user_id);
        const { data: subUsers } = await supabase.from('users').select('full_name, username, sales_division, jabatan').in('id', ids);
        if (subUsers) setSubordinates(subUsers);
      }
    })();
  }, []);

  const handleSavePhone = async () => {
    setSaving(true);
    const { error } = await supabase.from('users').update({ phone_number: phoneInput.trim() }).eq('id', currentUser.id);
    if (error) { notify('error', 'Gagal menyimpan nomor telepon.'); }
    else {
      notify('success', 'Nomor WhatsApp berhasil diperbarui!');
      setEditPhone(false);
      const stored = localStorage.getItem('currentUser');
      if (stored) { const p = JSON.parse(stored); p.phone_number = phoneInput.trim(); localStorage.setItem('currentUser', JSON.stringify(p)); }
      const { data } = await supabase.from('users').select('*').eq('id', currentUser.id).single();
      if (data) setUserData(data);
    }
    setSaving(false);
  };

  const handleSavePassword = async () => {
    if (!passwordInput || passwordInput.length < 6) { notify('error', 'Password minimal 6 karakter.'); return; }
    if (passwordInput !== confirmPassword) { notify('error', 'Konfirmasi password tidak cocok.'); return; }
    setSaving(true);
    const { error } = await supabase.from('users').update({ password: passwordInput }).eq('id', currentUser.id);
    if (error) { notify('error', 'Gagal mengubah password.'); }
    else { notify('success', 'Password berhasil diubah!'); setEditPassword(false); setPasswordInput(''); setConfirmPassword(''); }
    setSaving(false);
  };

  const roleClass = ROLE_BADGE[userData.role?.toLowerCase()] || 'bg-slate-100 text-slate-700 border-slate-200';
  const initials = userData.full_name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  const jabatanCfg = userData.jabatan ? JABATAN_CONFIG[userData.jabatan as JabatanType] : null;

  // Sort supervisors by jabatan tier descending (Direktur first)
  const sortedSupervisors = [...supervisors].sort((a, b) => {
    const ta = a.jabatan ? (JABATAN_CONFIG[a.jabatan as JabatanType]?.tier ?? 0) : 0;
    const tb = b.jabatan ? (JABATAN_CONFIG[b.jabatan as JabatanType]?.tier ?? 0) : 0;
    return tb - ta;
  });

  // Sort subordinates by jabatan tier descending
  const sortedSubordinates = [...subordinates].sort((a, b) => {
    const ta = a.jabatan ? (JABATAN_CONFIG[a.jabatan as JabatanType]?.tier ?? 0) : 0;
    const tb = b.jabatan ? (JABATAN_CONFIG[b.jabatan as JabatanType]?.tier ?? 0) : 0;
    return tb - ta;
  });

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto flex flex-col border border-slate-200">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">User Profile</h2>
              <p className="text-white/60 text-xs">Informasi pribadi akun Anda</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {notification && (
          <div className={`mx-5 mt-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
          </div>
        )}

        <div className="p-5 space-y-4">

          {/* ── IDENTITY CARD ── */}
          <div className="rounded-2xl border-2 overflow-hidden" style={{ borderColor: jabatanCfg?.border ?? '#e2e8f0' }}>
            {/* Avatar row */}
            <div className="flex items-center gap-4 px-5 py-4" style={{ background: jabatanCfg ? `linear-gradient(135deg, ${jabatanCfg.bg}, white)` : 'linear-gradient(135deg, #f8fafc, white)' }}>
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-black text-xl flex-shrink-0 shadow-sm"
                style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', color: '#78350f' }}>
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-black text-slate-900 text-lg leading-tight truncate">{userData.full_name}</p>
                <p className="text-slate-500 text-sm font-medium">@{userData.username}</p>
                {jabatanCfg ? (
                  <div className="inline-flex items-center gap-1.5 mt-1.5 px-2.5 py-1 rounded-full text-xs font-bold border"
                    style={{ background: jabatanCfg.bg, color: jabatanCfg.color, borderColor: jabatanCfg.border }}>
                    <span className="text-sm">{jabatanCfg.icon}</span>
                    {userData.jabatan}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-1 italic">Jabatan belum diset</p>
                )}
              </div>
            </div>

            {/* Detail grid */}
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-2 divide-x divide-slate-100">
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Role Sistem</p>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold border ${roleClass}`}>{userData.role}</span>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tim / Type</p>
                  <p className="text-sm font-semibold text-slate-700">{userData.team_type && userData.team_type !== 'Pending Approval' ? userData.team_type : <span className="text-slate-400 italic">—</span>}</p>
                </div>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sales Division</p>
                <p className="text-sm font-semibold text-slate-700">{userData.sales_division || <span className="text-slate-400 italic">—</span>}</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nomor WhatsApp</p>
                {editPhone ? (
                  <div className="space-y-2 mt-1">
                    <input type="text" value={phoneInput} onChange={e => setPhoneInput(e.target.value)} placeholder="Contoh: 628123456789"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
                    <p className="text-[10px] text-slate-400">Format internasional, tanpa spasi. Contoh: 628123456789</p>
                    <div className="flex gap-2">
                      <button onClick={handleSavePhone} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                        {saving ? 'Menyimpan...' : 'Simpan'}
                      </button>
                      <button onClick={() => { setEditPhone(false); setPhoneInput(userData.phone_number || ''); }}
                        className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-all">Batal</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">
                      {userData.phone_number
                        ? <span className="text-emerald-700">📱 {userData.phone_number}</span>
                        : <span className="text-rose-500 italic text-xs">⚠️ Belum diisi — wajib untuk notifikasi WA</span>}
                    </p>
                    <button onClick={() => setEditPhone(true)} className="text-xs text-indigo-600 font-bold hover:underline ml-2 flex-shrink-0">Edit</button>
                  </div>
                )}
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Password</p>
                {editPassword ? (
                  <div className="space-y-2 mt-1">
                    <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} placeholder="Password baru (min. 6 karakter)"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Konfirmasi password baru"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
                    <div className="flex gap-2">
                      <button onClick={handleSavePassword} disabled={saving} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all">
                        {saving ? 'Menyimpan...' : 'Simpan Password'}
                      </button>
                      <button onClick={() => { setEditPassword(false); setPasswordInput(''); setConfirmPassword(''); }}
                        className="px-4 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-all">Batal</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-slate-400 tracking-widest">••••••••</p>
                    <button onClick={() => setEditPassword(true)} className="text-xs text-indigo-600 font-bold hover:underline ml-2 flex-shrink-0">Ubah</button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── HIERARKI ATASAN ── */}
          {sortedSupervisors.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-amber-200">
              <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔺</span>
                  <span className="font-bold text-amber-800 text-sm">Hierarki Atasan Anda</span>
                </div>
                <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">{sortedSupervisors.length} orang</span>
              </div>
              <div className="divide-y divide-amber-100">
                {sortedSupervisors.map((sup, i) => {
                  const cfg = sup.jabatan ? JABATAN_CONFIG[sup.jabatan as JabatanType] : null;
                  return (
                    <div key={i} className="px-4 py-3 flex items-center gap-3 bg-white hover:bg-amber-50/40 transition-colors">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
                        style={{ background: cfg?.bg ?? '#f1f5f9', border: `1.5px solid ${cfg?.border ?? '#e2e8f0'}` }}>
                        {cfg?.icon ?? '👤'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{sup.full_name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {sup.jabatan && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: cfg?.bg, color: cfg?.color, border: `1px solid ${cfg?.border}` }}>
                              {cfg?.icon} {sup.jabatan}
                            </span>
                          )}
                          {sup.sales_division && <span className="text-[10px] text-slate-500 font-medium">🏢 {sup.sales_division}</span>}
                          {sup.phone_number && <span className="text-[10px] text-slate-500">📱 {sup.phone_number}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="px-4 py-2 bg-amber-50 border-t border-amber-100">
                <p className="text-[10px] text-amber-600 font-medium">✉️ Semua atasan di atas otomatis di-CC via WA setiap ada ticket / jadwal yang terkait dengan Anda.</p>
              </div>
            </div>
          )}

          {/* ── BAWAHAN ── */}
          {sortedSubordinates.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-indigo-200">
              <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">🔻</span>
                  <span className="font-bold text-indigo-800 text-sm">Bawahan Anda</span>
                </div>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full border border-indigo-200">{sortedSubordinates.length} orang</span>
              </div>
              <div className="p-3 flex flex-wrap gap-2 bg-white">
                {sortedSubordinates.map((sub, i) => {
                  const cfg = sub.jabatan ? JABATAN_CONFIG[sub.jabatan as JabatanType] : null;
                  return (
                    <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl border text-xs"
                      style={{ background: cfg?.bg ?? '#f8fafc', borderColor: cfg?.border ?? '#e2e8f0' }}>
                      <span className="text-base flex-shrink-0">{cfg?.icon ?? '👤'}</span>
                      <div>
                        <p className="font-bold" style={{ color: cfg?.color ?? '#374151' }}>{sub.full_name}</p>
                        <p className="text-[10px] text-slate-500">{sub.jabatan || '—'}{sub.sales_division ? ` · ${sub.sales_division}` : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── MENU AKSES ── */}
          {userData.role?.toLowerCase() !== 'superadmin' && userData.role?.toLowerCase() !== 'admin' && userData.allowed_menus && userData.allowed_menus.length > 0 && (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2"><span>🗂️</span><span className="font-bold text-slate-700 text-sm">Menu yang Dapat Diakses</span></div>
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-1.5">
                {userData.allowed_menus.map(key => {
                  const m = ALL_MENU_LABELS[key];
                  if (!m) return null;
                  return <span key={key} className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700">{m.icon} {m.label}</span>;
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UserManagementModal ──────────────────────────────────────────────────────

interface UserManagementModalProps {
  onClose: () => void;
}

function UserManagementModal({ onClose }: UserManagementModalProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [mappings, setMappings] = useState<{ id: string; user_id: string; supervisor_id: string }[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [searchUser, setSearchUser] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedSupervisorId, setSelectedSupervisorId] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');

  const notify = (type: 'success' | 'error' | 'info', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoadingData(true);
    const [usersRes, mappingsRes] = await Promise.all([
      supabase.from('users').select('id, username, full_name, role, team_type, sales_division, phone_number').order('full_name'),
      supabase.from('user_supervisor_mappings').select('*'),
    ]);
    if (usersRes.data) setAllUsers(usersRes.data);
    if (mappingsRes.data) setMappings(mappingsRes.data);
    setLoadingData(false);
  };

  const getUserById = (id: string) => allUsers.find(u => u.id === id);

  const handleAddMapping = async () => {
    if (!selectedUserId || !selectedSupervisorId) { notify('error', 'Pilih user dan supervisor terlebih dahulu.'); return; }
    if (selectedUserId === selectedSupervisorId) { notify('error', 'User dan supervisor tidak boleh sama.'); return; }
    const existing = mappings.find(m => m.user_id === selectedUserId && m.supervisor_id === selectedSupervisorId);
    if (existing) { notify('info', 'Mapping ini sudah ada.'); return; }
    // Multiple supervisors allowed — no deletion of old mapping
    setSaving(true);
    const { error } = await supabase.from('user_supervisor_mappings').insert([{ user_id: selectedUserId, supervisor_id: selectedSupervisorId }]);
    if (error) { notify('error', 'Gagal menyimpan mapping: ' + error.message); }
    else {
      notify('success', 'Mapping berhasil ditambahkan!');
      setSelectedUserId(''); setSelectedSupervisorId('');
      setActiveTab('list');
      await fetchAll();
    }
    setSaving(false);
  };

  const handleDeleteMapping = async (mappingId: string) => {
    if (!confirm('Hapus mapping ini?')) return;
    const { error } = await supabase.from('user_supervisor_mappings').delete().eq('id', mappingId);
    if (error) { notify('error', 'Gagal menghapus.'); return; }
    notify('success', 'Mapping dihapus.');
    await fetchAll();
  };

  const supervisorCandidates = allUsers.filter(u => u.role?.toLowerCase() !== 'guest' || u.sales_division === 'IVP' || !!u.jabatan);

  // All non-superadmin users can be mapped
  const mappableUsers = allUsers;

  const filteredMappings = mappings.filter(m => {
    const user = getUserById(m.user_id);
    const sup = getUserById(m.supervisor_id);
    const q = searchUser.toLowerCase();
    return !q || user?.full_name?.toLowerCase().includes(q) || user?.username?.toLowerCase().includes(q) || sup?.full_name?.toLowerCase().includes(q);
  });

  const getRolePill = (user: User | undefined) => {
    if (!user) return null;
    const r = user.role?.toLowerCase();
    const cls = r === 'admin' || r === 'superadmin' ? 'bg-indigo-100 text-indigo-700' : r === 'guest' && user.sales_division === 'IVP' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600';
    const label = r === 'guest' && user.sales_division === 'IVP' ? '🔗 IVP Sales' : r === 'admin' ? '⚙️ Admin' : r === 'superadmin' ? '👑 Superadmin' : `👥 ${user.team_type || user.role}`;
    return <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${cls}`}>{label}</span>;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col border border-slate-200">
        <div className="bg-gradient-to-r from-teal-700 to-teal-600 px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">User Management</h2>
              <p className="text-white/60 text-xs">Mapping atasan / supervisor ke users</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="px-6 py-3 bg-teal-50 border-b border-teal-100 flex items-start gap-2.5">
          <span className="text-base flex-shrink-0">ℹ️</span>
          <p className="text-xs text-teal-800 leading-relaxed">
            Mapping ini menentukan siapa <strong>atasan/supervisor</strong> dari setiap user — bisa <strong>lebih dari satu</strong> untuk mendukung multi-layer hierarchy (misal: staff → manager → director). Semua atasan yang ter-mapping akan otomatis <strong>di-CC melalui WhatsApp</strong> saat ada ticket.
          </p>
        </div>

        {notification && (
          <div className={`mx-5 mt-3 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 flex-shrink-0 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : notification.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
            {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'} {notification.msg}
          </div>
        )}

        <div className="flex border-b border-slate-200 px-5 pt-3 flex-shrink-0">
          {(['list', 'add'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-all mr-1 ${activeTab === tab ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {tab === 'list' ? `📋 Daftar Mapping (${mappings.length})` : '➕ Tambah Mapping'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {activeTab === 'list' && (
            <>
              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                <input type="text" value={searchUser} onChange={e => setSearchUser(e.target.value)} placeholder="Cari nama atau username..."
                  className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
              </div>

              {/* Hierarchy legend */}
              <div className="flex items-center gap-1.5 flex-wrap mb-4 px-1">
                {JABATAN_LIST.map((j, idx) => {
                  const cfg = JABATAN_CONFIG[j];
                  return (
                    <div key={j} className="flex items-center gap-1">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border"
                        style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.border }}>
                        {cfg.icon} {j}
                      </span>
                      {idx < JABATAN_LIST.length - 1 && <span className="text-slate-300 text-xs">→</span>}
                    </div>
                  );
                })}
              </div>

              {loadingData ? (
                <div className="flex items-center justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-teal-600 border-teal-200 animate-spin" /></div>
              ) : filteredMappings.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <p className="text-3xl mb-2">🗂️</p>
                  <p className="font-semibold">Belum ada mapping</p>
                  <p className="text-xs mt-1">Klik &ldquo;Tambah Mapping&rdquo; untuk mulai memetakan atasan ke users</p>
                </div>
              ) : (
                (() => {
                  // Group by user_id first
                  const grouped: Record<string, typeof filteredMappings> = {};
                  filteredMappings.forEach(m => {
                    if (!grouped[m.user_id]) grouped[m.user_id] = [];
                    grouped[m.user_id].push(m);
                  });

                  // Sort users by jabatan tier ascending (Staff first)
                  const sortedEntries = Object.entries(grouped).sort(([aId], [bId]) => {
                    const ua = getUserById(aId);
                    const ub = getUserById(bId);
                    const ta = ua?.jabatan ? (JABATAN_CONFIG[ua.jabatan as JabatanType]?.tier ?? 0) : 0;
                    const tb = ub?.jabatan ? (JABATAN_CONFIG[ub.jabatan as JabatanType]?.tier ?? 0) : 0;
                    return ta - tb;
                  });

                  // Group by jabatan tier for section headers
                  const byTier: Record<string, typeof sortedEntries> = {};
                  sortedEntries.forEach(entry => {
                    const user = getUserById(entry[0]);
                    const tierLabel = user?.jabatan ?? 'Lainnya';
                    if (!byTier[tierLabel]) byTier[tierLabel] = [];
                    byTier[tierLabel].push(entry);
                  });

                  return (
                    <div className="space-y-5">
                      {Object.entries(byTier).map(([tierLabel, entries]) => {
                        const cfg = JABATAN_CONFIG[tierLabel as JabatanType];
                        return (
                          <div key={tierLabel}>
                            {/* Tier section header */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border"
                                style={cfg ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border } : { background: '#f1f5f9', color: '#475569', borderColor: '#cbd5e1' }}>
                                <span>{cfg?.icon ?? '👤'}</span>
                                <span>{tierLabel}</span>
                                <span className="ml-1 opacity-60">({entries.length})</span>
                              </div>
                              <div className="flex-1 h-px bg-slate-200" />
                            </div>

                            {/* Cards for this tier */}
                            <div className="space-y-2 pl-1">
                              {entries.map(([userId, userMappings]) => {
                                const user = getUserById(userId);
                                const userCfg = user?.jabatan ? JABATAN_CONFIG[user.jabatan as JabatanType] : null;

                                // Sort supervisors by tier desc (highest first)
                                const sortedSups = [...userMappings].sort((a, b) => {
                                  const sa = getUserById(a.supervisor_id);
                                  const sb = getUserById(b.supervisor_id);
                                  const ta2 = sa?.jabatan ? (JABATAN_CONFIG[sa.jabatan as JabatanType]?.tier ?? 0) : 0;
                                  const tb2 = sb?.jabatan ? (JABATAN_CONFIG[sb.jabatan as JabatanType]?.tier ?? 0) : 0;
                                  return tb2 - ta2;
                                });

                                return (
                                  <div key={userId} className="rounded-xl border overflow-hidden"
                                    style={{ borderColor: userCfg?.border ?? '#e2e8f0' }}>
                                    {/* User row */}
                                    <div className="flex items-center gap-3 px-4 py-3"
                                      style={{ background: userCfg ? `${userCfg.bg}99` : '#f8fafc' }}>
                                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0"
                                        style={{ background: 'linear-gradient(135deg, #fde68a, #f59e0b)', color: '#78350f' }}>
                                        {user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p className="font-bold text-slate-900 text-sm">{user?.full_name || userId}</p>
                                          {getRolePill(user)}
                                          {user?.sales_division && (
                                            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">🏢 {user.sales_division}</span>
                                          )}
                                        </div>
                                        <p className="text-[11px] text-slate-400 mt-0.5">@{user?.username}</p>
                                      </div>
                                    </div>

                                    {/* Chain of supervisors */}
                                    <div className="bg-white divide-y divide-slate-100">
                                      {sortedSups.map((m, idx) => {
                                        const sup = getUserById(m.supervisor_id);
                                        const supCfg = sup?.jabatan ? JABATAN_CONFIG[sup.jabatan as JabatanType] : null;
                                        return (
                                          <div key={m.id} className="flex items-center gap-3 px-4 py-2.5">
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                              <div className="w-px h-4 bg-slate-300 ml-3" />
                                              <span className="text-slate-400 text-xs">↳</span>
                                            </div>
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-base flex-shrink-0"
                                              style={{ background: supCfg?.bg ?? '#f1f5f9', border: `1px solid ${supCfg?.border ?? '#e2e8f0'}` }}>
                                              {supCfg?.icon ?? '👤'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-1.5 flex-wrap">
                                                <p className="font-semibold text-sm" style={{ color: supCfg?.color ?? '#374151' }}>{sup?.full_name || m.supervisor_id}</p>
                                                {sup?.jabatan && (
                                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                                    style={{ background: supCfg?.bg, color: supCfg?.color, borderColor: supCfg?.border }}>
                                                    {supCfg?.icon} {sup.jabatan}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-2 mt-0.5">
                                                <p className="text-[10px] text-slate-400">@{sup?.username}</p>
                                                {sup?.phone_number && <span className="text-[10px] text-emerald-600">📱 {sup.phone_number}</span>}
                                                {!sup?.phone_number && <span className="text-[10px] text-rose-400">⚠️ No WA</span>}
                                              </div>
                                            </div>
                                            <button onClick={() => handleDeleteMapping(m.id)}
                                              className="flex-shrink-0 p-1 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 hover:text-red-600 transition-all"
                                              title="Hapus mapping">
                                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </>
          )}

          {activeTab === 'add' && (
            <div className="max-w-xl space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                <strong>Catatan:</strong> Satu user bisa punya <strong>lebih dari satu atasan</strong> (multi-layer hierarchy). Tambahkan mapping sebanyak yang dibutuhkan. Semua atasan yang ter-mapping akan di-CC via WA saat ada ticket.
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">👤 User (Bawahan)</label>
                <select value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all appearance-none bg-white">
                  <option value="">— Pilih User —</option>
                  {mappableUsers.filter(u => u.id !== selectedSupervisorId).map(u => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} (@{u.username}){u.jabatan ? ` · ${u.jabatan}` : ''}{u.sales_division ? ` [${u.sales_division}]` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">👨‍💼 Atasan / Supervisor</label>
                <select value={selectedSupervisorId} onChange={e => setSelectedSupervisorId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all appearance-none bg-white">
                  <option value="">— Pilih Atasan —</option>
                  {JABATAN_LIST.slice().reverse().map(tier => {
                    const tieredUsers = supervisorCandidates.filter(u => u.jabatan === tier);
                    if (tieredUsers.length === 0) return null;
                    const cfg = JABATAN_CONFIG[tier];
                    return (
                      <optgroup key={tier} label={`${cfg.icon} ${tier}`}>
                        {tieredUsers.map(u => (
                          <option key={u.id} value={u.id} disabled={u.id === selectedUserId}>
                            {u.full_name} (@{u.username}){u.sales_division ? ` [${u.sales_division}]` : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                  {/* Users without jabatan */}
                  {supervisorCandidates.filter(u => !u.jabatan).length > 0 && (
                    <optgroup label="— Jabatan Belum Diset">
                      {supervisorCandidates.filter(u => !u.jabatan).map(u => (
                        <option key={u.id} value={u.id} disabled={u.id === selectedUserId}>
                          {u.full_name} (@{u.username}){u.sales_division ? ` [${u.sales_division}]` : ''}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                {selectedSupervisorId && (() => {
                  const sup = getUserById(selectedSupervisorId);
                  return sup && !sup.phone_number ? (
                    <p className="text-[10px] text-amber-600 mt-1.5">⚠️ Atasan ini belum punya nomor WhatsApp — notifikasi CC tidak akan terkirim. Minta dia isi nomor di User Profile.</p>
                  ) : null;
                })()}
              </div>
              {selectedUserId && selectedSupervisorId && (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-sm">
                  <p className="font-bold text-teal-800 mb-3 text-xs uppercase tracking-widest">Preview Mapping:</p>
                  <div className="flex items-center gap-3">
                    {/* Bawahan */}
                    <div className="flex-1 bg-white rounded-xl p-3 border border-slate-200">
                      {(() => {
                        const u = getUserById(selectedUserId);
                        const cfg = u?.jabatan ? JABATAN_CONFIG[u.jabatan as JabatanType] : null;
                        return (
                          <>
                            <p className="font-bold text-slate-800 text-sm">{u?.full_name}</p>
                            <p className="text-[10px] text-slate-400">@{u?.username}</p>
                            {u?.jabatan && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                style={{ background: cfg?.bg, color: cfg?.color, borderColor: cfg?.border }}>
                                {cfg?.icon} {u.jabatan}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <div className="w-px h-3 bg-teal-400" />
                      <span className="text-teal-600 font-black text-lg">↑</span>
                      <p className="text-[9px] text-teal-600 font-bold">atasan</p>
                    </div>
                    {/* Atasan */}
                    <div className="flex-1 bg-white rounded-xl p-3 border border-teal-300">
                      {(() => {
                        const u = getUserById(selectedSupervisorId);
                        const cfg = u?.jabatan ? JABATAN_CONFIG[u.jabatan as JabatanType] : null;
                        return (
                          <>
                            <p className="font-bold text-teal-900 text-sm">{u?.full_name}</p>
                            <p className="text-[10px] text-slate-400">@{u?.username}</p>
                            {u?.jabatan && (
                              <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-1.5 py-0.5 rounded border"
                                style={{ background: cfg?.bg, color: cfg?.color, borderColor: cfg?.border }}>
                                {cfg?.icon} {u.jabatan}
                              </span>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}
              <button onClick={handleAddMapping} disabled={saving || !selectedUserId || !selectedSupervisorId}
                className="w-full py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-50 text-white"
                style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
                {saving ? '⏳ Menyimpan...' : '💾 Simpan Mapping'}
              </button>
            </div>
          )}
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 rounded-b-2xl flex-shrink-0">
          <p className="text-[10px] text-slate-400">
            Requires table: <code className="bg-slate-200 px-1 rounded">user_supervisor_mappings</code> (id, user_id, supervisor_id) — <strong>tanpa</strong> unique constraint pada user_id agar support multiple atasan. Tambahkan kolom <code className="bg-slate-200 px-1 rounded">jabatan</code> di tabel <code className="bg-slate-200 px-1 rounded">users</code>.
          </p>
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
          <span className="flex items-center justify-center rounded-full text-white font-black text-[10px] min-w-[18px] h-[18px] px-1 animate-pulse"
            style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}88` }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
        {count === 0 && <span className="text-[10px] font-semibold text-slate-400">0</span>}
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 z-[9999] rounded-2xl shadow-2xl overflow-hidden"
          style={{
            width: 320,
            background: 'rgba(255,255,255,0.97)',
            border: `1.5px solid ${borderColor}`,
            backdropFilter: 'blur(16px)',
            boxShadow: `0 8px 40px rgba(0,0,0,0.18), 0 0 0 1px ${borderColor}33`,
            animation: 'dropIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ background: bgColor, borderBottom: `1px solid ${borderColor}44` }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-bold" style={{ color }}>{label}</span>
            </div>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: dotColor }}>{count} baru</span>
            )}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="text-3xl opacity-40">✅</span>
                <p className="text-xs text-slate-400 font-medium">Tidak ada notifikasi</p>
              </div>
            ) : (
              items.map((item) => (
                <button key={item.id} onClick={() => { onItemClick(item); setOpen(false); }}
                  className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100/80 last:border-0">
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
  const [reviewNotifs, setReviewNotifs]   = useState<NotificationItem[]>([]);

  const roleLC = (currentUser.role ?? '').trim().toLowerCase();
  const teamType = (currentUser.team_type ?? '').trim();
  const isTeamServices = roleLC === 'team' && teamType === 'Team Services';
  const isTeamPTS = roleLC === 'team' && teamType === 'Team PTS';
  const isPTS  = ['admin', 'superadmin'].includes(roleLC) || isTeamPTS;
  const isAdmin = ['admin', 'superadmin'].includes(roleLC);

  const fetchAll = useCallback(async () => {
    let assignedName: string = currentUser.full_name;
    let memberTeamType: string = teamType;
    try {
      const { data: allMembers } = await supabase.from('team_members').select('name, team_type, username');
      if (allMembers && allMembers.length > 0) {
        const found = (allMembers as any[]).find(m =>
          (m.username ?? '').toLowerCase().trim() === currentUser.username.toLowerCase().trim()
        );
        if (found?.name) assignedName = found.name;
        if (found?.team_type) memberTeamType = found.team_type;
      }
    } catch { /* fallback */ }

    // ── 1. Ticket Troubleshooting ──
    try {
      if (isAdmin) {
        const { data } = await supabase.from('tickets').select('id, project_name, issue_case, assign_name, status, created_at').neq('status', 'Solved').order('created_at', { ascending: false }).limit(50);
        setTicketNotifs((data ?? []).map((t: any) => ({ id: t.id, type: 'ticket' as const, title: t.project_name, subtitle: `${t.status} · ${t.issue_case}`, time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting' })));
      } else if (roleLC === 'guest') {
        const { data: mappings } = await supabase.from('guest_mappings').select('project_name').eq('guest_username', currentUser.username);
        const mapped = (mappings ?? []).map((m: any) => m.project_name as string);
        let q = supabase.from('tickets').select('id, project_name, issue_case, assign_name, status, created_at').neq('status', 'Solved');
        if (mapped.length > 0) {
          q = q.or(`created_by.eq.${currentUser.username},project_name.in.(${mapped.map((p: string) => `"${p}"`).join(',')})`);
        } else {
          q = q.eq('created_by', currentUser.username);
        }
        const { data } = await q.order('created_at', { ascending: false }).limit(30);
        setTicketNotifs((data ?? []).map((t: any) => ({ id: t.id, type: 'ticket' as const, title: t.project_name, subtitle: `${t.status} · ${t.issue_case}`, time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting' })));
      } else if (roleLC === 'team' || roleLC === 'team_pts') {
        if (memberTeamType === 'Team Services') {
          const { data } = await supabase.from('tickets').select('id, project_name, issue_case, assign_name, status, services_status, created_at').eq('assign_name', assignedName).neq('services_status', 'Solved').not('services_status', 'is', null).order('created_at', { ascending: false }).limit(30);
          setTicketNotifs((data ?? []).map((t: any) => ({ id: t.id, type: 'ticket' as const, title: t.project_name, subtitle: `Svc: ${t.services_status} · ${t.issue_case}`, time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting' })));
        } else {
          const { data } = await supabase.from('tickets').select('id, project_name, issue_case, assign_name, status, created_at').eq('assign_name', assignedName).neq('status', 'Solved').order('created_at', { ascending: false }).limit(30);
          setTicketNotifs((data ?? []).map((t: any) => ({ id: t.id, type: 'ticket' as const, title: t.project_name, subtitle: `${t.status} · ${t.issue_case}`, time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting' })));
        }
      }
    } catch (e) { console.error('[notif] ticket fetch error:', e); }

    // ── 2. Form Require Project ──
    try {
      if (isAdmin) {
        const { data } = await supabase.from('project_requests').select('id, project_name, status, sales_name, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(20);
        setRequireNotifs((data ?? []).map((r: any) => ({ id: r.id, type: 'require' as const, title: r.project_name, subtitle: `⏳ Pending Approval · ${r.sales_name}`, time: r.created_at, url: '/form-require-project', internalUrl: '/form-require-project', menuTitle: 'Form Require Project' })));
      } else if (isPTS && !isAdmin) {
        const { data } = await supabase.from('project_requests').select('id, project_name, status, sales_name, assign_name, created_at').eq('assign_name', assignedName).neq('status', 'completed').neq('status', 'rejected').order('created_at', { ascending: false }).limit(20);
        setRequireNotifs((data ?? []).map((r: any) => ({ id: r.id, type: 'require' as const, title: r.project_name, subtitle: `🏗️ ${r.status} · ${r.sales_name}`, time: r.created_at, url: '/form-require-project', internalUrl: '/form-require-project', menuTitle: 'Form Require Project' })));
      } else if (roleLC === 'guest') {
        const { data } = await supabase.from('project_requests').select('id, project_name, status, sales_name, created_at').eq('requester_id', currentUser.id).neq('status', 'completed').neq('status', 'rejected').order('created_at', { ascending: false }).limit(20);
        setRequireNotifs((data ?? []).map((r: any) => ({ id: r.id, type: 'require' as const, title: r.project_name, subtitle: `🏗️ ${r.status} · ${r.sales_name}`, time: r.created_at, url: '/form-require-project', internalUrl: '/form-require-project', menuTitle: 'Form Require Project' })));
      } else { setRequireNotifs([]); }
    } catch (e) { console.error('[notif] require fetch error:', e); }

    // ── 3. Reminder Schedule ──
    try {
      if (isAdmin || isPTS) {
        const { data } = await supabase.from('reminders').select('id, project_name, category, due_date, status, assigned_to, created_at').neq('status', 'done').neq('status', 'cancelled').eq('assigned_to', currentUser.username).order('due_date', { ascending: true }).limit(20);
        setReminderNotifs((data ?? []).map((r: any) => ({ id: r.id, type: 'reminder' as const, title: r.project_name, subtitle: `🗓️ ${r.category} · ${r.due_date}`, time: r.created_at, url: '/reminder-schedule', internalUrl: '/reminder-schedule', menuTitle: 'Reminder Schedule' })));
      } else { setReminderNotifs([]); }
    } catch (e) { console.error('[notif] reminder fetch error:', e); }

    // ── 4. Form Review ──
    try {
      if (isAdmin || (isTeamPTS && !isTeamServices)) {
        const { data } = await supabase.from('form_reviews').select('id, project_name, reminder_category, sales_name, created_at, grade_product_knowledge, grade_product_knowledge_bast, grade_training_customer').eq('assign_name', assignedName).order('created_at', { ascending: false }).limit(30);
        const pending = (data ?? []).filter((r: any) =>
          !r.grade_product_knowledge && !r.grade_product_knowledge_bast && !r.grade_training_customer
        );
        setReviewNotifs(pending.map((r: any) => ({ id: r.id, type: 'require' as const, title: r.project_name, subtitle: `⭐ ${r.reminder_category} · ${r.sales_name}`, time: r.created_at, url: '/form-review', internalUrl: '/form-review', menuTitle: 'Form Review Demo & BAST' })));
      } else { setReviewNotifs([]); }
    } catch (e) { console.error('[notif] review fetch error:', e); }
  }, [currentUser, isAdmin, roleLC, teamType]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 120_000); // setiap 2 menit
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    const ch1 = supabase.channel('dash-notif-tickets-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => { setTimeout(fetchAll, 400); }).subscribe();
    const ch2 = supabase.channel('dash-notif-requires-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'project_requests' }, () => { setTimeout(fetchAll, 400); }).subscribe();
    const ch3 = supabase.channel('dash-notif-reminders-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => { setTimeout(fetchAll, 400); }).subscribe();
    const ch4 = supabase.channel('dash-notif-reviews-v2').on('postgres_changes', { event: '*', schema: 'public', table: 'form_reviews' }, () => { setTimeout(fetchAll, 400); }).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); supabase.removeChannel(ch4); };
  }, [fetchAll]);

  const handleClick = (item: NotificationItem) => {
    if (item.internalUrl) onNavigate(item.internalUrl, item.menuTitle);
  };

  const totalCount = ticketNotifs.length + requireNotifs.length + reminderNotifs.length + reviewNotifs.length;

  return (
    <div className="flex items-center gap-2">
      <NotifBell icon="🎫" label="Ticket" count={ticketNotifs.length} color="#be123c" bgColor="rgba(254,205,211,0.6)" borderColor="#fda4af" dotColor="#e11d48" items={ticketNotifs} onItemClick={handleClick} />
      <NotifBell icon="🏗️" label="Require" count={requireNotifs.length} color="#7e22ce" bgColor="rgba(233,213,255,0.6)" borderColor="#c4b5fd" dotColor="#9333ea" items={requireNotifs} onItemClick={handleClick} />
      <NotifBell icon="🗓️" label="Reminder" count={reminderNotifs.length} color="#0e7490" bgColor="rgba(207,250,254,0.6)" borderColor="#67e8f9" dotColor="#0891b2" items={reminderNotifs} onItemClick={handleClick} />
      <NotifBell icon="⭐" label="Review" count={reviewNotifs.length} color="#b45309" bgColor="rgba(254,243,199,0.6)" borderColor="#fcd34d" dotColor="#d97706" items={reviewNotifs} onItemClick={handleClick} />
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [showRegister, setShowRegister] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    full_name: '',
    username: '',
    password: '',
    confirm_password: '',
    sales_division: '',
    jabatan: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeTitle, setIframeTitle] = useState<string>('');
  const [showTicketing, setShowTicketing] = useState(false);
  const [internalUrl, setInternalUrl] = useState<string>('/ticketing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [showUserManagement, setShowUserManagement] = useState(false);

  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>([]);

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
      description: 'Solution request form untuk project Sales',
      items: [{ name: 'Submit Require', url: '/form-require-project', icon: '📋', internal: true, embed: true }]
    },
    {
      title: 'Form Review Demo & BAST', icon: '⭐', key: 'form-bast',
      gradient: 'from-slate-700 via-slate-600 to-slate-500',
      description: 'Platform review Demo Produk & BAST',
      items: [{ name: 'Platform Review', url: '/form-review', icon: '⭐', internal: true, embed: true }]
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
        { name: 'Submit Daily Report', url: 'https://docs.google.com/forms/d/e/1FAIpQLSf2cCEPlQQcCR1IZ3GRx-ImgdJJ15rMxAoph77aNYmbl15gvw/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Daily Report', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMeC3gBgeCAe5YNoVE4RfdANVyjx7xmtTA7C-G40KhExzgvAJ4cGTcyFcgbp4WWx7laBdC3VZrBGd0/pubhtml?gid=1408443365&single=true', icon: '📑', embed: true },
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
      items: [{ name: 'Unit Movement Log', url: '/unit-movement', icon: '🚚', internal: true, embed: true }]
    },
  ];

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

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').eq('username', loginForm.username).eq('password', loginForm.password).single();
      if (error || !data) { alert('Username atau password salah!'); return; }
      if (data.team_type === 'Pending Approval') {
        alert('Akun kamu masih menunggu persetujuan admin.\nKamu akan dihubungi setelah akun diaktifkan.');
        return;
      }
      setCurrentUser(data);
      setIsLoggedIn(true);
      const now = Date.now();
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());
    } catch { alert('Login gagal!'); }
  };

  const handleRegister = async () => {
    const { full_name, username, password, confirm_password, sales_division } = registerForm;
    if (!full_name.trim()) { alert('Nama lengkap wajib diisi!'); return; }
    if (!username.trim()) { alert('Email / username wajib diisi!'); return; }
    if (!password || password.length < 6) { alert('Password minimal 6 karakter!'); return; }
    if (password !== confirm_password) { alert('Konfirmasi password tidak cocok!'); return; }
    if (!sales_division) { alert('Pilih divisi sales!'); return; }
    setRegisterLoading(true);
    try {
      const { data: existing } = await supabase.from('users').select('id').eq('username', username.trim().toLowerCase()).maybeSingle();
      if (existing) { alert('Username / email sudah terdaftar. Gunakan username lain.'); setRegisterLoading(false); return; }
      const { error } = await supabase.from('users').insert([{
        full_name: full_name.trim(),
        username: username.trim().toLowerCase(),
        password: password,
        role: 'guest',
        sales_division: sales_division,
        jabatan: registerForm.jabatan.trim() || null,
        team_type: 'Pending Approval',
        allowed_menus: [],
      }]);
      if (error) throw error;
      setRegisterSuccess(true);
      setRegisterForm({ full_name: '', username: '', password: '', confirm_password: '', sales_division: '', jabatan: '' });
    } catch (err: any) {
      alert('Registrasi gagal: ' + err.message);
    }
    setRegisterLoading(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowSidebar(false); setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing');
    setShowSettings(false); setShowUserProfile(false); setShowUserManagement(false);
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0], menuTitle: string) => {
    if (item.external && !item.embed) { window.open(item.url, '_blank'); return; }
    setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing');
    setTimeout(() => {
      if (item.internal) {
        setShowSidebar(true); setShowTicketing(true);
        setInternalUrl(item.url);
        setIframeTitle(`${menuTitle} - ${item.name}`);
      } else if (item.embed) {
        setShowSidebar(true); setIframeUrl(item.url);
        setIframeTitle(`${menuTitle} - ${item.name}`);
      }
    }, 150);
  };

  const handleNotifNavigate = (navInternalUrl: string, title: string) => {
    setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing'); setIframeTitle('');
    setTimeout(() => {
      setShowTicketing(true);
      setInternalUrl(navInternalUrl);
      setIframeTitle(title);
      setShowSidebar(true);
    }, 150);
  };

  const handleBackToDashboard = () => {
    setShowSidebar(false); setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing'); setIframeTitle('');
  };

  useEffect(() => {
    const load = async () => {
      const saved = localStorage.getItem('currentUser');
      const savedTime = localStorage.getItem('loginTime');
      if (!saved) { setLoading(false); return; }
      if (savedTime) {
        const sixHours = 6 * 60 * 60 * 1000;
        if (Date.now() - parseInt(savedTime) > sixHours) {
          localStorage.removeItem('currentUser'); localStorage.removeItem('loginTime');
          setLoading(false); return;
        }
      }
      try {
        const parsed: User = JSON.parse(saved);
        setCurrentUser(parsed);
        setIsLoggedIn(true);
        const { data, error } = await supabase.from('users').select('*').eq('id', parsed.id).single();
        if (!error && data) {
          setCurrentUser(data);
          localStorage.setItem('currentUser', JSON.stringify(data));
        }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  const isAdmin = ['admin', 'superadmin'].includes(currentUser?.role?.toLowerCase() ?? '');

  const INTERNAL_KEYS = ['reminder-schedule', 'form-require-project', 'form-bast', 'ticket-troubleshooting'];
  const PROJECT_KEYS = ['reminder-schedule', 'form-require-project', 'form-bast', 'ticket-troubleshooting'];
  const INTERNAL_DAILY_KEYS = ['daily-report', 'database-pts', 'unit-movement'];

  const projectMenuItems = visibleMenuItems.filter(m => PROJECT_KEYS.includes(m.key));
  const internalMenuItems = visibleMenuItems.filter(m => INTERNAL_DAILY_KEYS.includes(m.key));

  const MENU_ICONS: Record<string, JSX.Element> = {
    'reminder-schedule': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
    'form-require-project': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>,
    'form-bast': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>,
    'ticket-troubleshooting': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>,
    'daily-report': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
    'database-pts': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>,
    'unit-movement': <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>,
  };

  function MenuLoadingOverlay() {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(226,168,75,0.3)', borderTopColor: '#e2a84b' }} />
          <p className="text-white/70 text-sm font-medium tracking-wide">Memuat menu...</p>
        </div>
      </div>
    );
  }

  const renderMenuCard = (menu: MenuItem, index: number, accentColor: string) => {
    const isSingleInternal = menu.items.length === 1 && menu.items[0].internal;
    return (
      <div key={menu.key}
        className={`rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-white ${isSingleInternal ? 'cursor-pointer group' : ''}`}
        style={{ animation: `fadeInUp 0.5s ease forwards`, animationDelay: `${index * 80}ms`, opacity: 0 }}
        onClick={isSingleInternal ? () => handleMenuClick(menu.items[0], menu.title) : undefined}
      >
        <div className={`bg-gradient-to-br ${menu.gradient} ${isSingleInternal ? 'p-8' : 'p-6'} relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white" />
            <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl">{menu.icon}</div>
              <h3 className="text-xl font-bold tracking-tight text-white leading-tight">{menu.title}</h3>
            </div>
            <p className="text-white/90 text-sm font-medium line-clamp-2">{menu.description}</p>
          </div>
        </div>
        {!isSingleInternal && (
          <div className="p-5 space-y-3">
            {menu.items.map((item, itemIndex) => (
              <button key={itemIndex} onClick={e => { e.stopPropagation(); handleMenuClick(item, menu.title); }}
                className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 px-5 py-4 rounded-md font-semibold shadow-sm hover:shadow-md transition-all text-right flex items-center justify-end gap-4 group/item">
                {item.external && !item.embed ? (
                  <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                ) : (
                  <svg className="w-5 h-5 text-slate-400 transition-transform group-hover/item:-translate-x-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                )}
                <span className="flex-1 text-sm tracking-wide text-right">{item.name}</span>
                <div className="w-10 h-10 bg-white rounded-md shadow-sm flex items-center justify-center text-xl border border-slate-200 group-hover/item:scale-110 transition-transform flex-shrink-0">{item.icon}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── LOADING ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl" style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
          <div className="w-12 h-12 rounded-full border-4 border-t-rose-600 border-rose-200 animate-spin" />
          <p className="text-slate-700 font-semibold">Memuat portal...</p>
        </div>
      </div>
    );
  }

  // ── LOGIN / REGISTER SCREEN ──
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed p-4" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)' }}>
          <div className="p-8">
            <div className="flex flex-col items-center mb-8">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg ${showRegister ? 'bg-gradient-to-br from-indigo-600 to-indigo-700' : 'bg-gradient-to-br from-rose-600 to-rose-700'}`}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showRegister
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  }
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-800 mb-1 tracking-tight">Work Management</h1>
              <p className="text-slate-500 text-sm font-medium">Support System — IndoVisual</p>
            </div>

            {!showRegister && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">Username</label>
                  <input type="text" value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all bg-white text-slate-800 font-medium text-sm outline-none"
                    placeholder="Enter your username" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">Password</label>
                  <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-100 transition-all bg-white text-slate-800 font-medium text-sm outline-none"
                    placeholder="Enter your password" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                </div>
                <button onClick={handleLogin} className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3.5 rounded-xl hover:from-rose-700 hover:to-rose-800 font-bold shadow-lg transition-all tracking-wide text-sm mt-2">
                  🔐 Sign In to Portal
                </button>
                <p className="text-center text-xs text-slate-400 pt-1">Belum punya akun? <button onClick={() => setShowRegister(true)} className="text-indigo-600 font-bold hover:underline">Daftar di sini</button></p>
              </div>
            )}

            {showRegister && (
              <div>
                {registerSuccess ? (
                  <div className="text-center py-6">
                    <div className="text-5xl mb-4">✅</div>
                    <h3 className="font-bold text-slate-800 text-lg mb-2">Pendaftaran Berhasil!</h3>
                    <p className="text-slate-500 text-sm mb-4">Akun kamu akan diverifikasi oleh admin. Kamu akan dihubungi setelah akun diaktifkan.</p>
                    <button onClick={() => { setShowRegister(false); setRegisterSuccess(false); }} className="bg-rose-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-rose-700 transition-all">Kembali ke Login</button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-600 tracking-widest uppercase">Nama Lengkap *</label>
                      <input type="text" value={registerForm.full_name} onChange={e => setRegisterForm({ ...registerForm, full_name: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="Nama lengkap" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-600 tracking-widest uppercase">Username / Email *</label>
                      <input type="text" value={registerForm.username} onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="username atau email" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-600 tracking-widest uppercase">Password *</label>
                      <input type="password" value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="min. 6 karakter" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-600 tracking-widest uppercase">Konfirmasi Password *</label>
                      <input type="password" value={registerForm.confirm_password} onChange={e => setRegisterForm({ ...registerForm, confirm_password: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all" placeholder="ulangi password" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-600 tracking-widest uppercase">Sales Division *</label>
                      <select value={registerForm.sales_division} onChange={e => setRegisterForm({ ...registerForm, sales_division: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white">
                        <option value="">-- Pilih Divisi --</option>
                        {SALES_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 text-slate-600 tracking-widest uppercase">Jabatan / Posisi</label>
                      <select value={registerForm.jabatan} onChange={e => setRegisterForm({ ...registerForm, jabatan: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-white">
                        <option value="">— Pilih Jabatan —</option>
                        {JABATAN_LIST.map(j => <option key={j} value={j}>{JABATAN_CONFIG[j].icon} {j}</option>)}
                      </select>
                    </div>
                    <button onClick={handleRegister} disabled={registerLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 text-white py-3.5 rounded-xl font-bold shadow-lg transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                      {registerLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      📝 Daftar Akun
                    </button>
                    <p className="text-center text-xs text-slate-400">Sudah punya akun? <button onClick={() => setShowRegister(false)} className="text-rose-600 font-bold hover:underline">Login</button></p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── SHARED HEADER JSX ──
  const renderHeader = (withBackBtn = false) => (
    <div className="bg-white/80 backdrop-blur-md shadow-md border-b border-slate-200/70" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)', position: 'relative', zIndex: 9999 }}>
      <div className="w-full px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* LEFT */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-rose-600 to-rose-700 rounded-xl shadow-md flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Work Management Portal</h1>
              <p className="text-slate-500 text-xs font-medium mt-0.5">IndoVisual Professional Tools</p>
            </div>
          </div>

          {/* CENTER */}
          {currentUser && (
            <div className="flex-1 flex justify-center px-4">
              <NotificationBar currentUser={currentUser} onNavigate={handleNotifNavigate} />
            </div>
          )}

          {/* RIGHT */}
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

            {/* User Profile — semua role */}
            <button onClick={() => setShowUserProfile(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', color: '#065f46' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(16,185,129,0.08)'; }}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              User Profile
            </button>

            {/* Settings + User Management — admin/superadmin only */}
            {isAdmin && (
              <>
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
                <button onClick={() => setShowUserManagement(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(13,148,136,0.08)', border: '1px solid rgba(13,148,136,0.25)', color: '#0f766e' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(13,148,136,0.08)'; }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  User Management
                </button>
              </>
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
  );

  // ── MODAL RENDERS (shared) ──
  const renderModals = () => (
    <>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
      {showUserProfile && currentUser && <UserProfileModal currentUser={currentUser} onClose={() => setShowUserProfile(false)} />}
      {showUserManagement && <UserManagementModal onClose={() => setShowUserManagement(false)} />}
    </>
  );

  // ── VIEW: NO SIDEBAR (main dashboard) ──
  if (!showSidebar) {
    return (
      <div className="min-h-screen flex flex-col bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        {renderModals()}
        {renderHeader()}

        <div className="flex-1 overflow-y-auto py-8 px-4 md:px-8">
          <div className="max-w-[1600px] mx-auto space-y-8">
            {menuLoading ? <MenuLoadingOverlay /> : (
              <>
                {projectMenuItems.length > 0 && (
                  <div style={{ animation: 'fadeInUp 0.45s ease forwards', opacity: 0 }}>
                    <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-xl"
                      style={{ background: 'rgba(15,23,42,0.72)', backdropFilter: 'blur(8px)', boxShadow: '0 2px 12px rgba(0,0,0,0.25)' }}>
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #38bdf8, #0284c7)' }}>
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
                      <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'linear-gradient(135deg, #34d399, #059669)' }}>
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
  }

  // ── VIEW: SIDEBAR ──
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {renderModals()}
      {renderHeader()}

      <div className="flex flex-1 overflow-hidden">
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

            {!sidebarCollapsed && <div className="mb-3" />}

            {menuLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(226,168,75,0.4)', borderTopColor: '#e2a84b' }} />
              </div>
            ) : sidebarCollapsed ? (
              <div className="space-y-1">
                {visibleMenuItems.map((menu) => (
                  <div key={menu.key} className="group relative">
                    <div className="flex flex-col gap-1">
                      {menu.items.map((item, itemIndex) => {
                        const isActive = (showTicketing && item.internal && internalUrl === item.url) || (iframeUrl === item.url);
                        return (
                          <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)} title={`${menu.title} — ${item.name}`}
                            className="w-full h-9 rounded-lg flex items-center justify-center text-base transition-all"
                            style={isActive ? { background: 'rgba(200,134,29,0.18)', border: '1px solid rgba(200,134,29,0.4)', color: '#92600a' } : { background: 'transparent', border: '1px solid transparent', color: '#64748b' }}
                            onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.07)'; }}
                            onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                            {MENU_ICONS[menu.key] ?? <span>{menu.icon}</span>}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleMenuItems.filter(m => PROJECT_KEYS.includes(m.key)).length > 0 && (
                  <div>
                    <p className="px-1 mb-2 text-xs font-bold tracking-wide uppercase" style={{ color: 'rgba(0,0,0,0.55)' }}>Project</p>
                    <div className="space-y-0.5">
                      {visibleMenuItems.filter(m => PROJECT_KEYS.includes(m.key)).map(menu => {
                        if (menu.items.length === 1) {
                          const item = menu.items[0];
                          const isActive = (showTicketing && item.internal && internalUrl === item.url) || (iframeUrl === item.url);
                          return (
                            <button key={menu.key} onClick={() => handleMenuClick(item, menu.title)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium transition-all"
                              style={isActive ? { background: 'rgba(200,134,29,0.12)', border: '1px solid rgba(200,134,29,0.3)', color: '#92600a' } : { background: 'transparent', border: '1px solid transparent', color: '#1e293b' }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isActive ? 'rgba(200,134,29,0.15)' : 'rgba(0,0,0,0.07)', color: isActive ? '#92600a' : '#475569' }}>
                                {MENU_ICONS[menu.key] ?? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/></svg>}
                              </span>
                              <span className="truncate text-sm tracking-wide">{menu.title}</span>
                              {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#b8760d' }} />}
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                )}

                {visibleMenuItems.filter(m => INTERNAL_DAILY_KEYS.includes(m.key)).length > 0 && (
                  <div>
                    <p className="px-1 mb-2 text-xs font-bold tracking-wide uppercase" style={{ color: 'rgba(0,0,0,0.55)' }}>Internal Daily</p>
                    <div className="space-y-0.5">
                      {visibleMenuItems.filter(m => INTERNAL_DAILY_KEYS.includes(m.key)).flatMap(menu =>
                        menu.items.map((item, itemIndex) => {
                          const isActive = (showTicketing && item.internal && internalUrl === item.url) || (iframeUrl === item.url);
                          return (
                            <button key={`${menu.key}-${itemIndex}`} onClick={() => handleMenuClick(item, menu.title)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left font-medium transition-all"
                              style={isActive ? { background: 'rgba(200,134,29,0.12)', border: '1px solid rgba(200,134,29,0.3)', color: '#92600a' } : { background: 'transparent', border: '1px solid transparent', color: '#1e293b' }}
                              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; }}
                              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: isActive ? 'rgba(200,134,29,0.15)' : 'rgba(0,0,0,0.07)', color: isActive ? '#92600a' : '#475569' }}>
                                {MENU_ICONS[menu.key] ?? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" strokeWidth={2}/></svg>}
                              </span>
                              <span className="truncate text-sm tracking-wide">{item.name}</span>
                              {item.external && !item.embed && <svg className="ml-auto w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>}
                              {isActive && !item.external && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#b8760d' }} />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3 space-y-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)} className="w-full flex justify-center p-2 rounded-xl transition-all text-slate-400 hover:text-slate-700" style={{ background: 'rgba(0,0,0,0.05)' }} title="Expand sidebar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" /></svg>
              </button>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 overflow-hidden bg-white">
            {showTicketing ? (
              <div className="w-full h-full overflow-auto">
                <iframe src={internalUrl} className="w-full h-full border-0" title={iframeTitle} />
              </div>
            ) : iframeUrl ? (
              <div className="w-full h-full overflow-auto">
                <iframe src={iframeUrl} className="w-full h-full border-0" title={iframeTitle} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                <div className="text-center">
                  <div className="text-6xl mb-4">📂</div>
                  <p className="font-semibold text-lg">Pilih menu dari sidebar</p>
                  <p className="text-sm mt-1">Klik salah satu menu di sebelah kiri untuk memulai</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dropIn { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
