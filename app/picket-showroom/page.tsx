'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Piket Showroom ───────────────────────────────────────────────────────────

const PIKET_DAYS_OF_WEEK = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
type PiketDayOfWeek = typeof PIKET_DAYS_OF_WEEK[number];

const PIKET_DAY_EN: Record<PiketDayOfWeek, string> = {
  Senin: 'MON', Selasa: 'TUE', Rabu: 'WED', Kamis: 'THU', Jumat: 'FRI',
};

const PIKET_DAY_COLORS: Record<PiketDayOfWeek, { accent: string; bg: string; border: string; calBg: string; calText: string; ribbon: string }> = {
  Senin:  { accent: '#dc2626', bg: 'rgba(220,38,38,0.07)',   border: 'rgba(220,38,38,0.25)',   calBg: '#dc2626', calText: '#fff', ribbon: '#991b1b' },
  Selasa: { accent: '#ca8a04', bg: 'rgba(202,138,4,0.07)',   border: 'rgba(202,138,4,0.25)',   calBg: '#ca8a04', calText: '#fff', ribbon: '#92400e' },
  Rabu:   { accent: '#2563eb', bg: 'rgba(37,99,235,0.07)',   border: 'rgba(37,99,235,0.25)',   calBg: '#2563eb', calText: '#fff', ribbon: '#1e3a8a' },
  Kamis:  { accent: '#7c3aed', bg: 'rgba(124,58,237,0.07)',  border: 'rgba(124,58,237,0.25)',  calBg: '#7c3aed', calText: '#fff', ribbon: '#4c1d95' },
  Jumat:  { accent: '#059669', bg: 'rgba(5,150,105,0.07)',   border: 'rgba(5,150,105,0.25)',   calBg: '#059669', calText: '#fff', ribbon: '#064e3b' },
};

const PIKET_TEAM_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  'PTS IVP':  { bg: 'rgba(220,38,38,0.1)',  text: '#b91c1c', border: 'rgba(220,38,38,0.3)',  dot: '#dc2626' },
  'PTS UMP':  { bg: 'rgba(37,99,235,0.1)',  text: '#1e40af', border: 'rgba(37,99,235,0.3)',  dot: '#2563eb' },
  'PTS MLDS': { bg: 'rgba(124,58,237,0.1)', text: '#6d28d9', border: 'rgba(124,58,237,0.3)', dot: '#7c3aed' },
};

const PIKET_KEBUTUHAN_OPTIONS = [
  'Meeting Room', 'Auditorium', 'Command Center', 'Digital Signage Kiosk',
  'Digital Signage Custom', 'Paging System', 'Background Music', 'Signage LED Outdoor',
  'Smartclass Room', 'Ballroom', 'Camera ETLE', 'Conference Room',
  'Paperless System', 'Delegate System', 'Camera Tracking',
];

interface PiketPerson {
  id: string;
  name: string;
  team: 'PTS IVP' | 'PTS UMP' | 'PTS MLDS';
  is_active: boolean;
}

interface PiketScheduleRow {
  id: string;
  week_start: string;
  day_of_week: PiketDayOfWeek;
  day_date?: string;
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

function piketGetMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff); d.setHours(0, 0, 0, 0);
  return d;
}
function piketAddDays(date: Date, days: number): Date {
  const d = new Date(date); d.setDate(d.getDate() + days); return d;
}
function piketFmtDate(date: Date): string { return date.toISOString().split('T')[0]; }
function piketGetDayDate(weekStart: Date, day: PiketDayOfWeek): Date {
  return piketAddDays(weekStart, PIKET_DAYS_OF_WEEK.indexOf(day));
}
function piketIsToday(date: Date): boolean {
  const t = new Date();
  return date.getFullYear() === t.getFullYear() && date.getMonth() === t.getMonth() && date.getDate() === t.getDate();
}

