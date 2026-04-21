'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
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

// --- Types ---
type ReviewCategory = 'Demo Product' | 'BAST';

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
  guest_id?: string;
}

const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#0ea5e9', '#ec4899', '#8b5cf6'];

// --- Components ---

function MiniPieChart({ data, title, icon: Icon }: { data: { label: string; value: number; color: string }[], title: string, icon: any }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const cx = 50, cy = 50, r = 40, ir = 24;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle), y1 = cy + r * Math.sin(cumAngle);
    const x2 = cx + r * Math.cos(cumAngle + angle), y2 = cy + r * Math.sin(cumAngle + angle);
    const xi1 = cx + ir * Math.cos(cumAngle), yi1 = cy + ir * Math.sin(cumAngle);
    const xi2 = cx + ir * Math.cos(cumAngle + angle), yi2 = cy + ir * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${ir} ${ir} 0 ${large} 0 ${xi1} ${yi1} Z`;
    cumAngle += angle;
    return { ...d, path, i };
  });

  return (
    <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm flex flex-col h-full hover:border-red-100 transition-all">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-red-50 group-hover:text-red-600 transition-all">
          <Icon size={18} />
        </div>
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest leading-none">{title}</h3>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative">
            <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0">
            {slices.map((s) => (
                <path key={s.i} d={s.path} fill={s.color} className="hover:opacity-80 transition-opacity" />
            ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-slate-800 leading-none">{total}</span>
                <span className="text-[7px] font-bold text-slate-400 mt-0.5">TOTAL</span>
            </div>
        </div>
        <div className="flex flex-col gap-2 overflow-y-auto max-h-[100px] flex-1">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} className="flex items-center gap-2 group">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[10px] font-bold text-slate-500 truncate max-w-[90px]">{d.label}</span>
              <span className="text-[10px] font-black text-slate-800 ml-auto">{d.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function FormReview() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    const savedUser = localStorage.getItem('currentUser');
    const user = savedUser ? JSON.parse(savedUser) : null;
    setCurrentUser(user);

    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    
    if (user?.role === 'guest') {
      query = query.eq('guest_id', user.id);
    }

    const { data } = await query;
    if (data) setReviews(data as ReviewRecord[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Points 2: Totals for dashboard
  const demoCount = reviews.filter(r => r.reminder_category === 'Demo Product').length;
  const trainingCount = reviews.filter(r => ['Training', 'Konfigurasi & Training'].includes(r.reminder_category)).length;

  const filteredReviews = reviews.filter(r => 
    r.project_name.toLowerCase().includes(search.toLowerCase()) ||
    r.product.toLowerCase().includes(search.toLowerCase()) ||
    r.assign_name.toLowerCase().includes(search.toLowerCase())
  );

  const generateChartData = (field: keyof ReviewRecord) => {
    const counts = reviews.reduce((acc: any, r) => {
        const val = r[field] as string || 'Unknown';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});
    
    return Object.entries(counts)
        .sort((a: any, b: any) => b[1] - a[1])
        .map(([label, value], i) => ({ label, value: value as number, color: PIE_COLORS[i % PIE_COLORS.length] }));
  };

  const categoryData = generateChartData('reminder_category');
  const handlerData = generateChartData('assign_name');
  const productData = generateChartData('product');

  return (
    <div className="min-h-screen bg-[#fcfdff] pb-24 font-sans">
      {/* Search Header (Reminder Schedule Style) */}
      <div className="bg-white border-b-2 border-red-600 sticky top-0 z-40 backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-red-100">
               <Star size={24} fill="currentColor" />
            </div>
            <div>
              <h1 className="font-black text-slate-900 text-xl tracking-tight leading-none">Review Dashboard</h1>
              <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mt-1.5 leading-none">PTS IVP Feedback Engine</p>
            </div>
          </div>

          <div className="flex-1 max-w-xl hidden md:block relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Search by project, product, or handler..." 
              className="w-full bg-slate-100 border-none py-3.5 pl-12 pr-4 rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-red-100 transition-all font-bold text-slate-700 placeholder-slate-400"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={() => { window.location.href = '/reminder-schedule'; }}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 border-2 border-slate-100 hover:border-red-200 hover:text-red-600 transition-all bg-white shadow-sm"
             >
                <ClipboardList size={18} />
                Schedule Platform
             </button>
             <button 
               onClick={() => setShowNotifications(!showNotifications)}
               className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-500 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all relative group"
             >
               <Bell size={24} className="group-active:scale-90 transition-transform" />
               {filteredReviews.length > 0 && (
                 <span className="absolute top-3 right-3 w-3 h-3 bg-red-600 border-2 border-white rounded-full animate-pulse" />
               )}
             </button>
             <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-lg overflow-hidden group hover:scale-105 transition-all cursor-pointer">
                <Users size={22} className="group-hover:rotate-12 transition-transform" />
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Points 2: Dashboard Overview Cards & Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-16">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-red-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-red-200 relative overflow-hidden group cursor-default">
              <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                <LayoutDashboard size={160} />
              </div>
              <p className="text-red-100 text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Demo Series Reviews</p>
              <h2 className="text-5xl font-black mb-6 tracking-tight">{demoCount}</h2>
              <div className="flex items-center gap-2 bg-white/10 w-fit px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/20">
                <TrendingUp size={14} />
                <span>Growth active</span>
              </div>
            </div>
            <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 relative overflow-hidden group cursor-default">
              <div className="absolute -right-8 -bottom-8 opacity-10 group-hover:rotate-12 transition-transform duration-700 pointer-events-none">
                <ClipboardList size={160} />
              </div>
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2 opacity-80">Training Series Reviews</p>
              <h2 className="text-5xl font-black mb-6 tracking-tight">{trainingCount}</h2>
              <div className="flex items-center gap-2 bg-white/5 w-fit px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md border border-white/10">
                <TrendingUp size={14} />
                <span>Steady impact</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <MiniPieChart data={categoryData} title="Kategori Kegiatan" icon={PieIcon} />
          </div>
          <div className="lg:col-span-3">
            <MiniPieChart data={handlerData} title="Pelaksana Team PTS" icon={Users} />
          </div>
          <div className="lg:col-span-3">
            <MiniPieChart data={productData} title="Product Coverage" icon={Box} />
          </div>
        </div>

        {/* Action Header List Area */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-slate-900 font-black text-2xl tracking-tight flex items-center gap-3">
               Review Submissions
               <span className="bg-red-50 text-red-600 px-3 py-1 rounded-2xl text-xs font-black uppercase tracking-wider border border-red-100">
                 {filteredReviews.length} records
               </span>
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Showing latest activity from guests</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-white border-2 border-slate-100 px-5 py-2.5 rounded-2xl text-xs font-black text-slate-600 hover:border-red-200 hover:text-red-600 transition-all shadow-sm">
               <Filter size={16} />
               Filter View
            </button>
            <button className="w-12 h-12 bg-white border-2 border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-200 transition-all shadow-sm">
              <MoreVertical size={20} />
            </button>
          </div>
        </div>

        {/* Display List (Reminder Schedule Style Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {loading ? (
                [...Array(6)].map((_, i) => (
                    <div key={i} className="bg-slate-100/50 h-80 rounded-[2.5rem] animate-pulse border-2 border-slate-50" />
                ))
            ) : filteredReviews.map((r, i) => (
              <motion.div 
                layout
                key={r.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="bg-white rounded-[2.5rem] border-2 border-slate-100 p-8 shadow-sm hover:shadow-2xl hover:border-red-100 hover:-translate-y-2 transition-all duration-500 group"
              >
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-50 rounded-[1.25rem] flex items-center justify-center text-2xl group-hover:bg-red-600 group-hover:scale-110 transition-all duration-500 shadow-sm border border-slate-100">
                      {r.reminder_category === 'Demo Product' ? '🖥️' : '🎓'}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{r.reminder_category}</h4>
                      <p className="text-[10px] font-black text-red-600 mt-2 leading-none uppercase">{new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="bg-amber-50 px-3 py-1.5 rounded-2xl text-amber-600 shadow-sm border border-amber-100 flex items-center gap-2 group-hover:scale-110 transition-transform">
                    <Star size={14} fill="currentColor" />
                    <span className="text-sm font-black">{r.grade_product_knowledge}</span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-black text-slate-900 text-xl leading-tight mb-2 group-hover:text-red-700 transition-colors line-clamp-2 min-h-[3rem]">{r.project_name}</h3>
                    <div className="flex items-center gap-2 text-slate-400 mt-4">
                      <Box size={16} />
                      <span className="text-xs font-black uppercase tracking-wider truncate border-b-2 border-slate-50 pb-1">{r.product || 'No product listed'}</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100 group-hover:bg-red-50/30 group-hover:border-red-100 transition-all">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                      <span>Execution Agent</span>
                      <span className="text-slate-800">{r.assign_name}</span>
                    </div>
                    <div className="h-px bg-slate-200/50 mb-3" />
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Guest Comment</span>
                       <p className="text-xs font-bold text-slate-700 italic leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                         "{r.catatan_product_knowledge || 'Everything was excellent, exactly as planned.'}"
                       </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4">
                    <div className="flex -space-x-3">
                       {[...Array(4)].map((_, i) => (
                         <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[9px] font-black text-slate-600 shadow-sm">
                           {String.fromCharCode(65 + i)}
                         </div>
                       ))}
                    </div>
                    <button className="bg-slate-900 text-white w-10 h-10 rounded-2xl flex items-center justify-center hover:bg-red-600 hover:rotate-12 transition-all shadow-lg hover:shadow-red-200">
                       <ArrowUpRight size={20} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {!loading && filteredReviews.length === 0 && (
          <div className="flex flex-col items-center justify-center py-40 text-slate-400">
            <LayoutDashboard size={80} className="mb-6 opacity-10 animate-pulse" />
            <p className="font-black text-2xl tracking-tight text-slate-800">No Signal Found</p>
            <p className="text-sm font-bold uppercase tracking-widest mt-2 opacity-60">Adjust filters to find more records</p>
          </div>
        )}
      </div>

      {/* Point 2: Notification Sidebar / Popup */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ x: 400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 400, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-6 top-6 bottom-6 w-[440px] bg-white z-[100] shadow-[0_32px_80px_rgba(0,0,0,0.25)] rounded-[3.5rem] border-4 border-slate-50 flex flex-col overflow-hidden"
            >
              <div className="p-10 bg-red-600 text-white relative overflow-hidden">
                <div className="absolute -right-10 -top-10 opacity-10 rotate-12 pointer-events-none">
                    <Bell size={240} />
                </div>
                <div className="flex justify-between items-center mb-10 relative z-10">
                  <h3 className="text-2xl font-black tracking-tight">Review Pulse</h3>
                  <button onClick={() => setShowNotifications(false)} className="bg-white/20 hover:bg-white/40 p-3 rounded-[1.25rem] transition-all"><X size={24} /></button>
                </div>
                <div className="flex items-center gap-6 mt-8 relative z-10">
                   <div className="flex flex-col">
                     <span className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-2">Active Signals</span>
                     <p className="text-6xl font-black tracking-tighter decoration-8 underline decoration-white/20 underline-offset-[-2px]">{reviews.length}</p>
                   </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-4 no-scrollbar">
                {reviews.slice(0, 12).map((r, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={i} 
                    className="flex gap-5 p-5 rounded-[2rem] border-2 border-slate-50 hover:border-red-100 hover:bg-red-50/30 transition-all cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl font-bold shadow-sm group-hover:bg-white group-hover:scale-110 transition-all duration-300">
                      {r.reminder_category === 'Demo Product' ? '🖥️' : '🎓'}
                    </div>
                    <div className="min-w-0 pr-2">
                      <p className="text-[10px] font-black uppercase text-red-600 tracking-widest mb-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-red-600 rounded-full animate-ping" />
                        Live Feed
                      </p>
                      <p className="text-sm font-black text-slate-800 truncate leading-tight mb-1">{r.project_name}</p>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{new Date(r.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {r.product}</p>
                    </div>
                    <div className="ml-auto flex items-center">
                        <ChevronRight size={16} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="p-8 bg-slate-50 border-t border-slate-100">
                <button 
                  onClick={() => setShowNotifications(false)}
                  className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-all shadow-xl shadow-slate-200"
                >
                  Dimiss Activity View
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
