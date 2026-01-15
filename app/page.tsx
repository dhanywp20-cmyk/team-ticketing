'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Comment {
  id: string;
  author: string;
  content: string;
  action_taken: string;
  created_at: string;
}

interface Ticket {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  status: string;
  created_at: string;
  comments?: Comment[];
}

export default function TicketingSystem() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);

  const [newTicket, setNewTicket] = useState({
    title: '',
    description: '',
    assigned_to: 'Reka'
  });

  const [newComment, setNewComment] = useState({
    author: 'Reka',
    content: '',
    action: ''
  });

  const teamMembers = ['Reka', 'Yoga', 'Ade', 'Ferdinan'];
  const statusColors: Record<string, string> = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Process Action': 'bg-blue-100 text-blue-800',
    'Solved': 'bg-green-100 text-green-800'
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select(`
          *,
          comments (*)
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
    if (!newTicket.title.trim()) {
      alert('Judul ticket harus diisi!');
      return;
    }

    try {
      const { error } = await supabase.from('tickets').insert([
        {
          title: newTicket.title,
          description: newTicket.description,
          assigned_to: newTicket.assigned_to,
          status: 'Pending'
        }
      ]);

      if (error) throw error;

      setNewTicket({ title: '', description: '', assigned_to: 'Reka' });
      setShowNewTicket(false);
      fetchTickets();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const addComment = async () => {
    if (!newComment.content.trim() || !selectedTicket) return;

    try {
      const { error } = await supabase.from('comments').insert([
        {
          ticket_id: selectedTicket.id,
          author: newComment.author,
          content: newComment.content,
          action_taken: newComment.action
        }
      ]);

      if (error) throw error;

      setNewComment({ author: 'Reka', content: '', action: '' });
      fetchTickets();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .update({ status: newStatus })
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading tickets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Ticketing System</h1>
              <p className="text-gray-600 mt-1">Tim Support: Reka, Yoga, Ade, Ferdinan</p>
            </div>
            <button
              onClick={() => setShowNewTicket(!showNewTicket)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              + Ticket Baru
            </button>
          </div>
        </div>

        {showNewTicket && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Buat Ticket Baru</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Judul Issue</label>
                <input
                  type="text"
                  value={newTicket.title}
                  onChange={(e) => setNewTicket({...newTicket, title: e.target.value})}
                  placeholder="Contoh: Videowall Error"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deskripsi</label>
                <textarea
                  value={newTicket.description}
                  onChange={(e) => setNewTicket({...newTicket, description: e.target.value})}
                  placeholder="Detail masalah..."
                  className="w-full border rounded-lg px-3 py-2 h-24"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign ke</label>
                <select
                  value={newTicket.assigned_to}
                  onChange={(e) => setNewTicket({...newTicket, assigned_to: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {teamMembers.map(member => (
                    <option key={member} value={member}>{member}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={createTicket}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Simpan Ticket
                </button>
                <button
                  onClick={() => setShowNewTicket(false)}
                  className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Daftar Ticket</h2>
            {tickets.map(ticket => (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`bg-white rounded-lg shadow p-4 cursor-pointer hover:shadow-lg transition ${
                  selectedTicket?.id === ticket.id ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-lg">{ticket.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-sm ${statusColors[ticket.status]}`}>
                    {ticket.status}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-3">{ticket.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <div>👤 {ticket.assigned_to}</div>
                  <div>💬 {ticket.comments?.length || 0} komentar</div>
                </div>
              </div>
            ))}
          </div>

          {selectedTicket && (
            <div className="bg-white rounded-lg shadow-lg p-6 h-fit sticky top-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold">{selectedTicket.title}</h2>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value)}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="Pending">Pending</option>
                  <option value="Process Action">Process Action</option>
                  <option value="Solved">Solved</option>
                </select>
              </div>

              <div className="mb-6">
                <p className="text-gray-600 mb-2">{selectedTicket.description}</p>
                <div className="text-sm text-gray-500">
                  Assigned to: <span className="font-medium">{selectedTicket.assigned_to}</span>
                </div>
              </div>

              <div className="border-t pt-4 mb-4">
                <h3 className="font-bold mb-3">Activity Log</h3>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedTicket.comments?.map(comment => (
                    <div key={comment.id} className="bg-gray-50 rounded p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <span className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleString('id-ID')}
                        </span>
                      </div>
                      {comment.action_taken && (
                        <div className="text-sm text-blue-600 mb-1">
                          Action: {comment.action_taken}
                        </div>
                      )}
                      <p className="text-sm">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-bold mb-3">Tambah Update</h3>
                <div className="space-y-3">
                  <select
                    value={newComment.author}
                    onChange={(e) => setNewComment({...newComment, author: e.target.value})}
                    className="w-full border rounded px-3 py-2"
                  >
                    {teamMembers.map(member => (
                      <option key={member} value={member}>{member}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={newComment.action}
                    onChange={(e) => setNewComment({...newComment, action: e.target.value})}
                    placeholder="Action yang dilakukan (opsional)"
                    className="w-full border rounded px-3 py-2"
                  />
                  <textarea
                    value={newComment.content}
                    onChange={(e) => setNewComment({...newComment, content: e.target.value})}
                    placeholder="Tulis komentar..."
                    className="w-full border rounded px-3 py-2 h-24"
                  />
                  <button
                    onClick={addComment}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                  >
                    Tambah Komentar
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