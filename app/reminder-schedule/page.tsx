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
  sales_name: string;
  sales_phone: string;
  project_location: string;
  pic_project: string;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  low:    { label: 'Low',    color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)', dot: '#94a3b8' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  dot: '#f59e0b' },
  high:   { label: 'High',   color: '#f97316', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  dot: '#f97316' },
  urgent: { label: 'Urgent', color: '#f43f5e', bg: 'rgba(244,63,94,0.2)',    border: 'rgba(244,63,94,0.5)',   dot: '#f43f5e' },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:     { label: 'Pending',     color: '#64748b', bg: '#f59e0b', border: '#f59e0b', icon: '⏳' },
  in_progress: { label: 'In Progress', color: '#64748b', bg: '#3b82f6', border: '#3b82f6', icon: '🔄' },
  done:        { label: 'Done',        color: '#64748b', bg: '#10b981', border: '#10b981', icon: '✅' },
  cancelled:   { label: 'Cancelled',   color: '#64748b', bg: '#6b7280', border: '#6b7280', icon: '❌' },
};

const CATEGORIES = ['Demo Product', 'Meeting & Survey', 'Konfigurasi', 'Troubleshooting'];

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; accent: string }> = {
  'Demo Product':     { icon: '🖥️', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)', accent: '#7c3aed' },
  'Meeting & Survey': { icon: '🤝', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',   border: 'rgba(56,189,248,0.4)',   accent: '#0ea5e9' },
  'Konfigurasi':      { icon: '⚙️', color: '#34d399', bg: 'rgba(52,211,153,0.15)',   border: 'rgba(52,211,153,0.4)',   accent: '#10b981' },
  'Troubleshooting':  { icon: '🔧', color: '#fb7185', bg: 'rgba(251,113,133,0.15)',   border: 'rgba(251,113,133,0.4)',  accent: '#e11d48' },
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
      style={{ color: c.color, background: c.bg }}>
      {c.icon} {c.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_CONFIG[category] ?? { icon: '📁', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', accent: '#64748b' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      {c.icon} {category}
    </span>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5 tracking-widest uppercase" style={{ color: '#94a3b8' }}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-bold tracking-wide text-slate-700">{title}</span>
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

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>{label}</p>
        <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
      </div>
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

  const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [editingReminder, setEditingReminder]   = useState<Reminder | null>(null);

  const [filterStatus, setFilterStatus]     = useState<Status | 'all'>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [calendarMonth, setCalendarMonth]   = useState(new Date());
  const [toast, setToast]                   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

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

  const overdueCount    = reminders.filter(r => isOverdue(r.due_date, r.due_time, r.status)).length;
  const todayCount      = reminders.filter(r => isDueToday(r.due_date) && r.status !== 'done' && r.status !== 'cancelled').length;
  const pendingCount    = reminders.filter(r => r.status === 'pending').length;
  const doneCount       = reminders.filter(r => r.status === 'done').length;
  const inProgressCount = reminders.filter(r => r.status === 'in_progress').length;
  const totalCount      = reminders.length;

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
  const calDayReminders = selectedCalDay ? reminders.filter(r => r.due_date === selectedCalDay) : [];

  // ─── Style helpers ─────────────────────────────────────────────────────────
  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-red-500/40";
  const inputStyle = { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)' };
  const cardStyle = { background: 'rgba(255,255,255,0.78)', border: '1px solid rgba(0,0,0,0.09)', backdropFilter: 'blur(10px)' };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      backgroundImage: `url('/IVP_Background.png')`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>
      {/* Dark overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />

      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-[200] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
            style={{ boxShadow: toast.type === 'success' ? '0 4px 20px rgba(16,185,129,0.4)' : '0 4px 20px rgba(220,38,38,0.4)' }}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.82)', borderBottom: '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', boxShadow: '0 3px 12px rgba(220,38,38,0.4)' }}>
                <span className="text-lg">🗓️</span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight style colors via inline">Reminder Schedule</h1>
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#dc2626' }}>PTS IVP — Team Work Planner</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button onClick={() => { setEditingReminder(null); setFormData(emptyForm); setView('form'); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-slate-800 transition-all hover:scale-105 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Tambah Reminder
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">

          {/* ─── LIST VIEW ───────────────────────────────────────────────── */}
          {view === 'list' && (
            <>
              {/* Stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  { label: 'Total Jadwal',  value: totalCount,       sub: 'Semua reminder',      gradient: 'linear-gradient(135deg,#4f46e5,#6d28d9)', icon: '📋', shadow: 'rgba(79,70,229,0.35)' },
                  { label: 'Pending',       value: pendingCount,     sub: 'Menunggu tindakan',    gradient: 'linear-gradient(135deg,#d97706,#b45309)', icon: '⏳', shadow: 'rgba(217,119,6,0.35)' },
                  { label: 'In Progress',   value: inProgressCount,  sub: 'Sedang dikerjakan',    gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', icon: '🔄', shadow: 'rgba(37,99,235,0.35)' },
                  { label: 'Selesai',       value: doneCount,        sub: 'Terselesaikan',        gradient: 'linear-gradient(135deg,#059669,#047857)', icon: '✅', shadow: 'rgba(5,150,105,0.35)' },
                  { label: 'Overdue',       value: overdueCount,     sub: 'Berpotensi terlewat',  gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)', icon: '🔥', shadow: 'rgba(220,38,38,0.35)' },
                  { label: 'Hari Ini',      value: todayCount,       sub: 'Jadwal hari ini',      gradient: 'linear-gradient(135deg,#0891b2,#0e7490)', icon: '📅', shadow: 'rgba(8,145,178,0.35)' },
                ].map(card => (
                  <div key={card.label} className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2"
                    style={{ background: card.gradient, boxShadow: `0 4px 16px ${card.shadow}` }}>
                    <div className="absolute right-3 top-2 text-4xl opacity-[0.15] select-none">{card.icon}</div>
                    <span className="text-3xl font-black text-slate-800 leading-none">{card.value}</span>
                    <div>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{card.label}</p>
                      <p className="text-[10px] font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{card.sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Main 2-col layout: Calendar | List */}
              <div className="grid grid-cols-1 xl:grid-cols-[400px_1fr] gap-4">

                {/* ── CALENDAR (always inline) ── */}
                <div className="rounded-2xl overflow-hidden flex flex-col" style={cardStyle}>
                  {/* Month nav */}
                  <div className="px-5 py-3.5 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                    <button onClick={() => { setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1)); setSelectedCalDay(null); }}
                      className="p-1.5 rounded-lg transition-all hover:bg-black/5" style={{ color: '#64748b' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </button>
                    <h2 className="text-sm font-bold text-slate-800">
                      {calendarMonth.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => { setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1)); setSelectedCalDay(null); }}
                      className="p-1.5 rounded-lg transition-all hover:bg-black/5" style={{ color: '#64748b' }}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>

                  <div className="p-3">
                    {/* Day headers */}
                    <div className="grid grid-cols-7 mb-1">
                      {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
                        <div key={d} className="text-center text-[10px] font-bold tracking-widest py-1.5" style={{ color: '#64748b' }}>{d}</div>
                      ))}
                    </div>
                    {/* Days grid */}
                    {(() => {
                      const { firstDay, daysInMonth, year, month } = getDaysInMonth(calendarMonth);
                      const todayStr = new Date().toISOString().split('T')[0];
                      const cells: React.ReactNode[] = [];
                      for (let i = 0; i < firstDay; i++) cells.push(<div key={`e${i}`} className="h-14" />);
                      for (let day = 1; day <= daysInMonth; day++) {
                        const ds = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                        const dayRems = getRemindersForDay(day);
                        const isToday = ds === todayStr;
                        const isSelected = ds === selectedCalDay;
                        const hasOverdue = dayRems.some(r => isOverdue(r.due_date, r.due_time, r.status));

                        cells.push(
                          <div key={day}
                            onClick={() => setSelectedCalDay(isSelected ? null : ds)}
                            className="h-14 rounded-xl p-1 cursor-pointer transition-all relative"
                            style={{
                              border: isSelected ? '1.5px solid #dc2626' : isToday ? '1.5px solid rgba(59,130,246,0.6)' : '1px solid rgba(0,0,0,0.06)',
                              background: isSelected ? 'rgba(220,38,38,0.12)' : isToday ? 'rgba(59,130,246,0.08)' : 'transparent',
                            }}>
                            <div className="text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center mb-0.5 mx-auto"
                              style={isToday ? { background: '#3b82f6', color: '#64748b' } : { color: isSelected ? '#dc2626' : '#374151' }}>
                              {day}
                            </div>
                            {dayRems.length > 0 && (
                              <div className="flex justify-center gap-0.5 flex-wrap">
                                {dayRems.slice(0, 3).map(r => {
                                  const ov = isOverdue(r.due_date, r.due_time, r.status);
                                  const cc = CATEGORY_CONFIG[r.category] ?? { accent: '#64748b' };
                                  return <span key={r.id} className="w-1.5 h-1.5 rounded-full" style={{ background: ov ? '#ef4444' : cc.accent }} />;
                                })}
                                {dayRems.length > 3 && <span className="text-[8px] font-bold" style={{ color: '#64748b' }}>+{dayRems.length - 3}</span>}
                              </div>
                            )}
                            {hasOverdue && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-red-500" />}
                          </div>
                        );
                      }
                      return <div className="grid grid-cols-7 gap-0.5">{cells}</div>;
                    })()}
                  </div>

                  {/* Selected day detail */}
                  {selectedCalDay ? (
                    <div className="flex-1" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
                      <div className="px-4 py-3">
                        <p className="text-xs font-bold text-slate-800 mb-2">
                          📅 {new Date(selectedCalDay + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                          <span className="ml-2 text-xs font-normal" style={{ color: '#64748b' }}>({calDayReminders.length} jadwal)</span>
                        </p>
                        {calDayReminders.length === 0 ? (
                          <p className="text-xs py-2" style={{ color: '#64748b' }}>Tidak ada jadwal pada hari ini.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                            {calDayReminders.map(r => {
                              const cc = CATEGORY_CONFIG[r.category] ?? { icon: '📌', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', accent: '#64748b' };
                              const ov = isOverdue(r.due_date, r.due_time, r.status);
                              return (
                                <button key={r.id} onClick={() => { setSelectedReminder(r); setView('detail'); }}
                                  className="w-full text-left rounded-lg px-3 py-2 transition-all hover:opacity-80"
                                  style={{ background: ov ? 'rgba(220,38,38,0.10)' : 'rgba(255,255,255,0.55)', border: `1px solid ${ov ? 'rgba(220,38,38,0.3)' : 'rgba(0,0,0,0.07)'}` }}>
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-slate-800 truncate">{cc.icon} {r.title}</span>
                                    <StatusBadge status={r.status} />
                                  </div>
                                  <p className="text-[10px] mt-0.5" style={{ color: '#64748b' }}>{r.assigned_name} · {r.due_time}</p>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="px-4 pb-3 pt-1" style={{ borderTop: '1px solid rgba(0,0,0,0.07)' }}>
                      <p className="text-[10px] mb-1.5" style={{ color: '#64748b' }}>Klik tanggal untuk lihat jadwal</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1">
                        {Object.entries(CATEGORY_CONFIG).map(([cat, c]) => (
                          <span key={cat} className="flex items-center gap-1 text-[10px]" style={{ color: '#64748b' }}>
                            <span className="w-2 h-2 rounded-full" style={{ background: c.accent }} />{cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── RIGHT: Filters + Cards ── */}
                <div className="space-y-3 min-w-0">
                  {/* Search + Filter */}
                  <div className="rounded-2xl p-4 flex flex-wrap gap-3 items-center" style={cardStyle}>
                    <div className="flex-1 min-w-[160px] relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#64748b' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className={`${inputCls} pl-9`} style={inputStyle}
                        placeholder="Cari judul, sales, lokasi..." />
                    </div>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                      className={inputCls} style={{ ...inputStyle, width: 'auto' }}>
                      <option value="all">Semua Status</option>
                      {(Object.keys(STATUS_CONFIG) as Status[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                    </select>
                    <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
                      className={inputCls} style={{ ...inputStyle, width: 'auto' }}>
                      <option value="all">Semua Anggota</option>
                      {teamUsers.map(u => <option key={u.id} value={u.username}>{u.full_name}</option>)}
                    </select>
                  </div>

                  {/* Category pills */}
                  <div className="flex flex-wrap gap-2 items-center">
                    <button onClick={() => setFilterCategory('all')}
                      className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
                      style={filterCategory === 'all'
                        ? { background: '#dc2626', color: '#64748b', boxShadow: '0 2px 10px rgba(220,38,38,0.4)' }
                        : { background: 'rgba(255,255,255,0.05)', color: '#64748b', border: '1px solid rgba(0,0,0,0.08)' }}>
                      🗂️ Semua
                    </button>
                    {CATEGORIES.map(cat => {
                      const c = CATEGORY_CONFIG[cat];
                      const active = filterCategory === cat;
                      return (
                        <button key={cat} onClick={() => setFilterCategory(cat)}
                          className="px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1"
                          style={active
                            ? { background: c.accent, color: '#64748b', boxShadow: `0 2px 10px ${c.accent}66` }
                            : { background: 'rgba(255,255,255,0.5)', color: c.color, border: `1px solid ${c.border}` }}>
                          {c.icon} {cat}
                        </button>
                      );
                    })}
                    <span className="ml-auto text-xs font-semibold" style={{ color: '#64748b' }}>
                      {filteredReminders.length} / {reminders.length}
                    </span>
                  </div>

                  {/* Cards */}
                  {loading ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="w-10 h-10 border-4 border-slate-800 border-t-red-500 rounded-full animate-spin" />
                    </div>
                  ) : filteredReminders.length === 0 ? (
                    <div className="text-center py-20 rounded-2xl" style={cardStyle}>
                      <div className="text-5xl mb-3">📭</div>
                      <p className="text-slate-800 font-semibold">Tidak ada reminder ditemukan</p>
                      <p className="text-sm mt-1" style={{ color: '#64748b' }}>Coba ubah filter atau tambahkan reminder baru</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                      {filteredReminders.map((r, idx) => {
                        const overdue = isOverdue(r.due_date, r.due_time, r.status);
                        const today   = isDueToday(r.due_date);
                        const soon    = isDueSoon(r.due_date, r.due_time, r.status);
                        const catCfg  = CATEGORY_CONFIG[r.category] ?? { icon: '📁', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', accent: '#64748b' };

                        return (
                          <div key={r.id}
                            className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-0.5"
                            style={{
                              background: 'rgba(255,255,255,0.78)',
                              border: overdue ? '1px solid rgba(220,38,38,0.4)' : '1px solid rgba(0,0,0,0.09)',
                              borderLeft: `3px solid ${overdue ? '#ef4444' : catCfg.accent}`,
                              boxShadow: overdue ? '0 2px 12px rgba(220,38,38,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                              animation: 'fadeInUp 0.35s ease forwards',
                              animationDelay: `${idx * 30}ms`,
                              opacity: 0,
                              backdropFilter: 'blur(8px)',
                            }}
                            onClick={() => { setSelectedReminder(r); setView('detail'); }}>

                            {/* Top accent bar */}
                            <div className="h-0.5 w-full" style={{ background: overdue ? '#ef4444' : catCfg.accent, opacity: 0.6 }} />

                            <div className="px-4 pt-3 pb-2">
                              <div className="flex items-start justify-between gap-2 mb-1.5 flex-wrap">
                                <div className="flex flex-wrap gap-1">
                                  <CategoryBadge category={r.category} />
                                  <PriorityBadge priority={r.priority} />
                                  {overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(220,38,38,0.18)', color: '#fca5a5', border: '1px solid rgba(220,38,38,0.35)' }}>🔥 OVERDUE</span>}
                                  {today && !overdue && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd', border: '1px solid rgba(59,130,246,0.3)' }}>📅 HARI INI</span>}
                                  {soon && !today && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: '1px solid rgba(245,158,11,0.3)' }}>⚡ SEGERA</span>}
                                </div>
                                <StatusBadge status={r.status} />
                              </div>

                              <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2 mb-1.5">{r.title}</h3>

                              <div className="space-y-0.5">
                                {r.sales_name && (
                                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                                    <span>👤</span><span className="font-medium truncate text-slate-400">{r.sales_name}</span>
                                    {r.sales_phone && <span className="flex-shrink-0">· {r.sales_phone}</span>}
                                  </div>
                                )}
                                {r.project_location && (
                                  <div className="flex items-center gap-1.5 text-xs" style={{ color: '#64748b' }}>
                                    <span>📍</span><span className="truncate">{r.project_location}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="px-4 pb-3 pt-2 flex items-center justify-between gap-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0"
                                  style={{ background: catCfg.bg, color: catCfg.color }}>
                                  {r.assigned_name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-xs font-semibold truncate text-slate-600">{r.assigned_name}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: '#64748b' }}>
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
              </div>
            </>
          )}

          {/* ─── FORM VIEW ───────────────────────────────────────────────── */}
          {view === 'form' && (
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl overflow-hidden" style={{ ...cardStyle, border: '1px solid rgba(0,0,0,0.1)' }}>
                <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{editingReminder ? '✏️ Edit Reminder' : '➕ Tambah Reminder'}</h2>
                      <p className="text-red-200/70 text-xs mt-1">Isi detail jadwal & informasi project</p>
                    </div>
                    <button onClick={() => { setView('list'); setEditingReminder(null); setFormData(emptyForm); }}
                      className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-5">
                  <SectionHeader icon="📋" title="Informasi Jadwal" />

                  <FormField label="Judul Reminder *">
                    <input value={formData.title} onChange={e => fd({ title: e.target.value })}
                      className={inputCls} style={inputStyle} placeholder="Contoh: Demo Projector @ PT. Maju Bersama" />
                  </FormField>

                  <FormField label="Deskripsi">
                    <textarea value={formData.description} onChange={e => fd({ description: e.target.value })}
                      rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Detail pekerjaan..." />
                  </FormField>

                  <div>
                    <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: '#94a3b8' }}>Kategori *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(cat => {
                        const c = CATEGORY_CONFIG[cat];
                        const sel = formData.category === cat;
                        return (
                          <button key={cat} type="button" onClick={() => fd({ category: cat })}
                            className="flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-all font-semibold text-sm"
                            style={sel
                              ? { borderColor: c.accent, background: c.bg, color: c.color }
                              : { borderColor: 'rgba(255,255,255,0.07)', background: 'rgba(255,255,255,0.5)', color: '#64748b' }}>
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
                        className={inputCls} style={inputStyle}>
                        <option value="">-- Pilih Team PTS --</option>
                        {teamUsers.map(u => <option key={u.id} value={u.username}>{u.full_name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Pengulangan">
                      <select value={formData.repeat} onChange={e => fd({ repeat: e.target.value as RepeatType })}
                        className={inputCls} style={inputStyle}>
                        {REPEAT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="Tanggal *">
                      <input type="date" value={formData.due_date} onChange={e => fd({ due_date: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </FormField>
                    <FormField label="Waktu">
                      <input type="time" value={formData.due_time} onChange={e => fd({ due_time: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </FormField>
                    <FormField label="Prioritas">
                      <select value={formData.priority} onChange={e => fd({ priority: e.target.value as Priority })}
                        className={inputCls} style={inputStyle}>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </FormField>
                  </div>

                  {editingReminder && (
                    <FormField label="Status">
                      <select value={formData.status} onChange={e => fd({ status: e.target.value as Status })}
                        className={inputCls} style={inputStyle}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </FormField>
                  )}

                  <SectionHeader icon="🏢" title="Informasi Project" />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Nama Sales *">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">👤</span>
                        <input value={formData.sales_name} onChange={e => fd({ sales_name: e.target.value })}
                          className={`${inputCls} pl-9`} style={inputStyle} placeholder="Nama Sales" />
                      </div>
                    </FormField>
                    <FormField label="No. Telepon Sales">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">📱</span>
                        <input type="tel" value={formData.sales_phone} onChange={e => fd({ sales_phone: e.target.value })}
                          className={`${inputCls} pl-9`} style={inputStyle} placeholder="08xxxxxxxxxx" />
                      </div>
                    </FormField>
                  </div>

                  <FormField label="Lokasi Project *">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">📍</span>
                      <input value={formData.project_location} onChange={e => fd({ project_location: e.target.value })}
                        className={`${inputCls} pl-9`} style={inputStyle} placeholder="Contoh: Gedung Wisma 46 Lt. 12, Jakarta Pusat" />
                    </div>
                  </FormField>

                  <FormField label="PIC Project (Opsional)">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2">🎯</span>
                      <input value={formData.pic_project} onChange={e => fd({ pic_project: e.target.value })}
                        className={`${inputCls} pl-9`} style={inputStyle} placeholder="Nama PIC di lokasi (opsional)" />
                    </div>
                  </FormField>

                  <SectionHeader icon="📝" title="Catatan Tambahan" />

                  <FormField label="Catatan">
                    <textarea value={formData.notes} onChange={e => fd({ notes: e.target.value })}
                      rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Informasi tambahan untuk team..." />
                  </FormField>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setView('list'); setEditingReminder(null); setFormData(emptyForm); }}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{ background: 'rgba(255,255,255,0.55)', color: '#64748b', border: '1px solid rgba(0,0,0,0.12)' }}>
                      Batal
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}>
                      {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {editingReminder ? 'Simpan Perubahan' : '➕ Tambah Reminder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── DETAIL VIEW ─────────────────────────────────────────────── */}
          {view === 'detail' && selectedReminder && (
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setView('list')} className="mb-4 flex items-center gap-2 font-semibold text-sm transition-all hover:opacity-70"
                style={{ color: '#dc2626' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Kembali ke List
              </button>
              <div className="rounded-2xl overflow-hidden" style={cardStyle}>
                {/* Hero */}
                <div className="px-8 py-7" style={{
                  background: isOverdue(selectedReminder.due_date, selectedReminder.due_time, selectedReminder.status)
                    ? 'linear-gradient(135deg,#dc2626,#991b1b)'
                    : (() => { const c = CATEGORY_CONFIG[selectedReminder.category]; return c ? `linear-gradient(135deg,${c.accent}dd,${c.accent}88)` : 'linear-gradient(135deg,#1d4ed8,#1e40af)'; })()
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
                  <h2 className="text-2xl font-bold text-slate-800 leading-tight">{selectedReminder.title}</h2>
                  {selectedReminder.description && <p className="text-white/80 text-sm mt-2 leading-relaxed">{selectedReminder.description}</p>}
                </div>

                <div className="p-8 space-y-6">
                  <div>
                    <SectionHeaderSmall icon="📋" title="Detail Jadwal" />
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>Assign To</p>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'rgba(220,38,38,0.2)', color: '#fca5a5' }}>
                            {selectedReminder.assigned_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">{selectedReminder.assigned_name}</p>
                            <p className="text-xs" style={{ color: '#64748b' }}>@{selectedReminder.assigned_to}</p>
                          </div>
                        </div>
                      </div>
                      <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }}>
                        <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>Tenggat Waktu</p>
                        <p className="text-sm font-bold text-slate-800">{formatDate(selectedReminder.due_date)}</p>
                        <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>⏰ {selectedReminder.due_time}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <SectionHeaderSmall icon="🏢" title="Informasi Project" />
                    <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                      <InfoRow icon="👤" label="Nama Sales" value={selectedReminder.sales_name} />
                      {selectedReminder.sales_phone && (
                        <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          <span className="text-base flex-shrink-0">📱</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>No. Telepon Sales</p>
                            <a href={`tel:${selectedReminder.sales_phone}`} className="text-sm font-semibold hover:underline" style={{ color: '#60a5fa' }}
                              onClick={e => e.stopPropagation()}>{selectedReminder.sales_phone}</a>
                          </div>
                        </div>
                      )}
                      <InfoRow icon="📍" label="Lokasi Project" value={selectedReminder.project_location} />
                      {selectedReminder.pic_project && <InfoRow icon="🎯" label="PIC Project" value={selectedReminder.pic_project} />}
                    </div>
                  </div>

                  {selectedReminder.notes && (
                    <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#f59e0b' }}>📝 Catatan</p>
                      <p className="text-slate-700 text-sm leading-relaxed">{selectedReminder.notes}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>Update Status</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(STATUS_CONFIG) as Status[]).map(s => {
                        const c = STATUS_CONFIG[s];
                        const active = selectedReminder.status === s;
                        return (
                          <button key={s} onClick={() => handleStatusChange(selectedReminder.id, s)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                            style={active
                              ? { background: c.bg, color: c.color }
                              : { background: 'rgba(255,255,255,0.55)', color: '#64748b', border: '1px solid rgba(0,0,0,0.1)' }}>
                            {c.icon} {c.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex gap-3 pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <button onClick={() => openEdit(selectedReminder)}
                        className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
                        style={{ border: '1px solid rgba(59,130,246,0.35)', color: '#60a5fa', background: 'rgba(59,130,246,0.08)' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => handleDelete(selectedReminder.id)}
                        className="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all hover:opacity-80"
                        style={{ border: '1px solid rgba(220,38,38,0.35)', color: '#fca5a5', background: 'rgba(220,38,38,0.08)' }}>
                        🗑️ Hapus
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        <footer className="py-4 text-center text-xs font-semibold" style={{ borderTop: '1px solid rgba(0,0,0,0.06)', color: '#64748b' }}>
          © 2026 IndoVisual PTS — Reminder Schedule Platform
        </footer>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        select option { background: #0c1223; color: #e2e8f0; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 4px; }
      `}</style>
    </div>
  );
}
