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

// SVGs for Icons (to avoid lucide-react dependency issues)
const IconDashboard = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
);
const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
);
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);
const IconStar = ({ fill = "none", stroke = "currentColor", ...props }: { fill?: string; stroke?: string; [key: string]: any }) => (
  <svg {...props} width="18" height="18" viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
);
const IconPackage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>
);
const IconFile = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
);
const IconCheckCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
);
const IconAlertCircle = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
);
const IconMapPin = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
);
const IconCalendar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
);
const IconUser = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
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

const COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#fb7185', '#6366f1'];

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
    // Attempt to get user from localStorage or redirect if not found
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    } else {
      // In a real Next app, you'd use middleware or session, 
      // but following the user's previous pattern:
      // router.push('/'); 
    }
  }, []);

  const fetchData = useCallback(async (user: User) => {
    setLoading(true);
    
    // Fetch user's reviews
    let reviewQuery = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (user.role === 'guest') {
      reviewQuery = reviewQuery.eq('sales_name', user.full_name);
    }
    const { data: reviewData } = await reviewQuery;
    if (reviewData) setReviews(reviewData);

    // Fetch pending reminders (status=done, no review yet)
    let reminderQuery = supabase.from('reminders')
      .select('*')
      .eq('status', 'done')
      .in('category', ['Demo Product', 'Konfigurasi & Training', 'Training', 'Konfigurasi']);
      
    if (user.role === 'guest') {
      reminderQuery = reminderQuery.eq('sales_name', user.full_name);
    }

    const { data: reminderData } = await reminderQuery;
    if (reminderData && reviewData) {
      const reviewedIds = new Set(reviewData.map(r => r.reminder_id));
      const pending = reminderData.filter(r => !reviewedIds.has(r.id));
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

  const filteredReviews = useMemo(() => reviews.filter(r => 
    r.project_name.toLowerCase().includes(search.toLowerCase()) ||
    r.assign_name.toLowerCase().includes(search.toLowerCase())
  ), [reviews, search]);

  const stats = useMemo(() => ({
    total: reviews.length,
    demoProduct: reviews.filter(r => r.reminder_category === 'Demo Product').length,
    training: reviews.filter(r => ['Training', 'Konfigurasi & Training', 'Konfigurasi'].includes(r.reminder_category)).length,
    pending: pendingReminders.length
  }), [reviews, pendingReminders]);

  const getChartData = useCallback((key: keyof ReviewRecord) => {
    const counts: Record<string, number> = {};
    reviews.forEach(r => {
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

  if (!currentUser) return <div className="p-20 text-center">Loading User...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen font-sans">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
            <IconDashboard />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Review Dashboard</h1>
            <p className="text-slate-500 text-sm">Survey & evaluasi implementasi produk oleh Guest</p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-3 rounded-2xl transition-all relative ${pendingReminders.length > 0 ? 'bg-amber-100 text-amber-600' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            <IconBell />
            {pendingReminders.length > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                {pendingReminders.length}
              </span>
            )}
          </button>
          
          {showNotifications && (
            <div className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden transform transition-all">
              <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
                <h3 className="font-bold">Menunggu Review</h3>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{pendingReminders.length}</span>
              </div>
              <div className="max-h-96 overflow-y-auto p-2">
                {pendingReminders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <IconCheckCircle />
                    <p className="text-xs mt-2">Semua tugas sudah di-review!</p>
                  </div>
                ) : (
                  pendingReminders.map(r => (
                    <div key={r.id} className="p-3 hover:bg-slate-50 rounded-2xl transition-all border-b border-slate-50 last:border-0 group">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm text-slate-800 line-clamp-1">{r.project_name}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md">{r.category}</span>
                      </div>
                      <p className="text-[10px] text-slate-400">Handler: {r.assign_name}</p>
                      <button 
                        onClick={() => handleOpenReview(r)}
                        className="w-full mt-2 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-all font-sans"
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

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Review', value: stats.total, icon: <IconFile />, color: 'bg-indigo-600', shadow: 'shadow-indigo-100' },
          { label: 'Demo Product', value: stats.demoProduct, icon: <IconPackage />, color: 'bg-purple-600', shadow: 'shadow-purple-100' },
          { label: 'Training', value: stats.training, icon: <IconDashboard />, color: 'bg-emerald-600', shadow: 'shadow-emerald-100' },
          { label: 'Menunggu', value: stats.pending, icon: <IconAlertCircle />, color: 'bg-amber-600', shadow: 'shadow-amber-100' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-3xl p-6 border border-slate-100 transition-all hover:translate-y-[-4px] shadow-sm ${stat.shadow}`}>
            <div className={`w-10 h-10 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
              {stat.icon}
            </div>
            <p className="text-2xl font-black text-slate-800">{stat.value}</p>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          { title: 'Kategori Kegiatan', data: chartData.category, icon: '📊' },
          { title: 'Handler Team PTS', data: chartData.handler, icon: '👥' },
          { title: 'Product Unit', data: chartData.product, icon: '📦' },
        ].map(chart => (
          <div key={chart.title} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6 text-sm">
              <span className="text-lg">{chart.icon}</span>
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
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* Search & List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">Daftar Review</h2>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{filteredReviews.length}</span>
          </div>
          <div className="relative w-64">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <IconSearch />
            </span>
            <input 
              type="text" 
              placeholder="Cari project atau handler..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-sm transition-all bg-white"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin"></div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-300 transition-all">
            <p className="text-slate-500 font-medium">Belum ada review yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map(review => (
              <div key={review.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all relative">
                <div className="absolute right-6 top-6 flex flex-col items-end">
                   <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <IconStar key={i} fill={i < review.grade_product_knowledge ? "#f59e0b" : "none"} stroke={i < review.grade_product_knowledge ? "#f59e0b" : "#e2e8f0"} />
                      ))}
                   </div>
                   <span className="text-[10px] font-bold text-amber-600">{review.grade_product_knowledge}/5 Stars</span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-2xl ${review.review_category === 'Demo Product' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {review.review_category === 'Demo Product' ? <IconPackage /> : <IconFile />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">{review.review_category}</p>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{review.project_name}</h4>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center gap-2 text-slate-500 text-xs shadow-none">
                    <IconMapPin />
                    <span className="truncate">{review.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <IconCalendar />
                    <span>{new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <IconUser />
                    <span>Handler: {review.assign_name}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                  <p className="text-xs text-slate-600 italic font-medium leading-relaxed">"{review.catatan_product_knowledge || 'Tidak ada catatan'}"</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{review.product}</span>
                   <button className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-all font-sans">
                      Detail <IconChevronRight />
                   </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {showReviewForm && selectedReminder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2 text-lg">
                  <IconStar fill="#f59e0b" stroke="#f59e0b" />
                  Isi Review Form
                </h3>
                <p className="text-white/60 text-[10px] mt-0.5 tracking-wide">{selectedReminder.project_name}</p>
              </div>
              <button onClick={() => setShowReviewForm(false)} className="text-white/40 hover:text-white transition-all transform hover:rotate-90">
                <IconXCircle />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans ml-1">Produk / Unit</label>
                  <input 
                    type="text" 
                    value={reviewForm.product}
                    onChange={e => setReviewForm({ ...reviewForm, product: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50"
                    placeholder="Nama produk..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans ml-1">Rating Product Knowledge</label>
                  <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          onClick={() => setReviewForm({ ...reviewForm, grade_product_knowledge: star })}
                          className="transition-all active:scale-90 hover:scale-110"
                        >
                          <IconStar 
                            fill={star <= reviewForm.grade_product_knowledge ? "#f59e0b" : "none"} 
                            stroke={star <= reviewForm.grade_product_knowledge ? "#f59e0b" : "#cbd5e1"} 
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xl font-black text-amber-600">{reviewForm.grade_product_knowledge}/5</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans ml-1">Catatan Product Knowledge</label>
                  <textarea 
                    value={reviewForm.catatan_product_knowledge}
                    onChange={e => setReviewForm({ ...reviewForm, catatan_product_knowledge: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none bg-slate-50/50 text-sm"
                    placeholder="Berikan masukan mengenai pemahaman produk..."
                  />
                </div>

                {['Training', 'Konfigurasi & Training'].includes(selectedReminder.category) && (
                  <>
                     <div className="space-y-3 pt-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans ml-1">Rating Training Customer</label>
                      <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star} 
                              onClick={() => setReviewForm({ ...reviewForm, grade_training_customer: star })}
                              className="transition-all active:scale-90 hover:scale-110"
                            >
                              <IconStar 
                                fill={star <= reviewForm.grade_training_customer ? "#f59e0b" : "none"} 
                                stroke={star <= reviewForm.grade_training_customer ? "#f59e0b" : "#cbd5e1"} 
                              />
                            </button>
                          ))}
                        </div>
                        <span className="text-xl font-black text-amber-600">{reviewForm.grade_training_customer}/5</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans ml-1">Catatan Training Customer</label>
                      <textarea 
                        value={reviewForm.catatan_training_customer}
                        onChange={e => setReviewForm({ ...reviewForm, catatan_training_customer: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/20 h-24 resize-none bg-slate-50/50 text-sm"
                        placeholder="Berikan masukan mengenai proses training..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button 
                onClick={() => setShowReviewForm(false)}
                className="flex-1 px-4 py-3 rounded-2xl font-bold text-slate-600 hover:bg-slate-200 transition-all font-sans"
              >
                Batal
              </button>
              <button 
                onClick={submitReview}
                disabled={saving || !reviewForm.product}
                className="flex-1 px-4 py-3 rounded-2xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-sans disabled:cursor-not-allowed"
              >
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}
