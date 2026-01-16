'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
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
  face_photo_url: string;
  shift_time: string;
  recorded_at: string;
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
  issue_case: string;
  description: string;
  assigned_to: string;
  sales_name: string;
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
  const [showSettings, setShowSettings] = useState(false);
  const [capturingFace, setCapturingFace] = useState(false);
  
  const [searchProject, setSearchProject] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [newTicket, setNewTicket] = useState({
    project_name: '',
    issue_case: '',
    description: '',
    assigned_to: 'Dhany',
    sales_name: '',
    date: new Date().toISOString().split('T')[0],
    status: 'Pending'
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: 'Dhany',
    action_taken: '',
    notes: '',
    status: 'Pending',
    photo: null as File | null,
    facePhoto: null as string | null
  });

  const [newMember, setNewMember] = useState({
    name: '',
    role: 'Support Engineer'
  });

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

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCapturingFace(true);
    } catch (err) {
      alert('Tidak dapat mengakses kamera. Pastikan izin kamera diaktifkan.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCapturingFace(false);
  };

  const captureFace = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const faceDataUrl = canvasRef.current.toDataURL('image/jpeg');
        setNewActivity({...newActivity, facePhoto: faceDataUrl});
        stopCamera();
      }
    }
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
          issue_case: newTicket.issue_case,
          description: newTicket.description,
          assigned_to: newTicket.assigned_to,
          sales_name: newTicket.sales_name,
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
        issue_case: '', 
        description: '', 
        assigned_to: 'Dhany',
        sales_name: '',
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

  const uploadFacePhoto = async (dataUrl: string): Promise<string> => {
    const blob = await (await fetch(dataUrl)).blob();
    const fileName = `face_${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('ticket-photos')
      .upload(filePath, blob);

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

    if (!newActivity.facePhoto) {
      alert('Foto wajah harus diambil untuk verifikasi!');
      return;
    }

    try {
      setUploadingPhoto(true);
      let photoUrl = '';
      let facePhotoUrl = '';

      if (newActivity.photo) {
        photoUrl = await uploadPhoto(newActivity.photo);
      }

      if (newActivity.facePhoto) {
        facePhotoUrl = await uploadFacePhoto(newActivity.facePhoto);
      }

      const currentTime = new Date().toISOString();

      const { error } = await supabase.from('activity_logs').insert([
        {
          ticket_id: selectedTicket.id,
          handler_name: newActivity.handler_name,
          action_taken: newActivity.action_taken,
          notes: newActivity.notes,
          shift_time: currentTime,
          recorded_at: currentTime,
          photo_url: photoUrl,
          face_photo_url: facePhotoUrl
        }
      ]);

      if (error) throw error;

      // Update status ticket
      await supabase
        .from('tickets')
        .update({ status: newActivity.status, updated_at: currentTime })
        .eq('id', selectedTicket.id);

      const lastHandler = selectedTicket.ticket_handlers?.[selectedTicket.ticket_handlers.length - 1];
      if (!lastHandler || lastHandler.handler_name !== newActivity.handler_name) {
        if (lastHandler && !lastHandler.ended_at) {
          await supabase
            .from('ticket_handlers')
            .update({ ended_at: currentTime })
            .eq('id', lastHandler.id);
        }

        await supabase.from('ticket_handlers').insert([
          {
            ticket_id: selectedTicket.id,
            handler_name: newActivity.handler_name,
            shift_notes: `Update at: ${new Date(currentTime).toLocaleString('id-ID')}`
          }
        ]);
      }

      setNewActivity({ 
        handler_name: 'Dhany', 
        action_taken: '', 
        notes: '', 
        status: 'Pending',
        photo: null,
        facePhoto: null
      });
      setUploadingPhoto(false);
      fetchTickets();
    } catch (err: any) {
      alert('Error: ' + err.message);
      setUploadingPhoto(false);
    }
  };

  const addTeamMember = async () => {
    if (!newMember.name.trim()) {
      alert('Nama team member harus diisi!');
      return;
    }

    try {
      const photoUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(newMember.name)}&background=EF4444&color=fff&size=128`;
      
      const { error } = await supabase.from('team_members').insert([
        {
          name: newMember.name,
          photo_url: photoUrl,
          role: newMember.role
        }
      ]);

      if (error) throw error;

      setNewMember({ name: '', role: 'Support Engineer' });
      fetchTeamMembers();
      alert('Team member berhasil ditambahkan!');
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
             backgroundImage: 'url(/IVP Background.png)',
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
           backgroundImage: 'url(/IVP Background.png)',
           backgroundSize: 'cover',
           backgroundPosition: 'center',
           backgroundAttachment: 'fixed'
         }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-red-500">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-2">
                🎫 Reminder Troubleshooting Project
              </h1>
              <p className="text-lg font-bold text-red-600 mb-2">PTS IVP</p>
              <p className="text-gray-700 font-medium">
                <span className="font-bold text-red-600">Tim Support:</span> {teamMembers.map(m => m.name).join(', ')}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="bg-gradient-to-r from-gray-600 to-gray-800 text-white px-6 py-3 rounded-xl hover:from-gray-700 hover:to-gray-900 shadow-lg transition-all font-bold"
              >
                ⚙️ Pengaturan
              </button>
              <button
                onClick={() => setShowDashboard(!showDashboard)}
                className="bg-gradient-to-r from-purple-600 to-purple-800 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-purple-900 shadow-lg transition-all font-bold"
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setShowNewTicket(!showNewTicket)}
                className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-xl hover:from-red-700 hover:to-red-900 shadow-lg transition-all font-bold"
              >
                + Ticket Baru
              </button>
            </div>
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-gray-500">
            <h2 className="text-2xl font-bold mb-6 text-gray-800">⚙️ Pengaturan Team</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-bold mb-2 text-gray-800">Nama Team Member *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({...newMember, name: e.target.value})}
                  placeholder="Masukkan nama"
                  className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                />
              </div>
              <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-bold mb-2 text-gray-800">Role</label>
                <input
                  type="text"
                  value={newMember.role}
                  onChange={(e) => setNewMember({...newMember, role: e.target.value})}
                  className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                />
              </div>
              <div className="flex items-end border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                <button
                  onClick={addTeamMember}
                  className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white px-6 py-2 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all"
                >
                  ➕ Tambah Member
                </button>
              </div>
            </div>

            <div className="border-t-2 border-gray-300 pt-4">
              <h3 className="font-bold text-gray-800 mb-4">Daftar Team Member:</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {teamMembers.map(member => (
                  <div key={member.id} className="border-2 border-gray-300 rounded-xl p-4 text-center bg-white">
                    <img 
                      src={member.photo_url} 
                      alt={member.name}
                      className="w-20 h-20 rounded-full border-2 border-red-500 shadow-md mx-auto mb-2"
                    />
                    <p className="font-bold text-gray-800">{member.name}</p>
                    <p className="text-xs text-gray-600">{member.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dashboard */}
        {showDashboard && (
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-purple-500">
            <h2 className="text-2xl font-bold mb-6 text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-800">
              📊 Dashboard & Analytics
            </h2>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform">
                <p className="text-sm opacity-90">Total Tickets</p>
                <p className="text-4xl font-bold">{stats.total}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500 to-yellow-700 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform">
                <p className="text-sm opacity-90">Pending</p>
                <p className="text-4xl font-bold">{stats.pending}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform">
                <p className="text-sm opacity-90">Process Action</p>
                <p className="text-4xl font-bold">{stats.processing}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-2xl p-4 text-white shadow-xl transform hover:scale-105 transition-transform">
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
            <div className="flex-1 border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
              <label className="block text-sm font-bold mb-2 text-gray-800">🔍 Cari Project</label>
              <input
                type="text"
                value={searchProject}
                onChange={(e) => setSearchProject(e.target.value)}
                placeholder="Ketik nama project atau issue..."
                className="w-full border-2 border-gray-400 rounded-xl px-4 py-3 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all font-medium"
              />
            </div>
            <div className="md:w-64 border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
              <label className="block text-sm font-bold mb-2 text-gray-800">📋 Filter Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full border-2 border-gray-400 rounded-xl px-4 py-3 focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all font-medium"
              >
                <option value="All">Semua Status</option>
                <option value="Pending">Pending</option>
                <option value="Process Action">Process Action</option>
                <option value="Solved">Solved</option>
              </select>
            </div>
          </div>
          {(searchProject || filterStatus !== 'All') && (
            <div className="mt-4 flex items-center justify-between bg-blue-50 rounded-xl p-4 border-2 border-blue-300">
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
          <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-green-500">
            <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-green-800">
              📝 Buat Ticket Baru
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-bold mb-2 text-gray-800">Nama Project *</label>
                <input
                  type="text"
                  value={newTicket.project_name}
                  onChange={(e) => setNewTicket({...newTicket, project_name: e.target.value})}
                  placeholder="Contoh: Project BCA"
                  className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
              </div>
              <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-bold mb-2 text-gray-800">Nama Sales</label>
                <input
                  type="text"
                  value={newTicket.sales_name}
                  onChange={(e) => setNewTicket({...newTicket, sales_name: e.target.value})}
                  placeholder="Nama sales yang handle"
                  className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
              </div>
              <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-bold mb-2 text-gray-800">Issue Case *</label>
                <input
                  type="text"
                  value={newTicket.issue_case}
                  onChange={(e) => setNewTicket({...newTicket, issue_case: e.target.value})}
                  placeholder="Contoh: Videowall Error"
                  className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
              </div>
              <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                <label className="block text-sm font-bold mb-2 text-gray-800">Tanggal</label>
                <input
                  type="date"
                  value={newTicket.date}
                  onChange={(e) => setNewTicket({...newTicket, date: e.target.value})}
                  className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
                />
		</div>
          <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
            <label className="block text-sm font-bold mb-2 text-gray-800">Status</label>
            <select
              value={newTicket.status}
              onChange={(e) => setNewTicket({...newTicket, status: e.target.value})}
              className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
            >
              <option value="Pending">Pending</option>
              <option value="Process Action">Process Action</option>
              <option value="Solved">Solved</option>
            </select>
          </div>
          <div className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
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
          <div className="md:col-span-2 border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
            <label className="block text-sm font-bold mb-2 text-gray-800">Deskripsi</label>
            <textarea
              value={newTicket.description}
              onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
              placeholder="Detail masalah..."
              className="w-full border-2 border-gray-400 rounded-xl px-4 py-2 h-24 focus:border-green-600 focus:ring-4 focus:ring-green-200 transition-all"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={createTicket}
            className="bg-gradient-to-r from-green-600 to-green-800 text-white px-8 py-3 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all"
          >
            💾 Simpan Ticket
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
          filteredTickets.map((ticket) => {
            const member = getTeamMember(ticket.assigned_to);
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`bg-white/95 backdrop-blur-md rounded-2xl shadow-xl p-5 cursor-pointer hover:shadow-2xl transition-all border-3 transform hover:scale-102 ${
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
                      {ticket.sales_name && (
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          👤 Sales: {ticket.sales_name}
                        </p>
                      )}
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
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 h-fit sticky top-6 border-3 border-red-500">
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
                {selectedTicket.sales_name && (
                  <p className="text-sm text-blue-600 font-medium mt-1">
                    👤 Sales: {selectedTicket.sales_name}
                  </p>
                )}
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
                          Mulai: {new Date(handler.started_at).toLocaleString('id-ID', { 
                            year: 'numeric', 
                            month: '2-digit', 
                            day: '2-digit', 
                            hour: '2-digit', 
                            minute: '2-digit',
                            hour12: false 
                          })}
                        </p>
                        {handler.ended_at && (
                          <p className="text-gray-600 text-xs">
                            Selesai: {new Date(handler.ended_at).toLocaleString('id-ID', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit', 
                              hour: '2-digit', 
                              minute: '2-digit',
                              hour12: false 
                            })}
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
                selectedTicket.activity_logs.map((log) => {
                  const member = getTeamMember(log.handler_name);
                  const timestamp = log.recorded_at || log.created_at;
                  return (
                    <div key={log.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border-2 border-gray-300 shadow-md">
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
                              {new Date(timestamp).toLocaleString('id-ID', { 
                                year: 'numeric', 
                                month: '2-digit', 
                                day: '2-digit', 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: false 
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      {log.action_taken && (
                        <div className="bg-blue-100 border-l-4 border-blue-600 rounded px-3 py-2 mb-2">
                          <p className="text-sm font-semibold text-blue-900">
                            🔧 Action: {log.action_taken}
                          </p>
                        </div>
                      )}
                      
                      <p className="text-sm text-gray-700 mb-2">{log.notes}</p>
                      
                      <div className="flex gap-2 mt-2">
                        {log.face_photo_url && (
                          <div>
                            <p className="text-xs text-gray-600 mb-1">Verifikasi Wajah:</p>
                            <img 
                              src={log.face_photo_url} 
                              alt="Face verification" 
                              className="rounded-xl w-24 h-24 object-cover border-2 border-green-500 cursor-pointer hover:scale-105 transition-transform shadow-lg"
                              onClick={() => window.open(log.face_photo_url, '_blank')}
                            />
                          </div>
                        )}
                        {log.photo_url && (
                          <div className="flex-1">
                            <p className="text-xs text-gray-600 mb-1">Dokumentasi:</p>
                            <img 
                              src={log.photo_url} 
                              alt="Activity photo" 
                              className="rounded-xl max-w-full h-auto border-2 border-gray-400 cursor-pointer hover:scale-105 transition-transform shadow-lg"
                              onClick={() => window.open(log.photo_url, '_blank')}
                            />
                          </div>
                        )}
                      </div>
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
            <h3 className="font-bold text-gray-800 mb-4 text-lg">➕ Update Status & Activity</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
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
                <div className="border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
                  <label className="block text-xs font-bold mb-2 text-gray-800">Status Baru *</label>
                  <select
                    value={newActivity.status}
                    onChange={(e) => setNewActivity({...newActivity, status: e.target.value})}
                    className="w-full border-2 border-gray-400 rounded-xl px-3 py-2 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Process Action">Process Action</option>
                    <option value="Solved">Solved</option>
                  </select>
                </div>
              </div>
              
              <div className="border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
                <label className="block text-xs font-bold mb-2 text-gray-800">Action yang Dilakukan</label>
                <input
                  type="text"
                  value={newActivity.action_taken}
                  onChange={(e) => setNewActivity({...newActivity, action_taken: e.target.value})}
                  placeholder="Contoh: Cek kabel HDMI dan power"
                  className="w-full border-2 border-gray-400 rounded-xl px-3 py-2 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                />
              </div>
              
              <div className="border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
                <label className="block text-xs font-bold mb-2 text-gray-800">Notes *</label>
                <textarea
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                  placeholder="Detail pekerjaan yang dilakukan..."
                  className="w-full border-2 border-gray-400 rounded-xl px-3 py-2 h-20 text-sm focus:border-blue-600 focus:ring-4 focus:ring-blue-200 transition-all"
                />
              </div>
              
              <div className="border-2 border-gray-300 rounded-xl p-3 bg-gray-50">
                <label className="block text-xs font-bold mb-2 text-gray-800">Upload Foto Dokumentasi</label>
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

              {/* Face Verification */}
              <div className="border-2 border-red-500 rounded-xl p-4 bg-red-50">
                <label className="block text-sm font-bold mb-2 text-red-800">📸 Verifikasi Wajah (Wajib) *</label>
                <p className="text-xs text-gray-600 mb-3">Ambil foto wajah Anda untuk verifikasi identitas</p>
                
                {!capturingFace && !newActivity.facePhoto && (
                  <button
                    onClick={startCamera}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold shadow-xl transition-all"
                  >
                    📷 Ambil Foto Wajah
                  </button>
                )}

                {capturingFace && (
                  <div className="space-y-3">
                    <video 
                      ref={videoRef} 
                      autoPlay 
                      playsInline
                      className="w-full rounded-xl border-2 border-blue-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={captureFace}
                        className="flex-1 bg-gradient-to-r from-green-600 to-green-800 text-white py-2 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all"
                      >
                        ✓ Capture
                      </button>
                      <button
                        onClick={stopCamera}
                        className="flex-1 bg-gray-400 text-white py-2 rounded-xl hover:bg-gray-500 font-bold shadow-xl transition-all"
                      >
                        ✖ Batal
                      </button>
                    </div>
                  </div>
                )}

                {newActivity.facePhoto && (
                  <div className="space-y-2">
                    <img 
                      src={newActivity.facePhoto} 
                      alt="Face captured" 
                      className="w-full rounded-xl border-2 border-green-500"
                    />
                    <button
                      onClick={() => {
                        setNewActivity({...newActivity, facePhoto: null});
                        startCamera();
                      }}
                      className="w-full bg-orange-500 text-white py-2 rounded-xl hover:bg-orange-600 font-bold shadow-xl transition-all"
                    >
                      🔄 Ambil Ulang
                    </button>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} style={{ display: 'none' }} />
              
              <button
                onClick={addActivity}
                disabled={uploadingPhoto || !newActivity.facePhoto}
                className="w-full bg-gradient-to-r from-green-600 to-green-800 text-white py-3 rounded-xl hover:from-green-700 hover:to-green-900 font-bold shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingPhoto ? '⏳ Uploading...' : '💾 Update Status & Tambah Activity'}
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
