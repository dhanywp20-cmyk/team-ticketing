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
const DAY_EN: Record<DayOfWeek,string> = {Senin:'MON',Selasa:'TUE',Rabu:'WED',Kamis:'THU',Jumat:'FRI'};
const DAY_COLOR: Record<DayOfWeek,{accent:string;light:string;grad:string}> = {
  Senin:  {accent:'#dc2626',light:'rgba(220,38,38,0.08)',  grad:'linear-gradient(135deg,#dc2626,#991b1b)'},
  Selasa: {accent:'#d97706',light:'rgba(217,119,6,0.08)',  grad:'linear-gradient(135deg,#d97706,#92400e)'},
  Rabu:   {accent:'#2563eb',light:'rgba(37,99,235,0.08)',  grad:'linear-gradient(135deg,#2563eb,#1e3a8a)'},
  Kamis:  {accent:'#7c3aed',light:'rgba(124,58,237,0.08)', grad:'linear-gradient(135deg,#7c3aed,#4c1d95)'},
  Jumat:  {accent:'#059669',light:'rgba(5,150,105,0.08)',  grad:'linear-gradient(135deg,#059669,#064e3b)'},
};
const TEAM_LABEL: Record<string,{dot:string;text:string;bg:string}> = {
  'PTS IVP':  {dot:'#dc2626',text:'#991b1b',bg:'rgba(220,38,38,0.1)'},
  'PTS UMP':  {dot:'#2563eb',text:'#1e40af',bg:'rgba(37,99,235,0.1)'},
  'PTS MLDS': {dot:'#7c3aed',text:'#6d28d9',bg:'rgba(124,58,237,0.1)'},
};
function teamTypeToLabel(tt:string):string {
  if (tt==='Team PTS UMP') return 'PTS UMP';
  if (tt==='Team PTS MLDS') return 'PTS MLDS';
  return 'PTS IVP';
}
const KEBUTUHAN_LIST = [
  'Meeting Room','Auditorium','Command Center','Digital Signage Kiosk',
  'Digital Signage Custom','Paging System','Background Music','Signage LED Outdoor',
  'Smartclass Room','Ballroom','Camera ETLE','Conference Room',
  'Paperless System','Delegate System','Camera Tracking',
];
const SALES_DIVISIONS = [
  'IVP','MLDS','HAVS','Enterprise','DEC','ICS','POJ','VOJ','LOCOS',
  'VISIONMEDIA','UMP','BISOL','KIMS','IDC','IOCMEDAN','IOCPekanbaru',
  'IOCBandung','IOCJATENG','MVISEMARANG','POSSurabaya','IOCSurabaya',
  'IOCBali','SGP','SGP1','SGP2','OSS',
];
const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRow {
  id:string; full_name:string; username:string;
  team_type?:string; role:string;
}
interface PiketRow {
  id:string; week_start:string; day_of_week:DayOfWeek; day_date:string;
  pic_ivp_id:string|null; pic_ivp_name:string|null;
  pic_ump_id:string|null; pic_ump_name:string|null;
  pic_mlds_id:string|null; pic_mlds_name:string|null;
  tamu_instansi:string|null; kebutuhan:string[]; foto_url:string|null;
  created_at:string; updated_at:string;
}

