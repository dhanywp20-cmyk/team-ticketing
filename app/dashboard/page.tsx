'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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
  allowed_menus?: string[];
}

interface MenuItem {
  title: string;
  icon: string;
  gradient: string;
  description: string;
  key: string;
  items: {
    name: string;
    url: string;
    icon: string;
    external?: boolean;
    embed?: boolean;
    internal?: boolean;
  }[];
}

// ─── Supabase SQL Schema (run once in Supabase SQL Editor) ─────────────────────
// CREATE TABLE IF NOT EXISTS solution_requests (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   created_at timestamptz DEFAULT now(),
//   project_name text,
//   room_name text,
//   sales_name text,
//   kebutuhan text[],
//   kebutuhan_other text,
//   solution_product text[],
//   solution_other text,
//   layout_signage text[],
//   jaringan_cms text[],
//   jumlah_input text,
//   jumlah_output text,
//   source text[],
//   source_other text,
//   camera_conference boolean,
//   camera_jumlah text,
//   camera_tracking text[],
//   audio_system boolean,
//   audio_keperluan text[],
//   wallplate_input boolean,
//   wallplate_jumlah text,
//   wireless_presentation boolean,
//   ukuran_ruangan text,
//   suggest_tampilan text,
//   keterangan_lain text,
//   status text DEFAULT 'pending',
//   submitted_by text,
//   submitted_by_role text
// );
// CREATE TABLE IF NOT EXISTS solution_messages (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   created_at timestamptz DEFAULT now(),
//   request_id uuid REFERENCES solution_requests(id) ON DELETE CASCADE,
//   sender_name text,
//   sender_role text,
//   message text,
//   attachments jsonb DEFAULT '[]'
// );
// CREATE TABLE IF NOT EXISTS solution_attachments (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   created_at timestamptz DEFAULT now(),
//   request_id uuid REFERENCES solution_requests(id) ON DELETE CASCADE,
//   message_id uuid REFERENCES solution_messages(id) ON DELETE CASCADE,
//   file_name text,
//   file_url text,
//   file_type text,
//   uploaded_by text
// );
// -- Storage bucket: solution-files (public)

// ─── Types ────────────────────────────────────────────────────────────────────
interface SolutionRequest {
  id: string;
  created_at: string;
  project_name: string;
  room_name: string;
  sales_name: string;
  kebutuhan: string[];
  kebutuhan_other: string;
  solution_product: string[];
  solution_other: string;
  layout_signage: string[];
  jaringan_cms: string[];
  jumlah_input: string;
  jumlah_output: string;
  source: string[];
  source_other: string;
  camera_conference: boolean;
  camera_jumlah: string;
  camera_tracking: string[];
  audio_system: boolean;
  audio_keperluan: string[];
  wallplate_input: boolean;
  wallplate_jumlah: string;
  wireless_presentation: boolean;
  ukuran_ruangan: string;
  suggest_tampilan: string;
  keterangan_lain: string;
  status: string;
  submitted_by: string;
  submitted_by_role: string;
}

interface SolutionMessage {
  id: string;
  created_at: string;
  request_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  attachments: { name: string; url: string; type: string }[];
}

