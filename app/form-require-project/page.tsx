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
  phone_number?: string;
  allowed_menus?: string[];
}

interface ProjectRequest {
  id: string;
  created_at: string;
  project_name: string;
  room_name: string;
  project_location?: string;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const SALES_DIVISIONS = [
  'IVP', 'MLDS', 'HAVS', 'Enterprise', 'DEC', 'ICS', 'POJ', 'VOJ', 'LOCOS',
  'VISIONMEDIA', 'UMP', 'BISOL', 'KIMS', 'IDC', 'IOCMEDAN', 'IOCPekanbaru',
  'IOCBandung', 'IOCJATENG', 'MVISEMARANG', 'POSSurabaya', 'IOCSurabaya',
  'IOCBali', 'SGP', 'OSS'
] as const;

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

const statusConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending:     { label: '⏳ Pending',     color: 'text-amber-700',  bg: 'bg-amber-50',   border: 'border-amber-400' },
  approved:    { label: '✅ Approved',    color: 'text-teal-700',   bg: 'bg-teal-50',    border: 'border-teal-400' },
  in_progress: { label: '🔄 In Progress', color: 'text-blue-700',   bg: 'bg-blue-50',    border: 'border-blue-400' },
  completed:   { label: '🏆 Completed',   color: 'text-purple-700', bg: 'bg-purple-50',  border: 'border-purple-400' },
  rejected:    { label: '❌ Rejected',    color: 'text-red-700',    bg: 'bg-red-50',     border: 'border-red-400' },
};

// ─── MiniPieChart — identical to Reminder Schedule ───────────────────────────

