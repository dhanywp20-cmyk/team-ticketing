"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'team' | 'guest' | 'superadmin';
}

interface ReviewRecord {
  id: string;
  project_name: string;
  address: string;
  sales_name: string;
  sales_division: string;
  assign_name: string;
  review_category: 'Demo Product' | 'BAST';
  reminder_category: string;
  product: string;
  grade_product_knowledge: number;
  catatan_product_knowledge: string;
  grade_training_customer: number;
  catatan_training_customer: string;
  created_at: string;
  reminder_id?: string;
}

interface Reminder {
  id: string;
  project_name: string;
  category: string;
  sales_name: string;
  sales_division: string;
  assign_name: string;
  address: string;
  status: string;
  product?: string;
  due_date: string;
  due_time: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

const STATUS_PILLS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Demo Product': { label: 'Demo Product', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  'BAST':         { label: 'BAST',         color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconStar = ({ fill = "none", stroke = "currentColor", ...props }: { fill?: string; stroke?: string; [key: string]: any }) => (
  <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDay(dateStr: string) {
  return new Date(dateStr).getDate();
}

function formatMonthYear(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }).toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MiniPieChart({
  data, title, icon, activeFilter,
  onSliceClick,
}: {
  data: { label: string; value: number; color: string }[];
  title: string; icon: string;
  activeFilter?: string | null;
  onSliceClick?: (label: string) => void;
}) {
  const [hov, setHov] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  
  if (total === 0) return (
    <div className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}>
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{icon} {title}</p>
      <p className="text-gray-400 text-xs text-center py-6 font-bold">Belum ada data</p>
    </div>
  );

  let cumAngle = -Math.PI / 2;
  const cx = 60, cy = 60, r = 50, ir = 28;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    if (data.length === 1) return { ...d, path: '', isFullCircle: true, i };
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle), y2 = cy + r * Math.sin(cumAngle + angle);
    const xi1 = cx + ir * Math.cos(cumAngle), yi1 = cy + ir * Math.sin(cumAngle);
    const xi2 = cx + ir * Math.cos(cumAngle + angle), yi2 = cy + ir * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
    cumAngle += angle;
    return { ...d, path, isFullCircle: false, i };
  });

  return (
    <div className="rounded-2xl p-5 flex flex-col gap-3 min-h-[180px]" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
        <span>{icon}</span>{title}
      </p>
      <div className="flex items-center gap-4">
        <svg width="110" height="110" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map((s) => (
            s.isFullCircle ? (
              <g key={s.i} style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                onClick={() => onSliceClick && onSliceClick(s.label)}
                onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}>
                <circle cx={60} cy={60} r={50} fill={s.color}
                  opacity={hov === null || hov === s.i ? 1 : 0.45}
                  style={{ filter: hov === s.i || activeFilter === s.label ? `drop-shadow(0 0 5px ${s.color}66)` : 'none' }} />
                <circle cx={60} cy={60} r={28} fill="white" />
              </g>
            ) : (
            <path key={s.i} d={s.path} fill={s.color}
              opacity={hov === null || hov === s.i ? 1 : 0.45}
              style={{ cursor: onSliceClick ? 'pointer' : 'default', transition: 'all 0.15s', filter: hov === s.i || activeFilter === s.label ? `drop-shadow(0 0 5px ${s.color}66)` : 'none' }}
              onMouseEnter={() => setHov(s.i)}
              onMouseLeave={() => setHov(null)}
              onClick={() => onSliceClick && onSliceClick(s.label)} />
            )
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="18" fontWeight="900" fill="#1e293b">{total}</text>
          <text x="60" y="72" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="800">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1 flex-1 min-w-0 max-h-[120px] overflow-y-auto custom-scrollbar pr-1">
          {slices.map((s) => (
            <div key={s.i}
              className="flex items-center gap-1.5 cursor-pointer rounded-lg px-2 py-1 transition-all"
              style={{ background: hov === s.i || activeFilter === s.label ? `${s.color}15` : 'transparent' }}
              onMouseEnter={() => setHov(s.i)}
              onMouseLeave={() => setHov(null)}
              onClick={() => onSliceClick && onSliceClick(s.label)}>
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-[10px] font-bold text-slate-600 truncate flex-1">{s.label}</span>
              <span className="text-[10px] font-black text-slate-800">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniCalendar({ reviews, calendarMonth, setCalendarMonth, selectedCalDay, setSelectedCalDay }: {
  reviews: ReviewRecord[];
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
    return reviews.filter(r => r.created_at.startsWith(ds)).length;
  };

  const totalThisMonth = reviews.filter(r => r.created_at.startsWith(`${y}-${String(m+1).padStart(2,'0')}`)).length;

  return (
    <div className="rounded-2xl overflow-hidden flex-shrink-0" style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)', width: 380 }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
        <button onClick={() => setCalendarMonth(new Date(y, m-1, 1))} className="text-white hover:text-white font-black text-xl px-2">‹</button>
        <div className="text-center">
          <p className="text-white font-black text-sm tracking-tight">{monthNames[m]} {y}</p>
          <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">{totalThisMonth} review bulan ini</p>
        </div>
        <button onClick={() => setCalendarMonth(new Date(y, m+1, 1))} className="text-white hover:text-white font-black text-xl px-2">›</button>
      </div>
      <div className="p-3">
        <div className="grid grid-cols-7 mb-2">
          {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((d,i) => (
            <div key={i} className="text-center text-[10px] font-black py-1 text-slate-400">{d}</div>
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
                className="relative flex flex-col items-center justify-center rounded-xl transition-all hover:scale-105"
                style={{
                  width: '100%', aspectRatio: '1',
                  background: isSel ? '#dc2626' : isToday ? 'rgba(220,38,38,0.1)' : cnt > 0 ? 'rgba(99,102,241,0.06)' : 'transparent',
                  border: isToday && !isSel ? '2.5px solid rgba(220,38,38,0.4)' : isSel ? '2px solid #b91c1c' : cnt > 0 ? '1.5px solid rgba(99,102,241,0.2)' : '2px solid transparent',
                  boxShadow: isSel ? '0 4px 12px rgba(220,38,38,0.3)' : 'none',
                }}>
                <span className={`leading-none font-${cnt > 0 ? 'black' : 'bold'} text-xs`}
                  style={{ color: isSel ? 'white' : isToday ? '#dc2626' : cnt > 0 ? '#4f46e5' : '#475569' }}>{day}</span>
                {cnt > 0 && (
                  <span className="text-[8px] font-black leading-none mt-0.5 px-1.5 rounded-full py-0.5"
                    style={{ background: isSel ? 'rgba(255,255,255,0.3)' : '#4f46e5', color: 'white' }}>
                    {cnt}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Review Component ──────────────────────────────────────────────────

export default function FormReview() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchProject, setSearchProject] = useState('');
  const [searchSales, setSearchSales] = useState('');
  const [searchHandler, setSearchHandler] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState<string | null>(null);

  const [reviewForm, setReviewForm] = useState({
    product: '', grade_product_knowledge: 5, catatan_product_knowledge: '',
    grade_training_customer: 5, catatan_training_customer: '',
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const fetchData = useCallback(async (user: User) => {
    setLoading(true);
    let reviewQuery = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (user.role === 'guest') reviewQuery = reviewQuery.eq('sales_name', user.full_name);
    const { data: reviewData } = await reviewQuery;
    if (reviewData) setReviews(reviewData);

    let reminderQuery = supabase.from('reminders').select('*').eq('status', 'done').in('category', ['Demo Product', 'Konfigurasi & Training', 'Training', 'Konfigurasi']);
    if (user.role === 'guest') reminderQuery = reminderQuery.eq('sales_name', user.full_name);
    const { data: reminderData } = await reminderQuery;
    
    if (reminderData && reviewData) {
      const reviewedIds = new Set(reviewData.map((r: ReviewRecord) => r.reminder_id));
      const pending = reminderData.filter((r: Reminder) => !reviewedIds.has(r.id));
      setPendingReminders(pending);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) fetchData(currentUser);
  }, [currentUser, fetchData]);

  const handleOpenReview = (reminder: Reminder) => {
    setSelectedReminder(reminder);
    setReviewForm({
      product: reminder.product || '', grade_product_knowledge: 5, catatan_product_knowledge: '',
      grade_training_customer: 5, catatan_training_customer: '',
    });
    setShowReviewForm(true);
    setShowNotifications(false);
  };

  const submitReview = async () => {
    if (!selectedReminder || !currentUser) return;
    setSaving(true);
    const payload = {
      reminder_id: selectedReminder.id, project_name: selectedReminder.project_name, address: selectedReminder.address,
      sales_name: selectedReminder.sales_name, sales_division: selectedReminder.sales_division, assign_name: selectedReminder.assign_name,
      review_category: (selectedReminder.category === 'Demo Product' ? 'Demo Product' : 'BAST'),
      reminder_category: selectedReminder.category, product: reviewForm.product,
      grade_product_knowledge: reviewForm.grade_product_knowledge, catatan_product_knowledge: reviewForm.catatan_product_knowledge,
      grade_training_customer: reviewForm.grade_training_customer, catatan_training_customer: reviewForm.catatan_training_customer,
      created_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('reviews').insert([payload]);
    setSaving(false);
    if (error) alert('Gagal submit review: ' + error.message);
    else { setShowReviewForm(false); setSelectedReminder(null); fetchData(currentUser); }
  };

  const filteredReviews = useMemo(() => reviews.filter((r: ReviewRecord) => {
    const matchesProject = r.project_name.toLowerCase().includes(searchProject.toLowerCase());
    const matchesSales = r.sales_name.toLowerCase().includes(searchSales.toLowerCase());
    const matchesHandler = r.assign_name.toLowerCase().includes(searchHandler.toLowerCase());
    const matchesProduct = r.product.toLowerCase().includes(searchProduct.toLowerCase());
    const matchesCategory = filterCategory === 'all' || r.reminder_category === filterCategory;
    const matchesDay = !selectedCalDay || r.created_at.startsWith(selectedCalDay);
    return matchesProject && matchesSales && matchesHandler && matchesProduct && matchesCategory && matchesDay;
  }), [reviews, searchProject, searchSales, searchHandler, searchProduct, filterCategory, selectedCalDay]);

  const stats = useMemo(() => ({
    total: reviews.length,
    pending: pendingReminders.length,
    demo: reviews.filter((r: ReviewRecord) => r.reminder_category === 'Demo Product').length,
    training: reviews.filter((r: ReviewRecord) => ['Training', 'Konfigurasi & Training'].includes(r.reminder_category)).length,
  }), [reviews, pendingReminders]);

  const getChartData = useCallback((key: keyof ReviewRecord) => {
    const counts: Record<string, number> = {};
    reviews.forEach((r: ReviewRecord) => {
      const val = String(r[key] || 'Unknown');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).sort((a,b)=>b[1]-a[1]).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [reviews]);

  const chartData = useMemo(() => ({
    category: getChartData('reminder_category'),
    handler: getChartData('assign_name'),
    product: getChartData('product'),
  }), [getChartData]);

  if (!currentUser) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading System...</div>;

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      backgroundImage: `url('/IVP_Background.png')`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(255,255,255,0.06)' }} />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Header - Sticky & Clean */}
        <header className="sticky top-0 z-50 shadow-sm" style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '3px solid #dc2626', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
                <span className="text-xl">⭐</span>
              </div>
              <h1 className="text-base font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 uppercase">Form Review Platform</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative p-2 rounded-2xl transition-all border-2 ${pendingReminders.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-600 scale-105 shadow-md shadow-rose-100' : 'hover:bg-red-50 border-transparent hover:border-red-100 text-slate-400'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                {pendingReminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black text-white bg-red-600 ring-2 ring-white">
                    {pendingReminders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-6 space-y-5">
          
          {/* ── Summary Cards (Master Gradient Style) ── */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Total List', value: stats.total, sub: 'Semua record review', gradient: 'linear-gradient(135deg,#4f46e5,#6d28d9)', icon: '📋', shadow: 'rgba(79,70,229,0.3)', filter: !selectedCalDay && filterCategory === 'all' },
              { label: 'Menunggu', value: stats.pending, sub: 'Minta Guest Isi Review', gradient: 'linear-gradient(135deg,#d97706,#b45309)', icon: '⏳', shadow: 'rgba(217,119,6,0.3)', filter: showNotifications },
              { label: 'Demo Product', value: stats.demo, sub: 'Hasil Demo Selesai', gradient: 'linear-gradient(135deg,#059669,#047857)', icon: '✅', shadow: 'rgba(5,150,105,0.3)', filter: filterCategory === 'Demo Product' },
              { label: 'Training', value: stats.training, sub: 'Jadwal Training Selesai', gradient: 'linear-gradient(135deg,#0891b2,#0e7490)', icon: '🎓', shadow: 'rgba(8,145,178,0.3)', filter: ['Training', 'Konfigurasi & Training'].includes(filterCategory) },
            ].map(card => (
              <div key={card.label} 
                onClick={() => { if(card.label.includes('Demo')) setFilterCategory('Demo Product'); else if(card.label.includes('Training')) setFilterCategory('Training'); else setFilterCategory('all'); }}
                className="rounded-[2rem] p-6 relative overflow-hidden flex flex-col gap-3 transition-all hover:scale-[1.03] cursor-pointer"
                style={{ background: card.gradient, boxShadow: `0 8px 30px ${card.shadow}`, border: card.filter ? '4px solid white' : 'none' }}>
                <div className="absolute right-4 top-4 text-5xl opacity-[0.2] select-none pointer-events-none">{card.icon}</div>
                {card.filter && <span className="text-[9px] font-black text-white/90 uppercase tracking-widest absolute top-3 left-6">Filter Aktif ✓</span>}
                <span className="text-4xl font-black text-white leading-none mt-2">{card.value}</span>
                <div>
                  <p className="text-base font-black text-white leading-tight uppercase tracking-tight">{card.label}</p>
                  <p className="text-[11px] font-bold text-white/70 leading-tight">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* ── Visual Charts (Master Container Style) ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <MiniPieChart data={chartData.category} title="Kategori Kegiatan" icon="📊" activeFilter={filterCategory !== 'all' ? filterCategory : null} onSliceClick={l => setFilterCategory(filterCategory === l ? 'all' : l)} />
            <MiniPieChart data={chartData.handler} title="Handler Team PTS" icon="👥" activeFilter={searchHandler || null} onSliceClick={l => setSearchHandler(searchHandler === l ? '' : l)} />
            <MiniPieChart data={chartData.product} title="Product / Unit" icon="📦" activeFilter={searchProduct || null} onSliceClick={l => (setSearchProduct(searchProduct === l ? '' : l), setSearchProduct(searchProduct === l ? '' : l))} />
          </div>

          {/* ── Review Explorer (List + Side Calendar) ── */}
          <div className="flex gap-5 items-start">
            <div className="flex-1 min-w-0 rounded-[2rem] overflow-hidden shadow-2xl" 
                 style={{ background: 'rgba(255,255,255,0.92)', border: '1.5px solid rgba(0,0,0,0.06)', backdropFilter: 'blur(20px)' }}>
              
              {/* Table Header Controls */}
              <div className="flex flex-wrap items-center justify-between px-8 py-5 border-b border-slate-100">
                <div className="flex items-center gap-4">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Review Activity List</span>
                  <span className="bg-slate-100 text-slate-800 text-xs font-black px-3 py-1.5 rounded-full shadow-inner">{filteredReviews.length}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => fetchData(currentUser)} className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all">🔄</button>
                  <button onClick={() => { setSearchProject(''); setSearchSales(''); setSearchHandler(''); setSearchProduct(''); setFilterCategory('all'); setSelectedCalDay(null); }}
                    className="px-5 py-2.5 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all">Reset Filter</button>
                </div>
              </div>

              {/* Master Filter Bar */}
              <div className="px-8 py-4 bg-slate-50/50 border-b border-slate-100">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Search Project</label>
                    <input value={searchProject} onChange={e => setSearchProject(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-xs outline-none bg-white border border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" placeholder="Lokasi project..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Sales Name</label>
                    <input value={searchSales} onChange={e => setSearchSales(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-xs outline-none bg-white border border-slate-200 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all font-bold" placeholder="Nama sales..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Team Handler</label>
                    <input value={searchHandler} onChange={e => setSearchHandler(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-xs outline-none bg-white border border-slate-200 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all font-bold" placeholder="Nama handler..." />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Product</label>
                    <input value={searchProduct} onChange={e => setSearchProduct(e.target.value)} className="w-full rounded-xl px-4 py-2.5 text-xs outline-none bg-white border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-bold" placeholder="Cari produk..." />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full bg-white border-collapse" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '22%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead>
                    <tr className="bg-slate-50 border-b-2 border-slate-100">
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Project</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Product</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Sales</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Handler</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Status</th>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest border-r border-slate-100">Rating & Note</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={7} className="py-32 text-center text-slate-300 font-black uppercase text-xs animate-pulse">Scanning database...</td></tr>
                    ) : filteredReviews.length === 0 ? (
                      <tr><td colSpan={7} className="py-32 text-center text-slate-300 font-bold lowercase text-sm">Review tidak ditemukan dalam kriteria ini</td></tr>
                    ) : filteredReviews.map(r => {
                       const isToday = r.created_at.startsWith(new Date().toISOString().split('T')[0]);
                       return (
                        <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50/80 transition-colors group cursor-pointer ${isToday ? 'bg-red-50/20 border-l-[6px] border-l-red-500' : 'border-l-[6px] border-l-transparent'}`}>
                          <td className="px-6 py-5 border-r border-slate-100">
                            <p className="font-black text-slate-800 text-[13px] leading-tight group-hover:text-red-700 transition-colors uppercase tracking-tight">{r.project_name}</p>
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold truncate">📍 {r.address}</p>
                          </td>
                          <td className="px-6 py-5 border-r border-slate-100">
                             <div className="inline-flex px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[9px] font-black uppercase tracking-wider">{r.product}</div>
                          </td>
                          <td className="px-6 py-5 border-r border-slate-100">
                            <p className="text-[11px] font-black text-slate-700 leading-none">{r.sales_name}</p>
                            <p className="text-[9px] text-purple-600 font-black uppercase mt-1 tracking-tighter">{r.sales_division}</p>
                          </td>
                          <td className="px-6 py-5 border-r border-slate-100">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-[10px] shadow-lg shadow-indigo-100">{r.assign_name[0]}</div>
                               <span className="text-[10px] font-black text-slate-700 truncate tracking-tight">{r.assign_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-5 border-r border-slate-100">
                             <span className="inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
                                   style={{ color: STATUS_PILLS[r.review_category].color, background: STATUS_PILLS[r.review_category].bg, border: `1.5px solid ${STATUS_PILLS[r.review_category].border}` }}>
                               {r.review_category}
                             </span>
                          </td>
                          <td className="px-6 py-5 border-r border-slate-100">
                             <div className="flex items-center gap-0.5 mb-1.5 scale-90 -ml-2">
                                {[...Array(5)].map((_, i) => <IconStar key={i} fill={i < r.grade_product_knowledge ? "#f59e0b" : "white"} stroke={i < r.grade_product_knowledge ? "#f59e0b" : "#e2e8f0"} />)}
                             </div>
                             <p className="text-[10px] text-slate-500 font-bold italic line-clamp-2 leading-relaxed lowercase">"{r.catatan_product_knowledge || 'n/a'}"</p>
                          </td>
                          <td className="px-4 py-5 text-center">
                            <div className="inline-flex flex-col items-center bg-slate-100 border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm transform group-hover:scale-110 transition-transform">
                              <span className="text-lg font-black text-slate-800 leading-none">{formatDay(r.created_at)}</span>
                              <span className="text-[8.5px] font-black uppercase tracking-widest text-slate-400 mt-0.5">{formatMonthYear(r.created_at)}</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Side Calendar (Master Design) */}
            <MiniCalendar 
              reviews={reviews} calendarMonth={calendarMonth} setCalendarMonth={setCalendarMonth} 
              selectedCalDay={selectedCalDay} setSelectedCalDay={setSelectedCalDay} 
            />
          </div>
        </div>

        {/* ── NOTIFICATION DRAWER (Master Popup Style) ── */}
        {showNotifications && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm transition-all animate-in fade-in">
            <div className="bg-white rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.4)] max-w-lg w-full max-h-[85vh] overflow-hidden border-8 border-yellow-400 animate-in zoom-in-95 duration-300">
              <div className="p-7 relative" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none transform translate-x-1/4 scale-150 rotate-12">🔔</div>
                <div className="flex justify-between items-center relative z-10">
                  <div className="flex items-center gap-4 text-white">
                    <span className="text-4xl animate-bounce">🔔</span>
                    <div>
                      <h3 className="text-xl font-black uppercase tracking-tight leading-none">Reminder Survey</h3>
                      <p className="text-sm font-bold opacity-80 mt-1 uppercase tracking-widest text-[10px]">{pendingReminders.length} Tugas Menunggu Review</p>
                    </div>
                  </div>
                  <button onClick={() => setShowNotifications(false)} className="bg-white/10 hover:bg-white/20 p-3 rounded-2xl transition-all shadow-inner">✕</button>
                </div>
              </div>
              <div className="max-h-[calc(85vh-160px)] overflow-y-auto p-6 space-y-3 custom-scrollbar bg-slate-50">
                {pendingReminders.length === 0 ? (
                   <div className="text-center py-16">
                      <div className="text-6xl mb-4">🏆</div>
                      <p className="text-slate-400 font-black uppercase tracking-widest text-xs">Semua tugas review tuntas!</p>
                   </div>
                ) : pendingReminders.map(r => (
                  <div key={r.id} onClick={() => handleOpenReview(r)} className="rounded-[2rem] p-6 border-2 bg-white hover:border-yellow-400 hover:shadow-2xl transition-all cursor-pointer border-slate-100 group transform active:scale-95">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <p className="font-black text-sm text-slate-800 uppercase tracking-tight break-words">{r.project_name}</p>
                          <p className="text-[10px] font-black text-rose-500 uppercase mt-1 tracking-widest">[{r.category}]</p>
                       </div>
                       <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-xl grayscale group-hover:grayscale-0 transition-all">✨</div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handler: {r.assign_name}</p>
                    </div>
                    <div className="mt-5 py-3 bg-red-600 text-white text-[10px] font-black rounded-2xl text-center uppercase tracking-[0.25em] shadow-xl shadow-red-100 group-hover:bg-red-700 active:bg-red-800 transition-all">Isi Review Sekarang</div>
                  </div>
                ))}
              </div>
              <div className="p-6 bg-white border-t-2 border-slate-100">
                <button onClick={() => setShowNotifications(false)} className="w-full bg-slate-900 text-white py-4 rounded-[1.5rem] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-black active:scale-95 transition-all text-xs">Tutup Notifikasi</button>
              </div>
            </div>
          </div>
        )}

        {/* ── SUBMISSION MODAL (Master Style Form) ── */}
        {showReviewForm && selectedReminder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-4 overflow-y-auto backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-xl my-6 overflow-hidden border-[10px] border-black/5 animate-in zoom-in-95 duration-300">
               <div className="px-10 py-8 relative" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
                 <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none scale-150">🎨</div>
                 <h2 className="text-white font-black text-2xl tracking-tighter uppercase leading-none">⭐ ISI REVIEW FORM</h2>
                 <p className="text-red-200 text-[10px] font-black mt-2 uppercase tracking-[0.3em] truncate">{selectedReminder.project_name}</p>
                 <button onClick={() => setShowReviewForm(false)} className="absolute top-8 right-10 bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl transition-all hover:rotate-90">✕</button>
               </div>
               
               <div className="p-10 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-white">
                  <div className="space-y-7">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Produk Target *</label>
                       <input value={reviewForm.product} onChange={e => setReviewForm({...reviewForm, product: e.target.value})} 
                              className="w-full rounded-2xl px-6 py-4.5 text-sm outline-none bg-slate-50 border-2 border-slate-100 focus:border-red-500 focus:ring-8 focus:ring-red-500/10 transition-all font-black" placeholder="Tipe / Merk Perangkat..." />
                    </div>

                    <div className="bg-rose-50 p-8 rounded-[3rem] border-4 border-white shadow-[0_15px_40px_rgba(240,0,0,0.1)] flex flex-col items-center gap-5">
                       <label className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] font-sans">Rate Product Knowledge</label>
                       <div className="flex gap-3">
                         {[1,2,3,4,5].map(s => (
                           <button key={s} onClick={() => setReviewForm({...reviewForm, grade_product_knowledge: s})} className="transition-all hover:scale-125 transform active:scale-95">
                             <IconStar width={36} height={36} fill={s <= reviewForm.grade_product_knowledge ? "#f59e0b" : "white"} stroke={s <= reviewForm.grade_product_knowledge ? "#f59e0b" : "#fecaca"} />
                           </button>
                         ))}
                       </div>
                       <span className="text-4xl font-black text-rose-700 tracking-tighter">{reviewForm.grade_product_knowledge} / 5 <span className="text-[11px] font-black uppercase tracking-widest text-rose-300 ml-1">Stars</span></span>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Catatan Tambahan</label>
                      <textarea value={reviewForm.catatan_product_knowledge} onChange={e => setReviewForm({...reviewForm, catatan_product_knowledge: e.target.value})} rows={3} 
                                className="w-full rounded-2xl px-6 py-4.5 text-xs outline-none bg-slate-50 border-2 border-slate-100 focus:border-red-500 transition-all font-bold lowercase leading-relaxed resize-none" placeholder="Masukan atau feedback mengenai produk..." />
                    </div>

                    {(selectedReminder.category === 'Training' || selectedReminder.category === 'Konfigurasi & Training') && (
                       <div className="pt-8 space-y-7 border-t-4 border-slate-50">
                          <div className="bg-emerald-50 p-8 rounded-[3rem] border-4 border-white shadow-[0_15px_40px_rgba(0,180,0,0.1)] flex flex-col items-center gap-5">
                            <label className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">Rate Training Customer</label>
                            <div className="flex gap-3">
                              {[1,2,3,4,5].map(s => (
                                <button key={s} onClick={() => setReviewForm({...reviewForm, grade_training_customer: s})} className="transition-all hover:scale-125 transform active:scale-95">
                                  <IconStar width={36} height={36} fill={s <= reviewForm.grade_training_customer ? "#10b981" : "white"} stroke={s <= reviewForm.grade_training_customer ? "#10b981" : "#a7f3d0"} />
                                </button>
                              ))}
                            </div>
                            <span className="text-4xl font-black text-emerald-700 tracking-tighter">{reviewForm.grade_training_customer} / 5</span>
                          </div>
                          <textarea value={reviewForm.catatan_training_customer} onChange={e => setReviewForm({...reviewForm, catatan_training_customer: e.target.value})} rows={2} 
                                    className="w-full rounded-2xl px-6 py-4.5 text-xs outline-none bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 transition-all font-bold lowercase leading-relaxed resize-none" placeholder="Feedback hasil training..." />
                       </div>
                    )}
                  </div>
               </div>

               <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex gap-4">
                  <button onClick={() => setShowReviewForm(false)} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-[0.3em] hover:bg-slate-200 rounded-[1.5rem] transition-all">Batal</button>
                  <button onClick={submitReview} disabled={saving || !reviewForm.product} 
                          className="grow py-5 bg-slate-900 text-white font-black uppercase text-[11px] tracking-[0.3em] rounded-[1.5rem] hover:bg-black shadow-[0_15px_40px_rgba(0,0,0,0.2)] disabled:opacity-40 transition-all flex items-center justify-center gap-3">
                    {saving ? 'Processing...' : '💾 Simpan Review'}
                  </button>
               </div>
            </div>
          </div>
        )}

      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(220,0,0,0.2); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
}
