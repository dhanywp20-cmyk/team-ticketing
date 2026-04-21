"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ReviewRecord, Reminder, User, ReviewCategory } from '@/types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Star, 
  Search, 
  Bell, 
  LayoutDashboard, 
  PieChart as PieChartIcon, 
  ChevronRight, 
  MapPin, 
  User as UserIcon, 
  Calendar,
  Package,
  CheckCircle2,
  AlertCircle,
  FileText,
  Trash2,
  Edit,
  ExternalLink,
  MessageSquare,
  XCircle
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const COLORS = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#fb7185', '#6366f1'];

interface FormReviewProps {
  currentUser: User;
}

export default function FormReview({ currentUser }: FormReviewProps) {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [selectedReminder, setSelectedReminder] = useState<Reminder | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    product: '',
    grade_product_knowledge: 5,
    catatan_product_knowledge: '',
    grade_training_customer: 5,
    catatan_training_customer: '',
  });

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
  };

  const submitReview = async () => {
    if (!selectedReminder) return;
    setSaving(true);
    
    const payload = {
      reminder_id: selectedReminder.id,
      project_name: selectedReminder.project_name,
      address: selectedReminder.address,
      sales_name: selectedReminder.sales_name,
      sales_division: selectedReminder.sales_division,
      assign_name: selectedReminder.assign_name,
      review_category: (selectedReminder.category === 'Demo Product' ? 'Demo Product' : 'BAST') as ReviewCategory,
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
      fetchData();
    }
  };

  const [saving, setSaving] = useState(false);
  const [pendingReminders, setPendingReminders] = useState<Reminder[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchData();
  }, [currentUser]);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch user's reviews
    let reviewQuery = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    
    // If guest, only see their own
    if (currentUser.role === 'guest') {
      reviewQuery = reviewQuery.eq('sales_name', currentUser.full_name);
    }
    
    const { data: reviewData } = await reviewQuery;
    if (reviewData) setReviews(reviewData);

    // Fetch pending reminders that need review (status=done, no review yet)
    // Only category Demo Product, Konfigurasi & Training, Training
    let reminderQuery = supabase.from('reminders')
      .select('*')
      .eq('status', 'done')
      .in('category', ['Demo Product', 'Konfigurasi & Training', 'Training', 'Konfigurasi']);
      
    if (currentUser.role === 'guest') {
      reminderQuery = reminderQuery.eq('sales_name', currentUser.full_name);
    }

    const { data: reminderData } = await reminderQuery;
    if (reminderData && reviewData) {
      const reviewedIds = new Set(reviewData.map(r => r.reminder_id));
      const pending = reminderData.filter(r => !reviewedIds.has(r.id));
      setPendingReminders(pending);
    }

    setLoading(false);
  };

  const filteredReviews = reviews.filter(r => 
    r.project_name.toLowerCase().includes(search.toLowerCase()) ||
    r.assign_name.toLowerCase().includes(search.toLowerCase())
  );

  // Stats for Dashboard
  const stats = {
    total: reviews.length,
    demoProduct: reviews.filter(r => r.reminder_category === 'Demo Product').length,
    training: reviews.filter(r => r.reminder_category === 'Training' || r.reminder_category === 'Konfigurasi & Training' || r.reminder_category === 'Konfigurasi').length,
    pending: pendingReminders.length
  };

  // Chart Data
  const getChartData = (key: keyof ReviewRecord) => {
    const counts: Record<string, number> = {};
    reviews.forEach(r => {
      const val = String(r[key] || 'Unknown');
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  };

  const chartData = {
    category: getChartData('reminder_category'),
    handler: getChartData('assign_name'),
    product: getChartData('product'),
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-50 min-h-screen">
      {/* Header & Notification Bell */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Review Dashboard</h1>
            <p className="text-slate-500 text-sm">Survey & evaluasi implementasi produk</p>
          </div>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`p-3 rounded-2xl transition-all relative ${pendingReminders.length > 0 ? 'bg-amber-50 text-amber-600' : 'bg-white text-slate-400 border border-slate-200'}`}
          >
            <Bell size={20} />
            {pendingReminders.length > 0 && (
              <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse border-2 border-white">
                {pendingReminders.length}
              </span>
            )}
          </button>
          
          <AnimatePresence>
            {showNotifications && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute right-0 mt-4 w-80 bg-white rounded-3xl shadow-2xl border border-slate-100 z-50 overflow-hidden"
              >
                <div className="p-4 bg-amber-600 text-white flex justify-between items-center">
                  <h3 className="font-bold">Menunggu Review</h3>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">{pendingReminders.length}</span>
                </div>
                <div className="max-h-96 overflow-y-auto p-2">
                  {pendingReminders.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">
                      <CheckCircle2 size={32} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs">Semua tugas sudah di-review!</p>
                    </div>
                  ) : (
                    pendingReminders.map(r => (
                      <div key={r.id} className="p-3 hover:bg-slate-50 rounded-2xl transition-all cursor-pointer border-b border-slate-50 last:border-0 group">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-amber-600 transition-colors">{r.project_name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-md whitespace-nowrap">{r.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-400">Handler: {r.assign_name}</p>
                        <button 
                          onClick={() => handleOpenReview(r)}
                          className="w-full mt-2 py-1.5 bg-amber-50 text-amber-600 text-[10px] font-bold rounded-lg hover:bg-amber-100 transition-all"
                        >
                          Isi Review Sekarang
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Review', value: stats.total, icon: <FileText size={20} />, color: 'bg-indigo-600', shadow: 'shadow-indigo-100' },
          { label: 'Demo Product', value: stats.demoProduct, icon: <Package size={20} />, color: 'bg-purple-600', shadow: 'shadow-purple-100' },
          { label: 'Training', value: stats.training, icon: <LayoutDashboard size={20} />, color: 'bg-emerald-600', shadow: 'shadow-emerald-100' },
          { label: 'Menunggu', value: stats.pending, icon: <AlertCircle size={20} />, color: 'bg-amber-600', shadow: 'shadow-amber-100' },
        ].map(stat => (
          <div key={stat.label} className={`bg-white rounded-3xl p-6 border border-slate-100 transition-all hover:scale-[1.02] ${stat.shadow}`}>
            <div className={`w-10 h-10 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg active:scale-95 transition-transform`}>
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
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-6">
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
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      {/* List Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-slate-800">Daftar Review</h2>
            <span className="text-xs font-bold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">{filteredReviews.length}</span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
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
          <div className="bg-white rounded-3xl p-20 text-center border border-dashed border-slate-300">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-slate-500 font-medium">Belum ada review yang ditemukan.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredReviews.map(review => (
              <div key={review.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute right-0 top-0 p-6 flex flex-col items-end">
                   <div className="flex items-center gap-1 mb-1">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={14} fill={i < review.grade_product_knowledge ? "#f59e0b" : "none"} stroke={i < review.grade_product_knowledge ? "#f59e0b" : "#e2e8f0"} />
                      ))}
                   </div>
                   <span className="text-[10px] font-bold text-amber-600">{review.grade_product_knowledge}/5 Stars</span>
                </div>

                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-2xl ${review.review_category === 'Demo Product' ? 'bg-purple-50 text-purple-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {review.review_category === 'Demo Product' ? <Package size={20} /> : <FileText size={20} />}
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{review.review_category}</p>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight">{review.project_name}</h4>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <MapPin size={12} className="flex-shrink-0" />
                    <span className="truncate">{review.address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <Calendar size={12} className="flex-shrink-0" />
                    <span>{new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs">
                    <UserIcon size={12} className="flex-shrink-0" />
                    <span>Handler: {review.assign_name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                    <Package size={12} className="flex-shrink-0 text-indigo-500" />
                    <span className="text-indigo-600">{review.product}</span>
                  </div>
                </div>

                {review.catatan_product_knowledge && (
                   <div className="p-3 bg-slate-50 rounded-2xl mb-4 border border-slate-100">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                        <MessageSquare size={10} /> Catatan Review
                      </p>
                      <p className="text-xs text-slate-600 italic line-clamp-2">"{review.catatan_product_knowledge}"</p>
                   </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <div className="flex gap-2">
                      <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit size={16} /></button>
                      <button className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                   </div>
                   <button className="flex items-center gap-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all">
                      Lihat Detail <ChevronRight size={14} />
                   </button>
                </div>

                {review.foto_dokumentasi_url && (
                   <div className="absolute -bottom-4 -right-4 w-12 h-12 rotate-12 opacity-10 group-hover:opacity-20 transition-opacity">
                      <ExternalLink size={48} />
                   </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Review Form Modal */}
      {showReviewForm && selectedReminder && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden"
          >
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <div>
                <h3 className="font-bold flex items-center gap-2">
                  <Star className="text-amber-400" size={18} fill="#f59e0b" />
                  Form Review
                </h3>
                <p className="text-white/60 text-[10px] mt-0.5">{selectedReminder.project_name}</p>
              </div>
              <button onClick={() => setShowReviewForm(false)} className="text-white/40 hover:text-white transition-colors">
                <XCircle size={20} />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Produk / Unit</label>
                  <input 
                    type="text" 
                    value={reviewForm.product}
                    onChange={e => setReviewForm({ ...reviewForm, product: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Nama produk..."
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Rating Product Knowledge</label>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button 
                          key={star} 
                          onClick={() => setReviewForm({ ...reviewForm, grade_product_knowledge: star })}
                          className="transition-transform active:scale-90"
                        >
                          <Star 
                            size={28} 
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
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Catatan Product Knowledge</label>
                  <textarea 
                    value={reviewForm.catatan_product_knowledge}
                    onChange={e => setReviewForm({ ...reviewForm, catatan_product_knowledge: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20 h-24 resize-none"
                    placeholder="Berikan masukan mengenai pemahaman produk..."
                  />
                </div>

                {(selectedReminder.category === 'Training' || selectedReminder.category === 'Konfigurasi & Training') && (
                  <>
                     <div className="space-y-3 pt-2">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Rating Training Customer</label>
                      <div className="flex items-center gap-4">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <button 
                              key={star} 
                              onClick={() => setReviewForm({ ...reviewForm, grade_training_customer: star })}
                              className="transition-transform active:scale-90"
                            >
                              <Star 
                                size={28} 
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
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Catatan Training Customer</label>
                      <textarea 
                        value={reviewForm.catatan_training_customer}
                        onChange={e => setReviewForm({ ...reviewForm, catatan_training_customer: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20 h-24 resize-none"
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
                className="flex-1 px-4 py-3 rounded-2xl font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 font-sans"
              >
                {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                Submit Review
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
