'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Fonnte WA ────────────────────────────────────────────────────────────────
const FONNTE_TOKEN = process.env.NEXT_PUBLIC_FONNTE_TOKEN ?? '';

async function sendFonnteWA(target: string, message: string): Promise<boolean> {
  try {
    const phone = target.replace(/\D/g, '').replace(/^0/, '62');
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { 'Authorization': FONNTE_TOKEN },
      body: new URLSearchParams({ target: phone, message, countryCode: '62' }),
    });
    const data = await res.json();
    return data.status === true;
  } catch {
    return false;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Priority = 'low' | 'medium' | 'high' | 'urgent';
type Status = 'pending' | 'done' | 'cancelled';
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly';

interface Reminder {
  id: string;
  title: string;
  description: string;
  assigned_to: string;
  assigned_name: string;
  due_date: string;
  due_time: string;
  priority: Priority;
  status: Status;
  repeat: RepeatType;
  category: string;
  sales_name: string;
  project_location: string;
  pic_name: string;
  pic_phone: string;
  created_by: string;
  created_at: string;
  notes?: string;
  wa_sent_h1?: boolean;
}

interface TeamUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  team_type?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string; border: string; dot: string }> = {
  low:    { label: 'Low',    color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.4)', dot: '#94a3b8' },
  medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  border: 'rgba(245,158,11,0.4)',  dot: '#f59e0b' },
  high:   { label: 'High',   color: '#f97316', bg: 'rgba(249,115,22,0.15)',  border: 'rgba(249,115,22,0.4)',  dot: '#f97316' },
  urgent: { label: 'Urgent', color: '#f43f5e', bg: 'rgba(244,63,94,0.2)',    border: 'rgba(244,63,94,0.5)',   dot: '#f43f5e' },
};

const STATUS_CONFIG: Record<Status, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:     { label: 'Pending',    color: '#92400e', bg: '#fef3c7', border: '#f59e0b', icon: '⏳' },
  done:        { label: 'Completed',  color: '#065f46', bg: '#d1fae5', border: '#10b981', icon: '✅' },
  cancelled:   { label: 'Cancelled', color: '#374151', bg: '#f3f4f6', border: '#6b7280', icon: '❌' },
};

const CATEGORIES = ['Demo Product', 'Meeting & Survey', 'Konfigurasi', 'Troubleshooting', 'Training'];

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bg: string; border: string; accent: string }> = {
  'Demo Product':     { icon: '🖥️', color: '#a78bfa', bg: 'rgba(167,139,250,0.15)', border: 'rgba(167,139,250,0.4)', accent: '#7c3aed' },
  'Meeting & Survey': { icon: '🤝', color: '#38bdf8', bg: 'rgba(56,189,248,0.15)',   border: 'rgba(56,189,248,0.4)',   accent: '#0ea5e9' },
  'Konfigurasi':      { icon: '⚙️', color: '#34d399', bg: 'rgba(52,211,153,0.15)',   border: 'rgba(52,211,153,0.4)',   accent: '#10b981' },
  'Troubleshooting':  { icon: '🔧', color: '#fb7185', bg: 'rgba(251,113,133,0.15)',   border: 'rgba(251,113,133,0.4)',  accent: '#e11d48' },
  'Training':         { icon: '🎓', color: '#fbbf24', bg: 'rgba(251,191,36,0.15)',    border: 'rgba(251,191,36,0.4)',   accent: '#d97706' },
};

const REPEAT_OPTIONS: { value: RepeatType; label: string }[] = [
  { value: 'none',    label: 'Tidak Berulang' },
  { value: 'daily',   label: 'Setiap Hari' },
  { value: 'weekly',  label: 'Setiap Minggu' },
  { value: 'monthly', label: 'Setiap Bulan' },
];

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDatetime(createdAt: string) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function isDueToday(due_date: string) {
  return due_date === new Date().toISOString().split('T')[0];
}

function isH1Before(due_date: string): boolean {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  return due_date === tomorrowStr;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: Priority }) {
  const c = PRIORITY_CONFIG[priority];
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {c.label}
    </span>
  );
}

function StatusBadge({ status }: { status: Status }) {
  const c = STATUS_CONFIG[status];
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      {c.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_CONFIG[category] ?? { icon: '📁', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)', border: 'rgba(148,163,184,0.3)', accent: '#64748b' };
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ color: c.color, background: c.bg, border: `1px solid ${c.border}` }}>
      {c.icon} {category}
    </span>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold mb-1.5 tracking-widest uppercase" style={{ color: '#94a3b8' }}>{label}</label>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b" style={{ borderColor: 'rgba(0,0,0,0.1)' }}>
      <span className="text-lg">{icon}</span>
      <span className="text-sm font-bold tracking-wide text-slate-700">{title}</span>
    </div>
  );
}

function SectionHeaderSmall({ icon, title }: { icon: string; title: string }) {
  return (
    <p className="text-[10px] font-bold tracking-widest uppercase flex items-center gap-1.5" style={{ color: '#94a3b8' }}>
      <span>{icon}</span>{title}
    </p>
  );
}

function InfoRow({ icon, label, value }: { icon: string; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <span className="text-base flex-shrink-0">{icon}</span>
      <div className="min-w-0">
        <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>{label}</p>
        <p className="text-sm font-semibold text-slate-800 break-words">{value}</p>
      </div>
    </div>
  );
}

// ─── Pie Chart Component ─────────────────────────────────────────────────────

