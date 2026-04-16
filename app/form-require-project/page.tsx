'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ───────────────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: string;
  allowed_menus?: string[];
}

interface ProjectRequest {
  id: string;
  created_at: string;
  project_name: string;
  room_name: string;
  sales_name: string;
  requester_id: string;
  requester_name: string;
  status: 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  kebutuhan: string[];
  solution_product: string[];
  pts_assigned?: string;
  due_date?: string;
}

// ─── Main Component ─────────────────────────────────────────────────────────

function FormRequireProject({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'list' | 'new-form' | 'detail'>('list');
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const role = currentUser.role?.toLowerCase().trim() ?? '';
  const isPTS = ['admin', 'superadmin', 'team_pts', 'team'].includes(role);

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

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    completed: requests.filter(r => r.status === 'completed').length,
    today: requests.filter(r => new Date(r.created_at).toDateString() === new Date().toDateString()).length,
  };

  const statusConfig: Record<string, { label: string; bg: string; text: string }> = {
    pending:     { label: 'Pending',     bg: 'bg-amber-500', text: 'text-white' },
    approved:    { label: 'Approved',    bg: 'bg-blue-500',  text: 'text-white' },
    in_progress: { label: 'In Progress', bg: 'bg-indigo-500',text: 'text-white' },
    completed:   { label: 'Completed',   bg: 'bg-emerald-500', text: 'text-white' },
    rejected:    { label: 'Rejected',    bg: 'bg-red-500',    text: 'text-white' },
  };

  const formatDateBox = (dt: string) => {
    const d = new Date(dt);
    const day = d.getDate();
    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = d.getFullYear().toString().slice(-2);
    return { day, month, year };
  };

  // ── VIEW: LIST ──
  if (view === 'list') return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-800">
      
      {/* Header Utama */}
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-red-600 p-2 rounded-lg text-white">
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/></svg>
          </div>
          <h1 className="text-xl font-extrabold text-red-700 tracking-tight">Reminder Schedule</h1>
        </div>
        <div className="flex items-center gap-3">
          <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export Excel
          </button>
          <button onClick={() => setView('new-form')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2 transition-all">
            <span className="text-lg">+</span> Tambah Reminder
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-indigo-600 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
             <p className="text-4xl font-black">5</p>
             <p className="text-sm font-bold mt-1">Total Jadwal</p>
             <p className="text-[10px] opacity-80">Semua reminder</p>
             <div className="absolute top-4 right-4 opacity-20"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/></svg></div>
          </div>
          <div className="bg-orange-500 rounded-xl p-5 text-white shadow-lg relative overflow-hidden cursor-pointer" onClick={() => setFilterStatus('pending')}>
             <p className="text-4xl font-black">{stats.pending}</p>
             <p className="text-sm font-bold mt-1">Pending</p>
             <p className="text-[10px] opacity-80">Menunggu tindakan</p>
             <div className="absolute top-4 right-4 opacity-20"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 2h12v6l-4 4 4 4v6H6v-6l4-4-4-4V2z"/></svg></div>
          </div>
          <div className="bg-emerald-500 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
             <p className="text-4xl font-black">{stats.completed}</p>
             <p className="text-sm font-bold mt-1">Selesai</p>
             <p className="text-[10px] opacity-80">Terselesaikan</p>
             <div className="absolute top-4 right-4 opacity-20"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg></div>
          </div>
          <div className="bg-teal-500 rounded-xl p-5 text-white shadow-lg relative overflow-hidden">
             <p className="text-4xl font-black">{stats.today}</p>
             <p className="text-sm font-bold mt-1">Hari Ini</p>
             <p className="text-[10px] opacity-80">Jadwal hari ini</p>
             <div className="absolute top-4 right-4 opacity-20"><svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg></div>
          </div>
        </div>

        {/* Charts Row (Mockup Layout) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">KEGIATAN / KATEGORI</h3>
            <div className="h-40 flex items-center justify-center">
              <div className="relative w-32 h-32 rounded-full border-[12px] border-indigo-500 flex items-center justify-center">
                <div className="text-center"><p className="text-2xl font-black">5</p><p className="text-[8px] uppercase">Total</p></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">DIVISI SALES</h3>
            <div className="h-40 flex items-center justify-center">
              <div className="relative w-32 h-32 rounded-full border-[12px] border-emerald-500 flex items-center justify-center">
                <div className="text-center"><p className="text-2xl font-black">5</p><p className="text-[8px] uppercase">Total</p></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">TEAM PTS</h3>
            <div className="h-40 flex items-center justify-center">
              <div className="relative w-32 h-32 rounded-full border-[12px] border-blue-500 flex items-center justify-center">
                <div className="text-center"><p className="text-2xl font-black">5</p><p className="text-[8px] uppercase">Total</p></div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[300px] relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search project / lokasi..." 
              className="w-full bg-white border border-gray-300 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-red-100 outline-none text-sm font-medium" 
            />
          </div>
          <select className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium outline-none min-w-[150px]">
            <option>All Status</option>
          </select>
          <select className="bg-white border border-gray-300 rounded-xl px-4 py-3 text-sm font-medium outline-none min-w-[150px]">
            <option>Semua Tahun</option>
          </select>
        </div>

        {/* Ticket List Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50/50 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-gray-800 tracking-tight">TICKET LIST</span>
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">5</span>
            </div>
            <button onClick={fetchRequests} className="text-gray-500 hover:text-red-600 flex items-center gap-1 text-xs font-bold transition-all">
               <span>🔄</span> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b bg-gray-50/30">
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Project</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Kegiatan</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Sales</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">Team Handler</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Tanggal</th>
                  <th className="px-6 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Act</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {requests.length === 0 ? (
                   <tr><td colSpan={7} className="py-10 text-center text-gray-400 font-bold">No data available</td></tr>
                ) : requests.map(req => {
                  const dateInfo = formatDateBox(req.created_at);
                  return (
                    <tr key={req.id} className="hover:bg-gray-50/50 transition-all cursor-pointer group" onClick={() => setSelectedRequest(req)}>
                      <td className="px-6 py-4">
                        <p className="font-extrabold text-sm text-gray-800 group-hover:text-red-600">{req.project_name}</p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">📍 {req.room_name || 'LOKASI TIDAK SET'}</p>
                      </td>
                      <td className="px-6 py-4 text-xs font-bold">
                        <span className="flex items-center gap-2">🎓 Training</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-gray-700">{req.requester_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold">OSS</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">Y</div>
                          <span className="text-xs font-bold text-gray-700">Yoga KS</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tight border-2 border-emerald-500 bg-emerald-50 text-emerald-600`}>
                          Completed
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center">
                        <div className="w-14 border border-red-200 rounded-xl overflow-hidden shadow-sm bg-white">
                           <div className="bg-red-50 py-1 text-center border-b border-red-100">
                             <p className="text-[14px] font-black text-red-600 leading-none">{dateInfo.day}</p>
                           </div>
                           <div className="py-1 text-center bg-white">
                             <p className="text-[8px] font-black text-red-500">{dateInfo.month} {dateInfo.year}</p>
                           </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-red-50 rounded-lg text-gray-300 hover:text-red-500 transition-all">
                           <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"/></svg>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal Detail Mockup */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white">
              <h2 className="font-black text-lg">Detail Reminder</h2>
              <button onClick={() => setSelectedRequest(null)} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="p-8 space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Project</p>
                    <p className="text-sm font-black">{selectedRequest.project_name}</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
                    <p className="text-sm font-black text-emerald-600">COMPLETED</p>
                  </div>
               </div>
               <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-100">
                 <p className="text-xs font-bold text-red-800">📌 Info:</p>
                 <p className="text-xs text-red-700 mt-1">Reminder ini dijadwalkan untuk proses survey lapangan bersama tim Sales.</p>
               </div>
               <button onClick={() => setSelectedRequest(null)} className="w-full bg-red-600 py-3 rounded-xl text-white font-black hover:bg-red-700 transition-all shadow-lg">Tutup</button>
            </div>
          </div>
        </div>
      )}

      <NotifToast notification={notification} />
    </div>
  );

  return null;
}

// ─── Shared Components ──────────────────────────────────────────────────────

const NotifToast = ({ notification }: { notification: any }) => notification ? (
  <div className={`fixed top-6 right-6 z-[100] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 border-l-8 ${
    notification.type === 'success' ? 'bg-white border-emerald-500 text-emerald-800' :
    notification.type === 'error'   ? 'bg-white border-red-500 text-red-800' :
                                      'bg-white border-blue-500 text-blue-800'}`}>
    <span className="text-2xl">{notification.type === 'success' ? '✅' : '❌'}</span>
    <p className="font-black text-sm">{notification.msg}</p>
  </div>
) : null;

export default function FormRequireProjectPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) setCurrentUser(JSON.parse(saved));
    setLoading(false);
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center font-black text-red-600">LOADING...</div>;
  if (!currentUser) return <div className="h-screen flex items-center justify-center font-black">PLEASE LOGIN</div>;

  return <FormRequireProject currentUser={currentUser} />;
}
