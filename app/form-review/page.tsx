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
  grade_training_customer?: number;
  catatan_training_customer?: string;
  photo_url?: string;
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

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  'Demo Product': { label: 'Demo Product', color: '#7c3aed', bg: 'rgba(124,58,237,0.15)', border: 'rgba(124,58,237,0.4)', icon: '🖥️' },
  'BAST':         { label: 'BAST',         color: '#059669', bg: 'rgba(5,150,105,0.15)',  border: 'rgba(5,150,105,0.4)',   icon: '✅' },
};

// ─── SVG Icons ────────────────────────────────────────────────────────────────

const IconStar = ({ fill = "none", stroke = "currentColor", ...props }: { fill?: string; stroke?: string; [key: string]: any }) => (
  <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);

const IconSearch = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconTrash = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>;
const IconEdit = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDatetime(createdAt: string) {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ─── Pie Chart Component ─────────────────────────────────────────────────────

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
      <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{icon} {title}</p>
      <p className="text-gray-400 text-sm text-center py-4 font-bold">Belum ada data</p>
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
    <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(10px)' }}>
      <p className="text-xs font-bold text-gray-600 uppercase tracking-widest">{icon} {title}</p>
      <div className="flex items-center gap-3">
        <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
          {slices.map((s) => (
            s.isFullCircle ? (
              <g key={s.i} style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                onClick={() => onSliceClick && onSliceClick(s.label)}
                onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}>
                <circle cx={60} cy={60} r={50} fill={s.color}
                  opacity={hov === null || hov === s.i ? 1 : 0.45}
                  style={{ filter: hov === s.i || activeFilter === s.label ? `drop-shadow(0 0 5px ${s.color})` : 'none' }} />
                <circle cx={60} cy={60} r={28} fill="white" />
              </g>
            ) : (
            <path key={s.i} d={s.path} fill={s.color}
              opacity={hov === null || hov === s.i ? 1 : 0.45}
              style={{ cursor: onSliceClick ? 'pointer' : 'default', transition: 'opacity 0.15s', filter: hov === s.i || activeFilter === s.label ? `drop-shadow(0 0 5px ${s.color})` : 'none' }}
              onMouseEnter={() => setHov(s.i)}
              onMouseLeave={() => setHov(null)}
              onClick={() => onSliceClick && onSliceClick(s.label)} />
            )
          ))}
          <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{total}</text>
          <text x="60" y="70" textAnchor="middle" fontSize="7" fill="#94a3b8" fontWeight="600">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-1 flex-1 min-w-0 max-h-[120px] overflow-y-auto">
          {slices.map((s) => {
            const isActive = activeFilter === s.label;
            return (
              <div key={s.i}
                className="flex items-center gap-1.5 cursor-pointer rounded-lg px-1.5 py-0.5 transition-all"
                style={{
                  background: hov === s.i || isActive ? `${s.color}20` : 'transparent',
                  outline: isActive ? `1.5px solid ${s.color}` : 'none',
                }}
                onMouseEnter={() => setHov(s.i)}
                onMouseLeave={() => setHov(null)}
                onClick={() => onSliceClick && onSliceClick(s.label)}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                <span className="text-[10px] font-semibold text-gray-600 truncate flex-1">{s.label}</span>
                <span className="text-[10px] font-bold flex-shrink-0" style={{ color: s.color }}>{s.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FormReview() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Category Tab
  const [activeTab, setActiveTab] = useState<'Demo Product' | 'BAST'>('Demo Product');

  // Filters (Match Reminder Schedule)
  const [searchProject, setSearchProject] = useState('');
  const [searchSales, setSearchSales] = useState('');
  const [searchProduct, setSearchProduct] = useState('');
  const [searchHandler, setSearchHandler] = useState('');
  const [filterYear, setFilterYear] = useState('all');

  // Modal states
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [detailReview, setDetailReview] = useState<ReviewRecord | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewRecord | null>(null);

  // Form State
  const [reviewForm, setReviewForm] = useState({
    product: '',
    grade_product_knowledge: 5,
    catatan_product_knowledge: '',
    grade_training_customer: 5,
    catatan_training_customer: '',
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
    
    // Auto sync storage listener if user changes role externally
    const handleStorage = () => {
       const s = localStorage.getItem('currentUser');
       if(s) setCurrentUser(JSON.parse(s));
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const fetchData = useCallback(async (user: User) => {
    setLoading(true);
    let reviewQuery = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    // Guest only sees their assigned reviews
    if (user.role === 'guest') reviewQuery = reviewQuery.eq('sales_name', user.full_name);
    
    const { data: reviewData } = await reviewQuery;
    if (reviewData) setReviews(reviewData);

    // Pending reminders (Completed in Schedule but not reviewed yet)
    let reminderQuery = supabase.from('reminders')
      .select('*')
      .eq('status', 'done')
      .in('category', ['Demo Product', 'Konfigurasi & Training', 'Training', 'Konfigurasi']);
    
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
      product: reminder.product || '',
      grade_product_knowledge: 5,
      catatan_product_knowledge: '',
      grade_training_customer: 5,
      catatan_training_customer: '',
    });
    setImagePreview(null);
    setImageFile(null);
    setShowReviewForm(true);
    setShowNotifications(false);
  };

  const handleImageChange = (e: import("react").ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const submitReview = async () => {
    if (!selectedReminder || !currentUser) return;
    setSaving(true);

    let photoUrl = '';
    if (imageFile) {
        setUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `review_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('reminder-photos').upload(fileName, imageFile);
        if (!uploadError) {
            const { data } = supabase.storage.from('reminder-photos').getPublicUrl(fileName);
            photoUrl = data.publicUrl;
        }
        setUploadingImage(false);
    }
    
    const payload: any = {
      reminder_id: selectedReminder.id,
      project_name: selectedReminder.project_name,
      address: selectedReminder.address,
      sales_name: selectedReminder.sales_name,
      sales_division: selectedReminder.sales_division,
      assign_name: selectedReminder.assign_name,
      review_category: (['Konfigurasi & Training', 'Training', 'Konfigurasi'].includes(selectedReminder.category) ? 'BAST' : 'Demo Product'),
      reminder_category: selectedReminder.category,
      product: reviewForm.product,
      grade_product_knowledge: reviewForm.grade_product_knowledge,
      catatan_product_knowledge: reviewForm.catatan_product_knowledge,
      photo_url: photoUrl,
      created_at: new Date().toISOString(),
    };

    if (payload.review_category === 'BAST') {
      payload.grade_training_customer = reviewForm.grade_training_customer;
      payload.catatan_training_customer = reviewForm.catatan_training_customer;
    }

    const { error } = editingReview 
      ? await supabase.from('reviews').update(payload).eq('id', editingReview.id)
      : await supabase.from('reviews').insert([payload]);

    setSaving(false);
    if (error) { alert('Gagal submit: ' + error.message); }
    else {
      setShowReviewForm(false);
      setSelectedReminder(null);
      setEditingReview(null);
      fetchData(currentUser);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Hapus review ini permanen?')) {
       await supabase.from('reviews').delete().eq('id', id);
       fetchData(currentUser!);
    }
  };

  const openEdit = (r: ReviewRecord) => {
     setEditingReview(r);
     setSelectedReminder({ 
        id: r.reminder_id || '', project_name: r.project_name, category: r.reminder_category,
        sales_name: r.sales_name, sales_division: r.sales_division, assign_name: r.assign_name,
        address: r.address, status: 'done', product: r.product, due_date: '', due_time: ''
     });
     setReviewForm({
        product: r.product, grade_product_knowledge: r.grade_product_knowledge, catatan_product_knowledge: r.catatan_product_knowledge,
        grade_training_customer: r.grade_training_customer || 5, catatan_training_customer: r.catatan_training_customer || ''
     });
     setImagePreview(r.photo_url || null);
     setDetailReview(null);
     setShowReviewForm(true);
  };

  // ─── Filter Logic (Identical to Schedule) ───────────────────────────────────

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => {
      // Tab filter
      if (r.review_category !== activeTab) return false;
      // Search filters
      if (searchProject && !r.project_name.toLowerCase().includes(searchProject.toLowerCase())) return false;
      if (searchSales && !r.sales_name.toLowerCase().includes(searchSales.toLowerCase())) return false;
      if (searchProduct && !r.product.toLowerCase().includes(searchProduct.toLowerCase())) return false;
      if (searchHandler && !r.assign_name.toLowerCase().includes(searchHandler.toLowerCase())) return false;
      if (filterYear !== 'all' && !r.created_at.startsWith(filterYear)) return false;
      return true;
    });
  }, [reviews, activeTab, searchProject, searchSales, searchProduct, searchHandler, filterYear]);

  const availableYears = useMemo(() => {
    const years = Array.from(new Set(reviews.map(r => r.created_at.substring(0, 4))));
    return (years as string[]).sort((a, b) => b.localeCompare(a));
  }, [reviews]);

  // ─── Stats & Pie Chart Data ─────────────────────────────────────────────────

  const stats = useMemo(() => ({
    total: reviews.filter(r => r.review_category === activeTab).length,
    pending: pendingReminders.length,
    demo: reviews.filter(r => r.review_category === 'Demo Product').length,
    bast: reviews.filter(r => r.review_category === 'BAST').length,
  }), [reviews, pendingReminders, activeTab]);

  const getPieData = useCallback((key: keyof ReviewRecord) => {
    const map: Record<string, number> = {};
    reviews.filter(r => r.review_category === activeTab).forEach(r => {
      const val = String(r[key] || 'Unknown');
      map[val] = (map[val] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  }, [reviews, activeTab]);

  const pieData = useMemo(() => ({
    category: getPieData('reminder_category'),
    handler: getPieData('assign_name'),
    product: getPieData('product'),
  }), [getPieData]);

  if (!currentUser) return <div className="p-20 text-center font-black text-slate-400 uppercase tracking-widest animate-pulse">Loading Platform...</div>;

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      backgroundImage: `url('/IVP_Background.png')`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(255,255,255,0.06)' }} />
      
      <div className="relative z-10 flex flex-col min-h-screen">
        
        {/* Header (Clean Master) */}
        <header className="sticky top-0 z-50" style={{ background: 'rgba(255,255,255,0.9)', borderBottom: '3px solid #dc2626', backdropFilter: 'blur(16px)' }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3.5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
                <span className="text-xl">⭐</span>
              </div>
              <h1 className="text-base font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 uppercase">Form Review Platform</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNotifications(true)}
                className={`relative p-2 rounded-xl transition-all border-2 ${pendingReminders.length > 0 ? 'bg-amber-50 border-yellow-400 text-amber-600 scale-105 shadow-md shadow-amber-100' : 'hover:bg-red-50 border-transparent text-gray-600'}`}>
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {pendingReminders.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-red-600 ring-2 ring-white">
                    {pendingReminders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 space-y-4">
          
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
             <div onClick={() => { setActiveTab('Demo Product'); setFilterYear('all'); }} 
                  className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.03] select-none"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#6d28d9)', boxShadow: '0 4px 16px rgba(79,70,229,0.3)', border: activeTab === 'Demo Product' ? '3px solid white' : 'none' }}>
                <div className="absolute right-3 top-2 text-4xl opacity-[0.15]">🖥️</div>
                {activeTab === 'Demo Product' && <span className="absolute top-2 left-2 text-white/80 text-[9px] font-black uppercase tracking-widest">Tab Aktif ✓</span>}
                <span className="text-3xl font-black text-white leading-none">{stats.demo}</span>
                <div><p className="text-sm font-bold text-white uppercase tracking-tight">Demo Product</p><p className="text-[10px] font-medium text-white/70">Record demo selesai</p></div>
             </div>
             
             <div onClick={() => { setActiveTab('BAST'); setFilterYear('all'); }} 
                  className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 cursor-pointer transition-all hover:scale-[1.03] select-none"
                  style={{ background: 'linear-gradient(135deg,#059669,#047857)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)', border: activeTab === 'BAST' ? '3px solid white' : 'none' }}>
                <div className="absolute right-3 top-2 text-4xl opacity-[0.15]">📜</div>
                {activeTab === 'BAST' && <span className="absolute top-2 left-2 text-white/80 text-[9px] font-black uppercase tracking-widest">Tab Aktif ✓</span>}
                <span className="text-3xl font-black text-white leading-none">{stats.bast}</span>
                <div><p className="text-sm font-bold text-white uppercase tracking-tight">BAST Review</p><p className="text-[10px] font-medium text-white/70">Record training selesai</p></div>
             </div>

             <div className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg,#d97706,#b45309)', boxShadow: '0 4px 16px rgba(217,119,6,0.2)' }}>
                <div className="absolute right-3 top-2 text-4xl opacity-[0.15]">⏳</div>
                <span className="text-3xl font-black text-white leading-none">{stats.pending}</span>
                <div><p className="text-sm font-bold text-white uppercase tracking-tight">Menunggu</p><p className="text-[10px] font-medium text-white/70">Survey belum diisi</p></div>
             </div>

             <div className="rounded-2xl p-4 relative overflow-hidden flex flex-col gap-2 transition-all"
                  style={{ background: 'linear-gradient(135deg,#6366f1,#4338ca)', boxShadow: '0 4px 16px rgba(99,102,241,0.2)' }}>
                <div className="absolute right-3 top-2 text-4xl opacity-[0.15]">📊</div>
                <span className="text-3xl font-black text-white leading-none">{stats.total}</span>
                <div><p className="text-sm font-bold text-white uppercase tracking-tight">Total filtered</p><p className="text-[10px] font-medium text-white/70">Display list tab ini</p></div>
             </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             <MiniPieChart data={pieData.category} title="Kegiatan / Kategori" icon="🖥️" />
             <MiniPieChart data={pieData.handler} title="Team PTS Reviewer" icon="👥" />
             <MiniPieChart data={pieData.product} title="Unit / Produk" icon="📦" />
          </div>

          {/* Data List (Copy schedule style) */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.95)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)' }}>
            
            {/* Table Header Control (Identify Tab) */}
            <div className="flex flex-wrap items-center justify-between px-5 py-3.5 border-b border-gray-100">
               <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Review {activeTab} Activity</span>
                  <span className="bg-gray-100 text-gray-700 text-xs font-black px-2.5 py-1 rounded-full shadow-inner">{filteredReviews.length}</span>
               </div>
               <div className="flex gap-2">
                  <button onClick={() => fetchData(currentUser)} className="p-1.5 rounded-lg border border-gray-100 bg-white hover:bg-slate-50 text-slate-400">🔄</button>
                  <button onClick={() => { setSearchProject(''); setSearchSales(''); setSearchProduct(''); setSearchHandler(''); setFilterYear('all'); }} 
                          className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase bg-red-600 text-white tracking-widest shadow-lg shadow-red-100 transition-all hover:bg-red-700 active:scale-95">Reset Filter</button>
               </div>
            </div>

            {/* Filter Bar (Identical style) */}
            <div className="px-5 py-3 bg-white/60 border-b border-gray-100">
               <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Project</label>
                    <div className="relative">
                       <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">🔍</span>
                       <input value={searchProject} onChange={e => setSearchProject(e.target.value)} className="w-full rounded-lg pl-6 pr-3 py-1.5 text-xs outline-none bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 transition-all" placeholder="Project..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Sales</label>
                    <div className="relative">
                       <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">👤</span>
                       <input value={searchSales} onChange={e => setSearchSales(e.target.value)} className="w-full rounded-lg pl-6 pr-3 py-1.5 text-xs outline-none bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 transition-all" placeholder="Sales name..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Product</label>
                    <div className="relative">
                       <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">📦</span>
                       <input value={searchProduct} onChange={e => setSearchProduct(e.target.value)} className="w-full rounded-lg pl-6 pr-3 py-1.5 text-xs outline-none bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 transition-all" placeholder="Product name..." />
                    </div>
                  </div>
                   <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Search Handler</label>
                    <div className="relative">
                       <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px]">👷</span>
                       <input value={searchHandler} onChange={e => setSearchHandler(e.target.value)} className="w-full rounded-lg pl-6 pr-3 py-1.5 text-xs outline-none bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 transition-all" placeholder="Handler name..." />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">Filter Year</label>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="w-full rounded-lg px-3 py-1.5 text-xs outline-none bg-gray-50 border border-gray-200 focus:bg-white focus:border-red-300 transition-all appearance-none cursor-pointer">
                       <option value="all">All Year</option>
                       {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
               </div>
            </div>

            {/* Table (Identical structure) */}
            <div className="overflow-x-auto min-h-[400px]">
               <table className="w-full bg-white border-collapse" style={{ tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '13%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '8%' }} />
                    <col style={{ width: '7%' }} />
                  </colgroup>
                  <thead>
                     <tr className="bg-gray-50 border-b-2 border-gray-100">
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide border-r border-gray-100">Project</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide border-r border-gray-100">Product</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide border-r border-gray-100">Kategori</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide border-r border-gray-100">Sales</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide border-r border-gray-100">Handler</th>
                        <th className="px-3 py-2.5 text-left text-[10px] font-black text-gray-400 uppercase tracking-wide border-r border-gray-100">Knowledge & Review</th>
                        <th className="px-3 py-2.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-wide border-r border-gray-100">Tanggal</th>
                        <th className="px-2 py-2.5 text-center text-[10px] font-black text-gray-400 uppercase tracking-wide">ACT</th>
                     </tr>
                  </thead>
                  <tbody>
                     {loading ? (
                       <tr><td colSpan={8} className="py-20 text-center text-slate-300 font-bold uppercase text-xs animate-pulse tracking-widest">Scanning database...</td></tr>
                     ) : filteredReviews.length === 0 ? (
                       <tr><td colSpan={8} className="py-20 text-center text-slate-400 font-bold text-sm lowercase">tidak ada record review ditemukan dalam list tab ini</td></tr>
                     ) : filteredReviews.map(r => (
                        <tr key={r.id} className="border-b border-gray-100 hover:bg-red-50/20 transition-all cursor-pointer group">
                           <td className="px-3 py-4 border-r border-gray-100">
                              <p className="font-black text-gray-800 text-[11px] uppercase tracking-tight leading-tight group-hover:text-red-700 transition-colors">{r.project_name}</p>
                              <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold truncate">📍 {r.address}</p>
                           </td>
                           <td className="px-3 py-4 border-r border-gray-100">
                              <div className="inline-flex px-1.5 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded text-[9px] font-black uppercase">{r.product}</div>
                           </td>
                           <td className="px-3 py-4 border-r border-gray-100">
                              <div className="flex flex-col gap-1">
                                 <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest w-fit" 
                                       style={{ background: STATUS_CONFIG[r.review_category].bg, color: STATUS_CONFIG[r.review_category].color, border: `1px solid ${STATUS_CONFIG[r.review_category].border}` }}>
                                    {r.review_category}
                                 </span>
                                 <span className="text-[8px] font-bold text-slate-300 uppercase">{r.reminder_category}</span>
                              </div>
                           </td>
                           <td className="px-3 py-4 border-r border-gray-100">
                              <p className="text-[10.5px] font-black text-slate-700 leading-none truncate">{r.sales_name}</p>
                              <p className="text-[9px] text-purple-600 font-black uppercase mt-1 opacity-70 truncate">{r.sales_division}</p>
                           </td>
                           <td className="px-3 py-4 border-r border-gray-100">
                              <div className="flex items-center gap-1.5">
                                 <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#6d28d9)' }}>{r.assign_name[0]}</div>
                                 <span className="text-[10px] font-black text-slate-600 truncate">{r.assign_name}</span>
                              </div>
                           </td>
                           <td className="px-3 py-4 border-r border-gray-100">
                              <div className="flex items-center gap-0.5 mb-1 animate-in fade-in">
                                 {[...Array(5)].map((_, i) => <IconStar key={i} fill={i < r.grade_product_knowledge ? "#f59e0b" : "white"} stroke={i < r.grade_product_knowledge ? "#f59e0b" : "#e2e8f0"} />)}
                              </div>
                              <p className="text-[10px] text-slate-500 font-bold italic line-clamp-2 leading-relaxed lowercase">"{r.catatan_product_knowledge || 'n/a'}"</p>
                              {r.photo_url && <span className="text-[8px] font-black text-emerald-500 uppercase mt-1 tracking-widest inline-flex items-center gap-1">🖼️ Dokumentasi Ada</span>}
                           </td>
                           <td className="px-2 py-4 border-r border-gray-100 text-center">
                              <div className="inline-flex flex-col items-center bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-1 shadow-sm group-hover:scale-105 transition-transform">
                                 <span className="text-sm font-black text-slate-800 leading-none">{new Date(r.created_at).getDate()}</span>
                                 <span className="text-[8.5px] font-bold uppercase text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString('id-ID', { month: 'short' })} '{new Date(r.created_at).toLocaleDateString('id-ID', { year: '2-digit' })}</span>
                              </div>
                           </td>
                           <td className="px-2 py-4 align-middle text-center">
                              <div className="flex items-center justify-center gap-2">
                                 <button onClick={() => setDetailReview(r)} className="text-blue-500 hover:scale-125 transition-transform" title="View Detail">👁</button>
                                 <button onClick={() => openEdit(r)} className="text-amber-500 hover:scale-125 transition-transform" title="Edit Review"><IconEdit /></button>
                                 <button onClick={() => handleDelete(r.id)} className="text-red-400 hover:text-red-700 hover:scale-125 transition-transform" title="Delete Review"><IconTrash /></button>
                              </div>
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>

          </div>

        </div>

        {/* ── NOTIFICATION DRAWER ── */}
        {showNotifications && (
           <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-[2.5rem] shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border-8 border-yellow-400 animate-in zoom-in-95 duration-200">
                 <div className="p-7 relative" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                    <div className="flex justify-between items-center relative z-10 text-white">
                       <div className="flex items-center gap-4">
                          <span className="text-4xl animate-bounce">🔔</span>
                          <div>
                             <h3 className="text-xl font-black uppercase tracking-tight leading-none">Reminder Review</h3>
                             <p className="text-sm font-bold opacity-80 mt-1 text-[10px] uppercase tracking-widest">{pendingReminders.length} TUGAS MENUNGGU KONFIRMASI GUEST</p>
                          </div>
                       </div>
                       <button onClick={() => setShowNotifications(false)} className="bg-white/20 p-2 rounded-xl">✕</button>
                    </div>
                 </div>
                 <div className="bg-slate-50 p-6 space-y-3 overflow-y-auto max-h-[calc(80vh-140px)] custom-scrollbar">
                    {pendingReminders.map(r => (
                       <div key={r.id} onClick={() => handleOpenReview(r)} className="bg-white rounded-[2rem] p-6 border-2 border-slate-100 hover:border-yellow-400 transition-all cursor-pointer shadow-sm active:scale-95">
                          <div className="flex justify-between items-start mb-2">
                             <p className="font-black text-sm text-slate-800 uppercase tracking-tight">{r.project_name}</p>
                             <span className="text-[8.5px] font-black px-2 py-0.5 bg-rose-50 text-rose-500 rounded uppercase border border-rose-100">{r.category}</span>
                          </div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Handler: {r.assign_name}</p>
                          <div className="mt-4 py-3 bg-red-600 text-white text-[10px] font-black rounded-2xl text-center uppercase tracking-[0.2em] shadow-xl shadow-red-100">isi review form sekarang</div>
                       </div>
                    ))}
                 </div>
                 <div className="p-4 bg-white border-t border-slate-100">
                    <button onClick={() => setShowNotifications(false)} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em]">Tutup Notifikasi</button>
                 </div>
              </div>
           </div>
        )}

        {/* ── FORM MODAL (Demo Product & BAST Logic) ── */}
        {showReviewForm && selectedReminder && (
           <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[10000] p-4 overflow-y-auto backdrop-blur-md">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl my-6 overflow-hidden animate-in zoom-in-95 duration-300">
                 <div className="p-8 text-white relative" style={{ background: 'linear-gradient(135deg,#dc2626,#991b1b)' }}>
                    <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">⭐ Platform Form Review</h2>
                    <p className="text-red-200 text-[10px] font-black mt-2 uppercase tracking-[0.2em]">{['Konfigurasi & Training', 'Training', 'Konfigurasi'].includes(selectedReminder.category) ? 'BAST CATEGORY' : 'DEMO PRODUCT CATEGORY'} - {selectedReminder.project_name}</p>
                    <button onClick={() => { setShowReviewForm(false); setEditingReview(null); }} className="absolute top-8 right-8 bg-white/10 p-2 rounded-xl text-white">✕</button>
                 </div>
                 
                 <div className="p-10 space-y-7 max-h-[65vh] overflow-y-auto custom-scrollbar">
                    <div className="space-y-6">
                       <div className="grid grid-cols-2 gap-3 mb-2">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Project Information</p>
                             <p className="text-[11px] font-black text-slate-800 leading-tight truncate">{selectedReminder.project_name}</p>
                             <p className="text-[9px] font-bold text-slate-400 mt-1 uppercase truncate">📍 {selectedReminder.address}</p>
                          </div>
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                             <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Sales Info</p>
                             <p className="text-[11px] font-black text-slate-800 leading-tight truncate">{selectedReminder.sales_name}</p>
                             <p className="text-[9px] font-bold text-purple-500 mt-1 uppercase">{selectedReminder.sales_division}</p>
                          </div>
                       </div>

                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Produk Target (Isi Paragraf) *</label>
                          <textarea value={reviewForm.product} onChange={e => setReviewForm({...reviewForm, product: e.target.value})}
                                    className="w-full rounded-2xl px-6 py-4 text-xs outline-none bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold transition-all min-h-[100px]" placeholder="Sebutkan item produk yang dipasang / didemokan..." />
                       </div>

                       {/* Conditional Area: BAST (Konfigurasi & Training) */}
                       {['Konfigurasi & Training', 'Training', 'Konfigurasi'].includes(selectedReminder.category) && (
                          <div className="pt-4 space-y-6 border-t-2 border-dashed border-slate-100">
                             <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-4 border-white shadow-inner flex flex-col items-center gap-4">
                                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Grade Training Customer</label>
                                <div className="flex gap-2.5">
                                   {[1,2,3,4,5].map(s => (
                                      <button key={s} onClick={() => setReviewForm({...reviewForm, grade_training_customer: s})}>
                                         <IconStar width={32} height={32} fill={s <= reviewForm.grade_training_customer ? "#10b981" : "white"} stroke={s <= reviewForm.grade_training_customer ? "#10b981" : "#a7f3d0"} />
                                      </button>
                                   ))}
                                </div>
                                <span className="text-3xl font-black text-emerald-700 tracking-tighter">{reviewForm.grade_training_customer} / 5</span>
                             </div>
                             <textarea value={reviewForm.catatan_training_customer} onChange={e => setReviewForm({...reviewForm, catatan_training_customer: e.target.value})}
                                       className="w-full rounded-2xl px-6 py-4 text-xs outline-none bg-slate-50 border-2 border-slate-100 focus:border-emerald-500 font-bold lowercase min-h-[80px]" placeholder="catatan mengenai training customer..." />
                          </div>
                       )}

                       {/* Always: Knowledge Area */}
                       <div className="pt-4 space-y-6 border-t-2 border-dashed border-slate-100">
                          <div className="bg-rose-50 p-8 rounded-[2.5rem] border-4 border-white shadow-inner flex flex-col items-center gap-4">
                             <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Grade Product Knowledge</label>
                             <div className="flex gap-2.5">
                                {[1,2,3,4,5].map(s => (
                                   <button key={s} onClick={() => setReviewForm({...reviewForm, grade_product_knowledge: s})}>
                                      <IconStar width={32} height={32} fill={s <= reviewForm.grade_product_knowledge ? "#f59e0b" : "white"} stroke={s <= reviewForm.grade_product_knowledge ? "#f59e0b" : "#fecaca"} />
                                   </button>
                                ))}
                             </div>
                             <span className="text-3xl font-black text-rose-700 tracking-tighter">{reviewForm.grade_product_knowledge} / 5</span>
                          </div>
                          <textarea value={reviewForm.catatan_product_knowledge} onChange={e => setReviewForm({...reviewForm, catatan_product_knowledge: e.target.value})}
                                    className="w-full rounded-2xl px-6 py-4 text-xs outline-none bg-slate-50 border-2 border-slate-100 focus:border-red-500 font-bold lowercase min-h-[80px]" placeholder="catatan mengenai pengetahun produk..." />
                       </div>

                       {/* Image Upload Area */}
                       <div className="space-y-3">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Foto Dokumentasi *</label>
                          <input type="file" ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/*" />
                          {imagePreview ? (
                             <div className="relative rounded-3xl overflow-hidden border-4 border-slate-100 group">
                                <img src={imagePreview} className="w-full max-h-[300px] object-cover" alt="Review documentation" />
                                <button onClick={() => { setImagePreview(null); setImageFile(null); }} className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity">🗑️ Ganti Foto</button>
                             </div>
                          ) : (
                             <button onClick={() => fileInputRef.current?.click()} className="w-full py-12 border-4 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:bg-slate-50 transition-all text-slate-300">
                                <span className="text-5xl">📸</span>
                                <span className="text-[10px] font-black uppercase tracking-widest">Pilih Foto Dokumentasi</span>
                             </button>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="p-8 bg-slate-50 border-t-2 border-slate-100 flex gap-4">
                    <button onClick={() => { setShowReviewForm(false); setEditingReview(null); }} className="flex-1 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 rounded-2xl transition-all">Batal</button>
                    <button onClick={submitReview} disabled={saving || uploadingImage || !reviewForm.product} 
                            className="grow py-5 bg-black text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
                       {(saving || uploadingImage) ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : '💾 SIMPAN REVIEW FORM'}
                    </button>
                 </div>
              </div>
           </div>
        )}

        {/* ── DETAIL REVIEW MODAL ── */}
        {detailReview && (
           <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[10000] p-4 overflow-y-auto backdrop-blur-md">
              <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl my-6 overflow-hidden animate-in fade-in duration-300">
                 <div className="p-8 text-white relative" style={{ background: `linear-gradient(135deg,${STATUS_CONFIG[detailReview.review_category].color},#000)` }}>
                    <div className="flex gap-2 mb-3">
                        <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">{detailReview.review_category}</span>
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter break-words leading-none">{detailReview.project_name}</h2>
                    <p className="text-white/60 text-[10px] font-bold mt-2 uppercase tracking-widest flex items-center gap-2"><span>📍</span>{detailReview.address}</p>
                    <button onClick={() => setDetailReview(null)} className="absolute top-8 right-8 bg-white/10 p-2 rounded-xl">✕</button>
                 </div>
                 <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    <div className="grid grid-cols-2 gap-5">
                       <div className="bg-slate-50 p-6 rounded-3xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Survey Information</p>
                          <div className="space-y-4">
                             <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Guest Reviewer</p>
                                <p className="text-sm font-black text-slate-800">{detailReview.sales_name}</p>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">{detailReview.sales_division}</p>
                             </div>
                             <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Handler Team IVP</p>
                                <p className="text-sm font-black text-slate-800">{detailReview.assign_name}</p>
                             </div>
                          </div>
                       </div>
                       <div className="bg-slate-50 p-6 rounded-3xl">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Date Record</p>
                          <p className="text-lg font-black text-slate-800">{formatDatetime(detailReview.created_at).split(',')[0]}</p>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Time: {formatDatetime(detailReview.created_at).split(',')[1]}</p>
                       </div>
                    </div>

                    <div className="space-y-6">
                       <div className="border-t-2 border-slate-50 pt-6">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Detailed Product</p>
                          <p className="text-xs font-bold text-slate-700 leading-relaxed italic">"{detailReview.product}"</p>
                       </div>

                       {detailReview.review_category === 'BAST' && (
                          <div className="bg-emerald-50 rounded-[2.5rem] p-8 border-4 border-white shadow-sm space-y-4">
                             <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Grade Training Customer</p>
                                <div className="flex gap-1">{[...Array(5)].map((_, i) => <IconStar key={i} fill={i < detailReview.grade_training_customer! ? "#10b981" : "white"} stroke="#10b981" />)}</div>
                             </div>
                             <p className="text-[11px] font-bold text-emerald-800 leading-relaxed bg-white/60 p-4 rounded-2xl border border-emerald-100 shadow-inner">"{detailReview.catatan_training_customer || '-'}"</p>
                          </div>
                       )}

                       <div className="bg-rose-50 rounded-[2.5rem] p-8 border-4 border-white shadow-sm space-y-4">
                          <div className="flex justify-between items-center">
                             <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Grade Product Knowledge</p>
                             <div className="flex gap-1">{[...Array(5)].map((_, i) => <IconStar key={i} fill={i < detailReview.grade_product_knowledge ? "#f59e0b" : "white"} stroke="#f59e0b" />)}</div>
                          </div>
                          <p className="text-[11px] font-bold text-rose-800 leading-relaxed bg-white/60 p-4 rounded-2xl border border-rose-100 shadow-inner">"{detailReview.catatan_product_knowledge || '-'}"</p>
                       </div>

                       {detailReview.photo_url && (
                          <div className="pt-6">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dokumentasi Review</p>
                             <img src={detailReview.photo_url} className="w-full rounded-[2rem] border-8 border-slate-50 shadow-lg object-cover" alt="Documentation" />
                          </div>
                       )}
                    </div>
                 </div>
                 <div className="p-8 bg-slate-50 border-t border-slate-100">
                    <button onClick={() => setDetailReview(null)} className="w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.3em] rounded-2xl">Confirm Read</button>
                 </div>
              </div>
           </div>
        )}

      </div>

      <style jsx global>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(220,38,38,0.25); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
      `}</style>
    </div>
  );
}
