'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string; username: string; password: string;
  full_name: string; role: string; team_type?: string;
  sales_division?: string; allowed_menus?: string[];
}

interface MovementLog {
  id: string; tanggal: string; nama_pts: string; nama_luar: string;
  status_barang: 'Masuk' | 'Keluar'; event: string; project_name: string;
  type_barang: string; serial_number: string; catatan: string;
  foto_surat_url: string; foto_barang_url: string;
  created_by: string; created_at: string;
}

const EVENTS = ['Troubleshooting', 'R&D', 'Demo Product', 'Project', 'Service'];
const COLORS  = ['#f59e0b','#3b82f6','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#6366f1'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function splitTypeLines(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw.split(/\n/)
    .map(s => s.replace(/\\n/g, ' ').replace(/\xa0/g, ' ').replace(/\s{2,}/g, ' ').trim())
    .filter(Boolean);
}

function fmtDate(d: string, long = false) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('id-ID', long ? { day:'2-digit',month:'long',year:'numeric' } : { day:'2-digit',month:'short',year:'numeric' }); }
  catch { return d; }
}

async function uploadFiles(files: File[], folder: string): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const ext  = file.name.split('.').pop() ?? 'bin';
    const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('movement-files').upload(path, file, { cacheControl:'3600', upsert:false });
    if (error) throw new Error(`Upload ${file.name}: ${error.message}`);
    const { data } = supabase.storage.from('movement-files').getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

// ─── Mini Pie Chart ──────────────────────────────────────────────────────────

