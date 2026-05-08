'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'] as const;
type Day = typeof DAYS[number];

const DAY_EN: Record<Day, string> = { Senin:'MON', Selasa:'TUE', Rabu:'WED', Kamis:'THU', Jumat:'FRI' };

const DAY_CFG: Record<Day, { accent:string; light:string; grad:string; dark:string }> = {
  Senin:  { accent:'#dc2626', light:'rgba(220,38,38,0.08)',  grad:'linear-gradient(135deg,#dc2626,#991b1b)', dark:'#991b1b' },
  Selasa: { accent:'#ca8a04', light:'rgba(202,138,4,0.08)',  grad:'linear-gradient(135deg,#ca8a04,#92400e)', dark:'#92400e' },
  Rabu:   { accent:'#2563eb', light:'rgba(37,99,235,0.08)',  grad:'linear-gradient(135deg,#2563eb,#1e3a8a)', dark:'#1e3a8a' },
  Kamis:  { accent:'#7c3aed', light:'rgba(124,58,237,0.08)', grad:'linear-gradient(135deg,#7c3aed,#4c1d95)', dark:'#4c1d95' },
  Jumat:  { accent:'#059669', light:'rgba(5,150,105,0.08)',  grad:'linear-gradient(135deg,#059669,#064e3b)', dark:'#064e3b' },
};

const TEAM_CFG: Record<string, { dot:string; text:string; bg:string }> = {
  'PTS IVP':  { dot:'#dc2626', text:'#b91c1c', bg:'rgba(220,38,38,0.1)'  },
  'PTS UMP':  { dot:'#2563eb', text:'#1e40af', bg:'rgba(37,99,235,0.1)'  },
  'PTS MLDS': { dot:'#7c3aed', text:'#6d28d9', bg:'rgba(124,58,237,0.1)' },
};

const KEBUTUHAN_LIST = [
  'Meeting Room','Auditorium','Command Center','Digital Signage Kiosk',
  'Digital Signage Custom','Paging System','Background Music','Signage LED Outdoor',
  'Smartclass Room','Ballroom','Camera ETLE','Conference Room',
  'Paperless System','Delegate System','Camera Tracking',
];

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Person { id:string; name:string; team:'PTS IVP'|'PTS UMP'|'PTS MLDS'; is_active:boolean; }