interface TamuDetailRow {
  id: string;
  piket_id: string;
  tamu_instansi: string | null;
  nama_sales: string | null;
  sales_division: string | null;
  kebutuhan: string[];
  foto_url: string | null;
  created_at: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMonday(d:Date):Date {
  const r=new Date(d),day=r.getDay();
  r.setDate(r.getDate()-day+(day===0?-6:1));r.setHours(0,0,0,0);return r;
}
function addDays(d:Date,n:number):Date{const r=new Date(d);r.setDate(r.getDate()+n);return r;}
function toKey(d:Date):string{return d.toISOString().split('T')[0];}
function getDayDate(ws:Date,day:DayOfWeek):Date{return addDays(ws,DAYS_OF_WEEK.indexOf(day));}
function isToday(d:Date):boolean{const t=new Date();return d.getFullYear()===t.getFullYear()&&d.getMonth()===t.getMonth()&&d.getDate()===t.getDate();}

function getWeekKey(dateStr:string):string {
  const d=new Date(dateStr+'T00:00:00');
  const mon=getMonday(d);
  return toKey(mon);
}
function getMonthKey(dateStr:string):string { return dateStr.slice(0,7); }
function getYearKey(dateStr:string):string { return dateStr.slice(0,4); }

// ─── Donut Pie Chart ──────────────────────────────────────────────────────────

function MiniPieChart({data,title,icon,activeFilter,onSliceClick}:{
  data:{label:string;value:number;color:string}[];
  title:string;icon:string;
  activeFilter?:string|null;
  onSliceClick?:(label:string)=>void;
}) {
  const [hov,setHov]=useState<number|null>(null);
  const total=data.reduce((s,d)=>s+d.value,0);
  if(total===0) return(
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{icon} {title}</p>
      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
    </div>
  );
  let cum=-Math.PI/2;
  const cx=60,cy=60,r=50,ir=28;
  const slices=data.map((d,i)=>{
    const angle=(d.value/total)*2*Math.PI;
    if(data.length===1){cum+=angle;return{...d,path:'',full:true,i};}
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum);
    const x2=cx+r*Math.cos(cum+angle),y2=cy+r*Math.sin(cum+angle);
    const xi1=cx+ir*Math.cos(cum),yi1=cy+ir*Math.sin(cum);
    const xi2=cx+ir*Math.cos(cum+angle),yi2=cy+ir*Math.sin(cum+angle);
    const lg=angle>Math.PI?1:0;
    const path=`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${lg} 0 ${xi1} ${yi1} Z`;
    cum+=angle;return{...d,path,full:false,i};
  });
  return(
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map(s=>s.full?(
            <g key={s.i} style={{cursor:onSliceClick?'pointer':'default'}} onClick={()=>onSliceClick&&onSliceClick(s.label)} onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
              <circle cx={60} cy={60} r={50} fill={s.color} opacity={hov===null||hov===s.i?1:0.45} style={{filter:hov===s.i||activeFilter===s.label?`drop-shadow(0 0 5px ${s.color})`:'none'}}/>
              <circle cx={60} cy={60} r={28} fill="white"/>
            </g>
          ):(
            <path key={s.i} d={s.path} fill={s.color} opacity={hov===null||hov===s.i?1:0.45}
              style={{cursor:onSliceClick?'pointer':'default',transition:'opacity 0.15s',filter:hov===s.i||activeFilter===s.label?`drop-shadow(0 0 5px ${s.color})`:'none'}}
              onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}
              onClick={()=>onSliceClick&&onSliceClick(s.label)}/>
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
                onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}
                onClick={()=>onSliceClick&&onSliceClick(s.label)}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
                <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
                <span className="text-[10px] font-bold flex-shrink-0" style={{color:s.color}}>{s.value}</span>
                {isActive&&<span className="text-[9px] font-bold text-purple-600 flex-shrink-0">✓</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

function BarChart({data,title,icon,color,yLabel}:{
  data:{label:string;value:number}[];
  title:string;icon:string;color:string;yLabel?:string;
}) {
  const [hov,setHov]=useState<number|null>(null);
  const max=Math.max(...data.map(d=>d.value),1);
  return(
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
        {yLabel&&<span className="text-[9px] text-gray-400 font-medium">{yLabel}</span>}
      </div>
      <div className="flex items-end gap-1.5 h-[100px]">
        {data.map((d,i)=>{
          const pct=Math.round((d.value/max)*100);
          const isHov=hov===i;
          return(
            <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-0"
              onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(null)}>
              {isHov&&<span className="text-[9px] font-black rounded px-1 py-0.5 text-white shadow-sm" style={{background:color}}>{d.value}</span>}
              {!isHov&&<span className="text-[9px] font-bold text-slate-400">{d.value||''}</span>}
              <div className="w-full rounded-t-md transition-all duration-200" style={{
                height:`${Math.max(pct,d.value>0?4:0)}px`,
                background:isHov?color:`${color}99`,
                minHeight:d.value>0?'4px':0,
              }}/>
              <span className="text-[8px] text-gray-400 font-medium truncate w-full text-center leading-tight">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Tamu Instansi Pie Chart ──────────────────────────────────────────────────

function TamuInstansiPie({tamuDetails,activeFilter,onSliceClick}:{
  tamuDetails:TamuDetailRow[];activeFilter?:string|null;onSliceClick?:(label:string)=>void;
}) {
  const map:Record<string,number>={};
  tamuDetails.forEach(td=>{if(td.tamu_instansi){map[td.tamu_instansi]=(map[td.tamu_instansi]||0)+1;}});
  const data=Object.entries(map).sort(([,a],[,b])=>b-a).slice(0,12).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));
  return <MiniPieChart data={data} title="Tamu per Instansi" icon="🏢" activeFilter={activeFilter} onSliceClick={onSliceClick}/>;
}

// ─── Tamu Summary Cards ───────────────────────────────────────────────────────

function TamuSummaryCards({allRows,tamuDetails}:{allRows:PiketRow[];tamuDetails:TamuDetailRow[]}) {
  const now=new Date();
  const thisWeek=toKey(getMonday(now));
  const thisMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const thisYear=String(now.getFullYear());

  // Build a map piket_id -> day_date for joining
  const piketDateMap:Record<string,string>={};
  allRows.forEach(r=>{piketDateMap[r.id]=r.day_date;});

  const tdForPeriod=(filter:(d:string)=>boolean)=>tamuDetails.filter(td=>{
    const d=piketDateMap[td.piket_id];
    return d&&filter(d);
  });

  const weekTd  = tdForPeriod(d=>getWeekKey(d)===thisWeek);
  const monthTd = tdForPeriod(d=>d.startsWith(thisMonth));
  const yearTd  = tdForPeriod(d=>d.startsWith(thisYear));
  const allTd   = tamuDetails;

  // Count unique piket days that have at least one tamu entry for the period
  const piketDaysInPeriod=(rows:PiketRow[])=>rows.length;
  const weekRows  = allRows.filter(r=>getWeekKey(r.day_date)===thisWeek);
  const monthRows = allRows.filter(r=>r.day_date?.startsWith(thisMonth));
  const yearRows  = allRows.filter(r=>r.day_date?.startsWith(thisYear));

  const countTamu=(td:TamuDetailRow[])=>td.filter(t=>t.tamu_instansi).length;
  const countK   =(td:TamuDetailRow[])=>td.filter(t=>t.kebutuhan&&t.kebutuhan.length>0).length;

  const cards=[
    {period:'Minggu Ini',tamu:countTamu(weekTd),kebutuhan:countK(weekTd),total:piketDaysInPeriod(weekRows),color:'#2563eb',grad:'linear-gradient(135deg,#2563eb,#1e40af)',shadow:'rgba(37,99,235,0.3)'},
    {period:'Bulan Ini',tamu:countTamu(monthTd),kebutuhan:countK(monthTd),total:piketDaysInPeriod(monthRows),color:'#7c3aed',grad:'linear-gradient(135deg,#7c3aed,#4c1d95)',shadow:'rgba(124,58,237,0.3)'},
    {period:'Tahun '+thisYear,tamu:countTamu(yearTd),kebutuhan:countK(yearTd),total:piketDaysInPeriod(yearRows),color:'#059669',grad:'linear-gradient(135deg,#059669,#047857)',shadow:'rgba(5,150,105,0.3)'},
    {period:'Total Semua',tamu:countTamu(allTd),kebutuhan:countK(allTd),total:allRows.length,color:'#dc2626',grad:'linear-gradient(135deg,#dc2626,#991b1b)',shadow:'rgba(220,38,38,0.3)'},
  ];

  return(
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c=>(
        <div key={c.period} className="rounded-2xl p-4 relative overflow-hidden" style={{background:'rgba(255,255,255,0.95)',border:`1px solid ${c.color}25`,backdropFilter:'blur(10px)',boxShadow:`0 4px 16px ${c.shadow}`}}>
          <div className="absolute right-3 top-2 text-3xl opacity-10 select-none">🏢</div>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{color:c.color}}>{c.period}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-medium">Total Hari</span>
              <span className="text-sm font-black" style={{color:c.color}}>{c.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-medium">🏢 Ada Tamu</span>
              <span className="text-sm font-black text-emerald-600">{c.tamu}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 font-medium">🎯 Kebutuhan</span>
              <span className="text-sm font-black text-amber-600">{c.kebutuhan}</span>
            </div>
          </div>
          <div className="mt-2.5 h-1 rounded-full overflow-hidden" style={{background:`${c.color}15`}}>
            <div className="h-full rounded-full transition-all" style={{width:`${c.total>0?Math.min((c.tamu/c.total)*100,100):0}%`,background:c.grad}}/>
          </div>
          <p className="text-[8px] text-gray-400 mt-0.5">{c.total>0?Math.round((c.tamu/c.total)*100):0}% ada tamu</p>
        </div>
      ))}
    </div>
  );
}

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({allRows,calMonth,setCalMonth,selDay,setSelDay}:{
  allRows:PiketRow[];calMonth:Date;setCalMonth:(d:Date)=>void;
  selDay:string|null;setSelDay:(s:string|null)=>void;
}) {
  const y=calMonth.getFullYear(),m=calMonth.getMonth();
  const firstDay=new Date(y,m,1).getDay();
  const daysInMonth=new Date(y,m+1,0).getDate();
  const today=toKey(new Date());
  const getRowsForDay=(day:number)=>{
    const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return allRows.filter(r=>r.day_date===ds);
  };
  const totalMonth=allRows.filter(r=>r.day_date?.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length;
  const selRows=selDay?allRows.filter(r=>r.day_date===selDay):[];

  return(
    <div className="flex-shrink-0 space-y-3" style={{width:320}}>
      <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.08)',backdropFilter:'blur(12px)'}}>
        <div className="px-4 py-3 flex items-center justify-between" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
          <button onClick={()=>setCalMonth(new Date(y,m-1,1))} className="text-white/80 hover:text-white font-bold text-lg px-2 py-0.5 rounded-lg hover:bg-white/10 transition-all">‹</button>
          <div className="text-center">
            <p className="text-white font-bold text-sm">{MONTH_NAMES[m]} {y}</p>
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
          <div className="grid grid-cols-7 gap-0.5">
            {Array.from({length:(firstDay===0?6:firstDay-1)}).map((_,i)=><div key={`e-${i}`}/>)}
            {Array.from({length:daysInMonth},(_,i)=>i+1).map(day=>{
              const ds=`${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const dayRows=getRowsForDay(day);
              const cnt=dayRows.length;
              const isSel=selDay===ds;
              const isT=ds===today;
              return(
                <button key={day} onClick={()=>setSelDay(isSel?null:ds)}
                  className="relative aspect-square flex flex-col items-center justify-center rounded-lg text-[11px] font-semibold transition-all"
                  style={{background:isSel?'#dc2626':isT?'rgba(220,38,38,0.12)':'transparent',color:isSel?'white':isT?'#dc2626':'#374151',fontWeight:isT||isSel?800:600}}>
                  {day}
                  {cnt>0&&<span className="absolute bottom-0.5 w-1 h-1 rounded-full" style={{background:isSel?'white':'#dc2626'}}/>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selDay&&selRows.length>0&&(
        <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.08)',backdropFilter:'blur(12px)'}}>
          <div className="px-4 py-2.5 flex items-center justify-between" style={{background:'linear-gradient(135deg,#dc2626,#991b1b)'}}>
            <div>
              <p className="text-white font-bold text-xs">📅 {new Date(selDay+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}</p>
              <p className="text-white/70 text-[10px]">Summary Piket</p>
            </div>
            <button onClick={()=>setSelDay(null)} className="text-white/70 hover:text-white text-xs font-bold bg-white/15 hover:bg-white/25 px-2 py-1 rounded-lg transition-all">✕</button>
          </div>
          <div className="p-3 space-y-3">
            {selRows.map(row=>{
              const dc=DAY_COLOR[row.day_of_week];
              return(
                <div key={row.id} className="rounded-xl p-3 space-y-2" style={{background:dc.light,border:`1px solid ${dc.accent}25`}}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:dc.accent}}/>
                    <span className="text-xs font-black" style={{color:dc.accent}}>{row.day_of_week}</span>
                  </div>
                  <div className="space-y-1">
                    {([['pic_ivp_name','PTS IVP'],['pic_ump_name','PTS UMP'],['pic_mlds_name','PTS MLDS']] as [keyof PiketRow,string][]).map(([f,team])=>{
                      const name=row[f] as string|null;
                      const tc=TEAM_LABEL[team];
                      return name?(
                        <div key={team} className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{background:tc.dot}}>{name.charAt(0).toUpperCase()}</div>
                          <div><p className="text-[10px] font-bold text-slate-800 leading-tight">{name}</p><span className="text-[8px] font-bold uppercase" style={{color:tc.text}}>{team}</span></div>
                        </div>
                      ):null;
                    })}
                  </div>
                  {row.tamu_instansi&&<div className="flex items-center gap-1 text-[10px] text-slate-600"><span>🏢</span><span className="font-semibold">{row.tamu_instansi}</span></div>}
                  {row.kebutuhan&&row.kebutuhan.length>0&&(
                    <div className="flex flex-wrap gap-1">
                      {row.kebutuhan.map(k=><span key={k} className="text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{background:dc.accent}}>{k}</span>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {selDay&&selRows.length===0&&(
        <div className="rounded-2xl p-4 text-center" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.08)',backdropFilter:'blur(12px)'}}>
          <p className="text-sm text-slate-400">Tidak ada jadwal pada tanggal ini</p>
          <p className="text-[10px] text-slate-300 mt-1">{new Date(selDay+'T00:00:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long'})}</p>
        </div>
      )}
    </div>
  );
}

// ─── Fill Detail Modal ────────────────────────────────────────────────────────

interface TamuEntry {
  id?: string; // existing row id
  tamu_instansi: string;
  nama_sales: string;
  sales_division: string;
  kebutuhan: string[];
  foto_url: string;
  uploading?: boolean;
}
function emptyTamu(): TamuEntry { return {tamu_instansi:'',nama_sales:'',sales_division:'',kebutuhan:[],foto_url:''}; }

function FillDetailModal({row,onClose,onSaved}:{row:PiketRow;onClose:()=>void;onSaved:()=>void}) {
  const [entries,setEntries]=useState<TamuEntry[]>([emptyTamu()]);
  const [loadingEntries,setLoadingEntries]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<{type:'success'|'error';msg:string}|null>(null);
  const fileRefs=useRef<(HTMLInputElement|null)[]>([]);
  const dc=DAY_COLOR[row.day_of_week];
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3500);};

  // Load existing tamu detail rows
  useEffect(()=>{
    const load=async()=>{
      setLoadingEntries(true);
      const{data}=await supabase.from('piket_tamu_detail')
        .select('*').eq('piket_id',row.id).order('created_at');
      if(data&&data.length>0){
        setEntries((data as TamuDetailRow[]).map(d=>({
          id:d.id,
          tamu_instansi:d.tamu_instansi||'',
          nama_sales:d.nama_sales||'',
          sales_division:d.sales_division||'',
          kebutuhan:d.kebutuhan||[],
          foto_url:d.foto_url||'',
        })));
      }
      setLoadingEntries(false);
    };
    load();
  },[row.id]);

  const updateEntry=(idx:number,patch:Partial<TamuEntry>)=>setEntries(p=>p.map((e,i)=>i===idx?{...e,...patch}:e));
  const toggleK=(idx:number,k:string)=>setEntries(p=>p.map((e,i)=>i===idx?{...e,kebutuhan:e.kebutuhan.includes(k)?e.kebutuhan.filter(x=>x!==k):[...e.kebutuhan,k]}:e));
  const addEntry=()=>setEntries(p=>[...p,emptyTamu()]);
  const removeEntry=(idx:number)=>setEntries(p=>p.filter((_,i)=>i!==idx));

  const handleUpload=async(file:File,idx:number)=>{
    updateEntry(idx,{uploading:true});
    try{
      const ext=file.name.split('.').pop()?.toLowerCase()||'jpg';
      const validExt=['jpg','jpeg','png','webp'].includes(ext)?ext:'jpg';
      const path=`piket-photos/${row.id}_tamu${idx}_${Date.now()}.${validExt}`;
      const{error:upErr}=await supabase.storage.from('piket-photos').upload(path,file,{upsert:true,contentType:file.type||'image/jpeg'});
      if(upErr){
        if(upErr.message?.toLowerCase().includes('row-level security')||upErr.message?.toLowerCase().includes('policy')){
          throw new Error('Upload gagal: Pastikan bucket "piket-photos" ada dan policy INSERT diizinkan.');
        }
        throw upErr;
      }
      const{data:urlData}=supabase.storage.from('piket-photos').getPublicUrl(path);
      updateEntry(idx,{foto_url:urlData.publicUrl,uploading:false});
      notify('success','Foto berhasil diupload!');
    }catch(e:any){
      notify('error',e.message||'Upload gagal');
      updateEntry(idx,{uploading:false});
    }
  };

  const handleSave=async()=>{
    setSaving(true);
    try{
      // Delete all existing rows for this piket, then re-insert
      await supabase.from('piket_tamu_detail').delete().eq('piket_id',row.id);
      const toInsert=entries
        .filter(e=>e.tamu_instansi||e.nama_sales||e.kebutuhan.length>0||e.foto_url)
        .map(e=>({
          piket_id:row.id,
          tamu_instansi:e.tamu_instansi||null,
          nama_sales:e.nama_sales||null,
          sales_division:e.sales_division||null,
          kebutuhan:e.kebutuhan,
          foto_url:e.foto_url||null,
          created_at:new Date().toISOString(),
        }));
      if(toInsert.length>0){
        const{error}=await supabase.from('piket_tamu_detail').insert(toInsert);
        if(error) throw error;
      }
      // Also update piket_schedules legacy fields with first entry for backward compat
      const first=toInsert[0];
      await supabase.from('piket_schedules').update({
        tamu_instansi:first?.tamu_instansi||null,
        kebutuhan:first?.kebutuhan||[],
        foto_url:first?.foto_url||null,
        updated_at:new Date().toISOString()
      }).eq('id',row.id);
      notify('success','Data tersimpan!');
      setTimeout(()=>{onSaved();onClose();},700);
    }catch(e:any){
      notify('error','Gagal: '+e.message);
    }
    setSaving(false);
  };

  return(
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 overflow-y-auto"
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4"
        style={{animation:'scale-in 0.25s ease-out',border:`1.5px solid ${dc.accent}40`}}>
        <div className="px-6 py-5 rounded-t-2xl" style={{background:dc.grad}}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">✍️ Detail Piket — {row.day_of_week}</h2>
              <p className="text-white/70 text-xs mt-0.5">
                {new Date(row.day_date+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})} ·&nbsp;
                {[row.pic_ivp_name,row.pic_ump_name,row.pic_mlds_name].filter(Boolean).join(' / ')||'Belum ada PIC'}
              </p>
            </div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
        {toast&&(
          <div className={`mx-5 mt-4 px-4 py-3 rounded-xl text-sm font-semibold flex items-start gap-2 ${toast.type==='success'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>
            <span className="flex-shrink-0">{toast.type==='success'?'✅':'❌'}</span>
            <span className="leading-snug">{toast.msg}</span>
          </div>
        )}
        <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto">
          {loadingEntries?(
            <div className="flex justify-center py-10"><div className="w-6 h-6 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/></div>
          ):(
            entries.map((entry,idx)=>(
              <div key={idx} className="rounded-2xl overflow-hidden" style={{border:`1.5px solid ${dc.accent}30`,background:'rgba(255,255,255,0.7)'}}>
                {/* Entry header */}
                <div className="flex items-center justify-between px-4 py-2.5" style={{background:dc.light,borderBottom:`1px solid ${dc.accent}20`}}>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white flex-shrink-0" style={{background:dc.grad}}>{idx+1}</div>
                    <span className="text-xs font-bold" style={{color:dc.accent}}>Tamu {idx+1}</span>
                  </div>
                  {entries.length>1&&(
                    <button onClick={()=>removeEntry(idx)} className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-lg hover:bg-red-50" title="Hapus tamu ini">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  )}
                </div>
                <div className="p-4 space-y-4">
                  {/* Tamu Instansi */}
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase" style={{color:'#94a3b8'}}>🏢 Tamu Instansi</label>
                    <input value={entry.tamu_instansi} onChange={e=>updateEntry(idx,{tamu_instansi:e.target.value})}
                      className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                      style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}}
                      placeholder="Nama instansi / perusahaan tamu..."/>
                  </div>
                  {/* Nama Sales + Division */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase" style={{color:'#94a3b8'}}>👤 Nama Sales</label>
                      <input value={entry.nama_sales} onChange={e=>updateEntry(idx,{nama_sales:e.target.value})}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none transition-all"
                        style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(0,0,0,0.12)'}}
                        placeholder="Nama sales..."/>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase" style={{color:'#94a3b8'}}>🏷️ Division</label>
                      <select value={entry.sales_division} onChange={e=>updateEntry(idx,{sales_division:e.target.value})}
                        className="w-full rounded-xl px-3 py-2.5 text-sm outline-none bg-white transition-all"
                        style={{border:'1px solid rgba(0,0,0,0.12)'}}>
                        <option value="">— Pilih Division —</option>
                        {SALES_DIVISIONS.map(d=><option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                  </div>
                  {/* Kebutuhan */}
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase" style={{color:'#94a3b8'}}>🎯 Kebutuhan <span className="font-normal normal-case text-slate-400">(bisa lebih dari satu)</span></label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {KEBUTUHAN_LIST.map(k=>{
                        const checked=entry.kebutuhan.includes(k);
                        return(
                          <button key={k} type="button" onClick={()=>toggleK(idx,k)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-left transition-all"
                            style={checked?{borderColor:dc.accent,background:`${dc.accent}12`,color:dc.accent}:{borderColor:'rgba(0,0,0,0.1)',background:'rgba(255,255,255,0.5)',color:'#64748b'}}>
                            <div className="w-3.5 h-3.5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={checked?{borderColor:dc.accent,background:dc.accent}:{borderColor:'#d1d5db',background:'white'}}>
                              {checked&&<svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                            </div>
                            <span className="text-xs font-semibold leading-tight flex-1">{k}</span>
                          </button>
                        );
                      })}
                    </div>
                    {entry.kebutuhan.length>0&&(
                      <div className="mt-2 p-2.5 rounded-xl flex flex-wrap gap-1.5" style={{background:'rgba(0,0,0,0.03)',border:'1px solid rgba(0,0,0,0.08)'}}>
                        {entry.kebutuhan.map(k=>(
                          <span key={k} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white" style={{background:dc.grad}}>
                            {k}<button onClick={()=>toggleK(idx,k)} className="ml-0.5 opacity-80 hover:opacity-100">✕</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Foto */}
                  <div>
                    <label className="block text-[10px] font-bold mb-1.5 tracking-widest uppercase" style={{color:'#94a3b8'}}>📷 Foto <span className="font-normal normal-case text-slate-400">(opsional)</span></label>
                    {entry.foto_url?(
                      <div className="relative inline-block">
                        <img src={entry.foto_url} alt="Foto" className="w-28 h-28 rounded-xl object-cover border border-slate-200 shadow-sm"/>
                        <button onClick={()=>updateEntry(idx,{foto_url:''})} className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-600 shadow">✕</button>
                      </div>
                    ):(
                      <button onClick={()=>fileRefs.current[idx]?.click()} disabled={entry.uploading}
                        className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed text-slate-500 transition-all w-full text-xs font-semibold disabled:opacity-50"
                        style={{borderColor:'rgba(0,0,0,0.15)'}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=dc.accent;}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(0,0,0,0.15)';}}>
                        {entry.uploading
                          ?<><div className="w-3.5 h-3.5 border-2 border-t-slate-500 border-slate-200 rounded-full animate-spin"/>Mengupload...</>
                          :<><span className="text-base">📷</span>Klik untuk upload foto</>}
                      </button>
                    )}
                    <input ref={el=>{fileRefs.current[idx]=el;}} type="file" accept="image/*" className="hidden"
                      onChange={e=>{const f=e.target.files?.[0];if(f)handleUpload(f,idx);e.target.value='';}}/>
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Add tamu button */}
          {!loadingEntries&&(
            <button onClick={addEntry}
              className="w-full py-3 rounded-2xl border-2 border-dashed text-sm font-bold transition-all flex items-center justify-center gap-2"
              style={{borderColor:dc.accent+'60',color:dc.accent,background:`${dc.accent}08`}}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=`${dc.accent}14`;}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background=`${dc.accent}08`;}}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Tambah Tamu Lain
            </button>
          )}
          <p className="text-[9px] text-slate-400">⚠️ Pastikan bucket <code className="bg-slate-100 px-1 rounded">piket-photos</code> ada di Supabase Storage dengan policy INSERT untuk authenticated users.</p>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all" style={{background:'rgba(255,255,255,0.95)',color:'#64748b',border:'1px solid rgba(0,0,0,0.12)'}}>Batal</button>
          <button onClick={handleSave} disabled={saving||loadingEntries}
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

// ─── Schedule Modal (admin only) ──────────────────────────────────────────────

function ScheduleModal({weekStart,users,onClose,onSaved}:{weekStart:Date;users:UserRow[];onClose:()=>void;onSaved:()=>void}) {
  const [assign,setAssign]=useState<Record<DayOfWeek,{ivp:string;ump:string;mlds:string}>>(()=>{
    const r:any={};DAYS_OF_WEEK.forEach(d=>{r[d]={ivp:'',ump:'',mlds:''};});return r;
  });
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [toast,setToast]=useState<{type:'success'|'error';msg:string}|null>(null);
  const notify=(type:'success'|'error',msg:string)=>{setToast({type,msg});setTimeout(()=>setToast(null),3000);};
  const wk=toKey(weekStart);

  const ivpUsers=users.filter(u=>u.team_type==='Team PTS');
  const umpUsers=users.filter(u=>u.team_type==='Team PTS UMP');
  const mldsUsers=users.filter(u=>u.team_type==='Team PTS MLDS');

  useEffect(()=>{
    const load=async()=>{
      setLoading(true);
      const{data}=await supabase.from('piket_schedules').select('*').eq('week_start',wk);
      if(data&&data.length>0){
        const na:any={};DAYS_OF_WEEK.forEach(d=>{na[d]={ivp:'',ump:'',mlds:''};});
        (data as PiketRow[]).forEach(s=>{na[s.day_of_week]={ivp:s.pic_ivp_id||'',ump:s.pic_ump_id||'',mlds:s.pic_mlds_id||''};});
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
        const ivpU=users.find(u=>u.id===a.ivp);
        const umpU=users.find(u=>u.id===a.ump);
        const mldsU=users.find(u=>u.id===a.mlds);
        const{error}=await supabase.from('piket_schedules').upsert({
          week_start:wk,
          day_of_week:day,
          day_date:toKey(getDayDate(weekStart,day)),
          pic_ivp_id:a.ivp||null,
          pic_ivp_name:ivpU?.full_name||null,
          pic_ump_id:a.ump||null,
          pic_ump_name:umpU?.full_name||null,
          pic_mlds_id:a.mlds||null,
          pic_mlds_name:mldsU?.full_name||null,
          created_at:new Date().toISOString(),
          updated_at:new Date().toISOString(),
        },{onConflict:'week_start,day_of_week',ignoreDuplicates:false});
        if(error){
          notify('error',`Gagal simpan ${day}: ${error.message}`);
          setSaving(false);
          return;
        }
      }
      notify('success','Jadwal berhasil disimpan!');
      setTimeout(()=>{onSaved();onClose();},800);
    }catch(e:any){notify('error','Gagal: '+e.message);}
    setSaving(false);
  };

  const wLabel=`${weekStart.toLocaleDateString('id-ID',{day:'2-digit',month:'long'})} – ${addDays(weekStart,4).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}`;

  return(
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
              return(
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
                    {([['ivp','PTS IVP',ivpUsers],['ump','PTS UMP',umpUsers],['mlds','PTS MLDS',mldsUsers]] as [string,string,UserRow[]][]).map(([key,label,opts])=>{
                      const tc=TEAM_LABEL[label];
                      return(
                        <div key={key}>
                          <div className="flex items-center gap-1.5 mb-1.5"><div className="w-2 h-2 rounded-full" style={{background:tc.dot}}/><label className="text-[10px] font-bold uppercase tracking-widest" style={{color:tc.text}}>{label}</label></div>
                          <select value={(assign[day] as any)[key]} onChange={e=>setAssign(p=>({...p,[day]:{...p[day],[key]:e.target.value}}))}
                            className="w-full rounded-xl px-3 py-2 text-xs outline-none bg-white" style={{border:`1px solid ${tc.dot}30`}}>
                            <option value="">— Belum ditentukan —</option>
                            {opts.map(u=><option key={u.id} value={u.id}>{u.full_name}</option>)}
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
  const [currentUser,setCurrentUser]=useState<any>(null);
  const [weekStart,setWeekStart]=useState<Date>(()=>getMonday(new Date()));
  const [rows,setRows]=useState<PiketRow[]>([]);
  const [allRows,setAllRows]=useState<PiketRow[]>([]);
  const [tamuDetails,setTamuDetails]=useState<TamuDetailRow[]>([]);
  const [ptUsers,setPtUsers]=useState<UserRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [showSchedule,setShowSchedule]=useState(false);
  const [fillDetail,setFillDetail]=useState<PiketRow|null>(null);
  const [photoZoom,setPhotoZoom]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [filterDay,setFilterDay]=useState<DayOfWeek|''>('');
  const [filterTamu,setFilterTamu]=useState(false);
  const [filterKebutuhan,setFilterKebutuhan]=useState<string|null>(null);
  const [calMonth,setCalMonth]=useState<Date>(()=>new Date());
  const [selDay,setSelDay]=useState<string|null>(null);
  const [filterInstansi,setFilterInstansi]=useState<string|null>(null);
  const [filterDivision,setFilterDivision]=useState<string|null>(null);
  const wk=toKey(weekStart);

  useEffect(()=>{
    try{
      const saved=localStorage.getItem('currentUser');
      if(saved)setCurrentUser(JSON.parse(saved));
    }catch{}
  },[]);

  const isAdmin=currentUser&&['admin','superadmin'].includes(currentUser.role?.toLowerCase()||'');

  const fetchData=useCallback(async()=>{
    setLoading(true);
    const[wRes,aRes,uRes,tdRes]=await Promise.all([
      supabase.from('piket_schedules').select('*').eq('week_start',wk),
      supabase.from('piket_schedules').select('id,day_date,week_start,day_of_week,pic_ivp_name,pic_ump_name,pic_mlds_name,tamu_instansi,kebutuhan'),
      supabase.from('users').select('id,full_name,username,team_type,role')
        .in('team_type',['Team PTS','Team PTS UMP','Team PTS MLDS'])
        .order('full_name'),
      supabase.from('piket_tamu_detail').select('*').order('created_at'),
    ]);
    if(wRes.data)setRows(wRes.data as PiketRow[]);
    if(aRes.data)setAllRows(aRes.data as PiketRow[]);
    if(uRes.data)setPtUsers(uRes.data as UserRow[]);
    if(tdRes.data)setTamuDetails(tdRes.data as TamuDetailRow[]);
    setLoading(false);
  },[wk]);

  useEffect(()=>{fetchData();},[fetchData]);
  useEffect(()=>{
    const ch=supabase.channel('piket-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'piket_schedules'},()=>{setTimeout(fetchData,300);})
      .subscribe();
    return()=>{supabase.removeChannel(ch);};
  },[fetchData]);

  const isCurrWeek=wk===toKey(getMonday(new Date()));
  const wLabel=`${weekStart.toLocaleDateString('id-ID',{day:'2-digit',month:'long'})} – ${addDays(weekStart,4).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric'})}`;

  // Filter: displayRows — filter instansi/kebutuhan now cross-referenced with tamuDetails
  const displayRows=rows.filter(row=>{
    if(filterDay&&row.day_of_week!==filterDay)return false;
    const rowTd=tamuDetails.filter(td=>td.piket_id===row.id);
    if(filterTamu&&rowTd.length===0)return false;
    if(filterKebutuhan&&!rowTd.some(td=>td.kebutuhan?.includes(filterKebutuhan)))return false;
    if(filterInstansi&&!rowTd.some(td=>td.tamu_instansi===filterInstansi))return false;
    if(filterDivision&&!rowTd.some(td=>td.sales_division===filterDivision))return false;
    if(search){
      const q=search.toLowerCase();
      const matchPic=!!(row.pic_ivp_name?.toLowerCase().includes(q)||row.pic_ump_name?.toLowerCase().includes(q)||row.pic_mlds_name?.toLowerCase().includes(q)||row.day_of_week.toLowerCase().includes(q));
      const matchTd=rowTd.some(td=>td.tamu_instansi?.toLowerCase().includes(q)||td.nama_sales?.toLowerCase().includes(q)||td.sales_division?.toLowerCase().includes(q)||td.kebutuhan?.some(k=>k.toLowerCase().includes(q)));
      return matchPic||matchTd;
    }
    return true;
  });

  // Pie data — from tamuDetails
  const kMapAll:Record<string,number>={};
  tamuDetails.forEach(td=>(td.kebutuhan||[]).forEach(k=>{kMapAll[k]=(kMapAll[k]||0)+1;}));
  const kPieAll=Object.entries(kMapAll).sort(([,a],[,b])=>b-a).slice(0,12).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));

  const divMapAll:Record<string,number>={};
  tamuDetails.forEach(td=>{if(td.sales_division){divMapAll[td.sales_division]=(divMapAll[td.sales_division]||0)+1;}});
  const divPieAll=Object.entries(divMapAll).sort(([,a],[,b])=>b-a).slice(0,12).map(([label,value],i)=>({label,value,color:PIE_COLORS[i%PIE_COLORS.length]}));

  return(
    <div className="min-h-screen flex flex-col relative" style={{backgroundImage:`url('/IVP_Background.png')`,backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed'}}>
      <div className="absolute inset-0 pointer-events-none" style={{background:'rgba(255,255,255,0.08)'}}/>

      {/* ── INITIAL LOADING OVERLAY ── */}
      {loading&&rows.length===0&&(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center" style={{backgroundImage:`url('/IVP_Background.png')`,backgroundSize:'cover',backgroundPosition:'center'}}>
          <div className="absolute inset-0" style={{background:'rgba(255,255,255,0.15)',backdropFilter:'blur(2px)'}}/>
          <div className="relative flex flex-col items-center gap-4 px-10 py-8 rounded-3xl" style={{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(20px)',boxShadow:'0 8px 40px rgba(0,0,0,0.18)',border:'1px solid rgba(255,255,255,0.9)'}}>
            <div className="relative w-16 h-16">
              <svg className="w-16 h-16 animate-spin" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="26" stroke="#f1f5f9" strokeWidth="6"/>
                <path d="M32 6 A26 26 0 0 1 58 32" stroke="url(#loadGrad)" strokeWidth="6" strokeLinecap="round"/>
                <defs>
                  <linearGradient id="loadGrad" x1="32" y1="6" x2="58" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#dc2626"/>
                    <stop offset="1" stopColor="#991b1b"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-700 tracking-wide">Loading...</p>
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
              {isAdmin&&(
                <button onClick={()=>setShowSchedule(true)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90"
                  style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)',boxShadow:'0 4px 14px rgba(220,38,38,0.4)'}}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  Atur Jadwal
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">

          {/* ── SUMMARY CARDS — Minggu / Bulan / Tahun / Total ── */}
          <TamuSummaryCards allRows={allRows} tamuDetails={tamuDetails}/>

          {/* ── PIE CHARTS ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TamuInstansiPie
              tamuDetails={tamuDetails}
              activeFilter={filterInstansi}
              onSliceClick={label=>setFilterInstansi(filterInstansi===label?null:label)}
            />
            <MiniPieChart
              data={kPieAll} title="Kebutuhan" icon="🎯"
              activeFilter={filterKebutuhan}
              onSliceClick={label=>setFilterKebutuhan(filterKebutuhan===label?null:label)}
            />
            <MiniPieChart
              data={divPieAll} title="Division" icon="🏷️"
              activeFilter={filterDivision}
              onSliceClick={label=>setFilterDivision(filterDivision===label?null:label)}
            />
          </div>

          {/* ── MAIN AREA: TABLE + CALENDAR ── */}
          <div className="flex gap-4 items-start">

            {/* ── SCHEDULE TABLE ── */}
            <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(200,200,200,0.6)',backdropFilter:'blur(12px)'}}>
              <div className="px-5 py-3.5 border-b border-gray-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Schedule Piket</span>
                    <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full">{displayRows.length}</span>
                    {/* ── WEEK NAVIGATOR (inline in header) ── */}
                    <div className="flex items-center gap-1.5">
                      <button onClick={()=>setWeekStart(d=>addDays(d,-7))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base transition-all hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200"
                        style={{background:'rgba(255,255,255,0.9)'}}>‹</button>
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg" style={{background:'rgba(220,38,38,0.07)',border:'1px solid rgba(220,38,38,0.2)'}}>
                        <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest">Minggu:</span>
                        <span className="text-xs font-bold text-red-700">{wLabel}</span>
                        {!isCurrWeek&&(
                          <button onClick={()=>setWeekStart(getMonday(new Date()))}
                            className="text-[8px] font-bold px-1.5 py-0.5 rounded-md text-white transition-all"
                            style={{background:'#dc2626'}}>Ini</button>
                        )}
                      </div>
                      <button onClick={()=>setWeekStart(d=>addDays(d,7))}
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-base transition-all hover:bg-red-50 text-slate-400 hover:text-red-600 border border-slate-200 hover:border-red-200"
                        style={{background:'rgba(255,255,255,0.9)'}}>›</button>
                    </div>
                  </div>
                  {(search||filterDay||filterTamu||filterKebutuhan||filterInstansi||filterDivision)&&(
                    <button onClick={()=>{setSearch('');setFilterDay('');setFilterTamu(false);setFilterKebutuhan(null);setFilterInstansi(null);setFilterDivision(null);}}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{background:'rgba(220,38,38,0.08)',border:'1px solid rgba(220,38,38,0.2)',color:'#dc2626'}}>
                      ✕ Reset Filter
                    </button>
                  )}
                </div>
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
                </div>
                {/* ── ACTIVE FILTER CHIPS ── */}
                {(filterInstansi||filterKebutuhan||filterDivision)&&(
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {filterInstansi&&(
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{background:'rgba(14,165,233,0.1)',border:'1px solid rgba(14,165,233,0.35)'}}>
                        <span className="text-[10px] font-bold text-sky-600">🏢 Instansi:</span>
                        <span className="text-[10px] font-semibold text-sky-700">{filterInstansi}</span>
                        <button onClick={()=>setFilterInstansi(null)} className="text-[10px] font-black text-sky-400 hover:text-sky-700 ml-0.5 hover:bg-sky-100 rounded px-0.5 transition-all">✕</button>
                      </div>
                    )}
                    {filterKebutuhan&&(
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{background:'rgba(124,58,237,0.1)',border:'1px solid rgba(124,58,237,0.35)'}}>
                        <span className="text-[10px] font-bold text-violet-600">🎯 Kebutuhan:</span>
                        <span className="text-[10px] font-semibold text-violet-700">{filterKebutuhan}</span>
                        <button onClick={()=>setFilterKebutuhan(null)} className="text-[10px] font-black text-violet-400 hover:text-violet-700 ml-0.5 hover:bg-violet-100 rounded px-0.5 transition-all">✕</button>
                      </div>
                    )}
                    {filterDivision&&(
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg" style={{background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.35)'}}>
                        <span className="text-[10px] font-bold text-amber-600">🏷️ Division:</span>
                        <span className="text-[10px] font-semibold text-amber-700">{filterDivision}</span>
                        <button onClick={()=>setFilterDivision(null)} className="text-[10px] font-black text-amber-400 hover:text-amber-700 ml-0.5 hover:bg-amber-100 rounded px-0.5 transition-all">✕</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {loading?(
                <div className="flex justify-center py-16"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 rounded-full border-2 border-t-red-600 border-red-200 animate-spin"/><p className="text-sm text-slate-500">Memuat jadwal...</p></div></div>
              ):(
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse table-fixed" style={{minWidth:'860px'}}>
                    <colgroup>
                      <col style={{width:'4%'}} />   {/* No */}
                      <col style={{width:'9%'}} />     {/* Tanggal */}
                      <col style={{width:'14%'}} />    {/* PIC */}
                      <col style={{width:'18%'}} />    {/* Tamu Instansi */}
                      <col style={{width:'13%'}} />    {/* Sales */}
                      <col style={{width:'22%'}} />    {/* Kebutuhan */}
                      <col style={{width:'7%'}} />     {/* Foto */}
                      <col style={{width:'9%'}} />     {/* Action */}
                    </colgroup>
                    <thead>
                      <tr style={{background:'rgba(248,250,252,0.9)',borderBottom:'2px solid #e5e7eb'}}>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:'1px solid #e5e7eb'}}>No</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:'1px solid #e5e7eb'}}>Tanggal</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:'1px solid #e5e7eb'}}>PIC</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:'1px solid #e5e7eb'}}>Tamu Instansi</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:'1px solid #e5e7eb'}}>Sales</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:'1px solid #e5e7eb'}}>Kebutuhan</th>
                        <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest" style={{borderRight:'1px solid #e5e7eb'}}>Foto</th>
                        <th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayRows.length===0?(
                        <tr><td colSpan={8} className="text-center py-16 text-gray-400">
                          <div className="text-4xl mb-3">📋</div>
                          <p className="font-semibold">{rows.length===0?'Belum ada jadwal':'Tidak ada hasil filter'}</p>
                          {rows.length===0&&isAdmin&&<p className="text-xs mt-1">Klik "Atur Jadwal" untuk menambahkan jadwal piket minggu ini</p>}
                        </td></tr>
                      ):displayRows.map((row,idx)=>{
                        const dc=DAY_COLOR[row.day_of_week];
                        const todayRow=row.day_date===toKey(new Date());
                        const rowTamu=tamuDetails.filter(td=>td.piket_id===row.id);
                        const tamuToShow=rowTamu.length>0?rowTamu:[null];
                        return tamuToShow.map((td,tamuIdx)=>(
                          <tr key={`${row.id}-${tamuIdx}`} className="transition-colors hover:bg-gray-50/70"
                            style={{borderBottom:tamuIdx===tamuToShow.length-1?'2px solid #e5e7eb':'1px solid #f3f4f6',background:todayRow?'rgba(220,38,38,0.025)':undefined}}>
                            {/* No + Tanggal + PIC — only on first tamu row, rowspan */}
                            {tamuIdx===0&&(
                              <>
                                <td className="px-4 py-3 text-gray-500 text-xs font-medium align-middle" rowSpan={tamuToShow.length} style={{borderRight:'1px solid #e5e7eb',verticalAlign:'middle'}}>{idx+1}</td>
                                <td className="px-4 py-3 align-middle" rowSpan={tamuToShow.length} style={{borderRight:'1px solid #e5e7eb',verticalAlign:'middle'}}>
                                  <div className="inline-flex flex-col items-center px-2 py-1.5 rounded-xl"
                                    style={{background:todayRow?'rgba(220,38,38,0.12)':dc.light,border:`1px solid ${todayRow?'rgba(220,38,38,0.35)':dc.accent+'30'}`}}>
                                    <span className="text-lg font-black leading-none" style={{color:todayRow?'#dc2626':dc.accent}}>{new Date(row.day_date+'T00:00:00').getDate()}</span>
                                    <span className="text-[8px] font-bold uppercase leading-tight" style={{color:todayRow?'#dc2626':dc.accent}}>{new Date(row.day_date+'T00:00:00').toLocaleDateString('id-ID',{month:'short',year:'2-digit'})}</span>
                                  </div>
                                  <div className="mt-1"><span className="text-xs font-bold" style={{color:dc.accent}}>{row.day_of_week}</span></div>
                                  {todayRow&&<span className="inline-block text-[8px] font-bold px-1.5 py-0.5 rounded-full text-white mt-0.5" style={{background:dc.accent}}>HARI INI</span>}
                                </td>
                                <td className="px-4 py-3 align-middle" rowSpan={tamuToShow.length} style={{borderRight:'1px solid #e5e7eb',verticalAlign:'middle'}}>
                                  <div className="space-y-1.5">
                                    {([['pic_ivp_name','PTS IVP'],['pic_ump_name','PTS UMP'],['pic_mlds_name','PTS MLDS']] as [keyof PiketRow,string][]).map(([field,team])=>{
                                      const name=row[field] as string|null;
                                      const tc=TEAM_LABEL[team];
                                      return name?(
                                        <div key={team} className="flex items-center gap-1.5">
                                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0" style={{background:tc.dot}}>{name.charAt(0).toUpperCase()}</div>
                                          <div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate leading-tight">{name}</p><span className="text-[8px] font-bold uppercase" style={{color:tc.text}}>{team}</span></div>
                                        </div>
                                      ):(
                                        <div key={team} className="flex items-center gap-1.5 opacity-25">
                                          <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] text-slate-400 flex-shrink-0">—</div>
                                          <span className="text-[9px] text-slate-400 italic">{team}: —</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </td>
                              </>
                            )}
                            {/* Tamu Instansi */}
                            <td className="px-4 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                              {td?.tamu_instansi?(
                                <button onClick={()=>setFilterInstansi(filterInstansi===td.tamu_instansi?null:td.tamu_instansi||null)}
                                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity text-left"
                                  title="Klik untuk filter instansi ini">
                                  <span className="text-sm">🏢</span>
                                  <span className="text-xs font-semibold text-slate-700 underline decoration-dotted">{td.tamu_instansi}</span>
                                </button>
                              ):<span className="text-gray-300 text-xs">—</span>}
                            </td>
                            {/* Sales */}
                            <td className="px-4 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                              {td?.nama_sales?(
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-xs font-bold text-slate-800">{td.nama_sales}</span>
                                  {td.sales_division&&(
                                    <span className="text-xs text-purple-500 font-semibold mt-0.5" style={{background:dc.grad}}>{td.sales_division}</span>
                                  )}
                                </div>
                              ):<span className="text-gray-300 text-xs">—</span>}
                            </td>
                            {/* Kebutuhan */}
                            <td className="px-4 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                              {td?.kebutuhan&&td.kebutuhan.length>0?(
                                <div className="flex flex-col gap-1">
                                  {td.kebutuhan.map(k=>(
                                    <span key={k} className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700">
                                      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:dc.accent}}/>
                                      {k}
                                    </span>
                                  ))}
                                </div>
                              ):<span className="text-gray-300 text-xs">—</span>}
                            </td>
                            {/* Foto */}
                            <td className="px-4 py-3 align-middle" style={{borderRight:'1px solid #e5e7eb'}}>
                              {td?.foto_url?(
                                <button onClick={()=>setPhotoZoom(td.foto_url!)} className="hover:opacity-80 transition-opacity">
                                  <img src={td.foto_url} alt="Foto" className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"/>
                                </button>
                              ):<span className="text-gray-300 text-xs">—</span>}
                            </td>
                            {/* Action — only on first tamu row */}
                            {tamuIdx===0&&(
                              <td className="px-4 py-3 align-middle text-center" rowSpan={tamuToShow.length} style={{verticalAlign:'middle'}}>
                                <button onClick={()=>setFillDetail(row)} title="Isi / Edit Detail"
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
                  <div className="flex items-center justify-between px-5 py-2.5" style={{borderTop:'1px solid #e5e7eb',background:'rgba(255,255,255,0.97)'}}>
                    <span className="text-[10px] text-gray-400">{displayRows.length} jadwal ditampilkan</span>
                    <span className="text-[10px] text-gray-400">{rows.length} total minggu ini · {tamuDetails.filter(td=>displayRows.some(r=>r.id===td.piket_id)).length} tamu</span>
                  </div>
                </div>
              )}
            </div>

            {/* ── MINI CALENDAR ── */}
            <MiniCalendar allRows={allRows} calMonth={calMonth} setCalMonth={setCalMonth} selDay={selDay} setSelDay={setSelDay}/>
          </div>

        </div>

        {/* Photo zoom */}
        {photoZoom&&(
          <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={()=>setPhotoZoom(null)}>
            <div className="relative max-w-3xl max-h-[90vh]" onClick={e=>e.stopPropagation()}>
              <img src={photoZoom} alt="Foto zoom" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl object-contain"/>
              <button onClick={()=>setPhotoZoom(null)} className="absolute top-3 right-3 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center font-bold hover:bg-black/80 transition-all">✕</button>
            </div>
          </div>
        )}

        {showSchedule&&isAdmin&&(
          <ScheduleModal weekStart={weekStart} users={ptUsers} onClose={()=>setShowSchedule(false)} onSaved={fetchData}/>
        )}
        {fillDetail&&<FillDetailModal row={fillDetail} onClose={()=>setFillDetail(null)} onSaved={fetchData}/>}
      </div>

      <style jsx>{`
        @keyframes scale-in{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
        select option{background:#ffffff;color:#1e293b}
      `}</style>
    </div>
  );
}