function MiniPieChart({ data, title, icon, activeFilter, onSliceClick }: {
  data: { label:string; value:number; color:string }[];
  title:string; icon:string; activeFilter?:string|null; onSliceClick?:(l:string)=>void;
}) {
  const [hov, setHov] = useState<number|null>(null);
  const total = data.reduce((s,d)=>s+d.value,0);
  if (total===0) return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{icon} {title}</p>
      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
    </div>
  );
  let cum = -Math.PI/2;
  const cx=60,cy=60,r=50,ir=28;
  const slices = data.map((d,i) => {
    const angle=(d.value/total)*2*Math.PI;
    if (data.length===1) return {...d,path:'',isCircle:true,i};
    const x1=cx+r*Math.cos(cum),y1=cy+r*Math.sin(cum);
    const x2=cx+r*Math.cos(cum+angle),y2=cy+r*Math.sin(cum+angle);
    const xi1=cx+ir*Math.cos(cum),yi1=cy+ir*Math.sin(cum);
    const xi2=cx+ir*Math.cos(cum+angle),yi2=cy+ir*Math.sin(cum+angle);
    const lg=angle>Math.PI?1:0;
    const path=`M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${lg} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${lg} 0 ${xi1} ${yi1} Z`;
    cum+=angle; return {...d,path,isCircle:false,i};
  });
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.8)',backdropFilter:'blur(10px)'}}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map(s => s.isCircle ? (
            <g key={s.i} style={{cursor:'pointer'}} onClick={()=>onSliceClick?.(s.label)} onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)}>
              <circle cx={cx} cy={cy} r={r} fill={s.color} opacity={hov===null||hov===s.i?1:0.5} style={{filter:hov===s.i?`drop-shadow(0 0 4px ${s.color})`:'none'}}/>
              <circle cx={cx} cy={cy} r={ir} fill="white"/>
            </g>
          ) : (
            <path key={s.i} d={s.path} fill={s.color}
              opacity={hov===null||hov===s.i?1:0.45}
              style={{cursor:'pointer',transition:'opacity 0.15s',filter:hov===s.i||activeFilter===s.label?`drop-shadow(0 0 4px ${s.color})`:'none'}}
              onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)} onClick={()=>onSliceClick?.(s.label)}/>
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0 max-h-[120px] overflow-y-auto pr-1">
          {slices.map(s => (
            <div key={s.i} className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
              style={{background:hov===s.i||activeFilter===s.label?`${s.color}20`:'transparent',outline:activeFilter===s.label?`1px solid ${s.color}`:'none'}}
              onMouseEnter={()=>setHov(s.i)} onMouseLeave={()=>setHov(null)} onClick={()=>onSliceClick?.(s.label)}>
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:s.color}}/>
              <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
              <span className="text-[10px] font-bold flex-shrink-0" style={{color:s.color}}>{s.value}</span>
              {activeFilter===s.label&&<span className="text-[9px] font-bold text-amber-600 flex-shrink-0">✓</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Multi-file Upload Field ──────────────────────────────────────────────────

function MultiFileField({ label, icon, files, onAdd, onRemove }: {
  label:string; icon:string; files:File[]; onAdd:(f:File[])=>void; onRemove:(i:number)=>void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{icon} {label}</label>
      <div className="w-full border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition-all hover:border-amber-400 hover:bg-amber-50/40"
        style={{borderColor:'#e2e8f0',background:'#f8fafc'}}
        onClick={()=>ref.current?.click()}
        onDragOver={e=>e.preventDefault()}
        onDrop={e=>{e.preventDefault();onAdd(Array.from(e.dataTransfer.files));}}>
        <input ref={ref} type="file" multiple accept="image/*,application/pdf" className="hidden"
          onChange={e=>{onAdd(Array.from(e.target.files||[]));if(ref.current)ref.current.value='';}}/>
        <p className="text-xs text-gray-400 font-medium">📎 Klik atau drag file di sini</p>
        <p className="text-[10px] text-gray-300 mt-0.5">Multiple files • Gambar / PDF</p>
      </div>
      {files.length>0&&(
        <div className="mt-2 space-y-1.5">
          {files.map((f,i)=>(
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
              <span className="text-sm">{f.type.startsWith('image/')?'🖼️':'📄'}</span>
              <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{f.name}</span>
              <span className="text-[10px] text-gray-400 flex-shrink-0">{(f.size/1024).toFixed(0)} KB</span>
              <button type="button" onClick={()=>onRemove(i)} className="text-red-400 hover:text-red-600 font-bold text-xs flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── URL / Google Drive Link Field ───────────────────────────────────────────

function UrlListField({ label, icon, value, onChange }: {
  label:string; icon:string; value:string; onChange:(v:string)=>void;
}) {
  const urls = value ? value.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const [input,setInput] = useState('');
  const add = () => { const u=input.trim(); if(!u)return; onChange([...urls,u].join(',')); setInput(''); };
  const remove = (i:number) => onChange(urls.filter((_,idx)=>idx!==i).join(','));
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">{icon} {label}</label>
      <div className="flex gap-2">
        <input type="text"
          className="flex-1 px-3 py-2.5 rounded-xl text-xs outline-none transition-all border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          placeholder="Paste link Google Drive / URL..."
          value={input} onChange={e=>setInput(e.target.value)}
          onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),add())}/>
        <button type="button" onClick={add}
          className="px-3 py-2.5 rounded-xl text-xs font-bold text-white flex-shrink-0"
          style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
          + Tambah
        </button>
      </div>
      <p className="text-[10px] text-gray-400 mt-1">Enter atau klik Tambah untuk menyimpan link</p>
      {urls.length>0&&(
        <div className="mt-2 space-y-1.5">
          {urls.map((url,i)=>(
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-100">
              <span className="text-sm">🔗</span>
              <a href={url} target="_blank" rel="noopener noreferrer"
                className="text-xs font-semibold text-blue-600 flex-1 truncate hover:underline">{url}</a>
              <button type="button" onClick={()=>remove(i)} className="text-red-400 hover:text-red-600 font-bold text-xs flex-shrink-0">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── View Modal ───────────────────────────────────────────────────────────────

function ViewModal({ log, onClose }: { log:MovementLog; onClose:()=>void }) {
  const suratUrls  = log.foto_surat_url  ? log.foto_surat_url.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const barangUrls = log.foto_barang_url ? log.foto_barang_url.split(',').map(s=>s.trim()).filter(Boolean) : [];
  const isMasuk    = log.status_barang==='Masuk';
  const sc         = isMasuk ? {bg:'#d1fae5',text:'#065f46',dot:'#10b981'} : {bg:'#fee2e2',text:'#991b1b',dot:'#ef4444'};
  const typeLines  = splitTypeLines(log.type_barang);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)'}}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>📦</span>
            <div>
              <h2 className="font-bold text-gray-900 text-base">Detail Movement Log</h2>
              <p className="text-xs text-gray-500">{fmtDate(log.tanggal,true)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold" style={{background:sc.bg,color:sc.text}}>
              <span className="w-2 h-2 rounded-full" style={{background:sc.dot}}/> Barang {log.status_barang}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold bg-amber-50 text-amber-700">🎯 {log.event}</span>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {[
              {label:'Tanggal', value:fmtDate(log.tanggal,true), icon:'📅'},
              {label:isMasuk?'PTS (Penerima)':'PTS (Pengirim)', value:log.nama_pts, icon:'👤'},
              {label:isMasuk?'Pengirim (Pihak Luar)':'Penerima (Pihak Luar)', value:log.nama_luar, icon:'🏢'},
              {label:'Project', value:log.project_name, icon:'📋'},
              {label:'Catatan', value:log.catatan, icon:'📝'},
            ].filter(r=>r.value).map(r=>(
              <div key={r.label} className="flex gap-3 px-4 py-3 rounded-xl" style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>
                <span className="text-base flex-shrink-0">{r.icon}</span>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{r.label}</p>
                <p className="text-sm font-semibold text-gray-800 mt-0.5 whitespace-pre-line">{r.value}</p></div>
              </div>
            ))}
            {typeLines.length>0&&(
              <div className="flex gap-3 px-4 py-3 rounded-xl" style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>
                <span className="text-base flex-shrink-0">📦</span>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Type Barang</p>
                <div className="mt-0.5 space-y-0.5">{typeLines.map((l,i)=><p key={i} className="text-sm font-semibold text-gray-800">{l}</p>)}</div></div>
              </div>
            )}
            {log.serial_number&&(
              <div className="flex gap-3 px-4 py-3 rounded-xl" style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>
                <span className="text-base flex-shrink-0">🔢</span>
                <div><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Serial Number</p>
                <p className="text-sm font-semibold text-gray-800 font-mono mt-0.5">{log.serial_number}</p></div>
              </div>
            )}
          </div>
          {suratUrls.length>0&&(
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">📄 Foto Surat Jalan</p>
              <div className="flex flex-wrap gap-2">
                {suratUrls.map((url,i)=>(
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                    style={{background:'linear-gradient(135deg,#3b82f6,#2563eb)',color:'white'}}>🔗 Surat {i+1}</a>
                ))}
              </div>
            </div>
          )}
          {barangUrls.length>0&&(
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">🖼️ Foto Barang</p>
              <div className="flex flex-wrap gap-2">
                {barangUrls.map((url,i)=>(
                  <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-80"
                    style={{background:'linear-gradient(135deg,#8b5cf6,#7c3aed)',color:'white'}}>🖼️ Foto {i+1}</a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

function AddEditModal({ log, currentUser, teamMembers, onClose, onSave }: {
  log?:MovementLog|null; currentUser:User; teamMembers:string[]; onClose:()=>void; onSave:()=>void;
}) {
  const isEdit = !!log;
  const [form, setForm] = useState({
    tanggal:        log?.tanggal?.split('T')[0] ?? new Date().toISOString().split('T')[0],
    status_barang:  (log?.status_barang ?? 'Keluar') as 'Masuk'|'Keluar',
    nama_pts:       log?.nama_pts      ?? '',
    nama_luar:      log?.nama_luar     ?? '',
    event:          log?.event         ?? 'Project',
    project_name:   log?.project_name  ?? '',
    type_barang:    log?.type_barang   ?? '',
    serial_number:  log?.serial_number ?? '',
    catatan:        log?.catatan       ?? '',
    foto_surat_url:  log?.foto_surat_url  ?? '',
    foto_barang_url: log?.foto_barang_url ?? '',
  });
  const [suratFiles,  setSuratFiles]  = useState<File[]>([]);
  const [barangFiles, setBarangFiles] = useState<File[]>([]);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState('');

  const set = (k:string,v:string) => setForm(p=>({...p,[k]:v}));
  const isMasuk = form.status_barang==='Masuk';
  const inp = "w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all border border-gray-200 bg-gray-50 focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-100";
  const lbl = "block text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5";

  const handleSave = async () => {
    if (!form.tanggal||!form.nama_pts||!form.project_name) { setError('Tanggal, Nama PTS, dan Project wajib diisi!'); return; }
    setSaving(true); setUploading(true); setError('');
    try {
      let suratUrl  = form.foto_surat_url;
      let barangUrl = form.foto_barang_url;
      if (suratFiles.length>0) {
        const uploaded = await uploadFiles(suratFiles,'surat');
        const existing = suratUrl ? suratUrl.split(',').map(s=>s.trim()).filter(Boolean) : [];
        suratUrl = [...existing,...uploaded].join(',');
      }
      if (barangFiles.length>0) {
        const uploaded = await uploadFiles(barangFiles,'barang');
        const existing = barangUrl ? barangUrl.split(',').map(s=>s.trim()).filter(Boolean) : [];
        barangUrl = [...existing,...uploaded].join(',');
      }
      setUploading(false);
      const payload = { tanggal:form.tanggal, status_barang:form.status_barang, nama_pts:form.nama_pts, nama_luar:form.nama_luar, event:form.event, project_name:form.project_name, type_barang:form.type_barang, serial_number:form.serial_number, catatan:form.catatan, foto_surat_url:suratUrl, foto_barang_url:barangUrl, created_by:currentUser.username };
      if (isEdit) { const {error:e}=await supabase.from('movement_logs').update(payload).eq('id',log!.id); if(e)throw e; }
      else        { const {error:e}=await supabase.from('movement_logs').insert([payload]); if(e)throw e; }
      onSave();
    } catch(e:any) { setError('Gagal: '+e.message); setSaving(false); setUploading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)'}}>
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>{isEdit?'✏️':'➕'}</span>
            <h2 className="font-bold text-gray-900">{isEdit?'Edit Movement Log':'Tambah Movement Log'}</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {error&&<div className="px-4 py-3 rounded-xl text-sm font-semibold text-red-700 bg-red-50 border border-red-200">{error}</div>}

          <div><label className={lbl}>📅 Tanggal In/Out</label>
            <input type="date" className={inp} value={form.tanggal} onChange={e=>set('tanggal',e.target.value)}/></div>

          <div><label className={lbl}>📦 Status Barang</label>
            <div className="flex gap-2">
              {(['Masuk','Keluar'] as const).map(s=>(
                <button key={s} type="button" onClick={()=>set('status_barang',s)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all border-2"
                  style={form.status_barang===s ? (s==='Masuk'?{background:'#d1fae5',color:'#065f46',borderColor:'#10b981'}:{background:'#fee2e2',color:'#991b1b',borderColor:'#ef4444'}) : {background:'#f8fafc',color:'#64748b',borderColor:'#e2e8f0'}}>
                  {s==='Masuk'?'📥':'📤'} {s}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl space-y-3" style={{background:'#fffbeb',border:'1px solid #fde68a'}}>
            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-600">
              {isMasuk?'📥 PTS = Penerima — Pengirim adalah Pihak Luar':'📤 PTS = Pengirim — Penerima adalah Pihak Luar'}
            </p>
            <div><label className={lbl}>{isMasuk?'👤 Nama PTS (Penerima)':'👤 Nama PTS (Pengirim)'}</label>
              <select className={inp+" cursor-pointer"} value={form.nama_pts} onChange={e=>set('nama_pts',e.target.value)}>
                <option value="">-- Pilih Anggota PTS --</option>
                {teamMembers.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div><label className={lbl}>{isMasuk?'🏢 Pengirim (Pihak Luar)':'🏢 Penerima (Pihak Luar)'}</label>
              <input type="text" className={inp} placeholder="Nama pihak luar..." value={form.nama_luar} onChange={e=>set('nama_luar',e.target.value)}/></div>
          </div>

          <div><label className={lbl}>📋 Nama Project</label>
            <input type="text" className={inp} placeholder="Nama project..." value={form.project_name} onChange={e=>set('project_name',e.target.value)}/></div>

          <div><label className={lbl}>🎯 Event</label>
            <select className={inp+" cursor-pointer"} value={form.event} onChange={e=>set('event',e.target.value)}>
              {EVENTS.map(ev=><option key={ev} value={ev}>{ev}</option>)}
            </select>
          </div>

          <div><label className={lbl}>📦 Type Barang</label>
            <textarea className={inp+" resize-none"} rows={3} placeholder="Nama / tipe barang (satu per baris jika multiple)..." value={form.type_barang} onChange={e=>set('type_barang',e.target.value)}/></div>

          <div><label className={lbl}>🔢 Serial Number</label>
            <input type="text" className={inp} placeholder="Serial number..." value={form.serial_number} onChange={e=>set('serial_number',e.target.value)}/></div>

          <div><label className={lbl}>📝 Catatan</label>
            <textarea className={inp+" resize-none"} rows={3} placeholder="Keterangan tambahan..." value={form.catatan} onChange={e=>set('catatan',e.target.value)}/></div>

          {/* Foto Surat: upload file */}
          <MultiFileField label="Upload Foto Surat Jalan" icon="📄" files={suratFiles}
            onAdd={f=>setSuratFiles(p=>[...p,...f])} onRemove={i=>setSuratFiles(p=>p.filter((_,idx)=>idx!==i))}/>

          {/* Foto Surat: link Google Drive */}
          <UrlListField label="Link Foto Surat Jalan (Google Drive / URL)" icon="🔗"
            value={form.foto_surat_url} onChange={v=>set('foto_surat_url',v)}/>

          {/* Foto Barang: upload file */}
          <MultiFileField label="Upload Foto Barang" icon="🖼️" files={barangFiles}
            onAdd={f=>setBarangFiles(p=>[...p,...f])} onRemove={i=>setBarangFiles(p=>p.filter((_,idx)=>idx!==i))}/>

          {/* Foto Barang: link Google Drive */}
          <UrlListField label="Link Foto Barang (Google Drive / URL)" icon="🔗"
            value={form.foto_barang_url} onChange={v=>set('foto_barang_url',v)}/>

          <div className="px-4 py-3 rounded-xl text-xs text-blue-700 bg-blue-50 border border-blue-100">
            <p className="font-bold mb-1">💡 Cara pakai Google Drive link</p>
            <p>Buka file di Google Drive → klik kanan → <strong>Get link</strong> → ubah akses ke <strong>Anyone with the link</strong> → copy URL → paste di kolom Link di atas.</p>
          </div>

          {uploading&&(
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
              <div className="w-4 h-4 border-2 border-amber-300 border-t-amber-600 rounded-full animate-spin flex-shrink-0"/>
              <span className="text-xs font-semibold text-amber-700">Mengupload file ke Supabase Storage...</span>
            </div>
          )}

          <button type="button" onClick={handleSave} disabled={saving}
            className="w-full py-3.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',boxShadow:'0 4px 14px rgba(245,158,11,0.35)'}}>
            {saving?'⏳ Menyimpan...':isEdit?'💾 Simpan Perubahan':'➕ Tambah Log'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UnitMovementPage() {
  const [currentUser, setCurrentUser] = useState<User|null>(null);
  const [isLoggedIn,  setIsLoggedIn]  = useState(false);
  const [loginForm,   setLoginForm]   = useState({username:'',password:''});

  const [logs,        setLogs]        = useState<MovementLog[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  const [filterStatus, setFilterStatus] = useState<'All'|'Masuk'|'Keluar'>('All');
  const [filterEvent,  setFilterEvent]  = useState('All');
  const [filterPTS,    setFilterPTS]    = useState('All');
  const [filterYear,   setFilterYear]   = useState('All');
  const [searchQuery,  setSearchQuery]  = useState('');

  const [viewLog,       setViewLog]       = useState<MovementLog|null>(null);
  const [editLog,       setEditLog]       = useState<MovementLog|null|undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<MovementLog|null>(null);
  const [deleting,      setDeleting]      = useState(false);
  const [notif, setNotif] = useState<{type:'success'|'error';msg:string}|null>(null);

  const notify = (type:'success'|'error', msg:string) => { setNotif({type,msg}); setTimeout(()=>setNotif(null),3500); };

  useEffect(()=>{
    const saved = localStorage.getItem('currentUser');
    if (saved) { const u=JSON.parse(saved) as User; setCurrentUser(u); setIsLoggedIn(true); }
  },[]);

  useEffect(()=>{
    if (!isLoggedIn) return;
    fetchLogs(); fetchTeamMembers();
    const ch = supabase.channel('movement-rt')
      .on('postgres_changes',{event:'*',schema:'public',table:'movement_logs'},()=>fetchLogs())
      .subscribe();
    return ()=>{ supabase.removeChannel(ch); };
  },[isLoggedIn]);

  const handleLogin = async () => {
    const {data,error} = await supabase.from('users').select('*').eq('username',loginForm.username).eq('password',loginForm.password).single();
    if (error||!data) { alert('Username atau password salah!'); return; }
    if (data.team_type==='Pending Approval') { alert('Akun masih menunggu persetujuan.'); return; }
    setCurrentUser(data); setIsLoggedIn(true);
    localStorage.setItem('currentUser',JSON.stringify(data));
  };

  const handleLogout = () => {
    setIsLoggedIn(false); setCurrentUser(null); localStorage.removeItem('currentUser');
    const t=window.top!==window?window.top:window; if(t) t.location.href='/dashboard';
  };

  const fetchLogs = async () => {
    setLoading(true);
    const {data} = await supabase.from('movement_logs').select('*').order('tanggal',{ascending:false});
    if (data) setLogs(data as MovementLog[]);
    setLoading(false);
  };

  const fetchTeamMembers = async () => {
    // Hanya Team PTS
    const {data} = await supabase.from('users').select('full_name').eq('team_type','Team PTS').order('full_name');
    if (data&&data.length>0) setTeamMembers(data.map((u:any)=>u.full_name));
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    const {error} = await supabase.from('movement_logs').delete().eq('id',deleteConfirm.id);
    setDeleting(false); setDeleteConfirm(null);
    if (error) { notify('error','Gagal hapus: '+error.message); return; }
    notify('success','Log berhasil dihapus!'); fetchLogs();
  };

  const isAdmin = ['admin','superadmin'].includes(currentUser?.role?.toLowerCase()??'');

  const availableYears = useMemo(()=>{
    const yrs=new Set<string>(); logs.forEach(l=>{ if(l.tanggal) yrs.add(l.tanggal.substring(0,4)); });
    return Array.from(yrs).sort((a,b)=>b.localeCompare(a));
  },[logs]);

  const filteredLogs = useMemo(()=>logs.filter(l=>{
    if (filterStatus!=='All'&&l.status_barang!==filterStatus) return false;
    if (filterEvent !=='All'&&l.event!==filterEvent)           return false;
    if (filterPTS   !=='All'&&l.nama_pts!==filterPTS)          return false;
    if (filterYear  !=='All'&&!l.tanggal?.startsWith(filterYear)) return false;
    if (searchQuery) {
      const q=searchQuery.toLowerCase();
      if (!l.project_name?.toLowerCase().includes(q)&&!l.type_barang?.toLowerCase().includes(q)&&
          !l.serial_number?.toLowerCase().includes(q)&&!l.nama_luar?.toLowerCase().includes(q)) return false;
    }
    return true;
  }),[logs,filterStatus,filterEvent,filterPTS,filterYear,searchQuery]);

  const statusPieData = useMemo(()=>[
    {label:'Masuk',  value:filteredLogs.filter(l=>l.status_barang==='Masuk').length,  color:'#10b981'},
    {label:'Keluar', value:filteredLogs.filter(l=>l.status_barang==='Keluar').length, color:'#ef4444'},
  ].filter(d=>d.value>0),[filteredLogs]);

  const ptsPieData = useMemo(()=>{
    const c:Record<string,number>={};
    filteredLogs.forEach(l=>{ if(l.nama_pts) c[l.nama_pts]=(c[l.nama_pts]||0)+1; });
    return Object.entries(c).map(([label,value],i)=>({label,value,color:COLORS[i%COLORS.length]})).sort((a,b)=>b.value-a.value);
  },[filteredLogs]);

  const eventPieData = useMemo(()=>{
    const c:Record<string,number>={};
    filteredLogs.forEach(l=>{ if(l.event) c[l.event]=(c[l.event]||0)+1; });
    return Object.entries(c).map(([label,value],i)=>({label,value,color:COLORS[i%COLORS.length]})).sort((a,b)=>b.value-a.value);
  },[filteredLogs]);

  if (!isLoggedIn) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'linear-gradient(135deg,#1e293b,#0f172a)'}}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>
          <div className="text-4xl mb-2">🚚</div>
          <h1 className="text-white font-black text-xl">Unit Movement Log</h1>
          <p className="text-amber-100 text-sm">PTS IVP — Movement Tracking</p>
        </div>
        <div className="p-6 space-y-4">
          <input className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-amber-400 focus:bg-white transition-all"
            placeholder="Username" value={loginForm.username} onChange={e=>setLoginForm(p=>({...p,username:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          <input type="password" className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none focus:border-amber-400 focus:bg-white transition-all"
            placeholder="Password" value={loginForm.password} onChange={e=>setLoginForm(p=>({...p,password:e.target.value}))} onKeyDown={e=>e.key==='Enter'&&handleLogin()}/>
          <button onClick={handleLogin} className="w-full py-3.5 rounded-xl text-sm font-bold text-white"
            style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',boxShadow:'0 4px 14px rgba(245,158,11,0.4)'}}>Masuk</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-cover bg-center bg-fixed" style={{backgroundImage:'url(/IVP_Background.png)'}}>

      {viewLog&&<ViewModal log={viewLog} onClose={()=>setViewLog(null)}/>}
      {editLog!==undefined&&<AddEditModal log={editLog} currentUser={currentUser!} teamMembers={teamMembers}
        onClose={()=>setEditLog(undefined)}
        onSave={()=>{setEditLog(undefined);fetchLogs();notify('success',editLog?'Log diperbarui!':'Log ditambahkan!');}}/>}
      {deleteConfirm&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(6px)'}}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-2xl" style={{background:'#fee2e2'}}>🗑️</div>
            <h3 className="font-bold text-gray-900">Hapus Log?</h3>
            <p className="text-sm text-gray-500">Data <strong>{deleteConfirm.project_name}</strong> akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteConfirm(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleDelete} disabled={deleting} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60"
                style={{background:'linear-gradient(135deg,#ef4444,#dc2626)'}}>{deleting?'Menghapus...':'Ya, Hapus'}</button>
            </div>
          </div>
        </div>
      )}

      {notif&&(
        <div className="fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-xl flex items-center gap-2"
          style={{background:notif.type==='success'?'#d1fae5':'#fee2e2',color:notif.type==='success'?'#065f46':'#991b1b',border:`1px solid ${notif.type==='success'?'#6ee7b7':'#fca5a5'}`}}>
          {notif.type==='success'?'✅':'❌'} {notif.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-white/85 backdrop-blur-md shadow-md sticky top-0 z-30" style={{borderBottom:'2px solid rgba(245,158,11,0.3)'}}>
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md" style={{background:'linear-gradient(135deg,#f59e0b,#d97706)'}}>🚚</span>
            <div>
              <h1 className="font-black text-gray-900 text-base tracking-wide">Unit Movement Log</h1>
              <p className="text-[10px] text-gray-500 font-medium">PTS IVP — Equipment Tracking</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin&&(
              <button onClick={()=>setEditLog(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
                style={{background:'linear-gradient(135deg,#f59e0b,#d97706)',boxShadow:'0 2px 8px rgba(245,158,11,0.35)'}}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                Tambah Log
              </button>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.2)'}}>
              <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center text-white text-[10px] font-bold">
                {currentUser?.full_name?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-amber-800">{currentUser?.full_name}</span>
            </div>
            <button onClick={handleLogout} title="Logout" className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">

        {/* Stat Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {label:'Total Log',     value:filteredLogs.length, icon:'📋', g:'linear-gradient(135deg,#6366f1,#4f46e5)', sh:'rgba(99,102,241,0.35)'},
            {label:'Barang Masuk',  value:filteredLogs.filter(l=>l.status_barang==='Masuk').length,  icon:'📥', g:'linear-gradient(135deg,#10b981,#059669)', sh:'rgba(16,185,129,0.35)'},
            {label:'Barang Keluar', value:filteredLogs.filter(l=>l.status_barang==='Keluar').length, icon:'📤', g:'linear-gradient(135deg,#ef4444,#dc2626)', sh:'rgba(239,68,68,0.35)'},
            {label:'Anggota PTS',   value:new Set(filteredLogs.map(l=>l.nama_pts)).size, icon:'👥', g:'linear-gradient(135deg,#f59e0b,#d97706)', sh:'rgba(245,158,11,0.35)'},
          ].map(c=>(
            <div key={c.label} className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2" style={{background:c.g,boxShadow:`0 4px 16px ${c.sh}`}}>
              <div className="absolute right-3 top-2 text-4xl opacity-[0.15] select-none">{c.icon}</div>
              <span className="text-3xl font-black text-white leading-none">{loading?'…':c.value}</span>
              <p className="text-sm font-bold text-white">{c.label}</p>
            </div>
          ))}
        </div>

        {/* Pie Charts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MiniPieChart data={statusPieData} title="Status Barang" icon="📦"
            activeFilter={filterStatus!=='All'?filterStatus:null}
            onSliceClick={l=>setFilterStatus(p=>p===l?'All':l as any)}/>
          <MiniPieChart data={ptsPieData} title="Anggota PTS" icon="👤"
            activeFilter={filterPTS!=='All'?filterPTS:null}
            onSliceClick={l=>setFilterPTS(p=>p===l?'All':l)}/>
          <MiniPieChart data={eventPieData} title="Event" icon="🎯"
            activeFilter={filterEvent!=='All'?filterEvent:null}
            onSliceClick={l=>setFilterEvent(p=>p===l?'All':l)}/>
        </div>

        {/* Table */}
        <div className="rounded-2xl overflow-hidden" style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(200,200,200,0.6)',backdropFilter:'blur(12px)'}}>
          <div className="flex flex-wrap items-center justify-between px-6 py-4 gap-3" style={{borderBottom:'1px solid rgba(0,0,0,0.07)'}}>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Movement Log</span>
              <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2.5 py-1 rounded-full">{loading?'…':filteredLogs.length}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input className="px-3 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 outline-none focus:border-amber-400 focus:bg-white transition-all w-52"
                placeholder="🔍 Project / Type / SN / Pihak Luar..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}/>
              <select className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 outline-none focus:border-amber-400 cursor-pointer"
                value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}>
                <option value="All">Semua Status</option><option value="Masuk">Masuk</option><option value="Keluar">Keluar</option>
              </select>
              <select className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 outline-none focus:border-amber-400 cursor-pointer"
                value={filterEvent} onChange={e=>setFilterEvent(e.target.value)}>
                <option value="All">Semua Event</option>
                {EVENTS.map(ev=><option key={ev} value={ev}>{ev}</option>)}
              </select>
              <select className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 outline-none focus:border-amber-400 cursor-pointer"
                value={filterPTS} onChange={e=>setFilterPTS(e.target.value)}>
                <option value="All">Semua Anggota</option>
                {teamMembers.map(m=><option key={m} value={m}>{m}</option>)}
              </select>
              <select className="px-2.5 py-1.5 rounded-lg text-xs border border-gray-200 bg-gray-50 outline-none focus:border-amber-400 cursor-pointer"
                value={filterYear} onChange={e=>setFilterYear(e.target.value)}>
                <option value="All">Semua Tahun</option>
                {availableYears.map(y=><option key={y} value={y}>{y}</option>)}
              </select>
              <button onClick={fetchLogs} disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-60"
                style={{background:'white'}}>
                <svg className={`w-3.5 h-3.5 ${loading?'animate-spin':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{minWidth:1100}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 w-10">No</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap w-28">Tanggal</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 w-32">Nama Penerima</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 w-32">Nama Pengirim</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 w-36">Project</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap w-24">Status</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap w-28">Event</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400" style={{minWidth:300}}>Type &amp; SN</th>
                  <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 rounded-full animate-spin" style={{border:'3px solid #fde68a',borderTopColor:'#f59e0b'}}/>
                      <span className="text-gray-400 text-sm">Memuat data...</span>
                    </div>
                  </td></tr>
                ) : filteredLogs.length===0 ? (
                  <tr><td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-4xl opacity-30">📦</span>
                      <span className="text-gray-400 text-sm">Belum ada data movement log</span>
                    </div>
                  </td></tr>
                ) : filteredLogs.map((log,idx)=>{
                  const isMasuk   = log.status_barang==='Masuk';
                  const typeLines = splitTypeLines(log.type_barang);
                  return (
                    <tr key={log.id} className="transition-colors hover:bg-amber-50/40" style={{borderBottom:'1px solid #f1f5f9'}}>
                      <td className="px-3 py-3 text-xs font-bold text-gray-400">{idx+1}</td>
                      <td className="px-3 py-3 text-xs text-gray-600 whitespace-nowrap">{fmtDate(log.tanggal)}</td>
                      <td className="px-3 py-3">
                        {isMasuk
                          ? <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg whitespace-nowrap">{log.nama_pts||'-'}</span>
                          : <span className="text-xs text-gray-600">{log.nama_luar||'-'}</span>}
                      </td>
                      <td className="px-3 py-3">
                        {!isMasuk
                          ? <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg whitespace-nowrap">{log.nama_pts||'-'}</span>
                          : <span className="text-xs text-gray-600">{log.nama_luar||'-'}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className="text-xs font-semibold text-gray-800 leading-snug">{log.project_name||'-'}</span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap"
                          style={isMasuk?{background:'#d1fae5',color:'#065f46'}:{background:'#fee2e2',color:'#991b1b'}}>
                          {isMasuk?'📥':'📤'} {log.status_barang}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-100 whitespace-nowrap">
                          {log.event||'-'}
                        </span>
                      </td>
                      {/* Type & SN — wide, no truncation, each item on its own line */}
                      <td className="px-3 py-3" style={{minWidth:300}}>
                        {typeLines.length>0 ? (
                          <div className="space-y-0.5">
                            {typeLines.map((line,li)=>(
                              <p key={li} className="text-xs text-gray-800 leading-snug">{line}</p>
                            ))}
                          </div>
                        ) : <span className="text-xs text-gray-400">-</span>}
                        {log.serial_number&&(
                          <p className="text-[10px] text-gray-400 font-mono mt-1">SN: {log.serial_number}</p>
                        )}
                      </td>
                      {/* Action — emoji icons matching Reminder Schedule & Ticketing */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={()=>setViewLog(log)} title="Lihat Detail" className="text-blue-500 hover:text-blue-700 transition-colors">
                            <span className="text-sm">👁</span>
                          </button>
                          {isAdmin&&<>
                            <button onClick={()=>setEditLog(log)} title="Edit" className="text-amber-500 hover:text-amber-700 transition-colors">
                              <span className="text-sm">✏️</span>
                            </button>
                            <button onClick={()=>setDeleteConfirm(log)} title="Hapus" className="text-red-400 hover:text-red-600 transition-colors">
                              <span className="text-sm">🗑️</span>
                            </button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100" style={{background:'rgba(255,255,255,0.97)'}}>
            <span className="text-[10px] text-gray-400">{filteredLogs.length} log ditemukan</span>
            <span className="text-[10px] text-gray-400">{filteredLogs.length>0?`1–${filteredLogs.length}`:'0'} of {logs.length}</span>
          </div>
        </div>

        {/* Setup hint */}
        <div className="rounded-2xl p-4" style={{background:'rgba(255,255,255,0.7)',border:'1px solid rgba(200,200,200,0.4)'}}>
          <p className="font-bold text-gray-700 text-xs mb-2">📌 Supabase Setup</p>
          <pre className="text-[10px] bg-gray-100 rounded-lg p-3 overflow-x-auto font-mono leading-relaxed">{`CREATE TABLE IF NOT EXISTS movement_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tanggal date NOT NULL, nama_pts text, nama_luar text,
  status_barang text CHECK (status_barang IN ('Masuk','Keluar')),
  event text, project_name text, type_barang text,
  serial_number text, catatan text,
  foto_surat_url text, foto_barang_url text,
  created_by text, created_at timestamptz DEFAULT now()
);
ALTER TABLE movement_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON movement_logs FOR ALL USING (true) WITH CHECK (true);

-- Storage: Dashboard → Storage → New bucket → Name: movement-files → Public: ON`}</pre>
        </div>
      </div>
    </div>
  );
}