function MiniPieChart({
  data, title, icon, onSliceClick,
}: {
  data: { label: string; value: number; color: string }[];
  title: string; icon: string;
  onSliceClick?: (label: string) => void;
}) {
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
    const x1 = cx + r * Math.cos(cumulativeAngle), y1 = cy + r * Math.sin(cumulativeAngle);
    const x2 = cx + r * Math.cos(cumulativeAngle + angle), y2 = cy + r * Math.sin(cumulativeAngle + angle);
    const xi1 = cx + innerR * Math.cos(cumulativeAngle), yi1 = cy + innerR * Math.sin(cumulativeAngle);
    const xi2 = cx + innerR * Math.cos(cumulativeAngle + angle), yi2 = cy + innerR * Math.sin(cumulativeAngle + angle);
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
              style={{ cursor: onSliceClick ? 'pointer' : 'default', transition: 'opacity 0.15s', filter: hovered === s.i ? `drop-shadow(0 0 4px ${s.color})` : 'none' }}
              onMouseEnter={() => setHovered(s.i)} onMouseLeave={() => setHovered(null)}
              onClick={() => onSliceClick?.(s.label)} />
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {slices.map((s) => (
            <div key={s.i} className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
              style={{ background: hovered === s.i ? `${s.color}15` : 'transparent' }}
              onMouseEnter={() => setHovered(s.i)} onMouseLeave={() => setHovered(null)}
              onClick={() => onSliceClick?.(s.label)}>
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

// ─── Loading Screen — sama dengan Reminder Schedule ──────────────────────────

function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundImage: `url('/IVP_Background.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <svg className="w-14 h-14 animate-spin" viewBox="0 0 50 50" fill="none">
          <circle cx="25" cy="25" r="20" stroke="#e2e8f0" strokeWidth="5" />
          <path d="M25 5 A20 20 0 0 1 45 25" stroke="#0d9488" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <div className="text-center">
          <p className="text-gray-800 font-bold text-base">🏗️ Form Require Project</p>
          <p className="text-gray-500 text-sm mt-1">Memuat data...</p>
        </div>
      </div>
    </div>
  );
}

// ─── Assign PTS Modal ────────────────────────────────────────────────────────

function AssignPTSModal({
  req, onClose, onAssigned, currentUser,
}: {
  req: ProjectRequest; onClose: () => void; onAssigned: () => void; currentUser: User;
}) {
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [selected, setSelected] = useState(req.pts_assigned || '');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from('users').select('*').in('role', ['team_pts', 'team'])
      .then(({ data }: { data: User[] | null }) => { if (data) setTeamMembers(data as User[]); });
  }, []);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const { error } = await supabase.from('project_requests')
      .update({ pts_assigned: selected, status: 'approved', approved_by: currentUser.full_name, approved_at: new Date().toISOString() })
      .eq('id', req.id);
    if (!error) {
      await supabase.from('project_messages').insert([{
        request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system',
        message: `✅ Request diapprove oleh ${currentUser.full_name} dan di-assign ke ${selected}. Tim PTS akan segera memproses.`,
      }]);

      // FIX #3: Kirim WA ke handler yang di-assign via notify-handler
      const selectedMember = teamMembers.find(m => m.full_name === selected);
      if (selectedMember?.phone_number) {
        await supabase.functions.invoke('notify-handler', {
          body: {
            type: 'form_require_assigned',
            handlerName: selectedMember.full_name,
            handlerPhone: selectedMember.phone_number,
            projectName: req.project_name,
            salesName: req.sales_name || '',
            salesDivision: req.sales_division || '',
            requesterName: req.requester_name,
            dueDate: req.due_date
              ? new Date(req.due_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
              : null,
            approvedBy: currentUser.full_name,
          },
        });
      }

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
            <div className="text-center py-6 text-gray-400 text-sm"><div className="text-3xl mb-2">👥</div><p>Tidak ada Team PTS tersedia</p></div>
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
                    <p className="text-xs text-gray-400">{m.role}{m.phone_number ? ` · 📱 ${m.phone_number}` : ''}</p>
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
              {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menyimpan...</> : <>✅ Approve & Assign</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NewFormModal — EXTRACTED as top-level to prevent cursor-jump re-mount bug ──
// FIX #1: Dipindah ke luar FormRequireProject agar tidak di-remount setiap keystroke

type InitialFormType = {
  project_name: string; room_name: string; project_location: string; sales_name: string; sales_division: string;
  kebutuhan: string[]; kebutuhan_other: string;
  solution_product: string[]; solution_other: string;
  layout_signage: string[]; jaringan_cms: string[];
  jumlah_input: string; jumlah_output: string;
  source: string[]; source_other: string;
  camera_conference: string; camera_jumlah: string; camera_tracking: string[];
  audio_system: string; audio_mixer: string; audio_detail: string[];
  wallplate_input: string; wallplate_jumlah: string;
  tabletop_input: string; tabletop_jumlah: string;
  wireless_presentation: string; wireless_mode: string[]; wireless_dongle: string;
  controller_automation: string; controller_type: string[];
  ukuran_ruangan: string; suggest_tampilan: string; keterangan_lain: string;
};

interface NewFormModalProps {
  currentUser: User;
  form: InitialFormType;
  setForm: React.Dispatch<React.SetStateAction<InitialFormType>>;
  initialForm: InitialFormType;
  dueDateForm: string;
  setDueDateForm: React.Dispatch<React.SetStateAction<string>>;
  surveyPhotos: File[];
  setSurveyPhotos: React.Dispatch<React.SetStateAction<File[]>>;
  surveyPhotosPreviews: string[];
  setSurveyPhotosPreviews: React.Dispatch<React.SetStateAction<string[]>>;
  boqFormFile: File | null;
  setBoqFormFile: React.Dispatch<React.SetStateAction<File | null>>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
}

function NewFormModal({
  currentUser, form, setForm, initialForm, dueDateForm, setDueDateForm,
  surveyPhotos, setSurveyPhotos, surveyPhotosPreviews, setSurveyPhotosPreviews,
  boqFormFile, setBoqFormFile,
  submitting, onClose, onSubmit,
}: NewFormModalProps) {
  const surveyPhotoRef = useRef<HTMLInputElement>(null);
  const boqFormRef = useRef<HTMLInputElement>(null);

  const toggleArr = (arr: string[], val: string): string[] =>
    arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9998] p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border-2 border-teal-500 animate-scale-in overflow-hidden">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">📋 Form Equipment Request — IVP</h2>
            <p className="text-teal-100 text-xs mt-0.5">Requester: <span className="font-bold">{currentUser.full_name}</span></p>
          </div>
          <button onClick={onClose}
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
                <input value={form.project_name} onChange={e => setForm(prev => ({ ...prev, project_name: e.target.value }))}
                  placeholder="Contoh: Meeting Room Lantai 5 - PT ABC"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Ruangan</label>
                <input value={form.room_name} onChange={e => setForm(prev => ({ ...prev, room_name: e.target.value }))}
                  placeholder="Nama ruangan / area"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Lokasi Project *</label>
                <input value={form.project_location} onChange={e => setForm(prev => ({ ...prev, project_location: e.target.value }))}
                  placeholder="Contoh: Gedung Wisma 46 Lt.12, Jakarta"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Sales / Account</label>
                <input value={form.sales_name} onChange={e => setForm(prev => ({ ...prev, sales_name: e.target.value }))}
                  placeholder="Nama Sales / Account Manager"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
              </div>
              {/* FIX #5: Dropdown instead of button grid */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Divisi Sales</label>
                <select
                  value={form.sales_division || ''}
                  onChange={e => setForm(prev => ({ ...prev, sales_division: e.target.value }))}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none appearance-none"
                >
                  <option value="">— Pilih Divisi Sales —</option>
                  {SALES_DIVISIONS.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Target Selesai</label>
                <input type="date" value={dueDateForm} onChange={e => setDueDateForm(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all text-sm font-medium bg-white outline-none" />
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
              value={form.kebutuhan} onChange={v => setForm(prev => ({ ...prev, kebutuhan: v }))} />
            <div className="mb-3">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Kebutuhan</label>
              <input value={form.kebutuhan_other} onChange={e => setForm(prev => ({ ...prev, kebutuhan_other: e.target.value }))}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all bg-white outline-none" />
            </div>
            <CheckGroup label="Solution Product" options={['Videowall', 'Signage Display', 'Projector', 'Kiosk', 'IFP']}
              value={form.solution_product} onChange={v => setForm(prev => ({ ...prev, solution_product: v }))} />
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Solution</label>
              <input value={form.solution_other} onChange={e => setForm(prev => ({ ...prev, solution_other: e.target.value }))}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 focus:ring-1 focus:ring-teal-100 transition-all bg-white outline-none" />
            </div>
          </div>

          {/* Signage & Network */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📺</span>
              Layout Konten & Jaringan
            </h3>
            <CheckGroup label="Layout Signage" options={['Single Zone', 'Multi Zone', 'Full Screen', 'Custom Layout']}
              value={form.layout_signage} onChange={v => setForm(prev => ({ ...prev, layout_signage: v }))} />
            <CheckGroup label="Jaringan / CMS" options={['Cloud', 'Onpremise', 'USB']}
              value={form.jaringan_cms} onChange={v => setForm(prev => ({ ...prev, jaringan_cms: v }))} />
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Input</label>
                <input value={form.jumlah_input} onChange={e => setForm(prev => ({ ...prev, jumlah_input: e.target.value }))}
                  placeholder="e.g. 4 input" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Output</label>
                <input value={form.jumlah_output} onChange={e => setForm(prev => ({ ...prev, jumlah_output: e.target.value }))}
                  placeholder="e.g. 2 output" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
            </div>
          </div>

          {/* Source & Peripheral */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">🔌</span>
              Source & Peripheral
            </h3>
            <CheckGroup label="Source" options={['PC / Mini PC', 'Laptop', 'URL Dashboard', 'NVR CCTV', 'Media Player', 'IPTV', 'Set Top Box']}
              value={form.source} onChange={v => setForm(prev => ({ ...prev, source: v }))} />
            <div className="mb-4">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Source</label>
              <input value={form.source_other} onChange={e => setForm(prev => ({ ...prev, source_other: e.target.value }))}
                placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
            </div>

            {/* Camera */}
            <RadioGroup label="Camera Conference" options={['Yes', 'No']} value={form.camera_conference}
              onChange={v => setForm(prev => ({ ...prev, camera_conference: v }))} />
            {form.camera_conference === 'Yes' && (
              <div className="ml-4 mb-4 space-y-3 border-l-2 border-teal-200 pl-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Camera</label>
                  <input value={form.camera_jumlah} onChange={e => setForm(prev => ({ ...prev, camera_jumlah: e.target.value }))}
                    placeholder="e.g. 2 unit" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
                </div>
                <CheckGroup label="Camera Tracking" options={['Auto Tracking', 'Manual PTZ', 'Fixed']}
                  value={form.camera_tracking} onChange={v => setForm(prev => ({ ...prev, camera_tracking: v }))} />
              </div>
            )}

            {/* Audio */}
            <RadioGroup label="Audio System" options={['Yes', 'No']} value={form.audio_system}
              onChange={v => setForm(prev => ({ ...prev, audio_system: v }))} />
            {form.audio_system === 'Yes' && (
              <div className="ml-4 mb-4 space-y-3 border-l-2 border-teal-200 pl-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Mixer / DSP</label>
                  <input value={form.audio_mixer} onChange={e => setForm(prev => ({ ...prev, audio_mixer: e.target.value }))}
                    placeholder="e.g. Yamaha QL1, QSC, etc." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
                </div>
                <CheckGroup label="Audio Detail" options={['Speaker Ceiling', 'Speaker Line Array', 'Subwoofer', 'Microphone', 'Amplifier']}
                  value={form.audio_detail} onChange={v => setForm(prev => ({ ...prev, audio_detail: v }))} />
              </div>
            )}

            {/* Wallplate */}
            <RadioGroup label="Wallplate Input" options={['Yes', 'No']} value={form.wallplate_input}
              onChange={v => setForm(prev => ({ ...prev, wallplate_input: v }))} />
            {form.wallplate_input === 'Yes' && (
              <div className="ml-4 mb-4 border-l-2 border-teal-200 pl-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Wallplate</label>
                <input value={form.wallplate_jumlah} onChange={e => setForm(prev => ({ ...prev, wallplate_jumlah: e.target.value }))}
                  placeholder="e.g. 3 unit" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
            )}

            {/* Tabletop */}
            <RadioGroup label="Tabletop Input" options={['Yes', 'No']} value={form.tabletop_input}
              onChange={v => setForm(prev => ({ ...prev, tabletop_input: v }))} />
            {form.tabletop_input === 'Yes' && (
              <div className="ml-4 mb-4 border-l-2 border-teal-200 pl-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Tabletop</label>
                <input value={form.tabletop_jumlah} onChange={e => setForm(prev => ({ ...prev, tabletop_jumlah: e.target.value }))}
                  placeholder="e.g. 2 unit" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
            )}

            {/* Wireless */}
            <RadioGroup label="Wireless Presentation" options={['Yes', 'No']} value={form.wireless_presentation}
              onChange={v => setForm(prev => ({ ...prev, wireless_presentation: v }))} />
            {form.wireless_presentation === 'Yes' && (
              <div className="ml-4 mb-4 space-y-3 border-l-2 border-teal-200 pl-4">
                <CheckGroup label="Wireless Mode" options={['Aplikasi', 'AirPlay', 'Miracast', 'Chromecast', 'BYOM']}
                  value={form.wireless_mode} onChange={v => setForm(prev => ({ ...prev, wireless_mode: v }))} />
                <RadioGroup label="Dongle" options={['Yes', 'No']} value={form.wireless_dongle}
                  onChange={v => setForm(prev => ({ ...prev, wireless_dongle: v }))} />
              </div>
            )}

            {/* Controller */}
            <RadioGroup label="Controller / Automation" options={['Yes', 'No']} value={form.controller_automation}
              onChange={v => setForm(prev => ({ ...prev, controller_automation: v }))} />
            {form.controller_automation === 'Yes' && (
              <div className="ml-4 mb-4 border-l-2 border-teal-200 pl-4">
                <CheckGroup label="Controller Type" options={['Cue', 'Wyrestorm', 'Extron', 'Custom']}
                  value={form.controller_type} onChange={v => setForm(prev => ({ ...prev, controller_type: v }))} />
              </div>
            )}
          </div>

          {/* Room & Other Info */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📐</span>
              Ruangan & Informasi Lainnya
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ukuran Ruangan (P × L × T)</label>
                <input value={form.ukuran_ruangan} onChange={e => setForm(prev => ({ ...prev, ukuran_ruangan: e.target.value }))}
                  placeholder="e.g. 8m × 6m × 3m" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Suggest Tampilan (W × H)</label>
                <input value={form.suggest_tampilan} onChange={e => setForm(prev => ({ ...prev, suggest_tampilan: e.target.value }))}
                  placeholder="e.g. 1920 × 1080 px atau 4K" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Keterangan Lain</label>
                <textarea value={form.keterangan_lain} onChange={e => setForm(prev => ({ ...prev, keterangan_lain: e.target.value }))}
                  rows={3} placeholder="Tuliskan informasi tambahan..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-teal-400 transition-all bg-white outline-none resize-none" />
              </div>
            </div>
          </div>

          {/* Foto Survey + BOQ Upload — side by side */}
          <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <span className="w-7 h-7 bg-teal-600 text-white rounded-lg flex items-center justify-center text-xs shadow">📎</span>
              Dokumen & Foto Survey <span className="text-xs font-normal text-gray-400">(opsional)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Foto Survey */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">📸 Foto Survey</p>
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
                    className="w-full border-2 border-dashed border-gray-300 rounded-xl py-6 text-center text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-all">
                    <div className="text-2xl mb-1">📷</div>
                    <p className="text-xs font-medium">Klik upload foto</p>
                    <p className="text-[11px] mt-0.5 opacity-70">Max 10 foto</p>
                  </button>
                ) : (
                  <div>
                    <div className="grid grid-cols-3 gap-1.5 mb-2">
                      {surveyPhotosPreviews.map((src, i) => (
                        <div key={i} className="relative group rounded-lg overflow-hidden aspect-square border border-gray-200">
                          <img src={src} alt="" className="w-full h-full object-cover" />
                          <button type="button" onClick={() => {
                            const newPhotos = surveyPhotos.filter((_, j) => j !== i);
                            setSurveyPhotos(newPhotos);
                            setSurveyPhotosPreviews(newPhotos.map(f => URL.createObjectURL(f)));
                          }} className="absolute top-0.5 right-0.5 bg-red-500 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                        </div>
                      ))}
                      {surveyPhotos.length < 10 && (
                        <button type="button" onClick={() => surveyPhotoRef.current?.click()}
                          className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400 hover:border-teal-400 hover:text-teal-500 transition-all">
                          <span className="text-xl">+</span>
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">{surveyPhotos.length}/10 foto</p>
                  </div>
                )}
              </div>

              {/* BOQ Upload */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">📊 BOQ Excel</p>
                <input ref={boqFormRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setBoqFormFile(f);
                    e.target.value = '';
                  }} />
                {!boqFormFile ? (
                  <button type="button" onClick={() => boqFormRef.current?.click()}
                    className="w-full border-2 border-dashed border-emerald-300 rounded-xl py-6 text-center text-emerald-500 hover:border-emerald-500 hover:bg-emerald-50 transition-all">
                    <div className="text-2xl mb-1">📊</div>
                    <p className="text-xs font-medium">Klik upload BOQ</p>
                    <p className="text-[11px] mt-0.5 opacity-70">.xlsx / .xls / .csv</p>
                  </button>
                ) : (
                  <div className="border-2 border-emerald-300 bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-xl">📊</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-emerald-800 truncate">{boqFormFile.name}</p>
                      <p className="text-[11px] text-emerald-600">{(boqFormFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={() => setBoqFormFile(null)}
                      className="text-red-400 hover:text-red-600 font-bold text-sm flex-shrink-0">✕</button>
                  </div>
                )}
                {boqFormFile && (
                  <button type="button" onClick={() => boqFormRef.current?.click()}
                    className="mt-2 w-full text-xs text-emerald-600 hover:text-emerald-800 font-bold py-1 transition-all">
                    🔄 Ganti File
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 p-4 flex gap-3 bg-white flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">
            Batal
          </button>
          <button type="button" onClick={onSubmit} disabled={submitting}
            className="flex-[2] bg-gradient-to-r from-teal-600 to-teal-800 hover:from-teal-700 hover:to-teal-900 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Mengirim...</>
              : <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>Submit Form</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Form Require Project Module ─────────────────────────────────────────────

function FormRequireProject({ currentUser }: { currentUser: User }) {
  const [appReady, setAppReady] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
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
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterMonth, setFilterMonth] = useState<string>('all');
  const [filterHandler, setFilterHandler] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSales, setSearchSales] = useState('');
  const [ptsMembersList, setPtsMembersList] = useState<string[]>([]);
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
  const [deleteModal, setDeleteModal] = useState<{ open: boolean; req: ProjectRequest | null }>({ open: false, req: null });
  const [deleting, setDeleting] = useState(false);
  const [editFormModal, setEditFormModal] = useState(false);
  const [assignModal, setAssignModal] = useState<{ open: boolean; req: ProjectRequest | null }>({ open: false, req: null });
  const [editFormData, setEditFormData] = useState({project_name:'',room_name:'',project_location:'',sales_name:'',kebutuhan:[] as string[],kebutuhan_other:'',solution_product:[] as string[],solution_other:'',layout_signage:[] as string[],jaringan_cms:[] as string[],jumlah_input:'',jumlah_output:'',source:[] as string[],source_other:'',camera_conference:'No',camera_jumlah:'',camera_tracking:[] as string[],audio_system:'No',audio_mixer:'',audio_detail:[] as string[],wallplate_input:'No',wallplate_jumlah:'',tabletop_input:'No',tabletop_jumlah:'',wireless_presentation:'No',wireless_mode:[] as string[],wireless_dongle:'No',controller_automation:'No',controller_type:[] as string[],ukuran_ruangan:'',suggest_tampilan:'',keterangan_lain:''});

  const role = currentUser.role?.toLowerCase().trim() ?? '';
  const isPTS = ['admin', 'superadmin', 'team_pts', 'team'].includes(role);
  const isTeamPTS = role === 'team_pts' || role === 'team';
  const isSuperAdmin = role === 'superadmin';
  const isAdmin = role === 'admin';

  const initialForm: InitialFormType = {
    project_name: '', room_name: '', project_location: '', sales_name: '', sales_division: '',
    kebutuhan: [], kebutuhan_other: '',
    solution_product: [], solution_other: '',
    layout_signage: [], jaringan_cms: [],
    jumlah_input: '', jumlah_output: '',
    source: [], source_other: '',
    camera_conference: 'No', camera_jumlah: '', camera_tracking: [],
    audio_system: 'No', audio_mixer: '', audio_detail: [],
    wallplate_input: 'No', wallplate_jumlah: '',
    tabletop_input: 'No', tabletop_jumlah: '',
    wireless_presentation: 'No', wireless_mode: [], wireless_dongle: 'No',
    controller_automation: 'No', controller_type: [],
    ukuran_ruangan: '', suggest_tampilan: '', keterangan_lain: '',
  };

  const [form, setForm] = useState<InitialFormType>(initialForm);
  const [dueDateForm, setDueDateForm] = useState('');
  const [surveyPhotos, setSurveyPhotos] = useState<File[]>([]);
  const [surveyPhotosPreviews, setSurveyPhotosPreviews] = useState<string[]>([]);
  const [boqFormFile, setBoqFormFile] = useState<File | null>(null);

  const notify = useCallback((type: 'success' | 'error' | 'info', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('project_requests').select('*').order('created_at', { ascending: false });
    if (!isPTS) {
      // Guest/sales: hanya milik sendiri
      query = query.eq('requester_id', currentUser.id);
    }
    // Semua PTS (team_pts, team, admin, superadmin) → lihat SEMUA ticket
    const { data, error } = await query;
    if (!error && data) {
      setRequests(data as ProjectRequest[]);
      // Collect unique assigned handlers for dropdown
      const assigned = [...new Set((data as ProjectRequest[]).map(r => r.pts_assigned).filter(Boolean) as string[])].sort();
      setPtsMembersList(assigned);
      const ids = (data as ProjectRequest[]).map(r => r.id);
      if (ids.length > 0) {
        const { data: msgData } = await supabase
          .from('project_messages').select('request_id, created_at')
          .in('request_id', ids).neq('sender_role', 'system').order('created_at', { ascending: false });
        if (msgData) {
          const counts: Record<string, number> = {};
          const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
          setLastSeenMap(stored);
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
    setAppReady(true);
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
    if (!selectedRequest) { activeRequestIdRef.current = null; return; }
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

  // ── Helpers ──
  const formatFileSize = (bytes: number) =>
    bytes < 1024 ? bytes + ' B' : bytes < 1048576 ? (bytes / 1024).toFixed(1) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
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

  // ── Available years ──
  const availableYears = [...new Set(requests.map(r => new Date(r.created_at).getFullYear().toString()))].sort((a,b) => b.localeCompare(a));

  const filteredRequests = requests.filter(r => {
    const matchStatus = filterStatus === 'all' || r.status === filterStatus;
    const matchYear = filterYear === 'all' || new Date(r.created_at).getFullYear().toString() === filterYear;
    const matchMonth = filterMonth === 'all' || (new Date(r.created_at).getMonth() + 1).toString().padStart(2, '0') === filterMonth;
    const matchHandler = filterHandler === 'all' || (r.pts_assigned || '') === filterHandler;
    const matchProject = !searchQuery || r.project_name.toLowerCase().includes(searchQuery.toLowerCase())
      || (r.project_location || '').toLowerCase().includes(searchQuery.toLowerCase())
      || (r.room_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchSales = !searchSales || (r.sales_name || '').toLowerCase().includes(searchSales.toLowerCase())
      || (r.requester_name || '').toLowerCase().includes(searchSales.toLowerCase());
    return matchStatus && matchYear && matchMonth && matchHandler && matchProject && matchSales;
  });

  // FIX #4: stats now includes 'approved' as separate count
  const stats = {
    total:       requests.length,
    pending:     requests.filter(r => r.status === 'pending').length,
    approved:    requests.filter(r => r.status === 'approved').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed:   requests.filter(r => r.status === 'completed').length,
    rejected:    requests.filter(r => r.status === 'rejected').length,
  };

  // ── Pie chart data ──
  const statusPieData = [
    { label: 'Pending',     value: stats.pending,     color: '#f59e0b' },
    { label: 'Approved',    value: requests.filter(r=>r.status==='approved').length, color: '#10b981' },
    { label: 'In Progress', value: stats.in_progress, color: '#3b82f6' },
    { label: 'Completed',   value: stats.completed,   color: '#8b5cf6' },
    { label: 'Rejected',    value: stats.rejected,    color: '#ef4444' },
  ].filter(d => d.value > 0);

  const divisionCounts: Record<string, number> = {};
  for (const r of requests) { const d = r.sales_division || 'Lainnya'; divisionCounts[d] = (divisionCounts[d]||0)+1; }
  const divisionPieData = Object.entries(divisionCounts).map(([label,value],i) => ({ label, value, color: PIE_COLORS[i%PIE_COLORS.length] }));

  const assignedCounts: Record<string, number> = {};
  for (const r of requests) { const a = r.pts_assigned || 'Unassigned'; assignedCounts[a] = (assignedCounts[a]||0)+1; }
  const assignedPieData = Object.entries(assignedCounts).map(([label,value],i) => ({ label, value, color: PIE_COLORS[i%PIE_COLORS.length] }));

  // ── CHECKBOX / RADIO GROUP (for edit modal) ──
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

  // ── HANDLERS ──────────────────────────────────────────────────────────────

  const handleSubmitForm = async () => {
    if (!form.project_name.trim()) { notify('error', 'Nama Project wajib diisi!'); return; }
    if (form.kebutuhan.length === 0 && !form.kebutuhan_other.trim()) { notify('error', 'Pilih minimal satu Kategori Kebutuhan!'); return; }
    if (form.solution_product.length === 0 && !form.solution_other.trim()) { notify('error', 'Pilih minimal satu Solution Product!'); return; }
    setSubmitting(true);
    try {
      const payload = {
        project_name: form.project_name.trim(), room_name: form.room_name.trim(),
        project_location: form.project_location.trim(),
        sales_name: form.sales_name.trim(), sales_division: form.sales_division?.trim() || '',
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

        // Upload BOQ form file jika ada
        if (boqFormFile && data?.id) {
          const filePath = `project-files/${data.id}/boq-initial-${Date.now()}-${boqFormFile.name}`;
          const { error: boqErr } = await supabase.storage.from('project-files').upload(filePath, boqFormFile, { cacheControl: '3600', upsert: false });
          if (!boqErr) {
            const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
            await supabase.from('project_attachments').insert([{
              request_id: data.id, message_id: null, file_name: boqFormFile.name,
              file_url: urlData.publicUrl, file_type: boqFormFile.type, file_size: boqFormFile.size,
              uploaded_by: currentUser.full_name, attachment_category: 'boq', revision_version: 1,
            }]);
          }
        }

        // WA ke semua admin saat guest/sales submit — via notify-handler
        // Semua role (bukan hanya guest/sales) — admin juga tetap butuh notif jika
        // yang submit adalah user dengan role lain
        await supabase.functions.invoke('notify-handler', {
          body: {
            type: 'form_require_approval',
            projectName: form.project_name.trim(),
            requesterName: currentUser.full_name,
            salesName: form.sales_name.trim() || '',
            salesDivision: form.sales_division || '',
            submittedAt: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
          },
        });
      }
      notify('success', '✅ Form berhasil dikirim! ⏳ Menunggu approval dari Superadmin.');
      setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]); setBoqFormFile(null);
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
      if (selectedRequest?.id === req.id) setSelectedRequest(prev => prev ? { ...prev, status: 'approved', approved_by: currentUser.full_name, pts_assigned: currentUser.full_name } : null);
      await supabase.from('project_messages').insert([{ request_id: req.id, sender_id: currentUser.id, sender_name: 'System', sender_role: 'system', message: `✅ Request telah diapprove oleh ${currentUser.full_name}. Tim PTS akan segera memproses.` }]);
      if (selectedRequest?.id === req.id) fetchMessages(req.id);
    }
  };

  const handleReject = (req: ProjectRequest) => { setRejectNote(''); setRejectModal({ open: true, req }); };

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

  const handleDeleteConfirm = async () => {
    const req = deleteModal.req; if (!req) return;
    setDeleting(true);
    // Delete attachments from storage
    const { data: attachData } = await supabase.from('project_attachments').select('file_url').eq('request_id', req.id);
    if (attachData && attachData.length > 0) {
      const filePaths = (attachData as { file_url: string }[]).map(a => {
        const match = a.file_url.match(/project-files\/.+/);
        return match ? match[0] : null;
      }).filter(Boolean) as string[];
      if (filePaths.length > 0) await supabase.storage.from('project-files').remove(filePaths);
    }
    await supabase.from('project_attachments').delete().eq('request_id', req.id);
    await supabase.from('project_messages').delete().eq('request_id', req.id);
    const { error } = await supabase.from('project_requests').delete().eq('id', req.id);
    setDeleting(false);
    if (error) { notify('error', 'Gagal menghapus: ' + error.message); return; }
    notify('success', `Request "${req.project_name}" berhasil dihapus.`);
    setDeleteModal({ open: false, req: null });
    if (selectedRequest?.id === req.id) { setShowDetailModal(false); setSelectedRequest(null); }
    fetchRequests();
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
      project_name: selectedRequest.project_name||'', room_name: selectedRequest.room_name||'',
      project_location: selectedRequest.project_location||'',
      sales_name: selectedRequest.sales_name||'', kebutuhan: selectedRequest.kebutuhan||[],
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
    notify('success', 'Perubahan disimpan!');
    setEditFormModal(false);
    fetchRequests();
    setSelectedRequest(prev => prev ? { ...prev, ...editFormData } : null);
    await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `✏️ Kebutuhan project diperbarui oleh ${currentUser.full_name}.` }]);
    fetchMessages(selectedRequest.id);
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
    if (storageError) { notify('error', `Upload ${label} gagal: ` + storageError.message); setUploadingCategory(null); return; }
    const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(filePath);
    await supabase.from('project_attachments').insert([{ request_id: selectedRequest.id, message_id: null, file_name: file.name, file_url: urlData.publicUrl, file_type: file.type, file_size: file.size, uploaded_by: currentUser.full_name, attachment_category: category, revision_version: revisionNum }]);
    setUploadingCategory(null);
    notify('success', `${label} Rev-${revisionNum} berhasil diupload!`);
    fetchAttachments(selectedRequest.id);
    await supabase.from('project_messages').insert([{ request_id: selectedRequest.id, sender_id: currentUser.id, sender_name: currentUser.full_name, sender_role: currentUser.role, message: `📁 ${label} Revision ${revisionNum} diupload: ${file.name}` }]);
  };

  const handleOpenDetail = async (req: ProjectRequest) => {
    activeRequestIdRef.current = req.id;
    setSelectedRequest(req);
    setMessages([]);
    setAttachments([]);
    setShowDetailModal(true);
    await fetchMessages(req.id);
    await fetchAttachments(req.id);
    const stored = JSON.parse(localStorage.getItem('pts_last_seen') || '{}');
    stored[req.id] = Date.now();
    localStorage.setItem('pts_last_seen', JSON.stringify(stored));
    setUnreadMsgMap(prev => { const n = { ...prev }; delete n[req.id]; return n; });
  };

  const handleCloseDetail = () => {
    activeRequestIdRef.current = null;
    setShowDetailModal(false);
    setSelectedRequest(null);
    setMessages([]);
    setAttachments([]);
  };

  const handlePrint = () => {
    if (!selectedRequest) return;
    const sc = statusConfig[selectedRequest.status] || statusConfig.pending;
    const printContent = `
      <html><head><title>Form Require Project — ${selectedRequest.project_name}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:20px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #ccc;padding:8px;font-size:13px;text-align:left}th{background:#f0fdfa;font-weight:bold}@media print{button{display:none}}</style>
      </head><body>
      <h1>🏗️ Form Equipment Request — IVP</h1>
      <p style="margin:0;color:#555">${sc.label} · ${selectedRequest.requester_name} · ${formatDate(selectedRequest.created_at)}</p>
      <table><tr><th>Field</th><th>Value</th></tr>
      <tr><td>Project</td><td>${selectedRequest.project_name}</td></tr>
      <tr><td>Ruangan</td><td>${selectedRequest.room_name}</td></tr>
      <tr><td>Sales</td><td>${selectedRequest.sales_name}</td></tr>
      <tr><td>Divisi</td><td>${selectedRequest.sales_division || '-'}</td></tr>
      <tr><td>Kebutuhan</td><td>${[...selectedRequest.kebutuhan, selectedRequest.kebutuhan_other].filter(Boolean).join(', ')}</td></tr>
      <tr><td>Solution</td><td>${[...selectedRequest.solution_product, selectedRequest.solution_other].filter(Boolean).join(', ')}</td></tr>
      <tr><td>Layout Signage</td><td>${selectedRequest.layout_signage?.join(', ') || '-'}</td></tr>
      <tr><td>Jaringan CMS</td><td>${selectedRequest.jaringan_cms?.join(', ') || '-'}</td></tr>
      <tr><td>Jumlah I/O</td><td>${selectedRequest.jumlah_input} in / ${selectedRequest.jumlah_output} out</td></tr>
      <tr><td>Source</td><td>${[...selectedRequest.source, selectedRequest.source_other].filter(Boolean).join(', ')}</td></tr>
      <tr><td>Camera</td><td>${selectedRequest.camera_conference === 'Yes' ? `Yes — ${selectedRequest.camera_jumlah} unit, ${selectedRequest.camera_tracking?.join(', ') || ''}` : 'No'}</td></tr>
      <tr><td>Audio</td><td>${selectedRequest.audio_system === 'Yes' ? `Yes — ${selectedRequest.audio_mixer}, ${selectedRequest.audio_detail?.join(', ') || ''}` : 'No'}</td></tr>
      <tr><td>Wallplate</td><td>${selectedRequest.wallplate_input === 'Yes' ? `Yes — ${selectedRequest.wallplate_jumlah} unit` : 'No'}</td></tr>
      <tr><td>Tabletop</td><td>${selectedRequest.tabletop_input === 'Yes' ? `Yes — ${selectedRequest.tabletop_jumlah} unit` : 'No'}</td></tr>
      <tr><td>Wireless</td><td>${selectedRequest.wireless_presentation === 'Yes' ? `Yes — ${selectedRequest.wireless_mode?.join(', ')}, Dongle: ${selectedRequest.wireless_dongle}` : 'No'}</td></tr>
      <tr><td>Controller</td><td>${selectedRequest.controller_automation === 'Yes' ? `Yes — ${selectedRequest.controller_type?.join(', ')}` : 'No'}</td></tr>
      <tr><td>Ukuran Ruangan</td><td>${selectedRequest.ukuran_ruangan || '-'}</td></tr>
      <tr><td>Suggest Tampilan</td><td>${selectedRequest.suggest_tampilan || '-'}</td></tr>
      <tr><td>Keterangan Lain</td><td>${selectedRequest.keterangan_lain || '-'}</td></tr>
      ${selectedRequest.pts_assigned ? `<tr><td>PTS Handler</td><td>${selectedRequest.pts_assigned}</td></tr>` : ''}
      ${selectedRequest.due_date ? `<tr><td>Target Selesai</td><td>${formatDueDate(selectedRequest.due_date)}</td></tr>` : ''}
      </table></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(printContent); w.document.close(); w.print(); }
  };

  // ── RENDER — single return, detail jadi modal overlay ──
  if (!appReady) return <LoadingScreen />;

  const detailSc = selectedRequest ? (statusConfig[selectedRequest.status] || statusConfig.pending) : null;
  const detailIsPending = selectedRequest?.status === 'pending';
  const detailDueStatus = selectedRequest ? getDueStatus(selectedRequest.due_date, selectedRequest.status) : null;
  const isFileType = (type: string) => type.startsWith('image/');

  return (
    <div className="flex flex-col min-h-screen bg-cover bg-center bg-fixed bg-no-repeat" style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      <NotifToast />

      {/* FIX #1: NewFormModal is now a top-level component, passes all state as props */}
      {showNewFormModal && (
        <div <NewFormModal
          currentUser={currentUser}
          form={form}
          setForm={setForm}
          initialForm={initialForm}
          dueDateForm={dueDateForm}
          setDueDateForm={setDueDateForm}
          surveyPhotos={surveyPhotos}
          setSurveyPhotos={setSurveyPhotos}
          surveyPhotosPreviews={surveyPhotosPreviews}
          setSurveyPhotosPreviews={setSurveyPhotosPreviews}
          boqFormFile={boqFormFile}
          setBoqFormFile={setBoqFormFile}
          submitting={submitting}
          onClose={() => { setShowNewFormModal(false); setForm(initialForm); setDueDateForm(''); setSurveyPhotos([]); setSurveyPhotosPreviews([]); setBoqFormFile(null); }}
          onSubmit={handleSubmitForm}
        />
      )}

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
    </div>>

      {/* ── STICKY HEADER — sama dengan Reminder Schedule ── */}
      <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.95)', borderBottom: '3px solid #0d9488', backdropFilter: 'blur(16px)' }}>
        <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)', boxShadow: '0 3px 12px rgba(13,148,136,0.4)' }}>
              <span className="text-lg">🏗️</span>
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-800">Form Require Project</h1>
              <p className="text-[11px] text-gray-500 font-medium">IVP Product — AV Solution Request</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 && (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold animate-pulse"
                style={{ background: 'rgba(239,68,68,0.12)', color: '#dc2626', border: '1.5px solid rgba(239,68,68,0.3)' }}>
                🔔 {unreadCount} pending
              </span>
            )}
            {!isPTS && (
              <button onClick={() => setShowNewFormModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#0d9488,#0f766e)', boxShadow: '0 4px 14px rgba(13,148,136,0.4)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Buat Request
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">

        {/* ── Stat Cards — sama dengan Reminder Schedule ── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Total',       value: stats.total,       sub: 'Semua request',     gradient: 'linear-gradient(135deg,#4f46e5,#6d28d9)', icon: '📋', shadow: 'rgba(79,70,229,0.35)',   onClick: () => setFilterStatus('all'),                                                     active: filterStatus === 'all' },
            { label: 'Pending',     value: stats.pending,     sub: 'Menunggu approval', gradient: 'linear-gradient(135deg,#d97706,#b45309)', icon: '⏳', shadow: 'rgba(217,119,6,0.35)',   onClick: () => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending'),             active: filterStatus === 'pending' },
            { label: 'In Progress', value: stats.in_progress, sub: 'Sedang dikerjakan', gradient: 'linear-gradient(135deg,#2563eb,#1d4ed8)', icon: '🔄', shadow: 'rgba(37,99,235,0.35)',   onClick: () => setFilterStatus(filterStatus === 'in_progress' ? 'all' : 'in_progress'),     active: filterStatus === 'in_progress' },
            { label: 'Completed',   value: stats.completed,   sub: 'Selesai ditangani', gradient: 'linear-gradient(135deg,#059669,#047857)', icon: '🏆', shadow: 'rgba(5,150,105,0.35)',   onClick: () => setFilterStatus(filterStatus === 'completed' ? 'all' : 'completed'),         active: filterStatus === 'completed' },
            { label: 'Rejected',    value: stats.rejected,    sub: 'Ditolak',           gradient: 'linear-gradient(135deg,#dc2626,#b91c1c)', icon: '🚫', shadow: 'rgba(220,38,38,0.35)',   onClick: () => setFilterStatus(filterStatus === 'rejected' ? 'all' : 'rejected'),           active: filterStatus === 'rejected' },
          ].map(card => (
            <div key={card.label} onClick={card.onClick}
              className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.03] select-none"
              style={{ background: card.gradient, boxShadow: card.active ? `0 6px 24px ${card.shadow}` : `0 4px 16px ${card.shadow}`, outline: card.active ? '3px solid white' : 'none', transform: card.active ? 'scale(1.04)' : undefined }}>
              <div className="absolute right-3 top-2 text-4xl opacity-[0.15] select-none">{card.icon}</div>
              {card.active && <div className="absolute inset-0 rounded-2xl border-4 border-white/50 pointer-events-none" />}
              <span className="text-3xl font-black text-white leading-none">{card.value}</span>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{card.label}</p>
                <p className="text-[10px] font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{card.sub}</p>
              </div>
              {card.active && <span className="absolute top-2 left-2 text-white/80 text-[9px] font-bold uppercase tracking-widest">Filter ✓</span>}
            </div>
          ))}
        </div>

        {/* ── Pie Charts — MiniPieChart persis Reminder Schedule ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MiniPieChart data={statusPieData} title="Status Request" icon="📊"
            onSliceClick={label => {
              const map: Record<string,string> = { Pending:'pending', Approved:'approved', 'In Progress':'in_progress', Completed:'completed', Rejected:'rejected' };
              setFilterStatus(prev => prev === (map[label]||label) ? 'all' : (map[label]||label));
            }} />
          <MiniPieChart data={divisionPieData} title="Divisi Sales" icon="👤"
            onSliceClick={label => {
              // filter by sales division — using searchSales as proxy filter
              setSearchSales(prev => prev === label ? '' : label);
            }} />
          <MiniPieChart data={assignedPieData} title="Team PTS Handler" icon="👥"
            onSliceClick={label => setFilterHandler(prev => prev === label ? 'all' : label)} />
        </div>

        {/* ── Active filter chips ── */}
        {(filterStatus !== 'all' || filterYear !== 'all' || filterMonth !== 'all' || filterHandler !== 'all' || searchQuery || searchSales) && (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Filter:</span>
            {filterStatus !== 'all' && <button onClick={() => setFilterStatus('all')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: '#d97706' }}>🏷️ {filterStatus} ✕</button>}
            {filterYear !== 'all' && <button onClick={() => setFilterYear('all')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: '#0891b2' }}>📅 {filterYear} ✕</button>}
            {filterMonth !== 'all' && <button onClick={() => setFilterMonth('all')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: '#0e7490' }}>🗓️ Bln {filterMonth} ✕</button>}
            {filterHandler !== 'all' && <button onClick={() => setFilterHandler('all')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: '#7c3aed' }}>👷 {filterHandler} ✕</button>}
            {searchQuery && <button onClick={() => setSearchQuery('')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: '#475569' }}>🔍 {searchQuery} ✕</button>}
            {searchSales && <button onClick={() => setSearchSales('')} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80" style={{ background: '#475569' }}>👤 {searchSales} ✕</button>}
            <button onClick={() => { setFilterStatus('all'); setFilterYear('all'); setFilterMonth('all'); setFilterHandler('all'); setSearchQuery(''); setSearchSales(''); }} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-80" style={{ background: 'rgba(0,0,0,0.1)', color: '#374151' }}>Reset Semua</button>
          </div>
        )}

        {/* ── TICKET LIST — container sama dengan Reminder Schedule ── */}
        <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)' }}>

          {/* Search + filter bar — integrated di atas list */}
          <div className="px-5 pt-4 pb-3 flex flex-wrap gap-3 items-center" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <div className="flex-1 min-w-[150px] relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-all focus:ring-2 focus:ring-teal-400 outline-none"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} placeholder="Search project / lokasi / ruangan..." />
            </div>
            <div className="flex-1 min-w-[130px] relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              <input value={searchSales} onChange={e => setSearchSales(e.target.value)}
                className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-all focus:ring-2 focus:ring-teal-400 outline-none"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }} placeholder="Search sales / requester..." />
            </div>
            {/* Team Handler dropdown */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👷</span>
              <select value={filterHandler} onChange={e => setFilterHandler(e.target.value)}
                className="rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-400 outline-none appearance-none cursor-pointer"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 160 }}>
                <option value="all">Semua Handler</option>
                {ptsMembersList.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
            </div>
            {/* Filter status */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-400 outline-none appearance-none cursor-pointer"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 140 }}>
                <option value="all">All Status</option>
                <option value="pending">⏳ Pending</option>
                <option value="approved">✅ Approved</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="completed">🏆 Completed</option>
                <option value="rejected">❌ Rejected</option>
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
            </div>
            {/* Filter tahun */}
            <div className="relative">
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="rounded-xl px-3 pr-8 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-400 outline-none appearance-none cursor-pointer"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 110 }}>
                <option value="all">Semua Tahun</option>
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
            </div>
            {/* Filter bulan */}
            <div className="relative">
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="rounded-xl px-3 pr-8 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-teal-400 outline-none appearance-none cursor-pointer"
                style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 130 }}>
                <option value="all">Semua Bulan</option>
                <option value="01">Januari</option>
                <option value="02">Februari</option>
                <option value="03">Maret</option>
                <option value="04">April</option>
                <option value="05">Mei</option>
                <option value="06">Juni</option>
                <option value="07">Juli</option>
                <option value="08">Agustus</option>
                <option value="09">September</option>
                <option value="10">Oktober</option>
                <option value="11">November</option>
                <option value="12">Desember</option>
              </select>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
            </div>
          </div>

          {/* Sub-header */}
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">TICKET LIST</span>
              <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center">{loading ? '…' : filteredRequests.length}</span>
            </div>
            <button onClick={fetchRequests} disabled={loading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-gray-100 border border-gray-200 text-gray-600 disabled:opacity-60"
              style={{ background: 'white' }}>
              <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              Refresh
            </button>
          </div>

          {/* No column header needed for card grid */}

          {/* Table header — 8 columns with dividers */}
          <div className="hidden md:grid px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-500"
            style={{ gridTemplateColumns: '2fr 1.2fr 1.3fr 1.1fr 1fr 1fr 1.1fr 100px', borderBottom: '2px solid #e5e7eb', background: '#f1f5f9', borderTop: '1px solid #e5e7eb' }}>
            <span className="pr-3 border-r-2 border-gray-300 py-1">NAMA PROJECT</span>
            <span className="px-3 border-r-2 border-gray-300 py-1">LOKASI</span>
            <span className="px-3 border-r-2 border-gray-300 py-1">SALES</span>
            <span className="px-3 border-r-2 border-gray-300 py-1">HANDLER</span>
            <span className="px-3 border-r-2 border-gray-300 py-1">STATUS</span>
            <span className="px-3 border-r-2 border-gray-300 py-1">DUE DATE</span>
            <span className="px-3 border-r-2 border-gray-300 py-1">CREATED BY</span>
            <span className="pl-3 py-1 text-center">ACTION</span>
          </div>

          {/* Table body — row listing */}
          {loading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse hidden md:grid px-5 py-3.5 border-b border-gray-200"
                  style={{ gridTemplateColumns: '2fr 1.2fr 1.3fr 1.1fr 1fr 1fr 1.1fr 100px' }}>
                  <div className="pr-3 border-r-2 border-gray-100"><div className="h-4 bg-gray-200 rounded w-3/4 mb-1" /><div className="h-3 bg-gray-100 rounded w-1/2" /></div>
                  <div className="px-3 border-r-2 border-gray-100"><div className="h-4 bg-gray-100 rounded w-2/3" /></div>
                  <div className="px-3 border-r-2 border-gray-100"><div className="h-4 bg-gray-100 rounded w-3/4" /><div className="h-3 bg-gray-100 rounded w-1/2 mt-1" /></div>
                  <div className="px-3 border-r-2 border-gray-100"><div className="h-4 bg-gray-100 rounded w-2/3" /></div>
                  <div className="px-3 border-r-2 border-gray-100"><div className="h-5 bg-gray-100 rounded-full w-20" /></div>
                  <div className="px-3 border-r-2 border-gray-100"><div className="h-4 bg-gray-100 rounded w-16" /></div>
                  <div className="px-3 border-r-2 border-gray-100"><div className="h-4 bg-gray-100 rounded w-3/4" /></div>
                  <div className="pl-3"><div className="h-7 bg-gray-100 rounded-lg w-16" /></div>
                </div>
              ))}
              <div className="flex items-center justify-center gap-3 py-6 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" />
                <span className="text-sm font-medium">Memuat data...</span>
              </div>
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-gray-600 font-semibold">Tidak ada request ditemukan</p>
              <p className="text-sm text-gray-400 mt-1">Coba ubah filter atau buat request baru</p>
              {!isPTS && <button onClick={() => setShowNewFormModal(true)} className="mt-4 bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-md">+ Buat Request Pertama</button>}
            </div>
          ) : (
            <div>
              {filteredRequests.map((req) => {
                const sc = statusConfig[req.status] || statusConfig.pending;
                const unread = unreadMsgMap[req.id] || 0;
                const dueStatus = getDueStatus(req.due_date, req.status);
                const isToday = req.due_date === new Date().toISOString().split('T')[0];
                return (
                  <div key={req.id}>
                    {/* Mobile row */}
                    <div className="md:hidden px-4 py-3 transition-colors border-b border-gray-100"
                      style={{ borderLeft: isToday ? '3px solid #0d9488' : '3px solid transparent' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            {unread > 0 && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />}
                            <p className="font-bold text-gray-800 text-sm truncate">{req.project_name}</p>
                          </div>
                          {req.project_location && <p className="text-[11px] text-gray-400 truncate mt-0.5">📍 {req.project_location}</p>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex-shrink-0 ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 mb-2">
                        <span>{req.sales_name}{req.sales_division ? ` · ${req.sales_division}` : ''}</span>
                        <span>{dueStatus ? `🎯 ${dueStatus.label}` : new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {(isPTS && !isTeamPTS && req.status === 'pending') && (
                          <>
                            <button onClick={() => handleApprove(req)} className="flex-1 bg-emerald-500 text-white py-1.5 rounded-lg text-xs font-bold">✅ Approve</button>
                            <button onClick={() => handleReject(req)} className="flex-1 bg-red-50 text-red-600 border border-red-200 py-1.5 rounded-lg text-xs font-bold">❌ Tolak</button>
                          </>
                        )}
                        <button onClick={() => handleOpenDetail(req)} className="flex-1 bg-teal-600 text-white py-1.5 rounded-lg text-xs font-bold">Detail →</button>
                      </div>
                    </div>

                    {/* Desktop row — 8 columns with dividers */}
                    <div className="hidden md:grid px-5 py-3.5 transition-colors group"
                      style={{
                        gridTemplateColumns: '2fr 1.2fr 1.3fr 1.1fr 1fr 1fr 1.1fr auto',
                        borderBottom: '1px solid #e5e7eb',
                        borderLeft: isToday ? '3px solid #0d9488' : '3px solid transparent',
                      }}>

                    {/* Desktop row — 8 columns with dividers */}
                    <div className="hidden md:grid px-5 py-3.5 transition-colors group hover:bg-teal-50/30"
                      style={{
                        gridTemplateColumns: '2fr 1.2fr 1.3fr 1.1fr 1fr 1fr 1.1fr 100px',
                        borderBottom: '1px solid #e5e7eb',
                        borderLeft: isToday ? '3px solid #0d9488' : '3px solid transparent',
                      }}>

                      {/* Nama Project + Ruangan */}
                      <div className="pr-3 border-r-2 border-gray-100 flex flex-col justify-center min-w-0">
                        <div className="flex items-center gap-1.5">
                          {unread > 0 && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />}
                          <p className="font-bold text-gray-800 text-sm group-hover:text-teal-700 transition-colors truncate">{req.project_name}</p>
                          {unread > 0 && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">+{unread}</span>}
                        </div>
                        {req.room_name && <p className="text-[11px] text-teal-600 font-medium mt-0.5 truncate">🛋️ {req.room_name}</p>}
                      </div>

                      {/* Lokasi */}
                      <div className="px-3 border-r-2 border-gray-100 flex items-center min-w-0">
                        <p className="text-xs text-gray-600 truncate">{req.project_location || <span className="text-gray-300">—</span>}</p>
                      </div>

                      {/* Sales + Divisi */}
                      <div className="px-3 border-r-2 border-gray-100 flex flex-col justify-center min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">{req.sales_name || <span className="text-gray-300">—</span>}</p>
                        {req.sales_division && <p className="text-[11px] text-indigo-500 font-bold truncate">{req.sales_division}</p>}
                      </div>

                      {/* Handler */}
                      <div className="px-3 border-r-2 border-gray-100 flex items-center min-w-0">
                        {req.pts_assigned ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                              {req.pts_assigned.charAt(0).toUpperCase()}
                            </div>
                            <p className="text-xs font-bold text-gray-700 truncate">{req.pts_assigned}</p>
                          </div>
                        ) : <span className="text-gray-300 text-xs">—</span>}
                      </div>

                      {/* Status */}
                      <div className="px-3 border-r-2 border-gray-100 flex flex-col justify-center">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${sc.color} ${sc.bg} ${sc.border}`}>{sc.label}</span>
                        {req.status === 'pending' && isPTS && !isTeamPTS && <p className="text-[9px] font-bold text-red-500 mt-1 animate-pulse">🔔 Perlu Approval</p>}
                      </div>

                      {/* Due Date */}
                      <div className="px-3 border-r-2 border-gray-100 flex flex-col justify-center min-w-0">
                        {req.due_date ? (
                          <>
                            <p className="text-xs font-semibold text-gray-700">{formatDueDate(req.due_date)}</p>
                            {dueStatus && (
                              <span className={`text-[10px] font-bold mt-0.5 ${dueStatus.type === 'overdue' ? 'text-red-500' : dueStatus.type === 'urgent' ? 'text-amber-500' : 'text-teal-500'}`}>
                                🎯 {dueStatus.label}
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </div>

                      {/* Created By */}
                      <div className="px-3 border-r-2 border-gray-100 flex flex-col justify-center min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{req.requester_name}</p>
                        <p className="text-[10px] text-gray-400">{new Date(req.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </div>

                      {/* Action */}
                      <div className="pl-3 flex items-center justify-center gap-1" onClick={e => e.stopPropagation()}>
                        {isPTS && !isTeamPTS && req.status === 'pending' && (
                          <>
                            <button onClick={() => handleApprove(req)} title="Approve"
                              className="w-7 h-7 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 rounded-lg flex items-center justify-center text-xs font-bold transition-all">✅</button>
                            <button onClick={() => handleReject(req)} title="Tolak"
                              className="w-7 h-7 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg flex items-center justify-center text-xs font-bold transition-all">❌</button>
                          </>
                        )}
                        {(isSuperAdmin || isAdmin) && (
                          <button onClick={() => setDeleteModal({ open: true, req })} title="Hapus"
                            className="w-7 h-7 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 rounded-lg flex items-center justify-center transition-all">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        )}
                        <button onClick={() => handleOpenDetail(req)} title="Detail"
                          className="px-3 h-8 rounded-lg flex items-center justify-center transition-all bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold border border-teal-600">
                          Detail
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal.open && rejectModal.req && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-400 animate-scale-in overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-700 px-6 py-4">
              <h3 className="font-bold text-white text-lg">❌ Tolak Request</h3>
              <p className="text-red-100 text-xs mt-0.5">{rejectModal.req.project_name}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Alasan penolakan (opsional):</label>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} placeholder="Tuliskan alasan penolakan..."
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 transition-all outline-none resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal({ open: false, req: null })} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all">Batal</button>
                <button onClick={handleRejectConfirm} className="flex-[2] bg-gradient-to-r from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white py-3 rounded-xl font-bold shadow-lg transition-all">❌ Ya, Tolak</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal — Admin only */}
      {deleteModal.open && deleteModal.req && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-600 animate-scale-in overflow-hidden">
            <div className="bg-gradient-to-r from-red-700 to-red-900 px-6 py-4">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                Hapus Request
              </h3>
              <p className="text-red-100 text-xs mt-0.5 truncate">{deleteModal.req.project_name}</p>
            </div>
            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                <p className="text-sm font-bold text-red-700 mb-1">⚠️ Aksi ini tidak bisa dibatalkan!</p>
                <p className="text-xs text-red-600">Semua data request termasuk pesan chat dan file attachment akan dihapus permanen dari database dan storage.</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-200">
                <p className="text-xs text-gray-500 font-medium">Request yang akan dihapus:</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{deleteModal.req.project_name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{deleteModal.req.requester_name} · {statusConfig[deleteModal.req.status]?.label}</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setDeleteModal({ open: false, req: null })} disabled={deleting}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition-all disabled:opacity-50">Batal</button>
                <button onClick={handleDeleteConfirm} disabled={deleting}
                  className="flex-[2] bg-gradient-to-r from-red-700 to-red-900 hover:from-red-800 hover:to-red-950 text-white py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {deleting ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Menghapus...</> : <>🗑️ Ya, Hapus Permanen</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes scale-in { from { opacity:0; transform:scale(0.95); } to { opacity:1; transform:scale(1); } }
        @keyframes slide-up { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .animate-scale-in { animation: scale-in 0.2s ease-out; }
        .animate-slide-up { animation: slide-up 0.25s ease-out; }
        select option { background: #ffffff; color: #1e293b; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(13,148,136,0.25); border-radius: 4px; }
      `}</style>

      {/* ── DETAIL MODAL POPUP ── */}
      {showDetailModal && selectedRequest && detailSc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9990] p-2 md:p-4"
          onClick={e => { if (e.target === e.currentTarget) handleCloseDetail(); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl animate-slide-up flex flex-col overflow-hidden"
            style={{ maxHeight: '94vh', border: '2px solid rgba(13,148,136,0.3)' }}>

            {/* Detail Modal Header */}
            <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-5 py-4 flex items-center gap-4 flex-shrink-0">
              <button onClick={handleCloseDetail}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-white truncate">{selectedRequest.project_name}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${detailSc.color} bg-white/20 border-white/40 text-white`}>{detailSc.label}</span>
                  {selectedRequest.pts_assigned && <span className="bg-white/20 text-white px-2.5 py-1 rounded-full text-xs font-bold border border-white/30">🔧 {selectedRequest.pts_assigned}</span>}
                </div>
                <p className="text-teal-100 text-xs mt-0.5 truncate">
                  {selectedRequest.room_name && `${selectedRequest.room_name} · `}
                  {selectedRequest.project_location && `📍 ${selectedRequest.project_location} · `}
                  {selectedRequest.requester_name} · {selectedRequest.sales_division || ''} · {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              {/* Actions in header */}
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {isPTS && !isTeamPTS && detailIsPending && (
                  <>
                    <button onClick={() => { setAssignModal({ open: true, req: selectedRequest }); }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">✅ Approve</button>
                    <button onClick={() => handleReject(selectedRequest)}
                      className="bg-white/20 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-white/30">❌ Tolak</button>
                  </>
                )}
                {isPTS && !isTeamPTS && selectedRequest.status === 'approved' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'in_progress')}
                    className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">🔄 In Progress</button>
                )}
                {isPTS && !isTeamPTS && selectedRequest.status === 'in_progress' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'completed')}
                    className="bg-purple-500 hover:bg-purple-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">🏆 Selesai</button>
                )}
                {!isPTS && selectedRequest.status !== 'rejected' && (
                  <button onClick={handleOpenEditForm}
                    className="bg-amber-400 hover:bg-amber-300 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">✏️ Edit</button>
                )}
                <button onClick={handlePrint}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-white/30">🖨️ Print</button>
              </div>
            </div>

      {/* ── DETAIL MODAL POPUP ── */}
      {showDetailModal && selectedRequest && detailSc && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9990] p-2 md:p-3"
          onClick={e => { if (e.target === e.currentTarget) handleCloseDetail(); }}>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-[1400px] animate-slide-up flex flex-col overflow-hidden"
            style={{ maxHeight: '96vh', border: '2px solid rgba(13,148,136,0.3)' }}>

            {/* Detail Modal Header */}
            <div className="bg-gradient-to-r from-teal-700 to-teal-900 px-5 py-4 flex items-center gap-4 flex-shrink-0">
              <button onClick={handleCloseDetail}
                className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-xl transition-all flex-shrink-0">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-lg font-bold text-white truncate">{selectedRequest.project_name}</h2>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${detailSc.color} bg-white/20 border-white/40 text-white`}>{detailSc.label}</span>
                  {selectedRequest.pts_assigned && <span className="bg-white/20 text-white px-2.5 py-1 rounded-full text-xs font-bold border border-white/30">🔧 {selectedRequest.pts_assigned}</span>}
                </div>
                <p className="text-teal-100 text-xs mt-0.5 truncate">
                  {selectedRequest.room_name && `${selectedRequest.room_name} · `}
                  {selectedRequest.project_location && `📍 ${selectedRequest.project_location} · `}
                  {selectedRequest.requester_name} · {selectedRequest.sales_division || ''} · {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              {/* Actions in header */}
              <div className="flex gap-2 flex-shrink-0 flex-wrap">
                {isPTS && !isTeamPTS && detailIsPending && (
                  <>
                    <button onClick={() => { setAssignModal({ open: true, req: selectedRequest }); }}
                      className="bg-emerald-500 hover:bg-emerald-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">✅ Approve</button>
                    <button onClick={() => handleReject(selectedRequest)}
                      className="bg-white/20 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-white/30">❌ Tolak</button>
                  </>
                )}
                {isPTS && !isTeamPTS && selectedRequest.status === 'approved' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'in_progress')}
                    className="bg-blue-500 hover:bg-blue-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">🔄 In Progress</button>
                )}
                {isPTS && !isTeamPTS && selectedRequest.status === 'in_progress' && (
                  <button onClick={() => handleStatusUpdate(selectedRequest, 'completed')}
                    className="bg-purple-500 hover:bg-purple-400 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">🏆 Selesai</button>
                )}
                {!isPTS && selectedRequest.status !== 'rejected' && (
                  <button onClick={handleOpenEditForm}
                    className="bg-amber-400 hover:bg-amber-300 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all">✏️ Edit</button>
                )}
                <button onClick={handlePrint}
                  className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-white/30">🖨️ Print</button>
              </div>
            </div>

            {/* Detail Modal Body — 3 columns */}
            <div className="flex-1 flex overflow-hidden min-h-0">

              {/* LEFT: Detail Info — form-style display */}
              <div className="flex-[2] min-w-0 border-r border-gray-100 overflow-y-auto bg-gray-50">
                <div className="p-5 space-y-4">
                  <p className="text-[11px] font-bold text-teal-600 tracking-widest uppercase">📋 Detail Kebutuhan</p>

                  {/* Info Umum */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-50 to-teal-100 px-4 py-2 border-b border-teal-200">
                      <p className="text-xs font-bold text-teal-700 flex items-center gap-1.5">📁 Informasi Project</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                      {[
                        ['Nama Project', selectedRequest.project_name],
                        ['Nama Ruangan', selectedRequest.room_name],
                        ['Lokasi', selectedRequest.project_location],
                        ['Sales / Account', selectedRequest.sales_name],
                        ['Divisi Sales', selectedRequest.sales_division],
                        ['Requester', selectedRequest.requester_name],
                      ].filter(([, v]) => v).map(([k, v]) => (
                        <div key={k as string}>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{k as string}</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">{v as string}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Kebutuhan & Solution */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-violet-50 to-violet-100 px-4 py-2 border-b border-violet-200">
                      <p className="text-xs font-bold text-violet-700 flex items-center gap-1.5">🎯 Kategori & Solution</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Kebutuhan</p>
                        <div className="flex flex-wrap gap-1">
                          {[...(selectedRequest.kebutuhan||[]), selectedRequest.kebutuhan_other].filter(Boolean).map(item => (
                            <span key={item} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200">{item}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Solution Product</p>
                        <div className="flex flex-wrap gap-1">
                          {[...(selectedRequest.solution_product||[]), selectedRequest.solution_other].filter(Boolean).map(item => (
                            <span key={item} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">{item}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Layout Signage</p>
                        <div className="flex flex-wrap gap-1">
                          {(selectedRequest.layout_signage||[]).map(item => (
                            <span key={item} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">{item}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Jaringan / CMS</p>
                        <div className="flex flex-wrap gap-1">
                          {(selectedRequest.jaringan_cms||[]).map(item => (
                            <span key={item} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">{item}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Source & I/O */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 px-4 py-2 border-b border-amber-200">
                      <p className="text-xs font-bold text-amber-700 flex items-center gap-1.5">🔌 Source & I/O</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                      <div className="col-span-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Source</p>
                        <div className="flex flex-wrap gap-1">
                          {[...(selectedRequest.source||[]), selectedRequest.source_other].filter(Boolean).map(item => (
                            <span key={item} className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">{item}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jumlah Input</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedRequest.jumlah_input || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Jumlah Output</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedRequest.jumlah_output || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Peripheral */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 px-4 py-2 border-b border-emerald-200">
                      <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">📹 Peripheral</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Camera Conference</p>
                        {selectedRequest.camera_conference === 'Yes' ? (
                          <div className="mt-0.5">
                            <p className="text-sm font-semibold text-gray-800">Yes — {selectedRequest.camera_jumlah || '-'} unit</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(selectedRequest.camera_tracking||[]).map(item => (
                                <span key={item} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{item}</span>
                              ))}
                            </div>
                          </div>
                        ) : <p className="text-sm font-semibold text-gray-400 mt-0.5">No</p>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Audio System</p>
                        {selectedRequest.audio_system === 'Yes' ? (
                          <div className="mt-0.5">
                            <p className="text-sm font-semibold text-gray-800">Yes — {selectedRequest.audio_mixer || '-'}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {(selectedRequest.audio_detail||[]).map(item => (
                                <span key={item} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">{item}</span>
                              ))}
                            </div>
                          </div>
                        ) : <p className="text-sm font-semibold text-gray-400 mt-0.5">No</p>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Wallplate Input</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedRequest.wallplate_input === 'Yes' ? `Yes — ${selectedRequest.wallplate_jumlah || '-'} unit` : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tabletop Input</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedRequest.tabletop_input === 'Yes' ? `Yes — ${selectedRequest.tabletop_jumlah || '-'} unit` : 'No'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Wireless Presentation</p>
                        {selectedRequest.wireless_presentation === 'Yes' ? (
                          <div className="mt-0.5">
                            <div className="flex flex-wrap gap-1">
                              {(selectedRequest.wireless_mode||[]).map(item => (
                                <span key={item} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">{item}</span>
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-500 mt-0.5">Dongle: {selectedRequest.wireless_dongle}</p>
                          </div>
                        ) : <p className="text-sm font-semibold text-gray-400 mt-0.5">No</p>}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Controller / Automation</p>
                        {selectedRequest.controller_automation === 'Yes' ? (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {(selectedRequest.controller_type||[]).map(item => (
                              <span key={item} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">{item}</span>
                            ))}
                          </div>
                        ) : <p className="text-sm font-semibold text-gray-400 mt-0.5">No</p>}
                      </div>
                    </div>
                  </div>

                  {/* Ruangan & Keterangan */}
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="bg-gradient-to-r from-slate-50 to-slate-100 px-4 py-2 border-b border-slate-200">
                      <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">📐 Ruangan & Keterangan</p>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-x-6 gap-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ukuran Ruangan</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedRequest.ukuran_ruangan || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Suggest Tampilan</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{selectedRequest.suggest_tampilan || '-'}</p>
                      </div>
                      {selectedRequest.keterangan_lain && (
                        <div className="col-span-2">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Keterangan Lain</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5 whitespace-pre-wrap">{selectedRequest.keterangan_lain}</p>
                        </div>
                      )}
                      {selectedRequest.pts_assigned && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PTS Handler</p>
                          <p className="text-sm font-semibold text-teal-700 mt-0.5">🔧 {selectedRequest.pts_assigned}</p>
                        </div>
                      )}
                      {selectedRequest.due_date && (
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Target Selesai</p>
                          <p className="text-sm font-semibold text-gray-800 mt-0.5">📅 {formatDueDate(selectedRequest.due_date)}</p>
                          {detailDueStatus && (
                            <span className={`text-[10px] font-bold ${detailDueStatus.type === 'overdue' ? 'text-red-500' : detailDueStatus.type === 'urgent' ? 'text-amber-500' : 'text-teal-500'}`}>🎯 {detailDueStatus.label}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Admin controls */}
                  {isPTS && !isTeamPTS && (
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="bg-gradient-to-r from-rose-50 to-rose-100 px-4 py-2 border-b border-rose-200">
                        <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">⚙️ Admin Controls</p>
                      </div>
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Target Selesai</p>
                          {detailDueStatus && (
                            <div className={`mb-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold ${detailDueStatus.type === 'overdue' ? 'bg-red-100 text-red-600' : detailDueStatus.type === 'urgent' ? 'bg-amber-100 text-amber-600' : 'bg-teal-100 text-teal-600'}`}>
                              🎯 {detailDueStatus.label}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <input type="date" defaultValue={selectedRequest.due_date || ''} id="detail_due_date"
                              className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:border-teal-400 outline-none bg-white" />
                            <button onClick={async () => {
                              const val = (document.getElementById('detail_due_date') as HTMLInputElement)?.value;
                              const { error } = await supabase.from('project_requests').update({ due_date: val || null }).eq('id', selectedRequest.id);
                              if (!error) { notify('success', val ? `Target: ${formatDueDate(val)}` : 'Dihapus.'); setSelectedRequest(prev => prev ? { ...prev, due_date: val || undefined } : null); fetchRequests(); }
                              else notify('error', 'Gagal.');
                            }} className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-bold transition-all">OK</button>
                          </div>
                        </div>
                        {selectedRequest.status !== 'pending' && selectedRequest.status !== 'rejected' && (
                          <button onClick={() => setAssignModal({ open: true, req: selectedRequest })}
                            className="w-full bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 py-2 rounded-xl text-sm font-bold transition-all">
                            👥 Re-assign Tim PTS
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MIDDLE: Attachments */}
              <div className="w-48 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden bg-white">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">📎 Files</p>
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadingFile}
                    className="text-[10px] bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-2 py-1 rounded-lg font-bold transition-all">
                    {uploadingFile ? '...' : '+ Upload'}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                <input ref={sldFileRef} type="file" className="hidden" accept=".pdf"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCategoryUpload(f, 'sld'); e.target.value = ''; }} />
                <input ref={boqFileRef} type="file" className="hidden" accept=".xlsx,.xls,.csv"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCategoryUpload(f, 'boq'); e.target.value = ''; }} />
                <input ref={design3dFileRef} type="file" className="hidden" accept=".pdf,.dwg,.skp"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCategoryUpload(f, 'design3d'); e.target.value = ''; }} />

                {isPTS && selectedRequest.status !== 'pending' && selectedRequest.status !== 'rejected' && (
                  <div className="flex gap-1 p-2 border-b border-gray-100 bg-gray-50 flex-shrink-0">
                    {[
                      { cat: 'sld' as const, ref: sldFileRef, label: '📐 SLD', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
                      { cat: 'boq' as const, ref: boqFileRef, label: '📊 BOQ', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
                      { cat: 'design3d' as const, ref: design3dFileRef, label: '🎨 3D', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
                    ].map(({ cat, ref, label, cls }) => (
                      <button key={cat} onClick={() => ref.current?.click()} disabled={uploadingCategory === cat}
                        className={`flex-1 py-1 rounded-lg border text-[9px] font-bold transition-all ${cls}`}>
                        {uploadingCategory === cat ? '...' : label}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex border-b border-gray-100 flex-shrink-0">
                  {(['all', 'sld', 'boq', 'design3d'] as const).map(tab => (
                    <button key={tab} onClick={() => setActiveAttachTab(tab)}
                      className={`flex-1 py-1.5 text-[9px] font-bold uppercase transition-all ${activeAttachTab === tab ? 'text-teal-700 border-b-2 border-teal-500 bg-teal-50' : 'text-gray-400'}`}>
                      {tab === 'all' ? 'All' : tab === 'design3d' ? '3D' : tab.toUpperCase()}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto divide-y divide-gray-50 p-1">
                  {(activeAttachTab === 'all' ? attachments : attachments.filter(a => a.attachment_category === activeAttachTab)).length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-6">Belum ada file</p>
                  ) : (activeAttachTab === 'all' ? attachments : attachments.filter(a => a.attachment_category === activeAttachTab)).map(att => (
                    <div key={att.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl transition-all">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 flex items-center justify-center flex-shrink-0 text-sm">
                        {isFileType(att.file_type) ? '🖼️' : att.file_type.includes('pdf') ? '📄' : '📊'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-semibold text-gray-700 truncate">{att.file_name}</p>
                        <p className="text-[9px] text-gray-400">{formatFileSize(att.file_size)}{att.revision_version ? ` · R${att.revision_version}` : ''}</p>
                      </div>
                      <a href={att.file_url} target="_blank" rel="noopener noreferrer" className="text-teal-500 hover:text-teal-700 flex-shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* RIGHT: Chat */}
              <div className="flex-1 flex flex-col overflow-hidden bg-white">
                <div className="px-5 py-3 border-b border-gray-100 flex-shrink-0 bg-gray-50">
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">💬 Discussion Chat</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{messages.filter(m=>m.sender_role !== 'system').length} pesan</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                      <div className="text-4xl">💬</div>
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
                        <div className={`max-w-[75%] flex flex-col gap-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          <p className="text-[10px] text-gray-400 font-medium px-1">{isMe ? 'Saya' : msg.sender_name} · {new Date(msg.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                          <div className={`px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm ${isMe ? 'bg-gradient-to-br from-teal-600 to-teal-800 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                            {msg.message}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                <div className="flex-shrink-0 p-4 border-t border-gray-100 bg-gray-50">
                  {selectedRequest.status === 'rejected' ? (
                    <div className="text-center text-xs font-bold text-red-500 bg-red-50 border border-red-200 rounded-xl py-3">Request ini ditolak. Chat tidak tersedia.</div>
                  ) : selectedRequest.status === 'pending' ? (
                    <div className="text-center text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-xl py-3">🔒 Chat tersedia setelah di-approve.</div>
                  ) : (
                    <div className="flex gap-2">
                      <div className="flex-1 flex items-end gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:border-teal-500 transition-all">
                        <textarea value={msgText} onChange={e => setMsgText(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                          placeholder="Ketik pesan... (Enter kirim)" rows={1}
                          className="flex-1 bg-transparent text-sm text-gray-800 outline-none resize-none max-h-24 placeholder-gray-400" />
                        <button onClick={() => chatFileRef.current?.click()} className="text-gray-400 hover:text-teal-600 transition-colors flex-shrink-0">
                          {uploadingFile ? <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-500 rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>}
                        </button>
                        <input ref={chatFileRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx"
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ''; }} />
                      </div>
                      <button onClick={handleSendMessage} disabled={sendingMsg || !msgText.trim()}
                        className="bg-gradient-to-r from-teal-600 to-teal-800 text-white px-4 py-2 rounded-xl font-bold transition-all disabled:opacity-50 shadow-md flex-shrink-0">
                        {sendingMsg ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editFormModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9995] p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col border-2 border-amber-400 animate-scale-in overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-700 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-lg font-bold text-white">✏️ Edit Kebutuhan Project</h2>
                <p className="text-amber-100 text-xs mt-0.5">{selectedRequest.project_name}</p>
              </div>
              <button onClick={() => setEditFormModal(false)} className="bg-white/20 hover:bg-white/30 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-gray-50">

              {/* Info Project */}
              <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-xs shadow">📁</span>
                  Informasi Project
                </h3>
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Project *</label>
                    <input value={editFormData.project_name} onChange={e => setEditFormData(p => ({ ...p, project_name: e.target.value }))}
                      placeholder="Nama project..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 focus:ring-2 focus:ring-amber-100 outline-none bg-white" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Nama Ruangan</label>
                      <input value={editFormData.room_name} onChange={e => setEditFormData(p => ({ ...p, room_name: e.target.value }))}
                        placeholder="Nama ruangan / area" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none bg-white" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Lokasi Project</label>
                      <input value={editFormData.project_location} onChange={e => setEditFormData(p => ({ ...p, project_location: e.target.value }))}
                        placeholder="Gedung / Alamat..." className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none bg-white" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Sales / Account</label>
                    <input value={editFormData.sales_name} onChange={e => setEditFormData(p => ({ ...p, sales_name: e.target.value }))}
                      placeholder="Nama Sales / Account Manager" className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:border-amber-400 outline-none bg-white" />
                  </div>
                </div>
              </div>

              {/* Kebutuhan & Solution */}
              <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-xs shadow">🎯</span>
                  Kategori Kebutuhan & Solution
                </h3>
                <CheckGroup label="Kebutuhan" options={['Signage', 'Immersive', 'Meeting Room', 'Mapping', 'Command Center', 'Hybrid Classroom']}
                  value={editFormData.kebutuhan} onChange={v => setEditFormData(p => ({ ...p, kebutuhan: v }))} />
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Kebutuhan</label>
                  <input value={editFormData.kebutuhan_other} onChange={e => setEditFormData(p => ({ ...p, kebutuhan_other: e.target.value }))}
                    placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                </div>
                <CheckGroup label="Solution Product" options={['Videowall', 'Signage Display', 'Projector', 'Videotron', 'Kiosk', 'IFP']}
                  value={editFormData.solution_product} onChange={v => setEditFormData(p => ({ ...p, solution_product: v }))} />
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Solution</label>
                  <input value={editFormData.solution_other} onChange={e => setEditFormData(p => ({ ...p, solution_other: e.target.value }))}
                    placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                </div>
              </div>

              {/* Layout & Jaringan */}
              <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-xs shadow">📺</span>
                  Layout Konten & Jaringan
                </h3>
                <CheckGroup label="Layout Signage" options={['Single Zone', 'Multi Zone', 'Full Screen', 'Custom Layout']}
                  value={editFormData.layout_signage} onChange={v => setEditFormData(p => ({ ...p, layout_signage: v }))} />
                <CheckGroup label="Jaringan / CMS" options={['Offline', 'Online LAN', 'Online WiFi', 'Cloud CMS', 'Local CMS']}
                  value={editFormData.jaringan_cms} onChange={v => setEditFormData(p => ({ ...p, jaringan_cms: v }))} />
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Input</label>
                    <input value={editFormData.jumlah_input} onChange={e => setEditFormData(p => ({ ...p, jumlah_input: e.target.value }))}
                      placeholder="e.g. 4 input" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Output</label>
                    <input value={editFormData.jumlah_output} onChange={e => setEditFormData(p => ({ ...p, jumlah_output: e.target.value }))}
                      placeholder="e.g. 2 output" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                  </div>
                </div>
              </div>

              {/* Source & Peripheral */}
              <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-xs shadow">🔌</span>
                  Source & Peripheral
                </h3>
                <CheckGroup label="Source" options={['PC / Mini PC', 'Laptop', 'URL Dashboard', 'NVR CCTV', 'Media Player', 'IPTV', 'Set Top Box']}
                  value={editFormData.source} onChange={v => setEditFormData(p => ({ ...p, source: v }))} />
                <div className="mb-4">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Other Source</label>
                  <input value={editFormData.source_other} onChange={e => setEditFormData(p => ({ ...p, source_other: e.target.value }))}
                    placeholder="Tuliskan jika ada..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                </div>

                {/* Camera */}
                <RadioGroup label="Camera Conference" options={['Yes', 'No']} value={editFormData.camera_conference}
                  onChange={v => setEditFormData(p => ({ ...p, camera_conference: v }))} />
                {editFormData.camera_conference === 'Yes' && (
                  <div className="ml-4 mb-4 space-y-3 border-l-2 border-amber-200 pl-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Camera</label>
                      <input value={editFormData.camera_jumlah} onChange={e => setEditFormData(p => ({ ...p, camera_jumlah: e.target.value }))}
                        placeholder="e.g. 2 unit" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                    </div>
                    <CheckGroup label="Camera Tracking" options={['Auto Tracking', 'Manual PTZ', 'Fixed']}
                      value={editFormData.camera_tracking} onChange={v => setEditFormData(p => ({ ...p, camera_tracking: v }))} />
                  </div>
                )}

                {/* Audio */}
                <RadioGroup label="Audio System" options={['Yes', 'No']} value={editFormData.audio_system}
                  onChange={v => setEditFormData(p => ({ ...p, audio_system: v }))} />
                {editFormData.audio_system === 'Yes' && (
                  <div className="ml-4 mb-4 space-y-3 border-l-2 border-amber-200 pl-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Mixer / DSP</label>
                      <input value={editFormData.audio_mixer} onChange={e => setEditFormData(p => ({ ...p, audio_mixer: e.target.value }))}
                        placeholder="e.g. Yamaha QL1, QSC, etc." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                    </div>
                    <CheckGroup label="Audio Detail" options={['Speaker Ceiling', 'Speaker Line Array', 'Subwoofer', 'Microphone', 'Amplifier']}
                      value={editFormData.audio_detail} onChange={v => setEditFormData(p => ({ ...p, audio_detail: v }))} />
                  </div>
                )}

                {/* Wallplate */}
                <RadioGroup label="Wallplate Input" options={['Yes', 'No']} value={editFormData.wallplate_input}
                  onChange={v => setEditFormData(p => ({ ...p, wallplate_input: v }))} />
                {editFormData.wallplate_input === 'Yes' && (
                  <div className="ml-4 mb-4 border-l-2 border-amber-200 pl-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Wallplate</label>
                    <input value={editFormData.wallplate_jumlah} onChange={e => setEditFormData(p => ({ ...p, wallplate_jumlah: e.target.value }))}
                      placeholder="e.g. 3 unit" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                  </div>
                )}

                {/* Tabletop */}
                <RadioGroup label="Tabletop Input" options={['Yes', 'No']} value={editFormData.tabletop_input}
                  onChange={v => setEditFormData(p => ({ ...p, tabletop_input: v }))} />
                {editFormData.tabletop_input === 'Yes' && (
                  <div className="ml-4 mb-4 border-l-2 border-amber-200 pl-4">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Jumlah Tabletop</label>
                    <input value={editFormData.tabletop_jumlah} onChange={e => setEditFormData(p => ({ ...p, tabletop_jumlah: e.target.value }))}
                      placeholder="e.g. 2 unit" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                  </div>
                )}

                {/* Wireless */}
                <RadioGroup label="Wireless Presentation" options={['Yes', 'No']} value={editFormData.wireless_presentation}
                  onChange={v => setEditFormData(p => ({ ...p, wireless_presentation: v }))} />
                {editFormData.wireless_presentation === 'Yes' && (
                  <div className="ml-4 mb-4 space-y-3 border-l-2 border-amber-200 pl-4">
                    <CheckGroup label="Wireless Mode" options={['Aplikasi', 'AirPlay', 'Miracast', 'Chromecast', 'BYOM']}
                      value={editFormData.wireless_mode} onChange={v => setEditFormData(p => ({ ...p, wireless_mode: v }))} />
                    <RadioGroup label="Dongle" options={['Yes', 'No']} value={editFormData.wireless_dongle}
                      onChange={v => setEditFormData(p => ({ ...p, wireless_dongle: v }))} />
                  </div>
                )}

                {/* Controller */}
                <RadioGroup label="Controller / Automation" options={['Yes', 'No']} value={editFormData.controller_automation}
                  onChange={v => setEditFormData(p => ({ ...p, controller_automation: v }))} />
                {editFormData.controller_automation === 'Yes' && (
                  <div className="ml-4 mb-4 border-l-2 border-amber-200 pl-4">
                    <CheckGroup label="Controller Type" options={['Cue', 'Wyrestorm', 'Extron', 'Custom']}
                      value={editFormData.controller_type} onChange={v => setEditFormData(p => ({ ...p, controller_type: v }))} />
                  </div>
                )}
              </div>

              {/* Ruangan & Keterangan */}
              <div className="bg-white rounded-2xl p-5 border-2 border-gray-200 shadow-sm">
                <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="w-7 h-7 bg-amber-500 text-white rounded-lg flex items-center justify-center text-xs shadow">📐</span>
                  Ruangan & Informasi Lainnya
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Ukuran Ruangan (P × L × T)</label>
                    <input value={editFormData.ukuran_ruangan} onChange={e => setEditFormData(p => ({ ...p, ukuran_ruangan: e.target.value }))}
                      placeholder="e.g. 8m × 6m × 3m" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Suggest Tampilan (W × H)</label>
                    <input value={editFormData.suggest_tampilan} onChange={e => setEditFormData(p => ({ ...p, suggest_tampilan: e.target.value }))}
                      placeholder="e.g. 1920 × 1080 px atau 4K" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none bg-white" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Keterangan Lain</label>
                    <textarea value={editFormData.keterangan_lain} onChange={e => setEditFormData(p => ({ ...p, keterangan_lain: e.target.value }))}
                      rows={3} placeholder="Tuliskan informasi tambahan..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-amber-400 outline-none resize-none bg-white" />
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t-2 border-gray-200 p-4 flex gap-3 bg-white flex-shrink-0">
              <button onClick={() => setEditFormModal(false)} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50">Batal</button>
              <button onClick={handleEditFormSubmit} className="flex-[2] bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white py-3 rounded-xl font-bold shadow-lg flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.open && rejectModal.req && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full border-2 border-red-400 animate-scale-in overflow-hidden">
            <div className="bg-gradient-to-r from-red-500 to-red-700 px-6 py-4">
              <h3 className="font-bold text-white text-lg">❌ Tolak Request</h3>
              <p className="text-red-100 text-xs mt-0.5">{rejectModal.req.project_name}</p>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Alasan penolakan (opsional):</label>
              <textarea value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} placeholder="Tuliskan alasan..."
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-red-400 outline-none resize-none mb-4" />
              <div className="flex gap-3">
                <button onClick={() => setRejectModal({ open: false, req: null })} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50">Batal</button>
                <button onClick={handleRejectConfirm} className="flex-[2] bg-gradient-to-r from-red-500 to-red-700 text-white py-3 rounded-xl font-bold shadow-lg">❌ Ya, Tolak</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {assignModal.open && assignModal.req && (
        <AssignPTSModal
          req={assignModal.req}
          onClose={() => setAssignModal({ open: false, req: null })}
          onAssigned={() => {
            setAssignModal({ open: false, req: null });
            notify('success', 'Request diapprove & di-assign ke Tim PTS!');
            fetchRequests();
            if (selectedRequest) {
              setSelectedRequest(prev => prev ? { ...prev, status: 'approved' } : null);
              fetchMessages(selectedRequest.id);
            }
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}

// ─── Page Entry ───────────────────────────────────────────────────────────────

export default function Page() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    const savedTime = localStorage.getItem('loginTime');
    if (saved && savedTime) {
      const user = JSON.parse(saved);
      const time = parseInt(savedTime);
      if (Date.now() - time > 8 * 60 * 60 * 1000) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
      } else {
        setCurrentUser(user);
      }
    }
    setLoading(false);
  }, []);

  if (loading) return <LoadingScreen />;

  if (!currentUser) return (
    <div className="fixed inset-0 flex items-center justify-center"
      style={{ backgroundImage: `url('/IVP_Background.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
      <div className="relative z-10 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center"
        style={{ border: '2px solid rgba(13,148,136,0.3)' }}>
        <div className="text-5xl mb-4">🔐</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Sesi Habis</h2>
        <p className="text-gray-500 text-sm mb-6">Silakan login kembali melalui dashboard.</p>
        <a href="/dashboard" className="bg-gradient-to-r from-teal-600 to-teal-800 text-white px-6 py-3 rounded-xl font-bold hover:from-teal-700 hover:to-teal-900 transition-all shadow-md inline-block">
          Kembali ke Dashboard
        </a>
      </div>
    </div>
  );

  return <FormRequireProject currentUser={currentUser} />;
}
