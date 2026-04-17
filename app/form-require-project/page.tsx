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
  sales_division?: string;
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
  attachments?: ProjectAttachment[];
}

interface ProjectAttachment {
  id: string;
  message_id?: string;
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

// ─── SVG Pie Chart Component ─────────────────────────────────────────────────

interface PieChartItem {
  label: string;
  value: number;
  color: string;
}

function SvgPieChart({ items, title, icon }: { items: PieChartItem[]; title: string; icon: string }) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-md flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm">{icon}</span>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
        </div>
        <div className="flex items-center justify-center flex-1 py-4">
          <p className="text-xs text-gray-400 font-medium">No data yet</p>
        </div>
      </div>
    );
  }

  const cx = 50; const cy = 50; const r = 38;
  let startAngle = -90;
  const slices: { d: string; color: string }[] = [];

  for (const item of items) {
    if (item.value === 0) continue;
    const angle = (item.value / total) * 360;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos((startAngle * Math.PI) / 180);
    const y1 = cy + r * Math.sin((startAngle * Math.PI) / 180);
    const x2 = cx + r * Math.cos((endAngle * Math.PI) / 180);
    const y2 = cy + r * Math.sin((endAngle * Math.PI) / 180);
    const large = angle > 180 ? 1 : 0;
    slices.push({ d: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, color: item.color });
    startAngle = endAngle;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-md flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-center gap-4 flex-1">
        <svg viewBox="0 0 100 100" className="w-20 h-20 flex-shrink-0">
          {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
          <circle cx={cx} cy={cy} r={18} fill="white" />
          <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="12" fontWeight="bold" fill="#374151">{total}</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {items.filter(i => i.value > 0).map((item, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
              <span className="text-xs text-gray-600 font-medium truncate">{item.label}</span>
              <span className="text-xs font-bold text-gray-800 ml-auto flex-shrink-0">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Assign PTS Modal ─────────────────────────────────────────────────────────

interface AssignPTSModalProps {
  req: ProjectRequest;
  onClose: () => void;
  onAssigned: () => void;
  currentUser: User;
}

function AssignPTSModal({ req, onClose, onAssigned, currentUser }: AssignPTSModalProps) {
  const [teamMembers, setTeamMembers] = useState<{ id: string; full_name: string; role: string }[]>([]);
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('users').select('id, full_name, role').in('role', ['admin', 'superadmin', 'team_pts', 'team']).then((res: { data: { id: string; full_name: string; role: string }[] | null }) => {
      if (res.data) setTeamMembers(res.data);
    });
  }, []);

  const handleAssign = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from('project_requests').update({
      status: 'approved',
      approved_by: currentUser.full_name,
      approved_at: new Date().toISOString(),
      pts_assigned: selected,
    }).eq('id', req.id);
    if (!error) {
      await supabase.from('project_messages').insert([{
        request_id: req.id,
        sender_id: currentUser.id,
        sender_name: 'System',
        sender_role: 'system',
        message: `✅ Request diapprove oleh ${currentUser.full_name} dan di-assign ke: ${selected}`,
      }]);
      onAssigned();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-teal-500 animate-scale-in">
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h3 className="font-bold text-lg">Approve & Assign Tim PTS</h3>
            <p className="text-teal-100 text-xs mt-0.5">{req.project_name}</p>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Pilih Anggota Tim PTS</label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {teamMembers.map(m => (
                <button key={m.id} type="button" onClick={() => setSelected(m.full_name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${selected === m.full_name ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 hover:border-teal-300 text-gray-700'}`}>
                  <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${selected === m.full_name ? 'border-teal-500' : 'border-gray-300'}`}>
                    {selected === m.full_name && <div className="w-2 h-2 rounded-full bg-teal-500" />}
                  </div>
                  <span>{m.full_name}</span>
                  <span className="ml-auto text-xs text-gray-400 font-normal">{m.role}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={handleAssign} disabled={!selected || saving}
            className="w-full bg-gradient-to-r from-teal-600 to-teal-800 text-white py-3 rounded-xl font-bold hover:from-teal-700 hover:to-teal-900 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
            Approve & Assign
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form Require Project Module ─────────────────────────────────────────────

function FormRequireProject({ currentUser }: { currentUser: User }) {
  const [view, setView] = useState<'list' | 'detail'>('list');
  const [showNewFormModal, setShowNewFormModal] = useState(false);
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
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSales, setSearchSales] = useState('');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterHandler, setFilterHandler] = useState<string>('');
  const [unreadMsgMap, setUnreadMsgMap] = useState<Record<string, number>>({});
  const [lastSeenMap, setLastSeenMap] = useState<Record<string, number>>({});
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
  const [assignModal, setAssignModal] = useState<{ open: boolean; req: ProjectRequest | null }>({ open: false, req: null });
  const [editFormData, setEditFormData] = useState({
    project_name: '', room_name: '', sales_name: '', sales_division: '',
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
  });

  const role = currentUser.role?.toLowerCase().trim() ?? '';
  const isPTS = ['admin', 'superadmin', 'team_pts', 'team'].includes(role);
  const isTeamPTS = role === 'team_pts' || role === 'team';
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin';

  const SALES_DIVISIONS = ['OSS', 'IVP', 'IDC', 'Enterprise', 'Lainnya'];

  const initialForm = {
    project_name: '', room_name: '', sales_name: '', sales_division: '',
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
    if (!isPTS) {
      // Guest/Sales: only their own requests
      query = query.eq('requester_id', currentUser.id);
    } else if (isTeamPTS) {
      // Team PTS: only tickets assigned to them
      query = query.eq('pts_assigned', currentUser.full_name);
    }
    // admin/superadmin: see all
    const { data, error } = await query;
    if (!error && data) {
      setRequests(data as ProjectRequest[]);
      const ids = (data as ProjectRequest[]).map(r => r.id);
      if (ids.length > 0) {
        const { data: msgData } = await supabase
          .from('project_messages')
          .select('request_id, created_at')
          .in('request_id', ids)
          .neq('sender_role', 'system')
          .order('created_at', { ascending: false });
        if (msgData) {
          const counts: Record<string, number> = {};
          const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
          setLastSeenMap(stored);
          for (const row of msgData as { request_id: string; created_at: string }[]) {
            const lastSeen = stored[row.request_id] || 0;
            const msgTime = new Date(row.created_at).getTime();
            if (msgTime > lastSeen) {
              counts[row.request_id] = (counts[row.request_id] || 0) + 1;
            }
          }
          setUnreadMsgMap(counts);
        }
      }
    }
    setLoading(false);
  }, [currentUser.id, isPTS]);

  const fetchMessages = useCallback(async (requestId: string) => {
    const { data, error } = await supabase.from('project_messages').select('*').eq('request_id', requestId).order('created_at', { ascending: true });
    if (!error && data) setMessages(data as ProjectMessage[]);
  }, []);

  const fetchAttachments = useCallback(async (requestId: string) => {
    const { data, error } = await supabase.from('project_attachments').select('*').eq('request_id', requestId).order('uploaded_at', { ascending: false });
    if (!error && data) {
      const normalized = (data as ProjectAttachment[]).map(a => ({
        ...a,
        attachment_category: (a.attachment_category as string) === 'design3d' ? 'design3d' as const :
          (a.attachment_category as string) === 'sld' ? 'sld' as const :
          (a.attachment_category as string) === 'boq' ? 'boq' as const : 'general' as const,
      }));
      setAttachments(normalized);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleOpenDetail = (req: ProjectRequest) => {
    setSelectedRequest(req);
    setView('detail');
    activeRequestIdRef.current = req.id;
    fetchMessages(req.id);
    fetchAttachments(req.id);
    const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
    stored[req.id] = Date.now();
    localStorage.setItem('pts_last_seen', JSON.stringify(stored));
    setUnreadMsgMap(prev => ({ ...prev, [req.id]: 0 }));
  };

  useEffect(() => {
    if (!selectedRequest) return;
    const reqId = selectedRequest.id;

    const channel = supabase.channel(`project-${reqId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `request_id=eq.${reqId}` },
        (payload) => { if (activeRequestIdRef.current !== reqId) return; setMessages(prev => [...prev, payload.new as ProjectMessage]); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_attachments', filter: `request_id=eq.${reqId}` },
        () => { if (activeRequestIdRef.current !== reqId) return; fetchAttachments(reqId); })
      .subscribe();

    const pollInterval = setInterval(async () => {
      if (activeRequestIdRef.current !== reqId) return;
      const { data } = await supabase.from('project_messages').select('*').eq('request_id', reqId).order('created_at', { ascending: true });
      if (data && activeRequestIdRef.current === reqId) {
        setMessages(prev => { if (data.length === prev.length) return prev; return data as ProjectMessage[]; });
      }
    }, 3000);

    return () => {
      activeRequestIdRef.current = null;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [selectedRequest?.id, fetchAttachments]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const toggleArr = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

  const handleSubmitForm = async () => {
    if (!form.project_name.trim()) { notify('error', 'Nama Project wajib diisi!'); return; }
    if (form.kebutuhan.length === 0 && !form.kebutuhan_other.trim()) { notify('error', 'Pilih minimal satu Kategori Kebutuhan!'); return; }
    if (form.solution_product.length === 0 && !form.solution_other.trim()) { notify('error', 'Pilih minimal satu Solution Product!'); return; }
    setSubmitting(true);
    try {
      const payload = {
        project_name: form.project_name.trim(), room_name: form.room_name.trim(),
        sales_name: form.sales_name.trim(), sales_division: (form as any).sales_division?.trim() || '',
        kebutuhan: form.kebutuhan, kebutuhan_other: form.kebutuhan_other.trim(),
        solution_product: form.solution_product, solution_other: form.solution_other.trim(),
        layout_signage: form.layout_signage, jaringan_cms: form.jaringan_cms,
        jumlah_input: form.jumlah_input.trim(), jumlah_output: form.jumlah_output.trim(),
        source: form.source, source_other: form.source_other.trim(),
        camera_conference: form.camera_conference, camera_jumlah: form.camera_jumlah.trim(), camera_tracking: form.camera_tracking,
        audio_system: form.audio_system, audio_mixer: form.audio_mixer, audio_detail: form.audio_detail,
        wallplate_input: form.wallplate_input, wallplate_jumlah: form.wallplate_jumlah.trim(),
        tabletop_input: form.tabletop_input, tabletop_jumlah: form.tabletop_jumlah.trim(),
        wireless_presentation: form.wireless_presentation, wireless_mode: form.wireless_mode, wireless_dongle: form.wireless_dongle,
        controller_automation: form.controller_automation, controller_type: form.controller_type,
        ukuran_ruangan: form.ukuran_ruangan.trim(), suggest_tampilan: form.suggest_tampilan.trim(), keterangan_lain: form.keterangan_lain.trim(),
        requester_id: currentUser.id, requester_name: currentUser.full_name, status: 'pending' as const,
        due_date: dueDateForm || null,
      };
      const { data, error } = await supabase.from('project_requests').insert([payload]).select().single();
      if (error) { notify('error', 'Gagal submit form: ' + error.message); setSubmitting(false); return; }
      if (data?.id) {
        await supabase.from('project_messages').insert([{
          request_id: data.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system',
          message: `📋 Request baru dari ${currentUser.full_name} telah masuk dan menunggu approval dari Superadmin.`,
        }]);
        if (surveyPhotos.length > 0) {
          for (const photo of surveyPhotos) {
            const filePath = `project-files/${data.id}/survey-${Date.now()}-${photo.name}`;
            const { error: storageErr } = await supabase.storage.from('project-files').upload(filePath, photo, { cacheControl: '3600', upsert: false });
            if (!storageErr) {
              const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
              await supabase.from('project_attachments').insert([{
                request_id: data.id, message_id: null, file_name: photo.name,
                file_url: urlData.publicUrl, file_type: photo.type, file_size: photo.size,
                uploaded_by: currentUser.full_name,
              }]);
            }
          }
        }
      }
      notify('success', '✅ Form berhasil dikirim! Menunggu approval dari Superadmin.');
      setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]);
      setShowNewFormModal(false);
      fetchRequests();
    } catch { notify('error', 'Terjadi kesalahan tidak terduga. Coba lagi.'); }
    finally { setSubmitting(false); }
  };

  const handleApprove = async (req: ProjectRequest) => {
    if (isSuperAdmin || isAdmin) {
      setAssignModal({ open: true, req });
    } else {
      const { error } = await supabase.from('project_requests').update({ status: 'approved', approved_by: currentUser.full_name, approved_at: new Date().toISOString(), pts_assigned: currentUser.full_name }).eq('id', req.id);
      if (error) { notify('error', 'Gagal approve: ' + error.message); return; }
      notify('success', 'Request diapprove!');
      fetchRequests();
    }
  };

  const handleReject = (req: ProjectRequest) => setRejectModal({ open: true, req });

  const handleRejectConfirm = async () => {
    if (!rejectModal.req) return;
    const req = rejectModal.req;
    const { error } = await supabase.from('project_requests').update({ status: 'rejected' }).eq('id', req.id);
    if (error) { notify('error', 'Gagal tolak: ' + error.message); return; }
    notify('info', 'Request ditolak.');
    setRejectModal({ open: false, req: null }); setRejectNote('');
    fetchRequests();
    if (selectedRequest?.id === req.id) setSelectedRequest(prev => prev ? { ...prev, status: 'rejected' } : null);
    const noteMsg = rejectNote.trim() ? ` Alasan: ${rejectNote.trim()}` : '';
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `❌ Request telah ditolak oleh ${currentUser.full_name}.${noteMsg}` }]);
    if (selectedRequest?.id === req.id) fetchMessages(req.id);
  };

  const handleStatusUpdate = async (req: ProjectRequest, newStatus: string) => {
    const { error } = await supabase.from('project_requests').update({ status: newStatus }).eq('id', req.id);
    if (error) { notify('error', 'Gagal update status.'); return; }
    notify('success', `Status → ${newStatus}`);
    fetchRequests();
    if (selectedRequest) setSelectedRequest({ ...selectedRequest, status: newStatus as ProjectRequest['status'] });
    await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `🔄 Status diupdate menjadi: ${newStatus.replace('_', ' ').toUpperCase()}` }]);
    if (selectedRequest?.id === req.id) fetchMessages(req.id);
  };

  const handleOpenEditForm = () => {
    if (!selectedRequest) return;
    setEditFormData({
      project_name: selectedRequest.project_name || '', room_name: selectedRequest.room_name || '',
      sales_name: selectedRequest.sales_name || '', sales_division: selectedRequest.sales_division || '',
      kebutuhan: selectedRequest.kebutuhan || [], kebutuhan_other: selectedRequest.kebutuhan_other || '',
      solution_product: selectedRequest.solution_product || [], solution_other: selectedRequest.solution_other || '',
      layout_signage: selectedRequest.layout_signage || [], jaringan_cms: selectedRequest.jaringan_cms || [],
      jumlah_input: selectedRequest.jumlah_input || '', jumlah_output: selectedRequest.jumlah_output || '',
      source: selectedRequest.source || [], source_other: selectedRequest.source_other || '',
      camera_conference: selectedRequest.camera_conference || 'No', camera_jumlah: selectedRequest.camera_jumlah || '',
      camera_tracking: selectedRequest.camera_tracking || [], audio_system: selectedRequest.audio_system || 'No',
      audio_mixer: selectedRequest.audio_mixer || '', audio_detail: selectedRequest.audio_detail || [],
      wallplate_input: selectedRequest.wallplate_input || 'No', wallplate_jumlah: selectedRequest.wallplate_jumlah || '',
      tabletop_input: selectedRequest.tabletop_input || 'No', tabletop_jumlah: selectedRequest.tabletop_jumlah || '',
      wireless_presentation: selectedRequest.wireless_presentation || 'No',
      wireless_mode: selectedRequest.wireless_mode || [], wireless_dongle: selectedRequest.wireless_dongle || 'No',
      controller_automation: selectedRequest.controller_automation || 'No',
      controller_type: selectedRequest.controller_type || [],
      ukuran_ruangan: selectedRequest.ukuran_ruangan || '',
      suggest_tampilan: selectedRequest.suggest_tampilan || '', keterangan_lain: selectedRequest.keterangan_lain || '',
    });
    setEditFormModal(true);
  };

  const handleEditFormSubmit = async () => {
    if (!selectedRequest) return;
    const { error } = await supabase.from('project_requests').update({ ...editFormData }).eq('id', selectedRequest.id);
    if (error) { notify('error', 'Gagal menyimpan perubahan.'); return; }
    notify('success', 'Detail kebutuhan berhasil diperbarui!');
    setEditFormModal(false);
    const updated = { ...selectedRequest, ...editFormData };
    setSelectedRequest(updated as ProjectRequest);
    fetchRequests();
    await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `✏️ Detail kebutuhan telah diperbarui oleh ${currentUser.full_name}.` }]);
    fetchMessages(selectedRequest.id);
  };

  const handleSendMessage = async () => {
    if (!selectedRequest || !msgText.trim()) { notify('error', 'Tidak bisa mengirim pesan.'); return; }
    setSendingMsg(true);
    const { error } = await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: msgText.trim() }]);
    setSendingMsg(false);
    if (error) { notify('error', 'Gagal kirim pesan.'); return; }
    setMsgText('');
  };

  const handleFileUpload = async (file: File) => {
    if (!selectedRequest) return;
    setUploadingFile(true);
    const filePath = `project-files/${selectedRequest.id}/${Date.now()}-${file.name}`;
    const { error: storageError } = await supabase.storage.from('project-files').upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (storageError) { notify('error', 'Upload gagal: ' + storageError.message); setUploadingFile(false); return; }
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
    await supabase.from('project_attachments').insert([{ request_id: selectedRequest.id, message_id: null, file_name: file.name, file_url: urlData.publicUrl, file_type: file.type, file_size: file.size, uploaded_by: currentUser.full_name, attachment_category: 'general' }]);
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
    const { error: storageError } = await supabase.storage.from('project-files').upload(filePath, file, { cacheControl: '3600', upsert: false });
    if (storageError) { notify('error', `Upload ${label} gagal: ${storageError.message}`); setUploadingCategory(null); return; }
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
    await supabase.from('project_attachments').insert([{ request_id: selectedRequest.id, message_id: null, file_name: file.name, file_url: urlData.publicUrl, file_type: file.type, file_size: file.size, uploaded_by: currentUser.full_name, attachment_category: category, revision_version: revisionNum }]);
    setUploadingCategory(null);
    notify('success', `${label} Rev.${revisionNum} "${file.name}" berhasil diupload!`);
    fetchAttachments(selectedRequest.id);
    await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `${category === 'design3d' ? '🎨' : category === 'sld' ? '📐' : '📊'} Upload ${label} Revision ${revisionNum}: ${file.name}` }]);
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    pending:     { label: '⏳ Pending',     color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300' },
    approved:    { label: '✅ Approved',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
    in_progress: { label: '🔄 In Progress', color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-300' },
    completed:   { label: '🏁 Completed',   color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300' },
    rejected:    { label: '❌ Rejected',    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300' },
  };

  const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';

  const formatDueDate = (d: string | null | undefined) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDueStatus = (dueDate: string | null | undefined, status: string) => {
    if (!dueDate || status === 'completed' || status === 'rejected') return null;
    const now = new Date(); const due = new Date(dueDate);
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return { type: 'overdue', label: `Overdue ${Math.abs(diff)}h` };
    if (diff <= 3) return { type: 'urgent', label: `${diff}h lagi` };
    return null;
  };

  const handlePrint = () => {
    if (!selectedRequest) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Form Require Project - ${selectedRequest.project_name}</title>
    <style>body{font-family:sans-serif;padding:24px;color:#222;} h1{color:#0f766e;} table{width:100%;border-collapse:collapse;} td,th{border:1px solid #ccc;padding:8px;font-size:13px;} th{background:#f0fdfa;font-weight:700;text-align:left;} .badge{display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;} @media print{@page{margin:15mm;}}</style>
    </head><body>
    <h1>🏗️ Form Require Project — IVP</h1>
    <table>
      <tr><th>Project</th><td>${selectedRequest.project_name}</td><th>Ruangan</th><td>${selectedRequest.room_name || '—'}</td></tr>
      <tr><th>Sales</th><td>${selectedRequest.sales_name || '—'}</td><th>Divisi</th><td>${selectedRequest.sales_division || '—'}</td></tr>
      <tr><th>Requester</th><td>${selectedRequest.requester_name}</td><th>Status</th><td>${selectedRequest.status}</td></tr>
      <tr><th>PTS Assigned</th><td>${selectedRequest.pts_assigned || '—'}</td><th>Target</th><td>${formatDueDate(selectedRequest.due_date) || '—'}</td></tr>
      <tr><th>Kebutuhan</th><td colspan="3">${[...(selectedRequest.kebutuhan || []), selectedRequest.kebutuhan_other].filter(Boolean).join(', ') || '—'}</td></tr>
      <tr><th>Solution</th><td colspan="3">${[...(selectedRequest.solution_product || []), selectedRequest.solution_other].filter(Boolean).join(', ') || '—'}</td></tr>
      <tr><th>Camera</th><td>${selectedRequest.camera_conference}${selectedRequest.camera_jumlah ? ` (${selectedRequest.camera_jumlah})` : ''}</td><th>Audio</th><td>${selectedRequest.audio_system}${selectedRequest.audio_mixer ? ` — ${selectedRequest.audio_mixer}` : ''}</td></tr>
      <tr><th>Wallplate</th><td>${selectedRequest.wallplate_input}${selectedRequest.wallplate_jumlah ? ` (${selectedRequest.wallplate_jumlah})` : ''}</td><th>Tabletop</th><td>${selectedRequest.tabletop_input}${selectedRequest.tabletop_jumlah ? ` (${selectedRequest.tabletop_jumlah})` : ''}</td></tr>
      <tr><th>Wireless</th><td>${selectedRequest.wireless_presentation}${selectedRequest.wireless_mode?.length ? ` — ${selectedRequest.wireless_mode.join(', ')}` : ''}</td><th>Controller</th><td>${selectedRequest.controller_automation}${selectedRequest.controller_type?.length ? ` — ${selectedRequest.controller_type.join(', ')}` : ''}</td></tr>
      <tr><th>Ukuran Ruangan</th><td>${selectedRequest.ukuran_ruangan || '—'}</td><th>I/O</th><td>In: ${selectedRequest.jumlah_input || '—'} / Out: ${selectedRequest.jumlah_output || '—'}</td></tr>
      <tr><th>Suggest Tampilan</th><td colspan="3">${selectedRequest.suggest_tampilan || '—'}</td></tr>
      <tr><th>Keterangan Lain</th><td colspan="3">${selectedRequest.keterangan_lain || '—'}</td></tr>
    </table>
    <p style="margin-top:16px;font-size:12px;color:#888;">Dicetak: ${new Date().toLocaleString('id-ID')}</p>
    </body></html>`);
    w.document.close();
    w.print();
  };

  // ─── Available years for filter ───────────────────────────────────────────
  const availableYears = [...new Set(requests.map(r => new Date(r.created_at).getFullYear().toString()))].sort((a, b) => b.localeCompare(a));

  // ─── Filtered list ────────────────────────────────────────────────────────
  const filteredRequests = requests.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || r.project_name?.toLowerCase().includes(q) || r.room_name?.toLowerCase().includes(q);
    const qs = searchSales.toLowerCase();
    const matchSales = !qs || r.sales_name?.toLowerCase().includes(qs) || (r.sales_division || '').toLowerCase().includes(qs);
    const matchYear = filterYear === 'all' || new Date(r.created_at).getFullYear().toString() === filterYear;
    const matchHandler = !filterHandler || (r.pts_assigned || '').toLowerCase().includes(filterHandler.toLowerCase());
    return matchStatus && matchSearch && matchSales && matchYear && matchHandler;
  });

  // ─── Stats ────────────────────────────────────────────────────────────────
  const statCounts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
  };

  // ─── Sub-components ───────────────────────────────────────────────────────
  const CheckGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
    <div className="mb-3">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(toggleArr(value, opt))}
            className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${value.includes(opt) ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md' : 'border-gray-300 bg-white text-gray-600 hover:border-teal-300'}`}>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  const RadioGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="mb-3">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${value === opt ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md' : 'border-gray-300 bg-white text-gray-600 hover:border-teal-300'}`}>
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${value === opt ? 'border-teal-500' : 'border-gray-400'}`}>
              {value === opt && <div className="w-2 h-2 rounded-full bg-teal-500" />}
            </div>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  // ─── Notification Toast ───────────────────────────────────────────────────
  const NotifToast = () => notification ? (
    <div className={`fixed top-4 right-4 z-[9999] px-5 py-4 rounded-2xl shadow-2xl text-sm font-bold flex items-center gap-3 border-2 max-w-sm animate-scale-in ${
      notification.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-400' :
      notification.type === 'error'   ? 'bg-red-50 text-red-800 border-red-400' :
                                        'bg-blue-50 text-blue-800 border-blue-400'}`}>
      <span className="text-xl">{notification.type === 'success' ? '✅' : notification.type === 'error' ? '❌' : 'ℹ️'}</span>
      <div>
        <p className="font-bold">{notification.type === 'success' ? 'Berhasil!' : notification.type === 'error' ? 'Gagal!' : 'Info'}</p>
        <p className="text-xs font-medium mt-0.5 opacity-80">{notification.msg}</p>
      </div>
    </div>
  ) : null;

  // ── NEW FORM MODAL ──────────────────────────────────────────────────────────
  const NewFormModal = () => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border-2 border-teal-500 animate-scale-in overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">📋 Form Equipment Request — IVP</h2>
            <p className="text-teal-100 text-xs mt-0.5">Requester: <span className="font-bold">{currentUser.full_name}</span></p>
          </div>
          <button onClick={() => { setShowNewFormModal(false); setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]); }}
            className="bg-white/20 hover:bg-white/30 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Project Info */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">🏗️</span>
              Informasi Project
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Project *</label>
                <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                  placeholder="e.g. PT. Indovisual Presentatama" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all bg-white outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Ruangan</label>
                  <input value={form.room_name} onChange={e => setForm({ ...form, room_name: e.target.value })}
                    placeholder="e.g. Meeting Room A" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Sales</label>
                  <input value={form.sales_name} onChange={e => setForm({ ...form, sales_name: e.target.value })}
                    placeholder="e.g. John Doe" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Divisi Sales</label>
                <div className="flex flex-wrap gap-2">
                  {SALES_DIVISIONS.map(div => (
                    <button key={div} type="button" onClick={() => setForm({ ...form, ...({ sales_division: div } as any) })}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${(form as any).sales_division === div ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-teal-300'}`}>
                      {div}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Target Selesai</label>
                <input type="date" value={dueDateForm} onChange={e => setDueDateForm(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
            </div>
          </div>

          {/* Kebutuhan & Solution */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">🎯</span>
              Kategori Kebutuhan & Solution
            </h3>
            <CheckGroup label="Kebutuhan *" options={['Signage', 'Immersive', 'Meeting Room', 'Mapping', 'Command Center', 'Hybrid Classroom']}
              value={form.kebutuhan} onChange={v => setForm({ ...form, kebutuhan: v })} />
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Kebutuhan</label>
              <input value={form.kebutuhan_other} onChange={e => setForm({ ...form, kebutuhan_other: e.target.value })}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
            </div>
            <CheckGroup label="Solution Product *" options={['Videowall', 'Signage Display', 'Projector', 'Kiosk', 'IFP']}
              value={form.solution_product} onChange={v => setForm({ ...form, solution_product: v })} />
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Solution</label>
              <input value={form.solution_other} onChange={e => setForm({ ...form, solution_other: e.target.value })}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
            </div>
          </div>

          {/* Signage & Network */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📺</span>
              Layout Konten & Jaringan CMS
            </h3>
            <CheckGroup label="Layout Signage" options={['Full Screen', 'Split Screen', 'Portrait', 'Landscape', 'Custom']}
              value={form.layout_signage} onChange={v => setForm({ ...form, layout_signage: v })} />
            <CheckGroup label="Jaringan CMS" options={['Internet', 'Intranet', 'Offline']}
              value={form.jaringan_cms} onChange={v => setForm({ ...form, jaringan_cms: v })} />
          </div>

          {/* I/O & Source */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">🔌</span>
              Input / Output & Source
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Input</label>
                <input value={form.jumlah_input} onChange={e => setForm({ ...form, jumlah_input: e.target.value })}
                  placeholder="e.g. 4" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Output</label>
                <input value={form.jumlah_output} onChange={e => setForm({ ...form, jumlah_output: e.target.value })}
                  placeholder="e.g. 2" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
            </div>
            <CheckGroup label="Source" options={['PC', 'URL', 'NVR', 'Laptop']}
              value={form.source} onChange={v => setForm({ ...form, source: v })} />
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Source</label>
              <input value={form.source_other} onChange={e => setForm({ ...form, source_other: e.target.value })}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
            </div>
          </div>

          {/* Camera & Audio */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📷</span>
              Camera Conference & Audio
            </h3>
            <RadioGroup label="Camera Conference" options={['Yes', 'No']} value={form.camera_conference} onChange={v => setForm({ ...form, camera_conference: v })} />
            {form.camera_conference === 'Yes' && (
              <div className="ml-0 pl-4 border-l-4 border-teal-300 mb-3">
                <div className="mb-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Kamera</label>
                  <input value={form.camera_jumlah} onChange={e => setForm({ ...form, camera_jumlah: e.target.value })}
                    placeholder="e.g. 2" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 transition-all bg-white" />
                </div>
                <CheckGroup label="Tracking" options={['No Tracking', 'Voice', 'Human Detection', 'Track Mic Delegate']}
                  value={form.camera_tracking} onChange={v => setForm({ ...form, camera_tracking: v })} />
              </div>
            )}
            <RadioGroup label="Audio System" options={['Yes', 'No']} value={form.audio_system} onChange={v => setForm({ ...form, audio_system: v })} />
            {form.audio_system === 'Yes' && (
              <div className="ml-0 pl-4 border-l-4 border-teal-300 mb-3 space-y-2">
                <RadioGroup label="Mixer" options={['Analog', 'DSP Mixer']} value={form.audio_mixer} onChange={v => setForm({ ...form, audio_mixer: v })} />
                <CheckGroup label="Keperluan Audio" options={['Mic', 'PC Audio', 'Speaker']}
                  value={form.audio_detail} onChange={v => setForm({ ...form, audio_detail: v })} />
              </div>
            )}
          </div>

          {/* Wallplate, Tabletop & Wireless */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📡</span>
              Wallplate, Tabletop & Wireless
            </h3>
            <RadioGroup label="Wallplate Input" options={['Yes', 'No']} value={form.wallplate_input} onChange={v => setForm({ ...form, wallplate_input: v })} />
            {form.wallplate_input === 'Yes' && (
              <div className="mb-3 pl-4 border-l-4 border-teal-300">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Wallplate</label>
                <input value={form.wallplate_jumlah} onChange={e => setForm({ ...form, wallplate_jumlah: e.target.value })}
                  placeholder="e.g. 3" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 transition-all bg-white" />
              </div>
            )}
            <RadioGroup label="Tabletop Input" options={['Yes', 'No']} value={form.tabletop_input} onChange={v => setForm({ ...form, tabletop_input: v })} />
            {form.tabletop_input === 'Yes' && (
              <div className="mb-3 pl-4 border-l-4 border-teal-300">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Tabletop</label>
                <input value={form.tabletop_jumlah} onChange={e => setForm({ ...form, tabletop_jumlah: e.target.value })}
                  placeholder="e.g. 2" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 transition-all bg-white" />
              </div>
            )}
            <RadioGroup label="Wireless Presentation" options={['Yes', 'No']} value={form.wireless_presentation} onChange={v => setForm({ ...form, wireless_presentation: v })} />
            {form.wireless_presentation === 'Yes' && (
              <div className="mb-3 pl-4 border-l-4 border-teal-300 space-y-2">
                <CheckGroup label="Wireless Mode" options={['BYOM', 'BYOD']}
                  value={form.wireless_mode} onChange={v => setForm({ ...form, wireless_mode: v })} />
                <RadioGroup label="Wireless Dongle" options={['Yes', 'No']} value={form.wireless_dongle} onChange={v => setForm({ ...form, wireless_dongle: v })} />
              </div>
            )}
          </div>

          {/* Controller */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">🎛️</span>
              Controller Automation
            </h3>
            <RadioGroup label="Controller Automation" options={['Yes', 'No']} value={form.controller_automation} onChange={v => setForm({ ...form, controller_automation: v })} />
            {form.controller_automation === 'Yes' && (
              <div className="pl-4 border-l-4 border-teal-300">
                <CheckGroup label="Tipe Controller" options={['Tablet or iPad', 'Touchscreen 10"']}
                  value={form.controller_type} onChange={v => setForm({ ...form, controller_type: v })} />
              </div>
            )}
          </div>

          {/* Ukuran & Keterangan */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📐</span>
              Ukuran & Keterangan
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ukuran Ruangan (P × L × T)</label>
                <input value={form.ukuran_ruangan} onChange={e => setForm({ ...form, ukuran_ruangan: e.target.value })}
                  placeholder="e.g. 10m × 8m × 3m" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Suggest Tampilan</label>
                <textarea value={form.suggest_tampilan} onChange={e => setForm({ ...form, suggest_tampilan: e.target.value })} rows={2}
                  placeholder="Deskripsi tampilan yang diinginkan..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none resize-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Keterangan Lain</label>
                <textarea value={form.keterangan_lain} onChange={e => setForm({ ...form, keterangan_lain: e.target.value })} rows={2}
                  placeholder="Informasi tambahan..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none resize-none" />
              </div>
            </div>
          </div>

          {/* Survey Photos */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📸</span>
              Foto Survey (Opsional)
            </h3>
            <input ref={surveyPhotoRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                setSurveyPhotos(prev => [...prev, ...files]);
                const previews = files.map(f => URL.createObjectURL(f));
                setSurveyPhotosPreviews(prev => [...prev, ...previews]);
                e.target.value = '';
              }} />
            <button type="button" onClick={() => surveyPhotoRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-teal-300 rounded-xl text-sm text-teal-600 font-semibold hover:bg-teal-50 transition-all w-full justify-center">
              📷 Upload Foto Survey
            </button>
            {surveyPhotosPreviews.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {surveyPhotosPreviews.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-200 shadow-sm group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => { setSurveyPhotos(p => p.filter((_, idx) => idx !== i)); setSurveyPhotosPreviews(p => p.filter((_, idx) => idx !== i)); }}
                      className="absolute top-1 right-1 bg-red-600 text-white w-5 h-5 rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-shrink-0 px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button onClick={() => { setShowNewFormModal(false); setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]); }}
            className="px-6 py-3 rounded-xl border-2 border-gray-300 text-gray-700 font-bold hover:bg-gray-100 transition-all">Batal</button>
          <button onClick={handleSubmitForm} disabled={submitting}
            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-800 text-white px-8 py-3 rounded-xl font-bold hover:from-teal-700 hover:to-teal-900 transition-all disabled:opacity-50 shadow-lg">
            {submitting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</> : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Kirim Request ke Superadmin</>}
          </button>
        </div>
      </div>
    </div>
  );

  // ── VIEW: LIST ──
  if (view === 'list') return (
    <div className="min-h-full p-4 md:p-6 bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <NotifToast />

      {showNewFormModal && <NewFormModal />}
      {assignModal.open && assignModal.req && (
        <AssignPTSModal
          req={assignModal.req}
          onClose={() => setAssignModal({ open: false, req: null })}
          onAssigned={() => {
            setAssignModal({ open: false, req: null });
            notify('success', `Request diapprove & di-assign ke Tim PTS!`);
            fetchRequests();
            if (selectedRequest?.id === assignModal.req?.id) {
              setSelectedRequest(prev => prev ? { ...prev, status: 'approved' } : null);
              fetchMessages(assignModal.req!.id);
            }
          }}
          currentUser={currentUser}
        />
      )}

      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 pointer-events-none">
        <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
      </div>

      {/* Header */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-4 border-teal-600">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-800 mb-1">
              🏗️ Form Require Project
            </h1>
            <p className="text-gray-800 font-bold text-lg">IVP Product — AV Solution Request</p>
            <p className="text-sm text-gray-600 mt-1">
              Logged in as: <span className="font-bold text-teal-600">{currentUser.full_name}</span>
              <span className={`ml-2 px-2 py-0.5 text-xs rounded-full font-bold ${currentUser.role === 'superadmin' ? 'bg-red-100 text-red-800' : currentUser.role === 'admin' ? 'bg-purple-100 text-purple-800' : (currentUser.role === 'team_pts' || currentUser.role === 'team') ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}>
                {currentUser.role === 'superadmin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin / PTS' : (currentUser.role === 'team_pts' || currentUser.role === 'team') ? 'Tim PTS' : 'Sales / User'}
              </span>
            </p>
          </div>
          {!isPTS && (
            <button onClick={() => setShowNewFormModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg hover:scale-105">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
              Buat Request Baru
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        {[
          { key: 'all', label: 'Total', count: statCounts.all, color: 'from-gray-600 to-gray-800', active: filterStatus === 'all' },
          { key: 'pending', label: 'Pending', count: statCounts.pending, color: 'from-amber-500 to-amber-700', active: filterStatus === 'pending' },
          { key: 'approved', label: 'Approved', count: statCounts.approved, color: 'from-emerald-500 to-emerald-700', active: filterStatus === 'approved' },
          { key: 'in_progress', label: 'In Progress', count: statCounts.in_progress, color: 'from-teal-500 to-teal-700', active: filterStatus === 'in_progress' },
          { key: 'completed', label: 'Completed', count: statCounts.completed, color: 'from-purple-500 to-purple-700', active: filterStatus === 'completed' },
          { key: 'rejected', label: 'Rejected', count: statCounts.rejected, color: 'from-red-500 to-red-700', active: filterStatus === 'rejected' },
        ].map(s => (
          <button key={s.key} onClick={() => setFilterStatus(s.key)}
            className={`rounded-2xl p-3 text-center transition-all border-2 ${s.active ? `bg-gradient-to-br ${s.color} text-white border-transparent shadow-lg scale-105` : 'bg-white/80 backdrop-blur-sm border-gray-200 text-gray-700 hover:border-teal-300 hover:shadow-md'}`}>
            <p className={`text-2xl font-bold ${s.active ? 'text-white' : 'text-gray-800'}`}>{s.count}</p>
            <p className={`text-[11px] font-bold uppercase tracking-wide ${s.active ? 'text-white/90' : 'text-gray-500'}`}>{s.label}</p>
          </button>
        ))}
      </div>

      {/* ── TICKET LIST — same style as ticketing/page.tsx ── */}
      <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)' }}>
        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ticket List</span>
            <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{loading ? '...' : filteredRequests.length}</span>
          </div>
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <button onClick={fetchRequests} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-gray-100 border border-gray-200 text-gray-600" style={{ background: 'white' }}>
              🔄 Refresh
            </button>
            {!isPTS && (
              <button onClick={() => setShowNewFormModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:scale-105" style={{ background: 'linear-gradient(135deg,#0f766e,#134e4a)', boxShadow: '0 2px 8px rgba(15,118,110,0.3)' }}>
                ➕ Request Baru
              </button>
            )}
          </div>
        </div>

        {/* Unified search + filter frame — all in one row */}
        <div className="px-6 py-4 bg-white/60 border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Project */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Project / Ruangan</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Cari project / ruangan..."
                  className="w-full rounded-xl pl-8 pr-3 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-teal-300"
                />
              </div>
            </div>
            {/* Search Sales */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Sales / Divisi</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">👤</span>
                <input
                  type="text"
                  value={searchSales}
                  onChange={e => setSearchSales(e.target.value)}
                  placeholder="Cari sales..."
                  className="w-full rounded-xl pl-8 pr-3 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-teal-300"
                />
              </div>
            </div>
            {/* Filter Status */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🏷️</span>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full rounded-xl pl-8 pr-4 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-teal-300 appearance-none cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="pending">⏳ Pending</option>
                  <option value="approved">✅ Approved</option>
                  <option value="in_progress">🔄 In Progress</option>
                  <option value="completed">🏁 Completed</option>
                  <option value="rejected">❌ Rejected</option>
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
              </div>
            </div>
            {/* Filter Tahun */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Filter Tahun</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">📅</span>
                <select
                  value={filterYear}
                  onChange={e => setFilterYear(e.target.value)}
                  className="w-full rounded-xl pl-8 pr-4 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-teal-300 appearance-none cursor-pointer"
                >
                  <option value="all">All Years</option>
                  {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">▼</span>
              </div>
            </div>
            {/* Filter Team Handler */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Team Handler</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">👷</span>
                <input
                  type="text"
                  value={filterHandler}
                  onChange={e => setFilterHandler(e.target.value)}
                  placeholder="Search handler..."
                  className="w-full rounded-xl pl-8 pr-3 py-2 text-sm outline-none transition-all bg-gray-50 border border-gray-200 focus:bg-white focus:border-teal-300"
                />
              </div>
            </div>
          </div>
          {/* Active filter chips */}
          {(searchQuery || searchSales || filterStatus !== 'all' || filterYear !== 'all' || filterHandler) && (
            <div className="flex flex-wrap gap-2 items-center mt-3">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter aktif:</span>
              {searchQuery && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-teal-100 text-teal-700">🔍 {searchQuery} <button onClick={() => setSearchQuery('')} className="ml-0.5 hover:text-red-500">✕</button></span>}
              {searchSales && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">👤 {searchSales} <button onClick={() => setSearchSales('')} className="ml-0.5 hover:text-red-500">✕</button></span>}
              {filterStatus !== 'all' && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700">🏷️ {filterStatus} <button onClick={() => setFilterStatus('all')} className="ml-0.5 hover:text-red-500">✕</button></span>}
              {filterYear !== 'all' && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700">📅 {filterYear} <button onClick={() => setFilterYear('all')} className="ml-0.5 hover:text-red-500">✕</button></span>}
              {filterHandler && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700">👷 {filterHandler} <button onClick={() => setFilterHandler('')} className="ml-0.5 hover:text-red-500">✕</button></span>}
              <button onClick={() => { setSearchQuery(''); setSearchSales(''); setFilterStatus('all'); setFilterYear('all'); setFilterHandler(''); }}
                className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-all">Reset Semua</button>
            </div>
          )}
        </div>

        {/* Table header */}
        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.3fr_1.1fr] gap-0 px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Project</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Ruangan</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sales</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Requester</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</span>
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="space-y-3 py-2 p-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse flex gap-3 items-center bg-white/60 rounded-xl p-4 border border-gray-200">
                  <div className="flex-1 space-y-2"><div className="h-4 bg-gray-200 rounded w-2/5" /><div className="h-3 bg-gray-100 rounded w-1/4" /></div>
                  <div className="h-4 bg-gray-200 rounded w-1/6" /><div className="h-4 bg-gray-200 rounded w-1/5" /><div className="h-6 bg-gray-200 rounded-full w-20" /><div className="h-8 bg-gray-200 rounded-lg w-16" />
                </div>
              ))}
              <div className="flex items-center justify-center gap-3 py-4 text-gray-500">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-teal-500" />
                <span className="text-sm font-medium">Memuat data...</span>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-gray-600 font-medium">{(searchQuery || searchSales || filterStatus !== 'all') ? 'Tidak ada hasil yang cocok.' : 'Belum ada form yang masuk.'}</p>
            </div>
          ) : filteredRequests.map((req) => {
            const sc = statusConfig[req.status] || statusConfig.pending;
            const unread = unreadMsgMap[req.id] || 0;
            const dueStatus = getDueStatus(req.due_date, req.status);
            return (
              <div key={req.id}
                className={`group hidden md:grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.3fr_1.1fr] gap-0 px-5 py-3 cursor-pointer hover:bg-teal-50/40 transition-all ${req.status === 'rejected' ? 'bg-red-50/20' : ''}`}
                onClick={() => handleOpenDetail(req)}>
                {/* Project Name */}
                <div className="flex flex-col justify-center min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800 text-sm group-hover:text-teal-700 transition-colors truncate">{req.project_name}</p>
                    {unread > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{unread > 9 ? '9+' : unread}💬</span>}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  {dueStatus?.type === 'overdue' && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full w-fit">⚠️ {dueStatus.label}</span>}
                  {dueStatus?.type === 'urgent' && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full w-fit">⏰ {dueStatus.label}</span>}
                </div>
                {/* Room Name */}
                <div className="flex flex-col justify-center pr-3">
                  <p className="text-sm text-gray-700 font-medium truncate">{req.room_name || <span className="text-gray-300">—</span>}</p>
                  {req.solution_product?.length > 0 && <p className="text-[11px] text-gray-400 truncate">{req.solution_product.join(', ')}</p>}
                </div>
                {/* Sales */}
                <div className="flex flex-col justify-center pr-3">
                  <p className="text-sm text-gray-700 font-medium truncate">{req.sales_name || <span className="text-gray-300">—</span>}</p>
                  {req.sales_division && <p className="text-[11px] text-indigo-500 font-bold">{req.sales_division}</p>}
                </div>
                {/* Status */}
                <div className="flex flex-col justify-center pr-3">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border w-fit ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
                  {req.status === 'pending' && isPTS && !isTeamPTS && <p className="text-[10px] font-bold text-red-600 mt-1 animate-pulse">🔔 Perlu Approval</p>}
                  {req.pts_assigned && <p className="text-[11px] text-gray-400 mt-0.5">🔧 {req.pts_assigned}</p>}
                </div>
                {/* Requester */}
                <div className="flex flex-col justify-center pr-3">
                  <p className="text-sm text-gray-700 font-medium truncate">{req.requester_name}</p>
                  <p className="text-[11px] text-gray-400">{req.due_date ? `Target: ${formatDueDate(req.due_date)}` : ''}</p>
                </div>
                {/* Action */}
                <div className="flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                  {isPTS && !isTeamPTS && req.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(req)}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">✅</button>
                      <button onClick={() => handleReject(req)}
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all">❌</button>
                    </>
                  )}
                  <button onClick={() => handleOpenDetail(req)}
                    className="w-8 h-8 bg-gray-100 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 rounded-lg flex items-center justify-center transition-all group/btn">
                    <svg className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

                {/* Mobile fallback row */}
              </div>
            );
          })}

          {/* Mobile cards */}
          {!loading && filteredRequests.map((req) => {
            const sc = statusConfig[req.status] || statusConfig.pending;
            const unread = unreadMsgMap[req.id] || 0;
            const dueStatus = getDueStatus(req.due_date, req.status);
            return (
              <div key={`m-${req.id}`} className="md:hidden flex flex-col gap-2 p-4 cursor-pointer hover:bg-teal-50/40 transition-all border-b border-gray-100 last:border-0"
                onClick={() => handleOpenDetail(req)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-gray-800 text-sm truncate">{req.project_name}</p>
                      {unread > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{unread}💬</span>}
                    </div>
                    <p className="text-xs text-gray-400">{req.room_name || '—'} · {req.sales_name || '—'}</p>
                    {dueStatus && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${dueStatus.type === 'overdue' ? 'text-red-600 bg-red-100' : 'text-amber-600 bg-amber-100'}`}>{dueStatus.label}</span>}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border flex-shrink-0 ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">{req.requester_name} · {new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</p>
                  <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                    {isPTS && !isTeamPTS && req.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(req)} className="bg-emerald-500 text-white px-2 py-1 rounded text-xs font-bold">✅</button>
                        <button onClick={() => handleReject(req)} className="bg-red-50 text-red-600 border border-red-200 px-2 py-1 rounded text-xs font-bold">❌</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
      `}</style>
    </div>
  );

  // ── VIEW: DETAIL ──
  if (view === 'detail' && selectedRequest) {
    const sc = statusConfig[selectedRequest.status] || statusConfig.pending;
    const isPending = selectedRequest.status === 'pending';
    const isNotAssigned = !selectedRequest.pts_assigned;
    // ── LOCK: chat & edit blocked when pending OR not yet assigned ──
    const isChatLocked = isPending || (selectedRequest.status === 'approved' && isNotAssigned) || selectedRequest.status === 'rejected';
    const isEditLocked = isPending || isNotAssigned;

    const isFileType = (type: string) => type.startsWith('image/');
    const detailDueStatus = getDueStatus(selectedRequest.due_date, selectedRequest.status);

    const filteredAttachments = activeAttachTab === 'all'
      ? attachments
      : attachments.filter(a => a.attachment_category === activeAttachTab);

    return (
      <div className="h-full flex flex-col bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <NotifToast />

        {assignModal.open && assignModal.req && (
          <AssignPTSModal
            req={assignModal.req}
            onClose={() => setAssignModal({ open: false, req: null })}
            onAssigned={() => {
              setAssignModal({ open: false, req: null });
              notify('success', `Request diapprove & di-assign ke Tim PTS!`);
              fetchRequests();
              if (selectedRequest) {
                setSelectedRequest(prev => prev ? { ...prev, status: 'approved' } : null);
                fetchMessages(selectedRequest.id);
              }
            }}
            currentUser={currentUser}
          />
        )}

        {/* Reject Modal */}
        {rejectModal.open && rejectModal.req && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500 animate-scale-in">
              <div className="flex items-center gap-3 mb-4">
                <div><h3 className="text-lg font-bold text-gray-800">Tolak Request</h3><p className="text-xs text-gray-500">{rejectModal.req.project_name}</p></div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4 text-xs text-red-800 font-medium">Alasan penolakan akan terlihat di chat oleh semua pihak.</div>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} placeholder="Tuliskan alasan penolakan (opsional)..." rows={3}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 text-sm mb-4 focus:border-red-500 outline-none resize-none transition-all" />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleRejectConfirm} className="bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl font-bold hover:from-red-700 hover:to-red-900 transition-all">Tolak Request</button>
                <button onClick={() => { setRejectModal({ open: false, req: null }); setRejectNote(''); }} className="bg-gray-100 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-200 transition-all">Batal</button>
              </div>
            </div>
          </div>
        )}

        {/* ── EDIT FORM MODAL — shows ALL fields, compact popup ── */}
        {editFormModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col border-2 border-amber-400 animate-scale-in" style={{ maxHeight: '85vh' }}>
              <div className="bg-gradient-to-r from-amber-500 to-amber-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div><h3 className="font-bold text-lg">✏️ Edit Detail Kebutuhan</h3><p className="text-amber-100 text-xs">{selectedRequest.project_name}</p></div>
                <button onClick={() => setEditFormModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all text-white font-bold text-lg">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Nama Project</label>
                    <input value={editFormData.project_name} onChange={e => setEditFormData({ ...editFormData, project_name: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Nama Ruangan</label>
                    <input value={editFormData.room_name} onChange={e => setEditFormData({ ...editFormData, room_name: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Nama Sales</label>
                    <input value={editFormData.sales_name} onChange={e => setEditFormData({ ...editFormData, sales_name: e.target.value })} className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                  </div>
                </div>

                {/* Divisi */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Divisi Sales</label>
                  <div className="flex flex-wrap gap-2">
                    {SALES_DIVISIONS.map(div => (
                      <button key={div} type="button" onClick={() => setEditFormData({ ...editFormData, sales_division: div })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.sales_division === div ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{div}</button>
                    ))}
                  </div>
                </div>

                {/* Kebutuhan */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Kategori Kebutuhan</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Signage', 'Immersive', 'Meeting Room', 'Mapping', 'Command Center', 'Hybrid Classroom'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, kebutuhan: toggleArr(editFormData.kebutuhan, opt) })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.kebutuhan.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                    ))}
                  </div>
                  <input value={editFormData.kebutuhan_other} onChange={e => setEditFormData({ ...editFormData, kebutuhan_other: e.target.value })} placeholder="Other kebutuhan..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                </div>

                {/* Solution */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Solution Product</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['Videowall', 'Signage Display', 'Projector', 'Kiosk', 'IFP'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, solution_product: toggleArr(editFormData.solution_product, opt) })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.solution_product.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                    ))}
                  </div>
                  <input value={editFormData.solution_other} onChange={e => setEditFormData({ ...editFormData, solution_other: e.target.value })} placeholder="Other solution..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                </div>

                {/* Layout & CMS */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Layout Signage</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Full Screen', 'Split Screen', 'Portrait', 'Landscape', 'Custom'].map(opt => (
                        <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, layout_signage: toggleArr(editFormData.layout_signage, opt) })}
                          className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.layout_signage.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Jaringan CMS</label>
                    <div className="flex flex-wrap gap-1.5">
                      {['Internet', 'Intranet', 'Offline'].map(opt => (
                        <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, jaringan_cms: toggleArr(editFormData.jaringan_cms, opt) })}
                          className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.jaringan_cms.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* I/O & Source */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Jumlah Input</label>
                    <input value={editFormData.jumlah_input} onChange={e => setEditFormData({ ...editFormData, jumlah_input: e.target.value })} placeholder="e.g. 4" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Jumlah Output</label>
                    <input value={editFormData.jumlah_output} onChange={e => setEditFormData({ ...editFormData, jumlah_output: e.target.value })} placeholder="e.g. 2" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Source</label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['PC', 'URL', 'NVR', 'Laptop'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, source: toggleArr(editFormData.source, opt) })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.source.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                    ))}
                  </div>
                  <input value={editFormData.source_other} onChange={e => setEditFormData({ ...editFormData, source_other: e.target.value })} placeholder="Other source..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                </div>

                {/* Camera */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Camera Conference</label>
                  <div className="flex gap-2 mb-2">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, camera_conference: opt })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.camera_conference === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                    ))}
                  </div>
                  {editFormData.camera_conference === 'Yes' && (
                    <div className="pl-3 border-l-4 border-amber-300 space-y-2">
                      <input value={editFormData.camera_jumlah} onChange={e => setEditFormData({ ...editFormData, camera_jumlah: e.target.value })} placeholder="Jumlah kamera..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                      <div className="flex flex-wrap gap-1.5">
                        {['No Tracking', 'Voice', 'Human Detection', 'Track Mic Delegate'].map(opt => (
                          <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, camera_tracking: toggleArr(editFormData.camera_tracking, opt) })}
                            className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.camera_tracking.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Audio */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Audio System</label>
                  <div className="flex gap-2 mb-2">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, audio_system: opt })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.audio_system === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                    ))}
                  </div>
                  {editFormData.audio_system === 'Yes' && (
                    <div className="pl-3 border-l-4 border-amber-300 space-y-2">
                      <div className="flex gap-2">
                        {['Analog', 'DSP Mixer'].map(opt => (
                          <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, audio_mixer: opt })}
                            className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.audio_mixer === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['Mic', 'PC Audio', 'Speaker'].map(opt => (
                          <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, audio_detail: toggleArr(editFormData.audio_detail, opt) })}
                            className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.audio_detail.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Wallplate */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Wallplate Input</label>
                    <div className="flex gap-2 mb-2">
                      {['Yes', 'No'].map(opt => (
                        <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, wallplate_input: opt })}
                          className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.wallplate_input === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                      ))}
                    </div>
                    {editFormData.wallplate_input === 'Yes' && (
                      <input value={editFormData.wallplate_jumlah} onChange={e => setEditFormData({ ...editFormData, wallplate_jumlah: e.target.value })} placeholder="Jumlah..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Tabletop Input</label>
                    <div className="flex gap-2 mb-2">
                      {['Yes', 'No'].map(opt => (
                        <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, tabletop_input: opt })}
                          className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.tabletop_input === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                      ))}
                    </div>
                    {editFormData.tabletop_input === 'Yes' && (
                      <input value={editFormData.tabletop_jumlah} onChange={e => setEditFormData({ ...editFormData, tabletop_jumlah: e.target.value })} placeholder="Jumlah..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                    )}
                  </div>
                </div>

                {/* Wireless */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Wireless Presentation</label>
                  <div className="flex gap-2 mb-2">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, wireless_presentation: opt })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.wireless_presentation === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                    ))}
                  </div>
                  {editFormData.wireless_presentation === 'Yes' && (
                    <div className="pl-3 border-l-4 border-amber-300 space-y-2">
                      <div className="flex gap-2">
                        {['BYOM', 'BYOD'].map(opt => (
                          <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, wireless_mode: toggleArr(editFormData.wireless_mode, opt) })}
                            className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.wireless_mode.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <label className="text-xs text-gray-500 font-bold uppercase tracking-widest self-center">Dongle:</label>
                        {['Yes', 'No'].map(opt => (
                          <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, wireless_dongle: opt })}
                            className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.wireless_dongle === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Controller */}
                <div>
                  <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Controller Automation</label>
                  <div className="flex gap-2 mb-2">
                    {['Yes', 'No'].map(opt => (
                      <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, controller_automation: opt })}
                        className={`px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all ${editFormData.controller_automation === opt ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                    ))}
                  </div>
                  {editFormData.controller_automation === 'Yes' && (
                    <div className="pl-3 border-l-4 border-amber-300 flex gap-2 flex-wrap">
                      {['Tablet or iPad', 'Touchscreen 10"'].map(opt => (
                        <button key={opt} type="button" onClick={() => setEditFormData({ ...editFormData, controller_type: toggleArr(editFormData.controller_type, opt) })}
                          className={`px-2.5 py-1 rounded-lg border-2 text-xs font-semibold transition-all ${editFormData.controller_type.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300'}`}>{opt}</button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ukuran & Keterangan */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Ukuran Ruangan (P × L × T)</label>
                    <input value={editFormData.ukuran_ruangan} onChange={e => setEditFormData({ ...editFormData, ukuran_ruangan: e.target.value })} placeholder="e.g. 10m × 8m × 3m" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Suggest Tampilan</label>
                    <textarea value={editFormData.suggest_tampilan} onChange={e => setEditFormData({ ...editFormData, suggest_tampilan: e.target.value })} rows={2} placeholder="Deskripsi tampilan..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all resize-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Keterangan Lain</label>
                    <textarea value={editFormData.keterangan_lain} onChange={e => setEditFormData({ ...editFormData, keterangan_lain: e.target.value })} rows={2} placeholder="Informasi tambahan..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0 px-5 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 rounded-b-2xl">
                <button onClick={() => setEditFormModal(false)} className="px-5 py-2.5 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-all">Batal</button>
                <button onClick={handleEditFormSubmit} className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-700 text-white rounded-xl font-bold hover:from-amber-600 hover:to-amber-800 transition-all shadow-md">💾 Simpan</button>
              </div>
            </div>
          </div>
        )}

        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gradient-to-r from-teal-500 via-cyan-500 to-teal-600 pointer-events-none">
          <div className="h-full bg-gradient-to-r from-transparent via-white/50 to-transparent animate-pulse" />
        </div>

        {/* Detail Header */}
        <div className="bg-white/95 backdrop-blur-md border-b-4 border-teal-600 px-6 py-4 flex-shrink-0 shadow-xl">
          <div className="flex items-center gap-4">
            <button onClick={() => { activeRequestIdRef.current = null; setView('list'); }} className="bg-gradient-to-r from-gray-600 to-gray-800 text-white p-2 rounded-xl hover:from-gray-700 hover:to-gray-900 font-bold shadow-md transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-800 truncate">{selectedRequest.project_name}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
                {selectedRequest.pts_assigned && <span className="bg-teal-100 text-teal-800 px-2.5 py-1 rounded-full text-xs font-bold border border-teal-300">🔧 {selectedRequest.pts_assigned}</span>}
              </div>
              <p className="text-gray-600 text-sm mt-0.5">{selectedRequest.room_name && `📍 ${selectedRequest.room_name}`}{selectedRequest.sales_name && ` · 👤 ${selectedRequest.sales_name}`}{selectedRequest.sales_division && ` (${selectedRequest.sales_division})`}</p>
            </div>
            {/* Actions */}
            {isPTS && !isTeamPTS && (
              <div className="flex gap-2 flex-shrink-0">
                {selectedRequest.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(selectedRequest)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">✅ Approve</button>
                    <button onClick={() => handleReject(selectedRequest)} className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300 px-4 py-2 rounded-xl text-sm font-bold transition-all">❌ Tolak</button>
                  </>
                )}
                {selectedRequest.status !== 'pending' && selectedRequest.status !== 'rejected' && (
                  <select value={selectedRequest.status} onChange={e => handleStatusUpdate(selectedRequest, e.target.value)}
                    className="border-2 border-teal-300 rounded-xl px-3 py-2 text-sm font-bold text-teal-700 bg-teal-50 outline-none cursor-pointer">
                    <option value="approved">✅ Approved</option>
                    <option value="in_progress">🔄 In Progress</option>
                    <option value="completed">🏁 Completed</option>
                  </select>
                )}
                <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl text-sm font-bold transition-all">🖨️ Print</button>
              </div>
            )}
            {isTeamPTS && <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0">🖨️ Print</button>}
            {!isPTS && (
              <div className="flex gap-2 flex-shrink-0">
                {selectedRequest.status !== 'rejected' && (
                  <button onClick={handleOpenEditForm} disabled={isEditLocked}
                    title={isEditLocked ? 'Edit tersedia setelah request di-approve & di-assign' : 'Edit Detail'}
                    className={`border-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${isEditLocked ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'}`}>
                    ✏️ Edit Kebutuhan
                  </button>
                )}
                <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl text-sm font-bold transition-all">🖨️ Print</button>
              </div>
            )}
          </div>

          {/* Lock notice banner */}
          {(isPending || isNotAssigned) && selectedRequest.status !== 'rejected' && (
            <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-amber-800">
              <span className="text-base">🔒</span>
              {isPending
                ? 'Chat dan Edit tidak tersedia sampai request di-approve oleh Admin.'
                : 'Chat dan Edit tidak tersedia sampai request di-assign ke Tim PTS.'}
            </div>
          )}

          {/* Due date */}
          {selectedRequest.due_date && (
            <div className={`mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${detailDueStatus?.type === 'overdue' ? 'bg-red-100 text-red-800 border-red-300' : detailDueStatus?.type === 'urgent' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-gray-100 text-gray-700 border-gray-300'}`}>
              📅 Target: {formatDueDate(selectedRequest.due_date)} {detailDueStatus && `· ${detailDueStatus.label}`}
            </div>
          )}
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Details + Attachments */}
          <div className="w-[400px] flex-shrink-0 border-r-2 border-gray-200 flex flex-col overflow-hidden bg-white/90 backdrop-blur-sm">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Detail Section */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 space-y-2.5 text-sm border-2 border-gray-200 shadow-md">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                  <p className="text-xs font-bold text-teal-600 tracking-widest uppercase">Detail Kebutuhan</p>
                  {!isPTS && selectedRequest.status !== 'rejected' && (
                    <button onClick={handleOpenEditForm} disabled={isEditLocked}
                      title={isEditLocked ? 'Edit tersedia setelah approve & assign' : 'Edit'}
                      className={`text-xs border px-2 py-0.5 rounded-lg font-bold transition-all ${isEditLocked ? 'opacity-30 cursor-not-allowed text-gray-400 border-gray-200' : 'bg-amber-50 hover:bg-amber-100 text-amber-700 border-amber-300'}`}>
                      Edit
                    </button>
                  )}
                </div>
                {selectedRequest.kebutuhan?.length > 0 && <div><span className="font-bold text-gray-700">Kebutuhan:</span> <span className="text-gray-600">{selectedRequest.kebutuhan.join(', ')}</span></div>}
                {selectedRequest.kebutuhan_other && <div><span className="font-bold text-gray-700">Other:</span> <span className="text-gray-600">{selectedRequest.kebutuhan_other}</span></div>}
                {selectedRequest.solution_product?.length > 0 && <div><span className="font-bold text-gray-700">Solution:</span> <span className="text-gray-600">{selectedRequest.solution_product.join(', ')}</span></div>}
                {selectedRequest.solution_other && <div><span className="font-bold text-gray-700">Other Solution:</span> <span className="text-gray-600">{selectedRequest.solution_other}</span></div>}
                {selectedRequest.layout_signage?.length > 0 && <div><span className="font-bold text-gray-700">Layout:</span> <span className="text-gray-600">{selectedRequest.layout_signage.join(', ')}</span></div>}
                {selectedRequest.jaringan_cms?.length > 0 && <div><span className="font-bold text-gray-700">CMS:</span> <span className="text-gray-600">{selectedRequest.jaringan_cms.join(', ')}</span></div>}
                {(selectedRequest.jumlah_input || selectedRequest.jumlah_output) && <div><span className="font-bold text-gray-700">I/O:</span> <span className="text-gray-600">Input {selectedRequest.jumlah_input || '—'} / Output {selectedRequest.jumlah_output || '—'}</span></div>}
                {selectedRequest.source?.length > 0 && <div><span className="font-bold text-gray-700">Source:</span> <span className="text-gray-600">{selectedRequest.source.join(', ')}{selectedRequest.source_other ? `, ${selectedRequest.source_other}` : ''}</span></div>}
                <div><span className="font-bold text-gray-700">Camera:</span> <span className="text-gray-600">{selectedRequest.camera_conference}{selectedRequest.camera_jumlah ? ` (${selectedRequest.camera_jumlah} unit)` : ''}</span></div>
                {selectedRequest.camera_tracking?.length > 0 && <div><span className="font-bold text-gray-700">Tracking:</span> <span className="text-gray-600">{selectedRequest.camera_tracking.join(', ')}</span></div>}
                <div><span className="font-bold text-gray-700">Audio:</span> <span className="text-gray-600">{selectedRequest.audio_system}{selectedRequest.audio_mixer ? ` — ${selectedRequest.audio_mixer}` : ''}{selectedRequest.audio_detail?.length > 0 ? ` (${selectedRequest.audio_detail.join(', ')})` : ''}</span></div>
                <div><span className="font-bold text-gray-700">Wallplate:</span> <span className="text-gray-600">{selectedRequest.wallplate_input}{selectedRequest.wallplate_jumlah ? ` (${selectedRequest.wallplate_jumlah})` : ''}</span></div>
                <div><span className="font-bold text-gray-700">Tabletop:</span> <span className="text-gray-600">{selectedRequest.tabletop_input}{selectedRequest.tabletop_jumlah ? ` (${selectedRequest.tabletop_jumlah})` : ''}</span></div>
                <div><span className="font-bold text-gray-700">Wireless:</span> <span className="text-gray-600">{selectedRequest.wireless_presentation}{selectedRequest.wireless_mode?.length > 0 ? ` — ${selectedRequest.wireless_mode.join(', ')}` : ''}{selectedRequest.wireless_dongle !== 'No' ? ` · Dongle: ${selectedRequest.wireless_dongle}` : ''}</span></div>
                <div><span className="font-bold text-gray-700">Controller:</span> <span className="text-gray-600">{selectedRequest.controller_automation}{selectedRequest.controller_type?.length > 0 ? ` — ${selectedRequest.controller_type.join(', ')}` : ''}</span></div>
                {selectedRequest.ukuran_ruangan && <div><span className="font-bold text-gray-700">Ukuran:</span> <span className="text-gray-600">{selectedRequest.ukuran_ruangan}</span></div>}
                {selectedRequest.suggest_tampilan && <div><span className="font-bold text-gray-700">Suggest:</span> <span className="text-gray-600">{selectedRequest.suggest_tampilan}</span></div>}
                {selectedRequest.keterangan_lain && <div><span className="font-bold text-gray-700">Keterangan:</span> <span className="text-gray-600">{selectedRequest.keterangan_lain}</span></div>}
              </div>

              {/* PTS Admin controls */}
              {isPTS && !isTeamPTS && selectedRequest.status !== 'pending' && selectedRequest.status !== 'rejected' && (
                <div className="bg-white rounded-2xl p-4 border-2 border-teal-200 shadow-sm space-y-3">
                  <p className="text-xs font-bold text-teal-600 uppercase tracking-widest">Admin Controls</p>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Set Target Selesai</label>
                    <div className="flex gap-2">
                      <input type="date" defaultValue={selectedRequest.due_date || ''}
                        id={`due-${selectedRequest.id}`}
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-teal-400 transition-all" />
                      <button onClick={async () => {
                        const val = (document.getElementById(`due-${selectedRequest.id}`) as HTMLInputElement)?.value;
                        const { error } = await supabase.from('project_requests').update({ due_date: val || null }).eq('id', selectedRequest.id);
                        if (!error) { notify('success', val ? `Target diset: ${formatDueDate(val)}` : 'Target dihapus.'); fetchRequests(); }
                        else notify('error', 'Gagal menyimpan target.');
                      }} className="bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex-shrink-0">
                        Simpan
                      </button>
                    </div>
                  </div>
                  <button onClick={() => setAssignModal({ open: true, req: selectedRequest })}
                    className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-2 border-teal-200 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                    👥 Re-assign Tim PTS
                  </button>
                </div>
              )}

              {/* Attachments */}
              <div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                <input ref={sldFileRef} type="file" className="hidden" accept=".pdf"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCategoryUpload(f, 'sld'); e.target.value = ''; }} />
                <input ref={boqFileRef} type="file" className="hidden" accept=".xlsx,.xls"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCategoryUpload(f, 'boq'); e.target.value = ''; }} />
                <input ref={design3dFileRef} type="file" className="hidden" accept=".pdf"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCategoryUpload(f, 'design3d'); e.target.value = ''; }} />

                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">Attachments</p>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-2.5 py-1 rounded-lg font-bold transition-all flex items-center gap-1">
                      📎 Upload
                    </button>
                  </div>

                  {/* Category tabs */}
                  <div className="flex border-b border-gray-100">
                    {(['all', 'sld', 'boq', 'design3d'] as const).map(tab => (
                      <button key={tab} onClick={() => setActiveAttachTab(tab)}
                        className={`flex-1 py-2 text-[11px] font-bold uppercase transition-all ${activeAttachTab === tab ? 'text-teal-700 border-b-2 border-teal-500 bg-teal-50' : 'text-gray-400 hover:text-gray-600'}`}>
                        {tab === 'all' ? 'All' : tab === 'design3d' ? '3D' : tab.toUpperCase()}
                      </button>
                    ))}
                  </div>

                  {/* Category upload buttons for PTS */}
                  {isPTS && selectedRequest.status !== 'pending' && selectedRequest.status !== 'rejected' && (
                    <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50">
                      {[
                        { cat: 'sld' as const, ref: sldFileRef, label: '📐 SLD', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                        { cat: 'boq' as const, ref: boqFileRef, label: '📊 BOQ', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                        { cat: 'design3d' as const, ref: design3dFileRef, label: '🎨 3D', color: 'bg-purple-50 text-purple-700 border-purple-200' },
                      ].map(({ cat, ref, label, color }) => (
                        <button key={cat} onClick={() => ref.current?.click()} disabled={uploadingCategory === cat}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${color}`}>
                          {uploadingCategory === cat ? <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" /> : label}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {filteredAttachments.length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-6">Belum ada attachment</p>
                    ) : filteredAttachments.map(att => (
                      <div key={att.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-all">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 text-base">
                          {isFileType(att.file_type) ? '🖼️' : att.file_type === 'application/pdf' ? '📄' : att.file_type.includes('sheet') || att.file_type.includes('excel') ? '📊' : '📎'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-semibold text-gray-700 truncate">{att.file_name}</p>
                            {att.attachment_category !== 'general' && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${att.attachment_category === 'sld' ? 'bg-blue-100 text-blue-700' : att.attachment_category === 'boq' ? 'bg-emerald-100 text-emerald-700' : 'bg-purple-100 text-purple-700'}`}>
                                {att.attachment_category === 'design3d' ? '3D' : att.attachment_category?.toUpperCase()}
                                {att.revision_version ? ` R${att.revision_version}` : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-400">{formatFileSize(att.file_size)} · {att.uploaded_by}</p>
                        </div>
                        <a href={att.file_url} target="_blank" rel="noreferrer"
                          className="text-xs text-teal-600 hover:text-teal-800 font-bold flex-shrink-0">↗️</a>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Chat */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white/80 backdrop-blur-sm">
            <div className="px-5 py-3 border-b border-gray-200 bg-white/95 flex-shrink-0">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">💬 Discussion Chat</p>
              <p className="text-xs text-gray-400 mt-0.5">{messages.filter(m => m.sender_role !== 'system').length} pesan · {selectedRequest.requester_name}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                  <div className="text-5xl">💬</div>
                  <p className="font-medium text-sm">Belum ada pesan</p>
                </div>
              ) : messages.map(msg => {
                const isSystem = msg.sender_role === 'system';
                const isMe = msg.sender_id === currentUser.id;
                if (isSystem) return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-gray-100 text-gray-500 text-xs px-4 py-2 rounded-full font-medium max-w-sm text-center">{msg.message}</div>
                  </div>
                );
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <p className="text-[10px] text-gray-400 font-medium px-1">{isMe ? 'Saya' : msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm ${isMe ? 'bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'}`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat input */}
            <div className="flex-shrink-0 p-4 border-t border-gray-200 bg-white/95">
              {selectedRequest.status === 'rejected' ? (
                <div className="flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-sm font-bold text-red-700">Request ini telah ditolak. Chat tidak tersedia.</div>
              ) : isChatLocked ? (
                <div className="flex items-center justify-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold text-amber-700">
                  <span>🔒</span>
                  {isPending
                    ? 'Chat tersedia setelah request di-approve oleh Admin.'
                    : 'Chat tersedia setelah request di-assign ke Tim PTS.'}
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className="flex-1 flex items-end gap-2 bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-2 focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
                    <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                      placeholder="Ketik pesan... (Enter untuk kirim)"
                      rows={1} className="flex-1 bg-transparent text-sm text-gray-800 outline-none resize-none max-h-32 placeholder-gray-400 font-medium" />
                    <button onClick={() => chatFileRef.current?.click()} className="text-gray-400 hover:text-teal-600 transition-colors p-1 flex-shrink-0">
                      {uploadingFile ? <div className="w-5 h-5 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                    </button>
                    <input ref={chatFileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                  </div>
                  <button onClick={handleSendMessage} disabled={sendingMsg || !msgText.trim()}
                    className="bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white p-3 rounded-2xl transition-all disabled:opacity-50 flex-shrink-0 shadow-xl">
                    {sendingMsg ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes scale-in { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
          .animate-scale-in { animation: scale-in 0.2s ease-out; }
        `}</style>
      </div>
    );
  }

  return null;
}

// ─── Page Root ────────────────────────────────────────────────────────────────

export default function Page() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('pts_user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-gray-500 font-medium">Memuat...</p>
      </div>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center border-2 border-teal-200">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500 text-sm">Silakan login terlebih dahulu melalui dashboard.</p>
      </div>
    </div>
  );

  return <FormRequireProject currentUser={currentUser} />;
}