function PiketMiniPie({ data, size = 72 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <div className="rounded-full flex items-center justify-center text-[9px] text-slate-400" style={{ width: size, height: size, background: 'rgba(0,0,0,0.06)' }}>—</div>;
  const cx = size / 2, cy = size / 2, r = (size - 4) / 2;
  let start = -Math.PI / 2;
  const slices: React.ReactNode[] = [];
  data.forEach((d, i) => {
    if (d.value === 0) return;
    const angle = (d.value / total) * 2 * Math.PI;
    const end = start + angle;
    const x1 = cx + r * Math.cos(start), y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end),   y2 = cy + r * Math.sin(end);
    const large = angle > Math.PI ? 1 : 0;
    if (total === d.value) { slices.push(<circle key={i} cx={cx} cy={cy} r={r} fill={d.color} />); }
    else { slices.push(<path key={i} d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`} fill={d.color} />); }
    start = end;
  });
  return <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>{slices}<circle cx={cx} cy={cy} r={r * 0.45} fill="white" /></svg>;
}

function PiketPersonSettingModal({ onClose }: { onClose: () => void }) {
  const [persons, setPersons] = useState<PiketPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTeam, setNewTeam] = useState<PiketPerson['team']>('PTS IVP');
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const pfNotify = (type: 'success' | 'error', msg: string) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 3000); };
  useEffect(() => { fetchP(); }, []);
  const fetchP = async () => {
    setLoading(true);
    const { data } = await supabase.from('piket_persons').select('*').order('team').order('name');
    if (data) setPersons(data as PiketPerson[]);
    setLoading(false);
  };
  const handleAdd = async () => {
    if (!newName.trim()) { pfNotify('error', 'Nama wajib diisi!'); return; }
    setSaving(true);
    const { error } = await supabase.from('piket_persons').insert([{ name: newName.trim(), team: newTeam, is_active: true }]);
    if (error) { pfNotify('error', 'Gagal: ' + error.message); } else { pfNotify('success', 'Berhasil!'); setNewName(''); await fetchP(); }
    setSaving(false);
  };
  const handleToggle = async (p: PiketPerson) => { await supabase.from('piket_persons').update({ is_active: !p.is_active }).eq('id', p.id); await fetchP(); };
  const handleDelete = async (id: string) => {
    if (!confirm('Hapus orang ini?')) return;
    await supabase.from('piket_persons').delete().eq('id', id);
    pfNotify('success', 'Dihapus.'); await fetchP();
  };
  const grouped = { 'PTS IVP': persons.filter(p => p.team === 'PTS IVP'), 'PTS UMP': persons.filter(p => p.team === 'PTS UMP'), 'PTS MLDS': persons.filter(p => p.team === 'PTS MLDS') };
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">👥</div>
            <div><h2 className="text-base font-bold text-white">Setting Anggota Piket</h2><p className="text-white/60 text-xs">Kelola daftar nama per tim piket</p></div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">✕</button>
        </div>
        {notif && <div className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 flex items-center gap-2 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{notif.type === 'success' ? '✅' : '❌'} {notif.msg}</div>}
        <div className="px-5 py-4 border-b border-slate-100 flex-shrink-0 bg-slate-50">
          <p className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-3">➕ Tambah Anggota</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nama</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-teal-400" placeholder="Nama lengkap..." onKeyDown={e => e.key === 'Enter' && handleAdd()} /></div>
            <div className="w-40"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tim</label>
              <select value={newTeam} onChange={e => setNewTeam(e.target.value as PiketPerson['team'])} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white outline-none">
                <option value="PTS IVP">PTS IVP</option><option value="PTS UMP">PTS UMP</option><option value="PTS MLDS">PTS MLDS</option>
              </select></div>
            <button onClick={handleAdd} disabled={saving} className="px-5 py-2 rounded-lg font-bold text-sm text-white transition-all disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>{saving ? '...' : '➕ Tambah'}</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-teal-500 border-teal-200 animate-spin" /></div> : (
            Object.entries(grouped).map(([team, members]) => {
              const tc = PIKET_TEAM_COLORS[team];
              return (
                <div key={team} className="rounded-xl border overflow-hidden" style={{ borderColor: tc.border }}>
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: tc.bg, borderBottom: `1px solid ${tc.border}` }}>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: tc.dot }} /><span className="font-bold text-sm" style={{ color: tc.text }}>{team}</span></div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: tc.bg, color: tc.text, border: `1px solid ${tc.border}` }}>{members.length} orang</span>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {members.length === 0 ? <div className="px-4 py-4 text-xs text-slate-400 text-center italic">Belum ada anggota</div> : members.map(p => (
                      <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 bg-white hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white flex-shrink-0" style={{ background: tc.dot }}>{p.name.charAt(0).toUpperCase()}</div>
                        <span className={`flex-1 text-sm font-semibold ${p.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{p.name}</span>
                        <button onClick={() => handleToggle(p)} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${p.is_active ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'}`}>{p.is_active ? 'Nonaktifkan' : 'Aktifkan'}</button>
                        <button onClick={() => handleDelete(p.id)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all">Hapus</button>
                      </div>
                    ))}
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

function PiketScheduleSettingModal({ weekStart, onClose, onSaved }: { weekStart: Date; onClose: () => void; onSaved: () => void }) {
  const [persons, setPersons] = useState<PiketPerson[]>([]);
  const [assignments, setAssignments] = useState<Record<PiketDayOfWeek, { ivp: string; ump: string; mlds: string }>>(() => {
    const init: Record<string, any> = {};
    PIKET_DAYS_OF_WEEK.forEach(d => { init[d] = { ivp: '', ump: '', mlds: '' }; });
    return init as any;
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const weekKey = piketFmtDate(weekStart);
  const psNotify = (type: 'success' | 'error', msg: string) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 3000); };
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [persRes, schedRes] = await Promise.all([
        supabase.from('piket_persons').select('*').eq('is_active', true).order('name'),
        supabase.from('piket_schedules').select('*').eq('week_start', weekKey),
      ]);
      if (persRes.data) setPersons(persRes.data as PiketPerson[]);
      if (schedRes.data && schedRes.data.length > 0) {
        const na: Record<string, any> = {};
        PIKET_DAYS_OF_WEEK.forEach(d => { na[d] = { ivp: '', ump: '', mlds: '' }; });
        (schedRes.data as PiketScheduleRow[]).forEach(s => { na[s.day_of_week] = { ivp: s.pic_ivp_id || '', ump: s.pic_ump_id || '', mlds: s.pic_mlds_id || '' }; });
        setAssignments(na as any);
      }
      setLoading(false);
    };
    load();
  }, [weekKey]);
  const handleSave = async () => {
    setSaving(true);
    try {
      for (const day of PIKET_DAYS_OF_WEEK) {
        const a = assignments[day];
        const ivpP = persons.find(p => p.id === a.ivp), umpP = persons.find(p => p.id === a.ump), mldsP = persons.find(p => p.id === a.mlds);
        await supabase.from('piket_schedules').upsert({
          week_start: weekKey, day_of_week: day,
          day_date: piketFmtDate(piketGetDayDate(weekStart, day)),
          pic_ivp_id: a.ivp || null, pic_ivp_name: ivpP?.name || null,
          pic_ump_id: a.ump || null, pic_ump_name: umpP?.name || null,
          pic_mlds_id: a.mlds || null, pic_mlds_name: mldsP?.name || null,
          tamu_instansi: null, kebutuhan: [], foto_url: null, updated_at: new Date().toISOString(),
        }, { onConflict: 'week_start,day_of_week', ignoreDuplicates: false });
      }
      psNotify('success', 'Jadwal berhasil disimpan!');
      setTimeout(() => { onSaved(); onClose(); }, 900);
    } catch (e: any) { psNotify('error', 'Gagal: ' + e.message); }
    setSaving(false);
  };
  const ivpP = persons.filter(p => p.team === 'PTS IVP'), umpP = persons.filter(p => p.team === 'PTS UMP'), mldsP = persons.filter(p => p.team === 'PTS MLDS');
  const wLabel = `${weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })} – ${piketAddDays(weekStart, 4).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">📋</div>
            <div><h2 className="text-base font-bold text-white">Atur Jadwal Piket</h2><p className="text-white/60 text-xs">Minggu: {wLabel}</p></div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-all">✕</button>
        </div>
        {notif && <div className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 flex items-center gap-2 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{notif.type === 'success' ? '✅' : '❌'} {notif.msg}</div>}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? <div className="flex justify-center py-12"><div className="w-6 h-6 rounded-full border-2 border-t-teal-500 border-teal-200 animate-spin" /></div> : (
            <div className="space-y-3">
              {PIKET_DAYS_OF_WEEK.map(day => {
                const dc = PIKET_DAY_COLORS[day]; const date = piketGetDayDate(weekStart, day);
                return (
                  <div key={day} className="rounded-xl border overflow-hidden" style={{ borderColor: dc.border }}>
                    <div className="flex items-center gap-3 px-4 py-2.5" style={{ background: dc.bg, borderBottom: `1px solid ${dc.border}` }}>
                      <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center text-white flex-shrink-0" style={{ background: dc.calBg }}>
                        <span className="text-[11px] font-black leading-none">{PIKET_DAY_EN[day]}</span>
                        <span className="text-[10px] font-semibold leading-none mt-0.5 opacity-80">{date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                      </div>
                      <span className="font-bold text-sm" style={{ color: dc.accent }}>{day}</span>
                      {piketIsToday(date) && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: dc.accent }}>HARI INI</span>}
                    </div>
                    <div className="grid grid-cols-3 gap-3 p-4 bg-white">
                      {([['ivp','PTS IVP',ivpP],['ump','PTS UMP',umpP],['mlds','PTS MLDS',mldsP]] as [string,string,PiketPerson[]][]).map(([key, label, opts]) => {
                        const tc = PIKET_TEAM_COLORS[label];
                        return (
                          <div key={key}>
                            <div className="flex items-center gap-1.5 mb-1.5"><div className="w-2 h-2 rounded-full" style={{ background: tc.dot }} /><label className="text-[10px] font-bold uppercase tracking-widest" style={{ color: tc.text }}>{label}</label></div>
                            <select value={(assignments[day] as any)[key]} onChange={e => setAssignments(prev => ({ ...prev, [day]: { ...prev[day], [key]: e.target.value } }))}
                              className="w-full border rounded-lg px-3 py-2 text-xs outline-none bg-white" style={{ borderColor: tc.border }}>
                              <option value="">— Belum ditentukan —</option>
                              {opts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Batal</button>
          <button onClick={handleSave} disabled={saving || loading} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}💾 Simpan Jadwal
          </button>
        </div>
      </div>
    </div>
  );
}

function PiketFillDetailModal({ schedule, onClose, onSaved }: { schedule: PiketScheduleRow; onClose: () => void; onSaved: () => void }) {
  const [tamu, setTamu] = useState(schedule.tamu_instansi || '');
  const [kebutuhan, setKebutuhan] = useState<string[]>(schedule.kebutuhan || []);
  const [fotoUrl, setFotoUrl] = useState(schedule.foto_url || '');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dc = PIKET_DAY_COLORS[schedule.day_of_week];
  const fdNotify = (type: 'success' | 'error', msg: string) => { setNotif({ type, msg }); setTimeout(() => setNotif(null), 3000); };
  const toggleK = (k: string) => setKebutuhan(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);
  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const path = `piket/${schedule.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('piket-photos').upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from('piket-photos').getPublicUrl(path);
      setFotoUrl(urlData.publicUrl);
      fdNotify('success', 'Foto berhasil diupload!');
    } catch (e: any) { fdNotify('error', 'Upload gagal: ' + e.message); }
    setUploading(false);
  };
  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase.from('piket_schedules').update({ tamu_instansi: tamu || null, kebutuhan, foto_url: fotoUrl || null, updated_at: new Date().toISOString() }).eq('id', schedule.id);
    setSaving(false);
    if (error) { fdNotify('error', 'Gagal: ' + error.message); return; }
    fdNotify('success', 'Data berhasil disimpan!');
    setTimeout(() => { onSaved(); onClose(); }, 800);
  };
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-4 flex items-center justify-between flex-shrink-0" style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">✍️</div>
            <div><h2 className="text-base font-bold text-white">Isi Detail Piket</h2><p className="text-white/70 text-xs">{schedule.day_of_week} — {[schedule.pic_ivp_name, schedule.pic_ump_name, schedule.pic_mlds_name].filter(Boolean).join(' / ')}</p></div>
          </div>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">✕</button>
        </div>
        {notif && <div className={`mx-5 mt-3 px-4 py-2.5 rounded-lg text-sm font-semibold flex-shrink-0 flex items-center gap-2 ${notif.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>{notif.type === 'success' ? '✅' : '❌'} {notif.msg}</div>}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">🏢 Tamu Instansi <span className="text-slate-400 normal-case font-normal">(opsional)</span></label>
            <input value={tamu} onChange={e => setTamu(e.target.value)} className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" placeholder="Nama instansi / perusahaan tamu..." />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">🎯 Kebutuhan <span className="text-slate-400 normal-case font-normal">(opsional)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {PIKET_KEBUTUHAN_OPTIONS.map(k => {
                const checked = kebutuhan.includes(k);
                return (
                  <button key={k} onClick={() => toggleK(k)} className="flex items-center gap-2 px-3 py-2 rounded-xl border transition-all text-left text-xs font-semibold"
                    style={checked ? { background: 'rgba(13,148,136,0.1)', borderColor: 'rgba(13,148,136,0.4)', color: '#0d9488' } : { background: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${checked ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-white'}`}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>{k}
                  </button>
                );
              })}
            </div>
            {kebutuhan.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kebutuhan.map(k => (
                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
                    {k}<button onClick={() => toggleK(k)} className="ml-0.5 opacity-80 hover:opacity-100">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">📷 Foto <span className="text-slate-400 normal-case font-normal">(opsional)</span></label>
            {fotoUrl ? (
              <div className="relative inline-block">
                <img src={fotoUrl} alt="Foto piket" className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-sm" />
                <button onClick={() => setFotoUrl('')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow">✕</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-teal-400 hover:text-teal-600 hover:bg-teal-50/50 transition-all w-full text-sm font-semibold disabled:opacity-50">
                {uploading ? <><div className="w-4 h-4 border-2 border-t-teal-500 border-teal-200 rounded-full animate-spin" />Mengupload...</> : <><span className="text-2xl">📁</span> Klik untuk upload foto</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
          <button onClick={onClose} className="flex-1 border-2 border-slate-200 text-slate-600 py-2.5 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">Batal</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2" style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}💾 Simpan Detail
          </button>
        </div>
      </div>
    </div>
  );
}

function PiketWeeklyStrip({ weekStart, schedules }: { weekStart: Date; schedules: PiketScheduleRow[] }) {
  return (
    <div className="flex gap-2">
      {PIKET_DAYS_OF_WEEK.map(day => {
        const date = piketGetDayDate(weekStart, day); const dc = PIKET_DAY_COLORS[day];
        const sched = schedules.find(s => s.day_of_week === day); const todayDay = piketIsToday(date);
        return (
          <div key={day} className="flex-1 rounded-xl overflow-hidden border-2 transition-all"
            style={{ borderColor: todayDay ? dc.accent : dc.border, boxShadow: todayDay ? `0 0 12px ${dc.accent}30` : undefined }}>
            <div className="flex flex-col items-center py-2 px-1 text-white" style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
              <div className="flex gap-1 mb-1"><div className="w-1.5 h-1.5 rounded-full bg-white/60" /><div className="w-1.5 h-1.5 rounded-full bg-white/60" /></div>
              <span className="text-xs font-black leading-none">{date.getDate().toString().padStart(2, '0')}</span>
              <span className="text-[9px] font-bold leading-none mt-0.5 opacity-90">{PIKET_DAY_EN[day]}</span>
            </div>
            <div className="text-center py-1 text-[9px] font-black uppercase tracking-widest" style={{ background: dc.bg, color: dc.accent }}>{day.toUpperCase()}</div>
            <div className="p-2 space-y-1 min-h-[56px] bg-white/90">
              {sched?.pic_ivp_name && <div className="text-[10px] font-semibold text-slate-700 truncate px-1 py-0.5 rounded" style={{ background: PIKET_TEAM_COLORS['PTS IVP'].bg }}>{sched.pic_ivp_name.split(' ')[0]}</div>}
              {sched?.pic_ump_name && <div className="text-[10px] font-semibold text-slate-700 truncate px-1 py-0.5 rounded" style={{ background: PIKET_TEAM_COLORS['PTS UMP'].bg }}>{sched.pic_ump_name.split(' ')[0]}</div>}
              {sched?.pic_mlds_name && <div className="text-[10px] font-semibold text-slate-700 truncate px-1 py-0.5 rounded" style={{ background: PIKET_TEAM_COLORS['PTS MLDS'].bg }}>{sched.pic_mlds_name.split(' ')[0]}</div>}
              {!sched && <div className="text-[9px] text-slate-300 text-center pt-2">—</div>}
            </div>
            {todayDay && <div className="py-0.5 text-center text-[8px] font-black text-white tracking-widest" style={{ background: dc.accent }}>TODAY</div>}
          </div>
        );
      })}
    </div>
  );
}

function PiketScheduleCard({ day, date, schedule, onFillDetail, onPhotoZoom }: { day: PiketDayOfWeek; date: Date; schedule: PiketScheduleRow | null; onFillDetail: (s: PiketScheduleRow) => void; onPhotoZoom: (url: string) => void }) {
  const dc = PIKET_DAY_COLORS[day]; const todayDay = piketIsToday(date);
  return (
    <div className="rounded-2xl overflow-hidden border-2 shadow-sm hover:shadow-md transition-all"
      style={{ borderColor: todayDay ? dc.accent : dc.border, boxShadow: todayDay ? `0 0 16px ${dc.accent}25` : undefined, background: 'white', animation: 'fadeInUp 0.4s ease forwards' }}>
      <div className="relative overflow-hidden">
        <div className="flex justify-center gap-4 py-1.5" style={{ background: dc.calBg }}>
          {[0,1,2].map(i => <div key={i} className="w-0.5 h-3 rounded-full bg-white/50" />)}
        </div>
        <div className="flex items-center gap-3 px-4 py-3" style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}>
          <div className="flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
            <span className="text-2xl font-black text-white leading-none">{date.getDate().toString().padStart(2, '0')}</span>
            <span className="text-[10px] font-bold text-white/80 leading-none mt-0.5 tracking-wider">{PIKET_DAY_EN[day]}</span>
          </div>
          <div>
            <p className="text-white font-black text-base tracking-tight leading-tight">{day.toUpperCase()}</p>
            <p className="text-white/70 text-[11px]">{date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            {todayDay && <span className="inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full text-white tracking-widest" style={{ background: 'rgba(255,255,255,0.25)' }}>HARI INI</span>}
          </div>
          {schedule && (
            <button onClick={() => onFillDetail(schedule)} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-bold text-xs bg-white/15 hover:bg-white/25 flex-shrink-0 transition-all">✍️ Isi Detail</button>
          )}
        </div>
      </div>
      <div className="px-4 py-3 space-y-2" style={{ background: dc.bg }}>
        {([['pic_ivp_name','PTS IVP'],['pic_ump_name','PTS UMP'],['pic_mlds_name','PTS MLDS']] as [keyof PiketScheduleRow, string][]).map(([field, team]) => {
          const name = schedule ? (schedule[field] as string | null) : null; const tc = PIKET_TEAM_COLORS[team];
          return name ? (
            <div key={team} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tc.dot }} />
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: tc.dot }}>{name.charAt(0).toUpperCase()}</div>
              <div className="flex-1 min-w-0"><p className="text-sm font-bold text-slate-800 leading-tight truncate">{name}</p><span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: tc.text }}>{team}</span></div>
            </div>
          ) : (
            <div key={team} className="flex items-center gap-2 opacity-40">
              <div className="w-2 h-2 rounded-full bg-slate-300 flex-shrink-0" />
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-slate-400 bg-slate-100 flex-shrink-0">—</div>
              <div><p className="text-xs text-slate-400 italic">Belum ditentukan</p><span className="text-[9px] font-bold uppercase tracking-widest text-slate-300">{team}</span></div>
            </div>
          );
        })}
      </div>
      <div className="h-px mx-4" style={{ background: `linear-gradient(90deg, transparent, ${dc.accent}50, transparent)` }} />
      <div className="px-4 py-3 space-y-2 bg-white">
        <div className="flex items-start gap-2">
          <span className="text-sm flex-shrink-0">🏢</span>
          <div className="flex-1 min-w-0"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tamu Instansi</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{schedule?.tamu_instansi || <span className="text-slate-300 italic font-normal">—</span>}</p></div>
        </div>
        {schedule?.kebutuhan && schedule.kebutuhan.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-sm flex-shrink-0">🎯</span>
            <div className="flex-1 min-w-0"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kebutuhan</p>
              <div className="flex flex-wrap gap-1">{schedule.kebutuhan.map(k => <span key={k} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: dc.calBg }}>{k}</span>)}</div></div>
          </div>
        )}
        {schedule?.foto_url && (
          <div className="flex items-center gap-2">
            <span className="text-sm flex-shrink-0">📷</span>
            <div className="flex-1 min-w-0"><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Foto</p>
              <button onClick={() => onPhotoZoom(schedule.foto_url!)} className="relative overflow-hidden rounded-lg hover:opacity-90 transition-opacity">
                <img src={schedule.foto_url} alt="Foto piket" className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm" />
              </button></div>
          </div>
        )}
      </div>
    </div>
  );
}

