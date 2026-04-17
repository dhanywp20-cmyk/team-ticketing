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
    slices.push({ d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: item.color });
    startAngle = endAngle;
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-gray-200 shadow-md">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative flex-shrink-0">
          <svg viewBox="0 0 100 100" className="w-24 h-24">
            {slices.map((s, i) => <path key={i} d={s.d} fill={s.color} />)}
            <circle cx={cx} cy={cy} r={22} fill="white" />
            <text x={cx} y={cy - 4} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#374151">{total}</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="7" fill="#9ca3af">TOTAL</text>
          </svg>
        </div>
        <div className="flex-1 space-y-1.5 min-w-0">
          {items.filter(i => i.value > 0).map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-600 truncate font-medium">{item.label}</span>
              </div>
              <span className="text-xs font-bold flex-shrink-0" style={{ color: item.color }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Assign PTS Modal ────────────────────────────────────────────────────────

function AssignPTSModal({
  req,
  onClose,
  onAssigned,
  currentUser,
}: {
  req: ProjectRequest;
  onClose: () => void;
  onAssigned: () => void;
  currentUser: User;
}) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selected, setSelected] = useState(req.pts_assigned || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from('users')
      .select('*')
      .in('role', ['team_pts', 'team'])
      .then(({ data }: { data: User[] | null }) => { if (data) setTeamMembers(data as User[]); });
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase
      .from('project_requests')
      .update({ pts_assigned: selected, status: 'approved', approved_by: currentUser.full_name, approved_at: new Date().toISOString() })
      .eq('id', req.id);
    if (!error) {
      await supabase.from('project_messages').insert([{
        request_id: req.id,
        sender_id: currentUser.id,
        sender_name: 'System',
        sender_role: 'system',
        message: `✅ Request diapprove oleh ${currentUser.full_name} dan di-assign ke ${selected}. Tim PTS akan segera memproses.`,
      }]);
      onAssigned();
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-teal-500 animate-scale-in overflow-hidden">
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">✅ Approve & Assign ke Tim PTS</h3>
            <p className="text-teal-100 text-xs mt-0.5">{req.project_name}</p>
          </div>
          <button onClick={onClose} className="bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-lg flex items-center justify-center font-bold transition-all">✕</button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4 font-medium">Pilih anggota Tim PTS yang akan menangani request ini:</p>
          {teamMembers.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <div className="text-3xl mb-2">👥</div>
              <p>Tidak ada Team PTS tersedia</p>
            </div>
          ) : (
            <div className="space-y-2 mb-5">
              {teamMembers.map(m => (
                <button key={m.id} type="button" onClick={() => setSelected(m.full_name)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${selected === m.full_name ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300 bg-white'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${selected === m.full_name ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {m.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${selected === m.full_name ? 'text-teal-700' : 'text-gray-700'}`}>{m.full_name}</p>
                    <p className="text-xs text-gray-400">{m.role}</p>
                  </div>
                  {selected === m.full_name && <div className="ml-auto text-teal-600 font-bold">✓</div>}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">Batal</button>
            <button onClick={handleSave} disabled={!selected || saving}
              className="flex-[2] bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
              Approve & Assign
            </button>
          </div>
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
  const [unreadCount, setUnreadCount] = useState(0);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSales, setSearchSales] = useState('');
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
  const [editFormData, setEditFormData] = useState({project_name:'',room_name:'',sales_name:'',kebutuhan:[] as string[],kebutuhan_other:'',solution_product:[] as string[],solution_other:'',layout_signage:[] as string[],jaringan_cms:[] as string[],jumlah_input:'',jumlah_output:'',source:[] as string[],source_other:'',camera_conference:'No',camera_jumlah:'',camera_tracking:[] as string[],audio_system:'No',audio_mixer:'',audio_detail:[] as string[],wallplate_input:'No',wallplate_jumlah:'',tabletop_input:'No',tabletop_jumlah:'',wireless_presentation:'No',wireless_mode:[] as string[],wireless_dongle:'No',controller_automation:'No',controller_type:[] as string[],ukuran_ruangan:'',suggest_tampilan:'',keterangan_lain:''});

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
    if (!isPTS) query = query.eq('requester_id', currentUser.id);
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
        attachment_category: (a.attachment_category as string) === 'design3d' ? 'design3d' : a.attachment_category || 'general',
      }));
      setAttachments(normalized);
    }
  }, []);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    const channel = supabase.channel('global_messages_notif')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_messages' },
        (payload) => {
          const msg = payload.new as ProjectMessage;
          if (msg.sender_role === 'system') return;
          setUnreadMsgMap(prev => {
            if (!selectedRequest || selectedRequest.id !== msg.request_id) {
              return { ...prev, [msg.request_id]: (prev[msg.request_id] || 0) + 1 };
            }
            return prev;
          });
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedRequest]);

  useEffect(() => {
    if (!isPTS) return;
    const pendingCount = requests.filter(r => r.status === 'pending').length;
    setUnreadCount(pendingCount);
  }, [requests, isPTS]);

  useEffect(() => {
    if (!selectedRequest) {
      activeRequestIdRef.current = null;
      return;
    }
    const reqId = selectedRequest.id;
    activeRequestIdRef.current = reqId;

    const channelName = `detail_chat:${reqId}_${Date.now()}`;
    const channel = supabase.channel(channelName)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_messages', filter: `request_id=eq.${reqId}` },
        (payload) => {
          if (activeRequestIdRef.current !== reqId) return;
          setMessages(prev => {
            const exists = prev.some(m => m.id === (payload.new as ProjectMessage).id);
            if (exists) return prev;
            return [...prev, payload.new as ProjectMessage];
          });
          const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
          stored[reqId] = Date.now();
          localStorage.setItem('pts_last_seen', JSON.stringify(stored));
        })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'project_attachments', filter: `request_id=eq.${reqId}` },
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
    // For superadmin/admin: open assign modal
    if (isSuperAdmin || isAdmin) {
      setAssignModal({ open: true, req });
    } else {
      // Direct approve without assignment
      const { error } = await supabase.from('project_requests').update({ status: 'approved', approved_by: currentUser.full_name, approved_at: new Date().toISOString(), pts_assigned: currentUser.full_name }).eq('id', req.id);
      if (error) { notify('error', 'Gagal approve: ' + error.message); return; }
      notify('success', 'Request diapprove!');
      fetchRequests();
      if (selectedRequest?.id === req.id) setSelectedRequest({ ...req, status: 'approved', approved_by: currentUser.full_name, pts_assigned: currentUser.full_name });
      await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `✅ Request telah diapprove oleh ${currentUser.full_name}. Tim PTS akan segera memproses.` }]);
      if (selectedRequest?.id === req.id) fetchMessages(req.id);
    }
  };

  const handleReject = (req: ProjectRequest) => {
    setRejectNote('');
    setRejectModal({ open: true, req });
  };

  const handleRejectConfirm = async () => {
    const req = rejectModal.req;
    if (!req) return;
    const { error } = await supabase.from('project_requests').update({ status: 'rejected' }).eq('id', req.id);
    if (error) { notify('error', 'Gagal reject.'); return; }
    notify('info', 'Request ditolak.');
    setRejectModal({ open: false, req: null });
    setRejectNote('');
    fetchRequests();
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
      sales_name: selectedRequest.sales_name || '', kebutuhan: selectedRequest.kebutuhan || [],
      kebutuhan_other: selectedRequest.kebutuhan_other || '', solution_product: selectedRequest.solution_product || [],
      solution_other: selectedRequest.solution_other || '', layout_signage: selectedRequest.layout_signage || [],
      jaringan_cms: selectedRequest.jaringan_cms || [], jumlah_input: selectedRequest.jumlah_input || '',
      jumlah_output: selectedRequest.jumlah_output || '', source: selectedRequest.source || [],
      source_other: selectedRequest.source_other || '', camera_conference: selectedRequest.camera_conference || 'No',
      camera_jumlah: selectedRequest.camera_jumlah || '', camera_tracking: selectedRequest.camera_tracking || [],
      audio_system: selectedRequest.audio_system || 'No', audio_mixer: selectedRequest.audio_mixer || '', audio_detail: selectedRequest.audio_detail || [],
      wallplate_input: selectedRequest.wallplate_input || 'No', wallplate_jumlah: selectedRequest.wallplate_jumlah || '',
      tabletop_input: selectedRequest.tabletop_input || 'No', tabletop_jumlah: selectedRequest.tabletop_jumlah || '',
      wireless_presentation: selectedRequest.wireless_presentation || 'No', wireless_mode: selectedRequest.wireless_mode || [], wireless_dongle: selectedRequest.wireless_dongle || 'No',
      controller_automation: selectedRequest.controller_automation || 'No', controller_type: selectedRequest.controller_type || [],
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
    await supabase.from('project_messages').insert([{
      request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system',
      message: 'Detail kebutuhan diperbarui oleh ' + currentUser.full_name + ' pada ' + new Date().toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '.',
    }]);
    setEditFormModal(false);
    setSelectedRequest({ ...selectedRequest, ...editFormData } as ProjectRequest);
    fetchRequests();
    fetchMessages(selectedRequest.id);
  };

  const handlePrint = async () => {
    if (!selectedRequest) return;
    const sldList = attachments.filter(a => a.attachment_category === 'sld').sort((a, b) => (b.revision_version || 0) - (a.revision_version || 0));
    const boqList = attachments.filter(a => a.attachment_category === 'boq').sort((a, b) => (b.revision_version || 0) - (a.revision_version || 0));
    const design3dList = attachments.filter(a => a.attachment_category === 'design3d').sort((a, b) => (b.revision_version || 0) - (a.revision_version || 0));
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const safeProjectName = selectedRequest.project_name.replace(/[^a-zA-Z0-9_\-. ]/g, '').replace(/\s+/g, '_').slice(0, 40);
    const folderName = safeProjectName + '_' + dd + mm + yyyy;
    notify('info', '⏳ Menyiapkan file untuk didownload...');
    let JSZip: any;
    try {
      await new Promise<void>((resolve, reject) => {
        if ((window as any).JSZip) { JSZip = (window as any).JSZip; resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => { JSZip = (window as any).JSZip; resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch { notify('error', 'Gagal memuat library ZIP.'); return; }
    const zip = new JSZip();
    const folder = zip.folder(folderName);
    const fetchFile = async (url: string): Promise<ArrayBuffer | null> => {
      try { const res = await fetch(url); if (!res.ok) return null; return await res.arrayBuffer(); } catch { return null; }
    };
    folder!.file('01_Detail_Kebutuhan.html', '<html><body><h1>' + selectedRequest.project_name + '</h1></body></html>');
    if (sldList.length > 0) { const latest = sldList[0]; const buf = await fetchFile(latest.file_url); if (buf) folder!.file('02_SLD.' + (latest.file_name.split('.').pop() || 'pdf'), buf); }
    if (boqList.length > 0) { const latest = boqList[0]; const buf = await fetchFile(latest.file_url); if (buf) folder!.file('03_BOQ.' + (latest.file_name.split('.').pop() || 'xlsx'), buf); }
    if (design3dList.length > 0) { const latest = design3dList[0]; const buf = await fetchFile(latest.file_url); if (buf) folder!.file('04_Design3D.' + (latest.file_name.split('.').pop() || 'pdf'), buf); }
    try {
      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = folderName + '.zip'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      notify('success', '✅ ZIP berhasil didownload: ' + folderName + '.zip');
    } catch { notify('error', 'Gagal membuat file ZIP.'); }
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
    if (!msgText.trim() || !selectedRequest) return;
    if (selectedRequest.status === 'rejected') { notify('error', 'Request ini sudah ditolak. Tidak bisa mengirim pesan.'); return; }
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
    pending:     { label: 'Pending',     color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-300' },
    approved:    { label: 'Approved',    color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300' },
    in_progress: { label: 'In Progress', color: 'text-teal-700',    bg: 'bg-teal-50',    border: 'border-teal-300' },
    completed:   { label: 'Completed',   color: 'text-purple-700',  bg: 'bg-purple-50',  border: 'border-purple-300' },
    rejected:    { label: 'Rejected',    color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-300' },
  };

  const formatFileSize = (bytes: number) => bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  const formatDate = (dt: string) => new Date(dt).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const formatDueDate = (dt: string) => new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const getDueStatus = (due: string | undefined, status: string) => {
    if (!due || status === 'completed' || status === 'rejected') return null;
    const now = new Date();
    const dueDate = new Date(due);
    const diffMs = dueDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (diffMs < 0) return { type: 'overdue', label: `Telat ${Math.abs(diffDays)} hari`, days: diffDays };
    if (diffDays <= 2) return { type: 'urgent', label: `${diffDays} hari lagi`, days: diffDays };
    return { type: 'ok', label: `${diffDays} hari lagi`, days: diffDays };
  };

  const filteredRequests = requests.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchProject = !searchQuery || r.project_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchSales = !searchSales || (r.sales_name || '').toLowerCase().includes(searchSales.toLowerCase()) || (r.requester_name || '').toLowerCase().includes(searchSales.toLowerCase());
    return matchStatus && matchProject && matchSales;
  });

  const stats = {
    total:       requests.length,
    pending:     requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress' || r.status === 'approved').length,
    completed:   requests.filter(r => r.status === 'completed').length,
    rejected:    requests.filter(r => r.status === 'rejected').length,
  };

  // ── Pie chart data ──
  const PIE_COLORS = {
    status: ['#f59e0b', '#10b981', '#14b8a6', '#8b5cf6', '#ef4444'],
    division: ['#6366f1', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'],
    assigned: ['#6366f1', '#14b8a6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'],
  };

  const statusPieData: PieChartItem[] = [
    { label: 'Pending', value: stats.pending, color: PIE_COLORS.status[0] },
    { label: 'Approved', value: requests.filter(r => r.status === 'approved').length, color: PIE_COLORS.status[1] },
    { label: 'In Progress', value: requests.filter(r => r.status === 'in_progress').length, color: PIE_COLORS.status[2] },
    { label: 'Completed', value: stats.completed, color: PIE_COLORS.status[3] },
    { label: 'Rejected', value: stats.rejected, color: PIE_COLORS.status[4] },
  ];

  const divisionCounts: Record<string, number> = {};
  for (const r of requests) { const d = (r as any).sales_division || 'Lainnya'; divisionCounts[d] = (divisionCounts[d] || 0) + 1; }
  const divisionPieData: PieChartItem[] = Object.entries(divisionCounts).map(([label, value], i) => ({ label, value, color: PIE_COLORS.division[i % PIE_COLORS.division.length] }));

  const assignedCounts: Record<string, number> = {};
  for (const r of requests) { const a = r.pts_assigned || 'Unassigned'; assignedCounts[a] = (assignedCounts[a] || 0) + 1; }
  const assignedPieData: PieChartItem[] = Object.entries(assignedCounts).map(([label, value], i) => ({ label, value, color: PIE_COLORS.assigned[i % PIE_COLORS.assigned.length] }));

  // ── CHECKBOX / RADIO GROUP ──
  const CheckGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string[]; onChange: (v: string[]) => void }) => (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const checked = value.includes(opt);
          return (
            <button key={opt} type="button" onClick={() => onChange(toggleArr(value, opt))}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${checked ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md' : 'border-gray-300 bg-white text-gray-600 hover:border-teal-300 hover:bg-teal-50/50'}`}>
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'border-teal-500 bg-teal-500' : 'border-gray-400'}`}>
                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
              </div>
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );

  const RadioGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="mb-4">
      <label className="block text-xs font-bold text-gray-600 tracking-widest uppercase mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${value === opt ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-md' : 'border-gray-300 bg-white text-gray-600 hover:border-teal-300'}`}>
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
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">📋 Form Equipment Request — IVP</h2>
            <p className="text-teal-100 text-xs mt-0.5">Requester: <span className="font-bold">{currentUser.full_name}</span></p>
          </div>
          <button onClick={() => { setShowNewFormModal(false); setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]); }}
            className="bg-white/20 hover:bg-white/30 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold transition-all text-lg">✕</button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">

          {/* Project Info */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📁</span>
              Informasi Project
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Project *</label>
                <input value={form.project_name} onChange={e => setForm({ ...form, project_name: e.target.value })}
                  placeholder="Contoh: Meeting Room Lantai 5 - PT ABC"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Ruangan</label>
                <input value={form.room_name} onChange={e => setForm({ ...form, room_name: e.target.value })}
                  placeholder="Nama ruangan / area"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Sales / Account</label>
                <input value={form.sales_name} onChange={e => setForm({ ...form, sales_name: e.target.value })}
                  placeholder="Nama Sales / Account Manager"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Divisi Sales</label>
                <div className="flex flex-wrap gap-2">
                  {SALES_DIVISIONS.map(div => (
                    <button key={div} type="button" onClick={() => setForm({ ...form, sales_division: (form as any).sales_division === div ? '' : div } as any)}
                      className={`px-3 py-1.5 rounded-xl border-2 text-sm font-semibold transition-all ${(form as any).sales_division === div ? 'border-teal-500 bg-teal-50 text-teal-700 shadow-sm' : 'border-gray-200 text-gray-500 hover:border-teal-300'}`}>
                      {div}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Kebutuhan & Solution */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">🎯</span>
              Kategori Kebutuhan & Solution
            </h3>
            <CheckGroup label="Kebutuhan" options={['Signage', 'Immersive', 'Meeting Room', 'Mapping', 'Command Center', 'Hybrid Classroom']}
              value={form.kebutuhan} onChange={v => setForm({ ...form, kebutuhan: v })} />
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Kebutuhan</label>
              <input value={form.kebutuhan_other} onChange={e => setForm({ ...form, kebutuhan_other: e.target.value })}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all bg-white outline-none" />
            </div>
            <CheckGroup label="Solution Product" options={['Videowall', 'Signage Display', 'Projector', 'Kiosk', 'IFP']}
              value={form.solution_product} onChange={v => setForm({ ...form, solution_product: v })} />
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Solution</label>
              <input value={form.solution_other} onChange={e => setForm({ ...form, solution_other: e.target.value })}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all bg-white outline-none" />
            </div>
          </div>

          {/* Signage & Network */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📺</span>
              Layout Konten & Jaringan CMS
            </h3>
            <CheckGroup label="Layout Content Signage" options={['Fullscreen only (Image/Video slideshow)', 'Split 2,3 atau multi zone content', 'Running text dan lain-lain']}
              value={form.layout_signage} onChange={v => setForm({ ...form, layout_signage: v })} />
            <CheckGroup label="Jaringan CMS Signage" options={['Cloud Base', 'On-Premise']}
              value={form.jaringan_cms} onChange={v => setForm({ ...form, jaringan_cms: v })} />
          </div>

          {/* Source & I/O */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">🔌</span>
              Sumber & Input / Output
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
                  placeholder="e.g. 8m × 6m × 3m" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Suggest Tampilan (W × H)</label>
                <input value={form.suggest_tampilan} onChange={e => setForm({ ...form, suggest_tampilan: e.target.value })}
                  placeholder="e.g. 1920 × 1080 px atau 4K" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Keterangan Lain</label>
                <textarea value={form.keterangan_lain} onChange={e => setForm({ ...form, keterangan_lain: e.target.value })}
                  rows={3} placeholder="Tuliskan informasi tambahan..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none resize-none" />
              </div>
            </div>
          </div>

          {/* Foto Survey */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📸</span>
              Foto Survey <span className="text-xs font-normal text-gray-400">(opsional)</span>
            </h3>
            <input ref={surveyPhotoRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;
                const combined = [...surveyPhotos, ...files].slice(0, 10);
                setSurveyPhotos(combined);
                setSurveyPhotosPreviews(combined.map(f => URL.createObjectURL(f)));
                e.target.value = '';
              }} />
            {surveyPhotosPreviews.length === 0 ? (
              <button type="button" onClick={() => surveyPhotoRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-200 hover:border-teal-400 rounded-xl py-8 flex flex-col items-center gap-2 transition-all bg-gray-50 hover:bg-teal-50/50">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <p className="text-xs font-semibold text-gray-500">Klik untuk upload foto survey</p>
                <p className="text-[11px] text-gray-400">JPG, PNG, WEBP • Maks. 10 foto</p>
              </button>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  {surveyPhotosPreviews.map((src, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
                      <img src={src} alt={`survey-${idx}`} className="w-full h-full object-cover" />
                      <button type="button" onClick={() => { const p = surveyPhotos.filter((_, i) => i !== idx); const pr = surveyPhotosPreviews.filter((_, i) => i !== idx); setSurveyPhotos(p); setSurveyPhotosPreviews(pr); }}
                        className="absolute top-0.5 right-0.5 bg-red-600 text-white w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow text-xs">✕</button>
                    </div>
                  ))}
                  {surveyPhotosPreviews.length < 10 && (
                    <button type="button" onClick={() => surveyPhotoRef.current?.click()}
                      className="aspect-square rounded-lg border-2 border-dashed border-gray-200 hover:border-teal-400 flex items-center justify-center text-gray-400 hover:text-teal-500 transition-all bg-gray-50">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-400 text-right">{surveyPhotosPreviews.length}/10 foto</p>
              </div>
            )}
          </div>

          {/* Target Penyelesaian */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              🗓️ Target Penyelesaian <span className="text-[10px] font-normal text-gray-400 normal-case">(opsional)</span>
            </label>
            <input type="date" value={dueDateForm} min={new Date().toISOString().split('T')[0]} onChange={e => setDueDateForm(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium bg-white outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all" />
            {dueDateForm && (
              <p className="mt-2 text-xs text-emerald-700 font-semibold flex items-center gap-1">
                ✅ Target: {formatDueDate(dueDateForm)}
                <button type="button" onClick={() => setDueDateForm('')} className="ml-2 text-gray-400 hover:text-red-500 text-xs">✕ Hapus</button>
              </p>
            )}
          </div>

          {/* Validation reminder */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800">
            <p className="font-bold mb-1">📌 Wajib diisi:</p>
            <p className="text-red-700">Nama Project, minimal 1 Kebutuhan, minimal 1 Solution Product</p>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 bg-white flex-shrink-0">
          <button onClick={() => { setShowNewFormModal(false); setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]); }}
            className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all text-sm">
            Batal
          </button>
          <button onClick={handleSubmitForm} disabled={submitting}
            className="flex-[2] bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm">
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
                {currentUser.role === 'superadmin' ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin / PTS' : (currentUser.role === 'team_pts' || currentUser.role === 'team') ? 'Team PTS' : 'User / Sales'}
              </span>
              {unreadCount > 0 && <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 font-bold animate-pulse">🔔 {unreadCount} pending approval</span>}
            </p>
          </div>
          {!isPTS && (
            <button onClick={() => setShowNewFormModal(true)}
              className="bg-gradient-to-r from-teal-600 to-teal-800 text-white px-6 py-3 rounded-xl hover:from-teal-700 hover:to-teal-900 font-bold shadow-xl transition-all flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              + Buat Request Baru
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-6 border-2 border-purple-500">
        <h2 className="text-xl font-bold mb-5 bg-gradient-to-r from-purple-600 to-purple-800 text-transparent bg-clip-text">📊 Dashboard Analytics</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-700">
            <div className="flex justify-center mb-2"><span className="text-4xl">📊</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.total}</p>
            <p className="text-sm font-bold text-center">Total Request</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Seluruh request</p>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 cursor-pointer" onClick={() => setFilterStatus('pending')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">⏳</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.pending}</p>
            <p className="text-sm font-bold text-center">Pending</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Menunggu approval</p>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-teal-400 via-teal-500 to-teal-600 cursor-pointer" onClick={() => setFilterStatus('in_progress')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">🔄</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.in_progress}</p>
            <p className="text-sm font-bold text-center">In Progress</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Approved & On-going</p>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-emerald-400 via-emerald-500 to-emerald-600 cursor-pointer" onClick={() => setFilterStatus('completed')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">✅</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.completed}</p>
            <p className="text-sm font-bold text-center">Completed</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Selesai ditangani</p>
          </div>
          <div className="rounded-2xl p-5 text-white shadow-xl transform hover:scale-105 transition-transform bg-gradient-to-br from-red-500 via-red-600 to-red-700 cursor-pointer" onClick={() => setFilterStatus('rejected')}>
            <div className="flex justify-center mb-2"><span className="text-4xl">🚫</span></div>
            <p className="text-5xl font-bold text-center mb-2">{stats.rejected}</p>
            <p className="text-sm font-bold text-center">Rejected</p>
            <p className="text-xs text-center text-white/60 mt-0.5">Ditolak</p>
          </div>
        </div>
      </div>

      {/* ── PIE CHARTS (styled like reference image) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <SvgPieChart items={statusPieData} title="Status Request" icon="📊" />
        <SvgPieChart items={divisionPieData.length > 0 ? divisionPieData : SALES_DIVISIONS.map((d, i) => ({ label: d, value: 0, color: PIE_COLORS.division[i] }))} title="Divisi Sales" icon="👤" />
        <SvgPieChart items={assignedPieData.length > 0 ? assignedPieData : [{ label: 'Unassigned', value: 0, color: '#9ca3af' }]} title="Team PTS" icon="👥" />
      </div>

      {/* Search Bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200 px-6 py-4 mb-4 flex flex-col md:flex-row gap-3 items-stretch md:items-center">
        <div className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Search Project</p>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search by project name..."
              className="w-full bg-transparent text-sm font-medium text-gray-700 placeholder-gray-400 outline-none" />
          </div>
          {searchQuery && <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
        </div>
        <div className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 focus-within:border-teal-400 focus-within:ring-2 focus-within:ring-teal-100 transition-all">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Search Sales</p>
            <input value={searchSales} onChange={e => setSearchSales(e.target.value)} placeholder="Search by sales name..."
              className="w-full bg-transparent text-sm font-medium text-gray-700 placeholder-gray-400 outline-none" />
          </div>
          {searchSales && <button onClick={() => setSearchSales('')} className="text-gray-400 hover:text-gray-600"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
        </div>
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 transition-all min-w-[200px]">
          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-none mb-0.5">Filter Status</p>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="w-full bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Request List */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">TICKET LIST</span>
            <span className="bg-teal-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{filteredRequests.length}</span>
          </div>
          <button onClick={fetchRequests} className="flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Refresh
          </button>
        </div>

        <div className="hidden md:grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.3fr_1.1fr] gap-0 px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Project</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nama Ruangan</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sales</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status Handle</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created By</span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Action</span>
        </div>

        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
              <p className="text-gray-500 font-semibold">Memuat data...</p>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-700 font-bold text-lg mb-1">Tidak ada data</p>
              <p className="text-gray-400 text-sm mb-5">{(searchQuery || searchSales) ? 'Tidak ada hasil yang cocok.' : filterStatus !== 'all' ? `Tidak ada request dengan status "${filterStatus}".` : 'Belum ada form yang masuk.'}</p>
              {filterStatus === 'all' && !searchQuery && !searchSales && !isPTS && (
                <button onClick={() => setShowNewFormModal(true)} className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition-all text-sm">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  Buat Request Baru
                </button>
              )}
            </div>
          ) : (
            filteredRequests.map(req => {
              const sc = statusConfig[req.status] || statusConfig.pending;
              const unread = unreadMsgMap[req.id] || 0;
              const dueStatus = getDueStatus(req.due_date, req.status);
              return (
                <div key={req.id}
                  className={`grid md:grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.3fr_1.1fr] gap-0 px-5 py-3.5 hover:bg-teal-50/30 transition-colors cursor-pointer group items-center ${dueStatus?.type === 'overdue' ? 'bg-red-50/20' : ''}`}
                  onClick={() => handleOpenDetail(req)}>
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-800 text-sm group-hover:text-teal-700 transition-colors truncate">{req.project_name}</p>
                      {unread > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{unread > 9 ? '9+' : unread}💬</span>}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-0.5">{new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    {dueStatus?.type === 'overdue' && <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded-full">⚠️ {dueStatus.label}</span>}
                    {dueStatus?.type === 'urgent' && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full">⏰ {dueStatus.label}</span>}
                  </div>
                  <div className="hidden md:block pr-3">
                    <p className="text-sm text-gray-700 font-medium truncate">{req.room_name || <span className="text-gray-300">—</span>}</p>
                    {req.solution_product?.length > 0 && <p className="text-[11px] text-gray-400 truncate">{req.solution_product.join(', ')}</p>}
                  </div>
                  <div className="hidden md:block pr-3">
                    <p className="text-sm text-gray-700 font-medium truncate">{req.sales_name || <span className="text-gray-300">—</span>}</p>
                    {(req as any).sales_division && <p className="text-[11px] text-indigo-500 font-bold">{(req as any).sales_division}</p>}
                  </div>
                  <div className="hidden md:block pr-3">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
                    {req.status === 'pending' && isPTS && !isTeamPTS && <p className="text-[10px] font-bold text-red-600 mt-1 animate-pulse">🔔 Perlu Approval</p>}
                    {req.pts_assigned && <p className="text-[11px] text-gray-400 mt-0.5">🔧 {req.pts_assigned}</p>}
                  </div>
                  <div className="hidden md:block pr-3">
                    <p className="text-sm text-gray-700 font-medium truncate">{req.requester_name}</p>
                    <p className="text-[11px] text-gray-400 truncate">{req.due_date ? `Target: ${formatDueDate(req.due_date)}` : ''}</p>
                  </div>
                  <div className="hidden md:flex items-center justify-end gap-1.5" onClick={e => e.stopPropagation()}>
                    {isPTS && !isTeamPTS && req.status === 'pending' && (
                      <>
                        <button onClick={() => handleApprove(req)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm">✅ Approve</button>
                        <button onClick={() => handleReject(req)}
                          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-300 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all">❌ Tolak</button>
                      </>
                    )}
                    <button onClick={() => handleOpenDetail(req)}
                      className="w-8 h-8 bg-gray-100 hover:bg-teal-50 border border-gray-200 hover:border-teal-200 rounded-lg flex items-center justify-center transition-all group/btn">
                      <svg className="w-3.5 h-3.5 text-gray-400 group-hover/btn:text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  </div>
                </div>
              );
            })
          )}
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
    const isFileType = (type: string) => type.startsWith('image/');
    const detailDueStatus = getDueStatus(selectedRequest.due_date, selectedRequest.status);

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
              <p className="text-gray-600 text-sm mt-0.5">{selectedRequest.room_name} · {selectedRequest.requester_name} · {formatDate(selectedRequest.created_at)}</p>
            </div>
            {isPTS && !isTeamPTS && (
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {isPending && (
                  <>
                    <button onClick={() => handleApprove(selectedRequest)}
                      className="bg-gradient-to-r from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">✅ Approve & Assign</button>
                    <button onClick={() => handleReject(selectedRequest)}
                      className="bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-300 px-4 py-2 rounded-xl text-sm font-bold transition-all">❌ Tolak</button>
                  </>
                )}
                {selectedRequest.status === 'approved' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'in_progress')}
                    className="bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">🔄 In Progress</button>
                )}
                {selectedRequest.status === 'in_progress' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'completed')}
                    className="bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-md">✅ Selesai</button>
                )}
                <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl text-sm font-bold transition-all">Print</button>
              </div>
            )}
            {isTeamPTS && <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl text-sm font-bold transition-all flex-shrink-0">Print</button>}
            {!isPTS && (
              <div className="flex gap-2 flex-shrink-0">
                {selectedRequest.status !== 'rejected' && <button onClick={handleOpenEditForm} className="bg-amber-50 hover:bg-amber-100 text-amber-700 border-2 border-amber-300 px-4 py-2 rounded-xl text-sm font-bold transition-all">Edit Kebutuhan</button>}
                <button onClick={handlePrint} className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-3 py-2 rounded-xl text-sm font-bold transition-all">Print</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* LEFT: Details + Attachments */}
          <div className="w-[400px] flex-shrink-0 border-r-2 border-gray-200 flex flex-col overflow-hidden bg-white/90 backdrop-blur-sm">
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-4 space-y-2.5 text-sm border-2 border-gray-200 shadow-md">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                  <p className="text-xs font-bold text-teal-600 tracking-widest uppercase">Detail Kebutuhan</p>
                  {!isPTS && selectedRequest.status !== 'rejected' && <button onClick={handleOpenEditForm} className="text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded-lg font-bold transition-all">Edit</button>}
                </div>
                {selectedRequest.kebutuhan?.length > 0 && <div><span className="font-bold text-gray-700">Kebutuhan:</span> <span className="text-gray-600">{selectedRequest.kebutuhan.join(', ')}</span></div>}
                {selectedRequest.kebutuhan_other && <div><span className="font-bold text-gray-700">Other:</span> <span className="text-gray-600">{selectedRequest.kebutuhan_other}</span></div>}
                {selectedRequest.solution_product?.length > 0 && <div><span className="font-bold text-gray-700">Solution:</span> <span className="text-gray-600">{selectedRequest.solution_product.join(', ')}</span></div>}
                {selectedRequest.layout_signage?.length > 0 && <div><span className="font-bold text-gray-700">Layout:</span> <span className="text-gray-600">{selectedRequest.layout_signage.join(', ')}</span></div>}
                {selectedRequest.jaringan_cms?.length > 0 && <div><span className="font-bold text-gray-700">CMS:</span> <span className="text-gray-600">{selectedRequest.jaringan_cms.join(', ')}</span></div>}
                {(selectedRequest.jumlah_input || selectedRequest.jumlah_output) && <div><span className="font-bold text-gray-700">I/O:</span> <span className="text-gray-600">Input {selectedRequest.jumlah_input} / Output {selectedRequest.jumlah_output}</span></div>}
                {selectedRequest.source?.length > 0 && <div><span className="font-bold text-gray-700">Source:</span> <span className="text-gray-600">{selectedRequest.source.join(', ')}</span></div>}
                <div><span className="font-bold text-gray-700">Camera:</span> <span className="text-gray-600">{selectedRequest.camera_conference}{selectedRequest.camera_jumlah ? ` (${selectedRequest.camera_jumlah} unit)` : ''}</span></div>
                {selectedRequest.camera_tracking?.length > 0 && <div><span className="font-bold text-gray-700">Tracking:</span> <span className="text-gray-600">{selectedRequest.camera_tracking.join(', ')}</span></div>}
                <div><span className="font-bold text-gray-700">Audio:</span> <span className="text-gray-600">{selectedRequest.audio_system}{selectedRequest.audio_mixer ? ` — ${selectedRequest.audio_mixer}` : ''}{selectedRequest.audio_detail?.length > 0 ? ` (${selectedRequest.audio_detail.join(', ')})` : ''}</span></div>
                <div><span className="font-bold text-gray-700">Wallplate:</span> <span className="text-gray-600">{selectedRequest.wallplate_input}{selectedRequest.wallplate_jumlah ? ` (${selectedRequest.wallplate_jumlah})` : ''}</span></div>
                {selectedRequest.tabletop_input && <div><span className="font-bold text-gray-700">Tabletop:</span> <span className="text-gray-600">{selectedRequest.tabletop_input}{selectedRequest.tabletop_jumlah ? ` (${selectedRequest.tabletop_jumlah})` : ''}</span></div>}
                <div><span className="font-bold text-gray-700">WPS:</span> <span className="text-gray-600">{selectedRequest.wireless_presentation}{selectedRequest.wireless_mode?.length > 0 ? ` — ${selectedRequest.wireless_mode.join(', ')}` : ''}{selectedRequest.wireless_dongle === 'Yes' ? ' + Dongle' : ''}</span></div>
                {selectedRequest.controller_automation && <div><span className="font-bold text-gray-700">Controller:</span> <span className="text-gray-600">{selectedRequest.controller_automation}{selectedRequest.controller_type?.length > 0 ? ` — ${selectedRequest.controller_type.join(', ')}` : ''}</span></div>}
                {selectedRequest.ukuran_ruangan && <div><span className="font-bold text-gray-700">Ukuran:</span> <span className="text-gray-600">{selectedRequest.ukuran_ruangan}</span></div>}
                {selectedRequest.suggest_tampilan && <div><span className="font-bold text-gray-700">Display:</span> <span className="text-gray-600">{selectedRequest.suggest_tampilan}</span></div>}
                {selectedRequest.keterangan_lain && <div><span className="font-bold text-gray-700">Catatan:</span> <span className="text-gray-600">{selectedRequest.keterangan_lain}</span></div>}
                {(selectedRequest as any).sales_division && <div className="pt-2 border-t border-gray-200"><span className="font-bold text-gray-700">Divisi:</span> <span className="text-indigo-600 font-bold">{(selectedRequest as any).sales_division}</span></div>}
                {selectedRequest.pts_assigned && <div><span className="font-bold text-gray-700">Assigned to:</span> <span className="text-teal-700 font-semibold">{selectedRequest.pts_assigned}</span></div>}
                {selectedRequest.due_date && (
                  <div className={`pt-2 border-t border-gray-200 rounded-lg p-2 -mx-1 ${detailDueStatus?.type === 'overdue' ? 'bg-red-50' : detailDueStatus?.type === 'urgent' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                    <span className="font-bold text-gray-700">🗓️ Target:</span>
                    <span className={`ml-1 font-bold ${detailDueStatus?.type === 'overdue' ? 'text-red-600' : detailDueStatus?.type === 'urgent' ? 'text-amber-600' : 'text-emerald-700'}`}>{formatDueDate(selectedRequest.due_date)}</span>
                    {detailDueStatus && <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${detailDueStatus.type === 'overdue' ? 'bg-red-200 text-red-700' : detailDueStatus.type === 'urgent' ? 'bg-amber-200 text-amber-700' : 'bg-emerald-200 text-emerald-700'}`}>{detailDueStatus.type === 'overdue' ? `⚠️ ${detailDueStatus.label}` : detailDueStatus.label}</span>}
                  </div>
                )}
                {isPTS && !isTeamPTS && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-1.5">🗓️ {selectedRequest.due_date ? 'Ubah' : 'Set'} Target Selesai</p>
                    <div className="flex gap-2 items-center">
                      <input type="date" defaultValue={selectedRequest.due_date ? selectedRequest.due_date.split('T')[0] : ''} min={new Date().toISOString().split('T')[0]} id="detail-due-date-input"
                        className="flex-1 border-2 border-gray-200 rounded-lg px-2 py-1.5 text-xs font-medium bg-white outline-none focus:border-teal-400 transition-all" />
                      <button onClick={async () => {
                        const input = document.getElementById('detail-due-date-input') as HTMLInputElement;
                        const val = input?.value || null;
                        const { error } = await supabase.from('project_requests').update({ due_date: val }).eq('id', selectedRequest.id);
                        if (!error) { setSelectedRequest({ ...selectedRequest, due_date: val || undefined }); notify('success', val ? `Target diset: ${formatDueDate(val)}` : 'Target dihapus.'); fetchRequests(); }
                        else notify('error', 'Gagal menyimpan target.');
                      }} className="bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow flex-shrink-0">
                        Simpan
                      </button>
                    </div>
                  </div>
                )}
                {/* Re-assign PTS button */}
                {isPTS && !isTeamPTS && selectedRequest.status !== 'pending' && selectedRequest.status !== 'rejected' && (
                  <div className="pt-2 border-t border-gray-200">
                    <button onClick={() => setAssignModal({ open: true, req: selectedRequest })}
                      className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border-2 border-teal-200 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                      👥 Re-assign Tim PTS
                    </button>
                  </div>
                )}
              </div>

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

                <div className="mb-3 space-y-2">
                  <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                    {(['all', 'sld', 'boq', 'design3d'] as const).map(tab => {
                      const counts = { all: attachments.length, sld: attachments.filter(a => a.attachment_category === 'sld').length, boq: attachments.filter(a => a.attachment_category === 'boq').length, design3d: attachments.filter(a => a.attachment_category === 'design3d').length };
                      const labels = { all: `📎 Semua (${counts.all})`, sld: `📐 SLD (${counts.sld})`, boq: `📊 BOQ (${counts.boq})`, design3d: `🎨 3D (${counts.design3d})` };
                      return (
                        <button key={tab} onClick={() => setActiveAttachTab(tab)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeAttachTab === tab ? 'bg-white shadow text-teal-700 border border-teal-200' : 'text-gray-500 hover:text-gray-700'}`}>
                          {labels[tab]}
                        </button>
                      );
                    })}
                  </div>
                  {selectedRequest.status !== 'rejected' && (
                    <div className="flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                        {uploadingFile ? <div className="w-3 h-3 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> : '📎'} Umum
                      </button>
                      <button onClick={() => sldFileRef.current?.click()} className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                        {uploadingCategory === 'sld' ? <div className="w-3 h-3 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin" /> : '📐'} SLD
                      </button>
                      <button onClick={() => boqFileRef.current?.click()} className="flex-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                        {uploadingCategory === 'boq' ? <div className="w-3 h-3 border-2 border-emerald-300 border-t-emerald-700 rounded-full animate-spin" /> : '📊'} BOQ
                      </button>
                      <button onClick={() => design3dFileRef.current?.click()} className="flex-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 px-2 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1">
                        {uploadingCategory === 'design3d' ? <div className="w-3 h-3 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin" /> : '🎨'} 3D
                      </button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {(() => {
                    const filtered = activeAttachTab === 'all' ? attachments : attachments.filter(a => a.attachment_category === activeAttachTab);
                    if (filtered.length === 0) return (
                      <div className="text-center py-6 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                        <p className="text-gray-400 text-sm font-medium">{activeAttachTab === 'sld' ? '📐 Belum ada SLD' : activeAttachTab === 'boq' ? '📊 Belum ada BOQ' : activeAttachTab === 'design3d' ? '🎨 Belum ada Design/3D' : '📂 Belum ada lampiran'}</p>
                      </div>
                    );
                    return filtered.map(att => {
                      const isSLD = att.attachment_category === 'sld';
                      const isBOQ = att.attachment_category === 'boq';
                      const is3D = att.attachment_category === 'design3d';
                      const borderColor = isSLD ? 'border-blue-200 hover:border-blue-400' : isBOQ ? 'border-emerald-200 hover:border-emerald-400' : is3D ? 'border-purple-200 hover:border-purple-400' : 'border-gray-200 hover:border-teal-300';
                      const icon = isSLD ? '📐' : isBOQ ? '📊' : is3D ? '🎨' : isFileType(att.file_type) ? '🖼️' : '📎';
                      const revBadgeColor = isSLD ? 'bg-blue-100 text-blue-700' : isBOQ ? 'bg-emerald-100 text-emerald-700' : is3D ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600';
                      return (
                        <a key={att.id} href={att.file_url} target="_blank" rel="noopener noreferrer"
                          className={`flex items-center gap-3 p-3 bg-white border-2 rounded-xl transition-all group ${borderColor}`}>
                          <div className="w-10 h-10 rounded-lg border flex items-center justify-center text-lg flex-shrink-0 bg-white shadow-sm">{icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-sm font-bold text-gray-700 group-hover:text-teal-700 truncate">{att.file_name}</p>
                              {att.revision_version && <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${revBadgeColor}`}>Rev.{att.revision_version}</span>}
                            </div>
                            <p className="text-xs text-gray-400">{formatFileSize(att.file_size)} · {att.uploaded_by}</p>
                          </div>
                        </a>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Chat */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white/80 backdrop-blur-sm">
            <div className="bg-gradient-to-r from-teal-600 to-teal-700 px-5 py-4 flex-shrink-0 border-b-2 border-teal-500 shadow">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center text-sm">💬</div>
                <div>
                  <p className="font-bold text-white text-sm">Activity & Q&A</p>
                  <p className="text-teal-100 text-xs">Komunikasi antara Sales/Guest dan Tim PTS</p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gray-50/80">
              {messages.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm"><div className="text-4xl mb-2">💬</div><p className="font-medium">Belum ada percakapan. Mulai tanya jawab di sini!</p></div>
              ) : messages.map(msg => {
                const isMe = msg.sender_id === currentUser.id;
                const isSystem = msg.sender_role === 'system';
                if (isSystem) return (
                  <div key={msg.id} className="flex justify-center">
                    <div className="bg-gray-200 text-gray-600 text-xs px-4 py-2 rounded-full font-semibold border border-gray-300">{msg.message}</div>
                  </div>
                );
                const isPTSSender = ['admin', 'superadmin', 'team_pts', 'team'].includes(msg.sender_role);
                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow ${isPTSSender ? 'bg-gradient-to-br from-teal-600 to-teal-800' : 'bg-gradient-to-br from-gray-500 to-gray-700'}`}>
                      {msg.sender_name.charAt(0).toUpperCase()}
                    </div>
                    <div className={`max-w-[75%] ${isMe ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className={`flex items-center gap-2 mb-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                        <span className="text-xs font-bold text-gray-600">{msg.sender_name}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isPTSSender ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'}`}>{isPTSSender ? 'PTS' : 'Guest'}</span>
                        <span className="text-[10px] text-gray-400">{formatDate(msg.created_at)}</span>
                      </div>
                      <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isMe ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-tr-sm' : 'bg-white text-gray-800 border-2 border-gray-200 rounded-tl-sm'}`}>
                        {msg.message}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="bg-white border-t-2 border-gray-200 p-4 flex-shrink-0">
              {selectedRequest.status === 'rejected' ? (
                <div className="flex items-center justify-center bg-red-50 border-2 border-red-200 rounded-2xl px-4 py-3 text-sm font-bold text-red-700">Request ini telah ditolak. Chat tidak tersedia.</div>
              ) : selectedRequest.status === 'pending' ? (
                <div className="flex items-center justify-center bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3 text-sm font-bold text-amber-700">🔒 Chat tersedia setelah request di-approve.</div>
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

        {/* REJECT MODAL */}
        {rejectModal.open && rejectModal.req && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border-2 border-red-500 animate-scale-in">
              <div className="flex items-center gap-3 mb-4"><div><h3 className="text-lg font-bold text-gray-800">Tolak Request</h3><p className="text-xs text-gray-500">{rejectModal.req.project_name}</p></div></div>
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

        {/* EDIT FORM MODAL */}
        {editFormModal && selectedRequest && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-2 border-amber-400 animate-scale-in">
              <div className="bg-gradient-to-r from-amber-500 to-amber-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                <div><h3 className="font-bold text-lg">Edit Detail Kebutuhan</h3><p className="text-amber-100 text-xs">{selectedRequest.project_name}</p></div>
                <button onClick={() => setEditFormModal(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-all text-white font-bold">X</button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Nama Project</label><input value={editFormData.project_name} onChange={e => setEditFormData({...editFormData, project_name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Nama Ruangan</label><input value={editFormData.room_name} onChange={e => setEditFormData({...editFormData, room_name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Sales</label><input value={editFormData.sales_name} onChange={e => setEditFormData({...editFormData, sales_name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Kategori Kebutuhan</label>
                  <div className="flex flex-wrap gap-2 mb-2">{['LED Wall','Video Wall','Interactive Display','Meeting Room','Digital Signage','Lecture System','Event'].map(opt => (<button key={opt} type="button" onClick={() => setEditFormData({...editFormData, kebutuhan: toggleArr(editFormData.kebutuhan, opt)})} className={"px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all " + (editFormData.kebutuhan.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300')}>{opt}</button>))}</div>
                  <input value={editFormData.kebutuhan_other} onChange={e => setEditFormData({...editFormData, kebutuhan_other: e.target.value})} placeholder="Other..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-2">Solution Product</label>
                  <div className="flex flex-wrap gap-2 mb-2">{['LED Direct View','Laser Projector','LCD Videowall','Interactive Flat Panel','Wireless Presentation','NVR/VMS','CMS','Control System'].map(opt => (<button key={opt} type="button" onClick={() => setEditFormData({...editFormData, solution_product: toggleArr(editFormData.solution_product, opt)})} className={"px-3 py-1.5 rounded-xl border-2 text-xs font-semibold transition-all " + (editFormData.solution_product.includes(opt) ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-300 text-gray-600 hover:border-amber-300')}>{opt}</button>))}</div>
                  <input value={editFormData.solution_other} onChange={e => setEditFormData({...editFormData, solution_other: e.target.value})} placeholder="Other..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Jumlah Input</label><input value={editFormData.jumlah_input} onChange={e => setEditFormData({...editFormData, jumlah_input: e.target.value})} placeholder="e.g. 4" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Jumlah Output</label><input value={editFormData.jumlah_output} onChange={e => setEditFormData({...editFormData, jumlah_output: e.target.value})} placeholder="e.g. 2" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Ukuran Ruangan</label><input value={editFormData.ukuran_ruangan} onChange={e => setEditFormData({...editFormData, ukuran_ruangan: e.target.value})} placeholder="e.g. 8m x 6m x 3m" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                  <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Suggest Tampilan</label><input value={editFormData.suggest_tampilan} onChange={e => setEditFormData({...editFormData, suggest_tampilan: e.target.value})} placeholder="e.g. 4K" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-amber-500 transition-all" /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-600 uppercase tracking-widest mb-1">Keterangan Lain</label><textarea value={editFormData.keterangan_lain} onChange={e => setEditFormData({...editFormData, keterangan_lain: e.target.value})} rows={3} placeholder="Informasi tambahan..." className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-amber-500 transition-all resize-none" /></div>
              </div>
              <div className="px-6 pb-6 flex gap-3 flex-shrink-0">
                <button onClick={() => setEditFormModal(false)} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">Batal</button>
                <button onClick={handleEditFormSubmit} className="flex-[2] bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white py-3 rounded-xl font-bold shadow-lg transition-all">Simpan Perubahan</button>
              </div>
            </div>
          </div>
        )}

        <style jsx>{`
          @keyframes scale-in { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
          .animate-scale-in { animation: scale-in 0.2s ease-out; }
        `}</style>
      </div>
    );
  }

  return null;
}

// ─── Page Entry Point ─────────────────────────────────────────────────────────

export default function FormRequireProjectPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const saved = localStorage.getItem('currentUser');
      if (!saved) { setLoading(false); return; }
      try {
        const parsed: User = JSON.parse(saved);
        setCurrentUser(parsed);
        const { data, error } = await supabase.from('users').select('*').eq('id', parsed.id).single();
        if (!error && data) { const fresh = data as User; setCurrentUser(fresh); localStorage.setItem('currentUser', JSON.stringify(fresh)); }
      } catch { /* ignore */ }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <div className="bg-white/80 backdrop-blur-sm p-10 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-teal-600 rounded-full animate-spin" />
        <p className="text-gray-600 font-semibold">Memuat...</p>
      </div>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <div className="bg-white/90 backdrop-blur-sm p-10 rounded-2xl shadow-2xl text-center max-w-sm border-4 border-teal-600">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
        <p className="text-gray-500 text-sm mb-6">Silakan login terlebih dahulu melalui dashboard.</p>
        <a href="/dashboard" className="inline-block bg-gradient-to-r from-teal-600 to-teal-800 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:from-teal-700 hover:to-teal-900 transition-all">← Kembali ke Dashboard</a>
      </div>
    </div>
  );

  return <FormRequireProject currentUser={currentUser} />;
}
