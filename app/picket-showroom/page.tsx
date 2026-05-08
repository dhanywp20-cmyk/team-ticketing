'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Senin','Selasa','Rabu','Kamis','Jumat'] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];

const DAY_EN: Record<DayOfWeek,string> = { Senin:'MON', Selasa:'TUE', Rabu:'WED', Kamis:'THU', Jumat:'FRI' };

const DAY_COLOR: Record<DayOfWeek,{accent:string;light:string;grad:string}> = {
  Senin:  {accent:'#dc2626', light:'rgba(220,38,38,0.08)',  grad:'linear-gradient(135deg,#dc2626,#991b1b)'},
  Selasa: {accent:'#d97706', light:'rgba(217,119,6,0.08)',  grad:'linear-gradient(135deg,#d97706,#92400e)'},
  Rabu:   {accent:'#2563eb', light:'rgba(37,99,235,0.08)',  grad:'linear-gradient(135deg,#2563eb,#1e3a8a)'},
  Kamis:  {accent:'#7c3aed', light:'rgba(124,58,237,0.08)', grad:'linear-gradient(135deg,#7c3aed,#4c1d95)'},
  Jumat:  {accent:'#059669', light:'rgba(5,150,105,0.08)',  grad:'linear-gradient(135deg,#059669,#064e3b)'},
};

const TEAM_COLOR: Record<string,{dot:string;text:string;bg:string;badge:string}> = {
  'PTS IVP':  {dot:'#dc2626',text:'#991b1b',bg:'rgba(220,38,38,0.1)',  badge:'bg-red-100 text-red-700 border-red-200'},
  'PTS UMP':  {dot:'#2563eb',text:'#1e40af',bg:'rgba(37,99,235,0.1)',  badge:'bg-blue-100 text-blue-700 border-blue-200'},
  'PTS MLDS': {dot:'#7c3aed',text:'#6d28d9',bg:'rgba(124,58,237,0.1)', badge:'bg-violet-100 text-violet-700 border-violet-200'},
};

const KEBUTUHAN_LIST = [
  'Meeting Room','Auditorium','Command Center','Digital Signage Kiosk',
  'Digital Signage Custom','Paging System','Background Music','Signage LED Outdoor',
  'Smartclass Room','Ballroom','Camera ETLE','Conference Room',
  'Paperless System','Delegate System','Camera Tracking',
];

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Person { id:string; name:string; team:'PTS IVP'|'PTS UMP'|'PTS MLDS'; is_active:boolean; }

interface PiketRow {
  id:string; week_start:string; day_of_week:DayOfWeek; day_date:string;
  pic_ivp_id:string|null; pic_ivp_name:string|null;
  pic_ump_id:string|null; pic_ump_name:string|null;
  pic_mlds_id:string|null; pic_mlds_name:string|null;
  tamu_instansi:string|null; kebutuhan:string[]; foto_url:string|null;
  created_at:string; updated_at:string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d:Date):Date {
  const r=new Date(d), day=r.getDay();
  r.setDate(r.getDate()-day+(day===0?-6:1)); r.setHours(0,0,0,0); return r;
}
function addDays(d:Date,n:number):Date { const r=new Date(d); r.setDate(r.getDate()+n); return r; }
function toKey(d:Date):string { return d.toISOString().split('T')[0]; }
function getDayDate(ws:Date,day:DayOfWeek):Date { return addDays(ws,DAYS_OF_WEEK.indexOf(day)); }
function isToday(d:Date):boolean {
  const t=new Date();
  return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();
}
function fmtDate(ds:string):string {
  return new Date(ds+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});
}

// ─── Donut Pie — identical to Reminder Schedule ───────────────────────────────