function MiniPieChart({
  data, title, icon,
  onSliceClick,
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
    const x1 = cx + r * Math.cos(cumulativeAngle);
    const y1 = cy + r * Math.sin(cumulativeAngle);
    const x2 = cx + r * Math.cos(cumulativeAngle + angle);
    const y2 = cy + r * Math.sin(cumulativeAngle + angle);
    const xi1 = cx + innerR * Math.cos(cumulativeAngle);
    const yi1 = cy + innerR * Math.sin(cumulativeAngle);
    const xi2 = cx + innerR * Math.cos(cumulativeAngle + angle);
    const yi2 = cy + innerR * Math.sin(cumulativeAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z`;
    const midAngle = cumulativeAngle + angle / 2;
    cumulativeAngle += angle;
    return { ...d, path, midAngle, i };
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
              onMouseEnter={() => setHovered(s.i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSliceClick && onSliceClick(s.label)} />
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          {slices.map((s) => (
            <div key={s.i}
              className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
              style={{ background: hovered === s.i ? `${s.color}15` : 'transparent' }}
              onMouseEnter={() => setHovered(s.i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSliceClick && onSliceClick(s.label)}>
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

// ─── Mini Calendar ────────────────────────────────────────────────────────────

function MiniCalendar({ reminders, calendarMonth, setCalendarMonth, selectedCalDay, setSelectedCalDay }: {
  reminders: Reminder[];
  calendarMonth: Date;
  setCalendarMonth: (d: Date) => void;
  selectedCalDay: string | null;
  setSelectedCalDay: (s: string | null) => void;
}) {
  const y = calendarMonth.getFullYear(), m = calendarMonth.getMonth();
  const firstDay = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];

  const getCount = (day: number) => {
    const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    return reminders.filter(r => r.due_date === ds).length;
  };

  const totalThisMonth = reminders.filter(r => r.due_date.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length;

  return (
    <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)', width: 380 }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
        <button onClick={() => setCalendarMonth(new Date(y, m-1, 1))} className="text-white/80 hover:text-white font-bold text-lg px-2 py-0.5 rounded-lg hover:bg-white/10 transition-all">‹</button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">{monthNames[m]} {y}</p>
          <p className="text-white/70 text-[10px] mt-0.5">{totalThisMonth} jadwal bulan ini</p>
        </div>
        <button onClick={() => setCalendarMonth(new Date(y, m+1, 1))} className="text-white/80 hover:text-white font-bold text-lg px-2 py-0.5 rounded-lg hover:bg-white/10 transition-all">›</button>
      </div>

      <div className="p-3">
        <div className="grid grid-cols-7 mb-1.5">
          {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d,i) => (
            <div key={i} className="text-center text-[10px] font-bold py-1" style={{ color: '#94a3b8' }}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: (firstDay === 0 ? 6 : firstDay - 1) }).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const ds = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            const cnt = getCount(day);
            const isSel = selectedCalDay === ds;
            const isToday = ds === today;
            return (
              <button key={day} onClick={() => setSelectedCalDay(isSel ? null : ds)}
                className="relative flex flex-col items-center justify-center rounded-lg transition-all hover:scale-105"
                style={{
                  width: '100%', aspectRatio: '1',
                  background: isSel ? '#dc2626' : isToday ? 'rgba(220,38,38,0.12)' : cnt > 0 ? 'rgba(99,102,241,0.08)' : 'transparent',
                  border: isToday && !isSel ? '2px solid rgba(220,38,38,0.5)' : isSel ? '2px solid #b91c1c' : cnt > 0 ? '1.5px solid rgba(99,102,241,0.22)' : '2px solid transparent',
                  boxShadow: isSel ? '0 2px 8px rgba(220,38,38,0.35)' : 'none',
                }}>
                <span className={`leading-none font-${cnt > 0 ? 'black' : 'semibold'} text-xs`}
                  style={{ color: isSel ? 'white' : isToday ? '#dc2626' : cnt > 0 ? '#4f46e5' : '#374151' }}>{day}</span>
                {cnt > 0 && (
                  <span className="text-[8px] font-bold leading-none mt-0.5 px-1.5 rounded-full"
                    style={{ background: isSel ? 'rgba(255,255,255,0.35)' : '#4f46e5', color: 'white' }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selectedCalDay && (() => {
        const dayRems = reminders.filter(r => r.due_date === selectedCalDay);
        return dayRems.length > 0 ? (
          <div className="border-t p-3 space-y-2" style={{ borderColor: 'rgba(0,0,0,0.08)', background: 'rgba(249,250,251,0.8)' }}>
            <p className="text-[10px] font-bold tracking-widest uppercase text-gray-500 px-1">
              📅 {formatDate(selectedCalDay)} — {dayRems.length} jadwal
            </p>
            {dayRems.map(r => (
              <div key={r.id} className="rounded-xl p-3 border"
                style={{ background: 'white', borderColor: 'rgba(0,0,0,0.08)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-800 truncate">{r.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">⏰ {r.due_time} · 👤 {r.assigned_name}</p>
                  </div>
                  <CategoryBadge category={r.category} />
                </div>
              </div>
            ))}
          </div>
        ) : null;
      })()}
    </div>
  );
}

// ─── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ userName }: { userName?: string }) {
  const [step, setStep] = useState(0);
  const steps = ['Menghubungkan ke server...', 'Memuat data reminder...', 'Menyiapkan tampilan...', 'Hampir siap...'];
  useEffect(() => {
    const timers = steps.map((_, i) => setTimeout(() => setStep(i + 1), 400 * (i + 1)));
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
      <div className="flex flex-col items-center gap-8 p-10 rounded-3xl max-w-sm w-full mx-4"
        style={{ background: 'rgba(255,255,255,0.95)', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', boxShadow: '0 8px 24px rgba(220,38,38,0.4)' }}>
          <span className="text-4xl">🗓️</span>
        </div>
        <div className="text-center">
          <p className="text-gray-500 text-sm">Selamat datang,</p>
          <h2 className="text-xl font-black text-gray-800">{userName}</h2>
        </div>
        <div className="w-full space-y-2.5">
          {steps.map((s, i) => (
            <div key={i} className={`flex items-center gap-3 text-sm font-medium transition-all duration-300 ${step > i ? 'opacity-100' : 'opacity-30'}`}>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${step > i ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                {step > i ? '✓' : '○'}
              </span>
              <span className={step > i ? 'text-gray-700' : 'text-gray-400'}>{s}</span>
            </div>
          ))}
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-700 transition-all duration-500"
            style={{ width: `${(step / steps.length) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Reschedule Modal ─────────────────────────────────────────────────────────

function RescheduleModal({
  reminder,
  onClose,
  onSave,
}: {
  reminder: Reminder;
  onClose: () => void;
  onSave: (newDate: string, newTime: string, reason: string) => void;
}) {
  const [newDate, setNewDate] = useState(reminder.due_date);
  const [newTime, setNewTime] = useState(reminder.due_time);
  const [reason, setReason] = useState('');
  const inputStyle = { background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.15)' };
  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-red-500/40";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{ animation: 'scale-in 0.25s ease-out', border: '2px solid rgba(245,158,11,0.5)' }}>
        {/* Header */}
        <div className="px-6 py-5" style={{ background: 'linear-gradient(135deg,#d97706,#b45309)' }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">📅 Re-Schedule Jadwal</h3>
              <p className="text-amber-200/80 text-xs mt-0.5 truncate max-w-[260px]">{reminder.title}</p>
            </div>
            <button onClick={onClose} className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {/* Current date info */}
          <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            <span className="text-xl">📌</span>
            <div>
              <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Jadwal Sekarang</p>
              <p className="text-sm font-bold text-gray-800">{formatDate(reminder.due_date)} · {reminder.due_time}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 tracking-widest uppercase" style={{ color: '#94a3b8' }}>Tanggal Baru *</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 tracking-widest uppercase" style={{ color: '#94a3b8' }}>Waktu Baru</label>
              <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                className={inputCls} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 tracking-widest uppercase" style={{ color: '#94a3b8' }}>Alasan Re-Schedule</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              className={`${inputCls} resize-none`} style={inputStyle}
              placeholder="Contoh: Permintaan klien untuk mengundur jadwal..." />
          </div>

          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
              style={{ background: 'rgba(255,255,255,0.55)', color: '#64748b', border: '1px solid rgba(0,0,0,0.12)' }}>
              Batal
            </button>
            <button onClick={() => { if (newDate) onSave(newDate, newTime, reason); }}
              disabled={!newDate}
              className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 4px 14px rgba(217,119,6,0.35)' }}>
              📅 Simpan Re-Schedule
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReminderSchedulePage() {
  const [appReady, setAppReady]             = useState(false);
  const [dashLoading, setDashLoading]       = useState(false);
  const [isLoggedIn, setIsLoggedIn]         = useState(false);
  const [loginForm, setLoginForm]           = useState({ username: '', password: '' });
  const [loginTime, setLoginTime]           = useState<number | null>(null);
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showBellPopup, setShowBellPopup]   = useState(false);
  const [myReminders, setMyReminders]       = useState<Reminder[]>([]);
  const [currentUser, setCurrentUser]       = useState<TeamUser | null>(null);
  const [teamUsers, setTeamUsers]           = useState<TeamUser[]>([]);
  const [reminders, setReminders]           = useState<Reminder[]>([]);
  const [listLoading, setListLoading]       = useState(false);
  const [saving, setSaving]                 = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState<Reminder | null>(null);

  const [view, setView]                     = useState<'list' | 'form'>('list');
  const [detailReminder, setDetailReminder] = useState<Reminder | null>(null);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  // Filters — extended with team handler & category
  const [filterStatus, setFilterStatus]     = useState<Status | 'all'>('all');
  const [filterYear, setFilterYear]         = useState<string>('all');
  const [searchProject, setSearchProject]   = useState('');
  const [searchSales, setSearchSales]       = useState('');
  const [searchTeamHandler, setSearchTeamHandler] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [calendarMonth, setCalendarMonth]   = useState(new Date());
  const [toast, setToast]                   = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);
  const [exportLoading, setExportLoading]   = useState(false);
  const [sendingWA, setSendingWA]           = useState<string | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const emptyForm: Omit<Reminder, 'id' | 'created_at' | 'assigned_name' | 'created_by' | 'wa_sent_h1'> = {
    title: '', description: '', assigned_to: '',
    due_date: new Date().toISOString().split('T')[0],
    due_time: '09:00', priority: 'medium', status: 'pending',
    repeat: 'none', category: 'Demo Product',
    sales_name: '', project_location: '', pic_name: '', pic_phone: '',
    notes: '',
  };
  const [formData, setFormData] = useState(emptyForm);
  const fd = (patch: Partial<typeof emptyForm>) => setFormData(prev => ({ ...prev, ...patch }));

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const initApp = async () => {
      await fetchTeamUsers();
      await fetchRemindersQuiet();
      const saved = localStorage.getItem('currentUser');
      const savedTime = localStorage.getItem('loginTime');
      if (saved && savedTime) {
        const user = JSON.parse(saved);
        const time = parseInt(savedTime);
        if (Date.now() - time > 6 * 60 * 60 * 1000) {
          localStorage.removeItem('currentUser');
          localStorage.removeItem('loginTime');
        } else {
          setCurrentUser(user);
          setIsLoggedIn(true);
          setLoginTime(time);
        }
      }
      setTimeout(() => setAppReady(true), 1800);
    };
    initApp();
    const ch = supabase.channel('reminders-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => fetchRemindersQuiet())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // ─── H-1 WA auto-send check (runs on reminders load) ─────────────────────

  useEffect(() => {
    if (!reminders.length || !FONNTE_TOKEN) return;
    const checkAndSendH1 = async () => {
      const h1Pending = reminders.filter(r =>
        r.status === 'pending' &&
        !r.wa_sent_h1 &&
        isH1Before(r.due_date) &&
        r.pic_phone
      );
      for (const r of h1Pending) {
        const assigneeUser = teamUsers.find(u => u.username === r.assigned_to);
        const msg =
          `⏰ *REMINDER H-1 JADWAL*\n\n` +
          `📋 *${r.title}*\n` +
          `🏷️ Kategori: ${r.category}\n` +
          `📍 Lokasi: ${r.project_location || '-'}\n` +
          `👤 Sales: ${r.sales_name || '-'}\n` +
          `🕐 Jadwal: *${formatDate(r.due_date)} · ${r.due_time}*\n` +
          `👷 Handler: ${r.assigned_name || '-'}\n` +
          (r.notes ? `📝 Catatan: ${r.notes}\n` : '') +
          `\n_Pesan otomatis dari Reminder Schedule PTS IVP_`;

        const ok = await sendFonnteWA(r.pic_phone, msg);
        if (ok) {
          await supabase.from('reminders').update({ wa_sent_h1: true }).eq('id', r.id);
        }
      }
    };
    checkAndSendH1();
  }, [reminders, teamUsers]);

  const fetchTeamUsers = async () => {
    const { data } = await supabase.from('users').select('id, username, full_name, role, team_type').order('full_name');
    if (data) setTeamUsers(data.filter((u: TeamUser) => u.team_type === 'Team PTS'));
  };

  const fetchRemindersQuiet = async () => {
    const { data, error } = await supabase.from('reminders').select('*')
      .order('due_date', { ascending: true }).order('due_time', { ascending: true });
    if (!error && data) setReminders(data as Reminder[]);
  };

  const fetchReminders = async () => {
    setListLoading(true);
    const { data, error } = await supabase.from('reminders').select('*')
      .order('due_date', { ascending: true }).order('due_time', { ascending: true });
    if (!error && data) setReminders(data as Reminder[]);
    setTimeout(() => setListLoading(false), 400);
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formData.title.trim())            { notify('error', 'Judul reminder wajib diisi!');  return; }
    if (!formData.assigned_to)             { notify('error', 'Pilih anggota team!');           return; }
    if (!formData.due_date)                { notify('error', 'Tanggal wajib diisi!');          return; }
    if (!formData.sales_name.trim())       { notify('error', 'Nama Sales wajib diisi!');       return; }
    if (!formData.project_location.trim()) { notify('error', 'Lokasi Project wajib diisi!');  return; }

    const assignee = teamUsers.find(u => u.username === formData.assigned_to);
    const payload = { ...formData, assigned_name: assignee?.full_name ?? formData.assigned_to, created_by: currentUser?.username ?? 'system' };

    setSaving(true);
    const { error } = editingReminder
      ? await supabase.from('reminders').update(payload).eq('id', editingReminder.id)
      : await supabase.from('reminders').insert([payload]);

    if (error) notify('error', 'Gagal menyimpan: ' + error.message);
    else notify('success', editingReminder ? 'Reminder diperbarui!' : 'Reminder ditambahkan!');

    setSaving(false);
    setView('list');
    setEditingReminder(null);
    setFormData(emptyForm);
    fetchRemindersQuiet();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus reminder ini?')) return;
    const { error } = await supabase.from('reminders').delete().eq('id', id);
    if (error) { notify('error', 'Gagal menghapus.'); return; }
    notify('success', 'Reminder dihapus.');
    setDetailReminder(null);
    fetchRemindersQuiet();
  };

  const handleStatusChange = async (id: string, status: Status) => {
    const { error } = await supabase.from('reminders').update({ status }).eq('id', id);
    if (error) { notify('error', 'Gagal update status.'); return; }
    notify('success', 'Status diperbarui!');
    fetchRemindersQuiet();
    if (detailReminder?.id === id) setDetailReminder(prev => prev ? { ...prev, status } : null);
  };

  const openEdit = (r: Reminder) => {
    setEditingReminder(r);
    setFormData({ title: r.title, description: r.description, assigned_to: r.assigned_to, due_date: r.due_date,
      due_time: r.due_time, priority: r.priority, status: r.status, repeat: r.repeat, category: r.category,
      sales_name: r.sales_name ?? '', project_location: r.project_location ?? '',
      pic_name: r.pic_name ?? '', pic_phone: r.pic_phone ?? '', notes: r.notes ?? '' });
    setDetailReminder(null);
    setView('form');
  };

  // ─── Re-Schedule ───────────────────────────────────────────────────────────

  const handleReschedule = async (newDate: string, newTime: string, reason: string) => {
    if (!rescheduleTarget) return;
    const noteAdd = reason ? `\n[Re-Schedule ${formatDate(newDate)}: ${reason}]` : '';
    const { error } = await supabase.from('reminders').update({
      due_date: newDate,
      due_time: newTime,
      wa_sent_h1: false,
      notes: (rescheduleTarget.notes ?? '') + noteAdd,
    }).eq('id', rescheduleTarget.id);
    if (error) { notify('error', 'Gagal re-schedule.'); return; }
    notify('success', `Jadwal berhasil dipindah ke ${formatDate(newDate)}!`);
    setRescheduleTarget(null);
    setDetailReminder(null);
    fetchRemindersQuiet();
  };

  // ─── Manual WA send ────────────────────────────────────────────────────────

  const handleSendWA = async (r: Reminder) => {
    if (!r.pic_phone) { notify('error', 'Nomor PIC tidak tersedia.'); return; }
    setSendingWA(r.id);
    const msg =
      `📋 *REMINDER JADWAL PTS IVP*\n\n` +
      `*${r.title}*\n` +
      `🏷️ Kategori: ${r.category}\n` +
      `📍 Lokasi: ${r.project_location || '-'}\n` +
      `👤 Sales: ${r.sales_name || '-'}\n` +
      `🕐 Jadwal: *${formatDate(r.due_date)} · ${r.due_time}*\n` +
      `👷 Handler: ${r.assigned_name || '-'}\n` +
      (r.notes ? `📝 Catatan: ${r.notes}\n` : '') +
      `\n_Pesan dari Reminder Schedule PTS IVP_`;
    const ok = await sendFonnteWA(r.pic_phone, msg);
    setSendingWA(null);
    if (ok) notify('success', `WA berhasil dikirim ke ${r.pic_name || r.pic_phone}!`);
    else notify('error', 'Gagal kirim WA. Cek token Fonnte.');
  };

  // ─── Export Excel ──────────────────────────────────────────────────────────

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const headers = ['No','Judul','Kategori','Sales','Lokasi Project','Assign To','Status','Prioritas','Tanggal','Waktu','PIC','No. PIC','Created By','Created At','Catatan'];
      const rows = filteredReminders.map((r, i) => [
        i + 1, r.title, r.category, r.sales_name, r.project_location, r.assigned_name,
        STATUS_CONFIG[r.status].label, PRIORITY_CONFIG[r.priority].label,
        r.due_date, r.due_time, r.pic_name, r.pic_phone, r.created_by,
        r.created_at ? new Date(r.created_at).toLocaleDateString('id-ID') : '', r.notes ?? '',
      ]);
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reminder_Schedule_PTS_IVP_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      notify('success', 'Export berhasil!');
    } catch { notify('error', 'Gagal export.'); }
    setExportLoading(false);
  };

  // ─── Filters ───────────────────────────────────────────────────────────────

  const availableYears = Array.from(new Set(reminders.map(r => r.due_date.substring(0, 4)))).sort((a, b) => b.localeCompare(a));

  const filteredReminders = reminders.filter(r => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (filterYear !== 'all' && !r.due_date.startsWith(filterYear)) return false;
    if (filterCategory !== 'all' && r.category !== filterCategory) return false;
    if (searchProject && !r.title.toLowerCase().includes(searchProject.toLowerCase()) &&
        !r.project_location?.toLowerCase().includes(searchProject.toLowerCase())) return false;
    if (searchSales && !r.sales_name?.toLowerCase().includes(searchSales.toLowerCase())) return false;
    if (searchTeamHandler && !r.assigned_name?.toLowerCase().includes(searchTeamHandler.toLowerCase()) &&
        !r.assigned_to?.toLowerCase().includes(searchTeamHandler.toLowerCase())) return false;
    if (selectedCalDay && r.due_date !== selectedCalDay) return false;
    return true;
  });

  const todayCount      = reminders.filter(r => isDueToday(r.due_date) && r.status !== 'done' && r.status !== 'cancelled').length;
  const pendingCount    = reminders.filter(r => r.status === 'pending').length;
  const doneCount       = reminders.filter(r => r.status === 'done').length;
  const totalCount      = reminders.length;

  // ─── Pie chart data ────────────────────────────────────────────────────────

  const sourceReminders = filterYear === 'all' ? reminders : reminders.filter(r => r.due_date.startsWith(filterYear));

  const projectPieData = (() => {
    const map: Record<string, number> = {};
    sourceReminders.forEach(r => { const k = r.category; map[k] = (map[k] || 0) + 1; });
    return Object.entries(map).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  })();

  const salesPieData = (() => {
    const map: Record<string, number> = {};
    sourceReminders.forEach(r => { if (r.sales_name) { map[r.sales_name] = (map[r.sales_name] || 0) + 1; } });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  })();

  const teamPtsPieData = (() => {
    const map: Record<string, number> = {};
    sourceReminders.forEach(r => { if (r.assigned_name) { map[r.assigned_name] = (map[r.assigned_name] || 0) + 1; } });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  })();

  const isAdmin = ['admin', 'superadmin', 'team_pts'].includes(currentUser?.role?.toLowerCase() ?? '');
  const canAddReminder = isAdmin || currentUser?.team_type === 'Team PTS';

  const myActiveReminders = reminders.filter(r =>
    currentUser && r.assigned_to === currentUser.username && r.status !== 'done' && r.status !== 'cancelled'
  );

  // ─── Style helpers ─────────────────────────────────────────────────────────
  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-red-500/40";
  const inputStyle = { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)' };

  // ─── Login handler ─────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('currentUser'); localStorage.removeItem('loginTime');
    setCurrentUser(null); setIsLoggedIn(false); setLoginTime(null);
  };

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*')
        .eq('username', loginForm.username).eq('password', loginForm.password).single();
      if (error || !data) { notify('error', 'Username atau password salah!'); return; }
      const now = Date.now();
      setDashLoading(true);
      setCurrentUser(data);
      setIsLoggedIn(true);
      setLoginTime(now);
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());

      const active = reminders.filter(r => r.assigned_to === data.username && r.status !== 'done' && r.status !== 'cancelled');
      setMyReminders(active);
      if (active.length > 0) setTimeout(() => setShowNotificationPopup(true), 600);
      setTimeout(() => setDashLoading(false), 2200);
    } catch { notify('error', 'Terjadi kesalahan.'); }
  };

  // ─── Not ready ─────────────────────────────────────────────────────────────
  if (!appReady) return <LoadingScreen userName="..." />;
  if (dashLoading) return <LoadingScreen userName={currentUser?.full_name} />;

  // ─── Login page ────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative"
        style={{ backgroundImage: `url('/IVP_Background.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} />
        {toast && (
          <div className={`fixed top-5 right-5 z-[200] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        )}
        <div className="relative z-10 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md" style={{ border: '2px solid rgba(220,38,38,0.3)' }}>
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', boxShadow: '0 6px 24px rgba(220,38,38,0.4)' }}>
              <span className="text-3xl">🗓️</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-center mb-1 text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Login</h1>
          <p className="text-center text-gray-600 font-semibold mb-6 text-sm">Reminder Schedule Platform<br/><span className="text-red-600 font-bold">PTS IVP — Team Work Planner</span></p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Username</label>
              <input type="text" value={loginForm.username}
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all font-medium bg-white"
                placeholder="Masukkan username"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Password</label>
              <input type="password" value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all font-medium bg-white"
                placeholder="Masukkan password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button onClick={handleLogin}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all">
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      backgroundImage: `url('/IVP_Background.png')`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-[200] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}
            style={{ boxShadow: toast.type === 'success' ? '0 4px 20px rgba(16,185,129,0.4)' : '0 4px 20px rgba(220,38,38,0.4)' }}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        )}

        {/* ── RESCHEDULE MODAL ── */}
        {rescheduleTarget && (
          <RescheduleModal
            reminder={rescheduleTarget}
            onClose={() => setRescheduleTarget(null)}
            onSave={handleReschedule}
          />
        )}

        {/* ── NOTIFICATION POPUP ── */}
        {showNotificationPopup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border-4 border-yellow-400"
              style={{ animation: 'scale-in 0.3s ease-out' }}>
              <div className="p-5 border-b-2 border-yellow-300" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl animate-bounce">🔔</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">Reminder Kamu</h3>
                      <p className="text-sm text-white/90">{myReminders.length} reminder aktif yang diassign ke kamu</p>
                    </div>
                  </div>
                  <button onClick={() => setShowNotificationPopup(false)} className="text-white hover:bg-white/20 rounded-lg p-2 font-bold">✕</button>
                </div>
              </div>
              <div className="max-h-[calc(80vh-140px)] overflow-y-auto p-4 space-y-2">
                {myReminders.map(r => (
                  <div key={r.id} onClick={() => { setDetailReminder(r); setShowNotificationPopup(false); }}
                    className="rounded-xl p-3 border-2 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                    style={{ background: 'rgba(249,250,251,0.9)', borderColor: '#e5e7eb' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <CategoryBadge category={r.category} />
                          <PriorityBadge priority={r.priority} />
                        </div>
                        <p className="font-bold text-sm text-gray-800 truncate">{r.title}</p>
                        {r.project_location && <p className="text-xs text-gray-500 mt-0.5">📍 {r.project_location}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <StatusBadge status={r.status} />
                        <p className="text-[10px] text-gray-500 mt-1">{formatDate(r.due_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <button onClick={() => setShowNotificationPopup(false)}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl font-bold transition-all">
                  ✕ Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── BELL POPUP ── */}
        {showBellPopup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border-4 border-yellow-400"
              style={{ animation: 'scale-in 0.3s ease-out' }}>
              <div className="p-5 border-b-2 border-yellow-300" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">🔔</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">Reminder Aktif Kamu</h3>
                      <p className="text-sm text-white/90">{myActiveReminders.length} aktif</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBellPopup(false)} className="text-white hover:bg-white/20 rounded-lg p-2 font-bold">✕</button>
                </div>
              </div>
              <div className="max-h-[calc(80vh-140px)] overflow-y-auto p-4 space-y-2">
                {myActiveReminders.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="font-semibold">Tidak ada reminder aktif</p>
                  </div>
                ) : myActiveReminders.map(r => (
                  <div key={r.id} onClick={() => { setDetailReminder(r); setShowBellPopup(false); }}
                    className="rounded-xl p-3 border-2 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                    style={{ background: 'rgba(249,250,251,0.9)', borderColor: '#e5e7eb' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <CategoryBadge category={r.category} />
                        </div>
                        <p className="font-bold text-sm text-gray-800 truncate">{r.title}</p>
                        {r.project_location && <p className="text-xs text-gray-500 mt-0.5">📍 {r.project_location}</p>}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <StatusBadge status={r.status} />
                        <p className="text-[10px] text-gray-500 mt-1">{formatDate(r.due_date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <button onClick={() => setShowBellPopup(false)}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-3 rounded-xl font-bold transition-all">
                  ✕ Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL POPUP ── */}
        {detailReminder && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) setDetailReminder(null); }}>
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden"
              style={{ animation: 'scale-in 0.25s ease-out', border: '1px solid rgba(0,0,0,0.1)' }}>
              <div className="px-8 py-6 relative" style={{
                background: (() => { const c = CATEGORY_CONFIG[detailReminder.category]; return c ? `linear-gradient(135deg,${c.accent}dd,${c.accent}88)` : 'linear-gradient(135deg,#1d4ed8,#1e40af)'; })()
              }}>
                <button onClick={() => setDetailReminder(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center font-bold text-lg">✕</button>
                <div className="flex flex-wrap gap-2 mb-3">
                  <PriorityBadge priority={detailReminder.priority} />
                  <StatusBadge status={detailReminder.status} />
                  <CategoryBadge category={detailReminder.category} />
                  {detailReminder.repeat !== 'none' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
                      🔁 {REPEAT_OPTIONS.find(r => r.value === detailReminder.repeat)?.label}
                    </span>
                  )}
                  {detailReminder.wa_sent_h1 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/80 text-white">✅ WA H-1 Terkirim</span>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-white leading-tight">{detailReminder.title}</h2>
                {detailReminder.description && <p className="text-white/80 text-sm mt-2">{detailReminder.description}</p>}
              </div>

              <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                <div>
                  <SectionHeaderSmall icon="📋" title="Detail Jadwal" />
                  <div className="mt-3 grid grid-cols-2 gap-4">
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>Assign To</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                          style={{ background: 'rgba(220,38,38,0.2)', color: '#dc2626' }}>
                          {detailReminder.assigned_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{detailReminder.assigned_name}</p>
                          <p className="text-xs" style={{ color: '#64748b' }}>@{detailReminder.assigned_to}</p>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(0,0,0,0.08)' }}>
                      <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>Tenggat Waktu</p>
                      <p className="text-sm font-bold text-slate-800">{formatDate(detailReminder.due_date)}</p>
                      <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>⏰ {detailReminder.due_time}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <SectionHeaderSmall icon="🏢" title="Informasi Project" />
                  <div className="mt-3 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                    <InfoRow icon="👤" label="Nama Sales" value={detailReminder.sales_name} />
                    <InfoRow icon="📍" label="Lokasi Project" value={detailReminder.project_location} />
                    {detailReminder.pic_name && <InfoRow icon="🙋" label="Nama PIC Project" value={detailReminder.pic_name} />}
                    {detailReminder.pic_phone && (
                      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <span className="text-base flex-shrink-0">📱</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#64748b' }}>No. Telepon PIC</p>
                          <a href={`tel:${detailReminder.pic_phone}`} className="text-sm font-semibold hover:underline" style={{ color: '#60a5fa' }}
                            onClick={e => e.stopPropagation()}>{detailReminder.pic_phone}</a>
                        </div>
                      </div>
                    )}
                    <InfoRow icon="👤" label="Created By" value={detailReminder.created_by} />
                  </div>
                </div>

                {detailReminder.notes && (
                  <div className="rounded-xl p-4" style={{ background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <p className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#f59e0b' }}>📝 Catatan</p>
                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{detailReminder.notes}</p>
                  </div>
                )}

                <div>
                  <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: '#64748b' }}>Update Status</p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(STATUS_CONFIG) as Status[]).map(s => {
                      const c = STATUS_CONFIG[s];
                      const isActive = detailReminder.status === s;
                      return (
                        <button key={s} onClick={() => handleStatusChange(detailReminder.id, s)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isActive ? 'ring-2 ring-offset-1 scale-105' : 'opacity-70 hover:opacity-100'}`}
                          style={{ background: c.bg, color: c.color, border: `2px solid ${c.border}`, '--tw-ring-color': c.border } as React.CSSProperties}>
                          {c.icon} {c.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Action buttons */}
                {isAdmin && (
                  <div className="flex gap-3 pt-2 flex-wrap">
                    {/* Re-Schedule button */}
                    <button onClick={() => { setRescheduleTarget(detailReminder); }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', color: 'white', boxShadow: '0 4px 12px rgba(217,119,6,0.3)' }}>
                      📅 Re-Schedule
                    </button>
                    {/* Send WA button */}
                    {detailReminder.pic_phone && (
                      <button onClick={() => handleSendWA(detailReminder)} disabled={sendingWA === detailReminder.id}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] disabled:opacity-60"
                        style={{ background: 'linear-gradient(135deg,#16a34a,#15803d)', color: 'white', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                        {sendingWA === detailReminder.id
                          ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          : '💬'}
                        Kirim WA
                      </button>
                    )}
                    <button onClick={() => openEdit(detailReminder)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: 'white', boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                      ✏️ Edit
                    </button>
                    <button onClick={() => handleDelete(detailReminder.id)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                      style={{ border: '1px solid rgba(220,38,38,0.35)', color: '#dc2626', background: 'rgba(220,38,38,0.08)' }}>
                      🗑️ Hapus
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER ── */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '3px solid #dc2626', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', boxShadow: '0 3px 12px rgba(220,38,38,0.4)' }}>
                <span className="text-lg">🗓️</span>
              </div>
              <div>
                <h1 className="text-base font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">Reminder Schedule</h1>
                <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#dc2626' }}>PTS IVP — Team Work Planner</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowBellPopup(true)}
                className="relative p-2 rounded-xl transition-all hover:bg-red-50 border-2 border-transparent hover:border-red-200">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {myActiveReminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: '#f59e0b' }}>
                    {myActiveReminders.length}
                  </span>
                )}
              </button>

              {view === 'list' && (
                <button onClick={handleExportExcel} disabled={exportLoading}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold transition-all hover:scale-105 border"
                  style={{ background: exportLoading ? '#f0fdf4' : '#16a34a', color: exportLoading ? '#16a34a' : 'white', borderColor: '#16a34a', boxShadow: '0 2px 8px rgba(22,163,74,0.3)' }}>
                  {exportLoading
                    ? <div className="w-3.5 h-3.5 border-2 border-green-300 border-t-green-600 rounded-full animate-spin" />
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  }
                  <span className="hidden sm:inline">{exportLoading ? 'Exporting...' : 'Export Excel'}</span>
                </button>
              )}

              {canAddReminder && view === 'list' && (
                <button onClick={() => { setEditingReminder(null); setFormData(emptyForm); setView('form'); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all hover:scale-105 hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  Tambah Reminder
                </button>
              )}

              {currentUser && (
                <div className="flex items-center gap-2 pl-2 border-l-2 border-gray-200">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
                    {currentUser.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-gray-800 leading-tight">{currentUser.full_name}</p>
                    <p className="text-[10px] text-gray-500">{currentUser.role}</p>
                  </div>
                  <button onClick={handleLogout}
                    className="ml-1 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 border-2 border-red-200 hover:bg-red-50 transition-all">
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">

          {/* ─── LIST VIEW ── */}
          {view === 'list' && (
            <>
              {/* ── Stat cards (clickable filter) ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  {
                    label: 'Total Jadwal', value: totalCount, sub: 'Semua reminder',
                    gradient: 'linear-gradient(135deg,#4f46e5,#6d28d9)', icon: '📋', shadow: 'rgba(79,70,229,0.35)',
                    onClick: () => { setFilterStatus('all'); setSelectedCalDay(null); },
                    active: filterStatus === 'all' && !selectedCalDay,
                  },
                  {
                    label: 'Pending', value: pendingCount, sub: 'Menunggu tindakan',
                    gradient: 'linear-gradient(135deg,#d97706,#b45309)', icon: '⏳', shadow: 'rgba(217,119,6,0.35)',
                    onClick: () => setFilterStatus(filterStatus === 'pending' ? 'all' : 'pending'),
                    active: filterStatus === 'pending',
                  },
                  {
                    label: 'Selesai', value: doneCount, sub: 'Terselesaikan',
                    gradient: 'linear-gradient(135deg,#059669,#047857)', icon: '✅', shadow: 'rgba(5,150,105,0.35)',
                    onClick: () => setFilterStatus(filterStatus === 'done' ? 'all' : 'done'),
                    active: filterStatus === 'done',
                  },
                  {
                    label: 'Hari Ini', value: todayCount, sub: 'Jadwal hari ini',
                    gradient: 'linear-gradient(135deg,#0891b2,#0e7490)', icon: '📅', shadow: 'rgba(8,145,178,0.35)',
                    onClick: () => setSelectedCalDay(selectedCalDay === new Date().toISOString().split('T')[0] ? null : new Date().toISOString().split('T')[0]),
                    active: selectedCalDay === new Date().toISOString().split('T')[0],
                  },
                ].map(card => (
                  <div key={card.label}
                    onClick={card.onClick}
                    className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.03] select-none"
                    style={{
                      background: card.gradient,
                      boxShadow: card.active ? `0 6px 24px ${card.shadow}` : `0 4px 16px ${card.shadow}`,
                      ring: card.active ? '3px solid white' : 'none',
                      outline: card.active ? '3px solid white' : 'none',
                      transform: card.active ? 'scale(1.04)' : undefined,
                    }}>
                    <div className="absolute right-3 top-2 text-4xl opacity-[0.15] select-none">{card.icon}</div>
                    {card.active && (
                      <div className="absolute inset-0 rounded-2xl border-4 border-white/50 pointer-events-none" />
                    )}
                    <span className="text-3xl font-black text-white leading-none">{card.value}</span>
                    <div>
                      <p className="text-sm font-bold text-white leading-tight">{card.label}</p>
                      <p className="text-[10px] font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{card.sub}</p>
                    </div>
                    {card.active && <span className="absolute top-2 left-2 text-white/80 text-[9px] font-bold uppercase tracking-widest">Filter Aktif ✓</span>}
                  </div>
                ))}
              </div>

              {/* ── Pie Charts — klick untuk filter ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <MiniPieChart
                  data={projectPieData} title="Kegiatan / Kategori" icon="🖥️"
                  onSliceClick={label => setFilterCategory(filterCategory === label ? 'all' : label)}
                />
                <MiniPieChart
                  data={salesPieData} title="Nama Sales" icon="👤"
                  onSliceClick={label => setSearchSales(searchSales === label ? '' : label)}
                />
                <MiniPieChart
                  data={teamPtsPieData} title="Team PTS" icon="👥"
                  onSliceClick={label => setSearchTeamHandler(searchTeamHandler === label ? '' : label)}
                />
              </div>

              {/* Active filter chips */}
              {(filterCategory !== 'all' || filterStatus !== 'all' || searchSales || searchTeamHandler || searchProject || selectedCalDay) && (
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter:</span>
                  {filterCategory !== 'all' && (
                    <button onClick={() => setFilterCategory('all')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80"
                      style={{ background: '#7c3aed' }}>
                      🏷️ {filterCategory} ✕
                    </button>
                  )}
                  {filterStatus !== 'all' && (
                    <button onClick={() => setFilterStatus('all')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80"
                      style={{ background: '#d97706' }}>
                      Status: {STATUS_CONFIG[filterStatus as Status]?.label} ✕
                    </button>
                  )}
                  {searchSales && (
                    <button onClick={() => setSearchSales('')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80"
                      style={{ background: '#0ea5e9' }}>
                      👤 {searchSales} ✕
                    </button>
                  )}
                  {searchTeamHandler && (
                    <button onClick={() => setSearchTeamHandler('')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80"
                      style={{ background: '#7c3aed' }}>
                      👷 {searchTeamHandler} ✕
                    </button>
                  )}
                  {searchProject && (
                    <button onClick={() => setSearchProject('')}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80"
                      style={{ background: '#dc2626' }}>
                      🔍 {searchProject} ✕
                    </button>
                  )}
                  {selectedCalDay && (
                    <button onClick={() => setSelectedCalDay(null)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white transition-all hover:opacity-80"
                      style={{ background: '#0891b2' }}>
                      📅 {formatDate(selectedCalDay)} ✕
                    </button>
                  )}
                  <button onClick={() => { setFilterCategory('all'); setFilterStatus('all'); setSearchSales(''); setSearchTeamHandler(''); setSearchProject(''); setSelectedCalDay(null); }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all hover:opacity-80"
                    style={{ background: 'rgba(0,0,0,0.1)', color: '#374151' }}>
                    Reset Semua
                  </button>
                </div>
              )}

              {/* Main area: list + calendar */}
              <div className="flex gap-4 items-start">

                {/* ── TICKET LIST ── */}
                <div className="flex-1 min-w-0 rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)' }}>

                  {/* Search + filter bar */}
                  <div className="px-5 pt-4 pb-3 flex flex-wrap gap-3 items-center" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    {/* Search project */}
                    <div className="flex-1 min-w-[150px] relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input value={searchProject} onChange={e => setSearchProject(e.target.value)}
                        className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-all focus:ring-2 focus:ring-red-400 outline-none"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                        placeholder="Search project / lokasi..." />
                    </div>
                    {/* Search sales */}
                    <div className="flex-1 min-w-[130px] relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <input value={searchSales} onChange={e => setSearchSales(e.target.value)}
                        className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-all focus:ring-2 focus:ring-red-400 outline-none"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                        placeholder="Search sales..." />
                    </div>
                    {/* Search Team Handler — NEW */}
                    <div className="flex-1 min-w-[140px] relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👷</span>
                      <input value={searchTeamHandler} onChange={e => setSearchTeamHandler(e.target.value)}
                        className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 transition-all focus:ring-2 focus:ring-purple-400 outline-none"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                        placeholder="Search team handler..." />
                    </div>
                    {/* Filter status */}
                    <div className="relative">
                      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                      </svg>
                      <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                        className="rounded-xl pl-9 pr-8 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-red-400 outline-none appearance-none cursor-pointer"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 130 }}>
                        <option value="all">All Status</option>
                        {(Object.keys(STATUS_CONFIG) as Status[]).map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
                    </div>
                    {/* Filter tahun */}
                    <div className="relative">
                      <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                        className="rounded-xl px-3 pr-8 py-2.5 text-sm text-gray-700 focus:ring-2 focus:ring-red-400 outline-none appearance-none cursor-pointer"
                        style={{ background: '#f8fafc', border: '1px solid #e2e8f0', minWidth: 110 }}>
                        <option value="all">Semua Tahun</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xs">▾</span>
                    </div>
                  </div>

                  {/* Ticket list header */}
                  <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-800 uppercase tracking-wide">TICKET LIST</span>
                      <span className="w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                        {filteredReminders.length}
                      </span>
                    </div>
                    <button onClick={fetchReminders} disabled={listLoading}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:bg-gray-100 border border-gray-200 text-gray-600 disabled:opacity-60"
                      style={{ background: 'white' }}>
                      <svg className={`w-3.5 h-3.5 ${listLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Refresh
                    </button>
                  </div>

                  {/* Table header — with Team Handler column */}
                  <div className="hidden md:grid px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-gray-400"
                    style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1.2fr 1fr 1.1fr 1.2fr 52px', borderBottom: '1px solid rgba(0,0,0,0.07)', background: '#fafafa' }}>
                    <span>NAMA PROJECT</span>
                    <span>KEGIATAN</span>
                    <span>SALES</span>
                    <span>TEAM HANDLER</span>
                    <span>PIC &amp; NO PIC</span>
                    <span>STATUS</span>
                    <span>TGL SCHEDULE</span>
                    <span className="text-right">ACT</span>
                  </div>

                  {/* Table body */}
                  {listLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-4">
                      <div className="w-10 h-10 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin" />
                      <p className="text-sm text-gray-500 font-medium">Memuat list...</p>
                    </div>
                  ) : filteredReminders.length === 0 ? (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-gray-600 font-semibold">Tidak ada reminder ditemukan</p>
                      <p className="text-sm text-gray-400 mt-1">Coba ubah filter atau tambahkan reminder baru</p>
                    </div>
                  ) : (
                    <div>
                      {filteredReminders.map((r) => {
                        const today = isDueToday(r.due_date);
                        return (
                          <div key={r.id}
                            className="px-5 py-4 transition-colors hover:bg-red-50/40 cursor-pointer"
                            style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', borderLeft: today ? '3px solid #dc2626' : '3px solid transparent' }}
                            onClick={() => setDetailReminder(r)}>

                            {/* Mobile layout */}
                            <div className="md:hidden space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base font-bold text-gray-800">{r.title}</span>
                                    <CategoryBadge category={r.category} />
                                  </div>
                                  <p className="text-xs text-gray-500">{formatDatetime(r.created_at)}</p>
                                </div>
                                <StatusBadge status={r.status} />
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                                {r.project_location && <span>📍 {r.project_location}</span>}
                                {r.sales_name && <span>👤 {r.sales_name}</span>}
                                <span>🎯 Target: {formatDate(r.due_date)}</span>
                              </div>
                            </div>

                            {/* Desktop table row — with Team Handler column */}
                            <div className="hidden md:grid items-center gap-3"
                              style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1.2fr 1fr 1.1fr 1.2fr 52px' }}>
                              {/* Nama Project */}
                              <div className="min-w-0">
                                <span className="font-bold text-gray-800 text-sm truncate block">{r.title}</span>
                                {r.project_location && <p className="text-[11px] text-gray-400 truncate mt-0.5">📍 {r.project_location.split(',')[0]}</p>}
                              </div>
                              {/* Kegiatan — larger text */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-lg">{(CATEGORY_CONFIG[r.category] ?? { icon: '📁' }).icon}</span>
                                  <span className="font-bold text-gray-800 text-sm">{r.category}</span>
                                </div>
                                {r.description && <p className="text-[10px] text-gray-400 truncate mt-0.5">{r.description}</p>}
                              </div>
                              {/* Sales */}
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-700 truncate">{r.sales_name || '—'}</p>
                              </div>
                              {/* Team Handler — NEW COLUMN */}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                                    style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>
                                    {r.assigned_name?.charAt(0)?.toUpperCase() || '?'}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-gray-800 truncate">{r.assigned_name}</p>
                                    <p className="text-[10px] text-gray-400">@{r.assigned_to}</p>
                                  </div>
                                </div>
                              </div>
                              {/* PIC & No PIC */}
                              <div className="min-w-0">
                                {r.pic_name ? (
                                  <>
                                    <p className="text-sm font-semibold text-gray-700 truncate flex items-center gap-1">
                                      <span className="text-[11px]">🙋</span>{r.pic_name}
                                    </p>
                                    {r.pic_phone && (
                                      <p className="text-[11px] text-gray-400 truncate flex items-center gap-1 mt-0.5">
                                        <span>📱</span>{r.pic_phone}
                                      </p>
                                    )}
                                  </>
                                ) : <span className="text-gray-300 text-sm">—</span>}
                              </div>
                              {/* Status */}
                              <div className="space-y-1">
                                <StatusBadge status={r.status} />
                                {r.wa_sent_h1 && (
                                  <p className="text-[9px] font-bold text-green-600 flex items-center gap-0.5">✅ WA H-1</p>
                                )}
                              </div>
                              {/* Tanggal Schedule */}
                              <div className="min-w-0">
                                <div className="inline-flex flex-col items-center px-3 py-1.5 rounded-xl text-center"
                                  style={{
                                    background: today ? 'rgba(220,38,38,0.12)' : 'rgba(99,102,241,0.08)',
                                    border: today ? '1px solid rgba(220,38,38,0.35)' : '1px solid rgba(99,102,241,0.2)',
                                  }}>
                                  <span className="text-xl font-black leading-none"
                                    style={{ color: today ? '#dc2626' : '#4f46e5' }}>
                                    {new Date(r.due_date + 'T00:00:00').getDate()}
                                  </span>
                                  <span className="text-[9px] font-bold uppercase tracking-wider leading-tight"
                                    style={{ color: today ? '#dc2626' : '#6366f1' }}>
                                    {new Date(r.due_date + 'T00:00:00').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })}
                                  </span>
                                  {r.due_time && <span className="text-[9px] text-gray-400 leading-tight mt-0.5">{r.due_time}</span>}
                                </div>
                              </div>
                              {/* Action */}
                              <div className="flex justify-end">
                                <button
                                  onClick={e => { e.stopPropagation(); setDetailReminder(r); }}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                                  style={{ border: '1px solid #e5e7eb' }}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* ── MINI CALENDAR SIDEBAR ── */}
                <MiniCalendar
                  reminders={reminders}
                  calendarMonth={calendarMonth}
                  setCalendarMonth={setCalendarMonth}
                  selectedCalDay={selectedCalDay}
                  setSelectedCalDay={setSelectedCalDay}
                />
              </div>
            </>
          )}

          {/* ─── FORM VIEW ── */}
          {view === 'form' && (
            <div className="max-w-2xl mx-auto">
              <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.1)', backdropFilter: 'blur(10px)' }}>
                <div className="px-8 py-6" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-white">{editingReminder ? '✏️ Edit Reminder' : '➕ Tambah Reminder'}</h2>
                      <p className="text-red-200/80 text-xs mt-1">Isi detail jadwal & informasi project</p>
                    </div>
                    <button onClick={() => { setView('list'); setEditingReminder(null); setFormData(emptyForm); }}
                      className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                <div className="p-8 space-y-5">
                  <SectionHeader icon="📋" title="Informasi Jadwal" />

                  <FormField label="Judul Reminder *">
                    <input value={formData.title} onChange={e => fd({ title: e.target.value })}
                      className={inputCls} style={inputStyle} placeholder="Contoh: Demo Projector @ PT. Maju Bersama" />
                  </FormField>

                  <FormField label="Deskripsi">
                    <textarea value={formData.description} onChange={e => fd({ description: e.target.value })}
                      rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Detail pekerjaan..." />
                  </FormField>

                  {/* Category picker — larger text as requested */}
                  <div>
                    <label className="block text-xs font-bold mb-2 tracking-widest uppercase" style={{ color: '#94a3b8' }}>Kategori *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CATEGORIES.map(cat => {
                        const c = CATEGORY_CONFIG[cat];
                        const sel = formData.category === cat;
                        return (
                          <button key={cat} type="button" onClick={() => fd({ category: cat })}
                            className="flex items-center gap-3 px-4 py-4 rounded-xl border-2 text-left transition-all"
                            style={sel
                              ? { borderColor: c.accent, background: c.bg, color: c.color }
                              : { borderColor: 'rgba(0,0,0,0.1)', background: 'rgba(255,255,255,0.5)', color: '#64748b' }}>
                            <span className="text-2xl">{c.icon}</span>
                            {/* ← Enlarged category label text */}
                            <span className="text-base font-bold leading-tight flex-1">{cat}</span>
                            {sel && <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Assign To *">
                      <select value={formData.assigned_to} onChange={e => fd({ assigned_to: e.target.value })}
                        className={inputCls} style={inputStyle}>
                        <option value="">-- Pilih Team PTS --</option>
                        {teamUsers.map(u => <option key={u.id} value={u.username}>{u.full_name}</option>)}
                      </select>
                    </FormField>
                    <FormField label="Pengulangan">
                      <select value={formData.repeat} onChange={e => fd({ repeat: e.target.value as RepeatType })}
                        className={inputCls} style={inputStyle}>
                        {REPEAT_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </FormField>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <FormField label="Tanggal *">
                      <input type="date" value={formData.due_date} onChange={e => fd({ due_date: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </FormField>
                    <FormField label="Waktu">
                      <input type="time" value={formData.due_time} onChange={e => fd({ due_time: e.target.value })}
                        className={inputCls} style={inputStyle} />
                    </FormField>
                    <FormField label="Prioritas">
                      <select value={formData.priority} onChange={e => fd({ priority: e.target.value as Priority })}
                        className={inputCls} style={inputStyle}>
                        {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </FormField>
                  </div>

                  {editingReminder && (
                    <FormField label="Status">
                      <select value={formData.status} onChange={e => fd({ status: e.target.value as Status })}
                        className={inputCls} style={inputStyle}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </FormField>
                  )}

                  <SectionHeader icon="🏢" title="Informasi Project" />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Nama Sales & Divisi *">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">👤</span>
                        <input value={formData.sales_name} onChange={e => fd({ sales_name: e.target.value })}
                          className={`${inputCls} pl-9`} style={inputStyle} placeholder="Dhany - IVP" />
                      </div>
                    </FormField>
                    <FormField label="Lokasi Project *">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">📍</span>
                        <input value={formData.project_location} onChange={e => fd({ project_location: e.target.value })}
                          className={`${inputCls} pl-9`} style={inputStyle} placeholder="Contoh: Gedung Wisma 46 Lt. 12" />
                      </div>
                    </FormField>
                  </div>

                  <SectionHeader icon="🎯" title="PIC Project (Opsional)" />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField label="Nama PIC">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">🙋</span>
                        <input value={formData.pic_name} onChange={e => fd({ pic_name: e.target.value })}
                          className={`${inputCls} pl-9`} style={inputStyle} placeholder="Nama PIC di lokasi" />
                      </div>
                    </FormField>
                    <FormField label="No. Telepon PIC (untuk WA H-1)">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2">📱</span>
                        <input type="tel" value={formData.pic_phone} onChange={e => fd({ pic_phone: e.target.value })}
                          className={`${inputCls} pl-9`} style={inputStyle} placeholder="08xxxxxxxxxx" />
                      </div>
                    </FormField>
                  </div>

                  {formData.pic_phone && (
                    <div className="rounded-xl p-3 flex items-start gap-3" style={{ background: 'rgba(22,163,74,0.08)', border: '1px solid rgba(22,163,74,0.25)' }}>
                      <span className="text-green-500 text-lg">💬</span>
                      <div>
                        <p className="text-sm font-bold text-green-700">WA Otomatis H-1</p>
                        <p className="text-xs text-green-600 mt-0.5">Pesan pengingat akan otomatis dikirim via WA ke <strong>{formData.pic_phone}</strong> sehari sebelum jadwal.</p>
                      </div>
                    </div>
                  )}

                  <SectionHeader icon="📝" title="Catatan Tambahan" />

                  <FormField label="Catatan">
                    <textarea value={formData.notes} onChange={e => fd({ notes: e.target.value })}
                      rows={2} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Informasi tambahan untuk team..." />
                  </FormField>

                  <div className="flex gap-3 pt-2">
                    <button onClick={() => { setView('list'); setEditingReminder(null); setFormData(emptyForm); }}
                      className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                      style={{ background: 'rgba(255,255,255,0.55)', color: '#64748b', border: '1px solid rgba(0,0,0,0.12)' }}>
                      Batal
                    </button>
                    <button onClick={handleSave} disabled={saving}
                      className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}>
                      {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {editingReminder ? 'Simpan Perubahan' : '➕ Tambah Reminder'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity:0; transform:translateY(14px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes scale-in {
          from { opacity:0; transform:scale(0.92); }
          to   { opacity:1; transform:scale(1); }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
        select option { background: #ffffff; color: #1e293b; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.25); border-radius: 4px; }
      `}</style>
    </div>
  );
}