// ─── Form Require Project ─────────────────────────────────────────────────────
function FormRequireProject({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [requests, setRequests] = useState<SolutionRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SolutionRequest | null>(null);
  const [messages, setMessages] = useState<SolutionMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [uploadingFile, setUploadingFile] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<{ name: string; url: string; type: string }[]>([]);
  const msgBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = ['admin', 'superadmin'].includes(currentUser.role?.toLowerCase() ?? '');
  const isPTS = ['pts', 'admin', 'superadmin'].includes(currentUser.role?.toLowerCase() ?? '');

  const [form, setForm] = useState({
    project_name: '',
    room_name: '',
    sales_name: currentUser.full_name,
    kebutuhan: [] as string[],
    kebutuhan_other: '',
    solution_product: [] as string[],
    solution_other: '',
    layout_signage: [] as string[],
    jaringan_cms: [] as string[],
    jumlah_input: '',
    jumlah_output: '',
    source: [] as string[],
    source_other: '',
    camera_conference: false,
    camera_jumlah: '',
    camera_tracking: [] as string[],
    audio_system: false,
    audio_keperluan: [] as string[],
    wallplate_input: false,
    wallplate_jumlah: '',
    wireless_presentation: false,
    ukuran_ruangan: '',
    suggest_tampilan: '',
    keterangan_lain: '',
  });

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchRequests = useCallback(async () => {
    setLoadingList(true);
    let query = supabase.from('solution_requests').select('*').order('created_at', { ascending: false });
    if (!isAdmin && !isPTS) {
      query = query.eq('submitted_by', currentUser.full_name);
    }
    const { data, error } = await query;
    if (!error && data) setRequests(data);
    setLoadingList(false);
  }, [isAdmin, isPTS, currentUser.full_name]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Poll for new messages when in detail view
  useEffect(() => {
    if (view !== 'detail' || !selectedRequest) return;
    fetchMessages(selectedRequest.id);
    const interval = setInterval(() => fetchMessages(selectedRequest.id), 10000);
    return () => clearInterval(interval);
  }, [view, selectedRequest?.id]);

  useEffect(() => {
    msgBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (requestId: string) => {
    const { data } = await supabase
      .from('solution_messages')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);
  };

  const toggleCheck = (field: keyof typeof form, val: string) => {
    const arr = (form[field] as string[]);
    setForm(prev => ({
      ...prev,
      [field]: arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
    }));
  };

  const handleSubmitForm = async () => {
    if (!form.project_name || !form.room_name) {
      notify('error', 'Nama Project dan Nama Ruangan wajib diisi!');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from('solution_requests').insert([{
      ...form,
      status: 'pending',
      submitted_by: currentUser.full_name,
      submitted_by_role: currentUser.role,
    }]);
    setSubmitting(false);
    if (error) { notify('error', 'Gagal submit: ' + error.message); return; }
    notify('success', 'Form berhasil dikirim! Menunggu approval Superadmin.');
    setView('list');
    fetchRequests();
    // Reset form
    setForm({
      project_name: '', room_name: '', sales_name: currentUser.full_name,
      kebutuhan: [], kebutuhan_other: '', solution_product: [], solution_other: '',
      layout_signage: [], jaringan_cms: [], jumlah_input: '', jumlah_output: '',
      source: [], source_other: '', camera_conference: false, camera_jumlah: '',
      camera_tracking: [], audio_system: false, audio_keperluan: [],
      wallplate_input: false, wallplate_jumlah: '', wireless_presentation: false,
      ukuran_ruangan: '', suggest_tampilan: '', keterangan_lain: '',
    });
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('solution_requests').update({ status }).eq('id', id);
    if (error) { notify('error', 'Gagal update status.'); return; }
    notify('success', `Status diubah ke: ${status}`);
    fetchRequests();
    if (selectedRequest) setSelectedRequest(prev => prev ? { ...prev, status } : null);
  };

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true);
    const ext = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { data, error } = await supabase.storage
      .from('solution-files')
      .upload(fileName, file, { contentType: file.type });
    if (error) { notify('error', 'Upload gagal: ' + error.message); setUploadingFile(false); return; }
    const { data: urlData } = supabase.storage.from('solution-files').getPublicUrl(fileName);
    setPendingFiles(prev => [...prev, { name: file.name, url: urlData.publicUrl, type: file.type }]);
    setUploadingFile(false);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && pendingFiles.length === 0) return;
    if (!selectedRequest) return;
    setSendingMsg(true);
    const { error } = await supabase.from('solution_messages').insert([{
      request_id: selectedRequest.id,
      sender_name: currentUser.full_name,
      sender_role: currentUser.role,
      message: newMessage.trim(),
      attachments: pendingFiles,
    }]);
    setSendingMsg(false);
    if (error) { notify('error', 'Gagal kirim pesan.'); return; }
    setNewMessage('');
    setPendingFiles([]);
    fetchMessages(selectedRequest.id);
  };

  const openDetail = async (req: SolutionRequest) => {
    setSelectedRequest(req);
    setView('detail');
    await fetchMessages(req.id);
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'pending': return { bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.4)', color: '#92400e', label: '⏳ Pending' };
      case 'approved': return { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.4)', color: '#065f46', label: '✅ Approved' };
      case 'in_progress': return { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.4)', color: '#1e40af', label: '🔄 In Progress' };
      case 'completed': return { bg: 'rgba(99,102,241,0.1)', border: 'rgba(99,102,241,0.4)', color: '#3730a3', label: '🎯 Completed' };
      case 'rejected': return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.4)', color: '#991b1b', label: '❌ Rejected' };
      default: return { bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.4)', color: '#475569', label: status };
    }
  };

  const CheckboxGroup = ({ label, options, field, otherField }: {
    label: string; options: string[]; field: keyof typeof form; otherField?: keyof typeof form;
  }) => (
    <div className="space-y-2">
      <label className="block text-xs font-bold tracking-widest uppercase text-slate-500">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const checked = (form[field] as string[]).includes(opt);
          return (
            <button key={opt} type="button" onClick={() => toggleCheck(field, opt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all"
              style={checked
                ? { background: 'rgba(200,134,29,0.12)', border: '1.5px solid rgba(200,134,29,0.5)', color: '#92600a' }
                : { background: 'rgba(241,245,249,0.8)', border: '1.5px solid rgba(203,213,225,0.8)', color: '#64748b' }}>
              <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                style={{ background: checked ? '#c8861d' : 'white', borderColor: checked ? '#c8861d' : '#cbd5e1' }}>
                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </span>
              {opt}
            </button>
          );
        })}
      </div>
      {otherField && (
        <input value={form[otherField] as string} onChange={e => setForm(prev => ({ ...prev, [otherField]: e.target.value }))}
          placeholder="Other..."
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white/80" />
      )}
    </div>
  );

  // ── LIST VIEW ──
  if (view === 'list') return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 py-5 flex items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Form Require Project</h2>
          <p className="text-sm text-slate-500 mt-0.5">Solution request management platform</p>
        </div>
        <button onClick={() => setView('new')}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all shadow-lg hover:shadow-xl"
          style={{ background: 'linear-gradient(135deg, #e2a84b, #c8861d)' }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Request Baru
        </button>
      </div>

      {notification && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 border ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {loadingList ? (
          <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-slate-200 border-t-amber-500 rounded-full animate-spin"/></div>
        ) : requests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl" style={{ background: 'rgba(200,134,29,0.08)', border: '2px dashed rgba(200,134,29,0.3)' }}>📋</div>
            <p className="font-semibold text-lg">Belum ada request</p>
            <p className="text-sm">Klik "Request Baru" untuk mengisi form pertama.</p>
          </div>
        ) : (
          <div className="grid gap-4 max-w-5xl mx-auto">
            {requests.map(req => {
              const st = getStatusStyle(req.status);
              return (
                <div key={req.id} onClick={() => openDetail(req)}
                  className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-slate-100 hover:border-amber-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap mb-2">
                        <h3 className="font-bold text-slate-800 text-base truncate">{req.project_name || 'Untitled Project'}</h3>
                        <span className="text-xs px-2.5 py-1 rounded-full font-semibold border"
                          style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500 flex-wrap">
                        <span>🏢 {req.room_name}</span>
                        <span>👤 {req.sales_name}</span>
                        <span>🗓️ {new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                      {req.kebutuhan?.length > 0 && (
                        <div className="flex gap-1.5 mt-3 flex-wrap">
                          {req.kebutuhan.map(k => (
                            <span key={k} className="text-xs px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 font-medium">{k}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdmin && req.status === 'pending' && (
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <button onClick={() => handleUpdateStatus(req.id, 'approved')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all">
                            Approve
                          </button>
                          <button onClick={() => handleUpdateStatus(req.id, 'rejected')}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">
                            Reject
                          </button>
                        </div>
                      )}
                      {isAdmin && req.status === 'approved' && (
                        <button onClick={e => { e.stopPropagation(); handleUpdateStatus(req.id, 'in_progress'); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all">
                          Set In Progress
                        </button>
                      )}
                      {isAdmin && req.status === 'in_progress' && (
                        <button onClick={e => { e.stopPropagation(); handleUpdateStatus(req.id, 'completed'); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all">
                          Complete
                        </button>
                      )}
                      <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  // ── NEW FORM VIEW ──
  if (view === 'new') return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 py-5 flex items-center gap-4 shadow-sm">
        <button onClick={() => setView('list')} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Form Equipment Request</h2>
          <p className="text-sm text-slate-500">Isi detail kebutuhan solution project</p>
        </div>
      </div>

      {notification && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 border ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Project Info */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700 mb-4">Informasi Project</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Nama Project *', key: 'project_name', placeholder: 'Masukkan nama project' },
                { label: 'Nama Ruangan *', key: 'room_name', placeholder: 'Contoh: Meeting Room Lt.3' },
                { label: 'Sales', key: 'sales_name', placeholder: 'Nama Sales' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label className="block text-xs font-bold mb-1.5 text-slate-600 tracking-widest uppercase">{label}</label>
                  <input value={(form as any)[key]} onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none bg-white/80" />
                </div>
              ))}
            </div>
          </div>

          {/* Kebutuhan & Solution */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700">Kebutuhan & Solution</h3>
            <CheckboxGroup label="Kebutuhan" field="kebutuhan" otherField="kebutuhan_other"
              options={['Signage', 'Immersive', 'Meeting Room', 'Mapping', 'Command Center', 'Hybrid Classroom']} />
            <CheckboxGroup label="Solution Product" field="solution_product" otherField="solution_other"
              options={['Videowall', 'Signage Display', 'Projector', 'Kiosk', 'IFP']} />
          </div>

          {/* Layout & CMS */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700">Layout & CMS</h3>
            <CheckboxGroup label="Layout Content Signage" field="layout_signage"
              options={['Fullscreen only (Image/video slideshow)', 'Split 2,3 atau multi zone (video/image, running text, dll)']} />
            <CheckboxGroup label="Jaringan CMS Signage" field="jaringan_cms"
              options={['Cloud Base', 'On Premise']} />
          </div>

          {/* Source */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700">Source</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-500 tracking-widest uppercase">Jumlah Input</label>
                <input value={form.jumlah_input} onChange={e => setForm(prev => ({ ...prev, jumlah_input: e.target.value }))}
                  placeholder="e.g. 4"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 text-slate-500 tracking-widest uppercase">Jumlah Output</label>
                <input value={form.jumlah_output} onChange={e => setForm(prev => ({ ...prev, jumlah_output: e.target.value }))}
                  placeholder="e.g. 2"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
              </div>
            </div>
            <CheckboxGroup label="Source" field="source" otherField="source_other"
              options={['PC', 'URL', 'NVR', 'Laptop']} />
          </div>

          {/* Camera */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700">Camera Conference</h3>
            <div className="flex gap-3">
              {['Ya', 'Tidak'].map(opt => (
                <button key={opt} type="button" onClick={() => setForm(prev => ({ ...prev, camera_conference: opt === 'Ya' }))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
                  style={form.camera_conference === (opt === 'Ya')
                    ? { background: 'rgba(200,134,29,0.12)', border: '1.5px solid rgba(200,134,29,0.5)', color: '#92600a' }
                    : { background: 'rgba(241,245,249,0.8)', border: '1.5px solid rgba(203,213,225,0.8)', color: '#64748b' }}>
                  {opt}
                </button>
              ))}
            </div>
            {form.camera_conference && (
              <div className="space-y-4 pt-2">
                <input value={form.camera_jumlah} onChange={e => setForm(prev => ({ ...prev, camera_jumlah: e.target.value }))}
                  placeholder="Jumlah camera"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
                <CheckboxGroup label="Tracking" field="camera_tracking"
                  options={['Voice', 'Human Detection', 'Track Mic Delegate']} />
              </div>
            )}
          </div>

          {/* Audio */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700">Audio System</h3>
            <div className="flex gap-3">
              {['Ya', 'Tidak'].map(opt => (
                <button key={opt} type="button" onClick={() => setForm(prev => ({ ...prev, audio_system: opt === 'Ya' }))}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
                  style={form.audio_system === (opt === 'Ya')
                    ? { background: 'rgba(200,134,29,0.12)', border: '1.5px solid rgba(200,134,29,0.5)', color: '#92600a' }
                    : { background: 'rgba(241,245,249,0.8)', border: '1.5px solid rgba(203,213,225,0.8)', color: '#64748b' }}>
                  {opt}
                </button>
              ))}
            </div>
            {form.audio_system && (
              <CheckboxGroup label="Keperluan Audio" field="audio_keperluan" options={['Mic', 'PC']} />
            )}
          </div>

          {/* Wallplate & Wireless */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-5">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700">Aksesoris</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-500 tracking-widest uppercase">Wallplate Input</label>
                <div className="flex gap-3">
                  {['Ya', 'Tidak'].map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(prev => ({ ...prev, wallplate_input: opt === 'Ya' }))}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
                      style={form.wallplate_input === (opt === 'Ya')
                        ? { background: 'rgba(200,134,29,0.12)', border: '1.5px solid rgba(200,134,29,0.5)', color: '#92600a' }
                        : { background: 'rgba(241,245,249,0.8)', border: '1.5px solid rgba(203,213,225,0.8)', color: '#64748b' }}>
                      {opt}
                    </button>
                  ))}
                </div>
                {form.wallplate_input && (
                  <input value={form.wallplate_jumlah} onChange={e => setForm(prev => ({ ...prev, wallplate_jumlah: e.target.value }))}
                    placeholder="Jumlah wallplate" className="mt-3 w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-500 tracking-widest uppercase">Wireless Presentation</label>
                <div className="flex gap-3">
                  {['Ya', 'Tidak'].map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(prev => ({ ...prev, wireless_presentation: opt === 'Ya' }))}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all"
                      style={form.wireless_presentation === (opt === 'Ya')
                        ? { background: 'rgba(200,134,29,0.12)', border: '1.5px solid rgba(200,134,29,0.5)', color: '#92600a' }
                        : { background: 'rgba(241,245,249,0.8)', border: '1.5px solid rgba(203,213,225,0.8)', color: '#64748b' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Ukuran & Keterangan */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-sm font-bold tracking-widest uppercase text-amber-700">Detail Ruangan</h3>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500 tracking-widest uppercase">Ukuran Ruangan (P x L x T)</label>
              <input value={form.ukuran_ruangan} onChange={e => setForm(prev => ({ ...prev, ukuran_ruangan: e.target.value }))}
                placeholder="Contoh: 6m x 4m x 3m"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500 tracking-widest uppercase">Suggest Tampilan (W x H)</label>
              <input value={form.suggest_tampilan} onChange={e => setForm(prev => ({ ...prev, suggest_tampilan: e.target.value }))}
                placeholder="Contoh: 3m x 2m"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-500 tracking-widest uppercase">Keterangan Lain</label>
              <textarea value={form.keterangan_lain} onChange={e => setForm(prev => ({ ...prev, keterangan_lain: e.target.value }))}
                placeholder="Catatan tambahan atau kebutuhan khusus..."
                rows={4}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none" />
            </div>
          </div>

          <div className="flex gap-4 pb-8">
            <button onClick={() => setView('list')}
              className="flex-1 py-3.5 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-all text-sm">
              Batal
            </button>
            <button onClick={handleSubmitForm} disabled={submitting}
              className="flex-1 py-3.5 rounded-xl text-white font-semibold transition-all shadow-lg text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #e2a84b, #c8861d)' }}>
              {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
              📤 Kirim Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── DETAIL & CHAT VIEW ──
  if (view === 'detail' && selectedRequest) {
    const st = getStatusStyle(selectedRequest.status);
    return (
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
        {/* Header */}
        <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200 px-6 py-4 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => { setView('list'); fetchRequests(); }} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 transition-all">
              <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-base font-bold text-slate-800 truncate">{selectedRequest.project_name}</h2>
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold border flex-shrink-0"
                  style={{ background: st.bg, borderColor: st.border, color: st.color }}>{st.label}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">🏢 {selectedRequest.room_name} · 👤 {selectedRequest.sales_name}</p>
            </div>
            {isAdmin && (
              <div className="flex gap-2 flex-shrink-0">
                {selectedRequest.status === 'pending' && <>
                  <button onClick={() => handleUpdateStatus(selectedRequest.id, 'approved')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-all">Approve</button>
                  <button onClick={() => handleUpdateStatus(selectedRequest.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-all">Reject</button>
                </>}
                {selectedRequest.status === 'approved' && <button onClick={() => handleUpdateStatus(selectedRequest.id, 'in_progress')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-all">In Progress</button>}
                {selectedRequest.status === 'in_progress' && <button onClick={() => handleUpdateStatus(selectedRequest.id, 'completed')} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-all">Complete</button>}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Form Summary Panel */}
          <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-slate-200 bg-white/70 backdrop-blur-sm p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
            <h3 className="text-xs font-bold tracking-widest uppercase text-amber-700 mb-3">Detail Request</h3>
            {[
              { label: 'Kebutuhan', val: selectedRequest.kebutuhan?.join(', ') || '-' },
              { label: 'Solution Product', val: selectedRequest.solution_product?.join(', ') || '-' },
              { label: 'Layout Signage', val: selectedRequest.layout_signage?.join(', ') || '-' },
              { label: 'Jaringan CMS', val: selectedRequest.jaringan_cms?.join(', ') || '-' },
              { label: 'Jumlah Input/Output', val: `${selectedRequest.jumlah_input || '-'} / ${selectedRequest.jumlah_output || '-'}` },
              { label: 'Source', val: selectedRequest.source?.join(', ') || '-' },
              { label: 'Camera Conference', val: selectedRequest.camera_conference ? `Ya (${selectedRequest.camera_jumlah})` : 'Tidak' },
              { label: 'Camera Tracking', val: selectedRequest.camera_tracking?.join(', ') || '-' },
              { label: 'Audio System', val: selectedRequest.audio_system ? `Ya (${selectedRequest.audio_keperluan?.join(', ')})` : 'Tidak' },
              { label: 'Wallplate Input', val: selectedRequest.wallplate_input ? `Ya (${selectedRequest.wallplate_jumlah})` : 'Tidak' },
              { label: 'Wireless Presentation', val: selectedRequest.wireless_presentation ? 'Ya' : 'Tidak' },
              { label: 'Ukuran Ruangan', val: selectedRequest.ukuran_ruangan || '-' },
              { label: 'Suggest Tampilan', val: selectedRequest.suggest_tampilan || '-' },
              { label: 'Keterangan', val: selectedRequest.keterangan_lain || '-' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-slate-700 font-medium">{val}</p>
              </div>
            ))}
          </div>

          {/* Chat Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-white/60 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
              <span className="text-xs font-semibold text-slate-600">Activity & Discussion</span>
              <span className="text-xs text-slate-400 ml-auto">Auto-refresh setiap 10 detik</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ scrollbarWidth: 'thin' }}>
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <div className="text-4xl">💬</div>
                  <p className="text-sm font-medium">Belum ada pesan. Mulai diskusi!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender_name === currentUser.full_name;
                  const isPTSUser = ['pts', 'admin', 'superadmin'].includes(msg.sender_role?.toLowerCase() ?? '');
                  return (
                    <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white"
                        style={{ background: isPTSUser ? 'linear-gradient(135deg, #e2a84b, #c8861d)' : 'linear-gradient(135deg, #94a3b8, #64748b)' }}>
                        {msg.sender_name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-600">{msg.sender_name}</span>
                          {isPTSUser && <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 font-semibold">PTS</span>}
                          <span className="text-xs text-slate-400">{new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        {msg.message && (
                          <div className="px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
                            style={isMe
                              ? { background: 'linear-gradient(135deg, #e2a84b, #c8861d)', color: 'white' }
                              : { background: 'white', border: '1px solid #e2e8f0', color: '#1e293b' }}>
                            {msg.message}
                          </div>
                        )}
                        {msg.attachments?.length > 0 && (
                          <div className="space-y-1.5 mt-1">
                            {msg.attachments.map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-white hover:bg-slate-50 transition-all text-sm text-slate-700 font-medium">
                                <span className="text-lg">{att.type?.includes('image') ? '🖼️' : att.type?.includes('pdf') ? '📄' : '📎'}</span>
                                <span className="truncate max-w-[180px]">{att.name}</span>
                                <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgBottomRef} />
            </div>

            {/* Pending file previews */}
            {pendingFiles.length > 0 && (
              <div className="px-4 py-2 border-t border-slate-100 bg-white/80 flex gap-2 flex-wrap">
                {pendingFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                    <span>{f.type?.includes('image') ? '🖼️' : f.type?.includes('pdf') ? '📄' : '📎'}</span>
                    <span className="max-w-[120px] truncate">{f.name}</span>
                    <button onClick={() => setPendingFiles(prev => prev.filter((_, j) => j !== i))} className="text-amber-600 hover:text-amber-800 ml-1">✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Message Input */}
            <div className="bg-white/90 border-t border-slate-200 p-4">
              <div className="flex items-end gap-3">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx"
                  onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }} />
                <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                  className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 transition-all flex-shrink-0"
                  title="Lampirkan file">
                  {uploadingFile
                    ? <div className="w-4 h-4 border-2 border-slate-300 border-t-amber-500 rounded-full animate-spin"/>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/></svg>}
                </button>
                <input value={newMessage} onChange={e => setNewMessage(e.target.value)}
                  onKeyPress={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                  placeholder="Ketik pesan, update activity, atau pertanyaan..."
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-amber-200 focus:border-amber-400 outline-none resize-none bg-white" />
                <button onClick={handleSendMessage} disabled={sendingMsg || (!newMessage.trim() && pendingFiles.length === 0)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl text-white transition-all flex-shrink-0 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #e2a84b, #c8861d)' }}>
                  {sendingMsg
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 ml-1">Lampirkan foto survey, Single Line Diagram, PDF, atau gambar pendukung.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// ─── Bell Notification ────────────────────────────────────────────────────────
function BellNotification({ currentUser }: { currentUser: User }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState<{ id: string; msg: string; time: string; read: boolean }[]>([]);

  useEffect(() => {
    const fetchNotifs = async () => {
      // Get requests submitted by this user that have new messages from PTS
      const { data: reqs } = await supabase
        .from('solution_requests')
        .select('id, project_name')
        .eq('submitted_by', currentUser.full_name);

      if (!reqs?.length) return;

      const { data: msgs } = await supabase
        .from('solution_messages')
        .select('*')
        .in('request_id', reqs.map(r => r.id))
        .neq('sender_name', currentUser.full_name)
        .order('created_at', { ascending: false })
        .limit(10);

      if (msgs?.length) {
        const items = msgs.map(m => ({
          id: m.id,
          msg: `${m.sender_name} membalas di ${reqs.find(r => r.id === m.request_id)?.project_name ?? 'project'}`,
          time: new Date(m.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
          read: false,
        }));
        setNotifs(items);
        setCount(items.length);
      }
    };
    fetchNotifs();
    const interval = setInterval(fetchNotifs, 30000);
    return () => clearInterval(interval);
  }, [currentUser.full_name]);

  return (
    <div className="relative">
      <button onClick={() => { setOpen(!open); setCount(0); }}
        className="relative w-10 h-10 flex items-center justify-center rounded-full bg-white/80 border border-slate-200 hover:bg-white transition-all shadow-sm">
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/>
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-sm text-slate-700">Notifikasi</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-slate-400">
                <span className="text-2xl">🔔</span>
                <p className="text-sm">Tidak ada notifikasi baru</p>
              </div>
            ) : notifs.map(n => (
              <div key={n.id} className="px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-all">
                <p className="text-sm text-slate-700 font-medium">{n.msg}</p>
                <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Account Settings Modal ──────────────────────────────────────────────────

const ALL_MENU_KEYS = [
  'form-bast',
  'ticket-troubleshooting',
  'daily-report',
  'database-pts',
  'unit-movement',
  'form-require-project',
];

interface AccountSettingsModalProps {
  onClose: () => void;
}

function AccountSettingsModal({ onClose }: AccountSettingsModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'user',
    allowed_menus: ALL_MENU_KEYS,
  });
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const menuLabels: Record<string, { label: string; icon: string; gradient: string }> = {
    'form-bast': { label: 'Form BAST & Demo', icon: '📋', gradient: 'from-slate-600 to-slate-500' },
    'ticket-troubleshooting': { label: 'Ticket Troubleshooting', icon: '🎫', gradient: 'from-rose-600 to-rose-500' },
    'daily-report': { label: 'Daily Report', icon: '📈', gradient: 'from-emerald-600 to-emerald-500' },
    'database-pts': { label: 'Database PTS', icon: '💼', gradient: 'from-indigo-600 to-indigo-500' },
    'unit-movement': { label: 'Unit Movement Log', icon: '🚚', gradient: 'from-amber-600 to-amber-500' },
    'form-require-project': { label: 'Form Require Project', icon: '📐', gradient: 'from-orange-600 to-orange-500' },
  };

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const { data, error } = await supabase.from('users').select('*').order('full_name');
    if (!error && data) setUsers(data);
    setLoadingUsers(false);
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password || !newUser.full_name) {
      notify('error', 'Semua field wajib diisi!');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('users').insert([{
      username: newUser.username,
      password: newUser.password,
      full_name: newUser.full_name,
      role: newUser.role,
      allowed_menus: newUser.allowed_menus,
    }]);
    setSaving(false);
    if (error) { notify('error', 'Gagal menambah akun: ' + error.message); return; }
    notify('success', 'Akun berhasil ditambahkan!');
    setNewUser({ username: '', password: '', full_name: '', role: 'user', allowed_menus: ALL_MENU_KEYS });
    setActiveTab('list');
    fetchUsers();
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    const { error } = await supabase.from('users').update({
      username: editingUser.username,
      password: editingUser.password,
      full_name: editingUser.full_name,
      role: editingUser.role,
      allowed_menus: editingUser.allowed_menus ?? ALL_MENU_KEYS,
    }).eq('id', editingUser.id);
    setSaving(false);
    if (error) { notify('error', 'Gagal menyimpan: ' + error.message); return; }
    notify('success', 'Akun berhasil diperbarui!');
    setEditingUser(null);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Hapus akun ini?')) return;
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) { notify('error', 'Gagal menghapus akun.'); return; }
    notify('success', 'Akun dihapus.');
    fetchUsers();
  };

  const toggleMenu = (key: string, target: 'new' | 'edit') => {
    if (target === 'new') {
      setNewUser(prev => ({
        ...prev,
        allowed_menus: prev.allowed_menus.includes(key)
          ? prev.allowed_menus.filter(m => m !== key)
          : [...prev.allowed_menus, key],
      }));
    } else if (editingUser) {
      const current = editingUser.allowed_menus ?? ALL_MENU_KEYS;
      setEditingUser({
        ...editingUser,
        allowed_menus: current.includes(key)
          ? current.filter(m => m !== key)
          : [...current, key],
      });
    }
  };

  const MenuPermissionSelector = ({
    selected,
    target,
  }: {
    selected: string[];
    target: 'new' | 'edit';
  }) => (
    <div>
      <label className="block text-xs font-bold mb-2 text-slate-600 tracking-widest uppercase">
        Menu yang Dapat Diakses
      </label>
      <div className="grid grid-cols-1 gap-2">
        {ALL_MENU_KEYS.map(key => {
          const m = menuLabels[key];
          const checked = selected.includes(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => toggleMenu(key, target)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all text-left ${
                checked
                  ? 'border-rose-400 bg-rose-50 text-rose-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                checked ? 'border-rose-500 bg-rose-500' : 'border-slate-300 bg-white'
              }`}>
                {checked && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-lg">{m.icon}</span>
              <span className="font-semibold text-sm">{m.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Account Settings</h2>
              <p className="text-white/60 text-xs">Kelola akun & hak akses menu</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {notification && (
          <div className={`mx-6 mt-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 ${
            notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
          </div>
        )}

        <div className="flex border-b border-slate-200 px-6 pt-4 flex-shrink-0">
          <button
            onClick={() => { setActiveTab('list'); setEditingUser(null); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'list' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            👥 Daftar Akun
          </button>
          <button
            onClick={() => { setActiveTab('add'); setEditingUser(null); }}
            className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all ${
              activeTab === 'add' ? 'border-rose-500 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            ➕ Tambah Akun
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div className="space-y-4">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
                </div>
              ) : editingUser ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <button onClick={() => setEditingUser(null)} className="text-slate-500 hover:text-slate-700 p-1">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <h3 className="font-bold text-slate-800">Edit: {editingUser.full_name}</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Full Name</label>
                      <input value={editingUser.full_name} onChange={e => setEditingUser({...editingUser, full_name: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Username</label>
                      <input value={editingUser.username} onChange={e => setEditingUser({...editingUser, username: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Password</label>
                      <input value={editingUser.password} onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role</label>
                      <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value})}
                        className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="superadmin">Superadmin</option>
                      </select>
                    </div>
                  </div>
                  <MenuPermissionSelector selected={editingUser.allowed_menus ?? ALL_MENU_KEYS} target="edit" />
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditingUser(null)} className="flex-1 border border-slate-300 text-slate-700 py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all text-sm">
                      Batal
                    </button>
                    <button onClick={handleSaveEdit} disabled={saving}
                      className="flex-1 bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3 rounded-lg font-semibold hover:from-rose-700 hover:to-rose-800 transition-all text-sm disabled:opacity-60 flex items-center justify-center gap-2">
                      {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                users.map(user => (
                  <div key={user.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:border-slate-300 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 ${
                          user.role === 'superadmin' ? 'bg-gradient-to-br from-rose-500 to-rose-700' :
                          user.role === 'admin' ? 'bg-gradient-to-br from-indigo-500 to-indigo-700' :
                          'bg-gradient-to-br from-slate-500 to-slate-700'
                        }`}>
                          {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-slate-800 text-sm">{user.full_name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                              user.role === 'superadmin' ? 'bg-rose-100 text-rose-700' :
                              user.role === 'admin' ? 'bg-indigo-100 text-indigo-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{user.role}</span>
                          </div>
                          <p className="text-xs text-slate-500">@{user.username}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {(user.allowed_menus ?? ALL_MENU_KEYS).map(key => (
                              <span key={key} className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                                {menuLabels[key]?.icon} {menuLabels[key]?.label.split(' ')[0]}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setEditingUser(user)}
                          className="bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 p-2 rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)}
                          className="bg-white border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 p-2 rounded-lg transition-all">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Full Name *</label>
                  <input value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}
                    placeholder="Nama lengkap"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Username *</label>
                  <input value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                    placeholder="username"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Password *</label>
                  <input type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                    placeholder="Password"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-600 tracking-widest uppercase">Role</label>
                  <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-400 outline-none bg-white">
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>

              <MenuPermissionSelector selected={newUser.allowed_menus} target="new" />

              <button onClick={handleAddUser} disabled={saving}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-3.5 rounded-xl font-semibold hover:from-rose-700 hover:to-rose-800 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 mt-2">
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                ➕ Tambah Akun
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  const [menuLoading, setMenuLoading] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeTitle, setIframeTitle] = useState<string>('');
  const [showTicketing, setShowTicketing] = useState(false);
  const [showFormRequire, setShowFormRequire] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [unreadEmails, setUnreadEmails] = useState(0);
  const [showSettings, setShowSettings] = useState(false);

  const allMenuItems: MenuItem[] = [
    {
      title: 'Form BAST & Demo',
      icon: '📋',
      key: 'form-bast',
      gradient: 'from-slate-700 via-slate-600 to-slate-500',
      description: 'Product review & handover documentation',
      items: [
        { name: 'Input Form', url: 'https://portal.indovisual.co.id/form-review-demo-produk-bast-pts/', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/1hIpMsZIadnJu85FiJ5Qojn_fOcYLl3iMsBagzZI4LYM/edit?usp=sharing', icon: '📑', embed: true }
      ]
    },
    {
      title: 'Ticket Troubleshooting',
      icon: '🎫',
      key: 'ticket-troubleshooting',
      gradient: 'from-rose-700 via-rose-600 to-rose-500',
      description: 'Technical support & issue tracking',
      items: [
        { name: 'Ticket Management', url: '/ticketing', icon: '🔧', internal: true, embed: true }
      ]
    },
    {
      title: 'Daily Report',
      icon: '📈',
      key: 'daily-report',
      gradient: 'from-emerald-700 via-emerald-600 to-emerald-500',
      description: 'Activity tracking & performance metrics',
      items: [
        { name: 'Submit Report', url: 'https://docs.google.com/forms/d/e/1FAIpQLSf2cCEPlQQcCR1IZ3GRx-ImgdJJ15rMxAoph77aNYmbl15gvw/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRMeC3gBgeCAe5YNoVE4RfdANVyjx7xmtTA7C-G40KhExzgvAJ4cGTcyFcgbp4WWx7laBdC3VZrBGd0/pubhtml?gid=1408443365&single=true', icon: '📑', embed: true },
        { name: 'View Summary', url: 'https://onedrive.live.com/edit?cid=25d404c0b5ee2b43&id=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&resid=25D404C0B5EE2B43!s232e8289fcce47eaa1561794879e62bc&ithint=file%2Cxlsx&embed=1&em=2&AllowTyping=True&ActiveCell=%27Report%27!H3&wdHideGridlines=True&wdHideHeaders=True&wdDownloadButton=True&wdInConfigurator=True%2CTrue&edaebf=ctrl&migratedtospo=true&redeem=aHR0cHM6Ly8xZHJ2Lm1zL3gvYy8yNWQ0MDRjMGI1ZWUyYjQzL0lRU0pnaTRqenZ6cVI2RldGNVNIbm1LOEFScHh6eHVwN3NHWmxLN3RnNEg2R0RVP2VtPTImQWxsb3dUeXBpbmc9VHJ1ZSZBY3RpdmVDZWxsPSdSZXBvcnQnIUgzJndkSGlkZUdyaWRsaW5lcz1UcnVlJndkSGlkZUhlYWRlcnM9VHJ1ZSZ3ZERvd25sb2FkQnV0dG9uPVRydWUmd2RJbkNvbmZpZ3VyYXRvcj1UcnVlJndkSW5Db25maWd1cmF0b3I9VHJ1ZSZlZGFlYmY9Y3RybA&wdo=2', icon: '📊', embed: true }
      ]
    },
    {
      title: 'Database PTS',
      icon: '💼',
      key: 'database-pts',
      gradient: 'from-indigo-700 via-indigo-600 to-indigo-500',
      description: 'Central repository & documentation',
      items: [
        { name: 'Access Database', url: 'https://1drv.ms/f/c/25d404c0b5ee2b43/IgBDK-61wATUIIAlAgQAAAAAARPyRqbKPJAap5G_Ol5NmA8?e=fFU8wh', icon: '🗃️', embed: false, external: true }
      ]
    },
    {
      title: 'Unit Movement Log',
      icon: '🚚',
      key: 'unit-movement',
      gradient: 'from-amber-700 via-amber-600 to-amber-500',
      description: 'Equipment check-in & check-out tracking',
      items: [
        { name: 'Submit Movement', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnfNZ1y96xei0KdMDewxGRr2nALwA0ZLW-kKPyGh5_YhK4HA/viewform?embedded=true', icon: '✍️', embed: true },
        { name: 'View Database', url: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQIVshcP1qgXMwm121wufhmpEIze-I_99qaQb1ZnuUbekpvOV-xsfKX4p-16d1UHzG3mRHIpQcNriav/pubhtml?gid=383533237&single=true', icon: '📑', embed: true }
      ]
    },
    {
      title: 'Form Require Project',
      icon: '📐',
      key: 'form-require-project',
      gradient: 'from-orange-700 via-orange-600 to-orange-500',
      description: 'Solution request, approval & PTS collaboration',
      items: [
        { name: 'Open Platform', url: '', icon: '🚀', internal: true, embed: true }
      ]
    },
  ];

  const [visibleMenuItems, setVisibleMenuItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (!currentUser) return;
    setMenuLoading(true);
    const timer = setTimeout(() => {
      const allowed = currentUser.allowed_menus;
      const roleLC = currentUser.role?.toLowerCase();
      if (!allowed || roleLC === 'superadmin' || roleLC === 'admin') {
        setVisibleMenuItems(allMenuItems);
      } else {
        setVisibleMenuItems(allMenuItems.filter(m => allowed.includes(m.key)));
      }
      setMenuLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [currentUser]);

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .single();

      if (error || !data) { alert('Username atau password salah!'); return; }
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
    setShowSidebar(false);
    setIframeUrl(null);
    setShowTicketing(false);
    setShowFormRequire(false);
    setShowSettings(false);
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0], menuTitle: string) => {
    setIframeUrl(null);
    setShowTicketing(false);
    setShowFormRequire(false);

    if (menuTitle === 'Form Require Project') {
      setShowSidebar(true);
      setShowFormRequire(true);
      setIframeTitle('Form Require Project');
      return;
    }

    if (item.internal) {
      setShowSidebar(true);
      setShowTicketing(true);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    } else if (item.external && !item.embed) {
      window.open(item.url, '_blank');
    } else if (item.embed) {
      setShowSidebar(true);
      setIframeUrl(item.url);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    }
  };

  const handleBackToDashboard = () => {
    setShowSidebar(false);
    setIframeUrl(null);
    setShowTicketing(false);
    setShowFormRequire(false);
    setIframeTitle('');
  };

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isLoggedIn) {
      const fetchUnreadEmails = async () => {
        try {
          const response = await fetch('/api/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'your-email@yourdomain.com', password: 'your-email-password', imapHost: 'srv184.niagahoster.com', imapPort: 993 })
          });
          const data = await response.json();
          if (data.success) setUnreadEmails(data.unreadCount);
        } catch (error) {
          setUnreadEmails(Math.floor(Math.random() * 10));
        }
      };
      fetchUnreadEmails();
      const interval = setInterval(fetchUnreadEmails, 300000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed"
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/75 backdrop-blur-sm p-12 rounded-lg shadow-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-slate-300 border-t-rose-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-slate-700 tracking-wide">Loading Portal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed p-4"
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/75 backdrop-blur-sm rounded-lg shadow-2xl p-10 w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-600 to-rose-700 rounded-full mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">Portal Terpadu</h1>
            <p className="text-slate-600 font-medium">Support System - IndoVisual</p>
          </div>
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">USERNAME</label>
              <input type="text" value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
                placeholder="Enter your username" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">PASSWORD</label>
              <input type="password" value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
                placeholder="Enter your password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <button onClick={handleLogin}
              className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-4 rounded-md hover:from-rose-700 hover:to-rose-800 font-semibold shadow-lg hover:shadow-xl transition-all tracking-wide">
              Sign In to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  const EmailButton = ({ position }: { position: 'bottom-left' | 'bottom-right' }) => (
    <div className={`fixed bottom-6 z-50 ${position === 'bottom-left' ? 'left-6' : 'right-6'}`}>
      <a href="https://srv184.niagahoster.com:2096/cpsess6840729072/3rdparty/roundcube/" target="_blank" rel="noopener noreferrer" className="relative group">
        <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-4 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110 flex items-center justify-center">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {unreadEmails > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white shadow-lg animate-pulse">
              {unreadEmails > 9 ? '9+' : unreadEmails}
            </span>
          )}
        </button>
        <div className="absolute bottom-full right-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          {unreadEmails > 0 ? `${unreadEmails} pesan baru` : 'Buka Outlook'}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
        </div>
      </a>
    </div>
  );

  const MenuLoadingOverlay = () => (
    <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 border-4 border-slate-200 border-t-rose-500 rounded-full animate-spin"></div>
      <p className="text-slate-600 font-semibold tracking-wide">Memuat menu...</p>
    </div>
  );

  // ── DASHBOARD UTAMA ──
  if (!showSidebar) {
    return (
      <div className="min-h-screen flex flex-col bg-cover bg-center bg-fixed"
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}

        <div className="bg-white/75 backdrop-blur-sm shadow-xl border-b border-slate-200">
          <div className="max-w-[2000px] mx-auto px-6 py-6">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="hidden md:flex w-16 h-16 bg-gradient-to-br from-rose-600 to-rose-700 rounded-lg shadow-lg items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tight">Portal Terpadu PTS</h1>
                  <p className="text-slate-600 font-medium mt-1">IndoVisual — Support System Dashboard</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {currentUser && <BellNotification currentUser={currentUser} />}
                <div className="flex items-center gap-3 bg-white/80 border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                       style={{ background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', color: '#c8861d', border: '2px solid rgba(200,134,29,0.3)' }}>
                    {currentUser?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                  </div>
                  <div>
                    <p className="font-bold text-slate-800 text-sm">{currentUser?.full_name}</p>
                    <p className="text-xs font-bold tracking-widest uppercase" style={{ color: '#b8760d' }}>{currentUser?.role}</p>
                  </div>
                </div>
                {(['admin','superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
                  <button onClick={() => setShowSettings(true)} title="Account Settings"
                    className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#4338ca' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </button>
                )}
                <button onClick={handleLogout}
                  className="flex items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-xs font-semibold transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-[2000px] mx-auto w-full px-6 py-8">
          {menuLoading ? (
            <MenuLoadingOverlay />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visibleMenuItems.map((menu, index) => (
                <div key={menu.key}
                  className="group bg-white/80 backdrop-blur-sm rounded-lg shadow-lg hover:shadow-2xl transition-all duration-300 border border-slate-200 hover:border-slate-300 overflow-hidden"
                  style={{ animation: `fadeInUp 0.4s ease ${index * 0.1}s both` }}>
                  <div className={`bg-gradient-to-r ${menu.gradient} px-6 py-5`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center text-2xl shadow-inner">
                        {menu.icon}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{menu.title}</h2>
                        <p className="text-white/70 text-xs font-medium">{menu.description}</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    {menu.items.map((item, itemIndex) => (
                      <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 px-5 py-4 rounded-md font-semibold shadow-sm hover:shadow-md transition-all text-right flex items-center justify-end gap-4 group/item">
                        {item.external && !item.embed ? (
                          <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5 text-slate-400 transition-transform group-hover/item:-translate-x-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        )}
                        <span className="flex-1 text-sm tracking-wide text-right">{item.name}</span>
                        <div className="w-10 h-10 bg-white rounded-md shadow-sm flex items-center justify-center text-xl border border-slate-200 group-hover/item:scale-110 transition-transform flex-shrink-0">
                          {item.icon}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/75 backdrop-blur-sm border-t border-slate-200 shadow-lg">
          <div className="max-w-[2000px] mx-auto px-6 py-5">
            <p className="text-slate-700 text-sm font-semibold tracking-wide text-center">
              © 2026 IndoVisual - Portal Terpadu Support (PTS IVP)
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <EmailButton position="bottom-left" />
      </div>
    );
  }

  // ── VIEW DENGAN SIDEBAR ──
  return (
    <div className="flex h-screen overflow-hidden bg-cover bg-center bg-fixed"
         style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      {showSettings && <AccountSettingsModal onClose={() => setShowSettings(false)} />}

      {/* SIDEBAR */}
      <div className={`relative flex flex-col transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'w-[72px]' : 'w-[288px]'}`}
           style={{ background: 'rgba(255,255,255,0.72)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '4px 0 24px rgba(0,0,0,0.12)' }}>

        <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: 'linear-gradient(90deg, transparent, #c8861d, transparent)' }} />

        <div className={`flex items-center border-b px-4 py-5 ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}
             style={{ borderColor: 'rgba(0,0,0,0.08)' }}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, #e2a84b, #c8861d)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                </svg>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#c8861d' }}>IndoVisual</p>
                <p className="font-bold text-sm leading-none tracking-wide" style={{ color: '#0f172a' }}>PTS Portal</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #e2a84b, #c8861d)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
          )}
          {!sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1.5 rounded-md transition-all hover:bg-black/10 text-slate-400 hover:text-slate-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {!sidebarCollapsed && (
          <div className="mx-4 my-4 px-4 py-3 rounded-xl flex items-center gap-3"
               style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
                 style={{ background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)', color: '#c8861d', border: '2px solid rgba(200,134,29,0.4)' }}>
              {currentUser?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-slate-900 text-xs font-bold truncate">{currentUser?.full_name}</p>
              <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#b8760d' }}>{currentUser?.role}</p>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-3 pb-3" style={{ scrollbarWidth: 'none' }}>
          <button onClick={handleBackToDashboard}
            className={`w-full group flex items-center gap-3 px-3 py-2.5 mb-4 rounded-xl font-semibold text-sm transition-all ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{ background: 'linear-gradient(135deg, rgba(200,134,29,0.12), rgba(200,134,29,0.06))', border: '1px solid rgba(200,134,29,0.3)', color: '#92600a' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,134,29,0.22), rgba(200,134,29,0.14))'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'linear-gradient(135deg, rgba(200,134,29,0.12), rgba(200,134,29,0.06))'; }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!sidebarCollapsed && <span className="tracking-wide">Main Menu</span>}
          </button>

          {!sidebarCollapsed && (
            <p className="px-1 mb-3 text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: 'rgba(0,0,0,0.45)' }}>Navigation</p>
          )}

          {menuLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(226,168,75,0.4)', borderTopColor: '#e2a84b' }}></div>
            </div>
          ) : (
            <div className="space-y-2">
              {visibleMenuItems.map((menu) => (
                <div key={menu.key}>
                  {sidebarCollapsed ? (
                    <div className="group relative">
                      <div className="w-full rounded-xl p-2.5 flex flex-col items-center gap-1.5 cursor-default transition-all"
                           style={{ background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.07)' }}>
                        <span className="text-xl">{menu.icon}</span>
                        <div className="flex flex-col gap-1 w-full">
                          {menu.items.map((item, itemIndex) => {
                            const isActive = (showTicketing && item.internal && menu.key !== 'form-require-project') ||
                              (showFormRequire && menu.key === 'form-require-project') ||
                              (iframeUrl === item.url);
                            return (
                              <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                                title={`${menu.title} — ${item.name}`}
                                className="w-full h-7 rounded-lg flex items-center justify-center text-sm transition-all"
                                style={isActive
                                  ? { background: 'rgba(200,134,29,0.18)', border: '1px solid rgba(200,134,29,0.45)', color: '#b8760d' }
                                  : { background: 'rgba(0,0,0,0.05)', border: '1px solid transparent', color: '#64748b' }}>
                                {item.icon}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                           style={{ filter: 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))' }}>
                        <div className="rounded-xl px-4 py-3 min-w-[160px]"
                             style={{ background: '#f8fafc', border: '1px solid rgba(200,134,29,0.25)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
                          <p className="text-[11px] font-bold tracking-widest uppercase mb-2" style={{ color: '#b8760d' }}>{menu.title}</p>
                          {menu.items.map((item, idx) => (
                            <p key={idx} className="text-xs text-slate-500 leading-5">{item.icon} {item.name}</p>
                          ))}
                        </div>
                        <div className="absolute right-full top-1/2 -translate-y-1/2 border-[6px] border-transparent" style={{ borderRightColor: '#f8fafc' }} />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                      <div className="flex items-center gap-2.5 px-4 py-2.5"
                           style={{ background: 'rgba(0,0,0,0.05)' }}>
                        <span className="text-base">{menu.icon}</span>
                        <span className="text-xs font-bold tracking-widest uppercase truncate" style={{ color: 'rgba(15,23,42,0.65)' }}>{menu.title}</span>
                      </div>
                      <div className="px-2 py-2 space-y-1" style={{ background: 'rgba(255,255,255,0.4)' }}>
                        {menu.items.map((item, itemIndex) => {
                          const isActive = (showTicketing && item.internal && menu.key !== 'form-require-project') ||
                            (showFormRequire && menu.key === 'form-require-project') ||
                            (iframeUrl === item.url);
                          return (
                            <button key={itemIndex} onClick={() => handleMenuClick(item, menu.title)}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all"
                              style={isActive
                                ? { background: 'rgba(200,134,29,0.12)', border: '1px solid rgba(200,134,29,0.3)', color: '#92600a' }
                                : { background: 'transparent', border: '1px solid transparent', color: '#1e293b' }}
                              onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.06)'; (e.currentTarget as HTMLButtonElement).style.color = '#0f172a'; } }}
                              onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#1e293b'; } }}>
                              <span className="w-7 h-7 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                                    style={{ background: isActive ? 'rgba(200,134,29,0.15)' : 'rgba(0,0,0,0.06)' }}>
                                {item.icon}
                              </span>
                              <span className="truncate tracking-wide">{item.name}</span>
                              {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#b8760d' }} />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-3 space-y-2" style={{ borderTop: '1px solid rgba(0,0,0,0.08)' }}>
          {sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(false)}
              className="w-full flex justify-center p-2 rounded-xl transition-all text-slate-400 hover:text-slate-700"
              style={{ background: 'rgba(0,0,0,0.05)' }}
              title="Expand sidebar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <div className={`flex gap-2 ${sidebarCollapsed ? 'flex-col' : ''}`}>
            {(['admin','superadmin'].includes(currentUser?.role?.toLowerCase() ?? '')) && (
              <button onClick={() => setShowSettings(true)} title="Account Settings"
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${sidebarCollapsed ? 'w-full px-2' : 'flex-1 px-3'}`}
                style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.35)', color: '#4338ca' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(99,102,241,0.12)'; }}>
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {!sidebarCollapsed && <span>Settings</span>}
              </button>
            )}
            <button onClick={handleLogout} title="Sign Out"
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition-all ${sidebarCollapsed ? 'w-full px-2' : 'flex-1 px-3'}`}
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)'; }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!showFormRequire && (
          <div className="bg-white/75 backdrop-blur-sm shadow-lg p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{iframeTitle}</h1>
                <p className="text-sm text-slate-600 font-medium mt-1">Use the sidebar to navigate or return to the dashboard</p>
              </div>
              <button onClick={handleBackToDashboard}
                className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white px-6 py-3 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden bg-white">
          {showFormRequire && currentUser ? (
            <FormRequireProject currentUser={currentUser} />
          ) : showTicketing ? (
            <div className="w-full h-full overflow-auto">
              <iframe src="/ticketing" className="w-full h-full border-0" title="Ticketing System" />
            </div>
          ) : iframeUrl ? (
            <iframe src={iframeUrl} className="w-full h-full border-0" title={iframeTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          ) : null}
        </div>

        {!showFormRequire && (
          <div className="bg-white/75 backdrop-blur-sm border-t border-slate-200 shadow-lg">
            <div className="px-6 py-5">
              <p className="text-slate-700 text-sm font-semibold tracking-wide text-center">
                © 2026 IndoVisual - Portal Terpadu Support (PTS IVP)
              </p>
            </div>
          </div>
        )}
      </div>

      <EmailButton position="bottom-right" />
    </div>
  );
}