interface Schedule {
  id:string; week_start:string; day_of_week:Day; day_date?:string;
  pic_ivp_id:string|null; pic_ivp_name:string|null;
  pic_ump_id:string|null; pic_ump_name:string|null;
  pic_mlds_id:string|null; pic_mlds_name:string|null;
  tamu_instansi:string|null; kebutuhan:string[]; foto_url:string|null;
  created_at:string; updated_at:string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d: Date): Date {
  const r = new Date(d); const day = r.getDay();
  r.setDate(r.getDate() - day + (day===0?-6:1)); r.setHours(0,0,0,0); return r;
}
function addDays(d: Date, n: number): Date { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function fmtKey(d: Date): string { return d.toISOString().split('T')[0]; }
function dayDate(ws: Date, day: Day): Date { return addDays(ws, DAYS.indexOf(day)); }
function isToday(d: Date): boolean {
  const t=new Date();
  return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();
}

// ─── Donut Pie Chart — identical to Reminder Schedule ────────────────────────

function PieChart({ data, title, icon }: {
  data:{label:string;value:number;color:string}[];
  title:string; icon:string;
}) {
  const [hov, setHov] = useState<number|null>(null);
  const total = data.reduce((s,d)=>s+d.value,0);

  if (total===0) return (
    <div className="rounded-2xl p-4 flex flex-col gap-2"
      style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{icon} {title}</p>
      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
    </div>
  );

  let cum = -Math.PI/2;
  const cx=60,cy=60,r=50,ir=28;
  const slices = data.map((d,i) => {
    const angle=(d.value/total)*2*Math.PI;
    if (data.length===1) { cum+=angle; return {...d,path:'',full:true,i}; }
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum);
    const x2=cx+r*Math.cos(cum+angle),y2=cy+r*Math.sin(cum+angle);
    const xi1=cx+ir*Math.cos(cum),yi1=cy+ir*Math.sin(cum);
    const xi2=cx+ir*Math.cos(cum+angle),yi2=cy+ir*Math.sin(cum+angle);
    const lg=angle>Math.PI?1:0;
    const path=`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${lg} 0 ${xi1} ${yi1} Z`;
    cum+=angle;
    return {...d,path,full:false,i};
  });

  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3"
      style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map(s => s.full ? (
            <g key={s.i} onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
              <circle cx={60} cy={60} r={50} fill={s.color}
                opacity={hov===null||hov===s.i?1:0.45}
                style={{filter:hov===s.i?`drop-shadow(0 0 5px ${s.color})`:'none'}}/>
              <circle cx={60} cy={60} r={28} fill="white"/>
            </g>
          ) : (
            <path key={s.i} d={s.path} fill={s.color}
              opacity={hov===null||hov===s.i?1:0.45}
              style={{cursor:'default',transition:'opacity 0.15s',filter:hov===s.i?`drop-shadow(0 0 5px ${s.color})`:'none'}}
              onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}/>
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1 flex-1 min-w-0 max-h-[120px] overflow-y-auto">
          {slices.map(s => (
            <div key={s.i} className="flex items-center gap-1.5 rounded-lg px-1.5 py-0.5 transition-all"
              style={{background:hov===s.i?`${s.color}20`:'transparent'}}
              onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
              <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
              <span className="text-[10px] font-bold flex-shrink-0" style={{color:s.color}}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Fill Detail Modal ────────────────────────────────────────────────────────

function FillDetailModal({ sched, onClose, onSaved }: { sched:Schedule; onClose:()=>void; onSaved:()=>void }) {
  const [tamu, setTamu] = useState(sched.tamu_instansi||'');
  const [kebutuhan, setKebutuhan] = useState<string[]>(sched.kebutuhan||[]);
  const [fotoUrl, setFotoUrl] = useState(sched.foto_url||'');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dc = DAY_CFG[sched.day_of_week];

  const notify = (type:'success'|'error', msg:string) => { setToast({type,msg}); setTimeout(()=>setToast(null),3000); };
  const toggleK = (k:string) => setKebutuhan(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k]);

  const handleUpload = async (file:File) => {
    setUploading(true);
    try {
      const ext=file.name.split('.').pop();
      const path=`piket/${sched.id}_${Date.now()}.${ext}`;
      const {error:upErr}=await supabase.storage.from('piket-photos').upload(path,file,{upsert:true});
      if (upErr) throw upErr;
      const {data:urlData}=supabase.storage.from('piket-photos').getPublicUrl(path);
      setFotoUrl(urlData.publicUrl);
      notify('success','Foto berhasil diupload!');
    } catch(e:any) { notify('error','Upload gagal: '+e.message); }
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const {error}=await supabase.from('piket_schedules')
      .update({tamu_instansi:tamu||null,kebutuhan,foto_url:fotoUrl||null,updated_at:new Date().toISOString()})
      .eq('id',sched.id);
    setSaving(false);
    if (error) { notify('error','Gagal: '+error.message); return; }
    notify('success','Tersimpan!');
    setTimeout(()=>{ onSaved(); onClose(); },700);
  };

  const names = [sched.pic_ivp_name,sched.pic_ump_name,sched.pic_mlds_name].filter(Boolean).join(' / ');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 overflow-y-auto"
      onClick={e=>{ if(e.target===e.currentTarget) onClose(); }}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg my-4"
        style={{animation:'scale-in 0.25s ease-out',border:`1.5px solid ${dc.accent}40`}}>

        {/* Header — pakai warna hari */}
        <div className="px-6 py-5 rounded-t-2xl" style={{background:dc.grad}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">✍️ Detail Piket — {sched.day_of_week}</h2>
              <p className="text-white/70 text-xs mt-0.5">{names || 'Belum ada PIC'}</p>
            </div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        {toast && (
          <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>
            {toast.type==='success'?'✅':'❌'} {toast.msg}
          </div>
        )}

        <div className="p-6 space-y-5">
          {/* Tamu */}
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{color:'#94a3b8'}}>
              🏢 Tamu Instansi <span className="text-slate-400 normal-case font-normal">(opsional)</span>
            </label>
            <input value={tamu} onChange={e=>setTamu(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}}
              placeholder="Nama instansi / perusahaan tamu..."/>
          </div>

          {/* Kebutuhan */}
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{color:'#94a3b8'}}>
              🎯 Kebutuhan <span className="text-slate-400 normal-case font-normal">(opsional, bisa lebih dari satu)</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {KEBUTUHAN_LIST.map(k => {
                const checked=kebutuhan.includes(k);
                return (
                  <button key={k} type="button" onClick={()=>toggleK(k)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                    style={checked
                      ?{borderColor:dc.accent,background:`${dc.accent}12`,color:dc.accent}
                      :{borderColor:'rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.5)',color:'#64748b'}}>
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all`}
                      style={checked?{borderColor:dc.accent,background:dc.accent}:{borderColor:'#d1d5db',background:'white'}}>
                      {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className="text-xs font-semibold leading-tight">{k}</span>
                  </button>
                );
              })}
            </div>
            {kebutuhan.length>0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {kebutuhan.map(k=>(
                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white"
                    style={{background:dc.grad}}>
                    {k}
                    <button onClick={()=>toggleK(k)} className="ml-0.5 opacity-80 hover:opacity-100">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Foto */}
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{color:'#94a3b8'}}>
              📷 Foto <span className="text-slate-400 normal-case font-normal">(opsional)</span>
            </label>
            {fotoUrl ? (
              <div className="relative inline-block">
                <img src={fotoUrl} alt="Foto piket" className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-sm"/>
                <button onClick={()=>setFotoUrl('')}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow">✕</button>
              </div>
            ) : (
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed text-slate-500 transition-all w-full text-sm font-semibold disabled:opacity-50"
                style={{borderColor:'rgba(0,0,0,0.15)'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=dc.accent;(e.currentTarget as HTMLButtonElement).style.color=dc.accent;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(0,0,0,0.15)';(e.currentTarget as HTMLButtonElement).style.color='#64748b';}}>
                {uploading
                  ?<><div className="w-4 h-4 border-2 border-t-slate-500 border-slate-200 rounded-full animate-spin"/>Mengupload...</>
                  :<><span className="text-2xl">📁</span>Klik untuk upload foto</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e=>{ const f=e.target.files?.[0]; if(f) handleUpload(f); }}/>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
            style={{background:'rgba(255,255,255,0.95)',color:'#64748b',border:'1px solid rgba(0,0,0,0.12)'}}>
            Batal
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-60"
            style={{background:dc.grad,boxShadow:`0 4px 14px ${dc.accent}35`}}>
            {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
            💾 Simpan Detail
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-in { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}

// ─── Person Setting Modal ─────────────────────────────────────────────────────

function PersonModal({ onClose }: { onClose:()=>void }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newTeam, setNewTeam] = useState<Person['team']>('PTS IVP');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3000);};

  useEffect(()=>{ fetch(); },[]);
  const fetch2 = async()=>{ setLoading(true); const{data}=await supabase.from('piket_persons').select('*').order('team').order('name'); if(data) setPersons(data as Person[]); setLoading(false); };
  const fetch = fetch2;

  const handleAdd=async()=>{
    if(!newName.trim()){notify('error','Nama wajib diisi!');return;}
    setSaving(true);
    const{error}=await supabase.from('piket_persons').insert([{name:newName.trim(),team:newTeam,is_active:true}]);
    if(error) notify('error','Gagal: '+error.message); else{notify('success','Berhasil!');setNewName('');await fetch();}
    setSaving(false);
  };
  const handleToggle=async(p:Person)=>{await supabase.from('piket_persons').update({is_active:!p.is_active}).eq('id',p.id);await fetch();};
  const handleDelete=async(id:string)=>{if(!confirm('Hapus?'))return;await supabase.from('piket_persons').delete().eq('id',id);notify('success','Dihapus.');await fetch();};

  const grouped={'PTS IVP':persons.filter(p=>p.team==='PTS IVP'),'PTS UMP':persons.filter(p=>p.team==='PTS UMP'),'PTS MLDS':persons.filter(p=>p.team==='PTS MLDS')};

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col"
        style={{animation:'scale-in 0.25s ease-out',border:'1.5px solid rgba(220,38,38,0.25)'}}>
        <div className="px-6 py-5 rounded-t-2xl flex items-center justify-between flex-shrink-0"
          style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
          <div>
            <h2 className="text-lg font-bold text-white">👥 Kelola Anggota Piket</h2>
            <p className="text-red-200/80 text-xs mt-0.5">Daftar nama per tim piket showroom</p>
          </div>
          <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        {toast && <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div>}
        {/* Add form */}
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0" style={{background:'rgba(255,255,255,0.6)'}}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">➕ Tambah Anggota</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{color:'#94a3b8'}}>Nama</label>
              <input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAdd()}
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}} placeholder="Nama lengkap..."/>
            </div>
            <div className="w-36">
              <label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{color:'#94a3b8'}}>Tim</label>
              <select value={newTeam} onChange={e=>setNewTeam(e.target.value as Person['team'])}
                className="w-full rounded-xl px-3 py-2.5 text-sm outline-none bg-white" style={{border:'1px solid rgba(0,0,0,0.12)'}}>
                <option value="PTS IVP">PTS IVP</option>
                <option value="PTS UMP">PTS UMP</option>
                <option value="PTS MLDS">PTS MLDS</option>
              </select>
            </div>
            <button onClick={handleAdd} disabled={saving}
              className="px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.35)'}}>
              {saving?'...':'➕ Tambah'}
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/></div> : (
            Object.entries(grouped).map(([team,members])=>{
              const tc=TEAM_CFG[team];
              return (
                <div key={team} className="rounded-xl overflow-hidden" style={{border:`1px solid ${tc.dot}30`}}>
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{background:`${tc.dot}12`,borderBottom:`1px solid ${tc.dot}20`}}>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:tc.dot}}/><span className="font-bold text-sm" style={{color:tc.text}}>{team}</span></div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:`${tc.dot}15`,color:tc.text}}>{members.length} orang</span>
                  </div>
                  <div className="divide-y divide-gray-50 bg-white">
                    {members.length===0 ? <div className="px-4 py-3 text-xs text-slate-400 italic text-center">Belum ada anggota</div> :
                      members.map(p=>(
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{background:tc.dot}}>{p.name.charAt(0).toUpperCase()}</div>
                          <span className={`flex-1 text-sm font-semibold ${p.is_active?'text-slate-800':'text-slate-400 line-through'}`}>{p.name}</span>
                          <button onClick={()=>handleToggle(p)} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${p.is_active?'bg-amber-50 text-amber-700 border-amber-200':'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{p.is_active?'Nonaktifkan':'Aktifkan'}</button>
                          <button onClick={()=>handleDelete(p.id)} className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 transition-all">Hapus</button>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      <style jsx>{`@keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── Schedule Setting Modal ───────────────────────────────────────────────────

function ScheduleModal({ weekStart, onClose, onSaved }: { weekStart:Date; onClose:()=>void; onSaved:()=>void }) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [assign, setAssign] = useState<Record<Day,{ivp:string;ump:string;mlds:string}>>( ()=>{ const r:any={}; DAYS.forEach(d=>{r[d]={ivp:'',ump:'',mlds:''}}); return r; });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{type:'success'|'error';msg:string}|null>(null);
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3000);};
  const wk=fmtKey(weekStart);

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      const[pRes,sRes]=await Promise.all([
        supabase.from('piket_persons').select('*').eq('is_active',true).order('name'),
        supabase.from('piket_schedules').select('*').eq('week_start',wk),
      ]);
      if(pRes.data) setPersons(pRes.data as Person[]);
      if(sRes.data&&sRes.data.length>0){
        const na:any={}; DAYS.forEach(d=>{na[d]={ivp:'',ump:'',mlds:''};});
        (sRes.data as Schedule[]).forEach(s=>{na[s.day_of_week]={ivp:s.pic_ivp_id||'',ump:s.pic_ump_id||'',mlds:s.pic_mlds_id||''};});
        setAssign(na);
      }
      setLoading(false);
    };
    load();
  },[wk]);

  const handleSave=async()=>{
    setSaving(true);
    try{
      for(const day of DAYS){
        const a=assign[day];
        const ivpP=persons.find(p=>p.id===a.ivp),umpP=persons.find(p=>p.id===a.ump),mldsP=persons.find(p=>p.id===a.mlds);
        await supabase.from('piket_schedules').upsert({
          week_start:wk,day_of_week:day,day_date:fmtKey(dayDate(weekStart,day)),
          pic_ivp_id:a.ivp||null,pic_ivp_name:ivpP?.name||null,
          pic_ump_id:a.ump||null,pic_ump_name:umpP?.name||null,
          pic_mlds_id:a.mlds||null,pic_mlds_name:mldsP?.name||null,
          updated_at:new Date().toISOString(),
        },{onConflict:'week_start,day_of_week',ignoreDuplicates:false});
      }
      notify('success','Jadwal berhasil disimpan!');
      setTimeout(()=>{onSaved();onClose();},800);
    }catch(e:any){notify('error','Gagal: '+e.message);}
    setSaving(false);
  };

  const ivpP=persons.filter(p=>p.team==='PTS IVP'),umpP=persons.filter(p=>p.team==='PTS UMP'),mldsP=persons.filter(p=>p.team==='PTS MLDS');
  const wLabel=`${weekStart.toLocaleDateString('id-ID',{day:'2-digit',month:'long'})} – ${addDays(weekStart,4).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4"
        style={{animation:'scale-in 0.25s ease-out',border:'1.5px solid rgba(220,38,38,0.25)'}}>
        <div className="px-6 py-5 rounded-t-2xl" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">📋 Atur Jadwal Piket</h2>
              <p className="text-red-200/80 text-xs mt-0.5">Minggu: {wLabel}</p>
            </div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {toast && <div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div>}
        <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
          {loading ? <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/></div> : (
            DAYS.map(day=>{
              const dc=DAY_CFG[day]; const date=dayDate(weekStart,day);
              return (
                <div key={day} className="rounded-xl overflow-hidden" style={{border:`1px solid ${dc.accent}25`}}>
                  <div className="flex items-center gap-3 px-4 py-2.5" style={{background:dc.light,borderBottom:`1px solid ${dc.accent}20`}}>
                    <div className="w-9 h-9 rounded-lg flex flex-col items-center justify-center text-white flex-shrink-0" style={{background:dc.grad}}>
                      <span className="text-[11px] font-black leading-none">{date.getDate().toString().padStart(2,'0')}</span>
                      <span className="text-[9px] font-bold leading-none opacity-80">{DAY_EN[day]}</span>
                    </div>
                    <span className="font-bold text-sm" style={{color:dc.accent}}>{day}</span>
                    {isToday(date)&&<span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white" style={{background:dc.accent}}>HARI INI</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-3 p-4 bg-white">
                    {([['ivp','PTS IVP',ivpP],['ump','PTS UMP',umpP],['mlds','PTS MLDS',mldsP]] as [string,string,Person[]][]).map(([key,label,opts])=>{
                      const tc=TEAM_CFG[label];
                      return (
                        <div key={key}>
                          <div className="flex items-center gap-1.5 mb-1.5"><div className="w-2 h-2 rounded-full" style={{background:tc.dot}}/><label className="text-[10px] font-bold uppercase tracking-widest" style={{color:tc.text}}>{label}</label></div>
                          <select value={(assign[day] as any)[key]} onChange={e=>setAssign(p=>({...p,[day]:{...p[day],[key]:e.target.value}}))}
                            className="w-full rounded-xl px-3 py-2 text-xs outline-none bg-white" style={{border:`1px solid ${tc.dot}30`}}>
                            <option value="">— Belum ditentukan —</option>
                            {opts.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all" style={{background:'rgba(255,255,255,0.95)',color:'#64748b',border:'1px solid rgba(0,0,0,0.12)'}}>Batal</button>
          <button onClick={handleSave} disabled={saving||loading}
            className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-60"
            style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.35)'}}>
            {saving&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
            💾 Simpan Jadwal
          </button>
        </div>
      </div>
      <style jsx>{`@keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PiketShowroomPage() {
  const [weekStart, setWeekStart] = useState<Date>(()=>getMonday(new Date()));
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPerson, setShowPerson] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [fillDetail, setFillDetail] = useState<Schedule|null>(null);
  const [photoZoom, setPhotoZoom] = useState<string|null>(null);
  const [search, setSearch] = useState('');
  const [filterDay, setFilterDay] = useState<Day|''>('');
  const [filterTamu, setFilterTamu] = useState(false);
  const [filterK, setFilterK] = useState(false);
  const wk = fmtKey(weekStart);

  const fetchData = useCallback(async()=>{
    setLoading(true);
    const{data}=await supabase.from('piket_schedules').select('*').eq('week_start',wk);
    if(data) setSchedules(data as Schedule[]);
    setLoading(false);
  },[wk]);

  useEffect(()=>{fetchData();},[fetchData]);

  useEffect(()=>{
    const ch=supabase.channel('piket-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'piket_schedules'},()=>{setTimeout(fetchData,300);})
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[fetchData]);

  const isCurrWeek = wk===fmtKey(getMonday(new Date()));
  const wLabel=`${weekStart.toLocaleDateString('id-ID',{day:'2-digit',month:'long'})} – ${addDays(weekStart,4).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}`;

  const filteredDays=DAYS.filter(day=>{
    if(filterDay&&day!==filterDay) return false;
    const s=schedules.find(x=>x.day_of_week===day);
    if(filterTamu&&!s?.tamu_instansi) return false;
    if(filterK&&(!s?.kebutuhan||s.kebutuhan.length===0)) return false;
    if(search){
      const q=search.toLowerCase();
      return !!(s?.pic_ivp_name?.toLowerCase().includes(q)||s?.pic_ump_name?.toLowerCase().includes(q)||s?.pic_mlds_name?.toLowerCase().includes(q)||s?.tamu_instansi?.toLowerCase().includes(q)||s?.kebutuhan?.some(k=>k.toLowerCase().includes(q))||day.toLowerCase().includes(q));
    }
    return true;
  });

  // Pie data
  const tamuCount=schedules.filter(s=>s.tamu_instansi).length;
  const noTamuCount=schedules.length-tamuCount;
  const tamuPieData=[
    {label:'Ada Tamu',value:tamuCount,color:'#10b981'},
    {label:'Tanpa Tamu',value:noTamuCount,color:'#e2e8f0'},
  ].filter(d=>d.value>0);

  const kMap:Record<string,number>={};
  schedules.forEach(s=>(s.kebutuhan||[]).forEach(k=>{kMap[k]=(kMap[k]||0)+1;}));
  const kPieData=Object.entries(kMap).sort(([,a],[,b])=>b-a).slice(0,8).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      backgroundImage:`url('/IVP_Background.png')`,
      backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{background:'rgba(255,255,255,0.08)'}}/>
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── HEADER — same as Reminder Schedule ── */}
        <header className="sticky top-0 z-50" style={{background:'rgba(255,255,255,0.9)',borderBottom:'3px solid #dc2626',backdropFilter:'blur(16px)'}}>
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{background:'linear-gradient(135deg,#dc2626,#991b1b)',boxShadow:'0 3px 12px rgba(220,38,38,0.4)'}}>
                <span className="text-lg">🏪</span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
                  Piket Showroom
                </h1>
                <p className="text-[10px] font-medium text-slate-500">IndoVisual Presentama</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={()=>setShowPerson(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{background:'rgba(99,102,241,0.08)',border:'1px solid rgba(99,102,241,0.25)',color:'#4338ca'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(99,102,241,0.15)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(99,102,241,0.08)';}}>
                👥 Kelola Anggota
              </button>
              <button onClick={()=>setShowSchedule(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.4)'}}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                Atur Jadwal
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">

          {/* ── Week Nav ── */}
          <div className="rounded-2xl px-5 py-3 flex items-center justify-between gap-4 flex-wrap"
            style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
            <div className="flex items-center gap-3">
              <button onClick={()=>setWeekStart(d=>addDays(d,-7))}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-all hover:bg-red-50 text-slate-500 hover:text-red-600">‹</button>
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Jadwal Piket</p>
                <p className="text-sm font-bold text-slate-800">{wLabel}</p>
              </div>
              <button onClick={()=>setWeekStart(d=>addDays(d,7))}
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg transition-all hover:bg-red-50 text-slate-500 hover:text-red-600">›</button>
              {!isCurrWeek&&(
                <button onClick={()=>setWeekStart(getMonday(new Date()))}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                  style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.25)',color:'#dc2626'}}>
                  Minggu Ini
                </button>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="font-bold text-emerald-600">{tamuCount} tamu</span>
              <span className="text-slate-300">·</span>
              <span className="font-bold text-violet-600">{Object.values(kMap).reduce((a,b)=>a+b,0)} kebutuhan</span>
            </div>
          </div>

          {/* ── Pie Charts — identical to Reminder Schedule style ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PieChart data={tamuPieData} title="Statistik Tamu Minggu Ini" icon="🏢"/>
            <PieChart data={kPieData} title="Top Kebutuhan Minggu Ini" icon="🎯"/>
          </div>

          {/* ── Search & Filter ── */}
          <div className="rounded-2xl overflow-hidden"
            style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(200,200,200,0.6)',backdropFilter:'blur(12px)'}}>
            <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
              <div className="relative flex-1 min-w-[200px]">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, instansi, kebutuhan..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none"
                  style={{background:'rgba(248,250,252,0.9)',border:'1px solid rgba(0,0,0,0.1)'}}/>
              </div>
              <select value={filterDay} onChange={e=>setFilterDay(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs font-semibold outline-none bg-white"
                style={{border:'1px solid rgba(0,0,0,0.1)'}}>
                <option value="">Semua Hari</option>
                {DAYS.map(d=><option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={()=>setFilterTamu(f=>!f)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={filterTamu?{background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.4)',color:'#059669'}:{background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',color:'#64748b'}}>
                🏢 Ada Tamu
              </button>
              <button onClick={()=>setFilterK(f=>!f)}
                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                style={filterK?{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.35)',color:'#7c3aed'}:{background:'rgba(0,0,0,0.04)',border:'1px solid rgba(0,0,0,0.1)',color:'#64748b'}}>
                🎯 Ada Kebutuhan
              </button>
              {(search||filterDay||filterTamu||filterK)&&(
                <button onClick={()=>{setSearch('');setFilterDay('');setFilterTamu(false);setFilterK(false);}}
                  className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',color:'#dc2626'}}>
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
                style={{background:'rgba(255,255,255,0.92)',boxShadow:'0 8px 32px rgba(0,0,0,0.18)'}}>
                <div className="w-10 h-10 rounded-full border-4 border-t-red-600 border-red-200 animate-spin"/>
                <p className="text-slate-700 font-semibold text-sm">Memuat jadwal piket...</p>
              </div>
            </div>
          ) : filteredDays.length===0 ? (
            <div className="rounded-2xl p-12 text-center"
              style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
              <div className="text-5xl mb-4">🔍</div>
              <p className="font-semibold text-slate-600">Tidak ada jadwal yang cocok</p>
              <p className="text-sm text-slate-400 mt-1">Coba ubah filter atau kata kunci pencarian</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {filteredDays.map((day,idx)=>{
                const date=dayDate(weekStart,day);
                const sched=schedules.find(s=>s.day_of_week===day)??null;
                const dc=DAY_CFG[day];
                const today=isToday(date);
                return (
                  <div key={day}
                    className="rounded-2xl overflow-hidden transition-all cursor-pointer hover:shadow-xl hover:-translate-y-0.5 group"
                    style={{
                      background:'rgba(255,255,255,0.95)',
                      border:`2px solid ${today?dc.accent:'rgba(255,255,255,0.8)'}`,
                      backdropFilter:'blur(10px)',
                      boxShadow:today?`0 0 20px ${dc.accent}35,0 4px 24px rgba(0,0,0,0.1)`:'0 2px 16px rgba(0,0,0,0.08)',
                      animation:`fadeInUp 0.4s ease forwards`,
                      animationDelay:`${idx*60}ms`,
                      opacity:0,
                    }}
                    onClick={()=>sched&&setFillDetail(sched)}>

                    {/* Binder holes */}
                    <div className="flex justify-center gap-3 py-1.5" style={{background:dc.accent}}>
                      {[0,1,2].map(i=><div key={i} className="w-1 h-3 rounded-full bg-white/50"/>)}
                    </div>

                    {/* Date header */}
                    <div className="flex items-center gap-3 px-4 py-3" style={{background:dc.grad}}>
                      <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-white/20 flex-shrink-0">
                        <span className="text-xl font-black text-white leading-none">{date.getDate().toString().padStart(2,'0')}</span>
                        <span className="text-[9px] font-bold text-white/80 tracking-wider">{DAY_EN[day]}</span>
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-black text-sm tracking-tight">{day.toUpperCase()}</p>
                        <p className="text-white/70 text-[10px]">{date.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
                        {today&&<span className="inline-block mt-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full text-white tracking-widest" style={{background:'rgba(255,255,255,0.25)'}}>HARI INI</span>}
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg className="w-4 h-4 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </div>
                    </div>

                    {/* PIC names */}
                    <div className="px-3 py-2.5 space-y-1.5" style={{background:dc.light}}>
                      {(['pic_ivp_name','pic_ump_name','pic_mlds_name'] as const).map((field,fi)=>{
                        const teams=['PTS IVP','PTS UMP','PTS MLDS'] as const;
                        const name=sched?sched[field]:null;
                        const tc=TEAM_CFG[teams[fi]];
                        return name ? (
                          <div key={fi} className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0" style={{background:tc.dot}}>{name.charAt(0).toUpperCase()}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate leading-tight">{name}</p>
                              <span className="text-[8px] font-bold uppercase tracking-widest" style={{color:tc.text}}>{teams[fi]}</span>
                            </div>
                          </div>
                        ) : (
                          <div key={fi} className="flex items-center gap-2 opacity-30">
                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">—</div>
                            <div><p className="text-[10px] text-slate-400 italic">Belum ditentukan</p><span className="text-[8px] font-bold uppercase text-slate-300">{teams[fi]}</span></div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Divider */}
                    <div className="h-px mx-3" style={{background:`linear-gradient(90deg,transparent,${dc.accent}40,transparent)`}}/>

                    {/* Detail area */}
                    <div className="px-3 py-2.5 space-y-1.5" style={{background:'rgba(255,255,255,0.95)'}}>
                      {/* Tamu */}
                      <div className="flex items-start gap-1.5">
                        <span className="text-xs mt-0.5">🏢</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tamu Instansi</p>
                          <p className="text-[11px] font-semibold text-slate-700 mt-0.5 leading-tight">
                            {sched?.tamu_instansi||<span className="text-slate-300 italic font-normal">—</span>}
                          </p>
                        </div>
                      </div>
                      {/* Kebutuhan */}
                      {sched?.kebutuhan&&sched.kebutuhan.length>0 ? (
                        <div className="flex items-start gap-1.5">
                          <span className="text-xs mt-0.5">🎯</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kebutuhan</p>
                            <div className="flex flex-wrap gap-1">
                              {sched.kebutuhan.slice(0,3).map(k=>(
                                <span key={k} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{background:dc.accent}}>{k}</span>
                              ))}
                              {sched.kebutuhan.length>3&&<span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-slate-500" style={{background:'rgba(0,0,0,0.06)'}}>+{sched.kebutuhan.length-3}</span>}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-1.5 opacity-30">
                          <span className="text-xs mt-0.5">🎯</span>
                          <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Kebutuhan</p><p className="text-[10px] text-slate-300 italic">—</p></div>
                        </div>
                      )}
                      {/* Foto */}
                      {sched?.foto_url&&(
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs">📷</span>
                          <button onClick={e=>{e.stopPropagation();setPhotoZoom(sched.foto_url!);}}
                            className="rounded-lg hover:opacity-80 transition-opacity overflow-hidden">
                            <img src={sched.foto_url} alt="Foto" className="w-12 h-12 object-cover rounded-lg border border-slate-200 shadow-sm"/>
                          </button>
                        </div>
                      )}
                      {/* Click hint */}
                      {sched&&!sched.tamu_instansi&&(!sched.kebutuhan||sched.kebutuhan.length===0)&&!sched.foto_url&&(
                        <p className="text-[9px] text-slate-400 italic text-center py-0.5">Klik untuk isi detail →</p>
                      )}
                      {!sched&&<p className="text-[9px] text-slate-300 italic text-center py-1">Belum ada jadwal</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Photo zoom */}
        {photoZoom&&(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={()=>setPhotoZoom(null)}>
            <div className="relative max-w-3xl max-h-[90vh]">
              <img src={photoZoom} alt="Foto piket" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"/>
              <button onClick={()=>setPhotoZoom(null)} className="absolute top-3 right-3 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-all">✕</button>
            </div>
          </div>
        )}

        {showPerson&&<PersonModal onClose={()=>setShowPerson(false)}/>}
        {showSchedule&&<ScheduleModal weekStart={weekStart} onClose={()=>setShowSchedule(false)} onSaved={fetchData}/>}
        {fillDetail&&<FillDetailModal sched={fillDetail} onClose={()=>setFillDetail(null)} onSaved={fetchData}/>}
      </div>

      <style jsx>{`
        @keyframes fadeInUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes scale-in { from{opacity:0;transform:scale(0.92)} to{opacity:1;transform:scale(1)} }
      `}</style>
    </div>
  );
}
