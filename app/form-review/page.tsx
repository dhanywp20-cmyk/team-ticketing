'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/src/lib/supabase';
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

interface TeamUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  team_type?: string;
}

const PIE_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#6366f1', '#0ea5e9', '#ec4899', '#8b5cf6'];

// --- Components ---

function MiniPieChart({ data, title, icon, activeFilter, onSliceClick }: { 
  data: { label: string; value: number; color: string }[]; 
  title: string; 
  icon: React.ReactNode; 
  activeFilter?: string | null; 
  onSliceClick?: (label: string) => void; 
}) {
  const [hov, setHov] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumAngle = -Math.PI / 2;
  const cx = 50, cy = 50, r = 40, ir = 22;

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
    <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <div className="text-red-500">{icon}</div>
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="flex items-center gap-4">
        <svg width="100" height="100" viewBox="0 0 100 100" className="flex-shrink-0 overflow-visible">
          {slices.map((s) => (
            <path key={s.i} d={s.path} fill={s.color}
              opacity={hov === null || hov === s.i ? 1 : 0.4}
              style={{ cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', filter: hov === s.i ? `drop-shadow(0 4px 12px ${s.color}66)` : 'none', transform: hov === s.i ? 'scale(1.05)' : 'scale(1)', transformOrigin: '50px 50px' }}
              onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)} onClick={() => onSliceClick && onSliceClick(s.label)} />
          ))}
          <text x="50" y="48" textAnchor="middle" fontSize="12" fontWeight="900" fill="#1e293b">{total}</text>
          <text x="50" y="58" textAnchor="middle" fontSize="6" fill="#94a3b8" fontWeight="700">TOTAL</text>
        </svg>
        <div className="flex flex-col gap-2 flex-1 min-w-0 max-h-[100px] overflow-y-auto">
          {slices.slice(0, 5).map((s) => (
            <div key={s.i} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              <span className="text-[10px] font-bold text-slate-600 truncate flex-1">{s.label}</span>
              <span className="text-[10px] font-black text-slate-800">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const StarRating = ({ rating }: { rating: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star key={s} size={14} className={s <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200'} />
    ))}
  </div>
);

// --- Page Component ---

export default function FormReview() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<TeamUser | null>(null);
  const [search, setSearch] = useState('');
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      fetchReviews(user);
    } else {
      navigate('/reminder-schedule');
    }
  }, [navigate]);

  const fetchReviews = async (user: TeamUser) => {
    setLoading(true);
    let query = supabase.from('form_reviews').select('*').order('created_at', { ascending: false });
    
    // IF role is guest, only show assigned to them
    if (user.role === 'guest') {
      query = query.eq('guest_id', user.id);
    }

    const { data } = await query;
    if (data) setReviews(data);
    setLoading(false);
  };

  const dashboardStats = {
    demoProduct: reviews.filter(r => r.reminder_category === 'Demo Product').length,
    training: reviews.filter(r => r.reminder_category === 'Training' || r.reminder_category === 'Konfigurasi & Training').length,
  };

  const chartData = {
    category: Array.from(new Set(reviews.map(r => r.review_category))).map((cat, i) => ({
      label: cat as string,
      value: reviews.filter(r => r.review_category === cat).length,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })),
    handler: Array.from(new Set(reviews.map(r => r.assign_name))).map((name, i) => ({
      label: name as string,
      value: reviews.filter(r => r.assign_name === name).length,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })),
    product: Array.from(new Set(reviews.map(r => r.product))).filter(Boolean).slice(0, 7).map((prod, i) => ({
      label: prod as string,
      value: reviews.filter(r => r.product === prod).length,
      color: PIE_COLORS[i % PIE_COLORS.length]
    })),
  };

  const filteredReviews = reviews.filter(r => 
    r.project_name.toLowerCase().includes(search.toLowerCase()) ||
    r.sales_name.toLowerCase().includes(search.toLowerCase()) ||
    r.product?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b-2 border-red-600 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shadow-xl shadow-red-200">
               <Star size={24} className="fill-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800">Form Review Platform</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dashboard & Feedback Analysis</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <button 
                onClick={() => navigate('/reminder-schedule')}
                className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 border-2 border-slate-100 hover:border-red-200 hover:text-red-600 transition-all bg-white shadow-sm"
             >
                <ClipboardList size={18} />
                Schedule Platform
             </button>
             <button 
                onClick={() => setShowNotifications(true)}
                className="relative p-2.5 rounded-xl bg-white border-2 border-slate-100 hover:border-red-500 transition-all shadow-sm group"
             >
                <Bell size={20} className="text-slate-600 group-hover:text-red-600" />
                {reviews.length > 0 && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-red-600 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black text-white">
                    {reviews.length}
                  </span>
                )}
             </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-6 text-white shadow-xl shadow-red-100 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                 <Box size={120} />
              </div>
              <div className="relative">
                 <p className="text-[10px] font-black text-red-100 uppercase tracking-widest mb-1 opacity-80">Demo Product</p>
                 <h2 className="text-4xl font-black">{dashboardStats.demoProduct}</h2>
                 <p className="text-xs font-bold text-red-100 mt-2">Total feedback reports</p>
              </div>
           </div>
           
           <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-slate-200 relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                 <Users size={120} />
              </div>
              <div className="relative">
                 <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1 opacity-80">Training Sessions</p>
                 <h2 className="text-4xl font-black">{dashboardStats.training}</h2>
                 <p className="text-xs font-bold text-slate-400 mt-2">Completed & BAST</p>
              </div>
           </div>

           <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
              <MiniPieChart data={chartData.category} title="Category" icon={<Filter size={14} />} />
              <MiniPieChart data={chartData.handler} title="Handler" icon={<Users size={14} />} />
              <MiniPieChart data={chartData.product} title="Product" icon={<Box size={14} />} />
           </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="relative w-full md:w-96 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-red-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search project, sales, or product..." 
                className="w-full bg-white border-2 border-slate-100 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold shadow-sm focus:border-red-500 focus:outline-none transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
           </div>
           
           <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border-2 border-slate-100 shadow-sm">
              <button onClick={() => fetchReviews(currentUser!)} className="p-2 rounded-xl hover:bg-slate-50 transition-colors text-slate-500">
                <BarChart2 size={18} />
              </button>
              <div className="w-[2px] h-6 bg-slate-100" />
              <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">{filteredReviews.length} results</p>
           </div>
        </div>

        {/* List Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-200 rounded-3xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((review) => (
              <div 
                key={review.id}
                className="bg-white rounded-[32px] p-6 border-2 border-slate-100 shadow-sm hover:shadow-xl hover:border-red-100 transition-all cursor-pointer group flex flex-col h-full"
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="px-3 py-1 bg-red-50 rounded-full text-[10px] font-black text-red-600 uppercase tracking-widest">
                     {review.review_category}
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 text-slate-400 group-hover:bg-red-600 group-hover:text-white transition-all">
                     <ArrowUpRight size={16} />
                  </div>
                </div>

                <h3 className="text-lg font-black text-slate-800 leading-tight mb-2 group-hover:text-red-700 transition-colors">
                  {review.project_name}
                </h3>
                <div className="flex items-center gap-2 mb-4">
                   <StarRating rating={review.grade_product_knowledge} />
                   <span className="text-[11px] font-bold text-slate-400">{review.grade_product_knowledge}/5</span>
                </div>

                <div className="mt-auto space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                     <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-red-600 font-black text-xs">
                        {review.sales_name.charAt(0)}
                     </div>
                     <div className="min-w-0">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sales Advisor</p>
                        <p className="text-xs font-bold text-slate-700 truncate">{review.sales_name}</p>
                     </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                     <div className="flex items-center gap-1.5">
                        <Users size={12} className="text-slate-300" />
                        <span>By {review.assign_name}</span>
                     </div>
                     <div className="flex items-center gap-1.5">
                        <ClipboardList size={12} className="text-slate-300" />
                        <span>{new Date(review.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                     </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Detail Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setSelectedReview(null)} />
          <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden">
            <div className="bg-red-600 p-8 text-white">
               <div className="flex justify-between items-start mb-6">
                  <div className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest text-white backdrop-blur-md border border-white/30">
                     Review Details
                  </div>
                  <button onClick={() => setSelectedReview(null)} className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                     <X size={20} />
                  </button>
               </div>
               <h2 className="text-3xl font-black mb-2">{selectedReview.project_name}</h2>
               <p className="text-red-100/70 font-bold text-sm flex items-center gap-2">
                  <Box size={16} /> {selectedReview.product || 'Standard Product'}
               </p>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Product Knowledge Grade</p>
                        <div className="flex items-center gap-3">
                           <StarRating rating={selectedReview.grade_product_knowledge} />
                           <span className="text-xl font-black text-slate-800">{selectedReview.grade_product_knowledge}</span>
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Training Grade</p>
                        <div className="flex items-center gap-3">
                           <StarRating rating={selectedReview.grade_training_customer || 0} />
                           <span className="text-xl font-black text-slate-800">{selectedReview.grade_training_customer || 0}</span>
                        </div>
                     </div>
                  </div>
                  
                  <div className="space-y-4">
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Sales Advisor</p>
                        <p className="font-bold text-slate-700">{selectedReview.sales_name}</p>
                     </div>
                     <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Handler Team</p>
                        <p className="font-bold text-slate-700">{selectedReview.assign_name}</p>
                     </div>
                  </div>
               </div>

               <div className="space-y-4">
                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ClipboardList size={14} /> Documentation Photo
                     </p>
                     {selectedReview.foto_dokumentasi_url ? (
                       <img src={selectedReview.foto_dokumentasi_url} className="w-full h-48 object-cover rounded-2xl shadow-md" alt="Docs" />
                     ) : (
                       <div className="w-full h-48 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 font-bold text-sm italic">
                          No documentation image
                       </div>
                     )}
                  </div>

                  <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Customer Feedback / Catatan</p>
                     <p className="text-sm font-bold text-slate-600 leading-relaxed italic">
                        "{selectedReview.catatan_product_knowledge || 'No specific comments provided'}"
                     </p>
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50 flex justify-end">
                 <button className="bg-red-600 text-white px-8 py-3 rounded-2xl font-black shadow-lg shadow-red-100 hover:scale-105 transition-all">
                    Generate Report
                 </button>
              </div>
          </div>
        </div>
      )}

      {/* Notifications Side Drawer */}
      {showNotifications && (
        <div className="fixed inset-0 z-[200] overflow-hidden">
           <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
           <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-white shadow-2xl border-l border-slate-100 flex flex-col transition-transform duration-300 transform translate-x-0">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-red-600 text-white">
                 <div className="flex items-center gap-3">
                    <Bell size={24} />
                    <h3 className="text-lg font-black uppercase tracking-widest">Feedback Alerts</h3>
                 </div>
                 <button onClick={() => setShowNotifications(false)} className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center hover:bg-white/30">
                    <X size={18} />
                 </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                 {reviews.length === 0 ? (
                   <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50">
                      <TrendingUp size={48} className="mb-4" />
                      <p className="font-black text-sm uppercase tracking-widest">No Alerts Yet</p>
                   </div>
                 ) : reviews.slice(0, 10).map((rev) => (
                   <div key={rev.id} className="p-4 rounded-2xl border-2 border-slate-50 hover:border-red-100 transition-all cursor-pointer group" onClick={() => { setSelectedReview(rev); setShowNotifications(false); }}>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 group-hover:text-red-500 transition-colors">New Feedback</p>
                      <p className="text-sm font-black text-slate-800 leading-tight mb-2 truncate">{rev.project_name}</p>
                      <div className="flex items-center justify-between">
                         <StarRating rating={rev.grade_product_knowledge} />
                         <p className="text-[9px] font-bold text-slate-400">{new Date(rev.created_at).toLocaleDateString()}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="p-4 border-t border-slate-100">
                 <button onClick={() => setShowNotifications(false)} className="w-full bg-slate-900 text-white py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-slate-200">
                    Close Alerts
                 </button>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f8fafc; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
