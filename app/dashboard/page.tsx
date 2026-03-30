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

// ─── Types for Form Require Project ─────────────────────────────────────────

interface ProjectRequest {
  id: string;
  created_at: string;
  project_name: string;
  room_name: string;
  sales_name: string;
  requester_id: string;
  requester_name: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  // Form fields
  kebutuhan: string[];
  kebutuhan_other: string;
  solution_product: string[];
  solution_other: string;
  layout_signage: string[];
  jaringan_cms: string[];
  jumlah_input: string;
  jumlah_output: string;
  source: string[];
  source_other: string;
  camera_conference: string;
  camera_jumlah: string;
  camera_tracking: string[];
  audio_system: string;
  audio_detail: string[];
  wallplate_input: string;
  wallplate_jumlah: string;
  wireless_presentation: string;
  ukuran_ruangan: string;
  suggest_tampilan: string;
  keterangan_lain: string;
  // metadata
  pts_assigned?: string;
  approved_by?: string;
  approved_at?: string;
}

interface ProjectMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
  attachments?: ProjectAttachment[];
}

interface ProjectAttachment {
  id: string;
  message_id?: string;
  request_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
}

// ─── Account Settings Modal ──────────────────────────────────────────────────

const ALL_MENU_KEYS = [
  'form-bast',
  'form-require-project',
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
	'form-require-project': { label: 'Form Require Project', icon: '🏗️', gradient: 'from-violet-600 to-violet-500' },
    'ticket-troubleshooting': { label: 'Ticket Troubleshooting', icon: '🎫', gradient: 'from-rose-600 to-rose-500' },
    'daily-report': { label: 'Daily Report', icon: '📈', gradient: 'from-emerald-600 to-emerald-500' },
    'database-pts': { label: 'Database PTS', icon: '💼', gradient: 'from-indigo-600 to-indigo-500' },
    'unit-movement': { label: 'Unit Movement Log', icon: '🚚', gradient: 'from-amber-600 to-amber-500' },
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
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${user.role === 'superadmin' ? 'bg-gradient-to-br from-rose-500 to-rose-700' : user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' : 'bg-gradient-to-br from-slate-500 to-slate-700'}`}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-800 text-sm">{user.full_name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${user.role === 'superadmin' ? 'bg-rose-100 text-rose-700' : user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>{user.role}</span>
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
                        <button onClick={() => setEditingUser(user)} className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 p-2 rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 p-2 rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
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
                  <input value={newUser.full_name} onChange={e => setNewUser({ ...newUser, full_name: e.target.value })} placeholder="Nama lengkap" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Username *</label>
                  <input value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} placeholder="username" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Password *</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="Password" className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
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

// ─── Form Require Project Module ─────────────────────────────────────────────


// ─── Form Require Project Module — Ticketing Theme ──────────────────────────

function FormRequireProject({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'list' | 'new-form' | 'detail'>('list');
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);

  const isPTS = ['admin', 'superadmin'].includes(currentUser.role?.toLowerCase() ?? '');

  const initialForm = {
    project_name: '', room_name: '', sales_name: '',
    kebutuhan: [] as string[], kebutuhan_other: '',
    solution_product: [] as string[], solution_other: '',
    layout_signage: [] as string[], jaringan_cms: [] as string[],
    jumlah_input: '', jumlah_output: '',
    source: [] as string[], source_other: '',
    camera_conference: 'No', camera_jumlah: '', camera_tracking: [] as string[],
    audio_system: 'No', audio_detail: [] as string[],
    wallplate_input: 'No', wallplate_jumlah: '',
    wireless_presentation: 'No',
    ukuran_ruangan: '', suggest_tampilan: '', keterangan_lain: '',
  };

  const [form, setForm] = useState(initialForm);

  const notify = useCallback((type: 'success' | 'error' | 'info', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('project_requests').select('*').order('created_at', { ascending: false });
    if (!isPTS) query = query.eq('requester_id', currentUser.id);
    const { data, error } = await query;
    if (!error && data) setRequests(data as ProjectRequest[]);
    setLoading(false);
  }, [currentUser.id, isPTS]);

  const fetchMessages = useCallback(async (requestId: string) => {
    const { data, error } = await supabase.from('project_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
    if (!error && data) setMessages(data as ProjectMessage[]);
  }, []);

  const fetchAttachments = useCallback(async (requestId: string) => {
    const { data, error } = await supabase.from('project_attachments').select('*').eq('request_id', requestId).order('uploaded_at', { ascending: false });
    if (!error && data) setAttachments(data as ProjectAttachment[]);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    if (!isPTS) return;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    setUnreadCount(pendingCount);
  }, [requests, isPTS]);

  useEffect(() => {
    if (!selectedRequest) return;
    const channel = supabase.channel(`messages:${selectedRequest.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `request_id=eq.${selectedRequest.id}` },
        (payload) => { setMessages(prev => [...prev, payload.new as ProjectMessage]); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRequest]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleArr = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSubmitForm = async () => {
    if (!form.project_name.trim()) { notify('error', 'Nama Project wajib diisi!'); return; }
    if (form.kebutuhan.length === 0 && !form.kebutuhan_other.trim()) { notify('error', 'Pilih minimal satu Kategori Kebutuhan!'); return; }
    if (form.solution_product.length === 0 && !form.solution_other.trim()) { notify('error', 'Pilih minimal satu Solution Product!'); return; }
    setSubmitting(true);
    try {
      const payload = {
        project_name: form.project_name.trim(), room_name: form.room_name.trim(), sales_name: form.sales_name.trim(),
        kebutuhan: form.kebutuhan, kebutuhan_other: form.kebutuhan_other.trim(),
        solution_product: form.solution_product, solution_other: form.solution_other.trim(),
        layout_signage: form.layout_signage, jaringan_cms: form.jaringan_cms,
        jumlah_input: form.jumlah_input.trim(), jumlah_output: form.jumlah_output.trim(),
        source: form.source, source_other: form.source_other.trim(),
        camera_conference: form.camera_conference, camera_jumlah: form.camera_jumlah.trim(), camera_tracking: form.camera_tracking,
        audio_system: form.audio_system, audio_detail: form.audio_detail,
        wallplate_input: form.wallplate_input, wallplate_jumlah: form.wallplate_jumlah.trim(),
        wireless_presentation: form.wireless_presentation,
        ukuran_ruangan: form.ukuran_ruangan.trim(), suggest_tampilan: form.suggest_tampilan.trim(), keterangan_lain: form.keterangan_lain.trim(),
        requester_id: currentUser.id, requester_name: currentUser.full_name, status: 'pending' as const,
      };
      const { data, error } = await supabase.from('project_requests').insert([payload]).select().single();
      if (error) { notify('error', 'Gagal submit form: ' + error.message); setSubmitting(false); return; }
      if (data?.id) {
        await supabase.from('project_messages').insert([{
          request_id: data.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system',
          message: `📋 Request baru dari ${currentUser.full_name} telah masuk dan menunggu approval dari Superadmin.`,
        }]);
      }
      notify('success', '✅ Form berhasil dikirim! Menunggu approval dari Superadmin.');
      setForm(initialForm); setView('list'); fetchRequests();
    } catch { notify('error', 'Terjadi kesalahan tidak terduga. Coba lagi.'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (req: ProjectRequest) => {
    const { error } = await supabase.from('project_requests').update({ status: 'approved', approved_by: currentUser.full_name, approved_at: new Date().toISOString(), pts_assigned: currentUser.full_name }).eq('id', req.id);
    if (error) { notify('error', 'Gagal approve: ' + error.message); return; }
    notify('success', 'Request diapprove!');
    fetchRequests();
    if (selectedRequest?.id === req.id) setSelectedRequest({ ...req, status: 'approved', approved_by: currentUser.full_name, pts_assigned: currentUser.full_name });
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `✅ Request telah diapprove oleh ${currentUser.full_name}. Tim PTS akan segera memproses.` }]);
    if (selectedRequest?.id === req.id) fetchMessages(req.id);
  };

  const handleReject = async (req: ProjectRequest) => {
    if (!confirm('Yakin ingin menolak request ini?')) return;
    const { error } = await supabase.from('project_requests').update({ status: 'rejected' }).eq('id', req.id);
    if (error) { notify('error', 'Gagal reject.'); return; }
    notify('info', 'Request ditolak.');
    fetchRequests();
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `❌ Request telah ditolak oleh ${currentUser.full_name}.` }]);
    if (selectedRequest?.id === req.id) fetchMessages(req.id);
  };

  const handleStatusUpdate = async (req: ProjectRequest, newStatus: string) => {
    const { error } = await supabase.from('project_requests').update({ status: newStatus }).eq('id', req.id);
    if (error) { notify('error', 'Gagal update status.'); return; }
    notify('success', `Status → ${newStatus}`);
    fetchRequests();
    if (selectedRequest) setSelectedRequest({ ...selectedRequest, status: newStatus as ProjectRequest['status'] });
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `🔄 Status diupdate menjadi: ${newStatus.replace('_', ' ').toUpperCase()}` }]);
    if (selectedRequest?.id === req.id) fetchMessages(req.id);
  };

  const handleOpenDetail = async (req: ProjectRequest) => {
    setSelectedRequest(req);
    await fetchMessages(req.id);
    await fetchAttachments(req.id);
    setView('detail');
  };

  const handleSendMessage = async () => {
    if (!msgText.trim() || !selectedRequest) return;
    setSendingMsg(true);
    const { error } = await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: msgText.trim() }]);
    setSendingMsg(false);
    if (error) { notify('error', 'Gagal kirim pesan.'); return; }
    setMsgText('');
    fetchMessages(selectedRequest.id);
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedRequest) return;
    setUploadingFile(true);
    const ext = file.name.split('.').pop();
    const filePath = `project-files/${selectedRequest.id}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage.from('project-files').upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (storageError) { notify('error', 'Upload gagal: ' + storageError.message); setUploadingFile(false); return; }
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
    const { error: dbError } = await supabase.from('project_attachments').insert([{ request_id: selectedRequest.id, message_id: null, file_name: file.name, file_url: urlData.publicUrl, file_type: file.type || ext || 'unknown', file_size: file.size, uploaded_by: currentUser.full_name }]);
    setUploadingFile(false);
    if (dbError) { notify('error', 'Gagal menyimpan info file.'); return; }
    notify('success', `File "${file.name}" berhasil diupload!`);
    fetchAttachments(selectedRequest.id);
    await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `📎 Melampirkan file: ${file.name}` }]);
    fetchMessages(selectedRequest.id);
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:     { label: 'Pending',     color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300' },
    approved:    { label: 'Approved',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
    in_progress: { label: 'In Progress', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-300' },
    completed:   { label: 'Completed',   color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300' },
    rejected:    { label: 'Rejected',    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300' },
  };

  const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  const formatDate = (dt: string) => new Date(dt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const filteredRequests = filterStatus === 'all' ? requests : requests.filter(r => r.status === filterStatus);

  // Stats
  const stats = {
    total:       requests.length,
    pending:     requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress' || r.status === 'approved').length,
    completed:   requests.filter(r => r.status === 'completed').length,
    rejected:    requests.filter(r => r.status === 'rejected').length,
  };

  // ── CHECKBOX GROUP ──
  const CheckGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const checked = value.includes(opt);
          return (
            <button key={opt} type="button" onClick={() => onChange(toggleArr(value, opt))}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${checked ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'border-gray-300 bg-white text-gray-600 hover:border-red-300 hover:bg-red-50/50'}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'border-red-500 bg-red-500' : 'border-gray-400'}`}>
                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  const RadioGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${value === opt ? 'border-red-500 bg-red-50 text-red-700 shadow-md' : 'border-gray-300 bg-white text-gray-600 hover:border-red-300'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${value === opt ? 'border-red-500' : 'border-gray-400'}`}>
              {value === opt && <div className="w-2 h-2 rounded-full bg-red-500" />}
            </div>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Notification Toast ───────────────────────────────────────────────────
  const NotifToast = () => notification ? (
    <div className={`fixed top-4 right-4 z-[9999] px-5 py-4 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 border-2 max-w-sm animate-scale-in ${
      notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-400' :
      notification.type === 'error'   ? 'bg-red-50 text-red-800 border-red-400' :
                                        'bg-blue-50 text-blue-800 border-blue-400'}`}>
      <span className="text-xl">{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
      <div>
        <p className="font-bold">{notification.type === 'success' ? 'Berhasil!' : notification.type === 'error' ? 'Gagal!' : 'Info'}</p>
        <p className="text-xs font-medium mt-0.5 opacity-80">{notification.msg}</p>
      </div>
    </div>
  ) : null;

  // ── VIEW: LIST ──
  if (view === 'list') return (
    <div className="min-h-full p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <NotifToast />

      {/* ── Rainbow progress bar (same as Ticketing) ── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 pointer-events-none">
        <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
      </div>

      {/* ── Main Header Card ── */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-1">
              🏗️ Form Require Project
            </h1>
            <p className="text-gray-800 font-bold text-lg">IVP Product — AV Solution Request</p>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as: <span className="font-bold text-red-600">{currentUser.full_name}</span>
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">
                {currentUser.role === 'superadmin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin / PTS' : 'User / Sales'}
              </span>
              {unreadCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-bold animate-pulse">
                  🔔 {unreadCount} pending approval
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <button onClick={() => setView('new-form')}
              className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              + Buat Request Baru
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat Cards (same style as Ticketing) ── */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-purple-500">
        <h2 className="text-xl font-bold mb-5 bg-gradient-to-r from-purple-600 to-purple-800 text-transparent bg-clip-text">📊 Dashboard Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Total */}
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700">
            <div className="flex justify-center mb-2"><span className="text-4xl">📊</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.total}</p>
            <p className="text-sm font-bold text-center">Total Request</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Seluruh request</p>
          </div>
          {/* Pending */}
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 cursor-pointer" onClick={() => setFilterStatus('pending')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">⏳</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.pending}</p>
            <p className="text-sm font-bold text-center">Pending</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Menunggu approval</p>
          </div>
          {/* In Progress */}
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 cursor-pointer" onClick={() => setFilterStatus('in_progress')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">🔄</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.in_progress}</p>
            <p className="text-sm font-bold text-center">In Progress</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Approved & On-going</p>
          </div>
          {/* Completed */}
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 cursor-pointer" onClick={() => setFilterStatus('completed')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">✅</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.completed}</p>
            <p className="text-sm font-bold text-center">Completed</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Selesai ditangani</p>
          </div>
          {/* Rejected */}
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-red-500 via-red-600 to-red-700 cursor-pointer" onClick={() => setFilterStatus('rejected')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">🚫</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.rejected}</p>
            <p className="text-sm font-bold text-center">Rejected</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Ditolak</p>
          </div>
        </div>
      </div>

      {/* ── Request List Card ── */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl border-2 border-gray-300 overflow-hidden">
        {/* Filter bar */}
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 px-6 py-4 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-gray-500 tracking-widest uppercase">Filter:</span>
          {['all', 'pending', 'approved', 'in_progress', 'completed', 'rejected'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${filterStatus === s
                ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-600 shadow-md'
                : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'}`}>
              {s === 'all' ? 'Semua' : s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs font-bold text-gray-500">{filteredRequests.length} request</span>
            <button onClick={fetchRequests} className="bg-gray-200 hover:bg-gray-300 text-gray-600 p-1.5 rounded-lg transition-all" title="Refresh">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin" />
              <p className="text-gray-500 font-semibold">Memuat data...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-20">
              {/* Inline SVG graphic — same decoration style as Ticketing */}
              <div className="flex justify-center mb-6">
                <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="60" cy="60" r="55" fill="#FEF2F2" stroke="#FCA5A5" strokeWidth="2"/>
                  <rect x="35" y="30" width="50" height="60" rx="6" fill="white" stroke="#FCA5A5" strokeWidth="2"/>
                  <rect x="42" y="42" width="36" height="4" rx="2" fill="#FCA5A5"/>
                  <rect x="42" y="52" width="28" height="4" rx="2" fill="#FCA5A5"/>
                  <rect x="42" y="62" width="20" height="4" rx="2" fill="#FCA5A5"/>
                  <circle cx="60" cy="82" r="8" fill="#EF4444"/>
                  <text x="57" y="87" fill="white" fontSize="10" fontWeight="bold">!</text>
                </svg>
              </div>
              <p className="text-gray-700 font-bold text-xl mb-2">Belum ada request</p>
              <p className="text-gray-500 text-sm mb-6">
                {filterStatus !== 'all'
                  ? `Tidak ada request dengan status "${filterStatus}".`
                  : 'Belum ada form yang masuk. Buat request pertama Anda!'}
              </p>
              {filterStatus === 'all' && (
                <button onClick={() => setView('new-form')}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white px-8 py-3.5 rounded-xl font-bold shadow-xl transition-all">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Buat Request Baru
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map(req => {
                const sc = statusConfig[req.status] || statusConfig.pending;
                return (
                  <div key={req.id} onClick={() => handleOpenDetail(req)}
                    className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-2xl p-5 hover:shadow-xl hover:border-red-300 hover:from-red-50/30 hover:to-orange-50/20 transition-all cursor-pointer group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h3 className="font-bold text-gray-800 text-lg group-hover:text-red-700 transition-colors">{req.project_name}</h3>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
                          {req.status === 'pending' && isPTS && (
                            <span className="bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full animate-pulse">🔔 Perlu Approval</span>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1.5 text-sm text-gray-600">
                          <span className="flex items-center gap-1">🏢 <span className="font-semibold text-gray-800">{req.room_name || '-'}</span></span>
                          <span className="flex items-center gap-1">👤 <span className="font-semibold text-gray-800">{req.sales_name || req.requester_name}</span></span>
                          <span className="flex items-center gap-1">📅 <span className="font-semibold text-gray-800">{new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span></span>
                          {req.solution_product?.length > 0 && (
                            <span className="col-span-2 md:col-span-3 flex items-center gap-1">📦 <span className="font-medium">{req.solution_product.join(', ')}</span></span>
                          )}
                          {req.pts_assigned && <span className="flex items-center gap-1">🔧 PTS: <span className="font-semibold text-gray-800">{req.pts_assigned}</span></span>}
                        </div>
                      </div>
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {isPTS && req.status === 'pending' && (
                          <>
                            <button onClick={e => { e.stopPropagation(); handleApprove(req); }}
                              className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">
                              ✅ Approve
                            </button>
                            <button onClick={e => { e.stopPropagation(); handleReject(req); }}
                              className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                              ❌ Tolak
                            </button>
                          </>
                        )}
                        <div className="w-9 h-9 bg-white border-2 border-gray-200 group-hover:border-red-300 group-hover:bg-red-50 rounded-xl flex items-center justify-center transition-all">
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );

  // ── VIEW: NEW FORM ──
  if (view === 'new-form') return (
    <div className="min-h-full p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <NotifToast />

      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 pointer-events-none">
        <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
      </div>

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="bg-gradient-to-r from-gray-600 to-gray-800 text-white p-2.5 rounded-xl hover:from-gray-700 hover:to-gray-900 font-bold shadow-lg transition-all" title="Kembali">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
              📋 Form Equipment Request — IVP
            </h1>
            <p className="text-gray-600 text-sm mt-0.5">
              Isi form kebutuhan solution AV project Anda •
              Requester: <span className="font-bold text-red-600">{currentUser.full_name}</span>
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end">
            <span className="text-xs text-gray-500 font-medium">Diajukan sebagai</span>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">{currentUser.role.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">

        {/* Project Info */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">📁</span>
            Informasi Project
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Nama Project *</label>
              <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                placeholder="Contoh: Meeting Room Lantai 5 - PT ABC"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all font-medium bg-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Nama Ruangan</label>
              <input value={form.room_name} onChange={e => setForm({ ...form, room_name: e.target.value })}
                placeholder="Nama ruangan / area"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all font-medium bg-white outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Sales / Account</label>
              <input value={form.sales_name} onChange={e => setForm({ ...form, sales_name: e.target.value })}
                placeholder="Nama Sales / Account Manager"
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all font-medium bg-white outline-none" />
            </div>
          </div>
        </div>

        {/* Kebutuhan & Solution */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">🎯</span>
            Kategori Kebutuhan & Solution
          </h3>
          <CheckGroup label="Kebutuhan" options={['Signage', 'Immersive', 'Meeting Room', 'Mapping', 'Command Center', 'Hybrid Classroom']}
            value={form.kebutuhan} onChange={v => setForm({ ...form, kebutuhan: v })} />
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Other Kebutuhan</label>
            <input value={form.kebutuhan_other} onChange={e => setForm({ ...form, kebutuhan_other: e.target.value })}
              placeholder="Tuliskan jika ada..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
          </div>
          <CheckGroup label="Solution Product" options={['Videowall', 'Signage Display', 'Projector', 'Kiosk', 'IFP']}
            value={form.solution_product} onChange={v => setForm({ ...form, solution_product: v })} />
          <div>
            <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Other Solution</label>
            <input value={form.solution_other} onChange={e => setForm({ ...form, solution_other: e.target.value })}
              placeholder="Tuliskan jika ada..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
          </div>
        </div>

        {/* Signage & Network */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">📺</span>
            Layout Konten & Jaringan CMS
          </h3>
          <CheckGroup label="Layout Content Signage" options={['Fullscreen only (Image/Video slideshow)', 'Split 2,3 atau multi zone content', 'Running text dan lain-lain']}
            value={form.layout_signage} onChange={v => setForm({ ...form, layout_signage: v })} />
          <CheckGroup label="Jaringan CMS Signage" options={['Cloud Base', 'On-Premise']}
            value={form.jaringan_cms} onChange={v => setForm({ ...form, jaringan_cms: v })} />
        </div>

        {/* Source & I/O */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">🔌</span>
            Sumber & Input / Output
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Jumlah Input</label>
              <input value={form.jumlah_input} onChange={e => setForm({ ...form, jumlah_input: e.target.value })}
                placeholder="e.g. 4" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Jumlah Output</label>
              <input value={form.jumlah_output} onChange={e => setForm({ ...form, jumlah_output: e.target.value })}
                placeholder="e.g. 2" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
            </div>
          </div>
          <CheckGroup label="Source" options={['PC', 'URL', 'NVR', 'Laptop']}
            value={form.source} onChange={v => setForm({ ...form, source: v })} />
          <div>
            <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Other Source</label>
            <input value={form.source_other} onChange={e => setForm({ ...form, source_other: e.target.value })}
              placeholder="Tuliskan jika ada..." className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
          </div>
        </div>

        {/* Camera & Audio */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">📷</span>
            Camera Conference & Audio
          </h3>
          <RadioGroup label="Camera Conference" options={['Yes', 'No']} value={form.camera_conference} onChange={v => setForm({ ...form, camera_conference: v })} />
          {form.camera_conference === 'Yes' && (
            <div className="ml-0 pl-4 border-l-4 border-red-300 mb-4">
              <div className="mb-3">
                <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Jumlah Kamera</label>
                <input value={form.camera_jumlah} onChange={e => setForm({ ...form, camera_jumlah: e.target.value })}
                  placeholder="e.g. 2" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
              </div>
              <CheckGroup label="Tracking" options={['No Tracking', 'Voice', 'Human Detection', 'Track Mic Delegate']}
                value={form.camera_tracking} onChange={v => setForm({ ...form, camera_tracking: v })} />
            </div>
          )}
          <RadioGroup label="Audio System" options={['Yes', 'No']} value={form.audio_system} onChange={v => setForm({ ...form, audio_system: v })} />
          {form.audio_system === 'Yes' && (
            <CheckGroup label="Keperluan Audio" options={['Mic', 'PC Audio', 'Speaker']}
              value={form.audio_detail} onChange={v => setForm({ ...form, audio_detail: v })} />
          )}
        </div>

        {/* Wallplate & Wireless */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">📡</span>
            Wallplate & Wireless
          </h3>
          <RadioGroup label="Wallplate Input" options={['Yes', 'No']} value={form.wallplate_input} onChange={v => setForm({ ...form, wallplate_input: v })} />
          {form.wallplate_input === 'Yes' && (
            <div className="mb-4 pl-4 border-l-4 border-red-300">
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Jumlah Wallplate</label>
              <input value={form.wallplate_jumlah} onChange={e => setForm({ ...form, wallplate_jumlah: e.target.value })}
                placeholder="e.g. 3" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
            </div>
          )}
          <RadioGroup label="Wireless Presentation" options={['Yes', 'No']} value={form.wireless_presentation} onChange={v => setForm({ ...form, wireless_presentation: v })} />
        </div>

        {/* Ukuran & Keterangan */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">📐</span>
            Ukuran & Keterangan
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Ukuran Ruangan (P × L × T)</label>
              <input value={form.ukuran_ruangan} onChange={e => setForm({ ...form, ukuran_ruangan: e.target.value })}
                placeholder="e.g. 8m × 6m × 3m" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Suggest Tampilan (W × H)</label>
              <input value={form.suggest_tampilan} onChange={e => setForm({ ...form, suggest_tampilan: e.target.value })}
                placeholder="e.g. 1920 × 1080 px atau 4K" className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-1">Keterangan Lain</label>
              <textarea value={form.keterangan_lain} onChange={e => setForm({ ...form, keterangan_lain: e.target.value })}
                rows={4} placeholder="Tuliskan informasi tambahan / catatan penting lainnya..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-all bg-white outline-none resize-none" />
            </div>
          </div>
        </div>

        {/* Konfirmasi & Submit */}
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
          <h3 className="text-base font-bold text-gray-800 mb-4 pb-3 border-b-2 border-gray-200 flex items-center gap-2">
            <span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center text-sm shadow">📨</span>
            Konfirmasi & Kirim
          </h3>
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-5 text-sm text-red-800">
            <p className="font-bold mb-1.5">📌 Checklist sebelum mengirim:</p>
            <ul className="space-y-1 text-red-700 list-disc list-inside font-medium">
              <li>Nama Project sudah diisi dengan benar</li>
              <li>Kategori Kebutuhan sudah dipilih</li>
              <li>Solution Product sudah dipilih</li>
            </ul>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setView('list')} className="flex-1 bg-gradient-to-r from-gray-600 to-gray-800 text-white py-4 rounded-xl font-bold hover:from-gray-700 hover:to-gray-900 shadow-lg transition-all">
              ← Batal
            </button>
            <button onClick={handleSubmitForm} disabled={submitting}
              className="flex-[2] bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white py-4 px-8 rounded-xl font-bold shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-base">
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Mengirim...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Kirim Request ke Superadmin
                </>
              )}
            </button>
          </div>
        </div>

        <div className="pb-8" />
      </div>

      <style jsx>{`
        @keyframes scale-in { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );

  // ── VIEW: DETAIL ──
  if (view === 'detail' && selectedRequest) {
    const sc = statusConfig[selectedRequest.status] || statusConfig.pending;
    const isPending = selectedRequest.status === 'pending';
    const isFileType = (type: string) => type.startsWith('image/') || ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(type);

    return (
      <div className="h-full flex flex-col bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <NotifToast />

        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 pointer-events-none">
          <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
        </div>

        {/* Detail Header */}
        <div className="bg-white/95 backdrop-blur-md border-b-4 border-red-600 px-6 py-4 flex-shrink-0 shadow-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('list')} className="bg-gradient-to-r from-gray-600 to-gray-800 text-white p-2 rounded-xl hover:from-gray-700 hover:to-gray-900 font-bold shadow-md transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 truncate">{selectedRequest.project_name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
              </div>
              <p className="text-gray-600 text-sm mt-0.5">{selectedRequest.room_name} · {selectedRequest.requester_name} · {formatDate(selectedRequest.created_at)}</p>
            </div>
            {isPTS && (
              <div className="flex gap-2 flex-shrink-0">
                {isPending && (
                  <>
                    <button onClick={() => handleApprove(selectedRequest)}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">✅ Approve</button>
                    <button onClick={() => handleReject(selectedRequest)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300 px-4 py-2 rounded-xl text-sm font-bold transition-all">❌ Tolak</button>
                  </>
                )}
                {selectedRequest.status === 'approved' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'in_progress')}
                    className="bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">🔄 In Progress</button>
                )}
                {selectedRequest.status === 'in_progress' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'completed')}
                    className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">✅ Selesai</button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Detail Summary + Attachments */}
          <div className="w-[400px] flex-shrink-0 border-r-2 border-gray-200 flex flex-col overflow-hidden bg-white/90 backdrop-blur-sm">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 space-y-2.5 text-sm border-2 border-gray-200 shadow-md">
                <p className="text-xs font-bold text-red-600 tracking-widest uppercase mb-2 pb-2 border-b border-gray-200">Detail Kebutuhan</p>
                {selectedRequest.kebutuhan?.length > 0 && <div><span className="font-bold text-gray-700">Kebutuhan:</span> <span className="text-gray-600">{selectedRequest.kebutuhan.join(', ')}</span></div>}
                {selectedRequest.kebutuhan_other && <div><span className="font-bold text-gray-700">Other:</span> <span className="text-gray-600">{selectedRequest.kebutuhan_other}</span></div>}
                {selectedRequest.solution_product?.length > 0 && <div><span className="font-bold text-gray-700">Solution:</span> <span className="text-gray-600">{selectedRequest.solution_product.join(', ')}</span></div>}
                {selectedRequest.layout_signage?.length > 0 && <div><span className="font-bold text-gray-700">Layout:</span> <span className="text-gray-600">{selectedRequest.layout_signage.join(', ')}</span></div>}
                {selectedRequest.jaringan_cms?.length > 0 && <div><span className="font-bold text-gray-700">CMS:</span> <span className="text-gray-600">{selectedRequest.jaringan_cms.join(', ')}</span></div>}
                {(selectedRequest.jumlah_input || selectedRequest.jumlah_output) && <div><span className="font-bold text-gray-700">I/O:</span> <span className="text-gray-600">Input {selectedRequest.jumlah_input} / Output {selectedRequest.jumlah_output}</span></div>}
                {selectedRequest.source?.length > 0 && <div><span className="font-bold text-gray-700">Source:</span> <span className="text-gray-600">{selectedRequest.source.join(', ')}</span></div>}
                <div><span className="font-bold text-gray-700">Camera:</span> <span className="text-gray-600">{selectedRequest.camera_conference}{selectedRequest.camera_jumlah ? ` (${selectedRequest.camera_jumlah} unit)` : ''}</span></div>
                {selectedRequest.camera_tracking?.length > 0 && <div><span className="font-bold text-gray-700">Tracking:</span> <span className="text-gray-600">{selectedRequest.camera_tracking.join(', ')}</span></div>}
                <div><span className="font-bold text-gray-700">Audio:</span> <span className="text-gray-600">{selectedRequest.audio_system}{selectedRequest.audio_detail?.length > 0 ? ` — ${selectedRequest.audio_detail.join(', ')}` : ''}</span></div>
                <div><span className="font-bold text-gray-700">Wallplate:</span> <span className="text-gray-600">{selectedRequest.wallplate_input}{selectedRequest.wallplate_jumlah ? ` (${selectedRequest.wallplate_jumlah})` : ''}</span></div>
                <div><span className="font-bold text-gray-700">Wireless:</span> <span className="text-gray-600">{selectedRequest.wireless_presentation}</span></div>
                {selectedRequest.ukuran_ruangan && <div><span className="font-bold text-gray-700">Ukuran:</span> <span className="text-gray-600">{selectedRequest.ukuran_ruangan}</span></div>}
                {selectedRequest.suggest_tampilan && <div><span className="font-bold text-gray-700">Display:</span> <span className="text-gray-600">{selectedRequest.suggest_tampilan}</span></div>}
                {selectedRequest.keterangan_lain && <div><span className="font-bold text-gray-700">Catatan:</span> <span className="text-gray-600">{selectedRequest.keterangan_lain}</span></div>}
                {selectedRequest.pts_assigned && <div className="pt-2 border-t border-gray-200"><span className="font-bold text-gray-700">PTS:</span> <span className="text-blue-700 font-semibold">{selectedRequest.pts_assigned}</span></div>}
                {selectedRequest.approved_by && <div><span className="font-bold text-gray-700">Approved by:</span> <span className="text-emerald-700 font-semibold">{selectedRequest.approved_by}</span></div>}
              </div>

              {/* Attachments */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-red-600 tracking-widest uppercase">Lampiran ({attachments.length})</p>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-md">
                    {uploadingFile ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📎'}
                    Upload
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                </div>
                <div className="space-y-2">
                  {attachments.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 font-medium">
                      📂 Belum ada lampiran
                    </div>
                  ) : attachments.map(att => (
                    <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-red-50 hover:to-orange-50/30 border-2 border-gray-200 hover:border-red-300 rounded-xl transition-all group">
                      <div className="w-10 h-10 bg-white rounded-lg border-2 border-gray-200 flex items-center justify-center text-lg flex-shrink-0 shadow-sm">
                        {isFileType(att.file_type) ? '🖼️' : att.file_type.includes('pdf') ? '📄' : '📎'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-700 group-hover:text-red-700 truncate">{att.file_name}</p>
                        <p className="text-xs text-gray-400">{formatFileSize(att.file_size)} · {att.uploaded_by}</p>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Chat */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white/80 backdrop-blur-sm">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-5 py-4 flex-shrink-0 border-b-2 border-blue-500 shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm">💬</div>
                <div>
                  <p className="font-bold text-white text-sm">Activity & Q&A</p>
                  <p className="text-blue-100 text-xs">Komunikasi antara Sales/Guest dan Tim PTS</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/80">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  <div className="text-4xl mb-2">💬</div>
                  <p className="font-medium">Belum ada percakapan. Mulai tanya jawab di sini!</p>
                </div>
              ) : messages.map(msg => {
                const isMe = msg.sender_id === currentUser.id;
                const isSystem = msg.sender_role === 'system';
                if (isSystem) return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-gray-200 text-gray-600 text-xs px-4 py-2 rounded-full font-semibold border border-gray-300">{msg.message}</div>
                  </div>
                );
                const isPTSSender = ['admin', 'superadmin'].includes(msg.sender_role);
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow ${isPTSSender ? 'bg-gradient-to-br from-red-600 to-red-800' : 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-bold text-gray-600">{msg.sender_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isPTSSender ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                          {isPTSSender ? 'PTS' : 'Guest'}
                        </span>
                        <span className="text-[10px] text-gray-400">{formatDate(msg.created_at)}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe
                        ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-tr-sm'
                        : 'bg-white text-gray-800 border-2 border-gray-200 rounded-tl-sm'}`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t-2 border-gray-200 p-4 flex-shrink-0">
              <div className="flex gap-3">
                <div className="flex-1 flex items-end gap-2 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-2 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100 transition-all">
                  <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                    placeholder="Ketik pesan, pertanyaan, atau update activity... (Enter untuk kirim)"
                    rows={1} className="flex-1 bg-transparent text-sm text-gray-800 outline-none resize-none max-h-32 placeholder-gray-400 font-medium" />
                  <button onClick={() => chatFileRef.current?.click()}
                    className="text-gray-400 hover:text-red-600 transition-colors p-1 flex-shrink-0" title="Lampirkan file">
                    {uploadingFile
                      ? <div className="w-5 h-5 border-2 border-gray-300 border-t-red-500 rounded-full animate-spin" />
                      : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                  </button>
                  <input ref={chatFileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                </div>
                <button onClick={handleSendMessage} disabled={sendingMsg || !msgText.trim()}
                  className="bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 text-white p-3 rounded-2xl transition-all disabled:opacity-50 flex-shrink-0 shadow-xl">
                  {sendingMsg
                    ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                </button>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes scale-in { from { opacity:0; transform:scale(0.92); } to { opacity:1; transform:scale(1); } }
          .animate-scale-in { animation: scale-in 0.2s ease-out; }
        `}</style>
      </div>
    );
  }

  return null;
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
  const [showFormRequire, setShowFormRequire] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [formRequireNotifCount, setFormRequireNotifCount] = useState(0);

  const allMenuItems: MenuItem[] = [
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
      title: 'Form Require Project', icon: '🏗️', key: 'form-require-project',
      gradient: 'from-violet-700 via-violet-600 to-violet-500',
      description: 'Solution request form untuk project Sales & Account',
      items: [{ name: 'Buka Platform', url: '/form-require-project', icon: '📋', internal: true, embed: true }]
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

  // Fetch pending form require count for bell notification
  useEffect(() => {
    if (!currentUser || !['admin', 'superadmin'].includes(currentUser.role?.toLowerCase() ?? '')) return;
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
    setShowSidebar(false); setIframeUrl(null); setShowTicketing(false); setShowFormRequire(false); setShowSettings(false);
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0], menuTitle: string) => {
    setIframeUrl(null); setShowTicketing(false); setShowFormRequire(false);
    if (menuTitle === 'Form Require Project' || item.url === '/form-require-project') {
      setShowSidebar(true);
      setShowFormRequire(true);
      setIframeTitle('Form Require Project');
    } else if (item.internal) {
      setShowSidebar(true); setShowTicketing(true);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    } else if (item.external && !item.embed) {
      window.open(item.url, '_blank');
    } else if (item.embed) {
      setShowSidebar(true); setIframeUrl(item.url);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    }
  };

  const handleBackToDashboard = () => {
    setShowSidebar(false); setIframeUrl(null); setShowTicketing(false); setShowFormRequire(false); setIframeTitle('');
  };

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) { const user = JSON.parse(saved); setCurrentUser(user); setIsLoggedIn(true); }
    setLoading(false);
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
          <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Portal Terpadu</h1>
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

  // Bell notif button for Form Require
  const FormRequireBell = () => (
    formRequireNotifCount > 0 ? (
      <div className="fixed bottom-6 z-50" style={{ left: '50%', transform: 'translateX(-50%)' }}>
        <button onClick={() => { setShowSidebar(true); setShowFormRequire(true); setIframeTitle('Form Require Project'); setShowTicketing(false); setIframeUrl(null); }}
          className="bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white px-5 py-3 rounded-full shadow-2xl hover:shadow-violet-500/50 transition-all duration-300 hover:scale-105 flex items-center gap-2 font-bold text-sm">
          <span className="relative flex items-center">
            🔔
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white animate-pulse">
              {formRequireNotifCount}
            </span>
          </span>
          {formRequireNotifCount} Request Baru — Form Require Project
        </button>
      </div>
    ) : null
  );

  const MenuLoadingOverlay = () => (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
      <p className="text-slate-600 font-semibold tracking-wide">Memuat menu...</p>
    </div>
  );

  if (!showSidebar) return (
    <div className="min-h-screen flex flex-col bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}
      <FormRequireBell />

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
                <p className="text-sm text-slate-500 mt-2">Welcome back, <span className="font-semibold text-rose-600">{currentUser?.full_name}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {(['admin', 'superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
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
              <p className="text-white/80 text-lg font-medium">Access all your essential tools and resources in one centralized platform. Select a module below to begin.</p>
            </div>
          </div>

          {menuLoading ? <MenuLoadingOverlay /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-6">
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
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 px-5 py-4 rounded-md font-semibold shadow-sm hover:shadow-md transition-all text-right flex items-center justify-end gap-4 group/item relative">
                        {menu.key === 'form-require-project' && formRequireNotifCount > 0 && (
                          <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                            {formRequireNotifCount}
                          </span>
                        )}
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
          <p className="text-slate-700 text-sm font-semibold tracking-wide text-center">© 2026 IndoVisual - Portal Terpadu Support (PTS IVP)</p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
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
                            const isActive = (showFormRequire && menu.key === 'form-require-project') || (showTicketing && item.internal && menu.key !== 'form-require-project') || (iframeUrl === item.url);
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
                          const isActive = (showFormRequire && menu.key === 'form-require-project') || (showTicketing && item.internal && menu.key !== 'form-require-project') || (iframeUrl === item.url);
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {showFormRequire ? (
          /* Form Require Project renders fullscreen in main content area */
          currentUser && <FormRequireProject currentUser={currentUser} />
        ) : (
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
                  <iframe src="/ticketing" className="w-full h-full border-0" title="Ticketing System" />
                </div>
              ) : iframeUrl ? (
                <iframe src={iframeUrl} className="w-full h-full border-0" title={iframeTitle} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : null}
            </div>

            <div className="bg-white/75 backdrop-blur-sm border-t border-slate-200 shadow-lg">
              <div className="px-6 py-5">
                <p className="text-slate-700 text-sm font-semibold tracking-wide text-center">© 2026 IndoVisual - Portal Terpadu Support (PTS IVP)</p>
              </div>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
