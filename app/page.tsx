'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [newTicket, setNewTicket] = useState({
    project_name: '',
    issue_case: '',
    description: '',
    assigned_to: 'Dhany',
    date: new Date().toISOString().split('T')[0]
  });

  const [newActivity, setNewActivity] = useState({
    handler_name: 'Dhany',
    action_taken: '',
    notes: '',
    shift_time: 'Pagi (08:00-16:00)',
    photo: null as File | null
  });

  const teamMembers = ['Dhany', 'Reka', 'Yoga', 'Ade', 'Ferdinan'];
  const shifts = ['Pagi (08:00-16:00)', 'Siang (16:00-00:00)', 'Malam (00:00-08:00)'];
  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'Process Action': 'bg-blue-100 text-blue-800 border-blue-300',
    'Solved': 'bg-green-100 text-green-800 border-green-300'
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
          status: 'Pending',
          date: newTicket.date
        }
      ]).select();

      if (error) throw error;

      // Tambahkan handler pertama
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
        date: new Date().toISOString().split('T')[0]
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

      // Cek apakah handler berbeda dengan yang terakhir
      const lastHandler = selectedTicket.ticket_handlers?.[selectedTicket.ticket_handlers.length - 1];
      if (!lastHandler || lastHandler.handler_name !== newActivity.handler_name) {
        // Tutup handler sebelumnya
        if (lastHandler && !lastHandler.ended_at) {
          await supabase
            .from('ticket_handlers')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', lastHandler.id);
        }

        // Tambah handler baru
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

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', ticketId);

      if (error) throw error;
      fetchTickets();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                🎫 Ticketing System
              </h1>
              <p className="text-gray-600">
                <span className="font-semibold">Tim Support:</span> Dhany, Reka, Yoga, Ade, Ferdinan
              </p>
            </div>
            <button
              onClick={() => setShowNewTicket(!showNewTicket)}
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-blue-800 shadow-md transition-all font-medium flex items-center justify-center gap-2"
            >
              <span className="text-xl">+</span> Ticket Baru
            </button>
          </div>
        </div>

        {/* Form Ticket Baru */}
        {showNewTicket && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6 border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 text-gray-800">📝 Buat Ticket Baru</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Nama Project *</label>
                <input
                  type="text"
                  value={newTicket.project_name}
                  onChange={(e) => setNewTicket({...newTicket, project_name: e.target.value})}
                  placeholder="Contoh: Project BCA"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Issue Case *</label>
                <input
                  type="text"
                  value={newTicket.issue_case}
                  onChange={(e) => setNewTicket({...newTicket, issue_case: e.target.value})}
                  placeholder="Contoh: Videowall Error"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Tanggal</label>
                <input
                  type="date"
                  value={newTicket.date}
                  onChange={(e) => setNewTicket({...newTicket, date: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700">Assign ke</label>
                <select
                  value={newTicket.assigned_to}
                  onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-blue-500 focus:outline-none"
                >
                  {teamMembers.map(member => (
                    <option key={member} value={member}>{member}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Deskripsi</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Detail masalah..."
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 h-24 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={createTicket}
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 font-medium shadow-md"
              >
                💾 Simpan Ticket
              </button>
              <button
                onClick={() => setShowNewTicket(false)}
                className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400 font-medium"
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
              <h2 className="text-2xl font-bold text-gray-800">📋 Daftar Ticket</h2>
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
                {tickets.length} Ticket
              </span>
            </div>
            
            {tickets.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center border border-gray-200">
                <p className="text-gray-500">Belum ada ticket. Buat ticket pertama Anda!</p>
              </div>
            ) : (
              tickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`bg-white rounded-xl shadow-md p-5 cursor-pointer hover:shadow-xl transition-all border-2 ${
                    selectedTicket?.id === ticket.id ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-800 mb-1">
                        🏢 {ticket.project_name}
                      </h3>
                      <p className="text-sm text-gray-600 font-medium">
                        ⚠️ {ticket.issue_case}
                      </p>
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
                    <div className="flex items-center gap-1">
                      <span>👥</span>
                      <span>{ticket.ticket_handlers?.length || 0} handler</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Detail Ticket */}
          {selectedTicket && (
            <div className="bg-white rounded-xl shadow-lg p-6 h-fit sticky top-6 border border-gray-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-gray-800 mb-1">
                    🏢 {selectedTicket.project_name}
                  </h2>
                  <p className="text-gray-600 font-medium">⚠️ {selectedTicket.issue_case}</p>
                </div>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                  className="border-2 border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-blue-500 focus:outline-none"
                >
                  <option value="Pending">Pending</option>
                  <option value="Process Action">Process Action</option>
                  <option value="Solved">Solved</option>
                </select>
              </div>

              {selectedTicket.description && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
                  <p className="text-gray-700 text-sm">{selectedTicket.description}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6 text-sm">
                <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                  <p className="text-gray-600 mb-1">Assigned to:</p>
                  <p className="font-bold text-gray-800">👤 {selectedTicket.assigned_to}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-gray-600 mb-1">Tanggal:</p>
                  <p className="font-bold text-gray-800">📅 {new Date(selectedTicket.date).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              {/* Handler History */}
              {selectedTicket.ticket_handlers && selectedTicket.ticket_handlers.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                    👥 Handler History
                  </h3>
                  <div className="space-y-2">
                    {selectedTicket.ticket_handlers.map((handler, idx) => (
                      <div key={handler.id} className="bg-purple-50 rounded-lg p-3 border border-purple-200 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-gray-800">
                            {idx + 1}. {handler.handler_name}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${handler.ended_at ? 'bg-gray-200 text-gray-700' : 'bg-green-200 text-green-800'}`}>
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
                    ))}
                  </div>
                </div>
              )}

              {/* Activity Log */}
              <div className="border-t-2 border-gray-200 pt-6 mb-6">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  📝 Activity Log
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {selectedTicket.activity_logs && selectedTicket.activity_logs.length > 0 ? (
                    selectedTicket.activity_logs.map(log => (
                      <div key={log.id} className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 border border-gray-300">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                              {log.handler_name.charAt(0)}
                            </span>
                            <div>
                              <p className="font-bold text-gray-800">{log.handler_name}</p>
                              <p className="text-xs text-gray-500">
                                {new Date(log.created_at).toLocaleString('id-ID')}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-medium">
                            {log.shift_time}
                          </span>
                        </div>
                        
                        {log.action_taken && (
                          <div className="bg-blue-100 border-l-4 border-blue-500 rounded px-3 py-2 mb-2">
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
                            className="rounded-lg mt-2 max-w-full h-auto border-2 border-gray-300 cursor-pointer hover:scale-105 transition-transform"
                            onClick={() => window.open(log.photo_url, '_blank')}
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-4">Belum ada aktivitas</p>
                  )}
                </div>
              </div>

              {/* Form Tambah Activity */}
              <div className="border-t-2 border-gray-200 pt-6">
                <h3 className="font-bold text-gray-800 mb-4">➕ Tambah Update</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700">Handler</label>
                      <select
                        value={newActivity.handler_name}
                        onChange={(e) => setNewActivity({...newActivity, handler_name: e.target.value})}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {teamMembers.map(member => (
                          <option key={member} value={member}>{member}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-1 text-gray-700">Shift</label>
                      <select
                        value={newActivity.shift_time}
                        onChange={(e) => setNewActivity({...newActivity, shift_time: e.target.value})}
                        className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      >
                        {shifts.map(shift => (
                          <option key={shift} value={shift}>{shift}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Action yang Dilakukan</label>
                    <input
                      type="text"
                      value={newActivity.action_taken}
                      onChange={(e) => setNewActivity({...newActivity, action_taken: e.target.value})}
                      placeholder="Contoh: Cek kabel HDMI dan power"
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Notes *</label>
                    <textarea
                      value={newActivity.notes}
                      onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                      placeholder="Detail pekerjaan yang dilakukan..."
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 h-20 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-semibold mb-1 text-gray-700">Upload Foto</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setNewActivity({...newActivity, photo: e.target.files?.[0] || null})}
                      className="w-full border-2 border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    {newActivity.photo && (
                      <p className="text-xs text-green-600 mt-1">📎 {newActivity.photo.name}</p>
                    )}
                  </div>
                  
                  <button
                    onClick={addActivity}
                    disabled={uploadingPhoto}
                    className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white py-3 rounded-lg hover:from-green-700 hover:to-green-800 font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingPhoto ? '⏳ Uploading...' : '💾 Tambah Activity'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
