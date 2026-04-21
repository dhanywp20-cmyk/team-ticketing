'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const T = {
  // Sidebar
  sidebarBg:        '#2b3022',   // deep olive-charcoal
  sidebarBorder:    'rgba(255,255,255,0.07)',
  sidebarText:      '#c8cfc0',
  sidebarMuted:     'rgba(200,207,192,0.45)',
  sidebarActive:    '#ffffff',
  sidebarActiveBg:  'rgba(255,255,255,0.11)',
  sidebarHoverBg:   'rgba(255,255,255,0.06)',
  // Logo badge
  logoBg:           '#4a5a3a',
  logoAccent:       '#8fad6e',
  // Header
  headerBg:         '#ffffff',
  headerBorder:     '#e8e8e4',
  headerText:       '#1a1d16',
  headerMuted:      '#7a8070',
  // Accent / CTA
  orange:           '#e07b2a',
  orangeHover:      '#c9681a',
  orangeLight:      'rgba(224,123,42,0.10)',
  orangeBorder:     'rgba(224,123,42,0.30)',
  // Cards / content
  cardBg:           '#ffffff',
  cardBorder:       '#e6e8e1',
  bodyBg:           '#f4f5f0',
  // Semantic
  green:            '#4a7c59',
  red:              '#c94040',
  blue:             '#3a6fa8',
  violet:           '#6e4da8',
  cyan:             '#2e8a8a',
};

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: string;
  team_type?: string;
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

