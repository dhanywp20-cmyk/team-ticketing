'use client';

import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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
}

interface TeamMember {
  id: string;
  name: string;
  username: string;
  photo_url: string;
  role: string;
}

interface ActivityLog {
  id: string;
  handler_name: string;
  handler_username: string;
  action_taken: string;
  notes: string;
  file_url: string;
  file_name: string;
  new_status: string;
  created_at: string;
}

interface Ticket {
  id: string;
  project_name: string;
  sales_name: string;
  customer_phone: string;
  issue_case: string;
  description: string;
  assigned_to: string;
  status: string;
  date: string;
  created_at: string;
  activity_logs?: ActivityLog[];
}

export default function TicketingSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [searchProject, setSearchProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [newTicket, setNewTicket] = useState({
    project_name: '',
    sales_name: '',
    customer_phone: '',
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
    new_status: 'Pending',
    file: null as File | null
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    team_member: ''
  });

  const [changePassword, setChangePassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-400',
    'Process Action': 'bg-blue-100 text-blue-800 border-blue-400',
    'Solved': 'bg-green-100 text-green-800 border-green-400'
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date);
  };

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .single();

      if (error || !data) {
        alert('Username atau password salah!');
        return;
      }

      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(data));
    } catch (err) {
      alert('Login gagal!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const fetchData = async () => {
    try {
      const [ticketsData, membersData, usersData] = await Promise.all([
        supabase.from('tickets').select('*, activity_logs(*)').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('users').select('id, username, full_name, role')
      ]);

      if (ticketsData.data) setTickets(ticketsData.data);
      if (membersData.data) setTeamMembers(membersData.data);
      if (usersData.data) setUsers(usersData.data);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.project_name || !newTicket.issue_case) {
      alert('Project name dan Issue case harus diisi!');
      return;
    }

    try {
      const { error } = await supabase.from('tickets').insert([newTicket]);
      if (error) throw error;

      setNewTicket({
        project_name: '',
        sales_name: '',
        customer_phone: '',
        issue_case: '',
        description: '',
        assigned_to: 'Dhany',
        date: new Date().toISOString().split('T')[0],
        status: 'Pending'
      });
      setShowNewTicket(false);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; name: string }> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = `reports/${fileName}`;

    const { error } = await supabase.storage.from('ticket-photos').upload(filePath, file);
    if (error) throw error;

    const { data } = supabase.storage.from('ticket-photos').getPublicUrl(filePath);
    return { url: data.publicUrl, name: file.name };
  };

  const addActivity = async () => {
    if (!newActivity.notes || !selectedTicket) {
      alert('Notes harus diisi!');
      return;
    }

    try {
      setUploading(true);
      let fileUrl = '';
      let fileName = '';

      if (newActivity.file) {
        const result = await uploadFile(newActivity.file);
        fileUrl = result.url;
        fileName = result.name;
      }

      await supabase.from('activity_logs').insert([{
        ticket_id: selectedTicket.id,
        handler_name: newActivity.handler_name,
        handler_username: currentUser?.username,
        action_taken: newActivity.action_taken,
        notes: newActivity.notes,
        new_status: newActivity.new_status,
        file_url: fileUrl,
        file_name: fileName
      }]);

      await supabase.from('tickets')
        .update({ status: newActivity.new_status })
        .eq('id', selectedTicket.id);

      setNewActivity({
        handler_name: 'Dhany',
        action_taken: '',
        notes: '',
        new_status: 'Pending',
        file: null
      });
      setUploading(false);
      fetchData();
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      alert('Semua field harus diisi!');
      return;
    }

    try {
      await supabase.from('users').insert([{
        username: newUser.username,
        password: newUser.password,
        full_name: newUser.full_name,
        role: 'user'
      }]);

      if (newUser.team_member) {
        await supabase.from('team_members')
          .update({ username: newUser.username })
          .eq('name', newUser.team_member);
      }

      setNewUser({ username: '', password: '', full_name: '', team_member: '' });
      fetchData();
      alert('User berhasil dibuat!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const updatePassword = async () => {
    if (!changePassword.current || !changePassword.new || !changePassword.confirm) {
      alert('Semua field harus diisi!');
      return;
    }

    if (changePassword.new !== changePassword.confirm) {
      alert('Password baru tidak cocok!');
      return;
    }

    try {
      // Verify current password
      const { data: userData } = await supabase
        .from('users')
        .select('password')
        .eq('id', currentUser!.id)
        .single();

      if (!userData || userData.password !== changePassword.current) {
        alert('Password lama salah!');
        return;
      }

      // Update password
      await supabase.from('users')
        .update({ password: changePassword.new })
        .eq('id', currentUser!.id);

      // Update local user state
      const updatedUser = { ...currentUser!, password: changePassword.new };
      setCurrentUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      alert('Password berhasil diubah!');
      setChangePassword({ current: '', new: '', confirm: '' });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const exportToPDF = async (ticket: Ticket) => {
    const printContent = `
      <html>
        <head>
          <title>Ticket Report - ${ticket.project_name}</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h1 { color: #EF4444; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>Ticket Report</h1>
          <h2>${ticket.project_name}</h2>
          <table>
            <tr><th>Issue</th><td>${ticket.issue_case}</td></tr>
            <tr><th>Sales</th><td>${ticket.sales_name || '-'}</td></tr>
            <tr><th>Phone</th><td>${ticket.customer_phone || '-'}</td></tr>
            <tr><th>Status</th><td>${ticket.status}</td></tr>
            <tr><th>Date</th><td>${ticket.date}</td></tr>
          </table>
          <h3>Activity Log</h3>
          ${ticket.activity_logs?.map(log => `
            <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0;">
              <strong>${log.handler_name}</strong> - ${formatDateTime(log.created_at)}<br/>
              Status: ${log.new_status}<br/>
              ${log.action_taken ? `Action: ${log.action_taken}<br/>` : ''}
              Notes: ${log.notes}
            </div>
          `).join('') || 'No activities'}
        </body>
      </html>
    `;
    
    const win = window.open('', '', 'height=700,width=700');
    win?.document.write(printContent);
    win?.document.close();
    win?.print();
  };

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const match = t.project_name.toLowerCase().includes(searchProject.toLowerCase()) ||
                    t.issue_case.toLowerCase().includes(searchProject.toLowerCase()) ||
                    (t.sales_name && t.sales_name.toLowerCase().includes(searchProject.toLowerCase()));
      const statusMatch = filterStatus === 'All' || t.status === filterStatus;
      return match && statusMatch;
    });
  }, [tickets, searchProject, filterStatus]);

  const stats = useMemo(() => {
    const total = tickets.length;
    const pending = tickets.filter(t => t.status === 'Pending').length;
    const processing = tickets.filter(t => t.status === 'Process Action').length;
    const solved = tickets.filter(t => t.status === 'Solved').length;
    
    return {
      total, pending, processing, solved,
      statusData: [
        { name: 'Pending', value: pending, color: '#FCD34D' },
        { name: 'Process Action', value: processing, color: '#60A5FA' },
        { name: 'Solved', value: solved, color: '#34D399' }
      ].filter(d => d.value > 0),
      handlerData: Object.entries(
        tickets.reduce((acc, t) => {
          acc[t.assigned_to] = (acc[t.assigned_to] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ).map(([name, tickets]) => ({ name, tickets }))
    };
  }, [tickets]);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      setCurrentUser(JSON.parse(saved));
      setIsLoggedIn(true);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border-4 border-red-600">
          <h1 className="text-3xl font-bold text-center mb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
            Login
          </h1>
          <p className="text-center text-gray-700 font-bold mb-6">Reminder Troubleshooting Project<br/>PTS IVP</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="input-field"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="input-field"
                placeholder="Masukkan password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all"
            >
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6 bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600 animate-border-pulse">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-1">
                📋 Reminder Troubleshooting Project
              </h1>
              <p className="text-gray-800 font-bold text-lg">PTS IVP</p>
              <p className="text-sm text-gray-600">Welcome, <span className="font-bold text-red-600">{currentUser?.full_name}</span></p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button onClick={() => setShowSettings(!showSettings)} className="btn-secondary">
                ⚙️ Settings
              </button>
              <button onClick={() => setShowDashboard(!showDashboard)} className="btn-purple">
                📊 Dashboard
              </button>
              <button onClick={() => setShowNewTicket(!showNewTicket)} className="btn-primary">
                + Ticket Baru
              </button>
              <button onClick={handleLogout} className="btn-danger">
                🚪 Logout
              </button>
            </div>
          </div>
        </div>

        {/* Settings */}
        {showSettings && currentUser?.role === 'admin' && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-gray-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-4">⚙️ Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-xl p-5 border-3 border-blue-300">
                <h3 className="font-bold mb-3">Buat Account Team</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} className="input-field" />
                  <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="input-field" />
                  <input type="text" placeholder="Nama Lengkap" value={newUser.full_name} onChange={(e) => setNewUser({...newUser, full_name: e.target.value})} className="input-field" />
                  <select value={newUser.team_member} onChange={(e) => setNewUser({...newUser, team_member: e.target.value})} className="input-field">
                    <option value="">Pilih Team Member</option>
                    {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                  <button onClick={createUser} className="btn-primary w-full">
                    ➕ Buat Account
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 rounded-xl p-5 border-3 border-orange-300">
                <h3 className="font-bold mb-3">Ubah Password</h3>
                <div className="space-y-3">
                  <input type="password" placeholder="Password Lama" value={changePassword.current} onChange={(e) => setChangePassword({...changePassword, current: e.target.value})} className="input-field" />
                  <input type="password" placeholder="Password Baru" value={changePassword.new} onChange={(e) => setChangePassword({...changePassword, new: e.target.value})} className="input-field" />
                  <input type="password" placeholder="Konfirmasi Password" value={changePassword.confirm} onChange={(e) => setChangePassword({...changePassword, confirm: e.target.value})} className="input-field" />
                  <button onClick={updatePassword} className="btn-primary w-full">
                    🔐 Ubah Password
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-gray-50 rounded-xl p-5 border-3 border-gray-300">
              <h3 className="font-bold mb-3">Daftar User</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {users.map(u => (
                  <div key={u.id} className="bg-white rounded-xl p-3 border-2 border-gray-300">
                    <p className="font-bold text-sm">{u.full_name}</p>
                    <p className="text-xs text-gray-600">@{u.username}</p>
                    <span className={`text-xs px-2 py-1 rounded ${u.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      {u.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {showDashboard && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-purple-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-6">📊 Dashboard</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-700">
                <p className="text-sm opacity-90">Total</p>
                <p className="text-4xl font-bold">{stats.total}</p>
              </div>
              <div className="stat-card bg-gradient-to-br from-yellow-500 to-yellow-700">
                <p className="text-sm opacity-90">Pending</p>
                <p className="text-4xl font-bold">{stats.pending}</p>
              </div>
              <div className="stat-card bg-gradient-to-br from-blue-400 to-blue-600">
                <p className="text-sm opacity-90">Process</p>
                <p className="text-4xl font-bold">{stats.processing}</p>
              </div>
              <div className="stat-card bg-gradient-to-br from-green-500 to-green-700">
                <p className="text-sm opacity-90">Solved</p>
                <p className="text-4xl font-bold">{stats.solved}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="chart-container">
                <h3 className="font-bold mb-4">Status Distribution</h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={stats.statusData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={90} dataKey="value">
                      {stats.statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-container">
                <h3 className="font-bold mb-4">Tickets per Handler</h3>
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
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-blue-500">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold mb-2">🔍 Cari Project</label>
              <input type="text" value={searchProject} onChange={(e) => setSearchProject(e.target.value)} placeholder="Nama project, sales, atau issue..." className="input-field" />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-bold mb-2">📋 Filter Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field">
                <option value="All">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Process Action">Process Action</option>
                <option value="Solved">Solved</option>
              </select>
            </div>
          </div>
        </div>

        {/* New Ticket Form */}
        {showNewTicket && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-green-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-4">📝 Buat Ticket Baru</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label-field">Nama Project *</label>
                <input type="text" value={newTicket.project_name} onChange={(e) => setNewTicket({...newTicket, project_name: e.target.value})} placeholder="Nama project" className="input-field" />
              </div>
              <div>
                <label className="label-field">Nama Sales</label>
                <input type="text" value={newTicket.sales_name} onChange={(e) => setNewTicket({...newTicket, sales_name: e.target.value})} placeholder="Nama sales" className="input-field" />
              </div>
              <div>
                <label className="label-field">No. Telepon Customer</label>
                <input type="text" value={newTicket.customer_phone} onChange={(e) => setNewTicket({...newTicket, customer_phone: e.target.value})} placeholder="08xx-xxxx-xxxx" className="input-field" />
              </div>
              <div>
                <label className="label-field">Issue Case *</label>
                <input type="text" value={newTicket.issue_case} onChange={(e) => setNewTicket({...newTicket, issue_case: e.target.value})} placeholder="Masalah yang terjadi" className="input-field" />
              </div>
              <div>
                <label className="label-field">Tanggal</label>
                <input type="date" value={newTicket.date} onChange={(e) => setNewTicket({...newTicket, date: e.target.value})} className="input-field" />
              </div>
              <div>
                <label className="label-field">Status</label>
                <select value={newTicket.status} onChange={(e) => setNewTicket({...newTicket, status: e.target.value})} className="input-field">
                  <option value="Pending">Pending</option>
                  <option value="Process Action">Process Action</option>
                  <option value="Solved">Solved</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label-field">Assign ke</label>
                <select value={newTicket.assigned_to} onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})} className="input-field">
                  {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label-field">Deskripsi</label>
                <textarea value={newTicket.description} onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} placeholder="Detail masalah..." className="input-field h-24" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={createTicket} className="btn-primary">💾 Simpan Ticket</button>
              <button onClick={() => setShowNewTicket(false)} className="btn-secondary">✖ Batal</button>
            </div>
          </div>
        )}

// Update di page.tsx - bagian Tickets List

{/* Tickets List */}
<div className="space-y-4">
  <div className="flex justify-between items-center mb-4">
    <h2 className="text-2xl font-bold text-gray-800 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-xl shadow-lg border-2 border-red-500">
      📋 Daftar Ticket ({filteredTickets.length})
    </h2>
  </div>
  
  {filteredTickets.map((ticket, idx) => (
    <div
      key={ticket.id}
      onClick={() => setSelectedTicket(ticket)}
      className={`ticket-card-improved ${selectedTicket?.id === ticket.id ? 'border-red-600 ring-4 ring-red-300 bg-red-50' : 'border-gray-300 bg-white'}`}
      style={{ animationDelay: `${idx * 50}ms` }}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="font-bold text-xl text-gray-900 mb-2">🏢 {ticket.project_name}</h3>
          <div className="space-y-1">
            <p className="text-sm text-gray-800 font-semibold">⚠️ {ticket.issue_case}</p>
            {ticket.sales_name && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">👤 Sales:</span> {ticket.sales_name}
              </p>
            )}
            {ticket.customer_phone && (
              <p className="text-sm text-gray-700">
                <span className="font-semibold">📞 Phone:</span> {ticket.customer_phone}
              </p>
            )}
          </div>
        </div>
        <span className={`px-4 py-2 rounded-full text-sm font-bold border-2 shadow-md ${statusColors[ticket.status]}`}>
          {ticket.status}
        </span>
      </div>
      
      <div className="flex flex-wrap gap-4 text-sm text-gray-700 bg-gray-50 rounded-lg p-3 border border-gray-200">
        <span className="flex items-center gap-1 font-medium">
          📅 {new Date(ticket.date).toLocaleDateString('id-ID')}
        </span>
        <span className="flex items-center gap-1 font-medium">
          💬 {ticket.activity_logs?.length || 0} aktivitas
        </span>
        {ticket.activity_logs?.some(a => a.file_url) && (
          <span className="flex items-center gap-1 font-medium text-blue-600">
            📄 Report tersedia
          </span>
        )}
      </div>
    </div>
  ))}
</div>

          {/* Detail */}
          {selectedTicket && (
            <div className="ticket-detail">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800">🏢 {selectedTicket.project_name}</h2>
                  <p className="text-gray-600 font-medium">⚠️ {selectedTicket.issue_case}</p>
                  {selectedTicket.sales_name && <p className="text-sm text-gray-600">👤 Sales: {selectedTicket.sales_name}</p>}
                  {selectedTicket.customer_phone && <p className="text-sm text-gray-600">📞 {selectedTicket.customer_phone}</p>}
                </div>
                <button onClick={() => exportToPDF(selectedTicket)} className="btn-export">
                  📄 Export PDF
                </button>
              </div>

              {selectedTicket.description && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 border-2 border-gray-300">
                  <p className="text-sm">{selectedTicket.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="info-box bg-blue-50 border-blue-300">
                  <p className="text-xs text-gray-600">Assigned to</p>
                  <p className="font-bold">👤 {selectedTicket.assigned_to}</p>
                </div>
                <div className="info-box bg-green-50 border-green-300">
                  <p className="text-xs text-gray-600">Tanggal</p>
                  <p className="font-bold">📅 {new Date(selectedTicket.date).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Activity Log */}
              <div className="border-t-2 border-gray-300 pt-6 mb-6">
                <h3 className="font-bold text-lg mb-4">📝 Activity Log</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedTicket.activity_logs && selectedTicket.activity_logs.length > 0 ? (
                    selectedTicket.activity_logs.map((log, idx) => (
                      <div key={log.id} className="activity-log" style={{ animationDelay: `${idx * 50}ms` }}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-bold text-gray-800">{log.handler_name}</p>
                            <p className="text-xs text-gray-500">{formatDateTime(log.created_at)}</p>
                            {log.handler_username && <p className="text-xs text-blue-600">@{log.handler_username}</p>}
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[log.new_status]}`}>
                            {log.new_status}
                          </span>
                        </div>
                        {log.action_taken && (
                          <div className="bg-blue-100 border-l-4 border-blue-600 rounded px-3 py-2 mb-2">
                            <p className="text-sm font-semibold text-blue-900">🔧 {log.action_taken}</p>
                          </div>
                        )}
                        <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                        {log.file_url && (
                          <a href={log.file_url} download={log.file_name} className="file-download">
                            📄 {log.file_name || 'Download Report'}
                          </a>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">Belum ada aktivitas</p>
                  )}
                </div>
              </div>

              {/* Update Form */}
              <div className="border-t-2 border-gray-300 pt-6">
                <h3 className="font-bold text-lg mb-4">➕ Update Status</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label-field">Handler</label>
                    <select value={newActivity.handler_name} onChange={(e) => setNewActivity({...newActivity, handler_name: e.target.value})} className="input-field">
                      {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Status Baru</label>
                    <select value={newActivity.new_status} onChange={(e) => setNewActivity({...newActivity, new_status: e.target.value})} className="input-field">
                      <option value="Pending">Pending</option>
                      <option value="Process Action">Process Action</option>
                      <option value="Solved">Solved</option>
                    </select>
                  </div>
                  <div>
                    <label className="label-field">Action</label>
                    <input type="text" value={newActivity.action_taken} onChange={(e) => setNewActivity({...newActivity, action_taken: e.target.value})} placeholder="Action yang dilakukan" className="input-field" />
                  </div>
                  <div>
                    <label className="label-field">Notes *</label>
                    <textarea value={newActivity.notes} onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})} placeholder="Catatan detail..." className="input-field h-20" />
                  </div>
                  <div>
                    <label className="label-field">Upload File Report (PDF)</label>
                    <input type="file" accept=".pdf" onChange={(e) => setNewActivity({...newActivity, file: e.target.files?.[0] || null})} className="input-field" />
                    {newActivity.file && <p className="text-xs text-green-600 mt-1">📎 {newActivity.file.name}</p>}
                  </div>
                  <button onClick={addActivity} disabled={uploading} className="btn-primary w-full">
                    {uploading ? '⏳ Uploading...' : '💾 Update Status'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        .btn-primary {
          @apply bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all;
        }
        .btn-secondary {
          @apply bg-gradient-to-r from-gray-600 to-gray-800 text-white px-5 py-3 rounded-xl hover:from-gray-700 hover:to-gray-900 font-bold shadow-lg transition-all;
        }
        .btn-purple {
          @apply bg-gradient-to-r from-purple-600 to-purple-800 text-white px-5 py-3 rounded-xl hover:from-purple-700 hover:to-purple-900 font-bold shadow-lg transition-all animate-button-glow;
        }
        .btn-danger {
          @apply bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-lg transition-all;
        }
        .btn-export {
          @apply bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold text-sm transition-all;
        }
        .ticket-card {
          @apply bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-5 cursor-pointer hover:shadow-2xl transition-all border-3 transform hover:scale-102 animate-slide-up;
        }
        .ticket-detail {
          @apply bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 border-3 border-red-500 sticky top-6 animate-scale-in;
        }
        .activity-log {
          @apply bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 shadow-md animate-slide-down;
        }
        .stat-card {
          @apply rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform animate-fade-in;
        }
        .chart-container {
          @apply bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-3 border-gray-300 shadow-xl;
        }
        .info-box {
          @apply rounded-xl p-3 border-2;
        }
        .label-field {
          @apply block text-sm font-bold mb-2 text-gray-800;
        }
        .file-download {
          @apply inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-all;
        }
      `}</style>
    </div>
  );
}

