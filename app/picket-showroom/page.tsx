'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = ['Senin','Selasa','Rabu','Kamis','Jumat'] as const;
type DayOfWeek = typeof DAYS_OF_WEEK[number];
const DAY_EN: Record<DayOfWeek,string> = {Senin:'MON',Selasa:'TUE',Rabu:'WED',Kamis:'THU',Jumat:'FRI'};
const DAY_COLOR: Record<DayOfWeek,{accent:string;light:string;grad:string}> = {
  Senin:  {accent:'#dc2626',light:'rgba(220,38,38,0.08)',  grad:'linear-gradient(135deg,#dc2626,#991b1b)'},
  Selasa: {accent:'#d97706',light:'rgba(217,119,6,0.08)',  grad:'linear-gradient(135deg,#d97706,#92400e)'},
  Rabu:   {accent:'#2563eb',light:'rgba(37,99,235,0.08)',  grad:'linear-gradient(135deg,#2563eb,#1e3a8a)'},
  Kamis:  {accent:'#7c3aed',light:'rgba(124,58,237,0.08)', grad:'linear-gradient(135deg,#7c3aed,#4c1d95)'},
  Jumat:  {accent:'#059669',light:'rgba(5,150,105,0.08)',  grad:'linear-gradient(135deg,#059669,#064e3b)'},
};
const TEAM_LABEL: Record<string,{dot:string;text:string}> = {
  'PTS IVP':  {dot:'#dc2626',text:'#991b1b'},
  'PTS UMP':  {dot:'#2563eb',text:'#1e40af'},
  'PTS MLDS': {dot:'#7c3aed',text:'#6d28d9'},
};
const KEBUTUHAN_LIST = [
  'Meeting Room','Auditorium','Command Center','Digital Signage Kiosk',
  'Digital Signage Custom','Paging System','Background Music','Signage LED Outdoor',
  'Smartclass Room','Ballroom','Camera ETLE','Conference Room',
  'Paperless System','Delegate System','Camera Tracking',
];
const PRODUK_LIST = ['All Product','Videowall','LED','IFP','Audio System','Lighting','Kiosk'];
const JENIS_KEGIATAN_LIST = ['Demo Product','RnD','Maintenance','Shooting Markom'] as const;
type JenisKegiatan = typeof JENIS_KEGIATAN_LIST[number];
const SALES_DIVISIONS = [
  'IVP','MLDS','HAVS','Enterprise','DEC','ICS','POJ','VOJ','LOCOS',
  'VISIONMEDIA','UMP','BISOL','KIMS','IDC','IOCMEDAN','IOCPekanbaru',
  'IOCBandung','IOCJATENG','MVISEMARANG','POSSurabaya','IOCSurabaya',
  'IOCBali','SGP','SGP1','SGP2','OSS',
];
const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
const KEGIATAN_COLORS: Record<string,string> = {
  'Demo Product':'#2563eb','RnD':'#7c3aed','Maintenance':'#d97706','Shooting Markom':'#059669',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow { id:string; full_name:string; username:string; team_type?:string; role:string; }
interface PiketRow {
  id:string; week_start:string; day_of_week:DayOfWeek; day_date:string;
  pic_ivp_id:string|null; pic_ivp_name:string|null;
  pic_ump_id:string|null; pic_ump_name:string|null;
  pic_mlds_id:string|null; pic_mlds_name:string|null;
  tamu_instansi:string|null; kebutuhan:string[];
  created_at:string; updated_at:string;
  edited_by_name?:string|null;
}
interface KegiatanEntry {
  id?:string; piket_id:string;
  jenis_kegiatan:JenisKegiatan; jam_mulai:string; jam_selesai:string; produk:string[];
  tamu_instansi:string|null; nama_sales:string|null; sales_division:string|null;
  kebutuhan:string[]; keterangan:string|null; created_at:string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d:Date):Date{
  // Use local date to avoid timezone shift
  const r=new Date(d.getFullYear(),d.getMonth(),d.getDate());
  const day=r.getDay(); // 0=Sun,1=Mon,...,6=Sat
  const diff=day===0?-6:1-day;
  r.setDate(r.getDate()+diff);
  return r;
}
function addDays(d:Date,n:number):Date{const r=new Date(d.getFullYear(),d.getMonth(),d.getDate());r.setDate(r.getDate()+n);return r;}
function toKey(d:Date):string{const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${dd}`;}
function getDayDate(ws:Date,day:DayOfWeek):Date{return addDays(ws,DAYS_OF_WEEK.indexOf(day));}
function isToday(d:Date):boolean{const t=new Date();return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();}
function getWeekKey(dateStr:string):string{
  const[y,m,dd]=dateStr.split('-').map(Number);
  return toKey(getMonday(new Date(y,m-1,dd)));
}

// ─── Rolling schedule ─────────────────────────────────────────────────────────
// Compute PIC untuk tanggal tertentu berdasarkan pola jadwal DB.
// Pakai pic_ivp_name/pic_ump_name/pic_mlds_name yang tersedia di allRows.
// Cycle = semua week_start unik di DB, berulang terus ke depan.

type DayNamePattern = Record<DayOfWeek, string>; // day → pic name

function buildRollingNamePattern(dbRows: PiketRow[]): {weekKeys: string[]; patterns: Record<string, DayNamePattern>} {
  const patterns: Record<string, DayNamePattern> = {};
  dbRows.forEach(r => {
    if (!r.week_start) return;
    if (!patterns[r.week_start]) patterns[r.week_start] = {} as DayNamePattern;
    const name = r.pic_ivp_name || r.pic_ump_name || r.pic_mlds_name || '';
    if (name && r.day_of_week) patterns[r.week_start][r.day_of_week] = name;
  });
  // Only keep weeks that have at least 1 entry
  const weekKeys = Object.keys(patterns).filter(wk => Object.keys(patterns[wk]).length > 0).sort();
  return { weekKeys, patterns };
}

// Untuk tanggal tertentu, return nama PIC dari pola rolling
function getRollingNameForDate(date: Date, dbRows: PiketRow[]): string {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return '';
  const dayName = DAYS_OF_WEEK[dow - 1];
  if (!dayName) return '';

  const { weekKeys, patterns } = buildRollingNamePattern(dbRows);
  if (weekKeys.length === 0) return '';

  const ws = getMonday(date);
  const wsKey = toKey(ws);

  // Minggu ini ada di DB → pakai langsung
  if (patterns[wsKey]?.[dayName]) return patterns[wsKey][dayName];

  // Project rolling: cycle dari minggu-minggu yang tersimpan
  const firstWs = new Date(weekKeys[0] + 'T00:00:00');
  const weeksDiff = Math.round((ws.getTime() - firstWs.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (weeksDiff < 0) return '';
  const slotIdx = weeksDiff % weekKeys.length;
  const patternWeek = weekKeys[slotIdx];
  return patterns[patternWeek]?.[dayName] || '';
}

// Untuk ScheduleModal: return user_id dari pola rolling (butuh pic_ivp_id dll)
function getRollingUserIdForDate(date: Date, dbRows: PiketRow[]): string {
  const dow = date.getDay();
  if (dow === 0 || dow === 6) return '';
  const dayName = DAYS_OF_WEEK[dow - 1];
  if (!dayName) return '';

  // Build pattern dari uid
  const uidPatterns: Record<string, Record<DayOfWeek, string>> = {};
  dbRows.forEach(r => {
    if (!r.week_start) return;
    if (!uidPatterns[r.week_start]) uidPatterns[r.week_start] = {} as Record<DayOfWeek, string>;
    const uid = r.pic_ivp_id || r.pic_ump_id || r.pic_mlds_id || '';
    if (uid && r.day_of_week) uidPatterns[r.week_start][r.day_of_week] = uid;
  });
  const weekKeys = Object.keys(uidPatterns).filter(wk => Object.keys(uidPatterns[wk]).length > 0).sort();
  if (weekKeys.length === 0) return '';

  const ws = getMonday(date);
  const wsKey = toKey(ws);
  if (uidPatterns[wsKey]?.[dayName]) return uidPatterns[wsKey][dayName];

  const firstWs = new Date(weekKeys[0] + 'T00:00:00');
  const weeksDiff = Math.round((ws.getTime() - firstWs.getTime()) / (7 * 24 * 60 * 60 * 1000));
  if (weeksDiff < 0) return '';
  const slotIdx = weeksDiff % weekKeys.length;
  return uidPatterns[weekKeys[slotIdx]]?.[dayName] || '';
}

// ─── Pie Chart ────────────────────────────────────────────────────────────────

function MiniPieChart({data,title,icon,activeFilter,onSliceClick}:{
  data:{label:string;value:number;color:string}[];title:string;icon:string;
  activeFilter?:string|null;onSliceClick?:(l:string)=>void;
}) {
  const [hov,setHov]=useState<number|null>(null);
  const total=data.reduce((s,d)=>s+d.value,0);
  if(!total) return(
    <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)'}}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{icon} {title}</p>
      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
    </div>
  );
  let cum=-Math.PI/2;
  const cx=60,cy=60,r=50,ir=28;
  const slices=data.map((d,i)=>{
    const angle=(d.value/total)*2*Math.PI;
    if(data.length===1){cum+=angle;return{...d,path:'',full:true,i};}
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum),x2=cx+r*Math.cos(cum+angle),y2=cy+r*Math.sin(cum+angle);
    const xi1=cx+ir*Math.cos(cum),yi1=cy+ir*Math.sin(cum),xi2=cx+ir*Math.cos(cum+angle),yi2=cy+ir*Math.sin(cum+angle);
    const lg=angle>Math.PI?1:0;
    const path=`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${lg} 0 ${xi1} ${yi1} Z`;
    cum+=angle;return{...d,path,full:false,i};
  });
  return(
    <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)'}}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map(s=>s.full?(
            <g key={s.i} style={{cursor:onSliceClick?'pointer':'default'}} onClick={()=>onSliceClick?.(s.label)} onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
              <circle cx={60} cy={60} r={50} fill={s.color} opacity={hov===null||hov===s.i?1:0.45} style={{filter:hov===s.i||activeFilter===s.label?`drop-shadow(0 0 5px ${s.color})`:'none'}}/>
              <circle cx={60} cy={60} r={28} fill="white"/>
            </g>
          ):(
            <path key={s.i} d={s.path} fill={s.color} opacity={hov===null||hov===s.i?1:0.45}
              style={{cursor:onSliceClick?'pointer':'default',transition:'opacity 0.15s',filter:hov===s.i||activeFilter===s.label?`drop-shadow(0 0 5px ${s.color})`:'none'}}
              onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)} onClick={()=>onSliceClick?.(s.label)}/>
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1 flex-1 min-w-0 max-h-[120px] overflow-y-auto">
          {slices.map(s=>{
            const isActive=activeFilter===s.label;
            return(
              <div key={s.i} className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
                style={{background:hov===s.i||isActive?`${s.color}20`:'transparent',outline:isActive?`1.5px solid ${s.color}`:'none'}}
                onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)} onClick={()=>onSliceClick?.(s.label)}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
                <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
                <span className="text-[10px] font-bold" style={{color:s.color}}>{s.value}</span>
                {isActive&&<span className="text-[9px] font-bold text-purple-600">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function TamuSummaryCards({allRows,kegiatanList,selectedYear,selectedMonth,onYearChange,onMonthChange}:{
  allRows:PiketRow[];kegiatanList:KegiatanEntry[];
  selectedYear:number;selectedMonth:number|null;
  onYearChange:(y:number)=>void;onMonthChange:(m:number|null)=>void;
}) {
  const piketDateMap:Record<string,string>={};
  allRows.forEach(r=>{piketDateMap[r.id]=r.day_date;});

  // Derive available years from allRows
  const availableYears=Array.from(new Set(allRows.map(r=>r.day_date?.slice(0,4)).filter(Boolean))).sort().reverse() as string[];
  // If no data yet, at least show current year
  const now=new Date();
  const yearOptions=availableYears.length>0?availableYears:[String(now.getFullYear())];

  const activeKg=kegiatanList.filter(k=>{
    const d=piketDateMap[k.piket_id];
    if(!d)return false;
    const yr=d.slice(0,4);
    const mo=parseInt(d.slice(5,7),10);
    if(yr!==String(selectedYear))return false;
    if(selectedMonth!==null&&mo!==selectedMonth)return false;
    return true;
  });

  const demoList=activeKg.filter(k=>k.jenis_kegiatan==='Demo Product'&&k.tamu_instansi);
  const activeDays=new Set(activeKg.map(k=>piketDateMap[k.piket_id]).filter(Boolean)).size;

  // Top divisi — divisi yang paling banyak bawa tamu
  const divMap:Record<string,number>={};
  activeKg.forEach(k=>{if(k.sales_division)divMap[k.sales_division]=(divMap[k.sales_division]||0)+1;});
  const topDivisiEntry=Object.entries(divMap).sort(([,a],[,b])=>b-a)[0];
  const topDivisi=topDivisiEntry?topDivisiEntry[0]:'—';
  const topDivisiCount=topDivisiEntry?topDivisiEntry[1]:0;

  // Top produk
  const topProdukMap:Record<string,number>={};
  activeKg.forEach(k=>(k.produk||[]).forEach(p=>{topProdukMap[p]=(topProdukMap[p]||0)+1;}));
  const topProduk=Object.entries(topProdukMap).sort(([,a],[,b])=>b-a)[0]?.[0]||'—';

  // Top kebutuhan tamu terbanyak
  const kbtMap:Record<string,number>={};
  activeKg.forEach(k=>(k.kebutuhan||[]).forEach(kb=>{kbtMap[kb]=(kbtMap[kb]||0)+1;}));
  const topKbtEntry=Object.entries(kbtMap).sort(([,a],[,b])=>b-a)[0];
  const topKebutuhan=topKbtEntry?topKbtEntry[0]:'—';
  const topKebutuhanCount=topKbtEntry?topKbtEntry[1]:0;

  const periodLabel=selectedMonth!==null
    ?`${MONTH_NAMES[selectedMonth-1]} ${selectedYear}`
    :`Tahun ${selectedYear}`;
  const accentColor=selectedMonth!==null?'#7c3aed':'#059669';
  const accentGrad=selectedMonth!==null?'linear-gradient(135deg,#7c3aed,#4c1d95)':'linear-gradient(135deg,#059669,#047857)';

  const stats=[
    {label:'Hari Aktif',        val:activeDays,         hint:'ada kegiatan',                  icon:'📅', color:accentColor},
    {label:'Demo Product',      val:demoList.length,    hint:'sesi demo tamu',                icon:'🏢', color:'#2563eb'},
    {label:'Top Divisi',        val:topDivisi,          hint:`${topDivisiCount}x kegiatan`,   icon:'🏷️', color:'#0891b2', isText:true},
    {label:'Top Produk',        val:topProduk,          hint:'paling sering demo',            icon:'🥇', color:'#059669', isText:true},
    {label:'Kebutuhan Terbanyak', val:topKebutuhan,     hint:`${topKebutuhanCount}x diminta`, icon:'🎯', color:'#7c3aed', isText:true},
  ];

  return(
    <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.97)',border:`1px solid ${accentColor}20`,boxShadow:`0 4px 20px ${accentColor}15`}}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap" style={{background:accentGrad}}>
        <div className="flex items-center gap-2">
          <span className="text-base">📊</span>
          <div>
            <p className="text-xs font-black text-white leading-none">Ringkasan Aktivitas</p>
            <p className="text-[9px] text-white/70 mt-0.5">{periodLabel}</p>
          </div>
        </div>
        {/* Controls: Year + Month */}
        <div className="flex items-center gap-2">
          {/* Year dropdown */}
          <select value={selectedYear} onChange={e=>onYearChange(Number(e.target.value))}
            className="rounded-lg px-2 py-1 text-[11px] font-bold outline-none cursor-pointer"
            style={{background:'rgba(255,255,255,0.2)',color:'white',border:'1px solid rgba(255,255,255,0.3)'}}>
            {yearOptions.map(y=><option key={y} value={y} style={{background:'#1e293b',color:'white'}}>{y}</option>)}
          </select>
          {/* Month buttons */}
          <div className="flex items-center gap-0.5 bg-black/20 rounded-xl p-1 flex-wrap">
            <button onClick={()=>onMonthChange(null)}
              className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
              style={selectedMonth===null?{background:'white',color:accentColor}:{color:'rgba(255,255,255,0.65)'}}>
              Semua
            </button>
            {MONTH_NAMES.map((mn,i)=>(
              <button key={i} onClick={()=>onMonthChange(i+1)}
                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                style={selectedMonth===i+1?{background:'white',color:accentColor}:{color:'rgba(255,255,255,0.65)'}}>
                {mn}
              </button>
            ))}
          </div>
        </div>
      </div>
      {/* Stats horizontal */}
      <div className="flex divide-x divide-slate-100 overflow-x-auto">
        {stats.map((s,i)=>(
          <div key={i} className="flex-1 min-w-[90px] px-3 py-3 flex flex-col gap-0.5 flex-shrink-0">
            <div className="flex items-center gap-1 mb-0.5">
              <span className="text-[11px]">{s.icon}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none truncate">{s.label}</span>
            </div>
            {(s as any).isText
              ?<span className="text-[12px] font-black leading-tight truncate" style={{color:s.color}}>{s.val}</span>
              :<span className="text-2xl font-black leading-none" style={{color:s.color}}>{s.val}</span>
            }
            <span className="text-[8px] text-slate-300 leading-none">{s.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Mini Calendar Popup ──────────────────────────────────────────────────────

function MiniCalendarPopup({allRows,onClose}:{allRows:PiketRow[];onClose:()=>void}) {
  const [calMonth,setCalMonth]=useState(()=>new Date());
  const y=calMonth.getFullYear(),m=calMonth.getMonth();
  const today=toKey(new Date());
  const totalMonth=allRows.filter(r=>r.day_date?.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length;

  const firstOfMonth=new Date(y,m,1);
  const firstDayOfWeek=firstOfMonth.getDay();
  const startOffset=firstDayOfWeek===0?6:firstDayOfWeek-1;
  const gridStart=new Date(y,m,1-startOffset);
  const gridCells:Date[]=Array.from({length:42},(_,i)=>addDays(gridStart,i));

  const rowMap:Record<string,PiketRow[]>={};
  allRows.forEach(r=>{if(!rowMap[r.day_date])rowMap[r.day_date]=[];rowMap[r.day_date].push(r);});

  const WEEK_DAYS=['Sen','Sel','Rab','Kam','Jum','Sab','Min'];

  return(
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="bg-white rounded-2xl shadow-2xl overflow-hidden" style={{width:'640px',maxWidth:'95vw',animation:'scale-in 0.2s ease-out',border:'1.5px solid rgba(220,38,38,0.2)'}}>
        <div className="px-5 py-3.5 flex items-center justify-between" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
          <button onClick={()=>setCalMonth(new Date(y,m-1,1))} className="text-white/80 hover:text-white font-bold text-2xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10">‹</button>
          <div className="text-center">
            <p className="text-white font-black text-base">{MONTH_NAMES[m]} {y}</p>
            <p className="text-white/70 text-[11px]">{totalMonth} jadwal tersimpan bulan ini</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={()=>setCalMonth(new Date(y,m+1,1))} className="text-white/80 hover:text-white font-bold text-2xl w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10">›</button>
            <button onClick={onClose} className="text-white/70 hover:text-white font-bold text-lg w-8 h-8 flex items-center justify-center bg-white/15 hover:bg-white/25 rounded-lg">✕</button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEK_DAYS.map((d,i)=>(
            <div key={i} className="text-center text-[11px] font-bold py-2" style={{color:i<5?'#374151':'#d1d5db'}}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7" style={{minHeight:'360px'}}>
          {gridCells.map((date,i)=>{
            const ds=toKey(date);
            const inMonth=date.getMonth()===m;
            const isT=ds===today;
            const dow=date.getDay();
            const isWeekend=dow===0||dow===6;
            const dayRows=rowMap[ds]||[];
            const hasDB=dayRows.length>0;
            const dbPics=dayRows.flatMap(r=>[r.pic_ivp_name,r.pic_ump_name,r.pic_mlds_name].filter(Boolean) as string[]);
            const dc=hasDB?DAY_COLOR[dayRows[0].day_of_week]:null;
            // Rolling: compute dari pola DB untuk tanggal yang belum ada
            const rollingName=(!hasDB&&!isWeekend&&inMonth)?getRollingNameForDate(date,allRows):'';
            const rollingDow=DAYS_OF_WEEK[dow-1] as DayOfWeek|undefined;
            const rollingDc=rollingDow?DAY_COLOR[rollingDow]:null;
            return(
              <div key={i} className="border-r border-b border-gray-100 p-1.5 min-h-[60px] relative"
                style={{background:isT?'rgba(220,38,38,0.06)':!inMonth?'rgba(0,0,0,0.015)':'white'}}>
                <div className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1"
                  style={{background:isT?'#dc2626':'transparent',color:isT?'white':!inMonth?'#d1d5db':isWeekend?'#d1d5db':'#374151',fontWeight:isT?900:600}}>
                  {date.getDate()}
                </div>
                {hasDB&&inMonth&&dbPics.map((name,pi)=>(
                  <div key={pi} className="text-[9px] font-semibold leading-tight truncate px-0.5 py-0.5 rounded mb-0.5"
                    style={{color:dc?.accent||'#374151',background:`${dc?.accent||'#dc2626'}18`}}>
                    {name}
                  </div>
                ))}
                {rollingName&&(
                  <div className="text-[9px] font-semibold leading-tight truncate px-0.5 py-0.5 rounded mb-0.5"
                    style={{color:rollingDc?.accent||'#94a3b8',background:`${rollingDc?.accent||'#94a3b8'}12`}}>
                    {rollingName}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Fill Detail Modal ────────────────────────────────────────────────────────

interface KFEntry {
  id?:string; jenis_kegiatan:JenisKegiatan; jam_mulai:string; jam_selesai:string; produk:string[];
  tamu_instansi:string; nama_sales:string; sales_division:string; kebutuhan:string[]; keterangan:string;
}
const emptyKF=():KFEntry=>({jenis_kegiatan:'Demo Product',jam_mulai:'09:00',jam_selesai:'10:00',produk:[],tamu_instansi:'',nama_sales:'',sales_division:'',kebutuhan:[],keterangan:''});

function FillDetailModal({row,onClose,onSaved}:{row:PiketRow;onClose:()=>void;onSaved:()=>void}) {
  const [entries,setEntries]=useState<KFEntry[]>([emptyKF()]);
  const [loadingE,setLoadingE]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<{type:'success'|'error';msg:string}|null>(null);
  const dc=DAY_COLOR[row.day_of_week];
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3500);};

  useEffect(()=>{
    (async()=>{
      setLoadingE(true);
      const{data}=await supabase.from('piket_tamu_detail').select('*').eq('piket_id',row.id).order('created_at');
      if(data&&data.length>0){
        setEntries((data as KegiatanEntry[]).map(d=>({
          id:d.id,jenis_kegiatan:d.jenis_kegiatan||'Demo Product',
          jam_mulai:d.jam_mulai||'09:00',jam_selesai:d.jam_selesai||'10:00',produk:d.produk||[],
          tamu_instansi:d.tamu_instansi||'',nama_sales:d.nama_sales||'',sales_division:d.sales_division||'',
          kebutuhan:d.kebutuhan||[],keterangan:d.keterangan||'',
        })));
      }
      setLoadingE(false);
    })();
  },[row.id]);

  const upd=(i:number,p:Partial<KFEntry>)=>setEntries(prev=>prev.map((e,x)=>x===i?{...e,...p}:e));
  const toggleK=(i:number,k:string)=>setEntries(prev=>prev.map((e,x)=>x===i?{...e,kebutuhan:e.kebutuhan.includes(k)?e.kebutuhan.filter(v=>v!==k):[...e.kebutuhan,k]}:e));
  const toggleP=(i:number,p:string)=>{
    if(p==='All Product') setEntries(prev=>prev.map((e,x)=>x===i?{...e,produk:e.produk.includes('All Product')?[]:['All Product']}:e));
    else setEntries(prev=>prev.map((e,x)=>{if(x!==i)return e;const wo=e.produk.filter(v=>v!=='All Product');return{...e,produk:wo.includes(p)?wo.filter(v=>v!==p):[...wo,p]};}));
  };

  const handleSave=async()=>{
    setSaving(true);
    try{
      await supabase.from('piket_tamu_detail').delete().eq('piket_id',row.id);
      const ins=entries.filter(e=>e.jenis_kegiatan).map(e=>({
        piket_id:row.id,jenis_kegiatan:e.jenis_kegiatan,
        jam_mulai:e.jam_mulai||null,jam_selesai:e.jam_selesai||null,produk:e.produk,
        tamu_instansi:e.jenis_kegiatan==='Demo Product'?(e.tamu_instansi||null):null,
        nama_sales:e.jenis_kegiatan==='Demo Product'?(e.nama_sales||null):null,
        sales_division:e.jenis_kegiatan==='Demo Product'?(e.sales_division||null):null,
        kebutuhan:e.jenis_kegiatan==='Demo Product'?e.kebutuhan:[],
        keterangan:e.jenis_kegiatan!=='Demo Product'?(e.keterangan||null):null,
        created_at:new Date().toISOString(),
      }));
      if(ins.length>0){const{error}=await supabase.from('piket_tamu_detail').insert(ins);if(error)throw error;}
      const fd=ins.find(e=>e.jenis_kegiatan==='Demo Product');
      await supabase.from('piket_schedules').update({tamu_instansi:fd?.tamu_instansi||null,kebutuhan:fd?.kebutuhan||[],updated_at:new Date().toISOString()}).eq('id',row.id);
      notify('success','Data tersimpan!');
      setTimeout(()=>{onSaved();onClose();},700);
    }catch(e:any){notify('error','Gagal: '+e.message);}
    setSaving(false);
  };

  return(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 overflow-y-auto" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4" style={{animation:'scale-in 0.25s ease-out',border:`1.5px solid ${dc.accent}40`}}>
        <div className="px-6 py-5 rounded-t-2xl" style={{background:dc.grad}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">✍️ Detail Piket — {row.day_of_week}</h2>
              <p className="text-white/70 text-xs mt-0.5">{new Date(row.day_date+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} · {[row.pic_ivp_name,row.pic_ump_name,row.pic_mlds_name].filter(Boolean).join(' / ')||'Belum ada PIC'}</p>
            </div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {toast&&<div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex gap-2 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}><span>{toast.type==='success'?'✅':'❌'}</span><span>{toast.msg}</span></div>}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {loadingE?<div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/></div>
          :entries.map((entry,idx)=>(
            <div key={idx} className="rounded-2xl overflow-hidden" style={{border:`1.5px solid ${dc.accent}30`,background:'rgba(255,255,255,0.7)'}}>
              <div className="flex items-center justify-between px-4 py-2.5" style={{background:dc.light,borderBottom:`1px solid ${dc.accent}20`}}>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white" style={{background:dc.grad}}>{idx+1}</div>
                  <span className="text-xs font-bold" style={{color:dc.accent}}>Kegiatan {idx+1}</span>
                  {entry.jenis_kegiatan&&<span className="text-[9px] font-bold px-2 py-0.5 rounded text-white" style={{background:KEGIATAN_COLORS[entry.jenis_kegiatan]||dc.accent}}>{entry.jenis_kegiatan}</span>}
                </div>
                {entries.length>1&&<button onClick={()=>setEntries(p=>p.filter((_,i)=>i!==idx))} className="text-red-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>}
              </div>
              <div className="p-4 space-y-4">
                {/* Jenis Kegiatan */}
                <div>
                  <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">📋 Jenis Kegiatan</label>
                  <select value={entry.jenis_kegiatan} onChange={e=>upd(idx,{jenis_kegiatan:e.target.value as JenisKegiatan})}
                    className="w-full rounded-xl px-3 py-2.5 text-sm outline-none bg-white" style={{border:'1px solid rgba(0,0,0,0.12)'}}>
                    {JENIS_KEGIATAN_LIST.map(j=><option key={j} value={j}>{j}</option>)}
                  </select>
                </div>
                {/* Jam */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">🕐 Jam Mulai</label>
                    <input type="time" value={entry.jam_mulai} onChange={e=>upd(idx,{jam_mulai:e.target.value})}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}}/>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">🕑 Jam Selesai</label>
                    <input type="time" value={entry.jam_selesai} onChange={e=>upd(idx,{jam_selesai:e.target.value})}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}}/>
                  </div>
                </div>
                {/* Produk — checkbox grid */}
                <div>
                  <label className="block text-[10px] font-bold mb-2 tracking-widest uppercase text-slate-400">📦 Produk yang Digunakan</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRODUK_LIST.map(p=>{
                      const isAll=entry.produk.includes('All Product');
                      const isSel=entry.produk.includes(p);
                      const isDis=(p==='All Product'&&entry.produk.length>0&&!isAll)||(p!=='All Product'&&isAll);
                      return(
                        <button key={p} type="button" onClick={()=>!isDis&&toggleP(idx,p)} disabled={isDis}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                          style={isSel?{borderColor:dc.accent,background:`${dc.accent}12`,color:dc.accent}:{borderColor:'rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.6)',color:'#64748b'}}>
                          <div className="w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                            style={isSel?{borderColor:dc.accent,background:dc.accent}:{borderColor:'#d1d5db',background:'white'}}>
                            {isSel&&<svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                          </div>
                          <span className="text-xs font-semibold leading-tight">{p}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Demo Product fields */}
                {entry.jenis_kegiatan==='Demo Product'&&(
                  <>
                    <div>
                      <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">🏢 Tamu Instansi</label>
                      <input value={entry.tamu_instansi} onChange={e=>upd(idx,{tamu_instansi:e.target.value})}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}} placeholder="Nama instansi / perusahaan tamu..."/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">👤 Nama Sales</label>
                        <input value={entry.nama_sales} onChange={e=>upd(idx,{nama_sales:e.target.value})}
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}} placeholder="Nama sales..."/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">🏷️ Division</label>
                        <select value={entry.sales_division} onChange={e=>upd(idx,{sales_division:e.target.value})}
                          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none bg-white" style={{border:'1px solid rgba(0,0,0,0.12)'}}>
                          <option value="">— Pilih Division —</option>
                          {SALES_DIVISIONS.map(d=><option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">🎯 Kebutuhan</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {KEBUTUHAN_LIST.map(k=>{
                          const chk=entry.kebutuhan.includes(k);
                          return(
                            <button key={k} type="button" onClick={()=>toggleK(idx,k)}
                              className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all"
                              style={chk?{borderColor:dc.accent,background:`${dc.accent}12`,color:dc.accent}:{borderColor:'rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.5)',color:'#64748b'}}>
                              <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0"
                                style={chk?{borderColor:dc.accent,background:dc.accent}:{borderColor:'#d1d5db',background:'white'}}>
                                {chk&&<svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                              </div>
                              <span className="text-xs font-semibold leading-tight">{k}</span>
                            </button>
                          );
                        })}
                      </div>
                      {entry.kebutuhan.length>0&&(
                        <div className="mt-2 p-2.5 rounded-xl flex flex-wrap gap-1.5" style={{background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.08)'}}>
                          {entry.kebutuhan.map(k=><span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{background:dc.grad}}>{k}<button onClick={()=>toggleK(idx,k)} className="ml-0.5 opacity-80">✕</button></span>)}
                        </div>
                      )}
                    </div>
                  </>
                )}
                {/* Non-demo */}
                {entry.jenis_kegiatan!=='Demo Product'&&(
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase text-slate-400">📝 Keterangan</label>
                    <textarea value={entry.keterangan} onChange={e=>upd(idx,{keterangan:e.target.value})} rows={3}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
                      style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}} placeholder={`Keterangan ${entry.jenis_kegiatan}...`}/>
                  </div>
                )}
              </div>
            </div>
          ))}
          {!loadingE&&(
            <button onClick={()=>setEntries(p=>[...p,emptyKF()])}
              className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold flex items-center justify-center gap-2"
              style={{borderColor:`${dc.accent}60`,color:dc.accent,background:`${dc.accent}08`}}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Tambah Kegiatan Lain
            </button>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{background:'rgba(255,255,255,0.95)',color:'#64748b',border:'1px solid rgba(0,0,0,0.12)'}}>Batal</button>
          <button onClick={handleSave} disabled={saving||loadingE}
            className="flex-1 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-60"
            style={{background:dc.grad,boxShadow:`0 4px 14px ${dc.accent}35`}}>
            {saving&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}💾 Simpan Detail
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Schedule Modal — 2 minggu ────────────────────────────────────────────────

function ScheduleModal({weekStart,users,currentUser,onClose,onSaved}:{weekStart:Date;users:UserRow[];currentUser:any;onClose:()=>void;onSaved:()=>void}) {
  const week2Start=addDays(weekStart,7);
  const wk1=toKey(weekStart),wk2=toKey(week2Start);
  type W2 = Record<string,Record<DayOfWeek,string>>;
  const initW2=():W2=>{const r:W2={[wk1]:{}as any,[wk2]:{}as any};DAYS_OF_WEEK.forEach(d=>{r[wk1][d]='';r[wk2][d]='';});return r;};
  const [assign,setAssign]=useState<W2>(initW2);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<{type:'success'|'error';msg:string}|null>(null);
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3000);};

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      const{data}=await supabase.from('piket_schedules').select('*').in('week_start',[wk1,wk2]);
      const na=initW2();
      if(data&&data.length>0){
        (data as PiketRow[]).forEach(s=>{if(na[s.week_start])na[s.week_start][s.day_of_week]=s.pic_ivp_id||s.pic_ump_id||s.pic_mlds_id||'';});
      }
      // Fill empty days by projecting rolling pattern from existing DB data
      const{data:allData}=await supabase.from('piket_schedules').select('week_start,day_of_week,pic_ivp_id,pic_ump_id,pic_mlds_id');
      if(allData&&allData.length>0){
        const allRows=allData as PiketRow[];
        [[wk1,weekStart],[wk2,week2Start]].forEach(([wk,ws])=>{
          DAYS_OF_WEEK.forEach(day=>{
            if(!na[wk as string][day]){
              const date=getDayDate(ws as Date,day);
              const uid=getRollingUserIdForDate(date,allRows);
              if(uid) na[wk as string][day]=uid;
            }
          });
        });
      }
      setAssign(na);
      setLoading(false);
    })();
  },[wk1,wk2]);

  const handleSave=async()=>{
    setSaving(true);
    try{
      for(const [wk,ws] of [[wk1,weekStart],[wk2,week2Start]] as [string,Date][]){
        for(const day of DAYS_OF_WEEK){
          const uid=assign[wk]?.[day]||'';
          const u=users.find(x=>x.id===uid);
          const tt=u?.team_type||'';
          const isIVP=tt==='Team PTS',isUMP=tt==='Team PTS UMP',isMlds=tt==='Team PTS MLDS';
          const{error,data:savedRow}=await supabase.from('piket_schedules').upsert({
            week_start:wk,day_of_week:day,day_date:toKey(getDayDate(ws,day)),
            pic_ivp_id:isIVP?uid:null,pic_ivp_name:isIVP?u?.full_name||null:null,
            pic_ump_id:isUMP?uid:null,pic_ump_name:isUMP?u?.full_name||null:null,
            pic_mlds_id:isMlds?uid:null,pic_mlds_name:isMlds?u?.full_name||null:null,
            created_at:new Date().toISOString(),updated_at:new Date().toISOString(),
          },{onConflict:'week_start,day_of_week',ignoreDuplicates:false}).select('id').single();
          if(error){notify('error',`Gagal ${day} ${wk}: ${error.message}`);setSaving(false);return;}
          // Update edited_by_name secara terpisah — aman jika kolom belum ada di DB
          if(currentUser?.full_name&&savedRow?.id){
            await supabase.from('piket_schedules').update({edited_by_name:currentUser.full_name}).eq('id',savedRow.id).then(()=>{});
          }
        }
      }
      notify('success','Jadwal 2 minggu tersimpan!');
      setTimeout(()=>{onSaved();onClose();},800);
    }catch(e:any){notify('error','Gagal: '+e.message);}
    setSaving(false);
  };

  const fmtWk=(ws:Date)=>`${ws.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})} – ${addDays(ws,4).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}`;

  return(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 overflow-y-auto">
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4" style={{animation:'scale-in 0.25s ease-out',border:'1.5px solid rgba(220,38,38,0.25)'}}>
        <div className="px-6 py-5 rounded-t-2xl" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">📋 Atur Jadwal Piket — 2 Minggu</h2>
              <p className="text-red-200/80 text-xs mt-0.5">{fmtWk(weekStart)} &amp; {fmtWk(week2Start)}</p>
            </div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {toast&&<div className={`mx-5 mt-3 px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>{toast.type==='success'?'✅':'❌'} {toast.msg}</div>}

        <div className="p-5 max-h-[58vh] overflow-y-auto space-y-4">
          {loading?<div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/></div>:(
            <>
              {/* Column headers */}
              <div className="grid grid-cols-[100px_1fr_1fr] gap-2">
                <div/>
                {[{wk:wk1,ws:weekStart},{wk:wk2,ws:week2Start}].map(({wk,ws})=>(
                  <div key={wk} className="text-center py-1.5 rounded-lg text-[10px] font-bold" style={{background:'rgba(220,38,38,0.07)',color:'#dc2626',border:'1px solid rgba(220,38,38,0.2)'}}>
                    📅 {fmtWk(ws)}
                  </div>
                ))}
              </div>
              {DAYS_OF_WEEK.map((day,dayIdx)=>{
                const dc=DAY_COLOR[day];
                return(
                  <div key={day} className="grid grid-cols-[100px_1fr_1fr] gap-2 items-center">
                    {/* Day label */}
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{background:dc.light}}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black flex-shrink-0" style={{background:dc.grad}}>{DAY_EN[day]}</div>
                      <span className="text-xs font-bold" style={{color:dc.accent}}>{day}</span>
                    </div>
                    {/* 2 week dropdowns */}
                    {[{wk:wk1,ws:weekStart},{wk:wk2,ws:week2Start}].map(({wk,ws})=>{
                      const date=getDayDate(ws,day);
                      const u=users.find(x=>x.id===assign[wk]?.[day]);
                      const tt=u?.team_type||'';
                      const teamKey=tt==='Team PTS'?'PTS IVP':tt==='Team PTS UMP'?'PTS UMP':tt==='Team PTS MLDS'?'PTS MLDS':'';
                      const tc=teamKey?TEAM_LABEL[teamKey]:null;
                      return(
                        <div key={wk} className="relative">
                          {isToday(date)&&<span className="absolute -top-2 left-2 text-[8px] font-bold px-1 py-0.5 rounded text-white z-10" style={{background:dc.accent}}>TODAY</span>}
                          <div className="flex items-center gap-1.5 p-1.5 rounded-xl border" style={{borderColor:`${dc.accent}25`,background:'white'}}>
                            {tc&&<div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:tc.dot}}/>}
                            <select value={assign[wk]?.[day]||''} onChange={e=>setAssign(p=>({...p,[wk]:{...p[wk],[day]:e.target.value}}))}
                              className="flex-1 text-[11px] outline-none bg-transparent min-w-0 py-1">
                              <option value="">— Belum —</option>
                              <optgroup label="Team PTS">
                                {users.filter(u=>u.team_type==='Team PTS').map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
                              </optgroup>
                              <optgroup label="Team PTS UMP">
                                {users.filter(u=>u.team_type==='Team PTS UMP').map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
                              </optgroup>
                              <optgroup label="Team PTS MLDS">
                                {users.filter(u=>u.team_type==='Team PTS MLDS').map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
                              </optgroup>
                            </select>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{background:'rgba(255,255,255,0.95)',color:'#64748b',border:'1px solid rgba(0,0,0,0.12)'}}>Batal</button>
          <button onClick={handleSave} disabled={saving||loading} className="flex-1 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60" style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.35)'}}>
            {saving&&<div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}💾 Simpan 2 Minggu
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Export Excel (XLSX) — sama gaya Ticketing ───────────────────────────────

function exportToExcel(allRows:PiketRow[], kegiatanList:KegiatanEntry[]) {
  const runExport = (XLSX:any) => {
    const exportDate = new Date().toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
    const sorted = [...allRows].sort((a,b)=>a.day_date.localeCompare(b.day_date));

    // ── Style definitions (same as ticketing) ──────────────────────────────
    const border = {top:{style:'thin',color:{rgb:'D1D5DB'}},bottom:{style:'thin',color:{rgb:'D1D5DB'}},left:{style:'thin',color:{rgb:'D1D5DB'}},right:{style:'thin',color:{rgb:'D1D5DB'}}};
    const boldBorder = {top:{style:'thin',color:{rgb:'000000'}},bottom:{style:'thin',color:{rgb:'000000'}},left:{style:'thin',color:{rgb:'000000'}},right:{style:'thin',color:{rgb:'000000'}}};
    const hdrStyle = {font:{name:'Arial',bold:true,sz:11,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'991B1B'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:boldBorder};
    const hdrBlue = {font:{name:'Arial',bold:true,sz:11,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'1E3A5F'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center',wrapText:true},border:boldBorder};
    const secHdr = {font:{name:'Arial',bold:true,sz:10,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'DC2626'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'},border:boldBorder};
    const secHdrGreen = {font:{name:'Arial',bold:true,sz:10,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'059669'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'},border:boldBorder};
    const secHdrPurple = {font:{name:'Arial',bold:true,sz:10,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'7C3AED'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'},border:boldBorder};
    const secHdrBlue2 = {font:{name:'Arial',bold:true,sz:10,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'2563EB'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'},border:boldBorder};
    const cellStyle = {font:{name:'Arial',sz:10},alignment:{vertical:'center',wrapText:true},border};
    const altStyle = {...cellStyle,fill:{fgColor:{rgb:'FFF5F5'},patternType:'solid'}};
    const titleStyle = {font:{name:'Arial',bold:true,sz:16,color:{rgb:'991B1B'}},alignment:{horizontal:'left',vertical:'center'}};
    const subTitleStyle = {font:{name:'Arial',sz:10,color:{rgb:'6B7280'}},alignment:{horizontal:'left',vertical:'center'}};
    const ctr = (v:any,s:any) => ({v,s,t:typeof v==='number'?'n':'s'});
    const cell = (v:any,s?:any) => ({v,s:s||cellStyle,t:typeof v==='number'?'n':'s'});
    const empty = (s?:any) => ({v:'',s:s||cellStyle,t:'s'});
    const row0 = (n:number,s?:any) => Array(n).fill(null).map(()=>empty(s));

    // Warna per jenis kegiatan
    const kgColorMap:Record<string,{bg:string;fg:string}> = {
      'Demo Product'   :{bg:'DBEAFE',fg:'1E40AF'},
      'RnD'            :{bg:'EDE9FE',fg:'6D28D9'},
      'Maintenance'    :{bg:'FEF3C7',fg:'92400E'},
      'Shooting Markom':{bg:'D1FAE5',fg:'065F46'},
    };
    const kgStyle=(jenis:string,base:any={})=>({
      ...base,...cellStyle,
      ...(kgColorMap[jenis]?{font:{name:'Arial',sz:10,bold:true,color:{rgb:kgColorMap[jenis].fg}},fill:{fgColor:{rgb:kgColorMap[jenis].bg},patternType:'solid'}}:{}),
    });

    // PIC team color
    const picStyle=(team:string,base:any={})=>{
      const colors:Record<string,{bg:string;fg:string}> = {'PTS IVP':{bg:'FEE2E2',fg:'991B1B'},'PTS UMP':{bg:'DBEAFE',fg:'1E3A5F'},'PTS MLDS':{bg:'EDE9FE',fg:'6D28D9'}};
      const c=colors[team]||{bg:'F3F4F6',fg:'374151'};
      return{...base,...cellStyle,font:{name:'Arial',sz:9,bold:true,color:{rgb:c.fg}},fill:{fgColor:{rgb:c.bg},patternType:'solid'}};
    };

    const wb = XLSX.utils.book_new();

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 1 — 📊 Dashboard
    // ════════════════════════════════════════════════════════════════════════
    {
      const COLS = 6;
      const totalHari = sorted.length;
      const totalKegiatan = kegiatanList.length;
      const totalDemo = kegiatanList.filter(k=>k.jenis_kegiatan==='Demo Product'&&k.tamu_instansi).length;
      const totalRnD = kegiatanList.filter(k=>k.jenis_kegiatan==='RnD').length;
      const totalMaint = kegiatanList.filter(k=>k.jenis_kegiatan==='Maintenance').length;
      const totalShoot = kegiatanList.filter(k=>k.jenis_kegiatan==='Shooting Markom').length;
      const activeDaysSet = new Set(kegiatanList.map(k=>{const r=sorted.find(r=>r.id===k.piket_id);return r?.day_date;}).filter(Boolean));
      const totalActiveDays = activeDaysSet.size;

      // Top divisi
      const divMapEx:Record<string,number>={};
      kegiatanList.forEach(k=>{if(k.sales_division)divMapEx[k.sales_division]=(divMapEx[k.sales_division]||0)+1;});
      const divArrEx=Object.entries(divMapEx).sort(([,a],[,b])=>b-a);
      const topDivisiEx=divArrEx[0]?.[0]||'-';
      const topDivisiCountEx=divArrEx[0]?.[1]||0;

      // Top kegiatan
      const kgMapEx:Record<string,number>={'Demo Product':totalDemo,'RnD':totalRnD,'Maintenance':totalMaint,'Shooting Markom':totalShoot};
      const topKgEx=Object.entries(kgMapEx).sort(([,a],[,b])=>b-a)[0]?.[0]||'-';

      // Top produk
      const prodMapEx:Record<string,number>={};
      kegiatanList.forEach(k=>(k.produk||[]).forEach(p=>{prodMapEx[p]=(prodMapEx[p]||0)+1;}));
      const prodArrEx=Object.entries(prodMapEx).sort(([,a],[,b])=>b-a);
      const topProdukEx=prodArrEx[0]?.[0]||'-';

      const data:any[][] = [
        [cell('📊 PIKET SHOWROOM — DASHBOARD REPORT',titleStyle),...row0(COLS-1,titleStyle)],
        [cell(`Tanggal Export: ${exportDate}`,subTitleStyle),...row0(COLS-1)],
        row0(COLS),
        // ── Ringkasan ──
        [ctr('RINGKASAN STATISTIK',secHdr),...row0(COLS-1,secHdr)],
        [ctr('Kategori',hdrStyle),ctr('Jumlah',hdrStyle),ctr('Persentase / Keterangan',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle)],
      ];
      const stats = [
        {label:'Hari Aktif (ada kegiatan)', val:totalActiveDays, note:`dari ${totalHari} hari piket`, fg:'1E3A5F'},
        {label:'Total Kegiatan',            val:totalKegiatan,   note:'semua jenis',                  fg:'DC2626'},
        {label:'Demo Product',              val:totalDemo,       note:totalKegiatan>0?((totalDemo/totalKegiatan)*100).toFixed(1)+'%':'0%', fg:'1E40AF'},
        {label:'RnD',                       val:totalRnD,        note:totalKegiatan>0?((totalRnD/totalKegiatan)*100).toFixed(1)+'%':'0%',  fg:'6D28D9'},
        {label:'Maintenance',               val:totalMaint,      note:totalKegiatan>0?((totalMaint/totalKegiatan)*100).toFixed(1)+'%':'0%',fg:'92400E'},
        {label:'Shooting Markom',           val:totalShoot,      note:totalKegiatan>0?((totalShoot/totalKegiatan)*100).toFixed(1)+'%':'0%',fg:'065F46'},
        {label:'Top Jenis Kegiatan',        val:topKgEx,         note:'terbanyak',                    fg:'7C3AED', isText:true},
        {label:'Top Divisi Sales',          val:topDivisiEx,     note:`${topDivisiCountEx}x kegiatan`,fg:'0891B2', isText:true},
        {label:'Top Produk Demo',           val:topProdukEx,     note:`${prodArrEx[0]?.[1]||0}x digunakan`, fg:'059669', isText:true},
      ];
      stats.forEach((s,i)=>{
        const rs = i%2===0?cellStyle:altStyle;
        data.push([
          cell(s.label,{...rs,font:{name:'Arial',sz:10,bold:true,color:{rgb:s.fg}}}),
          (s as any).isText
            ? cell(s.val,{...rs,font:{name:'Arial',sz:10,bold:true,color:{rgb:s.fg}}})
            : ctr(s.val,{...rs,alignment:{horizontal:'center',vertical:'center'}}),
          cell(s.note,{...rs,font:{name:'Arial',sz:9,color:{rgb:'6B7280'}}}),
          empty(),empty(),empty(),
        ]);
      });

      data.push(row0(COLS));

      // ── Statistik Produk (baru) ──
      if(prodArrEx.length>0){
        const secHdrTeal={font:{name:'Arial',bold:true,sz:10,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'0F766E'},patternType:'solid'},alignment:{horizontal:'center',vertical:'center'},border:boldBorder};
        data.push([ctr('PENGGUNAAN PRODUK',secHdrTeal),...row0(COLS-1,secHdrTeal)]);
        data.push([ctr('Produk',hdrBlue),ctr('Jumlah Digunakan',hdrBlue),ctr('Persentase',hdrBlue),ctr('',hdrBlue),ctr('',hdrBlue),ctr('',hdrBlue)]);
        const totalProduk=prodArrEx.reduce((s,[,v])=>s+v,0);
        prodArrEx.forEach(([prod,cnt],i)=>{
          const pct=totalProduk>0?((cnt/totalProduk)*100).toFixed(1)+'%':'0%';
          const rs=i%2===0?cellStyle:altStyle;
          data.push([cell(prod,rs),ctr(cnt,{...rs,alignment:{horizontal:'center',vertical:'center'}}),ctr(pct,{...rs,alignment:{horizontal:'center',vertical:'center'}}),empty(),empty(),empty()]);
        });
        data.push(row0(COLS));
      }

      // ── Statistik per Instansi ──
      const instansiMap:Record<string,number>={};
      kegiatanList.filter(k=>k.tamu_instansi).forEach(k=>{instansiMap[k.tamu_instansi!]=(instansiMap[k.tamu_instansi!]||0)+1;});
      const instansiArr = Object.entries(instansiMap).sort(([,a],[,b])=>b-a);
      if(instansiArr.length>0){
        data.push([ctr('TAMU INSTANSI',secHdrBlue2),...row0(COLS-1,secHdrBlue2)]);
        data.push([ctr('Instansi',hdrBlue),ctr('Jumlah Demo',hdrBlue),ctr('Persentase',hdrBlue),ctr('',hdrBlue),ctr('',hdrBlue),ctr('',hdrBlue)]);
        instansiArr.forEach(([inst,cnt],i)=>{
          const pct = totalDemo>0?((cnt/totalDemo)*100).toFixed(1)+'%':'0%';
          const rs = i%2===0?cellStyle:altStyle;
          data.push([cell(inst,rs),ctr(cnt,{...rs,alignment:{horizontal:'center',vertical:'center'}}),ctr(pct,{...rs,alignment:{horizontal:'center',vertical:'center'}}),empty(),empty(),empty()]);
        });
        data.push(row0(COLS));
      }

      // ── Statistik Division Sales ──
      if(divArrEx.length>0){
        data.push([ctr('DIVISION SALES AKTIF',secHdrPurple),...row0(COLS-1,secHdrPurple)]);
        data.push([ctr('Division',hdrStyle),ctr('Jumlah Kegiatan',hdrStyle),ctr('Persentase',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle)]);
        divArrEx.forEach(([div,cnt],i)=>{
          const pct=totalKegiatan>0?((cnt/totalKegiatan)*100).toFixed(1)+'%':'0%';
          const rs=i%2===0?cellStyle:altStyle;
          data.push([cell(div,rs),ctr(cnt,{...rs,alignment:{horizontal:'center',vertical:'center'}}),ctr(pct,{...rs,alignment:{horizontal:'center',vertical:'center'}}),empty(),empty(),empty()]);
        });
        data.push(row0(COLS));
      }

      // ── Statistik PIC ──
      const picMap:Record<string,number>={};
      sorted.forEach(r=>{
        const names=[r.pic_ivp_name,r.pic_ump_name,r.pic_mlds_name].filter(Boolean) as string[];
        names.forEach(n=>{picMap[n]=(picMap[n]||0)+1;});
      });
      const picArr = Object.entries(picMap).sort(([,a],[,b])=>b-a);
      if(picArr.length>0){
        data.push([ctr('STATISTIK PIC PIKET',secHdrGreen),...row0(COLS-1,secHdrGreen)]);
        data.push([ctr('Nama PIC',hdrStyle),ctr('Total Hari Piket',hdrStyle),ctr('Persentase',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle)]);
        picArr.forEach(([name,cnt],i)=>{
          const pct = totalHari>0?((cnt/totalHari)*100).toFixed(1)+'%':'0%';
          const rs = i%2===0?cellStyle:altStyle;
          data.push([cell(name,rs),ctr(cnt,{...rs,alignment:{horizontal:'center',vertical:'center'}}),ctr(pct,{...rs,alignment:{horizontal:'center',vertical:'center'}}),empty(),empty(),empty()]);
        });
        data.push(row0(COLS));
      }

      // ── Statistik Kebutuhan ──
      const kbtMap:Record<string,number>={};
      kegiatanList.forEach(k=>(k.kebutuhan||[]).forEach(kb=>{kbtMap[kb]=(kbtMap[kb]||0)+1;}));
      const kbtArr = Object.entries(kbtMap).sort(([,a],[,b])=>b-a);
      if(kbtArr.length>0){
        data.push([ctr('KEBUTUHAN TERBANYAK',secHdrPurple),...row0(COLS-1,secHdrPurple)]);
        data.push([ctr('Kebutuhan',hdrStyle),ctr('Jumlah',hdrStyle),ctr('Persentase',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle),ctr('',hdrStyle)]);
        kbtArr.slice(0,10).forEach(([kb,cnt],i)=>{
          const pct = totalDemo>0?((cnt/totalDemo)*100).toFixed(1)+'%':'0%';
          const rs = i%2===0?cellStyle:altStyle;
          data.push([cell(kb,rs),ctr(cnt,{...rs,alignment:{horizontal:'center',vertical:'center'}}),ctr(pct,{...rs,alignment:{horizontal:'center',vertical:'center'}}),empty(),empty(),empty()]);
        });
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      const merges:any[]=[
        {s:{r:0,c:0},e:{r:0,c:COLS-1}},
        {s:{r:1,c:0},e:{r:1,c:COLS-1}},
        {s:{r:3,c:0},e:{r:3,c:COLS-1}},
      ];
      ws['!merges']=merges;
      ws['!cols']=[{wch:32},{wch:16},{wch:24},{wch:16},{wch:16},{wch:16}];
      ws['!rows']=[{hpt:34},{hpt:18},{hpt:8},{hpt:24}];
      XLSX.utils.book_append_sheet(wb,ws,'📊 Dashboard');
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 2 — 📋 Jadwal Piket
    // ════════════════════════════════════════════════════════════════════════
    {
      const headers=['No.','Tanggal','Hari','PIC','Team PIC','Jenis Kegiatan','Jam Mulai','Jam Selesai','Produk','Tamu Instansi','Nama Sales','Division Sales','Kebutuhan','Keterangan'];
      const COLS=headers.length;
      const data:any[][]=[
        [cell('📋 DATA JADWAL PIKET SHOWROOM',{...titleStyle,font:{name:'Arial',bold:true,sz:14,color:{rgb:'991B1B'}}}),...row0(COLS-1)],
        [cell(`Total: ${sorted.length} hari piket · ${kegiatanList.length} kegiatan · Export: ${exportDate}`,subTitleStyle),...row0(COLS-1)],
        row0(COLS),
        headers.map(h=>ctr(h,hdrStyle)),
      ];
      let rowIdx=0;
      sorted.forEach(piket=>{
        const kgs=kegiatanList.filter(k=>k.piket_id===piket.id);
        const toR=kgs.length>0?kgs:[null];
        const dateObj=new Date(piket.day_date+'T00:00:00');
        const dateStr=dateObj.toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
        const picNames=[piket.pic_ivp_name,piket.pic_ump_name,piket.pic_mlds_name].filter(Boolean).join(' / ')||'-';
        const picTeams=[piket.pic_ivp_name?'PTS IVP':'',piket.pic_ump_name?'PTS UMP':'',piket.pic_mlds_name?'PTS MLDS':''].filter(Boolean).join(' / ')||'-';
        const teamKey=piket.pic_ivp_name?'PTS IVP':piket.pic_ump_name?'PTS UMP':'PTS MLDS';
        toR.forEach((kg,ki)=>{
          const rs = rowIdx%2===0?cellStyle:altStyle;
          const ctrStyle = {...rs,alignment:{horizontal:'center',vertical:'center'}};
          data.push([
            ctr(rowIdx+1,ctrStyle),
            cell(dateStr,rs),
            cell(piket.day_of_week,{...rs,font:{name:'Arial',sz:10,bold:true,color:{rgb:'991B1B'}}}),
            cell(picNames,picStyle(teamKey,rs)),
            cell(picTeams,{...rs,font:{name:'Arial',sz:9,color:{rgb:'6B7280'}}}),
            kg ? cell(kg.jenis_kegiatan,kgStyle(kg.jenis_kegiatan)) : cell('-',rs),
            kg?.jam_mulai ? ctr(kg.jam_mulai,ctrStyle) : cell('-',rs),
            kg?.jam_selesai ? ctr(kg.jam_selesai,ctrStyle) : cell('-',rs),
            cell(kg?.produk?.join(', ')||'-',rs),
            cell(kg?.tamu_instansi||'-',rs),
            cell(kg?.nama_sales||'-',rs),
            cell(kg?.sales_division||'-',rs),
            cell(kg?.kebutuhan?.join(', ')||'-',rs),
            cell(kg?.keterangan||'-',{...rs,alignment:{horizontal:'left',vertical:'center',wrapText:true}}),
          ]);
          rowIdx++;
        });
      });
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:COLS-1}},{s:{r:1,c:0},e:{r:1,c:COLS-1}}];
      ws['!cols']=[{wch:5},{wch:24},{wch:10},{wch:22},{wch:14},{wch:18},{wch:10},{wch:10},{wch:26},{wch:26},{wch:20},{wch:14},{wch:32},{wch:36}];
      ws['!rows']=[{hpt:28},{hpt:18},{hpt:8},{hpt:32}];
      XLSX.utils.book_append_sheet(wb,ws,'📋 Jadwal Piket');
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 3 — 🏢 Demo Product
    // ════════════════════════════════════════════════════════════════════════
    {
      const demoKg=kegiatanList.filter(k=>k.jenis_kegiatan==='Demo Product'&&k.tamu_instansi);
      const headers=['No.','Tanggal','Hari','PIC','Tamu Instansi','Nama Sales','Division','Produk','Kebutuhan'];
      const COLS=headers.length;
      const data:any[][]=[
        [cell('🏢 DATA DEMO PRODUCT — PIKET SHOWROOM',{...titleStyle,font:{name:'Arial',bold:true,sz:14,color:{rgb:'1E40AF'}}}),...row0(COLS-1)],
        [cell(`Total Demo: ${demoKg.length} · Export: ${exportDate}`,subTitleStyle),...row0(COLS-1)],
        row0(COLS),
        headers.map(h=>ctr(h,hdrBlue)),
      ];
      // Build piket map
      const piketMap:Record<string,PiketRow>={};
      sorted.forEach(r=>{piketMap[r.id]=r;});
      demoKg.forEach((kg,i)=>{
        const piket=piketMap[kg.piket_id];
        if(!piket)return;
        const rs=i%2===0?cellStyle:altStyle;
        const ctrStyle={...rs,alignment:{horizontal:'center',vertical:'center'}};
        const dateStr=new Date(piket.day_date+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
        const picNames=[piket.pic_ivp_name,piket.pic_ump_name,piket.pic_mlds_name].filter(Boolean).join(' / ')||'-';
        data.push([
          ctr(i+1,ctrStyle),
          cell(dateStr,rs),
          cell(piket.day_of_week,{...rs,font:{name:'Arial',sz:10,bold:true,color:{rgb:'991B1B'}}}),
          cell(picNames,rs),
          cell(kg.tamu_instansi||'-',{...rs,font:{name:'Arial',sz:10,bold:true}}),
          cell(kg.nama_sales||'-',rs),
          cell(kg.sales_division||'-',{...rs,alignment:{horizontal:'center',vertical:'center'}}),
          cell(kg.produk?.join(', ')||'-',rs),
          cell(kg.kebutuhan?.join(', ')||'-',rs),
        ]);
      });
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:COLS-1}},{s:{r:1,c:0},e:{r:1,c:COLS-1}}];
      ws['!cols']=[{wch:5},{wch:24},{wch:10},{wch:22},{wch:28},{wch:20},{wch:14},{wch:26},{wch:36}];
      ws['!rows']=[{hpt:28},{hpt:18},{hpt:8},{hpt:32}];
      XLSX.utils.book_append_sheet(wb,ws,'🏢 Demo Product');
    }

    // ════════════════════════════════════════════════════════════════════════
    // SHEET 4 — 🔧 Kegiatan Lain (RnD, Maintenance, Shooting)
    // ════════════════════════════════════════════════════════════════════════
    {
      const lainKg=kegiatanList.filter(k=>k.jenis_kegiatan!=='Demo Product');
      const headers=['No.','Tanggal','Hari','PIC','Jenis Kegiatan','Jam Mulai','Jam Selesai','Produk','Keterangan'];
      const COLS=headers.length;
      const data:any[][]=[
        [cell('🔧 KEGIATAN LAIN — RnD / MAINTENANCE / SHOOTING MARKOM',{...titleStyle,font:{name:'Arial',bold:true,sz:14,color:{rgb:'7C3AED'}}}),...row0(COLS-1)],
        [cell(`Total: ${lainKg.length} kegiatan · Export: ${exportDate}`,subTitleStyle),...row0(COLS-1)],
        row0(COLS),
        headers.map(h=>ctr(h,{...hdrStyle,fill:{fgColor:{rgb:'7C3AED'},patternType:'solid'}})),
      ];
      const piketMap:Record<string,PiketRow>={};
      sorted.forEach(r=>{piketMap[r.id]=r;});
      lainKg.forEach((kg,i)=>{
        const piket=piketMap[kg.piket_id];
        if(!piket)return;
        const rs=i%2===0?cellStyle:altStyle;
        const ctrStyle={...rs,alignment:{horizontal:'center',vertical:'center'}};
        const dateStr=new Date(piket.day_date+'T00:00:00').toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'});
        const picNames=[piket.pic_ivp_name,piket.pic_ump_name,piket.pic_mlds_name].filter(Boolean).join(' / ')||'-';
        data.push([
          ctr(i+1,ctrStyle),
          cell(dateStr,rs),
          cell(piket.day_of_week,{...rs,font:{name:'Arial',sz:10,bold:true,color:{rgb:'991B1B'}}}),
          cell(picNames,rs),
          cell(kg.jenis_kegiatan,kgStyle(kg.jenis_kegiatan)),
          kg.jam_mulai?ctr(kg.jam_mulai,ctrStyle):cell('-',rs),
          kg.jam_selesai?ctr(kg.jam_selesai,ctrStyle):cell('-',rs),
          cell(kg.produk?.join(', ')||'-',rs),
          cell(kg.keterangan||'-',{...rs,alignment:{horizontal:'left',vertical:'center',wrapText:true}}),
        ]);
      });
      const ws=XLSX.utils.aoa_to_sheet(data);
      ws['!merges']=[{s:{r:0,c:0},e:{r:0,c:COLS-1}},{s:{r:1,c:0},e:{r:1,c:COLS-1}}];
      ws['!cols']=[{wch:5},{wch:24},{wch:10},{wch:22},{wch:18},{wch:10},{wch:10},{wch:26},{wch:44}];
      ws['!rows']=[{hpt:28},{hpt:18},{hpt:8},{hpt:32}];
      XLSX.utils.book_append_sheet(wb,ws,'🔧 Kegiatan Lain');
    }

    const fileName=`Piket_Showroom_${new Date().toISOString().slice(0,10)}.xlsx`;
    XLSX.writeFile(wb,fileName,{bookType:'xlsx',type:'binary',cellStyles:true});
  };

  if((window as any).XLSX) runExport((window as any).XLSX);
  else {
    const script=document.createElement('script');
    script.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    script.onload=()=>runExport((window as any).XLSX);
    script.onerror=()=>alert('Gagal memuat library Excel. Coba lagi atau periksa koneksi internet.');
    document.head.appendChild(script);
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PiketShowroomPage() {
  const [currentUser,setCurrentUser]=useState<any>(null);
  const [weekStart,setWeekStart]=useState<Date>(()=>getMonday(new Date()));
  const [rows,setRows]=useState<PiketRow[]>([]);
  const [allRows,setAllRows]=useState<PiketRow[]>([]);
  const [kegiatanList,setKegiatanList]=useState<KegiatanEntry[]>([]);
  const [ptUsers,setPtUsers]=useState<UserRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [showSchedule,setShowSchedule]=useState(false);
  const [showCalendar,setShowCalendar]=useState(false);
  const [fillDetail,setFillDetail]=useState<PiketRow|null>(null);
  const [search,setSearch]=useState('');
  const [filterDay,setFilterDay]=useState<DayOfWeek|''>('');
  const [filterTamu,setFilterTamu]=useState(false);
  const [filterKebutuhan,setFilterKebutuhan]=useState<string|null>(null);
  const [filterInstansi,setFilterInstansi]=useState<string|null>(null);
  const [filterDivision,setFilterDivision]=useState<string|null>(null);
  const [filterKegiatan,setFilterKegiatan]=useState<string|null>(null);
  const [summaryYear,setSummaryYear]=useState<number>(new Date().getFullYear());
  const [summaryMonth,setSummaryMonth]=useState<number|null>(null);
  const wk=toKey(weekStart);

  useEffect(()=>{try{const s=localStorage.getItem('currentUser');if(s)setCurrentUser(JSON.parse(s));}catch{}});
  const isAdmin=currentUser&&['admin','superadmin'].includes(currentUser.role?.toLowerCase()||'');

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const wk2=toKey(addDays(weekStart,7));
    const[wRes,aRes,uRes,kgRes]=await Promise.all([
      supabase.from('piket_schedules').select('*').in('week_start',[wk,wk2]).order('day_date'),
      supabase.from('piket_schedules').select('id,day_date,week_start,day_of_week,pic_ivp_name,pic_ump_name,pic_mlds_name'),
      supabase.from('users').select('id,full_name,username,team_type,role').in('team_type',['Team PTS','Team PTS UMP','Team PTS MLDS']).order('full_name'),
      supabase.from('piket_tamu_detail').select('*').order('created_at'),
    ]);
    if(wRes.data)setRows(wRes.data as PiketRow[]);
    if(aRes.data)setAllRows(aRes.data as PiketRow[]);
    if(uRes.data)setPtUsers(uRes.data as UserRow[]);
    if(kgRes.data)setKegiatanList(kgRes.data as KegiatanEntry[]);
    setLoading(false);
  },[weekStart]);

  useEffect(()=>{fetchData();},[fetchData]);
  useEffect(()=>{
    const ch=supabase.channel('piket-rt').on('postgres_changes',{event:'*',schema:'public',table:'piket_schedules'},()=>{setTimeout(fetchData,300);}).subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[fetchData]);

  const isCurrWeek=wk===toKey(getMonday(new Date()));
  const fmtW=(ws:Date)=>`${ws.toLocaleDateString('id-ID',{day:'2-digit',month:'short'})} – ${addDays(ws,4).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})}`;
  const wLabel=fmtW(weekStart);
  const wLabel2=fmtW(addDays(weekStart,7));

  // Generate virtual rows dari rolling untuk minggu yang belum ada di DB
  const effectiveRows = useMemo(()=>{
    const existingKeys = new Set(rows.map(r=>`${r.week_start}__${r.day_of_week}`));
    const virtual: PiketRow[] = [];
    [weekStart, addDays(weekStart,7)].forEach(ws=>{
      const wkKey = toKey(ws);
      DAYS_OF_WEEK.forEach((day)=>{
        if(existingKeys.has(`${wkKey}__${day}`)) return;
        const date = getDayDate(ws, day);
        const name = getRollingNameForDate(date, allRows);
        if(!name) return;
        // Cari user berdasarkan nama untuk tentukan team
        const u = ptUsers.find(x=>x.full_name===name);
        const tt = u?.team_type||'';
        const isIVP=tt==='Team PTS', isUMP=tt==='Team PTS UMP', isMlds=tt==='Team PTS MLDS';
        virtual.push({
          id: `virtual-${wkKey}-${day}`,
          week_start: wkKey,
          day_of_week: day,
          day_date: toKey(date),
          pic_ivp_id: isIVP?(u?.id||null):null,
          pic_ivp_name: isIVP?name:null,
          pic_ump_id: isUMP?(u?.id||null):null,
          pic_ump_name: isUMP?name:null,
          pic_mlds_id: isMlds?(u?.id||null):null,
          pic_mlds_name: isMlds?name:null,
          tamu_instansi: null, kebutuhan: [],
          created_at: '', updated_at: '',
        });
      });
    });
    return [...rows, ...virtual];
  }, [rows, allRows, weekStart, ptUsers]);

  // Auto-save virtual row ke DB lalu buka FillDetailModal
  const handleFillVirtual = useCallback(async(row: PiketRow)=>{
    const{error}=await supabase.from('piket_schedules').upsert({
      week_start: row.week_start,
      day_of_week: row.day_of_week,
      day_date: row.day_date,
      pic_ivp_id: row.pic_ivp_id,
      pic_ivp_name: row.pic_ivp_name,
      pic_ump_id: row.pic_ump_id,
      pic_ump_name: row.pic_ump_name,
      pic_mlds_id: row.pic_mlds_id,
      pic_mlds_name: row.pic_mlds_name,
      tamu_instansi: null, kebutuhan: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },{onConflict:'week_start,day_of_week',ignoreDuplicates:false});
    if(error){console.error('Failed to save virtual row:',error.message);return;}
    // Fetch the saved row to get real id, then open modal
    const{data}=await supabase.from('piket_schedules').select('*').eq('week_start',row.week_start).eq('day_of_week',row.day_of_week).single();
    if(data){setFillDetail(data as PiketRow);fetchData();}
  },[fetchData]);

  const displayRows = effectiveRows.filter(row=>{
    // Hide weekends from list (Sabtu/Minggu hidden, shown only in mini calendar)
    const d=new Date(row.day_date+'T00:00:00');
    if(d.getDay()===0||d.getDay()===6)return false;
    if(filterDay&&row.day_of_week!==filterDay)return false;
    const rowKg=kegiatanList.filter(k=>k.piket_id===row.id);
    if(filterTamu&&!rowKg.some(k=>k.tamu_instansi))return false;
    if(filterKebutuhan&&!rowKg.some(k=>k.kebutuhan?.includes(filterKebutuhan)))return false;
    if(filterInstansi&&!rowKg.some(k=>k.tamu_instansi===filterInstansi))return false;
    if(filterDivision&&!rowKg.some(k=>k.sales_division===filterDivision))return false;
    if(filterKegiatan&&!rowKg.some(k=>k.jenis_kegiatan===filterKegiatan))return false;
    if(search){
      const q=search.toLowerCase();
      const mp=!!(row.pic_ivp_name?.toLowerCase().includes(q)||row.pic_ump_name?.toLowerCase().includes(q)||row.pic_mlds_name?.toLowerCase().includes(q)||row.day_of_week.toLowerCase().includes(q));
      const mk=rowKg.some(k=>k.tamu_instansi?.toLowerCase().includes(q)||k.nama_sales?.toLowerCase().includes(q)||k.kebutuhan?.some(x=>x.toLowerCase().includes(q))||k.keterangan?.toLowerCase().includes(q)||k.jenis_kegiatan?.toLowerCase().includes(q));
      return mp||mk;
    }
    return true;
  });

  const piketDateMapPie:Record<string,string>={};
  allRows.forEach(r=>{piketDateMapPie[r.id]=r.day_date;});
  const filteredKgPie=kegiatanList.filter(k=>{
    const d=piketDateMapPie[k.piket_id];
    if(!d)return false;
    if(d.slice(0,4)!==String(summaryYear))return false;
    if(summaryMonth!==null&&parseInt(d.slice(5,7),10)!==summaryMonth)return false;
    return true;
  });
  const kPieAll=Object.entries(filteredKgPie.reduce((acc,k)=>{(k.kebutuhan||[]).forEach(x=>{acc[x]=(acc[x]||0)+1;});return acc;},{}as Record<string,number>)).sort(([,a],[,b])=>b-a).slice(0,12).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));
  const divPieAll=Object.entries(filteredKgPie.reduce((acc,k)=>{if(k.sales_division)acc[k.sales_division]=(acc[k.sales_division]||0)+1;return acc;},{}as Record<string,number>)).sort(([,a],[,b])=>b-a).slice(0,12).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));
  const kgTypePie=JENIS_KEGIATAN_LIST.map(j=>({label:j,value:filteredKgPie.filter(k=>k.jenis_kegiatan===j).length,color:KEGIATAN_COLORS[j]})).filter(d=>d.value>0);
  const instansiPie=Object.entries(filteredKgPie.filter(k=>k.tamu_instansi).reduce((acc,k)=>{const key=k.tamu_instansi!;acc[key]=(acc[key]||0)+1;return acc;},{}as Record<string,number>)).sort(([,a],[,b])=>b-a).slice(0,12).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));
  const produkPie=Object.entries(filteredKgPie.reduce((acc,k)=>{(k.produk||[]).forEach(p=>{acc[p]=(acc[p]||0)+1;});return acc;},{}as Record<string,number>)).sort(([,a],[,b])=>b-a).slice(0,12).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));

  return(
    <div className="min-h-screen flex flex-col relative" style={{backgroundImage:`url('/IVP_Background.png')`,backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed'}}>
      <div className="absolute inset-0 pointer-events-none" style={{background:'rgba(255,255,255,0.08)'}}/>
      {loading&&rows.length===0&&(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{backgroundImage:`url('/IVP_Background.png')`,backgroundSize:'cover'}}>
          <div className="absolute inset-0" style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(2px)'}}/>
          <div className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl" style={{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',boxShadow:'0 8px 40px rgba(0,0,0,0.18)'}}>
            <svg className="w-16 h-16 animate-spin" viewBox="0 0 64 64" fill="none"><circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="6"/><path d="M32 6 A26 26 0 0 1 58 32" stroke="#dc2626" strokeWidth="6" strokeLinecap="round"/></svg>
            <p className="text-sm font-bold text-slate-700">Loading...</p>
          </div>
        </div>
      )}

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* ── HEADER ── */}
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
              <button onClick={()=>exportToExcel(allRows,kegiatanList)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                style={{background:'linear-gradient(135deg,#059669,#047857)',boxShadow:'0 4px 14px rgba(5,150,105,0.3)'}}>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                Export Report
              </button>
              {isAdmin&&(
                <button onClick={()=>setShowSchedule(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105"
                  style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.4)'}}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Atur Jadwal
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">
          <TamuSummaryCards allRows={allRows} kegiatanList={kegiatanList} selectedYear={summaryYear} selectedMonth={summaryMonth} onYearChange={setSummaryYear} onMonthChange={setSummaryMonth}/>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <MiniPieChart data={instansiPie} title="Tamu per Instansi" icon="🏢" activeFilter={filterInstansi} onSliceClick={l=>setFilterInstansi(filterInstansi===l?null:l)}/>
            <MiniPieChart data={kgTypePie} title="Jenis Kegiatan" icon="📋" activeFilter={filterKegiatan} onSliceClick={l=>setFilterKegiatan(filterKegiatan===l?null:l)}/>
            <MiniPieChart data={produkPie} title="Penggunaan Produk" icon="📦" activeFilter={null} onSliceClick={()=>{}}/>
            <MiniPieChart data={kPieAll} title="Kebutuhan Terbanyak" icon="🎯" activeFilter={filterKebutuhan} onSliceClick={l=>setFilterKebutuhan(filterKebutuhan===l?null:l)}/>
            <MiniPieChart data={divPieAll} title="Division Sales" icon="🏷️" activeFilter={filterDivision} onSliceClick={l=>setFilterDivision(filterDivision===l?null:l)}/>
          </div>

          {/* ── TABLE (full width) ── */}
          <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(200,200,200,0.6)'}}>
            <div className="px-5 py-3.5 border-b border-gray-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Schedule Piket</span>
                  <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{displayRows.length}</span>
                  {/* Week nav — 2 minggu */}
                  <div className="flex items-center gap-1">
                    <button onClick={()=>setWeekStart(d=>addDays(d,-14))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50">‹‹</button>
                    <button onClick={()=>setWeekStart(d=>addDays(d,-7))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50">‹</button>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.2)'}}>
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-red-700 leading-tight">{wLabel}</span>
                        <span className="text-[10px] text-red-400 leading-tight">{wLabel2}</span>
                      </div>
                      {!isCurrWeek&&<button onClick={()=>setWeekStart(getMonday(new Date()))} className="text-[9px] font-bold px-2 py-1 rounded-lg text-white flex-shrink-0" style={{background:'#dc2626'}}>Ini</button>}
                    </div>
                    <button onClick={()=>setWeekStart(d=>addDays(d,7))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50">›</button>
                    <button onClick={()=>setWeekStart(d=>addDays(d,14))} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200 hover:bg-red-50">››</button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Show Calendar popup */}
                  <button onClick={()=>setShowCalendar(true)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border"
                    style={{background:'rgba(37,99,235,0.06)',borderColor:'rgba(37,99,235,0.25)',color:'#2563eb'}}>
                    📅 Show Calendar
                  </button>
                  {(search||filterDay||filterTamu||filterKebutuhan||filterInstansi||filterDivision||filterKegiatan)&&(
                    <button onClick={()=>{setSearch('');setFilterDay('');setFilterTamu(false);setFilterKebutuhan(null);setFilterInstansi(null);setFilterDivision(null);setFilterKegiatan(null);}}
                      className="px-3 py-2 rounded-xl text-xs font-semibold" style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',color:'#dc2626'}}>
                      ✕ Reset Filter
                    </button>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[160px]">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, instansi, kegiatan..."
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-sm outline-none" style={{background:'rgba(248,250,252,0.9)',border:'1px solid rgba(0,0,0,0.1)'}}/>
                </div>
                <select value={filterDay} onChange={e=>setFilterDay(e.target.value as any)} className="px-3 py-2 rounded-xl text-xs font-semibold outline-none bg-white" style={{border:'1px solid rgba(0,0,0,0.1)'}}>
                  <option value="">Semua Hari</option>{DAYS_OF_WEEK.map(d=><option key={d} value={d}>{d}</option>)}
                </select>
                <select value={filterKegiatan||''} onChange={e=>setFilterKegiatan(e.target.value||null)} className="px-3 py-2 rounded-xl text-xs font-semibold outline-none bg-white" style={{border:'1px solid rgba(0,0,0,0.1)'}}>
                  <option value="">Semua Kegiatan</option>{JENIS_KEGIATAN_LIST.map(j=><option key={j} value={j}>{j}</option>)}
                </select>
                <button onClick={()=>setFilterTamu(f=>!f)} className="px-3 py-2 rounded-xl text-xs font-semibold border"
                  style={filterTamu?{background:'rgba(16,185,129,0.12)',borderColor:'rgba(16,185,129,0.4)',color:'#059669'}:{background:'transparent',borderColor:'rgba(0,0,0,0.1)',color:'#64748b'}}>
                  🏢 Ada Tamu
                </button>
              </div>
              {(filterInstansi||filterKebutuhan||filterDivision||filterKegiatan)&&(
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {filterInstansi&&(<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{background:'rgba(14,165,233,0.1)',border:'1px solid rgba(14,165,233,0.35)'}}><span className="text-[10px] font-bold text-sky-600">🏢 {filterInstansi}</span><button onClick={()=>setFilterInstansi(null)} className="text-sky-400 text-[10px] ml-1">✕</button></div>)}
                  {filterKebutuhan&&(<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.35)'}}><span className="text-[10px] font-bold text-violet-600">🎯 {filterKebutuhan}</span><button onClick={()=>setFilterKebutuhan(null)} className="text-violet-400 text-[10px] ml-1">✕</button></div>)}
                  {filterDivision&&(<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.35)'}}><span className="text-[10px] font-bold text-amber-600">🏷️ {filterDivision}</span><button onClick={()=>setFilterDivision(null)} className="text-amber-400 text-[10px] ml-1">✕</button></div>)}
                  {filterKegiatan&&(<div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{background:`${KEGIATAN_COLORS[filterKegiatan]||'#6366f1'}18`,border:`1px solid ${KEGIATAN_COLORS[filterKegiatan]||'#6366f1'}50`}}><span className="text-[10px] font-bold" style={{color:KEGIATAN_COLORS[filterKegiatan]||'#6366f1'}}>📋 {filterKegiatan}</span><button onClick={()=>setFilterKegiatan(null)} className="text-[10px] ml-1" style={{color:KEGIATAN_COLORS[filterKegiatan]||'#6366f1'}}>✕</button></div>)}
                </div>
              )}
            </div>

            {/* ── Today Banner ── */}
            {(()=>{
              const now=new Date();
              const todayDow=now.getDay();
              const isWeekday=todayDow>=1&&todayDow<=5;
              const todayName=DAYS_OF_WEEK[todayDow-1];
              const todayDc=isWeekday&&todayName?DAY_COLOR[todayName]:null;
              const todayInView=displayRows.find(r=>r.day_date===toKey(now));
              const todayPIC=todayInView?[todayInView.pic_ivp_name,todayInView.pic_ump_name,todayInView.pic_mlds_name].filter(Boolean).join(' / ')||'Belum ada PIC':null;
              if(!isWeekday)return null;
              return(
                <div className="mx-4 mb-3 mt-1 flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{background:`${todayDc?.accent||'#dc2626'}10`,border:`1px solid ${todayDc?.accent||'#dc2626'}30`}}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm flex-shrink-0" style={{background:todayDc?.grad||'linear-gradient(135deg,#dc2626,#991b1b)'}}>
                    {now.getDate()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-black" style={{color:todayDc?.accent||'#dc2626'}}>📍 Hari ini: {todayName}</span>
                      <span className="text-[10px] text-slate-500 font-medium">{now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</span>
                      {todayInView&&todayPIC&&<span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{background:todayDc?.accent||'#dc2626'}}>PIC: {todayPIC}</span>}
                      {!todayInView&&<span className="text-[10px] text-slate-400 italic">Jadwal hari ini tidak tampil di view ini</span>}
                    </div>
                  </div>
                </div>
              );
            })()}
            {loading?(
              <div className="flex justify-center py-16"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/><p className="text-sm text-slate-500">Memuat jadwal...</p></div></div>
            ):(
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse" style={{minWidth:'1100px'}}>
                  <colgroup>
                    <col style={{width:'3%'}}/><col style={{width:'7%'}}/><col style={{width:'9%'}}/><col style={{width:'9%'}}/><col style={{width:'7%'}}/><col style={{width:'6%'}}/>
                    <col style={{width:'12%'}}/><col style={{width:'8%'}}/><col style={{width:'11%'}}/><col style={{width:'10%'}}/><col style={{width:'9%'}}/><col style={{width:'9%'}}/>
                  </colgroup>
                  <thead>
                    <tr style={{background:'rgba(248,250,252,0.9)',borderBottom:'2px solid #e5e7eb'}}>
                      {['No','Tanggal','PIC','Kegiatan','Jam','Produk','Tamu Instansi','Sales','Kebutuhan','Keterangan','Edit By','Action'].map((h,i)=>(
                        <th key={h} className="px-3 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:i<11?'1px solid #e5e7eb':'none'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {displayRows.length===0?(
                      <tr><td colSpan={12} className="text-center py-16 text-gray-400">
                        <div className="text-4xl mb-3">📋</div>
                        <p className="font-semibold">{rows.length===0?'Belum ada jadwal':'Tidak ada hasil filter'}</p>
                        {rows.length===0&&isAdmin&&<p className="text-xs mt-1">Klik "Atur Jadwal" untuk menambahkan jadwal piket</p>}
                      </td></tr>
                    ):displayRows.map((row,idx)=>{
                      const dc=DAY_COLOR[row.day_of_week];
                      const todayKey=toKey(new Date());
                      const todayRow=row.day_date===todayKey;
                      const rowDateMs=new Date(row.day_date+'T00:00:00').getTime();
                      const todayMs=new Date(todayKey+'T00:00:00').getTime();
                      const diffDays=Math.round((rowDateMs-todayMs)/(1000*60*60*24));
                      const isVirtual=row.id.startsWith('virtual-');
                      const rowKg=kegiatanList.filter(k=>k.piket_id===row.id);
                      const kgToShow=rowKg.length>0?rowKg:[null];
                      // Countdown badge
                      const countdownBadge=todayRow?null:diffDays===1?{label:'BESOK',color:'#d97706'}:diffDays>1&&diffDays<=9?{label:`${diffDays} hr lagi`,color:'#64748b'}:null;
                      return kgToShow.map((kg,kgIdx)=>(
                        <tr key={`${row.id}-${kgIdx}`} className="transition-colors hover:bg-gray-50/60"
                          style={{borderBottom:kgIdx===kgToShow.length-1?'2px solid #e5e7eb':'1px solid #f3f4f6',background:todayRow?'rgba(37,99,235,0.06)':isVirtual?'rgba(148,163,184,0.04)':undefined}}>
                          {kgIdx===0&&(
                            <>
                              <td className="px-3 py-3 text-gray-400 text-xs align-middle" rowSpan={kgToShow.length} style={{borderRight:'1px solid #e5e7eb',verticalAlign:'middle'}}>{idx+1}</td>
                              <td className="px-3 py-3 align-middle" rowSpan={kgToShow.length} style={{borderRight:'1px solid #e5e7eb',verticalAlign:'middle'}}>
                                <div className="flex flex-col" style={{borderLeft:`3px solid ${todayRow?dc.accent:dc.accent}`,paddingLeft:'6px'}}>
                                  <span className="text-base font-black leading-tight" style={{color:dc.accent}}>{new Date(row.day_date+'T00:00:00').getDate()}</span>
                                  <span className="text-[9px] font-bold" style={{color:dc.accent}}>{new Date(row.day_date+'T00:00:00').toLocaleDateString('id-ID',{month:'short',year:'2-digit'})}</span>
                                  <span className="text-xs font-bold mt-0.5" style={{color:dc.accent}}>{row.day_of_week}</span>
                                  {todayRow&&<span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white mt-0.5 w-fit" style={{background:dc.accent,boxShadow:`0 2px 6px ${dc.accent}50`}}>📍 HARI INI</span>}
                                  {countdownBadge&&<span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md mt-0.5 w-fit" style={{background:`${countdownBadge.color}15`,color:countdownBadge.color,border:`1px solid ${countdownBadge.color}40`}}>{countdownBadge.label}</span>}
                                </div>
                              </td>
                              <td className="px-3 py-3 align-middle" rowSpan={kgToShow.length} style={{borderRight:'1px solid #e5e7eb',verticalAlign:'middle'}}>
                                <div className="space-y-1">
                                  {([['pic_ivp_name','PTS IVP'],['pic_ump_name','PTS UMP'],['pic_mlds_name','PTS MLDS']] as [keyof PiketRow,string][]).map(([f,team])=>{
                                    const name=row[f] as string|null;if(!name)return null;
                                    const tc=TEAM_LABEL[team];
                                    return(<div key={team} className="flex items-center gap-1.5"><div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{background:tc.dot}}>{name.charAt(0).toUpperCase()}</div><div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate leading-tight">{name}</p><span className="text-[8px] font-bold uppercase" style={{color:tc.text}}>{team}</span></div></div>);
                                  })}
                                  {![row.pic_ivp_name,row.pic_ump_name,row.pic_mlds_name].some(Boolean)&&<span className="text-gray-300 text-xs">—</span>}
                                </div>
                              </td>
                            </>
                          )}
                          {/* Kegiatan — underline, no rounded */}
                          <td className="px-3 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                            {kg?(
                              <span className="text-[10px] font-bold border-b-2 pb-0.5"
                                style={{color:KEGIATAN_COLORS[kg.jenis_kegiatan]||dc.accent,borderBottomColor:KEGIATAN_COLORS[kg.jenis_kegiatan]||dc.accent}}>
                                {kg.jenis_kegiatan}
                              </span>
                            ):<span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {/* Jam — label Mulai/Selesai */}
                          <td className="px-3 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                            {kg?.jam_mulai?(
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1"><span className="text-[8px] font-bold text-slate-400 w-10 flex-shrink-0">Mulai</span><span className="text-xs font-bold text-slate-700">{kg.jam_mulai}</span></div>
                                <div className="flex items-center gap-1"><span className="text-[8px] font-bold text-slate-400 w-10 flex-shrink-0">Selesai</span><span className="text-xs font-bold text-slate-700">{kg.jam_selesai}</span></div>
                              </div>
                            ):<span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {/* Produk — plain text, no rounded */}
                          <td className="px-3 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                            {kg?.produk&&kg.produk.length>0?(
                              <div className="flex flex-col gap-0.5">
                                {kg.produk.map(p=><span key={p} className="text-[10px] font-semibold" style={{color:dc.accent}}>{p}</span>)}
                              </div>
                            ):<span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {/* Tamu */}
                          <td className="px-3 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                            {kg?.tamu_instansi?(<button onClick={()=>setFilterInstansi(filterInstansi===kg.tamu_instansi?null:kg.tamu_instansi!)} className="flex items-center gap-1 hover:opacity-80 text-left"><span>🏢</span><span className="text-xs font-semibold text-slate-700 underline decoration-dotted">{kg.tamu_instansi}</span></button>):<span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {/* Sales */}
                          <td className="px-3 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                            {kg?.nama_sales?(<div className="flex flex-col gap-0.5"><span className="text-[10px] font-bold text-slate-800">{kg.nama_sales}</span>{kg.sales_division&&<span className="text-[9px] text-purple-500 font-semibold">{kg.sales_division}</span>}</div>):<span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {/* Kebutuhan — kolom terpisah */}
                          <td className="px-3 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                            {kg?.jenis_kegiatan==='Demo Product'&&kg.kebutuhan&&kg.kebutuhan.length>0?(
                              <div className="flex flex-col gap-0.5">
                                {kg.kebutuhan.map(k=><span key={k} className="flex items-center gap-1 text-[10px] font-semibold text-slate-600"><span className="w-1 h-1 rounded-full flex-shrink-0" style={{background:dc.accent}}/>{k}</span>)}
                              </div>
                            ):<span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {/* Keterangan — kolom terpisah */}
                          <td className="px-3 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                            {kg?.keterangan?<span className="text-xs text-slate-600 leading-snug">{kg.keterangan}</span>:<span className="text-gray-300 text-xs">—</span>}
                          </td>
                          {/* Edit By */}
                          {kgIdx===0&&(
                            <td className="px-3 py-3 align-middle" rowSpan={kgToShow.length} style={{borderRight:'1px solid #e5e7eb',verticalAlign:'middle'}}>
                              {row.edited_by_name
                                ?<div className="flex items-center gap-1"><span className="text-[9px]">✏️</span><span className="text-[10px] font-semibold text-slate-600 leading-tight">{row.edited_by_name}</span></div>
                                :<span className="text-gray-300 text-xs">—</span>}
                            </td>
                          )}
                          {/* Action */}
                          {kgIdx===0&&(
                            <td className="px-3 py-3 align-middle text-center" rowSpan={kgToShow.length} style={{verticalAlign:'middle'}}>
                              <button
                                onClick={()=>isVirtual?handleFillVirtual(row):setFillDetail(row)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:scale-105"
                                style={{background:dc.grad,boxShadow:`0 2px 8px ${dc.accent}30`}}>
                                ✍️ Isi
                              </button>
                            </td>
                          )}
                        </tr>
                      ));
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-2.5" style={{borderTop:'1px solid #e5e7eb'}}>
                  <span className="text-[10px] text-gray-400">{displayRows.length} hari kerja ditampilkan</span>
                  <span className="text-[10px] text-gray-400">{rows.length} total · {kegiatanList.filter(k=>displayRows.some(r=>r.id===k.piket_id)).length} kegiatan</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {showSchedule&&isAdmin&&<ScheduleModal weekStart={weekStart} users={ptUsers} currentUser={currentUser} onClose={()=>setShowSchedule(false)} onSaved={fetchData}/>}
        {fillDetail&&<FillDetailModal row={fillDetail} onClose={()=>setFillDetail(null)} onSaved={fetchData}/>}
        {showCalendar&&<MiniCalendarPopup allRows={allRows} onClose={()=>setShowCalendar(false)}/>}
      </div>

      <style jsx>{`
        @keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        select option{background:#ffffff;color:#1e293b}
      `}</style>
    </div>
  );
}
