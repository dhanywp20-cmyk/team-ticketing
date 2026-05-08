'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

const DAY_EN: Record<DayOfWeek, string> = {
  Senin: 'MON', Selasa: 'TUE', Rabu: 'WED', Kamis: 'THU', Jumat: 'FRI',
};

const DAY_COLORS: Record<DayOfWeek, { accent: string; bg: string; border: string; calBg: string; calText: string; ribbon: string }> = {
  Senin:  { accent: '#dc2626', bg: 'rgba(220,38,38,0.07)',   border: 'rgba(220,38,38,0.25)',   calBg: '#dc2626', calText: '#fff', ribbon: '#991b1b' },
  Selasa: { accent: '#ca8a04', bg: 'rgba(202,138,4,0.07)',   border: 'rgba(202,138,4,0.25)',   calBg: '#ca8a04', calText: '#fff', ribbon: '#92400e' },
  Rabu:   { accent: '#2563eb', bg: 'rgba(37,99,235,0.07)',   border: 'rgba(37,99,235,0.25)',   calBg: '#2563eb', calText: '#fff', ribbon: '#1e3a8a' },
  Kamis:  { accent: '#7c3aed', bg: 'rgba(124,58,237,0.07)',  border: 'rgba(124,58,237,0.25)',  calBg: '#7c3aed', calText: '#fff', ribbon: '#4c1d95' },
  Jumat:  { accent: '#059669', bg: 'rgba(5,150,105,0.07)',   border: 'rgba(5,150,105,0.25)',   calBg: '#059669', calText: '#fff', ribbon: '#064e3b' },
};

const TEAM_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'PTS IVP':  { bg: 'rgba(220,38,38,0.12)',  text: '#b91c1c', border: 'rgba(220,38,38,0.35)',  dot: '#dc2626' },
  'PTS UMP':  { bg: 'rgba(37,99,235,0.12)',  text: '#1e40af', border: 'rgba(37,99,235,0.35)',  dot: '#2563eb' },
  'PTS MLDS': { bg: 'rgba(124,58,237,0.12)', text: '#6d28d9', border: 'rgba(124,58,237,0.35)', dot: '#7c3aed' },
};

const KEBUTUHAN_OPTIONS = [
  'Meeting Room', 'Auditorium', 'Command Center', 'Digital Signage Kiosk',
  'Digital Signage Custom', 'Paging System', 'Background Music', 'Signage LED Outdoor',
  'Smartclass Room', 'Ballroom', 'Camera ETLE', 'Conference Room',
  'Paperless System', 'Delegate System', 'Camera Tracking',
] as const;

type KebutuhanOption = typeof KEBUTUHAN_OPTIONS[number];

// ─── Types ────────────────────────────────────────────────────────────────────

interface PiketPerson {
  id: string;
  name: string;
  team: 'PTS IVP' | 'PTS UMP' | 'PTS MLDS';
  is_active: boolean;
}

