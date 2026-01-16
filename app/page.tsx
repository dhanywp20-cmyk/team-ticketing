'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface TeamMember {
  id: string;
  name: string;
  photo_url: string;
  role: string;
}

interface ActivityLog {
  id: string;
  handler_name: string;
  action_taken: string;
  notes: string;
  photo_url: string;
  shift_time: string;
  created_at: string;
}

interface TicketHandler {
  id: string;
  handler_name: string;
  started_at: string;
  ended_at: string;
  shift_notes: string;
}

interface Ticket {
  id: string;
  project_name: string;
  sales_name: string;
  issue_case: string;
  description: string;
  assigned_to: string;
  status: string;
  date: string;
  created_at: string;
  activity_logs?: ActivityLog[];
  ticket_handlers?: TicketHandler[];
}

export default function TicketingSystem() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  
  const [searchProject, setSearchProject] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const [newTicket, setNewTicket] = useState({
    project_name: '',
    sales_name: '',
    issue_case: '',
    description: '',
    assigned_to: 'Dhany',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending'
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: 'Dhany',
    action_taken: '',
    notes: '',
    shift_time: 'Pagi (08:00-16:00)',
    photo: null as File | null
  });

  const shifts = ['Pagi (08:00-16:00)', 'Siang (16:00-00:00)', 'Malam (00:00-08:00)'];
  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-400',
    'Process Action': 'bg-blue-100 text-blue-800 border-blue-400',
    'Solved': 'bg-green-100 text-green-800 border-green-400'
  };

  const fetchTeamMembers = async () => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('name');

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (err: any) {
      console.error('Error:', err.message);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          activity_logs (*),
          ticket_handlers (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Error:', err.message);
      setLoading(false);
    }
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const matchSearch = ticket.project_name.toLowerCase().includes(searchProject.toLowerCase()) ||
                         ticket.issue_case.toLowerCase().includes(searchProject.toLowerCase());
      const matchStatus = filterStatus === 'All' || ticket.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [tickets, searchProject, filterStatus]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'Pending').length;
    const processing = tickets.filter(t => t.status === 'Process Action').length;
    const solved = tickets.filter(t => t.status === 'Solved').length;
    
    const statusData = [
      { name: 'Pending', value: pending, color: '#FCD34D' },
      { name: 'Process Action', value: processing, color: '#60A5FA' },
      { name: 'Solved', value: solved, color: '#34D399' }
    ];

    const handlerCounts: Record<string, number> = {};
    tickets.forEach(ticket => {
      handlerCounts[ticket.assigned_to] = (handlerCounts[ticket.assigned_to] || 0) + 1;
    });
    const handlerData = Object.entries(handlerCounts).map(([name, count]) => ({
      name,
      tickets: count
    }));

    return {
      total,
      pending,
      processing,
      solved,
      statusData: statusData.filter(d => d.value > 0),
      handlerData
    };
  }, [tickets]);

  const getTeamMember = (name: string) => {
    return teamMembers.find(m => m.name === name);
  };

  const createTicket = async () => {
    if (!newTicket.project_name.trim() || !newTicket.issue_case.trim()) {
      alert('Nama Project dan Issue Case harus diisi!');
      return;
    }

    try {
      const { data, error } = await supabase.from('tickets').insert([
        {
          project_name: newTicket.project_name,
          sales_name: newTicket.sales_name,
          issue_case: newTicket.issue_case,
          description: newTicket.description,
          assigned_to: newTicket.assigned_to,
          status: newTicket.status,
          date: newTicket.date
        }
      ]).select();

      if (error) throw error;

      if (data && data[0]) {
        await supabase.from('ticket_handlers').insert([
          {
            ticket_id: data[0].id,
            handler_name: newTicket.assigned_to,
            shift_notes: 'Handler awal'
          }
        ]);
      }

      setNewTicket({ 
        project_name: '', 
        sales_name: '', 
        issue_case: '', 
        description: '', 
        assigned_to: 'Dhany',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });
      setShowNewTicket(false);
      fetchTickets();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const uploadPhoto = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ticket-photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('ticket-photos')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const addActivity = async () => {
    if (!newActivity.notes.trim() || !selectedTicket) {
      alert('Notes harus diisi!');
      return;
    }

    try {
      setUploadingPhoto(true);
      let photoUrl = '';

      if (newActivity.photo) {
        photoUrl = await uploadPhoto(newActivity.photo);
      }

      const { error } = await supabase.from('activity_logs').insert([
        {
          ticket_id: selectedTicket.id,
          handler_name: newActivity.handler_name,
          action_taken: newActivity.action_taken,
          notes: newActivity.notes,
          shift_time: newActivity.shift_time,
          photo_url: photoUrl
        }
      ]);

      if (error) throw error;

      const lastHandler = selectedTicket.ticket_handlers?.[selectedTicket.ticket_handlers.length - 1];
      if (!lastHandler || lastHandler.handler_name !== newActivity.handler_name) {
        if (lastHandler && !lastHandler.ended_at) {
          await supabase
            .from('ticket_handlers')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', lastHandler.id);
        }

        await supabase.from('ticket_handlers').insert([
          {
            ticket_id: selectedTicket.id,
            handler_name: newActivity.handler_name,
            shift_notes: `Shift: ${newActivity.shift_time}`
          }
        ]);
      }

      setNewActivity({ 
        handler_name: 'Dhany', 
        action_taken: '', 
        notes: '', 
        shift_time: 'Pagi (08:00-16:00)',
        photo: null 
      });
      setUploadingPhoto(false);
      fetchTickets();
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploadingPhoto(false);
    }
  };

  const handleStatusChange = (ticketId: string, status: string) => {
    setNewStatus(status);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    if (!selectedTicket) return;

    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      if (error) throw error;
      
      setShowStatusModal(false);
      fetchTickets();
      
      const updatedTicket = tickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) {
        setSelectedTicket({...updatedTicket, status: newStatus});
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
           style={{
             backgroundImage: 'url(https://i.ibb.co/hDjYW4g/indovisual-bg.jpg)',
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundAttachment: 'fixed'
           }}>
        <div className="text-center bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 text-gray-800 font-bold text-lg">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6"
         style={{
           backgroundImage: 'url(https://i.ibb.co/hDjYW4g/indovisual-bg.jpg)',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundAttachment: 'fixed'
         }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-red-500 animate-border-pulse">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-2 animate-text-shine">
                🎫 Reminder Troubleshooting Project
              </h1>
              <p className="text-gray-700 font-medium">
                <span className="font-bold text-red-600">Tim Support PTS IVP:</span> Dhany, Reka, Yoga, Ade, Ferdinan
              </p>
              <p className="text-sm text-gray-600 mt-2 font-mono">
                🕐 Waktu Jakarta: <span className="font-bold text-blue-600">{getJakartaTime()}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className="group relative bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-900 shadow-lg transition-all font-bold overflow-hidden animate-button-glow"
              >
                <span className="relative z-10">📊 Dashboard</span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </button>
              <button
                onClick={() => setShowNewTicket(!showNewTicket)}
                className="group relative bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-900 shadow-lg transition-all font-bold overflow-hidden animate-button-glow"
              >
                <span className="relative z-10">+ Ticket Baru</span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard */}
        {showDashboard && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-purple-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">
              📊 Dashboard & Analytics
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform animate-fade-in">
                <p className="text-sm opacity-90">Total Tickets</p>
                <p className="text-4xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform animate-fade-in delay-100">
                <p className="text-sm opacity-90">Pending</p>
                <p className="text-4xl font-bold">{stats.pending}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform animate-fade-in delay-200">
                <p className="text-sm opacity-90">Process Action</p>
                <p className="text-4xl font-bold">{stats.processing}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform animate-fade-in delay-300">
                <p className="text-sm opacity-90">Solved</p>
                <p className="text-4xl font-bold">{stats.solved}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={stats.statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {stats.statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-300 shadow-xl">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">Tickets per Handler</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.handlerData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="tickets" fill="#EF4444" radius={[10, 10, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filter */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-blue-500">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold mb-2 text-gray-800">🔍 Cari Project</label>
              <input
                type="text"
                value={searchProject}
                onChange={(e) => setSearchProject(e.target.value)}
                placeholder="Ketik nama project atau issue..."
                className="w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all font-medium"
              />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-bold mb-2 text-gray-800">📋 Filter Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all font-medium"
              >
                <option value="All">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Process Action">Process Action</option>
                <option value="Solved">Solved</option>
              </select>
            </div>
          </div>
          {(searchProject || filterStatus !== 'All') && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-xl p-4 border-2 border-blue-300 animate-slide-down">
              <p className="text-sm text-gray-800 font-medium">
                Menampilkan <span className="font-bold text-blue-700 text-lg">{filteredTickets.length}</span> dari {tickets.length} ticket
              </p>
              <button
                onClick={() => {
                  setSearchProject('');
                  setFilterStatus('All');
                }}
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-bold transition-all"
              >
                Reset Filter
              </button>
            </div>
          )}
        </div>

        {/* Form Ticket Baru */}
        {showNewTicket && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-green-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800">
              📝 Buat Ticket Baru
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-800">Nama Project *</label>
                <input
                  type="text"
                  value={newTicket.project_name}
                  onChange={(e) => setNewTicket({...newTicket, project_name: e.target.value})}
                  placeholder="Contoh: Project BCA"
                  className="w-full border-3 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-800">Issue Case *</label>
                <input
                  type="text"
                  value={newTicket.issue_case}
                  onChange={(e) => setNewTicket({...newTicket, issue_case: e.target.value})}
                  placeholder="Contoh: Videowall Error"
                  className="w-full border-3 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-800">Tanggal</label>
                <input
                  type="date"
                  value={newTicket.date}
                  onChange={(e) => setNewTicket({...newTicket, date: e.target.value})}
                  className="w-full border-3 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-800">Status</label>
                <select
                  value={newTicket.status}
                  onChange={(e) => setNewTicket({...newTicket, status: e.target.value})}
                  className="w-full border-3 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                >
                  <option value="Pending">Pending</option>
                  <option value="Process Action">Process Action</option>
                  <option value="Solved">Solved</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-gray-800 mb-3">Assign ke</label>
                <div className="flex flex-wrap gap-3">
                  {teamMembers.map(member => {
                    const isSelected = newTicket.assigned_to === member.name;
                    return (
                      <div
                        key={member.id}
                        onClick={() => setNewTicket({...newTicket, assigned_to: member.name})}
                        className={`cursor-pointer p-2 rounded-xl border-3 transition-all transform hover:scale-110 ${
                          isSelected ? 'border-red-600 bg-red-50 shadow-lg' : 'border-gray-300 bg-white'
                        }`}
                      >
                        <img 
                          src={member.photo_url} 
                          alt={member.name}
                          className="w-16 h-16 rounded-full border-2 border-white shadow-md"
                        />
                        <p className={`text-xs font-bold text-center mt-1 ${isSelected ? 'text-red-600' : 'text-gray-700'}`}>
                          {member.name}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-bold mb-2 text-gray-800">Deskripsi</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Detail masalah..."
                  className="w-full border-3 border-gray-400 rounded-xl px-4 py-2 h-24 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={createTicket}
                className="group relative bg-gradient-to-r from-green-600 to-green-800 text-white px-8 py-3 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all overflow-hidden"
              >
                <span className="relative z-10">💾 Simpan Ticket</span>
                <div className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
              </button>
              <button
                onClick={() => setShowNewTicket(false)}
                className="bg-gray-400 text-white px-8 py-3 rounded-xl hover:bg-gray-500 font-bold shadow-xl transition-all"
              >
                ✖ Batal
              </button>
            </div>
          </div>
        )}

        {/* Status Change Modal */}
        {showStatusModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-4 border-red-500 animate-scale-in">
              <h3 className="text-2xl font-bold mb-4 text-gray-800">Konfirmasi Perubahan Status</h3>
              <p className="text-gray-700 mb-2">Ubah status ticket menjadi:</p>
              <p className="text-2xl font-bold text-red-600 mb-6">{newStatus}</p>
              
              <div className="flex gap-3">
                <button
                  onClick={confirmStatusChange}
                  className="flex-1 bg-gradient-to-r from-green-600 to-green-800 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all"
                >
                  ✓ Konfirmasi
                </button>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="flex-1 bg-gray-400 text-white px-6 py-3 rounded-xl hover:bg-gray-500 font-bold shadow-xl transition-all"
                >
                  ✖ Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* List & Detail Tickets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daftar Ticket */}
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">📋 Daftar Ticket</h2>
              <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-sm font-bold text-red-600 shadow-lg border-2 border-red-500">
                {filteredTickets.length} Ticket
              </span>
            </div>
            
            {filteredTickets.length === 0 ? (
              <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 text-center border-2 border-gray-400">
                <p className="text-gray-600 font-medium">
                  {searchProject || filterStatus !== 'All' 
                    ? 'Tidak ada ticket yang sesuai dengan pencarian.' 
                    : 'Belum ada ticket. Buat ticket pertama Anda!'}
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket, idx) => {
                const member = getTeamMember(ticket.assigned_to);
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicket(ticket)}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-5 cursor-pointer hover:shadow-2xl transition-all border-3 transform hover:scale-102 animate-slide-up ${
                      selectedTicket?.id === ticket.id ? 'border-red-600 ring-4 ring-red-300' : 'border-gray-400'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1 flex items-center gap-3">
                        {member && (
                          <img 
                            src={member.photo_url} 
                            alt={member.name}
                            className="w-12 h-12 rounded-full border-3 border-red-500 shadow-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-lg text-gray-800 mb-1">
                            🏢 {ticket.project_name}
                          </h3>
                          <p className="text-sm text-gray-600 font-medium">
                            ⚠️ {ticket.issue_case}
                          </p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[ticket.status]} whitespace-nowrap ml-2`}>
                        {ticket.status}
                      </span>
                    </div>
                    
                    {ticket.description && (
                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.description}</p>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span>👤</span>
                        <span className="font-medium">{ticket.assigned_to}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>📅</span>
                        <span>{new Date(ticket.date).toLocaleDateString('id-ID')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>💬</span>
                        <span>{ticket.activity_logs?.length || 0} aktivitas</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detail Ticket */}
          {selectedTicket && (
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 h-fit sticky top-6 border-3 border-red-500 animate-scale-in">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1 flex items-center gap-3">
                  {getTeamMember(selectedTicket.assigned_to) && (
                    <img 
                      src={getTeamMember(selectedTicket.assigned_to)!.photo_url} 
                      alt={selectedTicket.assigned_to}
                      className="w-16 h-16 rounded-full border-3 border-red-600 shadow-xl"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-1">
                      🏢 {selectedTicket.project_name}
                    </h2>
                    <p className="text-gray-600 font-medium">⚠️ {selectedTicket.issue_case}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-2">Status Saat Ini:</p>
                  <span className={`px-4 py-2 rounded-xl text-sm font-bold border-2 ${statusColors[selectedTicket.status]}`}>
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              {selectedTicket.description && (
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 mb-4 border-2 border-gray-300">
                  <p className="text-gray-700 text-sm">{selectedTicket.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border-2 border-blue-300">
                  <p className="text-gray-600 mb-1">Assigned to:</p>
                  <p className="font-bold text-gray-800">👤 {selectedTicket.assigned_to}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-3 border-2 border-green-300">
                  <p className="text-gray-600 mb-1">Tanggal:</p>
                  <p className="font-bold text-gray-800">📅 {new Date(selectedTicket.date).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Handler History */}
              {selectedTicket.ticket_handlers && selectedTicket.ticket_handlers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2 text-lg">
                    👥 Handler History
                  </h3>
                  <div className="space-y-2">
                    {selectedTicket.ticket_handlers.map((handler, idx) => {
                      const member = getTeamMember(handler.handler_name);
                      return (
                        <div key={handler.id} className="bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl p-3 border-2 border-purple-300 text-sm flex items-center gap-3">
                          {member && (
                            <img 
                              src={member.photo_url} 
                              alt={member.name}
                              className="w-10 h-10 rounded-full border-2 border-purple-500 shadow-md"
                            />
                          )}
                          <div className="flex-1">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-800">
                                {idx + 1}. {handler.handler_name}
                              </span>
                              <span className={`px-2 py-1 rounded text-xs font-bold ${handler.ended_at ? 'bg-gray-300 text-gray-700' : 'bg-green-400 text-white'}`}>
                                {handler.ended_at ? 'Selesai' : 'Aktif'}
                              </span>
                            </div>
                            <p className="text-gray-600 text-xs mt-1">
                              Mulai: {new Date(handler.started_at).toLocaleString('id-ID')}
                            </p>
                            {handler.ended_at && (
                              <p className="text-gray-600 text-xs">
                                Selesai: {new Date(handler.ended_at).toLocaleString('id-ID')}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Activity Log */}
              <div className="border-t-2 border-gray-300 pt-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
                  📝 Activity Log
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {selectedTicket.activity_logs && selectedTicket.activity_logs.length > 0 ? (
                    selectedTicket.activity_logs.map((log, idx) => {
                      const member = getTeamMember(log.handler_name);
                      return (
                        <div key={log.id} style={{ animationDelay: `${idx * 50}ms` }} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 shadow-md animate-slide-down">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {member ? (
                                <img 
                                  src={member.photo_url} 
                                  alt={member.name}
                                  className="w-10 h-10 rounded-full border-2 border-blue-600 shadow-md"
                                />
                              ) : (
                                <span className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center text-sm font-bold">
                                  {log.handler_name.charAt(0)}
                                </span>
                              )}
                              <div>
                                <p className="font-bold text-gray-800">{log.handler_name}</p>
                                <p className="text-xs text-gray-500">
                                  {new Date(log.created_at).toLocaleString('id-ID')}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs bg-orange-200 text-orange-900 px-3 py-1 rounded-full font-bold border-2 border-orange-400">
                              {log.shift_time}
                            </span>
                          </div>
                          
                          {log.action_taken && (
                            <div className="bg-blue-100 border-l-4 border-blue-600 rounded px-3 py-2 mb-2">
                              <p className="text-sm font-semibold text-blue-900">
                                🔧 Action: {log.action_taken}
                              </p>
                            </div>
                          )}
                          
                          <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                          
                          {log.photo_url && (
                            <img 
                              src={log.photo_url} 
                              alt="Activity photo" 
                              className="rounded-xl mt-2 max-w-full h-auto border-3 border-gray-400 cursor-pointer hover:scale-105 transition-transform shadow-lg"
                              onClick={() => window.open(log.photo_url, '_blank')}
                            />
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-gray-500 text-center py-4">Belum ada aktivitas</p>
                  )}
                </div>
              </div>

              {/* Form Tambah Activity */}
              <div className="border-t-2 border-gray-300 pt-6">
                <h3 className="font-bold text-gray-800 mb-4 text-lg">➕ Tambah Update</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-2 text-gray-800">Handler</label>
                      <div className="flex flex-wrap gap-2">
                        {teamMembers.map(member => {
                          const isSelected = newActivity.handler_name === member.name;
                          return (
                            <div
                              key={member.id}
                              onClick={() => setNewActivity({...newActivity, handler_name: member.name})}
                              className={`cursor-pointer p-1 rounded-xl border-2 transition-all transform hover:scale-110 ${
                                isSelected ? 'border-red-600 bg-red-50 shadow-lg' : 'border-gray-300 bg-white'
                              }`}
                            >
                              <img 
                                src={member.photo_url} 
                                alt={member.name}
                                className="w-12 h-12 rounded-full border-2 border-white shadow-md"
                              />
                              <p className={`text-xs font-bold text-center ${isSelected ? 'text-red-600' : 'text-gray-700'}`}>
                                {member.name}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-2 text-gray-800">Shift</label>
                      <select
                        value={newActivity.shift_time}
                        onChange={(e) => setNewActivity({...newActivity, shift_time: e.target.value})}
                        className="w-full border-2 border-gray-400 rounded-xl px-3 py-2 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                      >
                        {shifts.map(shift => (
                          <option key={shift} value={shift}>{shift}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold mb-2 text-gray-800">Action yang Dilakukan</label>
                    <input
                      type="text"
                      value={newActivity.action_taken}
                      onChange={(e) => setNewActivity({...newActivity, action_taken: e.target.value})}
                      placeholder="Contoh: Cek kabel HDMI dan power"
                      className="w-full border-2 border-gray-400 rounded-xl px-3 py-2 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold mb-2 text-gray-800">Notes *</label>
                    <textarea
                      value={newActivity.notes}
                      onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                      placeholder="Detail pekerjaan yang dilakukan..."
                      className="w-full border-2 border-gray-400 rounded-xl px-3 py-2 h-20 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold mb-2 text-gray-800">Upload Foto</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewActivity({...newActivity, photo: e.target.files?.[0] || null})}
                      className="w-full border-2 border-gray-400 rounded-xl px-3 py-2 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                    />
                    {newActivity.photo && (
                      <p className="text-xs text-green-600 mt-1 font-bold">📎 {newActivity.photo.name}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={addActivity}
                    disabled={uploadingPhoto}
                    className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed animate-button-glow"
                  >
                    {uploadingPhoto ? '⏳ Uploading...' : '💾 Tambah Activity'}
                  </button>

                  <button
                    onClick={() => handleStatusChange(selectedTicket.id, 
                      selectedTicket.status === 'Pending' ? 'Process Action' : 
                      selectedTicket.status === 'Process Action' ? 'Solved' : 'Pending'
                    )}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold shadow-xl transition-all"
                  >
                    🔄 Ubah Status ke {
                      selectedTicket.status === 'Pending' ? 'Process Action' : 
                      selectedTicket.status === 'Process Action' ? 'Solved' : 'Pending'
                    }
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}