function MiniPieChart({data,title,icon}:{data:{label:string;value:number;color:string}[];title:string;icon:string;}) {
  const [hov,setHov]=useState<number|null>(null);
  const total=data.reduce((s,d)=>s+d.value,0);
  if (total===0) return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{icon} {title}</p>
      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
    </div>
  );
  let cum=-Math.PI/2;
  const cx=60,cy=60,r=50,ir=28;
  const slices=data.map((d,i)=>{
    const angle=(d.value/total)*2*Math.PI;
    if (data.length===1){cum+=angle;return{...d,path:'',full:true,i};}
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum);
    const x2=cx+r*Math.cos(cum+angle),y2=cy+r*Math.sin(cum+angle);
    const xi1=cx+ir*Math.cos(cum),yi1=cy+ir*Math.sin(cum);
    const xi2=cx+ir*Math.cos(cum+angle),yi2=cy+ir*Math.sin(cum+angle);
    const lg=angle>Math.PI?1:0;
    const path=`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${lg} 0 ${xi1} ${yi1} Z`;
    cum+=angle;
    return{...d,path,full:false,i};
  });
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map(s=>s.full?(
            <g key={s.i} onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
              <circle cx={60} cy={60} r={50} fill={s.color} opacity={hov===null||hov===s.i?1:0.45} style={{filter:hov===s.i?`drop-shadow(0 0 5px ${s.color})`:'none'}}/>
              <circle cx={60} cy={60} r={28} fill="white"/>
            </g>
          ):(
            <path key={s.i} d={s.path} fill={s.color} opacity={hov===null||hov===s.i?1:0.45}
              style={{cursor:'default',transition:'opacity 0.15s',filter:hov===s.i?`drop-shadow(0 0 5px ${s.color})`:'none'}}
              onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}/>
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1 flex-1 min-w-0 max-h-[120px] overflow-y-auto">
          {slices.map(s=>(
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

// ─── Mini Calendar — identical to Reminder Schedule ──────────────────────────

function MiniCalendar({rows,calMonth,setCalMonth,selDay,setSelDay}:{
  rows:PiketRow[]; calMonth:Date; setCalMonth:(d:Date)=>void; selDay:string|null; setSelDay:(s:string|null)=>void;
}) {
  const y=calMonth.getFullYear(), m=calMonth.getMonth();
  const firstDay=new Date(y,m,1).getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  const today=toKey(new Date());
  const monthNames=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

  const getCount=(day:number)=>{
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return rows.filter(r=>r.day_date===ds).length;
  };
  const totalMonth=rows.filter(r=>r.day_date?.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length;

  return (
    <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.08)',backdropFilter:'blur(12px)',width:320}}>
      <div className="px-4 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
        <button onClick={()=>setCalMonth(new Date(y,m-1,1))} className="text-white/80 hover:text-white font-bold text-lg px-2 py-0.5 rounded-lg hover:bg-white/10 transition-all">‹</button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">{monthNames[m]} {y}</p>
          <p className="text-white/70 text-[10px] mt-0.5">{totalMonth} jadwal bulan ini</p>
        </div>
        <button onClick={()=>setCalMonth(new Date(y,m+1,1))} className="text-white/80 hover:text-white font-bold text-lg px-2 py-0.5 rounded-lg hover:bg-white/10 transition-all">›</button>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 mb-1.5">
          {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d,i)=>(
            <div key={i} className="text-center text-[10px] font-bold py-1" style={{color:'#94a3b8'}}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length:(firstDay===0?6:firstDay-1)}).map((_,i)=><div key={`e-${i}`}/>)}
          {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
            const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const cnt=getCount(day);
            const isSel=selDay===ds;
            const isT=ds===today;
            return (
              <button key={day} onClick={()=>setSelDay(isSel?null:ds)}
                className="relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  background:isSel?'#dc2626':isT?'rgba(220,38,38,0.12)':'transparent',
                  color:isSel?'white':isT?'#dc2626':'#374151',
                  fontWeight:isT||isSel?800:600,
                }}>
                {day}
                {cnt>0&&<span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{background:isSel?'white':'#dc2626'}}/>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Fill Detail Modal ────────────────────────────────────────────────────────

function FillDetailModal({row,onClose,onSaved}:{row:PiketRow;onClose:()=>void;onSaved:()=>void}) {
  const [tamu,setTamu]=useState(row.tamu_instansi||'');
  const [kebutuhan,setKebutuhan]=useState<string[]>(row.kebutuhan||[]);
  const [fotoUrl,setFotoUrl]=useState(row.foto_url||'');
  const [uploading,setUploading]=useState(false);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<{type:'success'|'error';msg:string}|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const dc=DAY_COLOR[row.day_of_week];

  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3000);};
  const toggleK=(k:string)=>setKebutuhan(p=>p.includes(k)?p.filter(x=>x!==k):[...p,k]);

  const handleUpload=async(file:File)=>{
    setUploading(true);
    try{
      const ext=file.name.split('.').pop();
      const path=`piket/${row.id}_${Date.now()}.${ext}`;
      const{error:upErr}=await supabase.storage.from('piket-photos').upload(path,file,{upsert:true});
      if(upErr) throw upErr;
      const{data:urlData}=supabase.storage.from('piket-photos').getPublicUrl(path);
      setFotoUrl(urlData.publicUrl);
      notify('success','Foto berhasil diupload!');
    }catch(e:any){notify('error','Upload gagal: '+e.message);}
    setUploading(false);
  };

  const handleSave=async()=>{
    setSaving(true);
    const{error}=await supabase.from('piket_schedules')
      .update({tamu_instansi:tamu||null,kebutuhan,foto_url:fotoUrl||null,updated_at:new Date().toISOString()})
      .eq('id',row.id);
    setSaving(false);
    if(error){notify('error','Gagal: '+error.message);return;}
    notify('success','Data tersimpan!');
    setTimeout(()=>{onSaved();onClose();},700);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 overflow-y-auto"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-lg my-4"
        style={{animation:'scale-in 0.25s ease-out',border:`1.5px solid ${dc.accent}40`}}>
        <div className="px-6 py-5 rounded-t-2xl" style={{background:dc.grad}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">✍️ Detail Piket — {row.day_of_week}</h2>
              <p className="text-white/70 text-xs mt-0.5">{fmtDate(row.day_date)} · {[row.pic_ivp_name,row.pic_ump_name,row.pic_mlds_name].filter(Boolean).join(' / ')||'Belum ada PIC'}</p>
            </div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {toast&&<div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div>}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Tamu */}
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{color:'#94a3b8'}}>🏢 Tamu Instansi <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
            <input value={tamu} onChange={e=>setTamu(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}}
              placeholder="Nama instansi / perusahaan tamu..."/>
          </div>
          {/* Kebutuhan */}
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{color:'#94a3b8'}}>🎯 Kebutuhan <span className="font-normal normal-case text-slate-400">(bisa lebih dari satu)</span></label>
            <div className="grid grid-cols-2 gap-2">
              {KEBUTUHAN_LIST.map(k=>{
                const checked=kebutuhan.includes(k);
                return (
                  <button key={k} type="button" onClick={()=>toggleK(k)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 text-left transition-all"
                    style={checked?{borderColor:dc.accent,background:`${dc.accent}12`,color:dc.accent}:{borderColor:'rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.5)',color:'#64748b'}}>
                    <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                      style={checked?{borderColor:dc.accent,background:dc.accent}:{borderColor:'#d1d5db',background:'white'}}>
                      {checked&&<svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <span className="text-xs font-semibold leading-tight">{k}</span>
                  </button>
                );
              })}
            </div>
            {kebutuhan.length>0&&(
              <div className="mt-3 flex flex-wrap gap-1.5">
                {kebutuhan.map(k=>(
                  <span key={k} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-white" style={{background:dc.grad}}>
                    {k}<button onClick={()=>toggleK(k)} className="ml-0.5 opacity-80 hover:opacity-100">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>
          {/* Foto */}
          <div>
            <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{color:'#94a3b8'}}>📷 Foto <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
            {fotoUrl?(
              <div className="relative inline-block">
                <img src={fotoUrl} alt="Foto" className="w-32 h-32 rounded-xl object-cover border border-slate-200 shadow-sm"/>
                <button onClick={()=>setFotoUrl('')} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold hover:bg-red-600 shadow">✕</button>
              </div>
            ):(
              <button onClick={()=>fileRef.current?.click()} disabled={uploading}
                className="flex items-center gap-3 px-5 py-4 rounded-xl border-2 border-dashed text-slate-500 transition-all w-full text-sm font-semibold disabled:opacity-50"
                style={{borderColor:'rgba(0,0,0,0.15)'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=dc.accent;(e.currentTarget as HTMLButtonElement).style.color=dc.accent;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(0,0,0,0.15)';(e.currentTarget as HTMLButtonElement).style.color='#64748b';}}>
                {uploading?<><div className="w-4 h-4 border-2 border-t-slate-500 border-slate-200 rounded-full animate-spin"/>Mengupload...</>:<><span className="text-xl">📁</span>Klik untuk upload foto</>}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e=>{const f=e.target.files?.[0];if(f)handleUpload(f);}}/>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all" style={{background:'rgba(255,255,255,0.95)',color:'#64748b',border:'1px solid rgba(0,0,0,0.12)'}}>Batal</button>
          <button onClick={handleSave} disabled={saving}
            className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-60"
            style={{background:dc.grad,boxShadow:`0 4px 14px ${dc.accent}35`}}>
            {saving&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
            💾 Simpan Detail
          </button>
        </div>
      </div>
      <style jsx>{`@keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── Person Modal ─────────────────────────────────────────────────────────────

function PersonModal({onClose}:{onClose:()=>void}) {
  const [persons,setPersons]=useState<Person[]>([]);
  const [loading,setLoading]=useState(true);
  const [newName,setNewName]=useState('');
  const [newTeam,setNewTeam]=useState<Person['team']>('PTS IVP');
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<{type:'success'|'error';msg:string}|null>(null);
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3000);};

  const loadPersons=async()=>{setLoading(true);const{data}=await supabase.from('piket_persons').select('*').order('team').order('name');if(data)setPersons(data as Person[]);setLoading(false);};
  useEffect(()=>{loadPersons();},[]);

  const handleAdd=async()=>{
    if(!newName.trim()){notify('error','Nama wajib diisi!');return;}
    setSaving(true);
    const{error}=await supabase.from('piket_persons').insert([{name:newName.trim(),team:newTeam,is_active:true}]);
    if(error)notify('error','Gagal: '+error.message);else{notify('success','Ditambahkan!');setNewName('');await loadPersons();}
    setSaving(false);
  };
  const handleToggle=async(p:Person)=>{await supabase.from('piket_persons').update({is_active:!p.is_active}).eq('id',p.id);await loadPersons();};
  const handleDelete=async(id:string)=>{if(!confirm('Hapus?'))return;await supabase.from('piket_persons').delete().eq('id',id);notify('success','Dihapus.');await loadPersons();};
  const grouped={'PTS IVP':persons.filter(p=>p.team==='PTS IVP'),'PTS UMP':persons.filter(p=>p.team==='PTS UMP'),'PTS MLDS':persons.filter(p=>p.team==='PTS MLDS')};

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-xl max-h-[88vh] flex flex-col" style={{animation:'scale-in 0.25s ease-out',border:'1.5px solid rgba(220,38,38,0.25)'}}>
        <div className="px-6 py-5 rounded-t-2xl flex-shrink-0" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
          <div className="flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-white">👥 Kelola Anggota Piket</h2><p className="text-red-200/80 text-xs mt-0.5">Daftar nama per tim piket showroom</p></div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        </div>
        {toast&&<div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 flex-shrink-0 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div>}
        <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0" style={{background:'rgba(248,250,252,0.8)'}}>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">➕ Tambah Anggota</p>
          <div className="flex gap-3 items-end">
            <div className="flex-1"><label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{color:'#94a3b8'}}>Nama</label><input value={newName} onChange={e=>setNewName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAdd()} className="w-full rounded-xl px-4 py-2.5 text-sm outline-none" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}} placeholder="Nama lengkap..."/></div>
            <div className="w-36"><label className="block text-xs font-bold mb-1 tracking-widest uppercase" style={{color:'#94a3b8'}}>Tim</label><select value={newTeam} onChange={e=>setNewTeam(e.target.value as Person['team'])} className="w-full rounded-xl px-3 py-2.5 text-sm outline-none bg-white" style={{border:'1px solid rgba(0,0,0,0.12)'}}><option>PTS IVP</option><option>PTS UMP</option><option>PTS MLDS</option></select></div>
            <button onClick={handleAdd} disabled={saving} className="px-4 py-2.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50" style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.35)'}}>{saving?'...':'➕ Tambah'}</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading?<div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/></div>:(
            Object.entries(grouped).map(([team,members])=>{
              const tc=TEAM_COLOR[team];
              return (
                <div key={team} className="rounded-xl overflow-hidden" style={{border:`1px solid ${tc.dot}30`}}>
                  <div className="px-4 py-2.5 flex items-center justify-between" style={{background:`${tc.dot}12`,borderBottom:`1px solid ${tc.dot}20`}}>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:tc.dot}}/><span className="font-bold text-sm" style={{color:tc.text}}>{team}</span></div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:`${tc.dot}15`,color:tc.text}}>{members.length} orang</span>
                  </div>
                  <div className="divide-y divide-gray-50 bg-white">
                    {members.length===0?<div className="px-4 py-3 text-xs text-slate-400 italic text-center">Belum ada anggota</div>:members.map(p=>(
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

function ScheduleModal({weekStart,onClose,onSaved}:{weekStart:Date;onClose:()=>void;onSaved:()=>void}) {
  const [persons,setPersons]=useState<Person[]>([]);
  const [assign,setAssign]=useState<Record<DayOfWeek,{ivp:string;ump:string;mlds:string}>>(()=>{const r:any={};DAYS_OF_WEEK.forEach(d=>{r[d]={ivp:'',ump:'',mlds:''};});return r;});
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<{type:'success'|'error';msg:string}|null>(null);
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3000);};
  const wk=toKey(weekStart);

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      const[pR,sR]=await Promise.all([
        supabase.from('piket_persons').select('*').eq('is_active',true).order('name'),
        supabase.from('piket_schedules').select('*').eq('week_start',wk),
      ]);
      if(pR.data)setPersons(pR.data as Person[]);
      if(sR.data&&sR.data.length>0){
        const na:any={};DAYS_OF_WEEK.forEach(d=>{na[d]={ivp:'',ump:'',mlds:''};});
        (sR.data as PiketRow[]).forEach(s=>{na[s.day_of_week]={ivp:s.pic_ivp_id||'',ump:s.pic_ump_id||'',mlds:s.pic_mlds_id||''};});
        setAssign(na);
      }
      setLoading(false);
    };
    load();
  },[wk]);

  const handleSave=async()=>{
    setSaving(true);
    try{
      for(const day of DAYS_OF_WEEK){
        const a=assign[day];
        const ivpP=persons.find(p=>p.id===a.ivp),umpP=persons.find(p=>p.id===a.ump),mldsP=persons.find(p=>p.id===a.mlds);
        await supabase.from('piket_schedules').upsert({
          week_start:wk,day_of_week:day,day_date:toKey(getDayDate(weekStart,day)),
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
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4" style={{animation:'scale-in 0.25s ease-out',border:'1.5px solid rgba(220,38,38,0.25)'}}>
        <div className="px-6 py-5 rounded-t-2xl" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
          <div className="flex items-center justify-between">
            <div><h2 className="text-lg font-bold text-white">📋 Atur Jadwal Piket</h2><p className="text-red-200/80 text-xs mt-0.5">Minggu: {wLabel}</p></div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        </div>
        {toast&&<div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div>}
        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {loading?<div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/></div>:(
            DAYS_OF_WEEK.map(day=>{
              const dc=DAY_COLOR[day],date=getDayDate(weekStart,day);
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
                      const tc=TEAM_COLOR[label];
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
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{background:'rgba(255,255,255,0.95)',color:'#64748b',border:'1px solid rgba(0,0,0,0.12)'}}>Batal</button>
          <button onClick={handleSave} disabled={saving||loading} className="flex-1 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-60 transition-all" style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.35)'}}>
            {saving&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}💾 Simpan Jadwal
          </button>
        </div>
      </div>
      <style jsx>{`@keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PiketShowroomPage() {
  const [weekStart,setWeekStart]=useState<Date>(()=>getMonday(new Date()));
  const [rows,setRows]=useState<PiketRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [showPerson,setShowPerson]=useState(false);
  const [showSchedule,setShowSchedule]=useState(false);
  const [fillDetail,setFillDetail]=useState<PiketRow|null>(null);
  const [photoZoom,setPhotoZoom]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [filterDay,setFilterDay]=useState<DayOfWeek|''>('');
  const [filterTamu,setFilterTamu]=useState(false);
  const [filterK,setFilterK]=useState(false);
  const [calMonth,setCalMonth]=useState<Date>(()=>new Date());
  const [selDay,setSelDay]=useState<string|null>(null);
  const wk=toKey(weekStart);

  // Load ALL rows for calendar (all time), filtered rows for display
  const [allRows,setAllRows]=useState<PiketRow[]>([]);

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const[wRes,aRes]=await Promise.all([
      supabase.from('piket_schedules').select('*').eq('week_start',wk),
      supabase.from('piket_schedules').select('id,day_date,week_start,day_of_week,tamu_instansi,kebutuhan'),
    ]);
    if(wRes.data)setRows(wRes.data as PiketRow[]);
    if(aRes.data)setAllRows(aRes.data as PiketRow[]);
    setLoading(false);
  },[wk]);

  useEffect(()=>{fetchData();},[fetchData]);
  useEffect(()=>{
    const ch=supabase.channel('piket-rt').on('postgres_changes',{event:'*',schema:'public',table:'piket_schedules'},()=>{setTimeout(fetchData,300);}).subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[fetchData]);

  const isCurrWeek=wk===toKey(getMonday(new Date()));
  const wLabel=`${weekStart.toLocaleDateString('id-ID',{day:'2-digit',month:'long'})} – ${addDays(weekStart,4).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}`;

  // Filter rows
  const displayRows=rows.filter(row=>{
    if(filterDay&&row.day_of_week!==filterDay) return false;
    if(filterTamu&&!row.tamu_instansi) return false;
    if(filterK&&(!row.kebutuhan||row.kebutuhan.length===0)) return false;
    if(selDay&&row.day_date!==selDay) return false;
    if(search){
      const q=search.toLowerCase();
      return !!(row.pic_ivp_name?.toLowerCase().includes(q)||row.pic_ump_name?.toLowerCase().includes(q)||row.pic_mlds_name?.toLowerCase().includes(q)||row.tamu_instansi?.toLowerCase().includes(q)||row.kebutuhan?.some(k=>k.toLowerCase().includes(q))||row.day_of_week.toLowerCase().includes(q));
    }
    return true;
  });

  // Stat cards
  const totalRows=rows.length;
  const hasTamuRows=rows.filter(r=>r.tamu_instansi).length;
  const hasKRows=rows.filter(r=>r.kebutuhan&&r.kebutuhan.length>0).length;
  const todayRows=rows.filter(r=>r.day_date===toKey(new Date())).length;

  // Pie data
  const tamuPie=[
    {label:'Ada Tamu',value:hasTamuRows,color:'#10b981'},
    {label:'Tanpa Tamu',value:totalRows-hasTamuRows,color:'#e2e8f0'},
  ].filter(d=>d.value>0);

  const kMap:Record<string,number>={};
  rows.forEach(r=>(r.kebutuhan||[]).forEach(k=>{kMap[k]=(kMap[k]||0)+1;}));
  const kPie=Object.entries(kMap).sort(([,a],[,b])=>b-a).slice(0,10).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));

  return (
    <div className="min-h-screen flex flex-col relative" style={{backgroundImage:`url('/IVP_Background.png')`,backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed'}}>
      <div className="absolute inset-0 pointer-events-none" style={{background:'rgba(255,255,255,0.08)'}}/>
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* ── HEADER — identical to Reminder Schedule ── */}
        <header className="sticky top-0 z-50" style={{background:'rgba(255,255,255,0.9)',borderBottom:'3px solid #dc2626',backdropFilter:'blur(16px)'}}>
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)',boxShadow:'0 3px 12px rgba(220,38,38,0.4)'}}>
                <span className="text-lg">🏪</span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Piket Showroom</h1>
                <p className="text-[10px] text-slate-500 font-medium">IndoVisual Presentama · Jadwal Piket Tim PTS</p>
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
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90"
                style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.4)'}}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                Atur Jadwal
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">

          {/* ── WEEK NAVIGATOR ── */}
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={()=>setWeekStart(d=>addDays(d,-7))}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-all hover:bg-red-50 hover:border-red-200 border-2 border-transparent text-slate-500 hover:text-red-600"
              style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(8px)'}}>‹</button>
            <div className="px-5 py-2 rounded-xl" style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(8px)',border:'1px solid rgba(0,0,0,0.08)'}}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Minggu Piket</p>
              <p className="text-sm font-bold text-slate-800 text-center">{wLabel}</p>
            </div>
            <button onClick={()=>setWeekStart(d=>addDays(d,7))}
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg transition-all hover:bg-red-50 hover:border-red-200 border-2 border-transparent text-slate-500 hover:text-red-600"
              style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(8px)'}}>›</button>
            {!isCurrWeek&&<button onClick={()=>setWeekStart(getMonday(new Date()))} className="px-3 py-2 rounded-xl text-xs font-bold transition-all" style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.25)',color:'#dc2626'}}>Minggu Ini</button>}
          </div>

          {/* ── STAT CARDS — same style as Reminder Schedule ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:'Total Hari',value:totalRows,sub:'Minggu ini',grad:'linear-gradient(135deg,#4f46e5,#6d28d9)',icon:'📋',shadow:'rgba(79,70,229,0.35)',active:!filterTamu&&!filterK&&!selDay},
              {label:'Ada Tamu',value:hasTamuRows,sub:'Instansi hadir',grad:'linear-gradient(135deg,#d97706,#b45309)',icon:'🏢',shadow:'rgba(217,119,6,0.35)',active:filterTamu,onClick:()=>setFilterTamu(f=>!f)},
              {label:'Ada Kebutuhan',value:hasKRows,sub:'Kebutuhan tercatat',grad:'linear-gradient(135deg,#059669,#047857)',icon:'🎯',shadow:'rgba(5,150,105,0.35)',active:filterK,onClick:()=>setFilterK(f=>!f)},
              {label:'Hari Ini',value:todayRows,sub:'Jadwal hari ini',grad:'linear-gradient(135deg,#0891b2,#0e7490)',icon:'📅',shadow:'rgba(8,145,178,0.35)',active:selDay===toKey(new Date()),onClick:()=>setSelDay(selDay===toKey(new Date())?null:toKey(new Date()))},
            ].map(card=>(
              <div key={card.label} onClick={card.onClick}
                className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.03] select-none"
                style={{background:card.grad,boxShadow:card.active?`0 6px 24px ${card.shadow}`:`0 4px 16px ${card.shadow}`,outline:card.active?'3px solid white':'none',transform:card.active?'scale(1.04)':undefined}}>
                <div className="absolute right-3 top-2 text-4xl opacity-[0.15] select-none">{card.icon}</div>
                {card.active&&<div className="absolute inset-0 rounded-2xl border-4 border-white/50 pointer-events-none"/>}
                <span className="text-3xl font-black text-white leading-none">{card.value}</span>
                <div><p className="text-sm font-bold text-white leading-tight">{card.label}</p><p className="text-[10px] font-medium leading-tight" style={{color:'rgba(255,255,255,0.75)'}}>{card.sub}</p></div>
                {card.active&&<span className="absolute top-2 left-2 text-white/80 text-[9px] font-bold uppercase tracking-widest">Filter Aktif ✓</span>}
              </div>
            ))}
          </div>

          {/* ── PIE CHARTS — 2 charts, identical donut style ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <MiniPieChart data={tamuPie} title="Statistik Tamu Minggu Ini" icon="🏢"/>
            <MiniPieChart data={kPie} title="Top Kebutuhan Minggu Ini" icon="🎯"/>
          </div>

          {/* ── MAIN AREA: LIST + CALENDAR ── */}
          <div className="flex gap-4 items-start">

            {/* ── SCHEDULE LIST ── */}
            <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(200,200,200,0.6)',backdropFilter:'blur(12px)'}}>

              {/* List header + filters */}
              <div className="px-5 py-3.5 border-b border-gray-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Schedule Piket</span>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{displayRows.length}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(search||filterDay||filterTamu||filterK||selDay)&&(
                      <button onClick={()=>{setSearch('');setFilterDay('');setFilterTamu(false);setFilterK(false);setSelDay(null);}}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                        style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',color:'#dc2626'}}>
                        ✕ Reset Filter
                      </button>
                    )}
                  </div>
                </div>
                {/* Search row */}
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[180px]">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                    <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, instansi, kebutuhan..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none transition-all"
                      style={{background:'rgba(248,250,252,0.9)',border:'1px solid rgba(0,0,0,0.1)'}}/>
                  </div>
                  <select value={filterDay} onChange={e=>setFilterDay(e.target.value as any)}
                    className="px-3 py-2 rounded-xl text-xs font-semibold outline-none bg-white"
                    style={{border:'1px solid rgba(0,0,0,0.1)'}}>
                    <option value="">Semua Hari</option>
                    {DAYS_OF_WEEK.map(d=><option key={d} value={d}>{d}</option>)}
                  </select>
                  <button onClick={()=>setFilterTamu(f=>!f)} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all border"
                    style={filterTamu?{background:'rgba(16,185,129,0.12)',borderColor:'rgba(16,185,129,0.4)',color:'#059669'}:{background:'transparent',borderColor:'rgba(0,0,0,0.1)',color:'#64748b'}}>
                    🏢 Ada Tamu
                  </button>
                  <button onClick={()=>setFilterK(f=>!f)} className="px-3 py-2 rounded-xl text-xs font-semibold transition-all border"
                    style={filterK?{background:'rgba(124,58,237,0.1)',borderColor:'rgba(124,58,237,0.35)',color:'#7c3aed'}:{background:'transparent',borderColor:'rgba(0,0,0,0.1)',color:'#64748b'}}>
                    🎯 Ada Kebutuhan
                  </button>
                </div>
              </div>

              {/* Table */}
              {loading?(
                <div className="flex justify-center py-16"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/><p className="text-sm text-slate-500">Memuat jadwal...</p></div></div>
              ):(
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{background:'rgba(248,250,252,0.8)'}}>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">No</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Tanggal</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">PIC (IVP / UMP / MLDS)</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Tamu Instansi</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Kebutuhan</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Foto</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest border-b border-gray-100">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.length===0?(
                        <tr><td colSpan={7} className="text-center py-16 text-gray-400"><div className="text-4xl mb-3">📋</div><p className="font-semibold">Tidak ada jadwal</p><p className="text-xs mt-1">Klik "Atur Jadwal" untuk menambahkan jadwal piket</p></td></tr>
                      ):displayRows.map((row,idx)=>{
                        const dc=DAY_COLOR[row.day_of_week];
                        const today=row.day_date===toKey(new Date());
                        return (
                          <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50/50 transition-colors" style={today?{background:'rgba(220,38,38,0.03)'}:{}}>
                            {/* No */}
                            <td className="px-4 py-3 text-gray-500 text-xs font-medium">{idx+1}</td>
                            {/* Tanggal */}
                            <td className="px-4 py-3">
                              <div className="inline-flex flex-col items-center px-2 py-1 rounded-xl text-center"
                                style={{background:today?'rgba(220,38,38,0.12)':dc.light,border:`1px solid ${today?'rgba(220,38,38,0.35)':dc.accent+'30'}`}}>
                                <span className="text-base font-black leading-none" style={{color:today?'#dc2626':dc.accent}}>{new Date(row.day_date+'T00:00:00').getDate()}</span>
                                <span className="text-[8px] font-bold uppercase leading-tight" style={{color:today?'#dc2626':dc.accent}}>{new Date(row.day_date+'T00:00:00').toLocaleDateString('id-ID',{month:'short',year:'2-digit'})}</span>
                              </div>
                              <div className="mt-1">
                                <span className="text-xs font-bold" style={{color:dc.accent}}>{row.day_of_week}</span>
                                {today&&<span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{background:dc.accent}}>HARI INI</span>}
                              </div>
                            </td>
                            {/* PIC */}
                            <td className="px-4 py-3">
                              <div className="space-y-1">
                                {([['pic_ivp_name','PTS IVP'],['pic_ump_name','PTS UMP'],['pic_mlds_name','PTS MLDS']] as [keyof PiketRow,string][]).map(([field,team])=>{
                                  const name=row[field] as string|null;
                                  const tc=TEAM_COLOR[team];
                                  return name?(
                                    <div key={team} className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{background:tc.dot}}>{name.charAt(0).toUpperCase()}</div>
                                      <div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate leading-tight">{name}</p><span className="text-[9px] font-bold uppercase" style={{color:tc.text}}>{team}</span></div>
                                    </div>
                                  ):(
                                    <div key={team} className="flex items-center gap-1.5 opacity-30">
                                      <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">—</div>
                                      <span className="text-[9px] text-slate-400 italic">{team}: —</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </td>
                            {/* Tamu */}
                            <td className="px-4 py-3">
                              {row.tamu_instansi?(
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm">🏢</span>
                                  <span className="text-xs font-semibold text-slate-700">{row.tamu_instansi}</span>
                                </div>
                              ):<span className="text-gray-300 text-xs">—</span>}
                            </td>
                            {/* Kebutuhan */}
                            <td className="px-4 py-3">
                              {row.kebutuhan&&row.kebutuhan.length>0?(
                                <div className="flex flex-wrap gap-1">
                                  {row.kebutuhan.slice(0,2).map(k=>(
                                    <span key={k} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{background:dc.accent}}>{k}</span>
                                  ))}
                                  {row.kebutuhan.length>2&&<span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-slate-500" style={{background:'rgba(0,0,0,0.06)'}}>+{row.kebutuhan.length-2}</span>}
                                </div>
                              ):<span className="text-gray-300 text-xs">—</span>}
                            </td>
                            {/* Foto */}
                            <td className="px-4 py-3">
                              {row.foto_url?(
                                <button onClick={()=>setPhotoZoom(row.foto_url!)} className="hover:opacity-80 transition-opacity">
                                  <img src={row.foto_url} alt="Foto" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"/>
                                </button>
                              ):<span className="text-gray-300 text-xs">—</span>}
                            </td>
                            {/* Action */}
                            <td className="px-4 py-3 text-center">
                              <button onClick={()=>setFillDetail(row)} title="Isi / Edit Detail"
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                                style={{background:dc.grad,boxShadow:`0 2px 8px ${dc.accent}30`}}>
                                ✍️ Isi
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100" style={{background:'rgba(255,255,255,0.97)'}}>
                    <span className="text-[10px] text-gray-400">{displayRows.length} jadwal ditampilkan</span>
                    <span className="text-[10px] text-gray-400">{rows.length} total minggu ini</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── MINI CALENDAR ── */}
            <MiniCalendar rows={allRows} calMonth={calMonth} setCalMonth={setCalMonth} selDay={selDay} setSelDay={setSelDay}/>
          </div>

        </div>

        {/* Photo zoom */}
        {photoZoom&&(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={()=>setPhotoZoom(null)}>
            <div className="relative max-w-3xl max-h-[90vh]">
              <img src={photoZoom} alt="Foto zoom" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"/>
              <button onClick={()=>setPhotoZoom(null)} className="absolute top-3 right-3 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-all">✕</button>
            </div>
          </div>
        )}

        {showPerson&&<PersonModal onClose={()=>setShowPerson(false)}/>}
        {showSchedule&&<ScheduleModal weekStart={weekStart} onClose={()=>setShowSchedule(false)} onSaved={fetchData}/>}
        {fillDetail&&<FillDetailModal row={fillDetail} onClose={()=>setFillDetail(null)} onSaved={fetchData}/>}
      </div>

      <style jsx>{`
        @keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        select option{background:#ffffff;color:#1e293b}
      `}</style>
    </div>
  );
}
