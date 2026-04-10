'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'pending' | 'in_progress' | 'done' | 'cancelled';
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

interface Reminder {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_name: string;
  due_date: string;
  due_time: string;
  priority: Priority;
  status: Status;
  repeat: RepeatType;
  category: string;
  // ── Field Baru ──────────────────────────
  sales_name: string;
  sales_phone: string;
  project_location: string;
  pic_project: string;        // opsional
  // ────────────────────────────────────────
  created_by: string;
  created_at: string;
  notes?: string;
}

interface TeamUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
}

// ─── SQL Setup — jalankan di Supabase SQL Editor ──────────────────────────────
// Buat tabel baru:
// CREATE TABLE IF NOT EXISTS reminders (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   title TEXT NOT NULL,
//   description TEXT DEFAULT '',
//   assigned_to TEXT NOT NULL,
//   assigned_name TEXT NOT NULL,
//   due_date DATE NOT NULL,
//   due_time TIME DEFAULT '09:00',
//   priority TEXT DEFAULT 'medium',
//   status TEXT DEFAULT 'pending',
//   repeat TEXT DEFAULT 'none',
//   category TEXT DEFAULT 'Demo Product',
//   sales_name TEXT DEFAULT '',
//   sales_phone TEXT DEFAULT '',
//   project_location TEXT DEFAULT '',
//   pic_project TEXT DEFAULT '',
//   created_by TEXT NOT NULL,
//   created_at TIMESTAMPTZ DEFAULT NOW(),
//   notes TEXT DEFAULT ''
// );
// ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "Allow all" ON reminders FOR ALL USING (true);
//
// Jika tabel sudah ada, tambahkan kolom baru saja:
// ALTER TABLE reminders ADD COLUMN IF NOT EXISTS sales_name TEXT DEFAULT '';
// ALTER TABLE reminders ADD COLUMN IF NOT EXISTS sales_phone TEXT DEFAULT '';
// ALTER TABLE reminders ADD COLUMN IF NOT EXISTS project_location TEXT DEFAULT '';
// ALTER TABLE reminders ADD COLUMN IF NOT EXISTS pic_project TEXT DEFAULT '';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  low:    { label: 'Low',    color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.3)', dot: '#94a3b8' },
  medium: { label: 'Medium', color: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.3)',    dot: '#f59e0b' },
  high:   { label: 'High',   color: '#c2410c', bg: 'rgba(194,65,12,0.08)',   border: 'rgba(194,65,12,0.3)',   dot: '#f97316' },
  urgent: { label: 'Urgent', color: '#be123c', bg: 'rgba(190,18,60,0.1)',    border: 'rgba(190,18,60,0.35)',  dot: '#f43f5e' },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:     { label: 'Pending',     color: '#b45309', bg: 'rgba(180,83,9,0.08)',    border: 'rgba(180,83,9,0.25)',    icon: '⏳' },
  in_progress: { label: 'In Progress', color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)',   border: 'rgba(29,78,216,0.25)',   icon: '🔄' },
  done:        { label: 'Done',        color: '#047857', bg: 'rgba(4,120,87,0.08)',     border: 'rgba(4,120,87,0.25)',    icon: '✅' },
  cancelled:   { label: 'Cancelled',   color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.25)', icon: '❌' },
};