function PiketShowroomView() {
  const [weekStart, setWeekStart] = useState<Date>(() => piketGetMonday(new Date()));
  const [schedules, setSchedules] = useState<PiketScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPersonSetting, setShowPersonSetting] = useState(false);
  const [showScheduleSetting, setShowScheduleSetting] = useState(false);
  const [fillDetail, setFillDetail] = useState<PiketScheduleRow | null>(null);
  const [photoZoom, setPhotoZoom] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDay, setFilterDay] = useState<PiketDayOfWeek | ''>('');
  const [filterHasTamu, setFilterHasTamu] = useState(false);
  const [filterHasKebutuhan, setFilterHasKebutuhan] = useState(false);
  const [hovTamu, setHovTamu] = useState<number | null>(null);
  const [hovK, setHovK] = useState<number | null>(null);
  const weekKey = piketFmtDate(weekStart);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('piket_schedules').select('*').eq('week_start', weekKey);
    if (data) setSchedules(data as PiketScheduleRow[]);
    setLoading(false);
  }, [weekKey]);

  useEffect(() => { fetchSchedules(); }, [fetchSchedules]);

  useEffect(() => {
    const ch = supabase.channel('piket-rt').on('postgres_changes', { event: '*', schema: 'public', table: 'piket_schedules' }, () => { setTimeout(fetchSchedules, 300); }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchSchedules]);

  const isCurrentWeek = weekKey === piketFmtDate(piketGetMonday(new Date()));
  const weekLabel = `${weekStart.toLocaleDateString('id-ID', { day: '2-digit', month: 'long' })} – ${piketAddDays(weekStart, 4).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;

  const filteredDays = PIKET_DAYS_OF_WEEK.filter(day => {
    if (filterDay && day !== filterDay) return false;
    const sched = schedules.find(s => s.day_of_week === day);
    if (filterHasTamu && !sched?.tamu_instansi) return false;
    if (filterHasKebutuhan && (!sched?.kebutuhan || sched.kebutuhan.length === 0)) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return !!(sched?.pic_ivp_name?.toLowerCase().includes(q) || sched?.pic_ump_name?.toLowerCase().includes(q) || sched?.pic_mlds_name?.toLowerCase().includes(q) || sched?.tamu_instansi?.toLowerCase().includes(q) || sched?.kebutuhan?.some(k => k.toLowerCase().includes(q)) || day.toLowerCase().includes(q));
    }
    return true;
  });

  // Stats
  const tamuStats = schedules.filter(s => s.tamu_instansi).length;
  const noTamuStats = schedules.length - tamuStats;
  const kebutuhanCount: Record<string, number> = {};
  schedules.forEach(s => (s.kebutuhan || []).forEach(k => { kebutuhanCount[k] = (kebutuhanCount[k] || 0) + 1; }));
  const topK = Object.entries(kebutuhanCount).sort(([,a],[,b]) => b-a).slice(0,8);
  const PIE_COLORS_LOCAL = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316'];

  // Tamu pie data
  const tamuPieData = [
    { label: 'Ada Tamu', value: tamuStats, color: '#10b981' },
    { label: 'Tanpa Tamu', value: noTamuStats, color: '#e2e8f0' },
  ].filter(d => d.value > 0);

  // Kebutuhan pie data
  const kPieData = topK.map(([k,v],i) => ({ label: k, value: v, color: PIE_COLORS_LOCAL[i % PIE_COLORS_LOCAL.length] }));
  const kTotal = kPieData.reduce((s,d) => s+d.value, 0);
  const tTotal = tamuPieData.reduce((s,d) => s+d.value, 0);

  // Donut path builder
  const buildDonutPaths = (data: {label:string;value:number;color:string}[]) => {
    const total = data.reduce((s,d) => s+d.value, 0);
    if (!total) return [];
    let cum = -Math.PI/2;
    const cx=60,cy=60,r=50,ir=28;
    return data.map((d,i) => {
      const angle = (d.value/total)*2*Math.PI;
      if (data.length===1) return {...d,path:'',isFullCircle:true,i};
      const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum);
      const x2=cx+r*Math.cos(cum+angle),y2=cy+r*Math.sin(cum+angle);
      const xi1=cx+ir*Math.cos(cum),yi1=cy+ir*Math.sin(cum);
      const xi2=cx+ir*Math.cos(cum+angle),yi2=cy+ir*Math.sin(cum+angle);
      const large=angle>Math.PI?1:0;
      const path=`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
      cum+=angle;
      return {...d,path,isFullCircle:false,i};
    });
  };

  const tamuSlices = buildDonutPaths(tamuPieData);
  const kSlices = buildDonutPaths(kPieData);

  return (
    <div className="min-h-full flex flex-col relative" style={{
      backgroundImage: `url('/IVP_Background.png')`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="relative z-10 flex flex-col min-h-full">

        {/* ── HEADER identical to Reminder Schedule ── */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '3px solid #dc2626', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', boxShadow: '0 3px 12px rgba(220,38,38,0.4)' }}>
                <span className="text-lg">🏪</span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Piket Showroom</h1>
                <p className="text-[10px] font-semibold text-slate-500 mt-0.5 uppercase tracking-widest">IndoVisual Presentama</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowPersonSetting(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border"
                style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', color: '#4338ca' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(99,102,241,0.15)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(99,102,241,0.08)'; }}>
                👥 Kelola Anggota
              </button>
              <button onClick={() => setShowScheduleSetting(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90"
                style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Atur Jadwal
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">

          {/* ── Week navigation ── */}
          <div className="rounded-2xl px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
            style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
            <div className="flex items-center gap-3">
              <button onClick={() => setWeekStart(d => piketAddDays(d,-7))}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-all hover:bg-red-50 border-2 border-transparent hover:border-red-200 text-slate-500 hover:text-red-600">‹</button>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Minggu Piket</p>
                <p className="text-sm font-bold text-slate-800">{weekLabel}</p>
              </div>
              <button onClick={() => setWeekStart(d => piketAddDays(d,7))}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-all hover:bg-red-50 border-2 border-transparent hover:border-red-200 text-slate-500 hover:text-red-600">›</button>
              {!isCurrentWeek && (
                <button onClick={() => setWeekStart(piketGetMonday(new Date()))}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', color: '#dc2626' }}>
                  Minggu Ini
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-bold text-emerald-600">{tamuStats} tamu</span>
              <span>·</span>
              <span className="font-bold text-violet-600">{Object.values(kebutuhanCount).reduce((a,b)=>a+b,0)} kebutuhan tercatat</span>
            </div>
          </div>

          {/* ── Pie Charts — identical style to Reminder Schedule ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Tamu Pie */}
            <div className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">🏢 Statistik Tamu Minggu Ini</p>
              {tTotal === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Belum ada data tamu</p>
              ) : (
                <div className="flex items-center gap-3">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
                    {tamuSlices.map((s: any) => s.isFullCircle ? (
                      <g key={s.i} onMouseEnter={() => setHovTamu(s.i)} onMouseLeave={() => setHovTamu(null)}>
                        <circle cx={60} cy={60} r={50} fill={s.color} opacity={hovTamu===null||hovTamu===s.i?1:0.45} style={{ filter: hovTamu===s.i?`drop-shadow(0 0 5px ${s.color})`:'none' }} />
                        <circle cx={60} cy={60} r={28} fill="white" />
                      </g>
                    ) : (
                      <path key={s.i} d={s.path} fill={s.color} opacity={hovTamu===null||hovTamu===s.i?1:0.45}
                        style={{ cursor:'default', transition:'opacity 0.15s', filter: hovTamu===s.i?`drop-shadow(0 0 5px ${s.color})`:'none' }}
                        onMouseEnter={() => setHovTamu(s.i)} onMouseLeave={() => setHovTamu(null)} />
                    ))}
                    <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{tTotal}</text>
                    <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
                  </svg>
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    {tamuSlices.map((s: any) => (
                      <div key={s.i} className="flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 transition-all"
                        style={{ background: hovTamu===s.i?`${s.color}20`:'transparent' }}
                        onMouseEnter={() => setHovTamu(s.i)} onMouseLeave={() => setHovTamu(null)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
                        <span className="text-[10px] font-bold flex-shrink-0" style={{ color: s.color }}>{s.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Kebutuhan Pie */}
            <div className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
              <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">🎯 Top Kebutuhan Minggu Ini</p>
              {kTotal === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Belum ada data kebutuhan</p>
              ) : (
                <div className="flex items-center gap-3">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
                    {kSlices.map((s: any) => s.isFullCircle ? (
                      <g key={s.i} onMouseEnter={() => setHovK(s.i)} onMouseLeave={() => setHovK(null)}>
                        <circle cx={60} cy={60} r={50} fill={s.color} opacity={hovK===null||hovK===s.i?1:0.45} style={{ filter: hovK===s.i?`drop-shadow(0 0 5px ${s.color})`:'none' }} />
                        <circle cx={60} cy={60} r={28} fill="white" />
                      </g>
                    ) : (
                      <path key={s.i} d={s.path} fill={s.color} opacity={hovK===null||hovK===s.i?1:0.45}
                        style={{ cursor:'default', transition:'opacity 0.15s', filter: hovK===s.i?`drop-shadow(0 0 5px ${s.color})`:'none' }}
                        onMouseEnter={() => setHovK(s.i)} onMouseLeave={() => setHovK(null)} />
                    ))}
                    <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{kTotal}</text>
                    <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
                  </svg>
                  <div className="flex flex-col gap-1 flex-1 min-w-0 max-h-[120px] overflow-y-auto">
                    {kSlices.map((s: any) => (
                      <div key={s.i} className="flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 transition-all"
                        style={{ background: hovK===s.i?`${s.color}20`:'transparent' }}
                        onMouseEnter={() => setHovK(s.i)} onMouseLeave={() => setHovK(null)}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
                        <span className="text-[10px] font-bold flex-shrink-0" style={{ color: s.color }}>{s.value}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Search & Filter ── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(200,200,200,0.6)', backdropFilter: 'blur(12px)' }}>
            <div className="flex flex-wrap items-center gap-3 px-5 py-3.5 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter & Cari</span>
              <div className="flex-1 min-w-[200px] relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Cari nama, instansi, kebutuhan..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(0,0,0,0.1)' }} />
              </div>
              <select value={filterDay} onChange={e => setFilterDay(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs font-semibold outline-none bg-white"
                style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
                <option value="">Semua Hari</option>
                {PIKET_DAYS_OF_WEEK.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={() => setFilterHasTamu(f => !f)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={filterHasTamu
                  ? { background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.4)', color: '#059669' }
                  : { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', color: '#64748b' }}>
                🏢 Ada Tamu
              </button>
              <button onClick={() => setFilterHasKebutuhan(f => !f)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={filterHasKebutuhan
                  ? { background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.35)', color: '#7c3aed' }
                  : { background: 'rgba(0,0,0,0.04)', border: '1px solid rgba(0,0,0,0.1)', color: '#64748b' }}>
                🎯 Ada Kebutuhan
              </button>
              {(searchQuery || filterDay || filterHasTamu || filterHasKebutuhan) && (
                <button onClick={() => { setSearchQuery(''); setFilterDay(''); setFilterHasTamu(false); setFilterHasKebutuhan(false); }}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626' }}>
                  ✕ Reset
                </button>
              )}
              <span className="text-xs text-gray-400 ml-auto">{filteredDays.length} dari 5 hari</span>
            </div>
          </div>

          {/* ── Cards ── */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4 px-10 py-8 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
                <div className="w-10 h-10 rounded-full border-4 border-t-red-600 border-red-200 animate-spin" />
                <p className="text-slate-700 font-semibold text-sm">Memuat jadwal piket...</p>
              </div>
            </div>
          ) : filteredDays.length === 0 ? (
            <div className="rounded-2xl p-12 text-center" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(255,255,255,0.8)', backdropFilter: 'blur(10px)' }}>
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-semibold text-slate-600">Tidak ada jadwal yang cocok</p>
              <p className="text-sm text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {filteredDays.map((day) => {
                const date = piketGetDayDate(weekStart, day);
                const sched = schedules.find(s => s.day_of_week === day) ?? null;
                const dc = PIKET_DAY_COLORS[day];
                const todayDay = piketIsToday(date);
                return (
                  <div key={day}
                    className="rounded-2xl overflow-hidden border-2 transition-all hover:shadow-xl hover:-translate-y-0.5 bg-white"
                    style={{
                      borderColor: todayDay ? dc.accent : 'rgba(255,255,255,0.8)',
                      backdropFilter: 'blur(10px)',
                      boxShadow: todayDay ? `0 0 20px ${dc.accent}35, 0 4px 24px rgba(0,0,0,0.1)` : '0 2px 16px rgba(0,0,0,0.08)',
                      animation: 'fadeInUp 0.4s ease forwards',
                    }}>

                    {/* Calendar binder lines */}
                    <div className="flex justify-center gap-3 py-1" style={{ background: dc.calBg }}>
                      {[0,1,2].map(i => <div key={i} className="w-0.5 h-2.5 rounded-full bg-white/50" />)}
                    </div>

                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 cursor-pointer group"
                      style={{ background: `linear-gradient(135deg, ${dc.calBg}, ${dc.ribbon})` }}
                      onClick={() => sched && setFillDetail(sched)}>
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex-shrink-0">
                        <span className="text-xl font-black text-white leading-none">{date.getDate().toString().padStart(2,'0')}</span>
                        <span className="text-[9px] font-bold text-white/80 leading-none mt-0.5 tracking-wider">{PIKET_DAY_EN[day]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-black text-sm tracking-tight leading-tight">{day.toUpperCase()}</p>
                        <p className="text-white/70 text-[10px]">{date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        {todayDay && <span className="inline-block mt-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full text-white tracking-widest" style={{ background:'rgba(255,255,255,0.25)' }}>HARI INI</span>}
                      </div>
                      {sched && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <div className="bg-white/20 hover:bg-white/30 text-white p-1.5 rounded-lg transition-all" title="Isi detail">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* PIC Names */}
                    <div className="px-3 py-2.5 space-y-1.5" style={{ background: dc.bg }}>
                      {([['pic_ivp_name','PTS IVP'],['pic_ump_name','PTS UMP'],['pic_mlds_name','PTS MLDS']] as [keyof PiketScheduleRow, string][]).map(([field, team]) => {
                        const name = sched ? (sched[field] as string|null) : null;
                        const tc = PIKET_TEAM_COLORS[team];
                        return name ? (
                          <div key={team} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{ background: tc.dot }}>{name.charAt(0).toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{name}</p>
                              <span className="text-[8px] font-bold uppercase tracking-widest" style={{ color: tc.text }}>{team}</span>
                            </div>
                          </div>
                        ) : (
                          <div key={team} className="flex items-center gap-2 opacity-35">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] text-slate-400 flex-shrink-0">—</div>
                            <div><p className="text-[10px] text-slate-400 italic leading-tight">Belum ditentukan</p><span className="text-[8px] font-bold uppercase tracking-widest text-slate-300">{team}</span></div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div className="h-px mx-3" style={{ background: `linear-gradient(90deg, transparent, ${dc.accent}40, transparent)` }} />

                    {/* Detail — klik area untuk buka fill detail */}
                    <div className="px-3 py-2.5 space-y-1.5 bg-white cursor-pointer" onClick={() => sched && setFillDetail(sched)}>
                      {/* Tamu */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs flex-shrink-0 mt-0.5">🏢</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Tamu Instansi</p>
                          <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-tight">
                            {sched?.tamu_instansi || <span className="text-slate-300 italic font-normal">—</span>}
                          </p>
                        </div>
                      </div>

                      {/* Kebutuhan badges */}
                      {sched?.kebutuhan && sched.kebutuhan.length > 0 ? (
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs flex-shrink-0 mt-0.5">🎯</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Kebutuhan</p>
                            <div className="flex flex-wrap gap-1">
                              {sched.kebutuhan.slice(0,3).map(k => (
                                <span key={k} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: dc.calBg }}>{k}</span>
                              ))}
                              {sched.kebutuhan.length > 3 && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(0,0,0,0.08)', color: '#64748b' }}>+{sched.kebutuhan.length-3}</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 opacity-35">
                          <span className="text-xs flex-shrink-0 mt-0.5">🎯</span>
                          <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kebutuhan</p><p className="text-[10px] text-slate-300 italic">—</p></div>
                        </div>
                      )}

                      {/* Foto thumbnail */}
                      {sched?.foto_url && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs flex-shrink-0">📷</span>
                          <button onClick={e => { e.stopPropagation(); setPhotoZoom(sched.foto_url!); }}
                            className="relative overflow-hidden rounded-lg hover:opacity-80 transition-opacity">
                            <img src={sched.foto_url} alt="Foto" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all rounded-lg text-white text-xs font-bold">🔍</div>
                          </button>
                        </div>
                      )}

                      {/* Click hint if no data yet */}
                      {sched && !sched.tamu_instansi && (!sched.kebutuhan || sched.kebutuhan.length === 0) && !sched.foto_url && (
                        <p className="text-[9px] text-slate-400 italic text-center py-1">Klik untuk mengisi detail →</p>
                      )}
                      {!sched && (
                        <p className="text-[9px] text-slate-300 italic text-center py-1">Belum ada jadwal</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Photo zoom */}
        {photoZoom && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setPhotoZoom(null)}>
            <div className="relative max-w-3xl max-h-[90vh]">
              <img src={photoZoom} alt="Foto piket zoom" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain" />
              <button onClick={() => setPhotoZoom(null)} className="absolute top-3 right-3 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-all">✕</button>
            </div>
          </div>
        )}

        {showPersonSetting && <PiketPersonSettingModal onClose={() => setShowPersonSetting(false)} />}
        {showScheduleSetting && <PiketScheduleSettingModal weekStart={weekStart} onClose={() => setShowScheduleSetting(false)} onSaved={fetchSchedules} />}
        {fillDetail && <PiketFillDetailModal schedule={fillDetail} onClose={() => setFillDetail(null)} onSaved={fetchSchedules} />}
      </div>
    </div>
  );
}

export default function PiketShowroomPage() {
  return <PiketShowroomView />;
}
