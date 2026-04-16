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
  kebutuhan_other: string;
  solution_product: string[];
  solution_other: string;
  layout_signage: string[];
  jaringan_cms: string[];
  jumlah_input: string;
  jumlah_output: string;
  source: string[];
  source_other: string;
  camera_conference: string;
  camera_jumlah: string;
  camera_tracking: string[];
  audio_system: string;
  audio_mixer: string;
  audio_detail: string[];
  wallplate_input: string;
  wallplate_jumlah: string;
  tabletop_input: string;
  tabletop_jumlah: string;
  wireless_presentation: string;
  wireless_mode: string[];
  wireless_dongle: string;
  controller_automation: string;
  controller_type: string[];
  ukuran_ruangan: string;
  suggest_tampilan: string;
  keterangan_lain: string;
  pts_assigned?: string;
  approved_by?: string;
  approved_at?: string;
  due_date?: string;
}

interface ProjectMessage {
  id: string;
  request_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  created_at: string;
}

interface ProjectAttachment {
  id: string;
  request_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  uploaded_at: string;
  attachment_category?: 'general' | 'sld' | 'boq' | 'design3d';
  revision_version?: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:     { label: 'Pending',     color: '#92400e', bg: '#fef3c7', border: '#f59e0b', icon: '⏳' },
  approved:    { label: 'Approved',    color: '#065f46', bg: '#d1fae5', border: '#10b981', icon: '✅' },
  in_progress: { label: 'In Progress', color: '#1d4ed8', bg: '#dbeafe', border: '#3b82f6', icon: '🔄' },
  completed:   { label: 'Completed',   color: '#065f46', bg: '#d1fae5', border: '#10b981', icon: '✅' },
  rejected:    { label: 'Rejected',    color: '#374151', bg: '#f3f4f6', border: '#6b7280', icon: '❌' },
};

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDueDate(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ─── Status Badge Component ─────────────────────────────────────────────────

function StatusBadge({ status, onHeader }: { status: string; onHeader?: boolean }) {
  const c = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const solidBg: Record<string, string> = {
    pending: '#d97706',
    approved: '#059669',
    in_progress: '#2563eb',
    completed: '#059669',
    rejected: '#4b5563',
  };
  if (onHeader) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold"
        style={{ color: '#fff', background: solidBg[status] || '#6b7280', border: '2px solid rgba(255,255,255,0.6)', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }}>
        {c.icon} {c.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.color }} />
      {c.label}
    </span>
  );
}

// ─── MiniPieChart ───────────────────────────────────────────────────────────

