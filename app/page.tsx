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
  customer_phone: string;
  sales_name: string;
  issue_case: string;
  description: string;
  assigned_to: string;
  status: string;
  date: string;
  created_at: string;
  created_by?: string;
  activity_logs?: ActivityLog[];
}

interface GuestMapping {
  id: string;
  guest_username: string;
  project_name: string;
  created_at: string;
}

export default function TicketingSystem() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginTime, setLoginTime] = useState<number | null>(null);
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [guestMappings, setGuestMappings] = useState<GuestMapping[]>([]);
  
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showGuestMapping, setShowGuestMapping] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [showLoadingPopup, setShowLoadingPopup] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  const [searchProject, setSearchProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  const [newMapping, setNewMapping] = useState({
    guestUsername: '',
    projectName: ''
  });

  const [newTicket, setNewTicket] = useState({
    project_name: '',
    customer_phone: '',
    sales_name: '',
    issue_case: '',
    description: '',
    assigned_to: '',
    date: new Date().toISOString().split('T')[0],
    status: 'In Progress'
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: '',
    action_taken: '',
    notes: '',
    new_status: 'In Progress',
    file: null as File | null
  });

  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    team_member: '',
    role: 'team'
  });

  const [changePassword, setChangePassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-400',
    'In Progress': 'bg-blue-100 text-blue-800 border-blue-400',
    'Solved': 'bg-green-100 text-green-800 border-green-400'
  };

  const checkSessionTimeout = () => {
    if (loginTime) {
      const now = Date.now();
      const sixHours = 1 * 60 * 60 * 1000;
      
      if (now - loginTime > sixHours) {
        handleLogout();
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
      }
    }
  };

  const getNotifications = () => {
    if (!currentUser) return [];
    
    const member = teamMembers.find(m => m.username === currentUser.username);
    const assignedName = member ? member.name : currentUser.full_name;
    
    return tickets.filter(t => 
      t.assigned_to === assignedName && 
      (t.status === 'Pending' || t.status === 'In Progress')
    );
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const utcYear = date.getUTCFullYear();
    const utcMonth = date.getUTCMonth();
    const utcDate = date.getUTCDate();
    const utcHours = date.getUTCHours();
    const utcMinutes = date.getUTCMinutes();
    const utcSeconds = date.getUTCSeconds();
    
    const jakartaDate = new Date(Date.UTC(utcYear, utcMonth, utcDate, utcHours + 7, utcMinutes, utcSeconds));
    
    const day = String(jakartaDate.getUTCDate()).padStart(2, '0');
    const month = String(jakartaDate.getUTCMonth() + 1).padStart(2, '0');
    const year = jakartaDate.getUTCFullYear();
    const hours = String(jakartaDate.getUTCHours()).padStart(2, '0');
    const minutes = String(jakartaDate.getUTCMinutes()).padStart(2, '0');
    const seconds = String(jakartaDate.getUTCSeconds()).padStart(2, '0');
    
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
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

      const now = Date.now();
      setCurrentUser(data);
      setIsLoggedIn(true);
      setLoginTime(now);
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());
    } catch (err) {
      alert('Login gagal!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    setLoginTime(null);
    setSelectedTicket(null);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
  };

  const fetchGuestMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('guest_mappings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuestMappings(data || []);
    } catch (err: any) {
      console.error('Error fetching guest mappings:', err);
    }
  };

  const fetchData = async () => {
    try {
      const [ticketsData, membersData, usersData] = await Promise.all([
        supabase.from('tickets').select('*, activity_logs(*)').order('created_at', { ascending: false }),
        supabase.from('team_members').select('*').order('name'),
        supabase.from('users').select('id, username, full_name, role')
      ]);

      if (ticketsData.data) {
        if (currentUser?.role === 'guest') {
          const { data: mappings } = await supabase
            .from('guest_mappings')
            .select('project_name')
            .eq('guest_username', currentUser.username);

          if (mappings && mappings.length > 0) {
            const allowedProjectNames = mappings.map((m: GuestMapping) => m.project_name);
            const filteredTickets = ticketsData.data.filter((ticket: Ticket) => 
              allowedProjectNames.includes(ticket.project_name)
            );
            setTickets(filteredTickets);
            
            if (selectedTicket && !allowedProjectNames.includes(selectedTicket.project_name)) {
              setSelectedTicket(null);
            }
          } else {
            setTickets([]);
            setSelectedTicket(null);
          }
        } else {
          setTickets(ticketsData.data);
        }
      }
      
      if (membersData.data) setTeamMembers(membersData.data);
      if (usersData.data) setUsers(usersData.data);
      
      setLoading(false);
    } catch (err: any) {
      console.error('Error:', err);
      setLoading(false);
    }
  };

  const createTicket = async () => {
    if (!newTicket.project_name || !newTicket.issue_case || !newTicket.assigned_to) {
      alert('Project name, Issue case, dan Assigned to harus diisi!');
      return;
    }

    const validStatuses = ['In Progress', 'Pending', 'Solved'];
    if (!validStatuses.includes(newTicket.status)) {
      alert('Status tidak valid! Gunakan: Pending, In Progress, atau Solved');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Menyimpan ticket baru...');
      
      const ticketData = {
        project_name: newTicket.project_name,
        customer_phone: newTicket.customer_phone || null,
        sales_name: newTicket.sales_name || null,
        issue_case: newTicket.issue_case,
        description: newTicket.description || null,
        assigned_to: newTicket.assigned_to,
        date: newTicket.date,
        status: newTicket.status,
        created_by: currentUser?.username || null
      };

      const { error } = await supabase.from('tickets').insert([ticketData]);
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setNewTicket({
        project_name: '',
        customer_phone: '',
        sales_name: '',
        issue_case: '',
        description: '',
        assigned_to: '',
        date: new Date().toISOString().split('T')[0],
        status: 'In Progress'
      });
      setShowNewTicket(false);
      
      await fetchData();
      
      setLoadingMessage('✅ Ticket berhasil disimpan!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
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

    const validStatuses = ['In Progress', 'Pending', 'Solved'];
    if (!validStatuses.includes(newActivity.new_status)) {
      alert('Status tidak valid! Gunakan: Pending, In Progress, atau Solved');
      return;
    }

    try {
      setUploading(true);
      setShowLoadingPopup(true);
      setLoadingMessage('Mengupdate status ticket...');
      
      let fileUrl = '';
      let fileName = '';

      if (newActivity.file) {
        setLoadingMessage('Mengupload file...');
        const result = await uploadFile(newActivity.file);
        fileUrl = result.url;
        fileName = result.name;
      }

      await supabase.from('activity_logs').insert([{
        ticket_id: selectedTicket.id,
        handler_name: newActivity.handler_name,
        handler_username: currentUser?.username,
        action_taken: newActivity.action_taken || null,
        notes: newActivity.notes,
        new_status: newActivity.new_status,
        file_url: fileUrl || null,
        file_name: fileName || null
      }]);

      await supabase.from('tickets')
        .update({ status: newActivity.new_status })
        .eq('id', selectedTicket.id);

      setNewActivity({
        handler_name: newActivity.handler_name,
        action_taken: '',
        notes: '',
        new_status: 'Pending',
        file: null
      });
      
      await fetchData();
      
      setLoadingMessage('✅ Status berhasil diupdate!');
      setTimeout(() => {
        setShowLoadingPopup(false);
        setUploading(false);
      }, 1500);
    } catch (err: any) {
      setShowLoadingPopup(false);
      setUploading(false);
      alert('Error: ' + err.message);
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
        role: newUser.role
      }]);

      if (newUser.team_member) {
        await supabase.from('team_members')
          .update({ username: newUser.username })
          .eq('name', newUser.team_member);
      }

      setNewUser({ username: '', password: '', full_name: '', team_member: '', role: 'team' });
      await fetchData();
      alert('User berhasil dibuat!');
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const addGuestMapping = async () => {
    if (!newMapping.guestUsername || !newMapping.projectName) {
      alert('Semua field harus diisi!');
      return;
    }

    const guestUser = users.find(u => u.username === newMapping.guestUsername && u.role === 'guest');
    if (!guestUser) {
      alert('Username guest tidak ditemukan atau bukan role guest!');
      return;
    }

    const projectExists = tickets.some(t => t.project_name === newMapping.projectName);
    if (!projectExists) {
      alert('Nama project tidak ditemukan!');
      return;
    }

    try {
      setUploading(true);
      const { error } = await supabase.from('guest_mappings').insert([{
        guest_username: newMapping.guestUsername,
        project_name: newMapping.projectName
      }]);

      if (error) throw error;

      setNewMapping({ guestUsername: '', projectName: '' });
      await fetchGuestMappings();
      setUploading(false);
      alert('Mapping guest berhasil ditambahkan!');
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
    }
  };

  const deleteGuestMapping = async (mappingId: string) => {
    try {
      setUploading(true);
      const { error } = await supabase
        .from('guest_mappings')
        .delete()
        .eq('id', mappingId);

      if (error) throw error;

      await fetchGuestMappings();
      setUploading(false);
      alert('Mapping guest berhasil dihapus!');
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploading(false);
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
      const { data: userData } = await supabase
        .from('users')
        .select('password')
        .eq('id', currentUser!.id)
        .single();

      if (!userData || userData.password !== changePassword.current) {
        alert('Password lama salah!');
        return;
      }

      await supabase.from('users')
        .update({ password: changePassword.new })
        .eq('id', currentUser!.id);

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
            <tr><th>Phone</th><td>${ticket.customer_phone || '-'}</td></tr>
            <tr><th>Sales</th><td>${ticket.sales_name || '-'}</td></tr>
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
    const processing = tickets.filter(t => t.status === 'In Progress').length;
    const pending = tickets.filter(t => t.status === 'Pending').length;
    const solved = tickets.filter(t => t.status === 'Solved').length;
    
    return {
      total, processing, pending, solved,
      statusData: [
        { name: 'In Progress', value: processing, color: '#60A5FA' },
        { name: 'Pending', value: pending, color: '#FCD34D' },
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

  const uniqueProjectNames = useMemo(() => {
    const names = tickets.map(t => t.project_name);
    return Array.from(new Set(names)).sort();
  }, [tickets]);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    const savedTime = localStorage.getItem('loginTime');
    
    if (saved && savedTime) {
      const user = JSON.parse(saved);
      const time = parseInt(savedTime);
      const now = Date.now();
      const sixHours = 6 * 60 * 60 * 1000;
      
      if (now - time > sixHours) {
        handleLogout();
        alert('Sesi Anda telah berakhir. Silakan login kembali.');
      } else {
        setCurrentUser(user);
        setIsLoggedIn(true);
        setLoginTime(time);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (currentUser && teamMembers.length > 0) {
      const member = teamMembers.find(m => m.username === currentUser.username);
      if (member) {
        setNewActivity(prev => ({ ...prev, handler_name: member.name }));
      } else {
        setNewActivity(prev => ({ ...prev, handler_name: currentUser.full_name }));
      }
    }
  }, [currentUser, teamMembers]);

  useEffect(() => {
    if (isLoggedIn && tickets.length > 0) {
      const notifs = getNotifications();
      setNotifications(notifs);
      
      if (notifs.length > 0 && !showNotificationPopup) {
        setShowNotificationPopup(true);
      }
    }
  }, [tickets, isLoggedIn, currentUser]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkSessionTimeout();
    }, 60000);

    return () => clearInterval(interval);
  }, [loginTime]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchGuestMappings();
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  const canCreateTicket = currentUser?.role !== 'guest';
  const canUpdateTicket = currentUser?.role !== 'guest';
  const canAccessAccountSettings = currentUser?.role === 'admin';

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
          <p className="text-center text-gray-700 font-bold mb-6">Reminder Troubleshooting<br/>PTS IVP</p>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border-3 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border-3 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200"
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
    <div className="min-h-screen p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showLoadingPopup && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border-4 border-blue-500 animate-scale-in">
            <div className="flex flex-col items-center">
              {loadingMessage.includes('✅') ? (
                <div className="text-6xl mb-4 animate-bounce">✅</div>
              ) : (
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
              )}
              <p className="text-xl font-bold text-gray-800 text-center">{loadingMessage}</p>
            </div>
          </div>
        </div>
      )}

      {uploading && !showLoadingPopup && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
          <div className="h-full bg-gradient-to-r from-transparent via-white to-transparent animate-pulse"></div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {showNotifications && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden animate-scale-in">
              <div className="p-6 border-b-2 border-gray-200 bg-gradient-to-r from-yellow-400 to-yellow-500">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🔔</span>
                    <div>
                      <h3 className="text-xl font-bold text-white">Notifikasi Ticket</h3>
                      {notifications.length > 0 && (
                        <p className="text-sm text-white/90">
                          {notifications.length} ticket perlu ditangani
                        </p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNotifications(false)}
                    className="text-white hover:bg-white/20 rounded-lg p-2 font-bold transition-all"
                  >
                    ✕
                  </button>
                </div>
              </div>
              
              {notifications.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <div className="text-6xl mb-4">✅</div>
                  <p className="text-lg font-medium">Tidak ada notifikasi</p>
                  <p className="text-sm mt-2">Semua ticket sudah ditangani</p>
                </div>
              ) : (
                <div className="max-h-[calc(80vh-120px)] overflow-y-auto p-4">
                  <div className="space-y-3">
                    {notifications.map(ticket => (
                      <div
                        key={ticket.id}
                        onClick={() => {
                          setSelectedTicket(ticket);
                          setShowNotifications(false);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-bold text-lg text-gray-800">{ticket.project_name}</p>
                            <p className="text-sm text-gray-600 mt-1">{ticket.issue_case}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[ticket.status]} ml-3`}>
                            {ticket.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-gray-300">
                          <span className="text-xs text-gray-500">
                            📅 {new Date(ticket.created_at).toLocaleDateString('id-ID')}
                          </span>
                          <span className="text-sm text-blue-600 font-semibold">Klik untuk lihat detail →</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <button
                  onClick={() => setShowNotifications(false)}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold transition-all"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {showNotificationPopup && notifications.length > 0 && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-4 border-yellow-500 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-4xl">🔔</span>
                <h3 className="text-xl font-bold text-gray-800">Notifikasi Ticket</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Anda memiliki <strong className="text-red-600">{notifications.length}</strong> ticket yang perlu ditangani:
              </p>
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {notifications.map(ticket => (
                  <div key={ticket.id} className={`p-3 rounded-lg border-2 ${statusColors[ticket.status]}`}>
                    <p className="font-bold text-sm">{ticket.project_name}</p>
                    <p className="text-xs">{ticket.issue_case}</p>
                    <span className="text-xs font-semibold">{ticket.status}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setShowNotificationPopup(false)}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-1">
                📋Reminder Troubleshooting
              </h1>
              <p className="text-gray-800 font-bold text-lg">PTS IVP</p>
              <p className="text-sm text-gray-600">
                Welcome: <span className="font-bold text-red-600">{currentUser?.full_name}</span>
                <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">
                  {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'team' ? 'Team' : 'Guest'}
                </span>
              </p>
            </div>
            <div className="flex gap-3 flex-wrap items-center">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative bg-gradient-to-r from-yellow-500 to-yellow-600 text-white px-4 py-3 rounded-xl hover:from-yellow-600 hover:to-yellow-700 font-bold shadow-lg transition-all"
                title="Notifikasi"
              >
                🔔
                {notifications.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {notifications.length}
                  </span>
                )}
              </button>

              {canAccessAccountSettings && (
                <button 
                  onClick={() => {
                    setShowAccountSettings(!showAccountSettings);
                    setShowGuestMapping(false);
                    setShowDashboard(false);
                    setShowNewTicket(false);
                  }} 
                  className="btn-secondary"
                >
                  ⚙️ Account
                </button>
              )}
              {canAccessAccountSettings && (
                <button 
                  onClick={() => {
                    setShowGuestMapping(!showGuestMapping);
                    setShowAccountSettings(false);
                    setShowDashboard(false);
                    setShowNewTicket(false);
                  }} 
                  className="btn-teal"
                >
                  👥 Guest Mapping
                </button>
              )}
              {currentUser?.role !== 'guest' && (
                <button 
                  onClick={() => {
                    setShowDashboard(!showDashboard);
                    setShowAccountSettings(false);
                    setShowGuestMapping(false);
                    setShowNewTicket(false);
                  }} 
                  className="btn-purple"
                >
                  📊 Dashboard
                </button>
              )}
              {canCreateTicket && (
                <button 
                  onClick={() => {
                    setShowNewTicket(!showNewTicket);
                    setShowAccountSettings(false);
                    setShowGuestMapping(false);
                    setShowDashboard(false);
                  }} 
                  className="btn-primary"
                >
                  + Ticket Baru
                </button>
              )}
              <button onClick={handleLogout} className="btn-danger">
                🚶Logout
              </button>
            </div>
          </div>
        </div>

        {showAccountSettings && canAccessAccountSettings && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-gray-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-4">⚙️ Account Settings</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-xl p-5 border-3 border-blue-300">
                <h3 className="font-bold mb-3">Buat Account Team</h3>
                <div className="space-y-3">
                  <input type="text" placeholder="Username" value={newUser.username} onChange={(e) => setNewUser({...newUser, username: e.target.value})} className="input-field" />
                  <input type="password" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({...newUser, password: e.target.value})} className="input-field" />
                  <input type="text" placeholder="Nama Lengkap" value={newUser.full_name} onChange={(e) => setNewUser({...newUser, full_name: e.target.value})} className="input-field" />
                  <select value={newUser.role} onChange={(e) => setNewUser({...newUser, role: e.target.value})} className="input-field">
                    <option value="admin">Administrator</option>
                    <option value="team">Team</option>
                    <option value="guest">Guest</option>
                  </select>
                  <select value={newUser.team_member} onChange={(e) => setNewUser({...newUser, team_member: e.target.value})} className="input-field">
                    <option value="">Pilih Team Member (Opsional)</option>
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
                    🔒 Ubah Password
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
                    <span className={`text-xs px-2 py-1 rounded ${
                      u.role === 'admin' ? 'bg-red-100 text-red-800' : 
                      u.role === 'team' ? 'bg-blue-100 text-blue-800' : 
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {u.role === 'admin' ? 'Admin' : u.role === 'team' ? 'Team' : 'Guest'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {showGuestMapping && canAccessAccountSettings && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-teal-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-4 text-teal-800">👥 Guest Mapping - Akses Project</h2>
            <p className="text-gray-600 mb-6">Kelola akses guest user ke project tertentu. Satu guest bisa memiliki akses ke beberapa project.</p>
            
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl p-6 border-3 border-teal-300 mb-6">
              <h3 className="font-bold mb-4 text-lg text-teal-900">➕ Mapping Baru</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Username Guest</label>
                  <select 
                    value={newMapping.guestUsername} 
                    onChange={(e) => setNewMapping({...newMapping, guestUsername: e.target.value})} 
                    className="input-field"
                  >
                    <option value="">Pilih Guest User</option>
                    {users.filter(u => u.role === 'guest').map(u => (
                      <option key={u.id} value={u.username}>{u.username} - {u.full_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-gray-700">Nama Project</label>
                  <select 
                    value={newMapping.projectName} 
                    onChange={(e) => setNewMapping({...newMapping, projectName: e.target.value})} 
                    className="input-field"
                  >
                    <option value="">Pilih Nama Project</option>
                    {uniqueProjectNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button onClick={addGuestMapping} disabled={uploading} className="w-full bg-gradient-to-r from-teal-600 to-teal-800 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-900 font-bold shadow-xl transition-all disabled:opacity-50">
                {uploading ? '⏳ Memproses...' : '➕ Tambah Mapping'}
              </button>
            </div>

            <div className="bg-white rounded-xl p-6 border-3 border-gray-300 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-gray-800">📋 Daftar Map</h3>
                <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full text-sm font-bold">
                  {guestMappings.length} mapping
                </span>
              </div>
              
              {guestMappings.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📭</div>
                  <p className="text-gray-500 font-medium">Belum ada mapping</p>
                  <p className="text-sm text-gray-400 mt-2">Tambahkan mapping untuk memberikan akses guest ke project</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {guestMappings.map(mapping => (
                    <div key={mapping.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border-2 border-teal-200 hover:shadow-md transition-all">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-lg text-sm font-bold">
                            👤 {mapping.guest_username}
                          </span>
                          <span className="text-gray-400 font-bold">→</span>
                          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-lg text-sm font-bold">
                            🏢 {mapping.project_name}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Dibuat: {new Date(mapping.created_at).toLocaleDateString('id-ID', { 
                            day: '2-digit', 
                            month: 'long', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteGuestMapping(mapping.id)}
                        disabled={uploading}
                        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-bold transition-all disabled:opacity-50 ml-4 hover:scale-105"
                      >
                        🗑️ Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
              <h4 className="font-bold text-sm text-blue-900 mb-2">ℹ️ Informasi</h4>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>Guest user hanya bisa melihat ticket dari project yang sudah dimapping</li>
                <li>Satu guest bisa memiliki akses ke beberapa project berbeda</li>
                <li>Guest tidak bisa membuat atau mengupdate ticket</li>
                <li>Hapus mapping untuk mencabut akses guest ke project tertentu</li>
              </ul>
            </div>
          </div>
        )}

        {showDashboard && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-purple-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-6">📊 Dashboard</h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="stat-card bg-gradient-to-br from-blue-500 to-blue-700">
                <p className="text-sm opacity-90">Total</p>
                <p className="text-4xl font-bold">{stats.total}</p>
              </div>
              <div className="stat-card bg-gradient-to-br from-blue-400 to-blue-600">
                <p className="text-sm opacity-90">In Progress</p>
                <p className="text-4xl font-bold">{stats.processing}</p>
              </div>
              <div className="stat-card bg-gradient-to-br from-yellow-500 to-yellow-700">
                <p className="text-sm opacity-90">Pending</p>
                <p className="text-4xl font-bold">{stats.pending}</p>
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

        <div className="bg-white/85 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-blue-500">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold mb-2">🔍 Pencarian</label>
              <input type="text" value={searchProject} onChange={(e) => setSearchProject(e.target.value)} placeholder=" ... " className="input-field" />
            </div>
            <div className="md:w-64">
              <label className="block text-sm font-bold mb-2">📋 Filter Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="input-field">
                <option value="All">Semua Status</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Solved">Solved</option>
              </select>
            </div>
          </div>
        </div>

        {showNewTicket && canCreateTicket && (
          <div className="bg-white/75 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-3 border-green-500 animate-slide-down">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">📝 Buat Ticket Baru</h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">📌 Nama Project *</label>
                  <input 
                    type="text" 
                    value={newTicket.project_name} 
                    onChange={(e) => setNewTicket({...newTicket, project_name: e.target.value})} 
                    placeholder="Contoh: Project BCA Cibitung" 
                    className="w-full border-2 border-blue-400 rounded-lg px-4 py-2.5 focus:border-blue-600 focus:ring-2 focus:ring-blue-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">⚠️ Issue Case *</label>
                  <input 
                    type="text" 
                    value={newTicket.issue_case} 
                    onChange={(e) => setNewTicket({...newTicket, issue_case: e.target.value})} 
                    placeholder="Contoh: Videowall Mati" 
                    className="w-full border-2 border-red-400 rounded-lg px-4 py-2.5 focus:border-red-600 focus:ring-2 focus:ring-red-200 transition-all font-medium bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">👤 Nama Sales</label>
                  <input 
                    type="text" 
                    value={newTicket.sales_name} 
                    onChange={(e) => setNewTicket({...newTicket, sales_name: e.target.value})} 
                    placeholder="Nama sales yang handle" 
                    className="w-full border-2 border-purple-400 rounded-lg px-4 py-2.5 focus:border-purple-600 focus:ring-2 focus:ring-purple-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">📱 Nama & Telepon User</label>
                  <input 
                    type="text" 
                    value={newTicket.customer_phone} 
                    onChange={(e) => setNewTicket({...newTicket, customer_phone: e.target.value})} 
                    placeholder="Adi - 08xx-xxxx-xxxx" 
                    className="w-full border-2 border-green-400 rounded-lg px-4 py-2.5 focus:border-green-600 focus:ring-2 focus:ring-green-200 transition-all font-medium bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">📅 Tanggal</label>
                  <input 
                    type="date" 
                    value={newTicket.date} 
                    onChange={(e) => setNewTicket({...newTicket, date: e.target.value})} 
                    className="w-full border-2 border-indigo-400 rounded-lg px-4 py-2.5 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-200 transition-all font-medium bg-white"
                  />
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">🏷️ Status</label>
                  <select 
                    value={newTicket.status} 
                    onChange={(e) => setNewTicket({...newTicket, status: e.target.value})} 
                    className="w-full border-2 border-yellow-400 rounded-lg px-4 py-2.5 focus:border-yellow-600 focus:ring-2 focus:ring-yellow-200 transition-all font-medium bg-white"
                  >
                    <option value="In Progress">In Progress</option>
                    <option value="Pending">Pending</option>
                    <option value="Solved">Solved</option>
                  </select>
                </div>
                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4">
                  <label className="block text-sm font-bold text-gray-800 mb-2">👨‍💼 Assign ke *</label>
                  <select 
                    value={newTicket.assigned_to} 
                    onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})} 
                    className="w-full border-2 border-orange-400 rounded-lg px-4 py-2.5 focus:border-orange-600 focus:ring-2 focus:ring-orange-200 transition-all font-medium bg-white"
                  >
                    <option value="">Pilih Handler</option>
                    {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300">
                <label className="block text-sm font-bold text-gray-800 mb-2">📝 Deskripsi Detail</label>
                <textarea 
                  value={newTicket.description} 
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} 
                  placeholder="Jelaskan detail masalah yang terjadi..." 
                  className="w-full border-2 border-gray-400 rounded-lg px-4 py-2.5 focus:border-gray-600 focus:ring-2 focus:ring-gray-200 transition-all font-medium bg-white resize-none" 
                  rows={4}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <button onClick={createTicket} disabled={uploading} className="bg-gradient-to-r from-green-600 to-green-800 text-white px-6 py-3 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all hover:scale-105">
                {uploading ? '⏳ Menyimpan...' : '💾 Simpan Ticket'}
              </button>
              <button onClick={() => setShowNewTicket(false)} className="bg-gradient-to-r from-gray-500 to-gray-700 text-white px-6 py-3 rounded-xl hover:from-gray-600 hover:to-gray-800 font-bold shadow-xl transition-all hover:scale-105">
                ✖ Batal
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="bg-blue-600/80 backdrop-blur-md rounded-2xl shadow-xl p-4 border-3 border-blue-700">
              <h2 className="text-2xl font-bold text-white">📋 Daftar Ticket ({filteredTickets.length})</h2>
            </div>
            {filteredTickets.length === 0 ? (
              <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl p-8 text-center border-3 border-gray-400">
                <p className="text-gray-600 font-medium">
                  {searchProject || filterStatus !== 'All' 
                    ? 'Tidak ada ticket yang sesuai dengan pencarian.' 
                    : 'Belum ada ticket. Buat ticket pertama Anda!'}
                </p>
              </div>
            ) : (
              filteredTickets.map((ticket, idx) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`bg-blue-50/60 backdrop-blur-sm rounded-2xl shadow-xl p-5 cursor-pointer hover:shadow-2xl transition-all border-3 transform hover:scale-102 ${
                    selectedTicket?.id === ticket.id ? 'border-red-600 ring-8 ring-red-300' : 'border-blue-400'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 mb-2">🏢 {ticket.project_name}</h3>
                      <div className="space-y-1 text-sm">
                        <div className="flex">
                          <span className="text-gray-500 font-medium w-32">Issue Case</span>
                          <span className="text-gray-700 font-medium flex-1">: {ticket.issue_case}</span>
                        </div>
                        {ticket.customer_phone && (
                          <div className="flex">
                            <span className="text-gray-500 font-medium w-32">Telepon Customer</span>
                            <span className="text-gray-700 flex-1">: {ticket.customer_phone}</span>
                          </div>
                        )}
                        {ticket.sales_name && (
                          <div className="flex">
                            <span className="text-gray-500 font-medium w-32">Sales Project</span>
                            <span className="text-gray-700 flex-1">: {ticket.sales_name}</span>
                          </div>
                        )}
                        <div className="flex">
                          <span className="text-gray-500 font-medium w-32">Tanggal</span>
                          <span className="text-gray-700 flex-1">: {new Date(ticket.date).toLocaleDateString('id-ID')}</span>
                        </div>
                        <div className="flex">
                          <span className="text-gray-500 font-medium w-32">Assigned to</span>
                          <span className="text-gray-700 flex-1">: {ticket.assigned_to}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[ticket.status]} ml-3`}>
                      {ticket.status}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-gray-600 font-medium mt-3 pt-3 border-t border-gray-300">
                    <span>💬 {ticket.activity_logs?.length || 0} aktivitas</span>
                    {ticket.activity_logs?.some(a => a.file_url) && <span className="text-green-600">📄 Ada Report</span>}
                  </div>
                </div>
              ))
            )}
          </div>

          {selectedTicket && (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-2xl p-6 border border-gray-200 sticky top-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">🏢 {selectedTicket.project_name}</h2>
                  <div className="space-y-2 text-sm">
                    <div className="flex">
                      <span className="text-gray-600 font-semibold w-40">Issue Case</span>
                      <span className="text-gray-800 font-medium flex-1">: {selectedTicket.issue_case}</span>
                    </div>
                    {selectedTicket.customer_phone && (
                      <div className="flex">
                        <span className="text-gray-600 font-semibold w-40">Telepon Customer</span>
                        <span className="text-gray-800 flex-1">: {selectedTicket.customer_phone}</span>
                      </div>
                    )}
                    {selectedTicket.sales_name && (
                      <div className="flex">
                        <span className="text-gray-600 font-semibold w-40">Sales Project</span>
                        <span className="text-gray-800 flex-1">: {selectedTicket.sales_name}</span>
                      </div>
                    )}
                    <div className="flex">
                      <span className="text-gray-600 font-semibold w-40">Assigned to</span>
                      <span className="text-gray-800 flex-1">: {selectedTicket.assigned_to}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 font-semibold w-40">Tanggal</span>
                      <span className="text-gray-800 flex-1">: {new Date(selectedTicket.date).toLocaleDateString('id-ID')}</span>
                    </div>
                    <div className="flex">
                      <span className="text-gray-600 font-semibold w-40">Status</span>
                      <span className="flex-1">
                        : <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${statusColors[selectedTicket.status]} ml-2`}>
                          {selectedTicket.status}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => exportToPDF(selectedTicket)} className="btn-export ml-4">
                  📄 Export PDF
                </button>
              </div>

              {selectedTicket.description && (
                <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-200">
                  <p className="text-sm font-semibold text-gray-600 mb-1">Deskripsi:</p>
                  <p className="text-sm text-gray-800">{selectedTicket.description}</p>
                </div>
              )}

              <div className="border-t-2 border-gray-200 pt-6 mb-6">
                <h3 className="font-bold text-lg mb-4">📝 Activity Log</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedTicket.activity_logs && selectedTicket.activity_logs.length > 0 ? (
                    selectedTicket.activity_logs.map((log) => (
                      <div key={log.id} className="activity-log">
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
                          <div className="bg-blue-50 border-l-4 border-blue-500 rounded px-3 py-2 mb-2">
                            <p className="text-sm font-bold text-blue-900">🔧 Action :</p>
                            <p className="text-sm text-gray-900">{log.action_taken}</p>
                          </div>
                        )}
                        <p className="text-sm font-bold text-blue-900">Notes :</p>
                        <p className="text-sm text-gray-900">{log.notes}</p>
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

              {canUpdateTicket && (
                <div className="border-t-2 border-gray-200 pt-6 mt-6">
                  <h3 className="font-bold text-xl mb-6 text-gray-800">➕ Update Status</h3>
                  
                  <div className="space-y-4">
                    <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">👤 Handler (Otomatis dari User Login)</label>
                      <input 
                        type="text" 
                        value={newActivity.handler_name} 
                        disabled 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 bg-gray-100 cursor-not-allowed text-gray-700 font-semibold"
                        title="Handler otomatis sesuai user yang login"
                      />
                      <p className="text-xs text-gray-500 italic mt-2">* Handler tidak dapat diubah, otomatis dari akun yang login</p>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">🏷️ Status Baru *</label>
                      <select 
                        value={newActivity.new_status} 
                        onChange={(e) => setNewActivity({...newActivity, new_status: e.target.value})} 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                      >
                        <option value="In Progress">In Progress</option>
                        <option value="Pending">Pending</option>
                        <option value="Solved">Solved</option>
                      </select>
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">🔧 Action yang Dilakukan</label>
                      <input 
                        type="text" 
                        value={newActivity.action_taken} 
                        onChange={(e) => setNewActivity({...newActivity, action_taken: e.target.value})} 
                        placeholder="Contoh: Cek kabel HDMI dan power, restart system" 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white"
                      />
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">📝 Notes Detail *</label>
                      <textarea 
                        value={newActivity.notes} 
                        onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})} 
                        placeholder="Jelaskan detail ....." 
                        className="w-full border border-gray-300 rounded-lg px-4 py-2.5 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all bg-white resize-none"
                        rows={4}
                      />
                    </div>
                    
                    <div className="bg-white rounded-xl p-4 border border-gray-300 shadow-sm">
                      <label className="block text-sm font-semibold text-gray-700 mb-2">📎 Upload File Report (PDF)</label>
                      <input 
                        type="file" 
                        accept=".pdf" 
                        onChange={(e) => setNewActivity({...newActivity, file: e.target.files?.[0] || null})} 
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all"
                      />
                      {newActivity.file && (
                        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-blue-700 font-bold">✓ File terpilih:</span>
                            <span className="text-gray-800 font-semibold">{newActivity.file.name}</span>
                            <span className="text-gray-600">({(newActivity.file.size / 1024).toFixed(2)} KB)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button 
                      onClick={addActivity} 
                      disabled={uploading || !newActivity.notes.trim()} 
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3.5 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105"
                    >
                      {uploading ? '⏳ Sedang Upload & Simpan...' : '💾 Update Status & Simpan'}
                    </button>
                  </div>
                </div>
              )}

              {!canUpdateTicket && (
                <div className="border-t-2 border-gray-300 pt-6 mt-6 text-center">
                  <p className="text-gray-500 italic">Anda tidak memiliki akses untuk mengupdate ticket (Guest mode)</p>
                </div>
              )}
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
        .btn-teal {
          @apply bg-gradient-to-r from-teal-600 to-teal-800 text-white px-5 py-3 rounded-xl hover:from-teal-700 hover:to-teal-900 font-bold shadow-lg transition-all;
        }
        .btn-purple {
          @apply bg-gradient-to-r from-purple-600 to-purple-800 text-white px-5 py-3 rounded-xl hover:from-purple-700 hover:to-purple-900 font-bold shadow-lg transition-all;
        }
        .btn-danger {
          @apply bg-gradient-to-r from-red-500 to-red-700 text-white px-5 py-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-lg transition-all;
        }
        .btn-export {
          @apply bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-bold text-sm transition-all;
        }
        .activity-log {
          @apply bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 shadow-md;
        }
        .stat-card {
          @apply rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform;
        }
        .chart-container {
          @apply bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border-3 border-gray-300 shadow-xl;
        }
        .file-download {
          @apply inline-block bg-blue-100 text-blue-800 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-200 transition-all;
        }
        .input-field {
          @apply w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all font-medium bg-white shadow-sm;
        }
        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes slide-down {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-scale-in {
          animation: scale-in 0.3s ease-out;
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
