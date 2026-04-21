"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// SVGs for Icons
const IconPlus = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconClock = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconCheckCircle = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconXCircle = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>;
const IconMapPin = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconCalendar = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
const IconUser = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;

// Types
interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'team' | 'guest' | 'superadmin';
}

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'pending' | 'done' | 'cancelled';
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

interface Reminder {
  id: string;
  project_name: string;
  description: string;
  assigned_to: string;
  assign_name: string;
  due_date: string;
  due_time: string;
  priority: Priority;
  status: Status;
  repeat: RepeatType;
  category: string;
  sales_name: string;
  sales_division: string;
  address: string;
  pic_name: string;
  pic_phone: string;
  notes: string;
  product: string;
  created_at: string;
  created_by: string;
}

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string }> = {
  'Demo Product':     { icon: '🖥️', color: '#7c3aed', bg: 'rgba(124,58,237,0.1)' },
  'Meeting & Survey': { icon: '🤝', color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)' },
  'Konfigurasi':      { icon: '⚙️', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'Konfigurasi & Training': { icon: '📌', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  'Troubleshooting':  { icon: '🔧', color: '#e11d48', bg: 'rgba(225,29,72,0.1)' },
  'Training':         { icon: '🎓', color: '#d97706', bg: 'rgba(217,119,6,0.1)' },
  'Internal':         { icon: '🏢', color: '#059669', bg: 'rgba(5,150,105,0.1)' },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; icon: any }> = {
  pending:     { label: 'Pending',    color: '#92400e', bg: '#fef3c7', icon: <IconClock /> },
  done:        { label: 'Completed',  color: '#065f46', bg: '#d1fae5', icon: <IconCheckCircle /> },
  cancelled:   { label: 'Cancelled', color: '#374151', bg: '#f3f4f6', icon: <IconXCircle /> },
};

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  low:    { label: 'Low',    color: '#64748b', bg: '#f1f5f9' },
  medium: { label: 'Medium', color: '#d97706', bg: '#fff7ed' },
  high:   { label: 'High',   color: '#ea580c', bg: '#fff4ed' },
  urgent: { label: 'Urgent', color: '#dc2626', bg: '#fef2f2' },
};

const SALES_DIVISIONS = [
  'IVP', 'MLDS', 'HAVS', 'Enterprise', 'DEC', 'ICS', 'POJ', 'VOJ', 'LOCOS',
  'VISIONMEDIA', 'UMP', 'BISOL', 'KIMS', 'IDC', 'IOCMEDAN', 'IOCPekanbaru',
  'IOCBandung', 'IOCJATENG', 'MVISEMARANG', 'POSSurabaya', 'IOCSurabaya',
  'IOCBali', 'SGP', 'OSS'
];

export default function ReminderSchedule() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [guests, setGuests] = useState<User[]>([]);
  const [teamUsers, setTeamUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [showForm, setShowForm] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const emptyForm = {
    project_name: '',
    description: '',
    assigned_to: '',
    assign_name: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '09:00',
    priority: 'medium' as Priority,
    status: 'pending' as Status,
    repeat: 'none' as RepeatType,
    category: 'Demo Product',
    sales_name: '',
    sales_division: '',
    address: '',
    pic_name: '',
    pic_phone: '',
    notes: '',
    product: '',
  };

  const [formData, setFormData] = useState(emptyForm);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [remindersRes, usersRes] = await Promise.all([
      supabase.from('reminders').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*')
    ]);

    if (remindersRes.data) setReminders(remindersRes.data);
    if (usersRes.data) {
      setGuests(usersRes.data.filter((u: User) => u.role === 'guest'));
      setTeamUsers(usersRes.data.filter((u: User) => ['team', 'admin', 'superadmin'].includes(u.role)));
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.project_name || !formData.due_date || !formData.assigned_to || !formData.sales_name || !currentUser) {
      alert('Mohon isi field wajib (Project Name, Date, Handler, Guest Name)');
      return;
    }

    setSaving(true);
    const assignee = teamUsers.find((u: User) => u.username === formData.assigned_to);
    const payload = {
      ...formData,
      assign_name: assignee?.full_name || formData.assigned_to,
      created_by: currentUser.username,
    };

    let error;
    if (editingReminder) {
      const { error: err } = await supabase.from('reminders').update(payload).eq('id', editingReminder.id);
      error = err;
    } else {
      const { error: err } = await supabase.from('reminders').insert([payload]);
      error = err;
    }

    setSaving(false);
    if (error) {
      alert('Gagal menyimpan: ' + error.message);
    } else {
      setShowForm(false);
      setEditingReminder(null);
      setFormData(emptyForm);
      fetchData();
    }
  };

  const filteredReminders = useMemo(() => reminders.filter((r: Reminder) => {
    const matchesSearch = r.project_name.toLowerCase().includes(search.toLowerCase()) || 
                          r.sales_name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.category === filterCategory;
    return matchesSearch && matchesCategory;
  }), [reminders, search, filterCategory]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Reminder Schedule</h1>
          <p className="text-slate-500 text-sm">Kelola jadwal kegiatan team PTS & Guest Review</p>
        </div>
        <button 
          onClick={() => { setFormData(emptyForm); setEditingReminder(null); setShowForm(true); }}
          className="bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
        >
          <IconPlus />
          Tambah Reminder
        </button>
      </div>

      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-wrap gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            <IconSearch />
          </span>
          <input 
            type="text" 
            placeholder="Cari project atau guest..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50 text-sm"
          />
        </div>
        <select 
          value={filterCategory} 
          onChange={e => setFilterCategory(e.target.value)}
          className="px-4 py-2 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50 cursor-pointer text-sm font-semibold"
        >
          <option value="all">Semua Kategori</option>
          {Object.keys(CATEGORY_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReminders.map(reminder => (
            <div 
              key={reminder.id}
              className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm hover:translate-y-[-4px] transition-all group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ background: CATEGORY_CONFIG[reminder.category]?.bg, color: CATEGORY_CONFIG[reminder.category]?.color }}>
                    {CATEGORY_CONFIG[reminder.category]?.icon} {reminder.category}
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest" style={{ background: STATUS_CONFIG[reminder.status].bg, color: STATUS_CONFIG[reminder.status].color }}>
                    {STATUS_CONFIG[reminder.status].label}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingReminder(reminder); setFormData({ ...reminder }); setShowForm(true); }}
                    className="p-1.5 text-slate-300 hover:text-rose-600 transition-all"
                  >
                    <IconEdit />
                  </button>
                  <button 
                    onClick={async () => {
                      if (confirm('Hapus jadwal ini?')) {
                        await supabase.from('reminders').delete().eq('id', reminder.id);
                        fetchData();
                      }
                    }}
                    className="p-1.5 text-slate-300 hover:text-red-600 transition-all"
                  >
                    <IconTrash />
                  </button>
                </div>
              </div>

              <h3 className="font-bold text-slate-800 text-lg mb-3 leading-tight">{reminder.project_name}</h3>
              
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <IconMapPin />
                  <span className="truncate">{reminder.address || 'No Address'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs">
                  <IconCalendar />
                  <span>{new Date(reminder.due_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })} · {reminder.due_time}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                  <IconUser />
                  <span>Handler: {reminder.assign_name}</span>
                </div>
                <div className="flex items-center gap-2 text-rose-600 text-xs font-bold bg-rose-50 px-2 py-1 rounded-lg w-fit">
                   <IconUser />
                   <span>Guest: {reminder.sales_name}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full" style={{ background: PRIORITY_CONFIG[reminder.priority].bg, color: PRIORITY_CONFIG[reminder.priority].color }}>
                  {reminder.priority} priority
                </span>
                {reminder.status === 'pending' && (
                   <button 
                    onClick={() => {
                      const nextStatus = prompt('Update status? (done/cancelled)') as Status;
                      if (['done', 'cancelled'].includes(nextStatus)) {
                         supabase.from('reminders').update({ status: nextStatus }).eq('id', reminder.id).then(() => fetchData());
                      }
                    }}
                    className="text-[10px] font-bold text-rose-600 hover:bg-rose-100 px-3 py-1 rounded-xl transition-all"
                  >
                    Update
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold">{editingReminder ? 'Edit Reminder' : 'Tambah Reminder'}</h2>
                <p className="text-white/40 text-xs mt-1 lowercase">Konfigurasi jadwal dan guest target review</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-white/40 hover:text-white p-2 transition-transform hover:rotate-90">
                <IconXCircle />
              </button>
            </div>

            <div className="p-8 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Project Name *</label>
                  <input 
                    type="text" 
                    value={formData.project_name}
                    onChange={e => setFormData({ ...formData, project_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Category *</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-white shadow-sm"
                  >
                    {Object.keys(CATEGORY_CONFIG).map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-500 uppercase tracking-widest ml-1">Target Guest (Reviewer) *</label>
                  <select 
                    value={formData.sales_name}
                    onChange={e => {
                      const guest = guests.find((g: User) => g.full_name === e.target.value);
                      setFormData({ ...formData, sales_name: e.target.value, sales_division: guest?.role || '' });
                    }}
                    className="w-full px-4 py-3 rounded-xl border-2 border-rose-100 outline-none focus:ring-2 focus:ring-rose-500/20 bg-white font-bold text-rose-700"
                  >
                    <option value="">Pilih Member Guest...</option>
                    {guests.map(g => (
                      <option key={g.id} value={g.full_name}>{g.full_name} (@{g.username})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sales Division</label>
                  <select 
                    value={formData.sales_division}
                    onChange={e => setFormData({ ...formData, sales_division: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    <option value="">Pilih Divisi...</option>
                    {SALES_DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assign Handler (Team) *</label>
                  <select 
                    value={formData.assigned_to}
                    onChange={e => setFormData({ ...formData, assigned_to: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    <option value="">Pilih Member Team...</option>
                    {teamUsers.map(u => <option key={u.id} value={u.username}>{u.full_name}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Priority</label>
                  <select 
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as Priority })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Due Date *</label>
                  <input 
                    type="date" 
                    value={formData.due_date}
                    onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Due Time</label>
                  <input 
                    type="time" 
                    value={formData.due_time}
                    onChange={e => setFormData({ ...formData, due_time: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Project Address</label>
                <textarea 
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 resize-none h-20 bg-slate-50/50 text-sm"
                  placeholder="Lokasi project..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Product / Unit</label>
                <input 
                  type="text" 
                  value={formData.product}
                  onChange={e => setFormData({ ...formData, product: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50"
                  placeholder="Contoh: Cisco Switch, Samsung TV..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">PIC Name</label>
                  <input 
                    type="text" 
                    value={formData.pic_name}
                    onChange={e => setFormData({ ...formData, pic_name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">PIC Phone</label>
                  <input 
                    type="text" 
                    value={formData.pic_phone}
                    onChange={e => setFormData({ ...formData, pic_phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50"
                  />
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-200 transition-all text-sm"
              >
                Batal
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-4 rounded-2xl font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition-all shadow-xl shadow-rose-100 text-sm"
              >
                {saving ? 'Menyimpan...' : (editingReminder ? 'Update Schedule' : 'Simpan Schedule')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
