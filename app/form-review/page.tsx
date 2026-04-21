'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Search, 
  Star, 
  Filter, 
  PieChart as PieIcon,
  BarChart2,
  CheckCircle2,
  MoreVertical,
  X,
  TrendingUp,
  LayoutDashboard,
  Users,
  Box,
  ChevronRight,
  ClipboardList,
  ArrowUpRight
} from 'lucide-react';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewCategory = 'Demo Product' | 'BAST';

interface Reminder {
  id: string;
  project_name: string;
  title?: string;
  address: string;
  sales_name: string;
  sales_division: string;
  assign_name: string;
  assigned_to: string;
  category: string;
  status: string;
  due_date: string;
  due_time: string;
  description?: string;
}

interface ReviewRecord {
  id: string;
  reminder_id: string;
  project_name: string;
  address: string;
  sales_name: string;
  sales_division: string;
  assign_name: string;
  review_category: ReviewCategory;
  product: string;
  grade_product_knowledge: number;
  catatan_product_knowledge: string;
  grade_training_customer?: number;
  catatan_training_customer?: string;
  foto_dokumentasi_url?: string;
  created_at: string;
  updated_at?: string;
  reminder_category: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StarRating({ value, onChange, readOnly = false, size = 'md' }: { value: number; onChange?: (v: number) => void; readOnly?: boolean; size?: 'sm' | 'md' | 'lg' }) {
  const [hover, setHover] = useState(0);
  const stars = [1, 2, 3, 4, 5];
  return (
    <div className="flex items-center gap-1">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(s)}
          onMouseEnter={() => !readOnly && setHover(s)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`transition-all ${!readOnly ? 'hover:scale-125 cursor-pointer' : 'cursor-default'}`}
        >
          <Star 
            size={size === 'sm' ? 14 : size === 'lg' ? 32 : 20} 
            fill={(hover || value) >= s ? "#f59e0b" : "transparent"} 
            className={(hover || value) >= s ? "text-amber-500" : "text-slate-200"}
          />
        </button>
      ))}
    </div>
  );
}

