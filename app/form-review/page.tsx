"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// SVGs for Icons (to avoid library dependency issues)
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);
const IconSearch = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const IconStar = ({ fill = "none", stroke = "currentColor", ...props }: { fill?: string; stroke?: string; [key: string]: any }) => (
  <svg {...props} width="16" height="16" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);
const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);
const IconCheckCircle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IconAlertCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);
const IconMapPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const IconCalendar = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
const IconUser = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
);
const IconChevronRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
);
const IconXCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

// Types
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
}

const COLORS = ['#be123c', '#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#dc2626'];

export default function FormReview() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  const [reviewForm, setReviewForm] = useState({
    product: '',
    grade_product_knowledge: 5,
    catatan_product_knowledge: '',
    grade_training_customer: 5,
    catatan_training_customer: '',
  });

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const fetchData = useCallback(async (user: User) => {
    setLoading(true);
    
    let reviewQuery = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (user.role === 'guest') {
      reviewQuery = reviewQuery.eq('sales_name', user.full_name);
    }
    const { data: reviewData } = await reviewQuery;
    if (reviewData) setReviews(reviewData);

    let reminderQuery = supabase.from('reminders')
      .select('*')
      .eq('status', 'done')
      .in('category', ['Demo Product', 'Konfigurasi & Training', 'Training', 'Konfigurasi']);
      
    if (user.role === 'guest') {
      reminderQuery = reminderQuery.eq('sales_name', user.full_name);
    }

    const { data: reminderData } = await reminderQuery;
    if (reminderData && reviewData) {
      const reviewedIds = new Set(reviewData.map((r: ReviewRecord) => r.reminder_id));
      const pending = reminderData.filter((r: Reminder) => !reviewedIds.has(r.id));
      setPendingReminders(pending);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchData(currentUser);
    }
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
    setShowReviewForm(true);
    setShowNotifications(false);
  };

  const submitReview = async () => {
    if (!selectedReminder || !currentUser) return;
    setSaving(true);
    
    const payload = {
      reminder_id: selectedReminder.id,
      project_name: selectedReminder.project_name,
      address: selectedReminder.address,
      sales_name: selectedReminder.sales_name,
      sales_division: selectedReminder.sales_division,
      assign_name: selectedReminder.assign_name,
      review_category: (selectedReminder.category === 'Demo Product' ? 'Demo Product' : 'BAST'),
      reminder_category: selectedReminder.category,
      product: reviewForm.product,
      grade_product_knowledge: reviewForm.grade_product_knowledge,
      catatan_product_knowledge: reviewForm.catatan_product_knowledge,
      grade_training_customer: reviewForm.grade_training_customer,
      catatan_training_customer: reviewForm.catatan_training_customer,
      created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from('reviews').insert([payload]);
    setSaving(false);
    
    if (error) {
      alert('Gagal submit review: ' + error.message);
    } else {
      setShowReviewForm(false);
      setSelectedReminder(null);
      fetchData(currentUser);
    }
  };

  const filteredReviews = useMemo(() => reviews.filter((r: ReviewRecord) => 
    r.project_name.toLowerCase().includes(search.toLowerCase()) ||
    r.assign_name.toLowerCase().includes(search.toLowerCase())
  ), [reviews, search]);

  const stats = useMemo(() => ({
    total: reviews.length,
    demoProduct: reviews.filter((r: ReviewRecord) => r.reminder_category === 'Demo Product').length,
    training: reviews.filter((r: ReviewRecord) => ['Training', 'Konfigurasi & Training', 'Konfigurasi'].includes(r.reminder_category)).length,
    pending: pendingReminders.length
  }), [reviews, pendingReminders]);

  const getChartData = useCallback((key: keyof ReviewRecord) => {
    const counts: Record<string, number> = {};
    reviews.forEach((r: ReviewRecord) => {
      const val = String(r[key] || 'Unknown');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [reviews]);

  const chartData = useMemo(() => ({
    category: getChartData('reminder_category'),
    handler: getChartData('assign_name'),
    product: getChartData('product'),
  }), [getChartData]);

  if (!currentUser) return <div className="p-20 text-center font-bold text-slate-400">Memuat Data User...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen font-sans">
      {/* Header - Aligned with Reminder Schedule */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Review Dashboard</h1>
          <p className="text-slate-500 text-sm">Survey & evaluasi implementasi produk oleh Guest</p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-3 rounded-2xl transition-all relative ${pendingReminders.length > 0 ? 'bg-rose-100 text-rose-600' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            <IconBell />
            {pendingReminders.length > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white">
                {pendingReminders.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden transform transition-all">
              <div className="p-4 bg-rose-600 text-white flex justify-between items-center">
                <h3 className="font-bold">Menunggu Review</h3>
                <span className="text-[10px] font-black bg-white/20 px-2 py-0.5 rounded-full">{pendingReminders.length}</span>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {pendingReminders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <IconCheckCircle />
                    <p className="text-xs mt-2 font-bold lowercase">Semua tugas sudah di-review!</p>
                  </div>
                ) : (
                  pendingReminders.map((r: Reminder) => (
                    <div key={r.id} className="p-4 hover:bg-slate-50 rounded-2xl transition-all border-b border-slate-50 last:border-0 group">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-black text-sm text-slate-800 line-clamp-1">{r.project_name}</p>
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-md uppercase">{r.category}</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 lowercase">Handler: {r.assign_name}</p>
                      <button 
                        onClick={() => handleOpenReview(r)}
                        className="w-full mt-3 py-2 bg-rose-600 text-white text-[10px] font-black rounded-xl hover:bg-rose-700 transition-all font-sans shadow-lg shadow-rose-100 uppercase tracking-widest"
                      >
                        Isi Review Sekarang
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row - Matching Card Style */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Review', value: stats.total, icon: <IconFile />, color: 'bg-rose-600', shadow: 'shadow-rose-100' },
          { label: 'Demo Product', value: stats.demoProduct, icon: <IconPackage />, color: 'bg-purple-600', shadow: 'shadow-purple-100' },
          { label: 'Training', value: stats.training, icon: <IconDashboard />, color: 'bg-emerald-600', shadow: 'shadow-emerald-100' },
          { label: 'Menunggu', value: stats.pending, icon: <IconAlertCircle />, color: 'bg-amber-600', shadow: 'shadow-amber-100' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-3xl p-6 border border-slate-100 transition-all hover:translate-y-[-4px] shadow-sm ${stat.shadow}`}>
            <div className={`w-10 h-10 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row - Matching Container style */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: 'Kategori Kegiatan', data: chartData.category, icon: '📊' },
          { title: 'Handler Team PTS', data: chartData.handler, icon: '👥' },
          { title: 'Product Unit', data: chartData.product, icon: '📦' },
        ].map(chart => (
          <div key={chart.title} className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm transition-all hover:shadow-md">
            <h3 className="font-black text-slate-800 flex items-center gap-2 mb-6 text-[11px] uppercase tracking-widest text-slate-400">
              <span className="text-lg opacity-100">{chart.icon}</span>
              {chart.title}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chart.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chart.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Search & List - Matching Reminder Schedule Search Style */}
      <div className="space-y-4">
        <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-sm flex flex-wrap gap-3">
          <div className="flex-1 min-w-[240px] relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </span>
            <input 
              type="text" 
              placeholder="Cari project atau handler..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-100 outline-none focus:ring-2 focus:ring-rose-500/20 bg-slate-50/50 text-sm font-medium transition-all"
            />
          </div>
          <div className="flex items-center px-4 bg-slate-50 rounded-xl border border-slate-100">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {filteredReviews.length} Records</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-rose-600 rounded-full animate-spin"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-slate-200 transition-all">
            <p className="text-slate-400 font-bold text-sm lowercase tracking-tight">Belum ada review yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredReviews.map(review => (
              <div key={review.id} className="bg-white rounded-[2rem] p-7 border border-slate-100 shadow-sm hover:translate-y-[-4px] transition-all group relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 rounded-bl-[4rem] flex items-center justify-center -mr-8 -mt-8 pt-4 pl-4 opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-center">
                        <IconStar fill="#f59e0b" stroke="#f59e0b" />
                        <span className="text-[10px] font-black text-rose-700 mt-1">{review.grade_product_knowledge}/5</span>
                    </div>
                </div>

                <div className="flex items-start gap-4 mb-5">
                  <div className={`p-4 rounded-2xl shadow-md ${review.review_category === 'Demo Product' ? 'bg-purple-600 text-white shadow-purple-100' : 'bg-emerald-600 text-white shadow-emerald-100'}`}>
                    {review.review_category === 'Demo Product' ? <IconPackage /> : <IconFile />}
                  </div>
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{review.review_category}</span>
                    <h4 className="font-black text-slate-800 text-xl leading-tight mt-1">{review.project_name}</h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                    <IconMapPin />
                    <span className="truncate">{review.address || 'Tanpa Alamat'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                    <IconCalendar />
                    <span>{new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-bold col-span-2">
                    <IconUser />
                    <span>Handler: <span className="text-slate-800">{review.assign_name}</span></span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl mb-6 border border-slate-100/50 group-hover:bg-white group-hover:border-slate-200 transition-all">
                  <p className="text-[11px] text-slate-600 italic font-bold leading-relaxed lowercase">"{review.catatan_product_knowledge || 'tidak ada catatan'}"</p>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                   <div className="flex gap-2">
                      <span className="text-[9px] font-black text-rose-600 bg-rose-50 px-3 py-1 rounded-full uppercase tracking-widest border border-rose-100">{review.product}</span>
                   </div>
                   <button className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 hover:text-rose-600 transition-all uppercase tracking-widest font-sans">
                      Detail <IconChevronRight />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal - Exact Style from Reminder Schedule */}
      {showReviewForm && selectedReminder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200 my-8">
            <div className="p-7 bg-slate-900 text-white flex justify-between items-center relative">
              <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                 <IconStar width="120" height="120" />
              </div>
              <div>
                <h3 className="font-black flex items-center gap-3 text-xl tracking-tight">
                  <span className="p-2 bg-rose-600 rounded-xl"><IconStar fill="white" stroke="white" /></span>
                  ISI REVIEW FORM
                </h3>
                <p className="text-white/40 text-[10px] font-bold mt-2 uppercase tracking-widest">{selectedReminder.project_name}</p>
              </div>
              <button 
                onClick={() => setShowReviewForm(false)} 
                className="text-white/40 hover:text-white transition-all transform hover:rotate-90 p-2"
              >
                <IconXCircle />
              </button>
            </div>

            <div className="p-10 space-y-7 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Produk / Unit Target *</label>
                  <input 
                    type="text" 
                    value={reviewForm.product}
                    onChange={e => setReviewForm({ ...reviewForm, product: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 bg-slate-50/50 transition-all font-bold text-slate-800"
                    placeholder="Contoh: Cisco SX80, Samsung 55..."
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 text-center block">Rating Product Knowledge</label>
                  <div className="flex flex-col items-center gap-4 bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-100 shadow-inner">
                    <div className="flex gap-3">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          onClick={() => setReviewForm({ ...reviewForm, grade_product_knowledge: star })}
                          className="transition-all active:scale-95 hover:scale-125"
                        >
                          <IconStar 
                            width="32" height="32"
                            fill={star <= reviewForm.grade_product_knowledge ? "#f59e0b" : "white"} 
                            stroke={star <= reviewForm.grade_product_knowledge ? "#f59e0b" : "#fecaca"} 
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-3xl font-black text-rose-700 tracking-tighter">{reviewForm.grade_product_knowledge} / 5 <span className="text-sm font-bold text-rose-400 ml-1 tracking-normal uppercase italic">Stars</span></span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Catatan Tambahan</label>
                  <textarea 
                    value={reviewForm.catatan_product_knowledge}
                    onChange={e => setReviewForm({ ...reviewForm, catatan_product_knowledge: e.target.value })}
                    className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 h-32 resize-none bg-slate-50/50 text-sm font-bold text-slate-600 lowercase"
                    placeholder="berikan masukan atau detail kendala jika ada..."
                  />
                </div>

                {['Training', 'Konfigurasi & Training'].includes(selectedReminder.category) && (
                  <div className="pt-4 space-y-6 border-t-2 border-dashed border-slate-100">
                     <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 text-center block">Rating Training Customer</label>
                      <div className="flex flex-col items-center gap-4 bg-emerald-50 p-6 rounded-[2rem] border-2 border-emerald-100 shadow-inner">
                        <div className="flex gap-3">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star} 
                              onClick={() => setReviewForm({ ...reviewForm, grade_training_customer: star })}
                               className="transition-all active:scale-95 hover:scale-125"
                            >
                              <IconStar 
                                width="32" height="32"
                                fill={star <= reviewForm.grade_training_customer ? "#10b981" : "white"} 
                                stroke={star <= reviewForm.grade_training_customer ? "#10b981" : "#a7f3d0"} 
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-3xl font-black text-emerald-700 tracking-tighter">{reviewForm.grade_training_customer} / 5</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Catatan Training</label>
                      <textarea 
                        value={reviewForm.catatan_training_customer}
                        onChange={e => setReviewForm({ ...reviewForm, catatan_training_customer: e.target.value })}
                        className="w-full px-5 py-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 h-32 resize-none bg-slate-50/50 text-sm font-bold text-slate-600 lowercase"
                        placeholder="masukan mengenai hasil training kepada customer..."
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
              <button 
                onClick={() => setShowReviewForm(false)}
                className="flex-1 px-6 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all text-xs uppercase tracking-widest font-sans"
              >
                Batal
              </button>
              <button 
                onClick={submitReview}
                disabled={saving || !reviewForm.product}
                className="flex-2 px-8 py-4 rounded-2xl font-black text-white bg-rose-600 hover:bg-rose-700 shadow-2xl shadow-rose-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50 text-xs uppercase tracking-[0.15em] font-sans disabled:cursor-not-allowed grow"
              >
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                {saving ? 'Mengirim Data...' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc;
          border-radius: 20px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
          border: 2px solid #f8fafc;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