const CATEGORIES = ['Demo Product', 'Meeting & Survey', 'Konfigurasi', 'Troubleshooting'];

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string }> = {
  'Demo Product':     { icon: '🖥️', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
  'Meeting & Survey': { icon: '🤝', color: '#0369a1', bg: 'rgba(3,105,161,0.08)',   border: 'rgba(3,105,161,0.25)'  },
  'Konfigurasi':      { icon: '⚙️', color: '#047857', bg: 'rgba(4,120,87,0.08)',    border: 'rgba(4,120,87,0.25)'   },
  'Troubleshooting':  { icon: '🔧', color: '#be123c', bg: 'rgba(190,18,60,0.08)',   border: 'rgba(190,18,60,0.25)'  },
};

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none',    label: 'Tidak Berulang' },
  { value: 'daily',   label: 'Setiap Hari' },
  { value: 'weekly',  label: 'Setiap Minggu' },
  { value: 'monthly', label: 'Setiap Bulan' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function isOverdue(due_date: string, due_time: string, status: Status) {
  if (status === 'done' || status === 'cancelled') return false;
  return new Date(`${due_date}T${due_time || '23:59'}`) < new Date();
}

function isDueToday(due_date: string) {
  return due_date === new Date().toISOString().split('T')[0];
}

function isDueSoon(due_date: string, due_time: string, status: Status) {
  if (status === 'done' || status === 'cancelled') return false;
  const diff = (new Date(`${due_date}T${due_time || '23:59'}`).getTime() - Date.now()) / 3600000;
  return diff > 0 && diff <= 24;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_CONFIG[priority];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      {c.icon} {c.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_CONFIG[category] ?? { icon: '📁', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      {c.icon} {category}
    </span>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b-2" style={{ borderColor: '#e0f2fe' }}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-bold tracking-wide" style={{ color: '#0369a1' }}>{title}</span>
    </div>
  );
}

function SectionHeaderSmall({ icon, title }: { icon: string; title: string }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
      <span>{icon}</span>{title}
    </p>
  );
}

function StatChip({ icon, label, value, color, bg, border }: { icon: string; label: string; value: number; color: string; bg: string; border: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold" style={{ background: bg, border: `1px solid ${border}`, color }}>
      {icon} {value} {label}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5 tracking-widest uppercase" style={{ color: '#64748b' }}>{label}</label>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReminderSchedulePage() {
  const [currentUser, setCurrentUser]   = useState<TeamUser | null>(null);
  const [teamUsers, setTeamUsers]       = useState<TeamUser[]>([]);
  const [reminders, setReminders]       = useState<Reminder[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);

  const [view, setView]                     = useState<'list' | 'calendar' | 'form' | 'detail'>('list');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [editingReminder, setEditingReminder]   = useState<Reminder | null>(null);

  const [filterStatus, setFilterStatus]     = useState<Status | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [calendarMonth, setCalendarMonth]   = useState(new Date());
  const [toast, setToast]                   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const emptyForm: Omit<Reminder, 'id' | 'created_at' | 'assigned_name' | 'created_by'> = {
    title: '', description: '', assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '09:00', priority: 'medium', status: 'pending',
    repeat: 'none', category: 'Demo Product',
    sales_name: '', sales_phone: '', project_location: '', pic_project: '',
    notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const fd = (patch: Partial<typeof emptyForm>) => setFormData(prev => ({ ...prev, ...patch }));

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) { try { setCurrentUser(JSON.parse(saved)); } catch { /* ignore */ } }
    fetchTeamUsers();
    fetchReminders();

    const ch = supabase.channel('reminders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, fetchReminders)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const fetchTeamUsers = async () => {
    const { data } = await supabase.from('users').select('id, username, full_name, role').order('full_name');
    if (data) setTeamUsers(data);
  };

  const fetchReminders = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('reminders').select('*')
      .order('due_date', { ascending: true }).order('due_time', { ascending: true });
    if (!error && data) setReminders(data as Reminder[]);
    setLoading(false);
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formData.title.trim())            { notify('error', 'Judul reminder wajib diisi!');  return; }
    if (!formData.assigned_to)             { notify('error', 'Pilih anggota team!');           return; }
    if (!formData.due_date)                { notify('error', 'Tanggal wajib diisi!');          return; }
    if (!formData.sales_name.trim())       { notify('error', 'Nama Sales wajib diisi!');       return; }
    if (!formData.project_location.trim()) { notify('error', 'Lokasi Project wajib diisi!');  return; }

    const assignee = teamUsers.find(u => u.username === formData.assigned_to);
    const payload = { ...formData, assigned_name: assignee?.full_name ?? formData.assigned_to, created_by: currentUser?.username ?? 'system' };

    setSaving(true);
    const { error } = editingReminder
      ? await supabase.from('reminders').update(payload).eq('id', editingReminder.id)
      : await supabase.from('reminders').insert([payload]);

    if (error) notify('error', 'Gagal menyimpan: ' + error.message);
    else notify('success', editingReminder ? 'Reminder diperbarui!' : 'Reminder ditambahkan!');

    setSaving(false);
    setView('list');
    setEditingReminder(null);
    setFormData(emptyForm);
    fetchReminders();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus reminder ini?')) return;
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) { notify('error', 'Gagal menghapus.'); return; }
    notify('success', 'Reminder dihapus.');
    setView('list'); setSelectedReminder(null); fetchReminders();
  };

  const handleStatusChange = async (id: string, status: Status) => {
    const { error } = await supabase.from('reminders').update({ status }).eq('id', id);
    if (error) { notify('error', 'Gagal update status.'); return; }
    notify('success', 'Status diperbarui!');
    fetchReminders();
    if (selectedReminder?.id === id) setSelectedReminder(prev => prev ? { ...prev, status } : null);
  };

  const openEdit = (r: Reminder) => {
    setEditingReminder(r);
    setFormData({ title: r.title, description: r.description, assigned_to: r.assigned_to, due_date: r.due_date,
      due_time: r.due_time, priority: r.priority, status: r.status, repeat: r.repeat, category: r.category,
      sales_name: r.sales_name ?? '', sales_phone: r.sales_phone ?? '',
      project_location: r.project_location ?? '', pic_project: r.pic_project ?? '', notes: r.notes ?? '' });
    setView('form');
  };

  // ─── Filters ───────────────────────────────────────────────────────────────

  const filteredReminders = reminders.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterAssignee !== 'all' && r.assigned_to !== filterAssignee) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (![r.title, r.assigned_name, r.sales_name ?? '', r.project_location ?? ''].some(s => s.toLowerCase().includes(q))) return false;
    }
    return true;
  });

  const overdueCount = reminders.filter(r => isOverdue(r.due_date, r.due_time, r.status)).length;
  const todayCount   = reminders.filter(r => isDueToday(r.due_date) && r.status !== 'done' && r.status !== 'cancelled').length;
  const pendingCount = reminders.filter(r => r.status === 'pending').length;
  const doneCount    = reminders.filter(r => r.status === 'done').length;

  // ─── Calendar ──────────────────────────────────────────────────────────────

  const getDaysInMonth = (date: Date) => {
    const y = date.getFullYear(), m = date.getMonth();
    return { firstDay: new Date(y, m, 1).getDay(), daysInMonth: new Date(y, m + 1, 0).getDate(), year: y, month: m };
  };

  const getRemindersForDay = (day: number) => {
    const { year, month } = getDaysInMonth(calendarMonth);
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return reminders.filter(r => r.due_date === ds);
  };

  const isAdmin = ['admin', 'superadmin', 'team_pts'].includes(currentUser?.role?.toLowerCase() ?? '');

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f0fdf4 100%)' }}>

      {toast && (
        <div className={`fixed top-5 right-5 z-[200] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'} text-white`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(255,255,255,0.88)', borderColor: 'rgba(14,165,233,0.15)' }}>
        <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
              <span className="text-2xl">🗓️</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: '#0c4a6e' }}>Reminder Schedule</h1>
              <p className="text-xs font-medium" style={{ color: '#38bdf8' }}>PTS IVP — Team Work Planner</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <StatChip icon="🔥" label="Overdue"  value={overdueCount} color="#be123c" bg="rgba(190,18,60,0.08)"  border="rgba(190,18,60,0.2)" />
            <StatChip icon="📅" label="Hari Ini" value={todayCount}   color="#0369a1" bg="rgba(3,105,161,0.08)"  border="rgba(3,105,161,0.2)" />
            <StatChip icon="⏳" label="Pending"  value={pendingCount} color="#b45309" bg="rgba(180,83,9,0.08)"   border="rgba(180,83,9,0.2)" />
            <StatChip icon="✅" label="Done"     value={doneCount}    color="#047857" bg="rgba(4,120,87,0.08)"   border="rgba(4,120,87,0.2)" />
          </div>
          <div className="flex items-center gap-2">
            {(['list', 'calendar'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={view === v
                  ? { background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', color: '#fff', boxShadow: '0 2px 8px rgba(14,165,233,0.4)' }
                  : { background: 'rgba(14,165,233,0.08)', color: '#0369a1', border: '1px solid rgba(14,165,233,0.2)' }}>
                {v === 'list' ? '☰ List' : '📆 Kalender'}
              </button>
            ))}
            {isAdmin && (
              <button onClick={() => { setEditingReminder(null); setFormData(emptyForm); setView('form'); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:scale-105 shadow-lg transition-all"
                style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)', boxShadow: '0 4px 12px rgba(14,165,233,0.4)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Tambah Reminder
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-5 py-6">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* FORM VIEW                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === 'form' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-sky-100">
              <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">{editingReminder ? '✏️ Edit Reminder' : '➕ Tambah Reminder'}</h2>
                    <p className="text-sky-200 text-xs mt-1">Isi detail jadwal & informasi project</p>
                  </div>
                  <button onClick={() => { setView('list'); setEditingReminder(null); setFormData(emptyForm); }}
                    className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-6">

                {/* ── SECTION 1: Jadwal ── */}
                <SectionHeader icon="📋" title="Informasi Jadwal" />

                <FormField label="Judul Reminder *">
                  <input value={formData.title} onChange={e => fd({ title: e.target.value })}
                    className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                    style={{ borderColor: '#e0f2fe' }} placeholder="Contoh: Demo Projector @ PT. Maju Bersama" />
                </FormField>

                <FormField label="Deskripsi">
                  <textarea value={formData.description} onChange={e => fd({ description: e.target.value })}
                    rows={2} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 resize-none transition-all"
                    style={{ borderColor: '#e0f2fe' }} placeholder="Detail pekerjaan..." />
                </FormField>

                {/* Kategori — card pilihan visual */}
                <div>
                  <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: '#64748b' }}>Kategori *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => {
                      const c = CATEGORY_CONFIG[cat];
                      const sel = formData.category === cat;
                      return (
                        <button key={cat} type="button" onClick={() => fd({ category: cat })}
                          className="flex items-center gap-2.5 px-4 py-3.5 rounded-xl border-2 text-left transition-all font-semibold text-sm"
                          style={sel ? { borderColor: c.color, background: c.bg, color: c.color } : { borderColor: '#e2e8f0', background: '#f8fafc', color: '#64748b' }}>
                          <span className="text-xl">{c.icon}</span>
                          <span className="leading-tight flex-1">{cat}</span>
                          {sel && <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Assign To *">
                    <select value={formData.assigned_to} onChange={e => fd({ assigned_to: e.target.value })}
                      className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white transition-all"
                      style={{ borderColor: '#e0f2fe' }}>
                      <option value="">-- Pilih Team PTS --</option>
                      {teamUsers.map(u => <option key={u.id} value={u.username}>{u.full_name}</option>)}
                    </select>
                  </FormField>
                  <FormField label="Pengulangan">
                    <select value={formData.repeat} onChange={e => fd({ repeat: e.target.value as RepeatType })}
                      className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white transition-all"
                      style={{ borderColor: '#e0f2fe' }}>
                      {REPEAT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField label="Tanggal *">
                    <input type="date" value={formData.due_date} onChange={e => fd({ due_date: e.target.value })}
                      className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                      style={{ borderColor: '#e0f2fe' }} />
                  </FormField>
                  <FormField label="Waktu">
                    <input type="time" value={formData.due_time} onChange={e => fd({ due_time: e.target.value })}
                      className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                      style={{ borderColor: '#e0f2fe' }} />
                  </FormField>
                  <FormField label="Prioritas">
                    <select value={formData.priority} onChange={e => fd({ priority: e.target.value as Priority })}
                      className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white transition-all"
                      style={{ borderColor: '#e0f2fe' }}>
                      {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </FormField>
                </div>

                {editingReminder && (
                  <FormField label="Status">
                    <select value={formData.status} onChange={e => fd({ status: e.target.value as Status })}
                      className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 bg-white transition-all"
                      style={{ borderColor: '#e0f2fe' }}>
                      {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                  </FormField>
                )}

                {/* ── SECTION 2: Info Project ── */}
                <SectionHeader icon="🏢" title="Informasi Project" />

                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Nama Sales *">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">👤</span>
                      <input value={formData.sales_name} onChange={e => fd({ sales_name: e.target.value })}
                        className="w-full border rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                        style={{ borderColor: '#e0f2fe' }} placeholder="Nama Sales" />
                    </div>
                  </FormField>
                  <FormField label="No. Telepon Sales *">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">📱</span>
                      <input type="tel" value={formData.sales_phone} onChange={e => fd({ sales_phone: e.target.value })}
                        className="w-full border rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                        style={{ borderColor: '#e0f2fe' }} placeholder="08xxxxxxxxxx" />
                    </div>
                  </FormField>
                </div>

                <FormField label="Lokasi Project *">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">📍</span>
                    <input value={formData.project_location} onChange={e => fd({ project_location: e.target.value })}
                      className="w-full border rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                      style={{ borderColor: '#e0f2fe' }} placeholder="Contoh: Gedung Wisma 46 Lt. 12, Jakarta Pusat" />
                  </div>
                </FormField>

                <FormField label="PIC Project (Opsional)">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base">🎯</span>
                    <input value={formData.pic_project} onChange={e => fd({ pic_project: e.target.value })}
                      className="w-full border rounded-xl pl-9 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 transition-all"
                      style={{ borderColor: '#e0f2fe' }} placeholder="Nama PIC di lokasi (opsional)" />
                  </div>
                </FormField>

                {/* ── SECTION 3: Catatan ── */}
                <SectionHeader icon="📝" title="Catatan Tambahan" />

                <FormField label="Catatan">
                  <textarea value={formData.notes} onChange={e => fd({ notes: e.target.value })}
                    rows={2} className="w-full border rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 resize-none transition-all"
                    style={{ borderColor: '#e0f2fe' }} placeholder="Informasi tambahan untuk team..." />
                </FormField>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setView('list'); setEditingReminder(null); setFormData(emptyForm); }}
                    className="flex-1 border border-slate-300 text-slate-600 py-3 rounded-xl font-semibold hover:bg-slate-50 transition-all text-sm">
                    Batal
                  </button>
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 shadow-lg"
                    style={{ background: 'linear-gradient(135deg,#0ea5e9,#0284c7)' }}>
                    {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {editingReminder ? 'Simpan Perubahan' : '➕ Tambah Reminder'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* DETAIL VIEW                                                        */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === 'detail' && selectedReminder && (
          <div className="max-w-2xl mx-auto">
            <button onClick={() => setView('list')} className="mb-4 flex items-center gap-2 text-sky-600 font-semibold text-sm hover:text-sky-800 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Kembali ke List
            </button>
            <div className="bg-white rounded-2xl shadow-xl border border-sky-100 overflow-hidden">
              {/* Hero */}
              <div className="px-8 py-7" style={{
                background: isOverdue(selectedReminder.due_date, selectedReminder.due_time, selectedReminder.status)
                  ? 'linear-gradient(135deg,#be123c,#9f1239)'
                  : (() => { const c = CATEGORY_CONFIG[selectedReminder.category]; return c ? `linear-gradient(135deg,${c.color}e0,${c.color}a0)` : 'linear-gradient(135deg,#0ea5e9,#0284c7)'; })()
              }}>
                <div className="flex flex-wrap gap-2 mb-3">
                  <PriorityBadge priority={selectedReminder.priority} />
                  <StatusBadge status={selectedReminder.status} />
                  <CategoryBadge category={selectedReminder.category} />
                  {selectedReminder.repeat !== 'none' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                      🔁 {REPEAT_OPTIONS.find(r => r.value === selectedReminder.repeat)?.label}
                    </span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight">{selectedReminder.title}</h2>
                {selectedReminder.description && <p className="text-white/80 text-sm mt-2 leading-relaxed">{selectedReminder.description}</p>}
              </div>

              <div className="p-8 space-y-6">
                {/* Jadwal */}
                <div>
                  <SectionHeaderSmall icon="📋" title="Detail Jadwal" />
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-4" style={{ background: '#f0f9ff', border: '1px solid #e0f2fe' }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">Assign To</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                          {selectedReminder.assigned_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{selectedReminder.assigned_name}</p>
                          <p className="text-xs text-slate-500">@{selectedReminder.assigned_to}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: '#f0f9ff', border: '1px solid #e0f2fe' }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">Tenggat Waktu</p>
                      <p className="text-sm font-bold text-slate-800">{formatDate(selectedReminder.due_date)}</p>
                      <p className="text-xs text-slate-500 mt-0.5">⏰ {selectedReminder.due_time}</p>
                    </div>
                  </div>
                </div>

                {/* Info Project */}
                <div>
                  <SectionHeaderSmall icon="🏢" title="Informasi Project" />
                  <div className="mt-3 rounded-xl divide-y divide-slate-100 overflow-hidden border border-slate-100">
                    <InfoRow icon="👤" label="Nama Sales" value={selectedReminder.sales_name} />
                    {selectedReminder.sales_phone && (
                      <div className="flex items-center gap-3 px-4 py-3">
                        <span className="text-base flex-shrink-0">📱</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">No. Telepon Sales</p>
                          <a href={`tel:${selectedReminder.sales_phone}`}
                            className="text-sm font-semibold text-sky-600 hover:text-sky-800 hover:underline"
                            onClick={e => e.stopPropagation()}>
                            {selectedReminder.sales_phone}
                          </a>
                        </div>
                      </div>
                    )}
                    <InfoRow icon="📍" label="Lokasi Project" value={selectedReminder.project_location} />
                    {selectedReminder.pic_project && <InfoRow icon="🎯" label="PIC Project" value={selectedReminder.pic_project} />}
                  </div>
                </div>

                {/* Catatan */}
                {selectedReminder.notes && (
                  <div className="rounded-xl p-4" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#92400e' }}>📝 Catatan</p>
                    <p className="text-slate-700 text-sm leading-relaxed">{selectedReminder.notes}</p>
                  </div>
                )}

                {/* Update Status */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-2">Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(STATUS_CONFIG) as Status[]).map(s => {
                      const c = STATUS_CONFIG[s];
                      const active = selectedReminder.status === s;
                      return (
                        <button key={s} onClick={() => handleStatusChange(selectedReminder.id, s)}
                          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                          style={active ? { background: c.bg, color: c.color, border: `2px solid ${c.border}` } : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}>
                          {c.icon} {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-3 pt-2 border-t border-slate-100">
                    <button onClick={() => openEdit(selectedReminder)}
                      className="flex-1 border border-sky-200 text-sky-700 py-2.5 rounded-xl font-semibold hover:bg-sky-50 transition-all text-sm">
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(selectedReminder.id)}
                      className="flex-1 border border-red-200 text-red-600 py-2.5 rounded-xl font-semibold hover:bg-red-50 transition-all text-sm">
                      🗑️ Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CALENDAR VIEW                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === 'calendar' && (
          <div className="bg-white rounded-2xl shadow-xl border border-sky-100 overflow-hidden">
            <div className="px-6 py-4 flex items-center justify-between border-b border-sky-50" style={{ background: 'linear-gradient(135deg,#f0f9ff,#e0f2fe)' }}>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                className="p-2 rounded-lg hover:bg-sky-100 text-sky-700 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <h2 className="text-lg font-bold" style={{ color: '#0c4a6e' }}>
                {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
              </h2>
              <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                className="p-2 rounded-lg hover:bg-sky-100 text-sky-700 transition-all">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-7 mb-2">
                {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
                  <div key={d} className="text-center text-[11px] font-bold tracking-widest uppercase py-2" style={{ color: '#94a3b8' }}>{d}</div>
                ))}
              </div>
              {(() => {
                const { firstDay, daysInMonth, year, month } = getDaysInMonth(calendarMonth);
                const todayStr = new Date().toISOString().split('T')[0];
                const cells: React.ReactNode[] = [];
                for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="h-24" />);
                for (let day = 1; day <= daysInMonth; day++) {
                  const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                  const dayRems = getRemindersForDay(day);
                  const isToday = ds === todayStr;
                  cells.push(
                    <div key={day} className="h-24 rounded-xl p-1.5 transition-all hover:bg-sky-50"
                      style={{ border: isToday ? '2px solid #0ea5e9' : '1px solid #f1f5f9', background: isToday ? '#f0f9ff' : 'transparent' }}>
                      <div className={`text-sm font-bold mb-1 w-6 h-6 rounded-full flex items-center justify-center ${isToday ? 'text-white' : 'text-slate-700'}`}
                        style={isToday ? { background: '#0ea5e9' } : {}}>
                        {day}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        {dayRems.slice(0, 2).map(r => {
                          const ov = isOverdue(r.due_date, r.due_time, r.status);
                          const cc = CATEGORY_CONFIG[r.category] ?? { icon: '📌', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' };
                          return (
                            <button key={r.id} onClick={() => { setSelectedReminder(r); setView('detail'); }}
                              className="w-full text-left truncate px-1.5 py-0.5 rounded text-[10px] font-semibold hover:opacity-80 transition-all"
                              style={{ background: ov ? 'rgba(190,18,60,0.12)' : cc.bg, color: ov ? '#be123c' : cc.color, border: `1px solid ${ov ? 'rgba(190,18,60,0.25)' : cc.border}` }}>
                              {cc.icon} {r.title}
                            </button>
                          );
                        })}
                        {dayRems.length > 2 && <div className="text-[9px] font-bold text-center" style={{ color: '#94a3b8' }}>+{dayRems.length - 2} lagi</div>}
                      </div>
                    </div>
                  );
                }
                return <div className="grid grid-cols-7 gap-1">{cells}</div>;
              })()}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LIST VIEW                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {view === 'list' && (
          <div className="space-y-5">
            {/* Category Quick Filter */}
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setFilterCategory('all')}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
                style={filterCategory === 'all' ? { background: '#0ea5e9', color: '#fff', boxShadow: '0 2px 8px rgba(14,165,233,0.35)' } : { background: '#fff', color: '#64748b', border: '1px solid #e2e8f0' }}>
                🗂️ Semua
              </button>
              {CATEGORIES.map(cat => {
                const c = CATEGORY_CONFIG[cat];
                const active = filterCategory === cat;
                return (
                  <button key={cat} onClick={() => setFilterCategory(cat)}
                    className="px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                    style={active ? { background: c.color, color: '#fff', boxShadow: `0 2px 8px ${c.color}55` } : { background: '#fff', color: c.color, border: `1px solid ${c.border}` }}>
                    {c.icon} {cat}
                  </button>
                );
              })}
            </div>

            {/* Search + Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-sky-100 p-4 flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[180px] relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full border border-sky-100 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-300"
                  placeholder="Cari judul, sales, lokasi..." />
              </div>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                className="border border-sky-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 bg-white">
                <option value="all">Semua Status</option>
                {(Object.keys(STATUS_CONFIG) as Status[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>)}
              </select>
              <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                className="border border-sky-100 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200 bg-white">
                <option value="all">Semua Anggota</option>
                {teamUsers.map(u => <option key={u.id} value={u.username}>{u.full_name}</option>)}
              </select>
            </div>

            {/* Cards */}
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <div className="w-12 h-12 border-4 border-sky-200 border-t-sky-500 rounded-full animate-spin" />
              </div>
            ) : filteredReminders.length === 0 ? (
              <div className="text-center py-24">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-500 font-semibold text-lg">Tidak ada reminder ditemukan</p>
                <p className="text-slate-400 text-sm mt-1">Coba ubah filter atau tambahkan reminder baru</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredReminders.map((r, idx) => {
                  const overdue = isOverdue(r.due_date, r.due_time, r.status);
                  const today   = isDueToday(r.due_date);
                  const soon    = isDueSoon(r.due_date, r.due_time, r.status);
                  const catCfg  = CATEGORY_CONFIG[r.category] ?? { icon: '📁', color: '#64748b', bg: 'rgba(100,116,139,0.08)', border: 'rgba(100,116,139,0.2)' };

                  return (
                    <div key={r.id}
                      className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden cursor-pointer hover:-translate-y-0.5 border"
                      style={{
                        borderColor: overdue ? 'rgba(190,18,60,0.25)' : today ? 'rgba(14,165,233,0.25)' : '#f1f5f9',
                        borderLeftWidth: '4px',
                        borderLeftColor: overdue ? '#be123c' : catCfg.color,
                        animation: 'fadeInUp 0.4s ease forwards',
                        animationDelay: `${idx * 40}ms`,
                        opacity: 0,
                      }}
                      onClick={() => { setSelectedReminder(r); setView('detail'); }}>

                      <div className="px-5 pt-4 pb-3">
                        {/* Badges */}
                        <div className="flex items-start justify-between gap-2 mb-2 flex-wrap">
                          <div className="flex flex-wrap gap-1.5">
                            <CategoryBadge category={r.category} />
                            <PriorityBadge priority={r.priority} />
                            {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">🔥 OVERDUE</span>}
                            {today && !overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-600 border border-sky-200">📅 HARI INI</span>}
                            {soon && !today && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">⚡ SEGERA</span>}
                          </div>
                          <StatusBadge status={r.status} />
                        </div>

                        <h3 className="font-bold text-slate-800 text-sm leading-snug line-clamp-2 mb-2">{r.title}</h3>

                        {/* Project info mini */}
                        <div className="space-y-1">
                          {r.sales_name && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span>👤</span>
                              <span className="font-medium truncate">{r.sales_name}</span>
                              {r.sales_phone && <span className="text-slate-400 flex-shrink-0">· {r.sales_phone}</span>}
                            </div>
                          )}
                          {r.project_location && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span>📍</span>
                              <span className="truncate">{r.project_location}</span>
                            </div>
                          )}
                          {r.pic_project && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500">
                              <span>🎯</span>
                              <span className="truncate">PIC: {r.pic_project}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="px-5 pb-4 pt-2.5 border-t border-slate-50 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0" style={{ background: '#e0f2fe', color: '#0369a1' }}>
                            {r.assigned_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs font-semibold text-slate-600 truncate">{r.assigned_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          {formatDate(r.due_date)} · {r.due_time}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      <footer className="border-t py-4 text-center text-xs font-medium" style={{ borderColor: 'rgba(14,165,233,0.1)', color: '#94a3b8' }}>
        © 2026 IndoVisual PTS — Reminder Schedule Platform
      </footer>

      <style jsx>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  );
}

// ─── InfoRow helper ───────────────────────────────────────────────────────────
function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white">
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-slate-700 break-words">{value}</p>
      </div>
    </div>
  );
}