import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: string;
}

interface OverdueSetting {
  ticket_id: string;
  overdue_hours: number; // jam batas overdue per ticket
  enabled: boolean;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  category: string;
  overdue_hours?: number;   // setting overdue per-ticket (jam)
  overdue_enabled?: boolean; // apakah overdue aktif untuk ticket ini
}

interface Comment {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  username?: string;
  full_name?: string;
}

export default function Ticketing() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [newComment, setNewComment] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'comments'>('details');
  const [searchQuery, setSearchQuery] = useState('');

  // State untuk overdue setting per-ticket (admin only)
  const [editingOverdue, setEditingOverdue] = useState<string | null>(null); // ticket_id yang sedang diedit
  const [overdueInput, setOverdueInput] = useState<{ hours: string; enabled: boolean }>({ hours: '24', enabled: true });

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    priority: 'medium' as Ticket['priority'],
    category: '',
    assigned_to: '',
    overdue_hours: 24,
    overdue_enabled: true,
  });

  const [users, setUsers] = useState<User[]>([]);
  const commentEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = currentUser?.role === 'admin';

  // ─── Helpers ───────────────────────────────────────────────────────────────

  const isOverdue = (ticket: Ticket): boolean => {
    if (!ticket.overdue_enabled) return false;
    if (ticket.status === 'resolved' || ticket.status === 'closed') return false;
    const hours = ticket.overdue_hours ?? 24;
    const created = new Date(ticket.created_at).getTime();
    const now = Date.now();
    const diffHours = (now - created) / (1000 * 60 * 60);
    return diffHours >= hours;
  };

  const getTimeElapsed = (ticket: Ticket): string => {
    const created = new Date(ticket.created_at).getTime();
    const now = Date.now();
    const diffMs = now - created;
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffH >= 24) {
      const days = Math.floor(diffH / 24);
      const remH = diffH % 24;
      return `${days}d ${remH}h`;
    }
    return `${diffH}h ${diffM}m`;
  };

  const getOverdueLabel = (ticket: Ticket): string => {
    if (!ticket.overdue_enabled) return '';
    const hours = ticket.overdue_hours ?? 24;
    if (hours >= 24 && hours % 24 === 0) return `${hours / 24}d`;
    return `${hours}h`;
  };

  // ─── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) setCurrentUser(JSON.parse(saved));
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTickets();
      fetchUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedTicket) fetchComments(selectedTicket.id);
  }, [selectedTicket]);

  useEffect(() => {
    commentEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('created_at', { ascending: false });
      if (!error && data) setTickets(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('*');
    if (data) setUsers(data);
  };

  const fetchComments = async (ticketId: string) => {
    const { data } = await supabase
      .from('ticket_comments')
      .select('*, users(username, full_name)')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (data) {
      setComments(
        data.map((c: any) => ({
          ...c,
          username: c.users?.username,
          full_name: c.users?.full_name,
        }))
      );
    }
  };

  // ─── Actions ───────────────────────────────────────────────────────────────

  const handleCreateTicket = async () => {
    if (!newTicket.title || !newTicket.description) {
      alert('Title dan description wajib diisi!');
      return;
    }
    const payload: any = {
      title: newTicket.title,
      description: newTicket.description,
      priority: newTicket.priority,
      category: newTicket.category,
      assigned_to: newTicket.assigned_to || null,
      status: 'open',
      created_by: currentUser?.id,
      overdue_hours: newTicket.overdue_hours,
      overdue_enabled: newTicket.overdue_enabled,
    };
    const { error } = await supabase.from('tickets').insert([payload]);
    if (!error) {
      setShowCreateForm(false);
      setNewTicket({ title: '', description: '', priority: 'medium', category: '', assigned_to: '', overdue_hours: 24, overdue_enabled: true });
      fetchTickets();
    } else {
      alert('Gagal membuat ticket!');
    }
  };

  const handleUpdateStatus = async (ticketId: string, status: Ticket['status']) => {
    await supabase.from('tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId);
    fetchTickets();
    if (selectedTicket?.id === ticketId) setSelectedTicket(prev => prev ? { ...prev, status } : null);
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !selectedTicket) return;
    await supabase.from('ticket_comments').insert([{
      ticket_id: selectedTicket.id,
      user_id: currentUser?.id,
      content: newComment.trim(),
    }]);
    setNewComment('');
    fetchComments(selectedTicket.id);
  };

  // ─── Overdue Setting per-ticket (admin only) ───────────────────────────────

  const openOverdueSetting = (ticket: Ticket) => {
    setEditingOverdue(ticket.id);
    setOverdueInput({
      hours: String(ticket.overdue_hours ?? 24),
      enabled: ticket.overdue_enabled ?? true,
    });
  };

  const saveOverdueSetting = async (ticketId: string) => {
    const hours = parseInt(overdueInput.hours, 10);
    if (isNaN(hours) || hours < 1) {
      alert('Masukkan jam yang valid (minimal 1 jam)!');
      return;
    }
    const { error } = await supabase
      .from('tickets')
      .update({
        overdue_hours: hours,
        overdue_enabled: overdueInput.enabled,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);
    if (!error) {
      setEditingOverdue(null);
      fetchTickets();
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => prev ? { ...prev, overdue_hours: hours, overdue_enabled: overdueInput.enabled } : null);
      }
    } else {
      alert('Gagal menyimpan setting overdue!');
    }
  };

  // ─── Filter & search ───────────────────────────────────────────────────────

  const filteredTickets = tickets.filter(t => {
    const matchStatus = filterStatus === 'all' || t.status === filterStatus;
    const matchPriority = filterPriority === 'all' || t.priority === filterPriority;
    const matchSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchPriority && matchSearch;
  });

  const overdueCount = tickets.filter(t => isOverdue(t)).length;

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  const priorityConfig: Record<string, { color: string; bg: string; label: string }> = {
    low:      { color: 'text-slate-600',  bg: 'bg-slate-100',  label: 'Low' },
    medium:   { color: 'text-amber-700',  bg: 'bg-amber-50',   label: 'Medium' },
    high:     { color: 'text-orange-700', bg: 'bg-orange-50',  label: 'High' },
    critical: { color: 'text-red-700',    bg: 'bg-red-50',     label: 'Critical' },
  };

  const statusConfig: Record<string, { color: string; bg: string; label: string; dot: string }> = {
    open:        { color: 'text-blue-700',   bg: 'bg-blue-50',   label: 'Open',        dot: 'bg-blue-500' },
    in_progress: { color: 'text-amber-700',  bg: 'bg-amber-50',  label: 'In Progress', dot: 'bg-amber-500' },
    resolved:    { color: 'text-emerald-700',bg: 'bg-emerald-50',label: 'Resolved',     dot: 'bg-emerald-500' },
    closed:      { color: 'text-slate-600',  bg: 'bg-slate-100', label: 'Closed',      dot: 'bg-slate-400' },
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin" />
          <p className="text-slate-600 font-medium">Loading Tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-600 to-rose-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">🎫</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Ticket Troubleshooting</h1>
            <p className="text-xs text-slate-500">{filteredTickets.length} ticket ditampilkan</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Overdue notification badge - visible semua user */}
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-semibold animate-pulse">
              <span className="text-base">⚠️</span>
              <span>{overdueCount} Ticket Overdue!</span>
            </div>
          )}

          <button
            onClick={() => { setShowCreateForm(true); setSelectedTicket(null); }}
            className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg font-semibold text-sm shadow-sm flex items-center gap-2 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Ticket
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL: TICKET LIST ── */}
        <div className="w-full md:w-2/5 lg:w-1/3 border-r border-slate-200 bg-white flex flex-col overflow-hidden">

          {/* Filter bar */}
          <div className="p-4 space-y-3 border-b border-slate-100">
            <input
              type="text"
              placeholder="Cari ticket..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-slate-50"
            />
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="all">Semua Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={filterPriority}
                onChange={e => setFilterPriority(e.target.value)}
                className="flex-1 border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-rose-300"
              >
                <option value="all">Semua Prioritas</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* Ticket list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredTickets.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="text-4xl mb-2">🎫</div>
                <p className="font-medium">Tidak ada ticket</p>
              </div>
            ) : (
              filteredTickets.map(ticket => {
                const overdue = isOverdue(ticket);
                const sc = statusConfig[ticket.status];
                const pc = priorityConfig[ticket.priority];
                const isSelected = selectedTicket?.id === ticket.id;

                return (
                  <div
                    key={ticket.id}
                    onClick={() => { setSelectedTicket(ticket); setShowCreateForm(false); setActiveTab('details'); }}
                    className={`p-4 cursor-pointer transition-all hover:bg-slate-50 ${isSelected ? 'bg-rose-50 border-l-4 border-rose-500' : ''} ${overdue ? 'border-l-4 border-red-500' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="font-semibold text-slate-800 text-sm leading-snug flex-1">{ticket.title}</span>
                      {/* Overdue badge - visible semua user */}
                      {overdue && (
                        <span className="flex-shrink-0 text-xs bg-red-100 text-red-700 border border-red-200 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
                          OVERDUE
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1 mb-2">{ticket.description}</p>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status */}
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${sc.bg} ${sc.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {sc.label}
                      </span>
                      {/* Priority */}
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${pc.bg} ${pc.color}`}>
                        {pc.label}
                      </span>
                      {/* Time elapsed */}
                      <span className={`text-xs ml-auto font-mono ${overdue ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                        ⏱ {getTimeElapsed(ticket)}
                      </span>
                    </div>

                    {/* Overdue setting info - hanya admin yang bisa lihat setting-nya */}
                    {isAdmin && ticket.overdue_enabled && (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">
                          ⚙️ Overdue limit: <span className="font-semibold text-slate-500">{getOverdueLabel(ticket)}</span>
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: DETAIL / CREATE ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">

          {/* CREATE FORM */}
          {showCreateForm && (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold text-slate-800">Buat Ticket Baru</h2>
                  <button onClick={() => setShowCreateForm(false)} className="text-slate-400 hover:text-slate-600">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Judul *</label>
                    <input
                      type="text"
                      value={newTicket.title}
                      onChange={e => setNewTicket({ ...newTicket, title: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                      placeholder="Judul ticket..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Deskripsi *</label>
                    <textarea
                      value={newTicket.description}
                      onChange={e => setNewTicket({ ...newTicket, description: e.target.value })}
                      rows={4}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 resize-none"
                      placeholder="Deskripsikan masalah..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Prioritas</label>
                      <select
                        value={newTicket.priority}
                        onChange={e => setNewTicket({ ...newTicket, priority: e.target.value as Ticket['priority'] })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Kategori</label>
                      <input
                        type="text"
                        value={newTicket.category}
                        onChange={e => setNewTicket({ ...newTicket, category: e.target.value })}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                        placeholder="e.g. Hardware, Software..."
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Assign Ke</label>
                    <select
                      value={newTicket.assigned_to}
                      onChange={e => setNewTicket({ ...newTicket, assigned_to: e.target.value })}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white"
                    >
                      <option value="">-- Tidak Assign --</option>
                      {users.map(u => (
                        <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>
                      ))}
                    </select>
                  </div>

                  {/* ── OVERDUE SETTING (tampil saat create, admin only bisa edit) ── */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-base">⏰</span>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Overdue Setting</span>
                        {!isAdmin && (
                          <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-semibold">Admin Only</span>
                        )}
                      </div>
                      {isAdmin && (
                        <label className="flex items-center gap-2 cursor-pointer">
                          <span className="text-xs text-slate-500">Aktif</span>
                          <div
                            onClick={() => setNewTicket({ ...newTicket, overdue_enabled: !newTicket.overdue_enabled })}
                            className={`w-10 h-5 rounded-full transition-all cursor-pointer flex items-center px-0.5 ${newTicket.overdue_enabled ? 'bg-rose-500' : 'bg-slate-300'}`}
                          >
                            <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${newTicket.overdue_enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                          </div>
                        </label>
                      )}
                    </div>
                    {isAdmin ? (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <label className="block text-xs text-slate-500 mb-1">Batas Waktu (Jam)</label>
                          <input
                            type="number"
                            min={1}
                            value={newTicket.overdue_hours}
                            onChange={e => setNewTicket({ ...newTicket, overdue_hours: parseInt(e.target.value) || 24 })}
                            disabled={!newTicket.overdue_enabled}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-white disabled:opacity-40 disabled:bg-slate-100"
                            placeholder="24"
                          />
                        </div>
                        <div className="text-xs text-slate-400 pt-5">
                          = {Math.floor((newTicket.overdue_hours || 24) / 24) > 0
                            ? `${Math.floor((newTicket.overdue_hours || 24) / 24)}h ${(newTicket.overdue_hours || 24) % 24}j`
                            : `${newTicket.overdue_hours || 24} jam`}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Setting overdue hanya dapat dikonfigurasi oleh admin.</p>
                    )}
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleCreateTicket}
                      className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-lg font-semibold text-sm transition-all shadow-sm"
                    >
                      Buat Ticket
                    </button>
                    <button
                      onClick={() => setShowCreateForm(false)}
                      className="px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2.5 rounded-lg font-semibold text-sm transition-all"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TICKET DETAIL */}
          {selectedTicket && !showCreateForm && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab bar */}
              <div className="bg-white border-b border-slate-200 px-6 flex gap-0">
                {(['details', 'comments'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all capitalize ${
                      activeTab === tab
                        ? 'border-rose-500 text-rose-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab === 'details' ? 'Detail' : `Komentar (${comments.length})`}
                  </button>
                ))}
              </div>

              {/* Detail tab */}
              {activeTab === 'details' && (
                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-2xl mx-auto space-y-5">

                    {/* Overdue alert banner - semua user bisa lihat */}
                    {isOverdue(selectedTicket) && (
                      <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 flex items-start gap-3">
                        <span className="text-xl flex-shrink-0">⚠️</span>
                        <div>
                          <p className="font-bold text-red-700 text-sm">Ticket Overdue!</p>
                          <p className="text-xs text-red-600 mt-0.5">
                            Ticket ini telah melewati batas waktu penanganan
                            {selectedTicket.overdue_enabled && selectedTicket.overdue_hours
                              ? ` (${getOverdueLabel(selectedTicket)})`
                              : ''}.
                            Segera tindak lanjuti.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Header card */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <h2 className="text-lg font-bold text-slate-800 leading-snug">{selectedTicket.title}</h2>
                        <div className="flex gap-2 flex-shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusConfig[selectedTicket.status].bg} ${statusConfig[selectedTicket.status].color}`}>
                            {statusConfig[selectedTicket.status].label}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full font-semibold ${priorityConfig[selectedTicket.priority].bg} ${priorityConfig[selectedTicket.priority].color}`}>
                            {priorityConfig[selectedTicket.priority].label}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed">{selectedTicket.description}</p>
                    </div>

                    {/* Meta info */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Informasi</h3>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">ID Ticket</p>
                          <p className="font-mono text-xs text-slate-600">#{selectedTicket.id.slice(0, 8)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Kategori</p>
                          <p className="font-medium text-slate-700">{selectedTicket.category || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Dibuat</p>
                          <p className="font-medium text-slate-700">{formatDate(selectedTicket.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Update Terakhir</p>
                          <p className="font-medium text-slate-700">{formatDate(selectedTicket.updated_at || selectedTicket.created_at)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Waktu Berlalu</p>
                          <p className={`font-bold ${isOverdue(selectedTicket) ? 'text-red-600' : 'text-slate-700'}`}>
                            ⏱ {getTimeElapsed(selectedTicket)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400 mb-0.5">Assign To</p>
                          <p className="font-medium text-slate-700">
                            {users.find(u => u.id === selectedTicket.assigned_to)?.full_name || '-'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ── OVERDUE SETTING PER-TICKET (hanya admin yang bisa lihat & edit) ── */}
                    {isAdmin && (
                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-base">⏰</span>
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Overdue Setting</h3>
                            <span className="text-[10px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-semibold border border-rose-200">Admin Only</span>
                          </div>
                          {editingOverdue !== selectedTicket.id && (
                            <button
                              onClick={() => openOverdueSetting(selectedTicket)}
                              className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-all"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit
                            </button>
                          )}
                        </div>

                        {editingOverdue === selectedTicket.id ? (
                          /* EDIT MODE */
                          <div className="space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-slate-700">Aktifkan Overdue</span>
                              <div
                                onClick={() => setOverdueInput(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`w-12 h-6 rounded-full transition-all cursor-pointer flex items-center px-1 ${overdueInput.enabled ? 'bg-rose-500' : 'bg-slate-300'}`}
                              >
                                <div className={`w-4 h-4 bg-white rounded-full shadow transition-all ${overdueInput.enabled ? 'translate-x-6' : 'translate-x-0'}`} />
                              </div>
                            </div>
                            <div className={`${!overdueInput.enabled ? 'opacity-40 pointer-events-none' : ''}`}>
                              <label className="block text-xs text-slate-500 mb-1">Batas Waktu (Jam)</label>
                              <div className="flex items-center gap-3">
                                <input
                                  type="number"
                                  min={1}
                                  value={overdueInput.hours}
                                  onChange={e => setOverdueInput(prev => ({ ...prev, hours: e.target.value }))}
                                  className="w-28 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
                                />
                                <span className="text-xs text-slate-400">
                                  {parseInt(overdueInput.hours) >= 24
                                    ? `= ${Math.floor(parseInt(overdueInput.hours) / 24)} hari ${parseInt(overdueInput.hours) % 24} jam`
                                    : `= ${overdueInput.hours} jam`}
                                </span>
                              </div>
                            </div>

                            {/* Preset buttons */}
                            <div className="flex flex-wrap gap-2">
                              {[1, 4, 8, 12, 24, 48, 72].map(h => (
                                <button
                                  key={h}
                                  onClick={() => setOverdueInput(prev => ({ ...prev, hours: String(h) }))}
                                  disabled={!overdueInput.enabled}
                                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all disabled:opacity-40 ${
                                    overdueInput.hours === String(h)
                                      ? 'bg-rose-500 text-white border-rose-500'
                                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-rose-300 hover:text-rose-600'
                                  }`}
                                >
                                  {h >= 24 ? `${h / 24}d` : `${h}h`}
                                </button>
                              ))}
                            </div>

                            <div className="flex gap-3 pt-1">
                              <button
                                onClick={() => saveOverdueSetting(selectedTicket.id)}
                                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2 rounded-lg font-semibold text-sm transition-all"
                              >
                                Simpan Setting
                              </button>
                              <button
                                onClick={() => setEditingOverdue(null)}
                                className="px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg font-semibold text-sm transition-all"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* VIEW MODE (admin only) */
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${selectedTicket.overdue_enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                              <span className="text-sm text-slate-600">
                                {selectedTicket.overdue_enabled ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </div>
                            {selectedTicket.overdue_enabled && (
                              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg">
                                <span className="text-sm">⏰</span>
                                <span className="text-sm font-bold">{getOverdueLabel(selectedTicket)}</span>
                                <span className="text-xs text-rose-500">batas overdue</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status update */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Update Status</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {(['open', 'in_progress', 'resolved', 'closed'] as const).map(status => {
                          const sc = statusConfig[status];
                          const isActive = selectedTicket.status === status;
                          return (
                            <button
                              key={status}
                              onClick={() => handleUpdateStatus(selectedTicket.id, status)}
                              className={`py-2.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                                isActive
                                  ? `${sc.bg} ${sc.color} border-current shadow-sm`
                                  : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                              }`}
                            >
                              <div className="flex items-center justify-center gap-1.5">
                                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                                {sc.label}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Comments tab */}
              {activeTab === 'comments' && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {comments.length === 0 ? (
                      <div className="text-center text-slate-400 py-12">
                        <div className="text-4xl mb-2">💬</div>
                        <p className="font-medium text-sm">Belum ada komentar</p>
                      </div>
                    ) : (
                      comments.map(comment => (
                        <div
                          key={comment.id}
                          className={`flex gap-3 ${comment.user_id === currentUser?.id ? 'flex-row-reverse' : ''}`}
                        >
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(comment.full_name || comment.username || '?')[0].toUpperCase()}
                          </div>
                          <div className={`max-w-xs ${comment.user_id === currentUser?.id ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                            <span className="text-xs text-slate-400">
                              {comment.full_name || comment.username} · {formatDate(comment.created_at)}
                            </span>
                            <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              comment.user_id === currentUser?.id
                                ? 'bg-rose-600 text-white rounded-tr-sm'
                                : 'bg-white text-slate-700 border border-slate-200 rounded-tl-sm shadow-sm'
                            }`}>
                              {comment.content}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                    <div ref={commentEndRef} />
                  </div>
                  <div className="p-4 bg-white border-t border-slate-200">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddComment()}
                        placeholder="Tulis komentar..."
                        className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-slate-50"
                      />
                      <button
                        onClick={handleAddComment}
                        disabled={!newComment.trim()}
                        className="bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all"
                      >
                        Kirim
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* EMPTY STATE */}
          {!selectedTicket && !showCreateForm && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center text-slate-400 max-w-xs">
                <div className="text-6xl mb-4">🎫</div>
                <h3 className="font-bold text-slate-600 text-lg mb-2">Pilih Ticket</h3>
                <p className="text-sm">Klik ticket di sebelah kiri untuk melihat detail, atau buat ticket baru.</p>
                {overdueCount > 0 && (
                  <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm font-semibold">
                    ⚠️ Ada {overdueCount} ticket overdue yang perlu segera ditangani!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