interface PiketSchedule {
  id: string;
  week_start: string;  // ISO date of Monday
  day_of_week: DayOfWeek;
  pic_ivp_id: string | null;
  pic_ivp_name: string | null;
  pic_ump_id: string | null;
  pic_ump_name: string | null;
  pic_mlds_id: string | null;
  pic_mlds_name: string | null;
  tamu_instansi: string | null;
  kebutuhan: string[];
  foto_url: string | null;
  created_at: string;
  updated_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function formatDisplayDate(date: Date, day: DayOfWeek): string {
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getDayDate(weekStart: Date, day: DayOfWeek): Date {
  const idx = DAYS_OF_WEEK.indexOf(day);
  return addDays(weekStart, idx);
}

function isToday(date: Date): boolean {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
}

// Mini pie chart SVG
function MiniPieChart({ data, size = 52 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="w-[52px] h-[52px] rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.07)' }}><span className="text-[9px] text-slate-400">—</span></div>;

  const cx = size / 2, cy = size / 2, r = (size - 4) / 2;
  let start = -Math.PI / 2;
  const slices: JSX.Element[] = [];

  data.forEach((d, i) => {
    if (d.value === 0) return;
    const angle = (d.value / total) * 2 * Math.PI;
    const end = start + angle;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end), y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    if (total === d.value) {
      slices.push(<circle key={i} cx={cx} cy={cy} r={r} fill={d.color} />);
    } else {
      slices.push(<path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={d.color} />);
    }
    start = end;
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices}
      <circle cx={cx} cy={cy} r={r * 0.45} fill="white" />
    </svg>
  );
}

// ─── Setting Person Modal ─────────────────────────────────────────────────────

interface PersonSettingModalProps {
  onClose: () => void;
}

function PersonSettingModal({ onClose }: PersonSettingModalProps) {
  const [persons, setPersons] = useState<PiketPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTeam, setNewTeam] = useState<PiketPerson['team']>('PTS IVP');
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg }); setTimeout(() => setNotif(null), 3000);
  };

  useEffect(() => { fetchPersons(); }, []);

  const fetchPersons = async () => {
    setLoading(true);
    const { data } = await supabase.from('piket_persons').select('*').order('team').order('name');
    if (data) setPersons(data as PiketPerson[]);
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!newName.trim()) { notify('error', 'Nama wajib diisi!'); return; }
    setSaving(true);
    const { error } = await supabase.from('piket_persons').insert([{ name: newName.trim(), team: newTeam, is_active: true }]);
    if (error) { notify('error', 'Gagal: ' + error.message); }
    else { notify('success', 'Berhasil ditambahkan!'); setNewName(''); await fetchPersons(); }
    setSaving(false);
  };

  const handleToggle = async (p: PiketPerson) => {
    await supabase.from('piket_persons').update({ is_active: !p.is_active }).eq('id', p.id);
    await fetchPersons();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus orang ini dari daftar piket?')) return;
    await supabase.from('piket_persons').delete().eq('id', id);
    notify('success', 'Dihapus.'); await fetchPersons();
  };

  const grouped = {
    'PTS IVP': persons.filter(p => p.team === 'PTS IVP'),
    'PTS UMP': persons.filter(p => p.team === 'PTS UMP'),
    'PTS MLDS': persons.filter(p => p.team === 'PTS MLDS'),
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">👥</div>
            <div>
              <h2 className="text-base font-bold text-white">Setting Anggota Piket</h2>
              <p className="text-white/60 text-xs">Kelola daftar nama untuk setiap tim piket</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">✕</button>
        </div>

        {notif && (
          <div className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 flex items-center gap-2 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notif.type === 'success' ? '✅' : '❌'} {notif.msg}
          </div>
        )}

        {/* Add form */}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">➕ Tambah Anggota</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nama Lengkap</label>
              <input value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                placeholder="Nama lengkap..." onKeyDown={e => e.key === 'Enter' && handleAdd()} />
            </div>
            <div className="w-40">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tim</label>
              <select value={newTeam} onChange={e => setNewTeam(e.target.value as PiketPerson['team'])}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-teal-400">
                <option value="PTS IVP">PTS IVP</option>
                <option value="PTS UMP">PTS UMP</option>
                <option value="PTS MLDS">PTS MLDS</option>
              </select>
            </div>
            <button onClick={handleAdd} disabled={saving}
              className="px-5 py-2 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
              {saving ? '...' : '➕ Tambah'}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? (
            <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-teal-500 border-teal-200 animate-spin" /></div>
          ) : (
            Object.entries(grouped).map(([team, members]) => {
              const tc = TEAM_COLORS[team];
              return (
                <div key={team} className="rounded-xl border overflow-hidden" style={{ borderColor: tc.border }}>
                  <div className="px-4 py-2.5 flex items-center justify-between"
                    style={{ background: tc.bg, borderBottom: `1px solid ${tc.border}` }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tc.dot }} />
                      <span className="font-bold text-sm" style={{ color: tc.text }}>{team}</span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{members.length} orang</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {members.length === 0 ? (
                      <div className="px-4 py-4 text-xs text-slate-400 text-center italic">Belum ada anggota</div>
                    ) : (
                      members.map(p => (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 transition-colors">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 text-white"
                            style={{ background: tc.dot }}>
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                          <span className={`flex-1 text-sm font-semibold ${p.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{p.name}</span>
                          {!p.is_active && <span className="text-[9px] text-slate-400 font-bold px-1.5 py-0.5 rounded-full border border-slate-200 bg-slate-50">Nonaktif</span>}
                          <button onClick={() => handleToggle(p)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${p.is_active ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>
                            {p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button onClick={() => handleDelete(p.id)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all">
                            Hapus
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Setting Modal ───────────────────────────────────────────────────

interface ScheduleSettingModalProps {
  weekStart: Date;
  onClose: () => void;
  onSaved: () => void;
}

function ScheduleSettingModal({ weekStart, onClose, onSaved }: ScheduleSettingModalProps) {
  const [persons, setPersons] = useState<PiketPerson[]>([]);
  const [assignments, setAssignments] = useState<Record<DayOfWeek, { ivp: string; ump: string; mlds: string }>>(() => {
    const init: Record<string, { ivp: string; ump: string; mlds: string }> = {};
    DAYS_OF_WEEK.forEach(d => { init[d] = { ivp: '', ump: '', mlds: '' }; });
    return init as any;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const weekKey = formatDate(weekStart);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg }); setTimeout(() => setNotif(null), 3000);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [persRes, schedRes] = await Promise.all([
        supabase.from('piket_persons').select('*').eq('is_active', true).order('name'),
        supabase.from('piket_schedules').select('*').eq('week_start', weekKey),
      ]);
      if (persRes.data) setPersons(persRes.data as PiketPerson[]);
      if (schedRes.data && schedRes.data.length > 0) {
        const newAssign: Record<string, any> = {};
        DAYS_OF_WEEK.forEach(d => { newAssign[d] = { ivp: '', ump: '', mlds: '' }; });
        (schedRes.data as PiketSchedule[]).forEach(s => {
          newAssign[s.day_of_week] = {
            ivp: s.pic_ivp_id || '',
            ump: s.pic_ump_id || '',
            mlds: s.pic_mlds_id || '',
          };
        });
        setAssignments(newAssign as any);
      }
      setLoading(false);
    };
    load();
  }, [weekKey]);

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const day of DAYS_OF_WEEK) {
        const a = assignments[day];
        const ivpP = persons.find(p => p.id === a.ivp);
        const umpP = persons.find(p => p.id === a.ump);
        const mldsP = persons.find(p => p.id === a.mlds);
        const dayDate = formatDate(getDayDate(weekStart, day));
        await supabase.from('piket_schedules').upsert({
          week_start: weekKey,
          day_of_week: day,
          day_date: dayDate,
          pic_ivp_id: a.ivp || null,
          pic_ivp_name: ivpP?.name || null,
          pic_ump_id: a.ump || null,
          pic_ump_name: umpP?.name || null,
          pic_mlds_id: a.mlds || null,
          pic_mlds_name: mldsP?.name || null,
          tamu_instansi: null,
          kebutuhan: [],
          foto_url: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'week_start,day_of_week', ignoreDuplicates: false });
      }
      notify('success', 'Jadwal berhasil disimpan!');
      setTimeout(() => { onSaved(); onClose(); }, 1000);
    } catch (e: any) { notify('error', 'Gagal: ' + e.message); }
    setSaving(false);
  };

  const ivpPersons  = persons.filter(p => p.team === 'PTS IVP');
  const umpPersons  = persons.filter(p => p.team === 'PTS UMP');
  const mldsPersons = persons.filter(p => p.team === 'PTS MLDS');

  const weekLabel = `${weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })} – ${addDays(weekStart, 4).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-5 flex items-center justify-between flex-shrink-0 rounded-t-2xl"
          style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">📋</div>
            <div>
              <h2 className="text-base font-bold text-white">Atur Jadwal Piket</h2>
              <p className="text-white/60 text-xs">Minggu: {weekLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">✕</button>
        </div>

        {notif && (
          <div className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 flex items-center gap-2 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notif.type === 'success' ? '✅' : '❌'} {notif.msg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-t-teal-500 border-teal-200 animate-spin" /></div>
          ) : (
            <div className="space-y-3">
              {DAYS_OF_WEEK.map(day => {
                const dc = DAY_COLORS[day];
                const date = getDayDate(weekStart, day);
                return (
                  <div key={day} className="rounded-xl border overflow-hidden" style={{ borderColor: dc.border }}>
                    <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: dc.bg, borderBottom: `1px solid ${dc.border}` }}>
                      <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-white flex-shrink-0"
                        style={{ background: dc.calBg }}>
                        <span className="text-[11px] font-black leading-none">{DAY_EN[day]}</span>
                        <span className="text-[10px] font-semibold leading-none mt-0.5 opacity-80">
                          {date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                      <span className="font-bold text-sm" style={{ color: dc.accent }}>{day}</span>
                      {isToday(date) && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: dc.accent }}>HARI INI</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 p-4 bg-white">
                      {[
                        { key: 'ivp',  label: 'PTS IVP',  tc: TEAM_COLORS['PTS IVP'],  opts: ivpPersons  },
                        { key: 'ump',  label: 'PTS UMP',  tc: TEAM_COLORS['PTS UMP'],  opts: umpPersons  },
                        { key: 'mlds', label: 'PTS MLDS', tc: TEAM_COLORS['PTS MLDS'], opts: mldsPersons },
                      ].map(({ key, label, tc, opts }) => (
                        <div key={key}>
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tc.dot }} />
                            <label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tc.text }}>{label}</label>
                          </div>
                          <select
                            value={(assignments[day] as any)[key]}
                            onChange={e => setAssignments(prev => ({
                              ...prev,
                              [day]: { ...prev[day], [key]: e.target.value }
                            }))}
                            className="w-full border rounded-lg px-3 py-2 text-xs outline-none bg-white transition-all"
                            style={{ borderColor: tc.border }}>
                            <option value="">— Belum ditentukan —</option>
                            {opts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Batal</button>
          <button onClick={handleSave} disabled={saving || loading}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            💾 Simpan Jadwal
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Fill Detail Modal (Tamu / Kebutuhan / Foto) ──────────────────────────────

interface FillDetailModalProps {
  schedule: PiketSchedule;
  onClose: () => void;
  onSaved: () => void;
}

function FillDetailModal({ schedule, onClose, onSaved }: FillDetailModalProps) {
  const [tamu, setTamu] = useState(schedule.tamu_instansi || '');
  const [kebutuhan, setKebutuhan] = useState<string[]>(schedule.kebutuhan || []);
  const [fotoUrl, setFotoUrl] = useState(schedule.foto_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dc = DAY_COLORS[schedule.day_of_week];

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotif({ type, msg }); setTimeout(() => setNotif(null), 3000);
  };

  const toggleKebutuhan = (k: string) => {
    setKebutuhan(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `piket/${schedule.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('piket-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('piket-photos').getPublicUrl(path);
      setFotoUrl(urlData.publicUrl);
      notify('success', 'Foto berhasil diupload!');
    } catch (e: any) { notify('error', 'Upload gagal: ' + e.message); }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('piket_schedules')
      .update({ tamu_instansi: tamu || null, kebutuhan, foto_url: fotoUrl || null, updated_at: new Date().toISOString() })
      .eq('id', schedule.id);
    setSaving(false);
    if (error) { notify('error', 'Gagal menyimpan: ' + error.message); return; }
    notify('success', 'Data berhasil disimpan!');
    setTimeout(() => { onSaved(); onClose(); }, 800);
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0 rounded-t-2xl"
          style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">✍️</div>
            <div>
              <h2 className="text-base font-bold text-white">Isi Detail Piket</h2>
              <p className="text-white/70 text-xs">{schedule.day_of_week} — {schedule.pic_ivp_name || '—'} / {schedule.pic_ump_name || '—'} / {schedule.pic_mlds_name || '—'}</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">✕</button>
        </div>

        {notif && (
          <div className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 flex items-center gap-2 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notif.type === 'success' ? '✅' : '❌'} {notif.msg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Tamu Instansi */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">🏢 Tamu Instansi <span className="text-slate-400 normal-case font-normal">(opsional)</span></label>
            <input value={tamu} onChange={e => setTamu(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all"
              placeholder="Nama instansi / perusahaan tamu..." />
          </div>

          {/* Kebutuhan */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">🎯 Kebutuhan <span className="text-slate-400 normal-case font-normal">(opsional, bisa lebih dari satu)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {KEBUTUHAN_OPTIONS.map(k => {
                const checked = kebutuhan.includes(k);
                return (
                  <button key={k} onClick={() => toggleKebutuhan(k)}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left text-xs font-semibold"
                    style={checked
                      ? { background: 'rgba(13,148,136,0.1)', borderColor: 'rgba(13,148,136,0.4)', color: '#0d9488' }
                      : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-white'}`}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    {k}
                  </button>
                );
              })}
            </div>
            {kebutuhan.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kebutuhan.map(k => (
                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                    style={{ background: 'linear-gradient(135deg, #0d9488, #0f766e)' }}>
                    {k}
                    <button onClick={() => toggleKebutuhan(k)} className="ml-0.5 opacity-80 hover:opacity-100">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Foto */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">📷 Foto <span className="text-slate-400 normal-case font-normal">(opsional)</span></label>
            {fotoUrl ? (
              <div className="relative inline-block">
                <img src={fotoUrl} alt="Foto piket" className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-sm" />
                <button onClick={() => setFotoUrl('')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 transition-all shadow">✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-all w-full text-sm font-semibold disabled:opacity-50">
                {uploading
                  ? <><div className="w-4 h-4 border-2 border-t-teal-500 border-teal-200 rounded-full animate-spin" /> Mengupload...</>
                  : <><span className="text-2xl">📁</span> Klik untuk upload foto</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Batal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            💾 Simpan Detail
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Photo Zoom Modal ─────────────────────────────────────────────────────────

function PhotoZoomModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="relative max-w-3xl max-h-[90vh]">
        <img src={url} alt="Foto piket" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
        <button onClick={onClose}
          className="absolute top-3 right-3 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-all text-sm">✕</button>
      </div>
    </div>
  );
}

// ─── Weekly Calendar Strip ────────────────────────────────────────────────────

function WeeklyStrip({ weekStart, schedules }: { weekStart: Date; schedules: PiketSchedule[] }) {
  const today = new Date();
  return (
    <div className="flex gap-2">
      {DAYS_OF_WEEK.map(day => {
        const date = getDayDate(weekStart, day);
        const dc = DAY_COLORS[day];
        const sched = schedules.find(s => s.day_of_week === day);
        const todayDay = isToday(date);
        return (
          <div key={day} className="flex-1 rounded-xl overflow-hidden border-2 transition-all"
            style={{ borderColor: todayDay ? dc.accent : dc.border, boxShadow: todayDay ? `0 0 12px ${dc.accent}30` : undefined }}>
            {/* Calendar icon header */}
            <div className="flex flex-col items-center py-2 px-1 text-white"
              style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
              <div className="flex gap-1 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
              </div>
              <span className="text-xs font-black leading-none">{date.getDate().toString().padStart(2, '0')}</span>
              <span className="text-[9px] font-bold leading-none mt-0.5 opacity-90">{DAY_EN[day]}</span>
            </div>
            {/* Day name */}
            <div className="text-center py-1 text-[9px] font-black uppercase tracking-widest"
              style={{ background: dc.bg, color: dc.accent }}>
              {day.toUpperCase()}
            </div>
            {/* Names */}
            <div className="p-2 space-y-1 min-h-[60px]"
              style={{ background: 'rgba(255,255,255,0.9)' }}>
              {sched?.pic_ivp_name && (
                <div className="text-[10px] font-semibold text-slate-700 truncate px-1 py-0.5 rounded"
                  style={{ background: TEAM_COLORS['PTS IVP'].bg }}>
                  {sched.pic_ivp_name.split(' ')[0]}
                </div>
              )}
              {sched?.pic_ump_name && (
                <div className="text-[10px] font-semibold text-slate-700 truncate px-1 py-0.5 rounded"
                  style={{ background: TEAM_COLORS['PTS UMP'].bg }}>
                  {sched.pic_ump_name.split(' ')[0]}
                </div>
              )}
              {sched?.pic_mlds_name && (
                <div className="text-[10px] font-semibold text-slate-700 truncate px-1 py-0.5 rounded"
                  style={{ background: TEAM_COLORS['PTS MLDS'].bg }}>
                  {sched.pic_mlds_name.split(' ')[0]}
                </div>
              )}
              {!sched && <div className="text-[9px] text-slate-300 text-center pt-2">—</div>}
            </div>
            {todayDay && (
              <div className="py-0.5 text-center text-[8px] font-black text-white tracking-widest"
                style={{ background: dc.accent }}>TODAY</div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Schedule Card ────────────────────────────────────────────────────────────

interface ScheduleCardProps {
  day: DayOfWeek;
  date: Date;
  schedule: PiketSchedule | null;
  onFillDetail: (s: PiketSchedule) => void;
  onPhotoZoom: (url: string) => void;
}

function ScheduleCard({ day, date, schedule, onFillDetail, onPhotoZoom }: ScheduleCardProps) {
  const dc = DAY_COLORS[day];
  const todayDay = isToday(date);

  return (
    <div className="rounded-2xl overflow-hidden border-2 shadow-sm hover:shadow-md transition-all"
      style={{
        borderColor: todayDay ? dc.accent : dc.border,
        boxShadow: todayDay ? `0 0 16px ${dc.accent}25` : undefined,
        background: 'white',
        animation: 'fadeInUp 0.4s ease forwards',
      }}>
      {/* Calendar-style header */}
      <div className="relative overflow-hidden">
        {/* Top clip lines (like a binder) */}
        <div className="flex justify-center gap-4 py-1.5" style={{ background: dc.calBg }}>
          {[0,1,2].map(i => (
            <div key={i} className="w-0.5 h-3 rounded-full bg-white/50" />
          ))}
        </div>
        {/* Main date block */}
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
            <span className="text-2xl font-black text-white leading-none">{date.getDate().toString().padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-white/80 leading-none mt-0.5 tracking-wider">{DAY_EN[day]}</span>
          </div>
          <div>
            <p className="text-white font-black text-base tracking-tight leading-tight">{day.toUpperCase()}</p>
            <p className="text-white/70 text-[11px]">{date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {todayDay && (
              <span className="inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full text-white tracking-widest" style={{ background: 'rgba(255,255,255,0.25)' }}>HARI INI</span>
            )}
          </div>
          {schedule && (
            <button onClick={() => onFillDetail(schedule)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-bold text-xs transition-all bg-white/15 hover:bg-white/25 flex-shrink-0">
              ✍️ Isi Detail
            </button>
          )}
        </div>
      </div>

      {/* PIC Names */}
      <div className="px-4 py-3 space-y-2" style={{ background: dc.bg }}>
        {[
          { name: schedule?.pic_ivp_name,  team: 'PTS IVP'  },
          { name: schedule?.pic_ump_name,  team: 'PTS UMP'  },
          { name: schedule?.pic_mlds_name, team: 'PTS MLDS' },
        ].map(({ name, team }) => {
          const tc = TEAM_COLORS[team];
          return name ? (
            <div key={team} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tc.dot }} />
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                style={{ background: tc.dot }}>
                {name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 leading-tight truncate">{name}</p>
                <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tc.text }}>{team}</span>
              </div>
            </div>
          ) : (
            <div key={team} className="flex items-center gap-2 opacity-40">
              <div className="w-2 h-2 rounded-full flex-shrink-0 bg-slate-300" />
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-slate-400 bg-slate-100 flex-shrink-0">—</div>
              <div>
                <p className="text-xs text-slate-400 font-medium italic">Belum ditentukan</p>
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{team}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Separator */}
      <div className="h-px mx-4" style={{ background: `linear-gradient(90deg, transparent, ${dc.accent}50, transparent)` }} />

      {/* Detail info */}
      <div className="px-4 py-3 space-y-2 bg-white">
        {/* Tamu */}
        <div className="flex items-start gap-2">
          <span className="text-sm flex-shrink-0">🏢</span>
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tamu Instansi</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5 leading-tight">
              {schedule?.tamu_instansi || <span className="text-slate-300 italic font-normal">—</span>}
            </p>
          </div>
        </div>

        {/* Kebutuhan */}
        {schedule?.kebutuhan && schedule.kebutuhan.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0">🎯</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kebutuhan</p>
              <div className="flex flex-wrap gap-1">
                {schedule.kebutuhan.map(k => (
                  <span key={k} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                    style={{ background: dc.calBg }}>
                    {k}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Foto */}
        {schedule?.foto_url && (
          <div className="flex items-center gap-2">
            <span className="text-sm flex-shrink-0">📷</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Foto</p>
              <button onClick={() => onPhotoZoom(schedule.foto_url!)}
                className="relative overflow-hidden rounded-lg hover:opacity-90 transition-opacity">
                <img src={schedule.foto_url} alt="Foto piket" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm" />
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all rounded-lg">
                  <span className="text-white text-xs font-bold opacity-0 hover:opacity-100 transition-opacity">🔍</span>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Piket Showroom Component ────────────────────────────────────────────

export default function PiketShowroom() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [schedules, setSchedules] = useState<PiketSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPersonSetting, setShowPersonSetting] = useState(false);
  const [showScheduleSetting, setShowScheduleSetting] = useState(false);
  const [fillDetail, setFillDetail] = useState<PiketSchedule | null>(null);
  const [photoZoom, setPhotoZoom] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDay, setFilterDay] = useState<DayOfWeek | ''>('');
  const [filterHasTamu, setFilterHasTamu] = useState(false);
  const [filterHasKebutuhan, setFilterHasKebutuhan] = useState(false);

  const weekKey = formatDate(weekStart);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('piket_schedules').select('*').eq('week_start', weekKey);
    if (data) setSchedules(data as PiketSchedule[]);
    setLoading(false);
  }, [weekKey]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  // Realtime
  useEffect(() => {
    const ch = supabase.channel('piket-schedules-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'piket_schedules' }, () => {
        setTimeout(fetchSchedules, 300);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchSchedules]);

  const prevWeek = () => setWeekStart(d => addDays(d, -7));
  const nextWeek = () => setWeekStart(d => addDays(d, 7));
  const goThisWeek = () => setWeekStart(getMonday(new Date()));

  const weekLabel = `${weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })} – ${addDays(weekStart, 4).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  const isCurrentWeek = formatDate(weekStart) === formatDate(getMonday(new Date()));

  // Filtered days
  const filteredDays = DAYS_OF_WEEK.filter(day => {
    if (filterDay && day !== filterDay) return false;
    const sched = schedules.find(s => s.day_of_week === day);
    if (filterHasTamu && !sched?.tamu_instansi) return false;
    if (filterHasKebutuhan && (!sched?.kebutuhan || sched.kebutuhan.length === 0)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (
        sched?.pic_ivp_name?.toLowerCase().includes(q) ||
        sched?.pic_ump_name?.toLowerCase().includes(q) ||
        sched?.pic_mlds_name?.toLowerCase().includes(q) ||
        sched?.tamu_instansi?.toLowerCase().includes(q) ||
        sched?.kebutuhan?.some(k => k.toLowerCase().includes(q)) ||
        day.toLowerCase().includes(q)
      );
      if (!match) return false;
    }
    return true;
  });

  // Stats for pie charts
  const tamuStats = schedules.filter(s => s.tamu_instansi).length;
  const noTamuStats = schedules.filter(s => !s.tamu_instansi).length;
  const kebutuhanCount: Record<string, number> = {};
  schedules.forEach(s => {
    (s.kebutuhan || []).forEach(k => { kebutuhanCount[k] = (kebutuhanCount[k] || 0) + 1; });
  });
  const topKebutuhan = Object.entries(kebutuhanCount).sort(([, a], [, b]) => b - a).slice(0, 5);
  const kebutuhanPieData = [
    ...topKebutuhan.map(([k, v], i) => ({ label: k, value: v, color: ['#0d9488','#2563eb','#7c3aed','#ca8a04','#dc2626'][i % 5] })),
  ];

  const tamuPieData = [
    { label: 'Ada Tamu', value: tamuStats, color: '#0d9488' },
    { label: 'Tanpa Tamu', value: noTamuStats, color: '#e2e8f0' },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f3460 100%)', fontFamily: "'Exo 2', sans-serif" }}>
      {/* Google fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;600;700;800;900&family=Orbitron:wght@600;700;800;900&display=swap');
        @keyframes fadeInUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse-glow { 0%,100% { box-shadow: 0 0 8px rgba(13,148,136,0.3); } 50% { box-shadow: 0 0 20px rgba(13,148,136,0.6); } }
        .card-today { animation: pulse-glow 2.5s infinite; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(13,148,136,0.35); border-radius: 4px; }
      `}</style>

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-50 border-b" style={{ background: 'rgba(15,23,42,0.97)', backdropFilter: 'blur(16px)', borderBottomColor: 'rgba(255,255,255,0.08)' }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)', boxShadow: '0 0 16px rgba(13,148,136,0.4)' }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h1 className="font-black text-lg text-white leading-tight tracking-tight" style={{ fontFamily: "'Orbitron', sans-serif" }}>PIKET SHOWROOM</h1>
              <p className="text-[11px] text-teal-400 font-semibold tracking-widest uppercase">IndoVisual Presentama</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setShowPersonSetting(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.07)'; }}>
              <span>👥</span> <span className="hidden sm:inline">Kelola Anggota</span>
            </button>
            <button onClick={() => setShowScheduleSetting(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all text-white"
              style={{ background: 'linear-gradient(135deg, #0d9488, #0891b2)', boxShadow: '0 0 14px rgba(13,148,136,0.35)' }}>
              <span>📋</span> <span className="hidden sm:inline">Atur Jadwal</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ─── Week Navigation ─── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button onClick={prevWeek}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="px-5 py-2.5 rounded-xl text-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <p className="text-xs text-teal-400 font-bold uppercase tracking-widest">Minggu Ini</p>
              <p className="text-sm font-bold text-white">{weekLabel}</p>
            </div>
            <button onClick={nextWeek}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all text-white"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.15)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.08)'; }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
            {!isCurrentWeek && (
              <button onClick={goThisWeek}
                className="px-3 py-2 rounded-xl text-xs font-bold transition-all"
                style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.4)', color: '#2dd4bf' }}>
                Minggu Ini
              </button>
            )}
          </div>

          {/* Stat badges */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(13,148,136,0.15)', border: '1px solid rgba(13,148,136,0.3)' }}>
              <div className="w-2 h-2 rounded-full bg-teal-400" />
              <span className="text-xs font-bold text-teal-300">{schedules.filter(s => s.tamu_instansi).length} Tamu</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-xs font-bold text-indigo-300">{Object.values(kebutuhanCount).reduce((a, b) => a + b, 0)} Kebutuhan</span>
            </div>
          </div>
        </div>

        {/* ─── Weekly Strip Calendar ─── */}
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">📅 Jadwal Mingguan</p>
          <WeeklyStrip weekStart={weekStart} schedules={schedules} />
        </div>

        {/* ─── Search & Filter ─── */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama, instansi, kebutuhan..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium text-white outline-none transition-all"
              style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }}
              onFocus={e => { e.currentTarget.style.border = '1px solid rgba(13,148,136,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
              onBlur={e => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }} />
          </div>
          <select value={filterDay} onChange={e => setFilterDay(e.target.value as any)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-white outline-none transition-all"
            style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)' }}>
            <option value="">Semua Hari</option>
            {DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={() => setFilterHasTamu(f => !f)}
            className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={filterHasTamu
              ? { background: 'rgba(13,148,136,0.25)', border: '1px solid rgba(13,148,136,0.5)', color: '#2dd4bf' }
              : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            🏢 Ada Tamu
          </button>
          <button onClick={() => setFilterHasKebutuhan(f => !f)}
            className="px-3 py-2.5 rounded-xl text-xs font-bold transition-all"
            style={filterHasKebutuhan
              ? { background: 'rgba(99,102,241,0.25)', border: '1px solid rgba(99,102,241,0.5)', color: '#a5b4fc' }
              : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}>
            🎯 Ada Kebutuhan
          </button>
          {(searchQuery || filterDay || filterHasTamu || filterHasKebutuhan) && (
            <button onClick={() => { setSearchQuery(''); setFilterDay(''); setFilterHasTamu(false); setFilterHasKebutuhan(false); }}
              className="px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 transition-all"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
              ✕ Reset
            </button>
          )}
        </div>

        {/* ─── Schedule Cards ─── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(13,148,136,0.3)', borderTopColor: '#0d9488' }} />
              <p className="text-teal-400 text-sm font-semibold tracking-wide">Memuat jadwal...</p>
            </div>
          </div>
        ) : filteredDays.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-400 font-semibold">Tidak ada jadwal yang cocok</p>
            <p className="text-slate-500 text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {filteredDays.map((day, i) => {
              const date = getDayDate(weekStart, day);
              const sched = schedules.find(s => s.day_of_week === day) ?? null;
              return (
                <ScheduleCard
                  key={day}
                  day={day}
                  date={date}
                  schedule={sched}
                  onFillDetail={setFillDetail}
                  onPhotoZoom={setPhotoZoom}
                />
              );
            })}
          </div>
        )}

        {/* ─── Stats / Mini Charts ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-2">
          {/* Tamu Pie */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-4">🏢 Statistik Tamu Minggu Ini</p>
            <div className="flex items-center gap-6">
              <MiniPieChart data={tamuPieData} size={80} />
              <div className="space-y-2.5 flex-1">
                {tamuPieData.map(d => (
                  <div key={d.label} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                    <span className="text-xs font-semibold text-slate-300 flex-1">{d.label}</span>
                    <span className="text-sm font-black text-white">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Kebutuhan Pie */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-4">🎯 Top Kebutuhan Minggu Ini</p>
            {kebutuhanPieData.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-4">Belum ada data kebutuhan</p>
            ) : (
              <div className="flex items-center gap-6">
                <MiniPieChart data={kebutuhanPieData} size={80} />
                <div className="space-y-2 flex-1">
                  {kebutuhanPieData.map(d => (
                    <div key={d.label} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-xs font-semibold text-slate-300 flex-1 truncate">{d.label}</span>
                      <span className="text-sm font-black text-white">{d.value}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ─── Modals ─── */}
      {showPersonSetting && <PersonSettingModal onClose={() => setShowPersonSetting(false)} />}
      {showScheduleSetting && (
        <ScheduleSettingModal
          weekStart={weekStart}
          onClose={() => setShowScheduleSetting(false)}
          onSaved={fetchSchedules}
        />
      )}
      {fillDetail && (
        <FillDetailModal
          schedule={fillDetail}
          onClose={() => setFillDetail(null)}
          onSaved={fetchSchedules}
        />
      )}
      {photoZoom && <PhotoZoomModal url={photoZoom} onClose={() => setPhotoZoom(null)} />}
    </div>
  );
}