function MiniPieChart({ data, title, icon }: { data: { label: string; value: number; color: string }[]; title: string; icon: React.ReactNode }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const cx = 50, cy = 50, r = 40, ir = 25;

  return (
    <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
         {icon}
         <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-center gap-6">
        <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
          {data.map((d, i) => {
            const angle = (d.value / total) * 2 * Math.PI;
            const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
            const x2 = cx + r * Math.cos(cumAngle + angle), y2 = cy + r * Math.sin(cumAngle + angle);
            const xi1 = cx + ir * Math.cos(cumAngle), yi1 = cy + ir * Math.sin(cumAngle);
            const xi2 = cx + ir * Math.cos(cumAngle + angle), yi2 = cy + ir * Math.sin(cumAngle + angle);
            const large = angle > Math.PI ? 1 : 0;
            const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
            cumAngle += angle;
            return <path key={i} d={path} fill={d.color} stroke="white" strokeWidth="1" />;
          })}
          <text x="50" y="50" textAnchor="middle" dy="0.32em" fontSize="12" fontWeight="900" fill="#1e293b">{total}</text>
        </svg>
        <div className="flex-1 space-y-1 max-h-[100px] overflow-y-auto custom-scrollbar pr-2">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-[10px] font-bold text-slate-500 truncate">{d.label}</span>
              </div>
              <span className="text-[10px] font-black text-slate-800">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Detail ────────────────────────────────────────────────────────────

function ReviewDetailModal({ record, onClose }: { record: ReviewRecord; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden">
        <div className="bg-red-600 p-8 text-white">
           <div className="flex justify-between items-start mb-6">
              <div className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/30">Review Detail</div>
              <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"><X size={20} /></button>
           </div>
           <h2 className="text-3xl font-black mb-2">{record.project_name}</h2>
           <p className="text-red-100/70 font-bold text-sm flex items-center gap-2"><Box size={16} /> {record.product || 'Standard Product'}</p>
        </div>
        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                 <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Product Knowledge</label>
                    <div className="flex items-center gap-3">
                       <StarRating value={record.grade_product_knowledge} readOnly />
                       <span className="text-xl font-black text-slate-800">{record.grade_product_knowledge}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2 italic font-medium">"{record.catatan_product_knowledge || '-'}"</p>
                 </div>
                 {record.grade_training_customer && (
                   <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Training Customer</label>
                      <div className="flex items-center gap-3">
                         <StarRating value={record.grade_training_customer} readOnly />
                         <span className="text-xl font-black text-slate-800">{record.grade_training_customer}</span>
                      </div>
                   </div>
                 )}
              </div>
              <div className="space-y-4">
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Handler Team</p>
                    <p className="text-sm font-bold text-slate-700">{record.assign_name}</p>
                 </div>
                 <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sales Advisor</p>
                    <p className="text-sm font-bold text-slate-700">{record.sales_name}</p>
                 </div>
              </div>
           </div>
           {record.foto_dokumentasi_url && (
             <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Foto Dokumentasi</p>
                <img src={record.foto_dokumentasi_url} className="w-full h-64 object-cover rounded-2xl shadow-md" alt="evidence" />
             </div>
           )}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormReview() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);

  const fetchReviews = useCallback(async (user: any) => {
    setLoading(true);
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    
    // If guest, filter by their full name (matches logic requested)
    if (user && user.role === 'guest') {
      query = query.eq('sales_name', user.full_name);
    }

    const { data } = await query;
    if (data) setReviews(data as ReviewRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setIsGuest(user.role === 'guest');
      fetchReviews(user);
    } else {
      navigate('/reminder-schedule');
    }
  }, [navigate, fetchReviews]);

  const filteredReviews = reviews.filter(r => 
    r.project_name.toLowerCase().includes(search.toLowerCase()) ||
    r.sales_name.toLowerCase().includes(search.toLowerCase()) ||
    r.assign_name.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    demo: reviews.filter(r => r.reminder_category === 'Demo Product').length,
    training: reviews.filter(r => r.reminder_category === 'Training' || r.reminder_category === 'Konfigurasi & Training').length,
  };

  const chartData = {
    category: Array.from(new Set(reviews.map(r => r.reminder_category))).map((cat, i) => ({
      label: cat as string,
      value: reviews.filter(r => r.reminder_category === cat).length,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })),
    handler: Array.from(new Set(reviews.map(r => r.assign_name))).map((name, i) => ({
      label: name as string,
      value: reviews.filter(r => r.assign_name === name).length,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })),
    product: Array.from(new Set(reviews.map(r => r.product))).filter(Boolean).slice(0, 8).map((prod, i) => ({
      label: prod as string,
      value: reviews.filter(r => r.product === prod).length,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      {/* Header (Same as Master Reminder Schedule style) */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b-2 border-red-600 px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">⭐</div>
            <div>
              <h1 className="text-lg font-black text-slate-800 tracking-tight">Review Platform</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">PTS IVP Feedback Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/reminder-schedule')} className="px-4 py-2 border-2 border-slate-200 rounded-xl font-bold text-sm hover:border-red-600 hover:text-red-600 transition-all">🗓️ Schedule Platform</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 space-y-6">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between overflow-hidden relative group">
              <div className="absolute right-0 top-0 w-32 h-full bg-indigo-50/50 -skew-x-12 translate-x-10 transition-transform group-hover:translate-x-4" />
              <div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total Demo Product</p>
                 <h2 className="text-5xl font-black text-indigo-600">{stats.demo}</h2>
              </div>
              <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 relative z-10"><Box size={32} /></div>
           </div>
           <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm flex items-center justify-between overflow-hidden relative group">
              <div className="absolute right-0 top-0 w-32 h-full bg-emerald-50/50 -skew-x-12 translate-x-10 transition-transform group-hover:translate-x-4" />
              <div>
                 <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1 leading-none">Total Training Report</p>
                 <h2 className="text-5xl font-black text-emerald-600">{stats.training}</h2>
              </div>
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 relative z-10"><ClipboardList size={32} /></div>
           </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <MiniPieChart data={chartData.category} title="Kategori Kegiatan" icon={<TrendingUp size={14} className="text-slate-400" />} />
           <MiniPieChart data={chartData.handler} title="Handler Team PTS" icon={<Users size={14} className="text-slate-400" />} />
           <MiniPieChart data={chartData.product} title="Unit / Product" icon={<Box size={14} className="text-slate-400" />} />
        </div>

        {/* List Section */}
        <div className="space-y-4">
           <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                 <LayoutDashboard size={20} className="text-red-600" />
                 <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">Feedback Feed</h2>
              </div>
              <div className="flex-1 max-w-md relative">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                    type="text" 
                    placeholder="Search review by project or sales..." 
                    className="w-full bg-white border-2 border-slate-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-red-600 focus:ring-4 focus:ring-red-50 outline-none transition-all"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                 />
              </div>
           </div>

           {loading ? (
             <div className="py-20 flex justify-center"><div className="w-10 h-10 border-4 border-slate-200 border-t-red-600 rounded-full animate-spin" /></div>
           ) : filteredReviews.length === 0 ? (
             <div className="bg-white rounded-[40px] p-20 border-2 border-dashed border-slate-200 flex flex-col items-center gap-4 text-slate-400">
                <ClipboardList size={64} className="opacity-20" />
                <p className="font-black text-sm uppercase tracking-widest">No matching reviews found</p>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                   {filteredReviews.map((r) => (
                     <motion.div 
                        key={r.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setSelectedReview(r)}
                        className="bg-white rounded-[32px] p-6 border-2 border-slate-50 shadow-sm hover:shadow-xl hover:border-red-100 transition-all cursor-pointer group flex flex-col h-full"
                     >
                        <div className="flex justify-between items-start mb-4">
                           <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">{r.reminder_category}</div>
                           <div className="p-2 rounded-xl bg-slate-50 text-slate-300 group-hover:bg-red-600 group-hover:text-white transition-all"><ArrowUpRight size={16} /></div>
                        </div>
                        <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-red-700 transition-colors uppercase">{r.project_name}</h3>
                        <div className="flex items-center gap-2 mb-4">
                           <StarRating value={r.grade_product_knowledge} readOnly size="sm" />
                           <span className="text-[10px] font-black text-slate-400">{r.grade_product_knowledge}/5</span>
                        </div>
                        <div className="mt-auto pt-4 border-t border-slate-50 space-y-3">
                           <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center font-black text-xs">{r.sales_name.charAt(0)}</div>
                              <div className="min-w-0">
                                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sales Advisor</p>
                                 <p className="text-xs font-bold text-slate-700 truncate">{r.sales_name}</p>
                              </div>
                           </div>
                           <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                              <div className="flex items-center gap-1.5"><Users size={12} className="text-slate-300" /> Handler: {r.assign_name}</div>
                              <span>{new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                           </div>
                        </div>
                     </motion.div>
                   ))}
                </AnimatePresence>
             </div>
           )}
        </div>
      </main>

      <AnimatePresence>
        {selectedReview && <ReviewDetailModal record={selectedReview} onClose={() => setSelectedReview(null)} />}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
      `}</style>
    </div>
  );
}