// ─── AccountSettings Modal ────────────────────────────────────────────────────

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
    allowed_menus: ALL_MENU_KEYS,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const menuLabels: Record<string, { label: string; icon: string }> = {
    'form-bast':              { label: 'Form BAST & Demo',      icon: '📋' },
    'form-require-project':   { label: 'Form Require Project',  icon: '🏗️' },
    'ticket-troubleshooting': { label: 'Ticket Troubleshooting',icon: '🎫' },
    'daily-report':           { label: 'Daily Report',          icon: '📈' },
    'database-pts':           { label: 'Database PTS',          icon: '💼' },
    'unit-movement':          { label: 'Unit Movement Log',     icon: '🚚' },
    'reminder-schedule':      { label: 'Reminder Schedule',     icon: '🗓️' },
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
      full_name: newUser.full_name, role: newUser.role,
      team_type: newUser.role === 'team' ? newUser.team_type : null,
      allowed_menus: newUser.allowed_menus,
    }]);
    setSaving(false);
    if (error) { notify('error', 'Gagal menambah akun: ' + error.message); return; }
    notify('success', 'Akun berhasil ditambahkan!');
    setNewUser({ username: '', password: '', full_name: '', role: 'guest', team_type: '', allowed_menus: ALL_MENU_KEYS });
    setActiveTab('list');
    fetchUsers();
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase.from('users').update({
      username: editingUser.username, password: editingUser.password,
      full_name: editingUser.full_name, role: editingUser.role,
      team_type: editingUser.role === 'team' ? (editingUser.team_type ?? '') : null,
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
      <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: T.headerMuted }}>Menu yang Dapat Diakses</label>
      <div className="grid grid-cols-1 gap-2">
        {ALL_MENU_KEYS.map(key => {
          const m = menuLabels[key];
          const checked = selected.includes(key);
          return (
            <button key={key} type="button" onClick={() => toggleMenu(key, target)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left"
              style={checked
                ? { borderColor: T.orange, background: T.orangeLight, color: T.orange }
                : { borderColor: T.cardBorder, background: T.bodyBg, color: T.headerMuted }}>
              <div className="w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                style={checked
                  ? { borderColor: T.orange, background: T.orange }
                  : { borderColor: '#cbd5e1', background: '#fff' }}>
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

  const inputCls = "w-full border rounded-lg px-3 py-2.5 text-sm outline-none transition-all";

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
      style={{ background: 'rgba(30,35,25,0.65)', backdropFilter: 'blur(4px)' }}>
      <div className="rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>

        {/* Header */}
        <div className="px-8 py-6 flex items-center justify-between flex-shrink-0"
          style={{ background: T.sidebarBg }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Account Settings</h2>
              <p className="text-xs" style={{ color: T.sidebarMuted }}>Kelola akun &amp; hak akses menu</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', color: T.sidebarText }}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {notification && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2"
            style={notification.type === 'success'
              ? { background: '#f0faf4', color: '#276749', border: '1px solid #b7dfc8' }
              : { background: '#fff5f5', color: T.red, border: `1px solid #fbb` }}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b px-6 pt-4 flex-shrink-0" style={{ borderColor: T.cardBorder }}>
          {(['list', 'add'] as const).map(tab => (
            <button key={tab} onClick={() => { setActiveTab(tab); setEditingUser(null); }}
              className="px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all"
              style={activeTab === tab
                ? { borderColor: T.orange, color: T.orange }
                : { borderColor: 'transparent', color: T.headerMuted }}>
              {tab === 'list' ? '👥 Daftar Akun' : '➕ Tambah Akun'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div className="space-y-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
                    style={{ borderColor: T.cardBorder, borderTopColor: T.orange }}></div>
                </div>
              ) : editingUser ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setEditingUser(null)} style={{ color: T.headerMuted }} className="p-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h3 className="font-bold" style={{ color: T.headerText }}>Edit: {editingUser.full_name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Full Name', field: 'full_name', val: editingUser.full_name },
                      { label: 'Username', field: 'username', val: editingUser.username },
                      { label: 'Password', field: 'password', val: editingUser.password },
                    ].map(({ label, field, val }) => (
                      <div key={field}>
                        <label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{ color: T.headerMuted }}>{label}</label>
                        <input value={val}
                          onChange={e => setEditingUser({ ...editingUser, [field]: e.target.value })}
                          className={inputCls}
                          style={{ borderColor: T.cardBorder, color: T.headerText }}
                          onFocus={e => { e.target.style.borderColor = T.orange; e.target.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
                          onBlur={e => { e.target.style.borderColor = T.cardBorder; e.target.style.boxShadow = 'none'; }} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{ color: T.headerMuted }}>Role</label>
                      <select value={editingUser.role}
                        onChange={e => setEditingUser({ ...editingUser, role: e.target.value, team_type: '' })}
                        className={inputCls}
                        style={{ borderColor: T.cardBorder, color: T.headerText, background: '#fff' }}>
                        {['guest','team','sales','admin','superadmin'].map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  {editingUser.role === 'team' && (
                    <div>
                      <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: T.headerMuted }}>Team Type</label>
                      <div className="flex gap-3">
                        {['Team PTS', 'Team Services'].map(t => (
                          <button key={t} type="button" onClick={() => setEditingUser({ ...editingUser, team_type: t })}
                            className="flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all"
                            style={editingUser.team_type === t
                              ? { borderColor: T.orange, background: T.orangeLight, color: T.orange }
                              : { borderColor: T.cardBorder, background: T.bodyBg, color: T.headerMuted }}>
                            {t === 'Team PTS' ? '🏗️' : '🔧'} {t}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <MenuPermissionSelector selected={editingUser.allowed_menus ?? ALL_MENU_KEYS} target="edit" />
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingUser(null)}
                      className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all"
                      style={{ border: `1px solid ${T.cardBorder}`, color: T.headerMuted }}>Batal</button>
                    <button onClick={handleSaveEdit} disabled={saving}
                      className="flex-1 py-3 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2"
                      style={{ background: T.orange, color: '#fff' }}>
                      {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="relative mb-1">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: T.headerMuted }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Cari nama, username, atau role..."
                      className={inputCls + ' pl-9 pr-9'}
                      style={{ borderColor: T.cardBorder, color: T.headerText }}
                      onFocus={e => { e.target.style.borderColor = T.orange; }}
                      onBlur={e => { e.target.style.borderColor = T.cardBorder; }} />
                    {searchQuery && (
                      <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: T.headerMuted }}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  {users
                    .filter(u =>
                      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      u.role?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map(user => (
                    <div key={user.id} className="rounded-xl p-4 transition-all"
                      style={{ background: T.bodyBg, border: `1px solid ${T.cardBorder}` }}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm"
                            style={{ background: T.sidebarBg, color: T.logoAccent }}>
                            {user.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm truncate" style={{ color: T.headerText }}>{user.full_name}</p>
                            <p className="text-xs" style={{ color: T.headerMuted }}>@{user.username}</p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
                                style={{ background: T.sidebarBg, color: T.sidebarText }}>{user.role}</span>
                              {user.team_type && (
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase"
                                  style={{ background: T.orangeLight, color: T.orange, border: `1px solid ${T.orangeBorder}` }}>
                                  {user.team_type === 'Team PTS' ? '🏗️' : '🔧'} {user.team_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => setEditingUser(user)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: '#eef1fb', color: '#3a5fad', border: '1px solid #c5cff0' }}>Edit</button>
                          <button onClick={() => handleDeleteUser(user.id)} className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: '#fef2f2', color: T.red, border: '1px solid #fcc' }}>Hapus</button>
                        </div>
                      </div>
                      {user.allowed_menus && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {user.allowed_menus.map(key => (
                            <span key={key} className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                              style={{ background: '#fff', border: `1px solid ${T.cardBorder}`, color: T.headerMuted }}>
                              {menuLabels[key]?.icon} {menuLabels[key]?.label ?? key}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Full Name *', key: 'full_name', placeholder: 'Nama lengkap' },
                  { label: 'Username *', key: 'username', placeholder: 'username' },
                  { label: 'Password *', key: 'password', placeholder: 'password' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{ color: T.headerMuted }}>{label}</label>
                    <input value={(newUser as any)[key]}
                      onChange={e => setNewUser({ ...newUser, [key]: e.target.value })}
                      className={inputCls} placeholder={placeholder}
                      style={{ borderColor: T.cardBorder, color: T.headerText }}
                      onFocus={e => { e.target.style.borderColor = T.orange; e.target.style.boxShadow = `0 0 0 3px ${T.orangeLight}`; }}
                      onBlur={e => { e.target.style.borderColor = T.cardBorder; e.target.style.boxShadow = 'none'; }} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{ color: T.headerMuted }}>Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value, team_type: '' })}
                    className={inputCls} style={{ borderColor: T.cardBorder, color: T.headerText, background: '#fff' }}>
                    {['guest','team','sales','admin','superadmin'].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              {newUser.role === 'team' && (
                <div>
                  <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: T.headerMuted }}>Team Type</label>
                  <div className="flex gap-3">
                    {['Team PTS', 'Team Services'].map(t => (
                      <button key={t} type="button" onClick={() => setNewUser({ ...newUser, team_type: t })}
                        className="flex-1 py-2.5 rounded-lg border-2 text-sm font-semibold transition-all"
                        style={newUser.team_type === t
                          ? { borderColor: T.orange, background: T.orangeLight, color: T.orange }
                          : { borderColor: T.cardBorder, background: T.bodyBg, color: T.headerMuted }}>
                        {t === 'Team PTS' ? '🏗️' : '🔧'} {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <MenuPermissionSelector selected={newUser.allowed_menus} target="new" />
              <button onClick={handleAddUser} disabled={saving}
                className="w-full py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                style={{ background: T.orange, color: '#fff' }}>
                {saving && <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>}
                ➕ Tambah Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NotifBell ────────────────────────────────────────────────────────────────

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
      <button onClick={() => setOpen(o => !o)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
        style={{
          background: count > 0 ? bgColor : 'rgba(255,255,255,0.55)',
          border: `1.5px solid ${count > 0 ? borderColor : 'rgba(0,0,0,0.1)'}`,
          boxShadow: count > 0 ? `0 2px 12px ${borderColor}55` : 'none',
        }}>
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
            background: 'rgba(255,255,255,0.98)',
            border: `1.5px solid ${borderColor}`,
            backdropFilter: 'blur(16px)',
            boxShadow: `0 8px 40px rgba(0,0,0,0.18)`,
            animation: 'dropIn 0.18s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
          <div className="px-4 py-3 flex items-center justify-between"
            style={{ background: bgColor, borderBottom: `1px solid ${borderColor}44` }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-bold" style={{ color }}>{label}</span>
            </div>
            {count > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black text-white"
                style={{ background: dotColor }}>{count} baru</span>
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

// ─── NotificationBar ──────────────────────────────────────────────────────────

interface NotificationBarProps {
  currentUser: User;
  onNavigate: (internalUrl: string, title: string) => void;
}

function NotificationBar({ currentUser, onNavigate }: NotificationBarProps) {
  const [ticketNotifs, setTicketNotifs]   = useState<NotificationItem[]>([]);
  const [requireNotifs, setRequireNotifs] = useState<NotificationItem[]>([]);
  const [reminderNotifs, setReminderNotifs] = useState<NotificationItem[]>([]);

  const roleLC = (currentUser.role ?? '').trim().toLowerCase();
  const teamType = (currentUser.team_type ?? '').trim();
  const isTeamServices = roleLC === 'team' && teamType === 'Team Services';
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

    // Ticket notifs
    try {
      if (isAdmin) {
        const { data } = await supabase.from('tickets').select('id, project_name, issue_case, assign_name, status, created_at')
          .neq('status', 'Solved').order('created_at', { ascending: false }).limit(50);
        setTicketNotifs((data ?? []).map((t: any) => ({
          id: t.id, type: 'ticket' as const,
          title: t.project_name, subtitle: `${t.status} · ${t.issue_case}`,
          time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting',
        })));
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
        setTicketNotifs((data ?? []).map((t: any) => ({
          id: t.id, type: 'ticket' as const,
          title: t.project_name, subtitle: `${t.status} · ${t.issue_case}`,
          time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting',
        })));
      } else if (roleLC === 'team' || roleLC === 'team_pts') {
        if (memberTeamType === 'Team Services') {
          const { data } = await supabase.from('tickets')
            .select('id, project_name, issue_case, assign_name, status, services_status, created_at')
            .eq('assign_name', assignedName).neq('services_status', 'Solved').not('services_status', 'is', null)
            .order('created_at', { ascending: false }).limit(30);
          setTicketNotifs((data ?? []).map((t: any) => ({
            id: t.id, type: 'ticket' as const,
            title: t.project_name, subtitle: `Svc: ${t.services_status} · ${t.issue_case}`,
            time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting',
          })));
        } else {
          const { data } = await supabase.from('tickets')
            .select('id, project_name, issue_case, assign_name, status, created_at')
            .eq('assign_name', assignedName).neq('status', 'Solved')
            .order('created_at', { ascending: false }).limit(30);
          setTicketNotifs((data ?? []).map((t: any) => ({
            id: t.id, type: 'ticket' as const,
            title: t.project_name, subtitle: `${t.status} · ${t.issue_case}`,
            time: t.created_at, url: '/ticketing', internalUrl: '/ticketing', menuTitle: 'Ticket Troubleshooting',
          })));
        }
      } else {
        setTicketNotifs([]);
      }
    } catch (e) { console.error('[notif] ticket fetch error:', e); }

    // Require notifs
    const isEffectiveTeamServices = memberTeamType === 'Team Services';
    const isEffectiveTeamPTS = !isAdmin && (roleLC === 'team' || roleLC === 'team_pts') && memberTeamType !== 'Team Services';
    if (isEffectiveTeamServices) {
      setRequireNotifs([]);
    } else {
      try {
        let q = supabase.from('project_requests')
          .select('id, project_name, room_name, requester_name, status, created_at, requester_id')
          .neq('status', 'completed').neq('status', 'rejected');
        if (!isAdmin && !isEffectiveTeamPTS) q = q.eq('requester_id', currentUser.id);
        const { data } = await q.order('created_at', { ascending: false }).limit(30);
        setRequireNotifs((data ?? []).map((r: any) => ({
          id: r.id, type: 'require' as const,
          title: r.project_name,
          subtitle: `${r.status === 'pending' ? '⏳ Waiting Approval' : r.status === 'approved' ? '✅ Approved' : r.status === 'in_progress' ? '🔄 In Progress' : r.status} · ${r.requester_name}`,
          time: r.created_at, url: '/form-require-project', internalUrl: '/form-require-project', menuTitle: 'Form Require Project',
        })));
      } catch (e) { console.error('[notif] require fetch error:', e); }
    }

    // Reminder notifs
    if (!isAdmin && !isEffectiveTeamPTS) {
      setReminderNotifs([]);
    } else {
      try {
        let q = supabase.from('reminders')
          .select('id, project_name, category, due_date, due_time, assigned_to, assign_name, status, created_at')
          .neq('status', 'done').neq('status', 'cancelled');
        if (isEffectiveTeamPTS) q = q.eq('assigned_to', currentUser.username);
        const { data } = await q.order('due_date', { ascending: true }).limit(30);
        if (data) {
          const today = new Date().toISOString().split('T')[0];
          const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
          const prioritized = [...(data as any[])].sort((a, b) => {
            const aClose = a.due_date <= tomorrow ? -1 : 0;
            const bClose = b.due_date <= tomorrow ? -1 : 0;
            return aClose - bClose;
          });
          setReminderNotifs(prioritized.map((r: any) => ({
            id: r.id, type: 'reminder' as const,
            title: r.project_name,
            subtitle: `${r.category} · ${r.due_date === today ? '📅 Hari ini' : r.due_date === tomorrow ? '⏰ Besok' : r.due_date} ${r.due_time} · ${r.assign_name}`,
            time: r.created_at, url: '/reminder-schedule', internalUrl: '/reminder-schedule', menuTitle: 'Reminder Schedule',
          })));
        }
      } catch (e) { console.error('[notif] reminder fetch error:', e); }
    }
  }, [currentUser, isAdmin, roleLC, teamType]);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 20000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  useEffect(() => {
    const ch1 = supabase.channel('dash-notif-tickets-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => setTimeout(fetchAll, 400))
      .subscribe();
    const ch2 = supabase.channel('dash-notif-requires-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_requests' }, () => setTimeout(fetchAll, 400))
      .subscribe();
    const ch3 = supabase.channel('dash-notif-reminders-v2')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => setTimeout(fetchAll, 400))
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [fetchAll]);

  const handleClick = (item: NotificationItem) => {
    if (item.internalUrl) onNavigate(item.internalUrl, item.menuTitle);
  };

  const totalCount = ticketNotifs.length + requireNotifs.length + reminderNotifs.length;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-2xl"
      style={{
        background: totalCount > 0 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.45)',
        border: totalCount > 0 ? `1.5px solid ${T.cardBorder}` : '1.5px solid rgba(0,0,0,0.07)',
        backdropFilter: 'blur(12px)',
        boxShadow: totalCount > 0 ? '0 2px 16px rgba(0,0,0,0.08)' : 'none',
      }}>
      {totalCount > 0 && (
        <div className="flex items-center gap-1.5 pr-2 border-r mr-1" style={{ borderColor: T.cardBorder }}>
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
          <span className="text-[10px] font-bold hidden md:block" style={{ color: T.headerMuted }}>Notif</span>
        </div>
      )}
      <NotifBell icon="🎫" label="Ticket" count={ticketNotifs.length}
        color="#dc2626" bgColor="rgba(254,242,242,0.9)" borderColor="rgba(252,165,165,0.8)" dotColor="#ef4444"
        items={ticketNotifs} onItemClick={handleClick} />
      {!isTeamServices && (
        <NotifBell icon="🏗️" label="Require" count={requireNotifs.length}
          color={T.violet} bgColor="rgba(245,243,255,0.9)" borderColor="rgba(196,181,253,0.8)" dotColor="#8b5cf6"
          items={requireNotifs} onItemClick={handleClick} />
      )}
      {(isAdmin || (roleLC === 'team' && !isTeamServices)) && (
        <NotifBell icon="⏰" label="Reminder" count={reminderNotifs.length}
          color={T.cyan} bgColor="rgba(236,254,255,0.9)" borderColor="rgba(103,232,249,0.8)" dotColor="#06b6d4"
          items={reminderNotifs} onItemClick={handleClick} />
      )}
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
      items: [{ name: 'Reminder', url: '/reminder-schedule2', icon: '⏰', internal: true, embed: true }],
    },
    {
      title: 'Form Require Project', icon: '🏗️', key: 'form-require-project',
      gradient: 'from-violet-700 via-violet-600 to-violet-500',
      description: 'Solution request form untuk project Sales & Account',
      items: [{ name: 'Submit Require', url: '/form-require-project2', icon: '📋', internal: true, embed: true }],
    },
    {
      title: 'Form BAST & Demo', icon: '📋', key: 'form-bast',
      gradient: 'from-slate-700 via-slate-600 to-slate-500',
      description: 'Product review & handover documentation',
      items: [
        { name: 'Input Form', url: 'https://portal.indovisual.co.id/form-review-demo-produk-bast-pts/', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/1hIpMsZIadnJu85FiJ5Qojn_fOcYLl3iMsBagzZI4LYM/edit?usp=sharing', icon: '📑', embed: true },
      ],
    },
    {
      title: 'Ticket Troubleshooting', icon: '🎫', key: 'ticket-troubleshooting',
      gradient: 'from-rose-700 via-rose-600 to-rose-500',
      description: 'Technical support & issue tracking',
      items: [{ name: 'Ticket Management', url: '/ticketing', icon: '🔧', internal: true, embed: true }],
    },
    {
      title: 'Daily Report', icon: '📈', key: 'daily-report',
      gradient: 'from-emerald-700 via-emerald-600 to-emerald-500',
      description: 'Activity tracking & performance metrics',
      items: [
        { name: 'Submit Report', url: 'https://docs.google.com/forms/d/e/1FAIpQLSf2cCEPlQQcCR1IZ3GRx-ImgdJJ15rMxAoph77aNYmbl15gvw/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMeC3gBgeCAe5YNoVE4RfdANVyjx7xmtTA7C-G40KhExzgvAJ4cGTcyFcgbp4WWx7laBdC3VZrBGd0/pubhtml?gid=1408443365&single=true', icon: '📑', embed: true },
        { name: 'View Summary', url: 'https://onedrive.live.com/edit?cid=25d404c0b5ee2b43&id=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&resid=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&ithint=file%2Cxlsx&embed=1&em=2&AllowTyping=True&ActiveCell=%27Report%27!H3&wdHideGridlines=True&wdHideHeaders=True&wdDownloadButton=True&wdInConfigurator=True%2CTrue&edaebf=ctrl&migratedtospo=true', icon: '📊', embed: true },
      ],
    },
    {
      title: 'Database PTS', icon: '💼', key: 'database-pts',
      gradient: 'from-indigo-700 via-indigo-600 to-indigo-500',
      description: 'Central repository & documentation',
      items: [{ name: 'Access Database', url: 'https://1drv.ms/f/c/25d404c0b5ee2b43/IgBDK-61wATUIIAlAgQAAAAAARPyRqbKPJAap5G_Ol5NmA8?e=fFU8wh', icon: '🗃️', embed: false, external: true }],
    },
    {
      title: 'Unit Movement Log', icon: '🚚', key: 'unit-movement',
      gradient: 'from-amber-700 via-amber-600 to-amber-500',
      description: 'Equipment check-in & check-out tracking',
      items: [
        { name: 'Submit Movement', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnfNZ1y96xei0KdMDewxGRr2nALwA0ZLW-kKPyGh5_YhK4HA/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIVshcP1qgXMwm121wufhmpEIze-I_99qaQb1ZnuUbekpvOV-xsfKX4p-16d1UHzG3mRHIpQcNriav/pubhtml?gid=383533237&single=true', icon: '📑', embed: true },
      ],
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
      const { data, error } = await supabase.from('users').select('*')
        .eq('username', loginForm.username).eq('password', loginForm.password).single();
      if (error || !data) { alert('Username atau password salah!'); return; }
      setCurrentUser(data); setIsLoggedIn(true);
      const now = Date.now();
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());
    } catch { alert('Login gagal!'); }
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowSidebar(false); setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing'); setShowSettings(false);
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0], menuTitle: string) => {
    if (item.external && !item.embed) { window.open(item.url, '_blank'); return; }
    setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing');
    setTimeout(() => {
      if (item.internal) {
        setShowSidebar(true); setShowTicketing(true);
        setInternalUrl(item.url); setIframeTitle(`${menuTitle} - ${item.name}`);
      } else if (item.embed) {
        setShowSidebar(true); setIframeUrl(item.url);
        setIframeTitle(`${menuTitle} - ${item.name}`);
      }
    }, 150);
  };

  const handleNotifNavigate = (navInternalUrl: string, title: string) => {
    setIframeUrl(null); setShowTicketing(false); setInternalUrl('/ticketing'); setIframeTitle('');
    setTimeout(() => {
      setShowTicketing(true); setInternalUrl(navInternalUrl);
      setIframeTitle(title); setShowSidebar(true);
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
          localStorage.removeItem('currentUser');
          localStorage.removeItem('loginTime');
          setLoading(false); return;
        }
      }
      try {
        const parsed: User = JSON.parse(saved);
        setCurrentUser(parsed); setIsLoggedIn(true);
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
    const interval = setInterval(() => {
      const t = localStorage.getItem('loginTime');
      if (!t) return;
      if (Date.now() - parseInt(t) > 6 * 60 * 60 * 1000) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        setIsLoggedIn(false); setCurrentUser(null);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <div className="p-12 rounded-2xl shadow-2xl flex flex-col items-center gap-4"
        style={{ background: 'rgba(255,255,255,0.92)', border: `1px solid ${T.cardBorder}` }}>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: T.sidebarBg }}>
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: T.cardBorder, borderTopColor: T.orange }}></div>
        <p className="text-base font-semibold tracking-wide" style={{ color: T.headerText }}>Loading Portal...</p>
      </div>
    </div>
  );

  // ── Login screen ────────────────────────────────────────────────────────────
  if (!isLoggedIn) return (
    <div className="min-h-screen flex bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {/* Left panel */}
      <div className="hidden lg:flex w-80 flex-col justify-between p-10"
        style={{ background: T.sidebarBg }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: T.logoBg }}>
            <svg className="w-5 h-5" style={{ color: T.logoAccent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: T.logoAccent }}>IndoVisual</p>
            <p className="text-sm font-bold leading-none" style={{ color: T.sidebarText }}>PTS Platform</p>
          </div>
        </div>
        <div>
          <p className="text-4xl font-bold leading-tight mb-3" style={{ color: T.sidebarText }}>Work<br />Management<br />Portal</p>
          <p className="text-sm" style={{ color: T.sidebarMuted }}>Kelola tugas, tiket, dan reminder tim PTS dengan mudah.</p>
        </div>
        <p className="text-xs" style={{ color: T.sidebarMuted }}>© 2026 IndoVisual PTS IVP</p>
      </div>

      {/* Right: login form */}
      <div className="flex-1 flex items-center justify-center p-6" style={{ background: 'rgba(255,255,255,0.88)', backdropFilter: 'blur(8px)' }}>
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <p className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: T.orange }}>PTS Platform</p>
            <h1 className="text-3xl font-bold tracking-tight mb-1" style={{ color: T.headerText }}>Masuk ke Portal</h1>
            <p className="text-sm" style={{ color: T.headerMuted }}>Gunakan akun yang diberikan admin</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: T.headerMuted }}>USERNAME</label>
              <input type="text" value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full rounded-xl px-4 py-3.5 text-sm font-medium outline-none transition-all"
                style={{ border: `1.5px solid ${T.cardBorder}`, color: T.headerText, background: T.bodyBg }}
                placeholder="Masukkan username"
                onFocus={e => { e.target.style.borderColor = T.orange; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = T.cardBorder; e.target.style.background = T.bodyBg; }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: T.headerMuted }}>PASSWORD</label>
              <input type="password" value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                className="w-full rounded-xl px-4 py-3.5 text-sm font-medium outline-none transition-all"
                style={{ border: `1.5px solid ${T.cardBorder}`, color: T.headerText, background: T.bodyBg }}
                placeholder="Masukkan password"
                onFocus={e => { e.target.style.borderColor = T.orange; e.target.style.background = '#fff'; }}
                onBlur={e => { e.target.style.borderColor = T.cardBorder; e.target.style.background = T.bodyBg; }} />
            </div>
            <button onClick={handleLogin}
              className="w-full py-4 rounded-xl font-bold text-sm tracking-wide transition-all"
              style={{ background: T.sidebarBg, color: '#ffffff' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#1e2318'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.sidebarBg; }}>
              Masuk ke Portal →
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── Sub-components ──────────────────────────────────────────────────────────

  const MenuLoadingOverlay = () => (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 border-4 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: T.cardBorder, borderTopColor: T.orange }}></div>
      <p className="font-semibold tracking-wide" style={{ color: T.headerMuted }}>Memuat menu...</p>
    </div>
  );

  const PROJECT_KEYS = ['reminder-schedule', 'form-require-project', 'ticket-troubleshooting', 'form-bast'];
  const INTERNAL_KEYS = ['daily-report', 'database-pts', 'unit-movement'];

  const projectMenuItems = visibleMenuItems.filter(m => PROJECT_KEYS.includes(m.key));
  const internalMenuItems = visibleMenuItems.filter(m => INTERNAL_KEYS.includes(m.key));

  const renderMenuCard = (menu: MenuItem, index: number) => (
    <div key={menu.key} className="rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        background: T.cardBg,
        border: `1px solid ${T.cardBorder}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        animation: `fadeInUp 0.5s ease forwards`,
        animationDelay: `${index * 80}ms`,
        opacity: 0,
      }}>
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
      <div className="p-4 space-y-2.5">
        {menu.items.map((item, itemIndex) => (
          <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-semibold text-sm transition-all group/item"
            style={{ background: T.bodyBg, border: `1px solid ${T.cardBorder}`, color: T.headerText }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = T.sidebarBg;
              (e.currentTarget as HTMLButtonElement).style.color = '#fff';
              (e.currentTarget as HTMLButtonElement).style.borderColor = T.sidebarBg;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = T.bodyBg;
              (e.currentTarget as HTMLButtonElement).style.color = T.headerText;
              (e.currentTarget as HTMLButtonElement).style.borderColor = T.cardBorder;
            }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
              style={{ background: T.cardBg, border: `1px solid ${T.cardBorder}` }}>
              {item.icon}
            </div>
            <span className="flex-1 text-left tracking-wide text-sm">{item.name}</span>
            {item.external && !item.embed ? (
              <svg className="w-4 h-4 opacity-40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            ) : (
              <svg className="w-4 h-4 opacity-40 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Shared header markup ────────────────────────────────────────────────────
  const SharedHeader = () => (
    <div className="flex-shrink-0 z-[9999]"
      style={{ background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}`, boxShadow: '0 1px 8px rgba(0,0,0,0.06)' }}>
      <div className="w-full px-5 py-3.5">
        <div className="flex items-center justify-between gap-4">

          {/* LEFT: Logo */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: T.sidebarBg }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: T.orange }}>IndoVisual</p>
              <p className="text-sm font-bold leading-none" style={{ color: T.headerText }}>PTS Platform</p>
            </div>
          </div>

          {/* CENTER: NotificationBar */}
          {currentUser && (
            <div className="flex-1 flex justify-center px-4">
              <NotificationBar currentUser={currentUser} onNavigate={handleNotifNavigate} />
            </div>
          )}

          {/* RIGHT: User + Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* User badge */}
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl"
              style={{ border: `1px solid ${T.headerBorder}`, background: T.bodyBg }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: T.sidebarBg, color: T.logoAccent }}>
                {currentUser?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-bold" style={{ color: T.headerText }}>{currentUser?.full_name}</p>
                <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: T.orange }}>{currentUser?.role}</p>
              </div>
            </div>

            {(['admin', 'superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
              <button onClick={() => setShowSettings(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.22)', color: '#4338ca' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.16)'; }}
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
              style={{ background: 'rgba(224,123,42,0.08)', border: `1px solid ${T.orangeBorder}`, color: T.orangeHover }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.orangeLight; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(224,123,42,0.08)'; }}>
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

  // ── Dashboard (no sidebar) ──────────────────────────────────────────────────
  if (!showSidebar) return (
    <div className="min-h-screen flex flex-col bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
      <SharedHeader />

      <div className="flex-1 overflow-y-auto py-8 px-4 md:px-8">
        <div className="max-w-[1600px] mx-auto space-y-8">
          {menuLoading ? <MenuLoadingOverlay /> : (
            <>
              {projectMenuItems.length > 0 && (
                <div style={{ animation: 'fadeInUp 0.45s ease forwards', opacity: 0 }}>
                  <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-xl"
                    style={{ background: T.sidebarBg, boxShadow: '0 2px 12px rgba(0,0,0,0.20)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: T.orange }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <span className="text-white font-bold text-sm tracking-wide">Project</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {projectMenuItems.map((menu, i) => renderMenuCard(menu, i))}
                  </div>
                </div>
              )}

              {internalMenuItems.length > 0 && (
                <div style={{ animation: 'fadeInUp 0.45s ease 0.1s forwards', opacity: 0 }}>
                  <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-xl"
                    style={{ background: T.sidebarBg, boxShadow: '0 2px 12px rgba(0,0,0,0.20)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
                      style={{ background: T.logoAccent }}>
                      <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-white font-bold text-sm tracking-wide">Internal Daily</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {internalMenuItems.map((menu, i) => renderMenuCard(menu, i))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-shrink-0" style={{ background: 'rgba(255,255,255,0.85)', borderTop: `1px solid ${T.headerBorder}` }}>
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <p className="text-xs font-medium tracking-wide text-center" style={{ color: T.headerMuted }}>© 2026 IndoVisual — Work Management Support (PTS IVP)</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes dropIn { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );

  // ── Dashboard + Sidebar ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
      <SharedHeader />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <div className={`relative flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[72px]' : 'w-[280px]'} flex-shrink-0`}
          style={{ background: T.sidebarBg, boxShadow: '4px 0 24px rgba(0,0,0,0.25)' }}>

          {/* top accent bar */}
          <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${T.orange}, transparent)` }} />

          {/* Sidebar header */}
          <div className={`flex items-center py-5 px-4 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
            style={{ borderBottom: `1px solid ${T.sidebarBorder}` }}>
            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: T.logoBg }}>
                  <svg className="w-5 h-5" style={{ color: T.logoAccent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: T.orange }}>IndoVisual</p>
                  <p className="font-bold text-sm leading-none tracking-wide" style={{ color: T.sidebarText }}>PTS Portal</p>
                </div>
              </div>
            )}
            {sidebarCollapsed && (
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.logoBg }}>
                <svg className="w-5 h-5" style={{ color: T.logoAccent }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
            )}
            {!sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(true)}
                className="p-1.5 rounded-md transition-all"
                style={{ color: T.sidebarMuted }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.sidebarHoverBg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
                </svg>
              </button>
            )}
          </div>

          {/* Sidebar scroll area */}
          <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: 'none' }}>
            {/* Main menu button */}
            <button onClick={handleBackToDashboard}
              className={`w-full group flex items-center gap-3 px-3 py-2.5 mb-4 mt-3 rounded-xl font-semibold text-sm transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
              style={{ background: T.orangeLight, border: `1px solid ${T.orangeBorder}`, color: T.orange }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(224,123,42,0.18)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.orangeLight; }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              {!sidebarCollapsed && <span className="tracking-wide">Main Menu</span>}
            </button>

            {!sidebarCollapsed && (
              <p className="px-1 mb-3 text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: T.sidebarMuted }}>Navigation</p>
            )}

            {menuLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                  style={{ borderColor: T.sidebarBorder, borderTopColor: T.orange }}></div>
              </div>
            ) : (
              <div className="space-y-2">
                {visibleMenuItems.map((menu) => (
                  <div key={menu.key}>
                    {sidebarCollapsed ? (
                      <div className="group relative">
                        <div className="w-full rounded-xl p-2.5 flex flex-col items-center gap-1.5 cursor-default transition-all"
                          style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${T.sidebarBorder}` }}>
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
                                  style={isActive
                                    ? { background: T.orangeLight, border: `1px solid ${T.orangeBorder}`, color: T.orange }
                                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid transparent', color: T.sidebarMuted }}>
                                  {item.icon}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        {/* Tooltip */}
                        <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="rounded-xl px-4 py-3 min-w-[160px]"
                            style={{ background: T.sidebarBg, border: `1px solid ${T.orangeBorder}`, boxShadow: '0 8px 24px rgba(0,0,0,0.35)' }}>
                            <p className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: T.orange }}>{menu.title}</p>
                            {menu.items.map((item, idx) => (
                              <p key={idx} className="text-xs leading-5" style={{ color: T.sidebarText }}>{item.icon} {item.name}</p>
                            ))}
                          </div>
                          <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent"
                            style={{ borderRightColor: T.sidebarBg }} />
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${T.sidebarBorder}` }}>
                        <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.05)' }}>
                          <span className="text-base relative">
                            {menu.icon}
                            {menu.key === 'form-require-project' && formRequireNotifCount > 0 && (
                              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center animate-pulse">{formRequireNotifCount}</span>
                            )}
                          </span>
                          <span className="text-xs font-bold tracking-widest uppercase truncate" style={{ color: T.sidebarMuted }}>{menu.title}</span>
                        </div>
                        <div className="px-2 py-2 space-y-1">
                          {menu.items.map((item, itemIndex) => {
                            const isActive = (showTicketing && item.internal && internalUrl === item.url) || (iframeUrl === item.url);
                            return (
                              <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all"
                                style={isActive
                                  ? { background: T.orangeLight, border: `1px solid ${T.orangeBorder}`, color: T.orange }
                                  : { background: 'transparent', border: '1px solid transparent', color: T.sidebarText }}
                                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = T.sidebarHoverBg; } }}
                                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; } }}>
                                <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                                  style={{ background: isActive ? T.orangeLight : 'rgba(255,255,255,0.08)' }}>{item.icon}</span>
                                <span className="truncate tracking-wide">{item.name}</span>
                                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: T.orange }} />}
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

          {/* Sidebar footer — expand button */}
          <div className="p-3" style={{ borderTop: `1px solid ${T.sidebarBorder}` }}>
            {sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(false)}
                className="w-full flex justify-center p-2 rounded-xl transition-all"
                style={{ background: 'rgba(255,255,255,0.05)', color: T.sidebarMuted }}
                title="Expand sidebar"
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.sidebarHoverBg; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.05)'; }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
                </svg>
              </button>
            )}
            {!sidebarCollapsed && (
              <div className="px-1 py-2">
                <p className="text-[10px] font-bold tracking-widest uppercase mb-0.5" style={{ color: T.sidebarMuted }}>USER LOGGED IN</p>
                <p className="text-sm font-bold" style={{ color: T.sidebarText }}>{currentUser?.full_name}</p>
                <p className="text-xs" style={{ color: T.orange }}>{currentUser?.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 overflow-hidden" style={{ background: T.bodyBg }}>
            {showTicketing ? (
              <div className="w-full h-full overflow-auto">
                <iframe src={internalUrl} className="w-full h-full border-0" title={iframeTitle} />
              </div>
            ) : iframeUrl ? (
              <iframe src={iframeUrl} className="w-full h-full border-0" title={iframeTitle}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
            ) : null}
          </div>
          <div className="flex-shrink-0" style={{ background: 'rgba(255,255,255,0.90)', borderTop: `1px solid ${T.headerBorder}` }}>
            <div className="px-6 py-4">
              <p className="text-xs font-medium tracking-wide text-center" style={{ color: T.headerMuted }}>© 2026 IndoVisual - Work Management Support (PTS IVP)</p>
            </div>
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes dropIn { from { opacity: 0; transform: translateY(-8px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
      `}</style>
    </div>
  );
}