function MiniPieChart({ data, title, icon, onSliceClick }: { data: { label: string; value: number; color: string }[]; title: string; icon: string; onSliceClick?: (label: string) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{icon} {title}</p>
      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
    </div>
  );

  let cumulativeAngle = -Math.PI / 2;
  const cx = 60, cy = 60, r = 50, innerR = 28;
  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumulativeAngle);
    const y1 = cy + r * Math.sin(cumulativeAngle);
    const x2 = cx + r * Math.cos(cumulativeAngle + angle);
    const y2 = cy + r * Math.sin(cumulativeAngle + angle);
    const xi1 = cx + innerR * Math.cos(cumulativeAngle);
    const yi1 = cy + innerR * Math.sin(cumulativeAngle);
    const xi2 = cx + innerR * Math.cos(cumulativeAngle + angle);
    const yi2 = cy + innerR * Math.sin(cumulativeAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`;
    cumulativeAngle += angle;
    return { ...d, path, i };
  });

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map((s) => (
            <path key={s.i} d={s.path} fill={s.color}
              opacity={hovered === null || hovered === s.i ? 1 : 0.45}
              style={{ cursor: onSliceClick ? 'pointer' : 'default', transition: 'opacity 0.15s' }}
              onMouseEnter={() => setHovered(s.i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSliceClick && onSliceClick(s.label)} />
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {slices.map((s) => (
            <div key={s.i} className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all" style={{ background: hovered === s.i ? `${s.color}15` : 'transparent' }}
              onMouseEnter={() => setHovered(s.i)} onMouseLeave={() => setHovered(null)} onClick={() => onSliceClick && onSliceClick(s.label)}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
              <span className="text-[10px] font-bold flex-shrink-0" style={{ color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

function FormRequireProject({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'list' | 'new-form' | 'detail'>('list');
  const [requests, setRequests] = useState<ProjectRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ProjectRequest | null>(null);
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [attachments, setAttachments] = useState<ProjectAttachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msgText, setMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSales, setSearchSales] = useState('');
  const [unreadMsgMap, setUnreadMsgMap] = useState<Record<string, number>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const sldFileRef = useRef<HTMLInputElement>(null);
  const boqFileRef = useRef<HTMLInputElement>(null);
  const design3dFileRef = useRef<HTMLInputElement>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const [uploadingCategory, setUploadingCategory] = useState<'sld' | 'boq' | 'design3d' | null>(null);
  const [activeAttachTab, setActiveAttachTab] = useState<'all' | 'sld' | 'boq' | 'design3d'>('all');
  const [rejectModal, setRejectModal] = useState<{ open: boolean; req: ProjectRequest | null }>({ open: false, req: null });
  const [rejectNote, setRejectNote] = useState('');
  const [editFormModal, setEditFormModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});

  const role = currentUser.role?.toLowerCase().trim() ?? '';
  const isPTS = ['admin', 'superadmin', 'team_pts', 'team'].includes(role);
  const isTeamPTS = role === 'team_pts' || role === 'team';

  const initialForm = {
    project_name: '', room_name: '', sales_name: '',
    kebutuhan: [] as string[], kebutuhan_other: '',
    solution_product: [] as string[], solution_other: '',
    layout_signage: [] as string[], jaringan_cms: [] as string[],
    jumlah_input: '', jumlah_output: '',
    source: [] as string[], source_other: '',
    camera_conference: 'No', camera_jumlah: '', camera_tracking: [] as string[],
    audio_system: 'No', audio_mixer: '', audio_detail: [] as string[],
    wallplate_input: 'No', wallplate_jumlah: '',
    tabletop_input: 'No', tabletop_jumlah: '',
    wireless_presentation: 'No', wireless_mode: [] as string[], wireless_dongle: 'No',
    controller_automation: 'No', controller_type: [] as string[],
    ukuran_ruangan: '', suggest_tampilan: '', keterangan_lain: '',
  };

  const [form, setForm] = useState(initialForm);
  const [dueDateForm, setDueDateForm] = useState('');
  const [surveyPhotos, setSurveyPhotos] = useState<File[]>([]);
  const [surveyPhotosPreviews, setSurveyPhotosPreviews] = useState<string[]>([]);
  const surveyPhotoRef = useRef<HTMLInputElement>(null);

  const notify = useCallback((type: 'success' | 'error' | 'info', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('project_requests').select('*').order('created_at', { ascending: false });
    if (!isPTS) query = query.eq('requester_id', currentUser.id);
    const { data, error } = await query;
    if (!error && data) {
      setRequests(data as ProjectRequest[]);
      const ids = (data as ProjectRequest[]).map(r => r.id);
      if (ids.length > 0) {
        const { data: msgData } = await supabase.from('project_messages').select('request_id, created_at').in('request_id', ids).neq('sender_role', 'system').order('created_at', { ascending: false });
        if (msgData) {
          const counts: Record<string, number> = {};
          const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
          for (const row of msgData as { request_id: string; created_at: string }[]) {
            const lastSeen = stored[row.request_id] || 0;
            const msgTime = new Date(row.created_at).getTime();
            if (msgTime > lastSeen) counts[row.request_id] = (counts[row.request_id] || 0) + 1;
          }
          setUnreadMsgMap(counts);
        }
      }
    }
    setLoading(false);
  }, [currentUser.id, isPTS]);

  const fetchMessages = useCallback(async (requestId: string) => {
    const { data } = await supabase.from('project_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
    if (data) setMessages(data as ProjectMessage[]);
  }, []);

  const fetchAttachments = useCallback(async (requestId: string) => {
    const { data } = await supabase.from('project_attachments').select('*').eq('request_id', requestId).order('uploaded_at', { ascending: false });
    if (data) setAttachments(data as ProjectAttachment[]);
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    const channel = supabase.channel('global_messages_notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_messages' }, (payload) => {
        const msg = payload.new as ProjectMessage;
        if (msg.sender_role === 'system') return;
        if (!selectedRequest || selectedRequest.id !== msg.request_id) {
          setUnreadMsgMap(prev => ({ ...prev, [msg.request_id]: (prev[msg.request_id] || 0) + 1 }));
        }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRequest]);

  useEffect(() => {
    if (!isPTS) return;
    setUnreadCount(requests.filter(r => r.status === 'pending').length);
  }, [requests, isPTS]);

  useEffect(() => {
    if (!selectedRequest) { activeRequestIdRef.current = null; return; }
    const reqId = selectedRequest.id;
    activeRequestIdRef.current = reqId;
    const channel = supabase.channel(`detail_${reqId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `request_id=eq.${reqId}` }, (payload) => {
        if (activeRequestIdRef.current !== reqId) return;
        setMessages(prev => [...prev, payload.new as ProjectMessage]);
        const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
        stored[reqId] = Date.now();
        localStorage.setItem('pts_last_seen', JSON.stringify(stored));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_attachments', filter: `request_id=eq.${reqId}` }, () => {
        if (activeRequestIdRef.current !== reqId) return;
        fetchAttachments(reqId);
      }).subscribe();
    const pollInterval = setInterval(async () => {
      if (activeRequestIdRef.current !== reqId) return;
      const { data } = await supabase.from('project_messages').select('*').eq('request_id', reqId).order('created_at', { ascending: true });
      if (data && activeRequestIdRef.current === reqId && data.length !== messages.length) setMessages(data as ProjectMessage[]);
    }, 3000);
    return () => { activeRequestIdRef.current = null; clearInterval(pollInterval); supabase.removeChannel(channel); };
  }, [selectedRequest?.id, fetchAttachments, messages.length]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleArr = (arr: string[], val: string): string[] => arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSubmitForm = async () => {
    if (!form.project_name.trim()) { notify('error', 'Nama Project wajib diisi!'); return; }
    if (form.kebutuhan.length === 0 && !form.kebutuhan_other.trim()) { notify('error', 'Pilih minimal satu Kategori Kebutuhan!'); return; }
    if (form.solution_product.length === 0 && !form.solution_other.trim()) { notify('error', 'Pilih minimal satu Solution Product!'); return; }
    setSubmitting(true);
    try {
      const payload = { ...form, requester_id: currentUser.id, requester_name: currentUser.full_name, status: 'pending' as const, due_date: dueDateForm || null };
      const { data, error } = await supabase.from('project_requests').insert([payload]).select().single();
      if (error) throw error;
      if (data?.id) {
        await supabase.from('project_messages').insert([{ request_id: data.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `📋 Request baru dari ${currentUser.full_name} telah masuk dan menunggu approval.` }]);
        if (surveyPhotos.length > 0) {
          for (const photo of surveyPhotos) {
            const filePath = `project-files/${data.id}/survey-${Date.now()}-${photo.name}`;
            await supabase.storage.from('project-files').upload(filePath, photo);
            const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
            await supabase.from('project_attachments').insert([{ request_id: data.id, file_name: photo.name, file_url: urlData.publicUrl, file_type: photo.type, file_size: photo.size, uploaded_by: currentUser.full_name }]);
          }
        }
      }
      notify('success', '✅ Form berhasil dikirim!');
      setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]); setView('list'); fetchRequests();
    } catch { notify('error', 'Terjadi kesalahan.'); } finally { setSubmitting(false); }
  };

  const handleApprove = async (req: ProjectRequest) => {
    const { error } = await supabase.from('project_requests').update({ status: 'approved', approved_by: currentUser.full_name, approved_at: new Date().toISOString(), pts_assigned: currentUser.full_name }).eq('id', req.id);
    if (error) { notify('error', 'Gagal approve'); return; }
    notify('success', 'Request diapprove!');
    fetchRequests();
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `✅ Request telah diapprove oleh ${currentUser.full_name}.` }]);
  };

  const handleReject = (req: ProjectRequest) => { setRejectNote(''); setRejectModal({ open: true, req }); };
  const handleRejectConfirm = async () => {
    const req = rejectModal.req;
    if (!req) return;
    await supabase.from('project_requests').update({ status: 'rejected' }).eq('id', req.id);
    notify('info', 'Request ditolak.');
    setRejectModal({ open: false, req: null });
    setRejectNote('');
    fetchRequests();
    const noteMsg = rejectNote.trim() ? ` Alasan: ${rejectNote.trim()}` : '';
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `❌ Request ditolak oleh ${currentUser.full_name}.${noteMsg}` }]);
  };

  const handleStatusUpdate = async (req: ProjectRequest, newStatus: string) => {
    await supabase.from('project_requests').update({ status: newStatus }).eq('id', req.id);
    notify('success', `Status → ${newStatus}`);
    fetchRequests();
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `🔄 Status diupdate menjadi: ${newStatus}` }]);
  };

  const handleOpenDetail = async (req: ProjectRequest) => {
    activeRequestIdRef.current = req.id;
    setSelectedRequest(req);
    await fetchMessages(req.id);
    await fetchAttachments(req.id);
    const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
    stored[req.id] = Date.now();
    localStorage.setItem('pts_last_seen', JSON.stringify(stored));
    setUnreadMsgMap(prev => { const n = { ...prev }; delete n[req.id]; return n; });
    setView('detail');
  };

  const handleSendMessage = async () => {
    if (!msgText.trim() || !selectedRequest || selectedRequest.status === 'rejected') return;
    setSendingMsg(true);
    await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: msgText.trim() }]);
    setSendingMsg(false);
    setMsgText('');
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedRequest) return;
    setUploadingFile(true);
    const filePath = `project-files/${selectedRequest.id}/${Date.now()}-${file.name}`;
    await supabase.storage.from('project-files').upload(filePath, file);
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
    await supabase.from('project_attachments').insert([{ request_id: selectedRequest.id, file_name: file.name, file_url: urlData.publicUrl, file_type: file.type, file_size: file.size, uploaded_by: currentUser.full_name, attachment_category: 'general' }]);
    setUploadingFile(false);
    notify('success', `File "${file.name}" berhasil diupload!`);
    fetchAttachments(selectedRequest.id);
    await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `📎 Melampirkan file: ${file.name}` }]);
  };

  const handleCategoryUpload = async (file: File, category: 'sld' | 'boq' | 'design3d') => {
    if (!selectedRequest) return;
    setUploadingCategory(category);
    const existing = attachments.filter(a => a.attachment_category === category);
    const revisionNum = existing.length + 1;
    const label = category === 'sld' ? 'SLD' : category === 'boq' ? 'BOQ' : 'Design 3D';
    const filePath = `project-files/${selectedRequest.id}/${category}-rev${revisionNum}-${Date.now()}-${file.name}`;
    await supabase.storage.from('project-files').upload(filePath, file);
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
    await supabase.from('project_attachments').insert([{ request_id: selectedRequest.id, file_name: file.name, file_url: urlData.publicUrl, file_type: file.type, file_size: file.size, uploaded_by: currentUser.full_name, attachment_category: category, revision_version: revisionNum }]);
    setUploadingCategory(null);
    notify('success', `${label} Rev.${revisionNum} berhasil diupload!`);
    fetchAttachments(selectedRequest.id);
  };

  const filteredRequests = requests.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchProject = !searchQuery || r.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSales = !searchSales || (r.sales_name || '').toLowerCase().includes(searchSales.toLowerCase());
    return matchStatus && matchProject && matchSales;
  });

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress' || r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  const statusPieData = Object.entries({
    Pending: stats.pending,
    Approved: requests.filter(r => r.status === 'approved').length,
    InProgress: requests.filter(r => r.status === 'in_progress').length,
    Completed: stats.completed,
    Rejected: stats.rejected,
  }).filter(([_, v]) => v > 0).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));

  const NotifToast = () => notification ? (
    <div className={`fixed top-5 right-5 z-[200] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 text-white ${notification.type === 'success' ? 'bg-emerald-600' : notification.type === 'error' ? 'bg-red-600' : 'bg-blue-600'}`}>
      {notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'} {notification.msg}
    </div>
  ) : null;

  // ── LIST VIEW ─────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div className="min-h-full p-4 md:p-6 bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <NotifToast />
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 pointer-events-none">
        <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
      </div>

      {/* Header Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-1">🏗️ Form Require Project</h1>
            <p className="text-gray-800 font-bold text-lg">IVP Product — AV Solution Request</p>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as: <span className="font-bold text-red-600">{currentUser.full_name}</span>
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${currentUser.role === 'superadmin' ? 'bg-red-100 text-red-800' : currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                {currentUser.role === 'superadmin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin / PTS' : 'User / Sales'}
              </span>
              {unreadCount > 0 && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-bold animate-pulse">🔔 {unreadCount} pending approval</span>}
            </p>
          </div>
          {!isPTS && (
            <button onClick={() => setView('new-form')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Buat Request Baru
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Total Request', value: stats.total, sub: 'Semua request', gradient: 'linear-gradient(135deg,#4f46e5,#6d28d9)', icon: '📋', onClick: () => setFilterStatus('all'), active: filterStatus === 'all' },
          { label: 'Pending', value: stats.pending, sub: 'Menunggu approval', gradient: 'linear-gradient(135deg,#d97706,#b45309)', icon: '⏳', onClick: () => setFilterStatus('pending'), active: filterStatus === 'pending' },
          { label: 'In Progress', value: stats.in_progress, sub: 'Approved & On-going', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)', icon: '🔄', onClick: () => setFilterStatus('in_progress'), active: filterStatus === 'in_progress' },
          { label: 'Completed', value: stats.completed, sub: 'Selesai ditangani', gradient: 'linear-gradient(135deg,#059669,#047857)', icon: '✅', onClick: () => setFilterStatus('completed'), active: filterStatus === 'completed' },
          { label: 'Rejected', value: stats.rejected, sub: 'Ditolak', gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)', icon: '🚫', onClick: () => setFilterStatus('rejected'), active: filterStatus === 'rejected' },
        ].map(card => (
          <div key={card.label} onClick={card.onClick} className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.03] select-none" style={{ background: card.gradient, boxShadow: `0 4px 16px rgba(0,0,0,0.15)`, outline: card.active ? '3px solid white' : 'none', transform: card.active ? 'scale(1.04)' : undefined }}>
            <div className="absolute right-3 top-2 text-4xl opacity-[0.15] select-none">{card.icon}</div>
            {card.active && <div className="absolute inset-0 rounded-2xl border-4 border-white/50 pointer-events-none" />}
            <span className="text-3xl font-black text-white leading-none">{card.value}</span>
            <div><p className="text-sm font-bold text-white leading-tight">{card.label}</p><p className="text-[10px] font-medium text-white/75">{card.sub}</p></div>
            {card.active && <span className="absolute top-2 left-2 text-white/80 text-[9px] font-bold uppercase tracking-widest">Filter Aktif ✓</span>}
          </div>
        ))}
      </div>

      {/* Pie Chart */}
      <div className="mb-6"><MiniPieChart data={statusPieData} title="Status Request" icon="📊" onSliceClick={(label) => { const map: Record<string, string> = { Pending: 'pending', Approved: 'approved', InProgress: 'in_progress', Completed: 'completed', Rejected: 'rejected' }; if (map[label]) setFilterStatus(map[label]); }} /></div>

      {/* Filter chips */}
      {(filterStatus !== 'all' || searchQuery || searchSales) && (
        <div className="flex flex-wrap gap-2 items-center mb-4">
          <span className="text-xs font-bold text-white uppercase tracking-widest">Filter:</span>
          {filterStatus !== 'all' && <button onClick={() => setFilterStatus('all')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-amber-600">Status: {STATUS_CONFIG[filterStatus]?.label} ✕</button>}
          {searchQuery && <button onClick={() => setSearchQuery('')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gray-600">🔍 {searchQuery} ✕</button>}
          {searchSales && <button onClick={() => setSearchSales('')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-gray-600">👤 {searchSales} ✕</button>}
          <button onClick={() => { setFilterStatus('all'); setSearchQuery(''); setSearchSales(''); }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white bg-black/30">Reset Semua</button>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 px-6 py-4 mb-4 flex flex-col md:flex-row gap-3">
        <div className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>
          <div className="flex-1"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Project</p><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by project name..." className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none" /></div>
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400">✕</button>}
        </div>
        <div className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-red-400 focus-within:ring-2 focus-within:ring-red-100">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <div className="flex-1"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Search Sales</p><input value={searchSales} onChange={e => setSearchSales(e.target.value)} placeholder="Search by sales name..." className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none" /></div>
          {searchSales && <button onClick={() => setSearchSales('')} className="text-gray-400">✕</button>}
        </div>
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 min-w-[200px]">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
          <div className="flex-1"><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter Status</p><select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none"><option value="all">All Status</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="rejected">Rejected</option></select></div>
        </div>
      </div>

      {/* Ticket List */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2"><span className="text-sm font-bold text-gray-700">TICKET LIST</span><span className="bg-red-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredRequests.length}</span></div>
          <button onClick={fetchRequests} className="flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>Refresh</button>
        </div>

        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.3fr_1.1fr] px-5 py-2.5 border-b border-gray-100 bg-gray-50/50 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          <span>Nama Project</span><span>Nama Ruangan</span><span>Sales</span><span>Status Handle</span><span>Created By</span><span className="text-right">Action</span>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4"><div className="w-12 h-12 border-4 border-gray-200 border-t-red-600 rounded-full animate-spin" /><p className="text-gray-500 font-semibold">Memuat data...</p></div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16"><div className="text-4xl mb-3">📭</div><p className="text-gray-600 font-semibold">Tidak ada data ditemukan</p></div>
          ) : filteredRequests.map(req => {
            const unread = unreadMsgMap[req.id] || 0;
            return (
              <div key={req.id} className="grid md:grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.3fr_1.1fr] px-5 py-3.5 hover:bg-red-50/30 transition-colors cursor-pointer group items-center" onClick={() => handleOpenDetail(req)}>
                <div className="min-w-0 pr-3"><div className="flex items-center gap-2 flex-wrap"><p className="font-bold text-gray-800 text-sm group-hover:text-red-700 truncate">{req.project_name}</p>{unread > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unread > 9 ? '9+' : unread}💬</span>}</div><p className="text-[11px] text-gray-400 mt-0.5">{formatDate(req.created_at)}</p><div className="md:hidden mt-1.5"><StatusBadge status={req.status} /></div></div>
                <div className="hidden md:block pr-3"><p className="text-sm text-gray-700 font-medium truncate">{req.room_name || '—'}</p></div>
                <div className="hidden md:block pr-3"><p className="text-sm text-gray-700 font-medium truncate">{req.sales_name || '—'}</p></div>
                <div className="hidden md:block pr-3"><StatusBadge status={req.status} /></div>
                <div className="hidden md:block pr-3"><p className="text-sm text-gray-700 font-medium truncate">{req.requester_name}</p><p className="text-[11px] text-gray-400">{req.due_date ? `Target: ${formatDueDate(req.due_date)}` : ''}</p></div>
                <div className="hidden md:flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                  {isPTS && !isTeamPTS && req.status === 'pending' && (<><button onClick={() => handleApprove(req)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold">✅ Approve</button><button onClick={() => handleReject(req)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 px-2.5 py-1.5 rounded-lg text-xs font-bold">❌ Tolak</button></>)}
                  <button onClick={() => handleOpenDetail(req)} className="w-8 h-8 bg-gray-100 hover:bg-red-50 border border-gray-200 rounded-lg flex items-center justify-center"><svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // ── NEW FORM VIEW ─────────────────────────────────────────────────────────
  if (view === 'new-form') return (
    <div className="min-h-full p-4 md:p-6 bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <NotifToast />
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 pointer-events-none"><div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" /></div>

      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-red-600">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg,#4b5563,#374151)', boxShadow: '0 4px 14px rgba(75,85,99,0.4)' }}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Kembali</button>
          <div><h1 className="text-2xl md:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">📋 Form Equipment Request — IVP</h1><p className="text-gray-600 text-sm">Requester: <span className="font-bold text-red-600">{currentUser.full_name}</span></p></div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto space-y-5">
        {/* Form sections with consistent styling */}
        <div className="rounded-2xl p-6 border-2" style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }}>
          <h3 className="text-base font-bold text-gray-800 mb-5 pb-3 border-b-2 border-gray-200 flex items-center gap-2"><span className="w-8 h-8 bg-red-600 text-white rounded-lg flex items-center justify-center">📁</span>Informasi Project</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Project *</label><input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 bg-white outline-none" /></div>
            <div><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Nama Ruangan</label><input value={form.room_name} onChange={e => setForm({ ...form, room_name: e.target.value })} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 bg-white outline-none" /></div>
            <div className="md:col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase mb-1">Sales / Account</label><input value={form.sales_name} onChange={e => setForm({ ...form, sales_name: e.target.value })} className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 bg-white outline-none" /></div>
          </div>
        </div>

        {/* Submit button */}
        <div className="rounded-2xl p-6 border-2" style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'rgba(0,0,0,0.08)' }}>
          <div className="flex gap-4">
            <button onClick={() => setView('list')} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: 'rgba(255,255,255,0.55)', color: '#64748b', border: '1px solid rgba(0,0,0,0.12)' }}>Batal</button>
            <button onClick={handleSubmitForm} disabled={submitting} className="flex-[2] text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50" style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}>{submitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2z" /></svg>Kirim Request</>}</button>
          </div>
        </div>
      </div>
    </div>
  );

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────
  if (view === 'detail' && selectedRequest) return (
    <div className="h-full flex flex-col bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <NotifToast />
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-600 pointer-events-none"><div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" /></div>

      <div className="bg-white/95 backdrop-blur-md border-b-4 border-red-600 px-6 py-4 flex-shrink-0 shadow-xl">
        <div className="flex items-center gap-4">
          <button onClick={() => { activeRequestIdRef.current = null; setView('list'); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white hover:scale-105" style={{ background: 'linear-gradient(135deg,#4b5563,#374151)' }}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Kembali</button>
          <div><h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">{selectedRequest.project_name}</h2><p className="text-gray-600 text-sm">{selectedRequest.room_name} · {selectedRequest.requester_name} · {formatDate(selectedRequest.created_at)}</p></div>
          <StatusBadge status={selectedRequest.status} onHeader />
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[400px] flex-shrink-0 border-r-2 border-gray-200 bg-white/90 backdrop-blur-sm overflow-y-auto p-5">
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)' }}>
            <p className="text-xs font-bold text-red-600 uppercase">Detail Kebutuhan</p>
            {selectedRequest.kebutuhan?.length > 0 && <div><span className="font-bold">Kebutuhan:</span> {selectedRequest.kebutuhan.join(', ')}</div>}
            {selectedRequest.solution_product?.length > 0 && <div><span className="font-bold">Solution:</span> {selectedRequest.solution_product.join(', ')}</div>}
            {selectedRequest.ukuran_ruangan && <div><span className="font-bold">Ukuran Ruangan:</span> {selectedRequest.ukuran_ruangan}</div>}
            {selectedRequest.keterangan_lain && <div><span className="font-bold">Catatan:</span> {selectedRequest.keterangan_lain}</div>}
          </div>
        </div>

        <div className="flex-1 flex flex-col bg-white/80 backdrop-blur-sm">
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4"><p className="font-bold text-white">💬 Activity & Q&A</p></div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/80">
            {messages.length === 0 ? <div className="text-center py-10 text-gray-400">Belum ada percakapan.</div> : messages.map(msg => {
              const isMe = msg.sender_id === currentUser.id;
              if (msg.sender_role === 'system') return <div key={msg.id} className="text-center text-gray-500 text-xs bg-gray-200 px-3 py-1 rounded-full w-fit mx-auto">{msg.message}</div>;
              return (
                <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${isMe ? 'bg-red-600' : 'bg-gray-500'}`}>{msg.sender_name?.charAt(0)}</div>
                  <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${isMe ? 'bg-red-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 rounded-tl-sm'}`}>{msg.message}<div className="text-[10px] mt-1 opacity-70">{formatDate(msg.created_at)}</div></div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
          <div className="bg-white border-t p-4"><textarea value={msgText} onChange={e => setMsgText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }} placeholder="Ketik pesan... (Enter untuk kirim)" className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 resize-none focus:border-red-400 outline-none" rows={2} /></div>
        </div>
      </div>
    </div>
  );

  return null;
}

// ─── Page Entry ─────────────────────────────────────────────────────────────

export default function FormRequireProjectPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const saved = localStorage.getItem('currentUser');
      if (!saved) { setLoading(false); return; }
      try {
        const parsed = JSON.parse(saved);
        setCurrentUser(parsed);
        const { data } = await supabase.from('users').select('*').eq('id', parsed.id).single();
        if (data) { setCurrentUser(data as User); localStorage.setItem('currentUser', JSON.stringify(data)); }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(/IVP_Background.png)' }}><div className="bg-white/80 p-10 rounded-2xl"><div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" /></div></div>;
  if (!currentUser) return <div className="min-h-screen flex items-center justify-center bg-cover bg-center" style={{ backgroundImage: 'url(/IVP_Background.png)' }}><div className="bg-white/90 p-10 rounded-2xl text-center border-4 border-red-600"><h2 className="text-xl font-bold">Akses Ditolak</h2><a href="/dashboard" className="mt-4 inline-block bg-red-600 text-white px-6 py-2 rounded-xl">← Kembali ke Dashboard</a></div></div>;

  return <FormRequireProject currentUser={currentUser} />;
}
