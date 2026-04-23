'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ReviewCategory = 'Demo Product' | 'BAST';

interface ReviewForm {
  id: string;
  reminder_id: string;
  project_name: string;
  address: string;
  sales_name: string;
  sales_division: string;
  assign_name: string;
  assigned_to: string;
  reminder_category: string;
  review_category: ReviewCategory;
  // Demo Product fields
  product_demo?: string;
  grade_product_knowledge?: number;
  catatan_grade_product_knowledge?: string;
  // BAST fields
  product_bast?: string;
  grade_training_customer?: number;
  catatan_grade_training_customer?: string;
  grade_product_knowledge_bast?: number;
  catatan_grade_product_knowledge_bast?: string;
  // Shared
  foto_dokumentasi_url?: string;
  product?: string; // field product dari Reminder Schedule (pre-fill)
  // Meta
  guest_username: string;
  created_at: string;
  updated_at?: string;
}

interface Reminder {
  id: string;
  project_name: string;
  address: string;
  sales_name: string;
  sales_division: string;
  assign_name: string;
  assigned_to: string;
  category: string;
  status: string;
  due_date: string;
  due_time?: string;
}

interface GuestUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  team_type?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = ['#7c3aed','#0ea5e9','#10b981','#e11d48','#f59e0b','#6366f1','#14b8a6','#f97316','#8b5cf6','#06b6d4','#ec4899','#84cc16'];

const REVIEW_TRIGGER_CATEGORIES = ['Demo Product', 'Konfigurasi & Training', 'Training'];

function getCategoryType(reminderCategory: string): ReviewCategory {
  if (reminderCategory === 'Demo Product') return 'Demo Product';
  return 'BAST';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDatetime(dt: string) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

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

function StarRating({ value, onChange, disabled }: { value: number; onChange?: (v: number) => void; disabled?: boolean }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1,2,3,4,5].map(star => (
        <button
          key={star}
          type="button"
          disabled={disabled}
          onClick={() => onChange && onChange(star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-all"
          style={{ fontSize: '1.6rem', cursor: disabled ? 'default' : 'pointer' }}
        >
          <span style={{ color: star <= (hovered || value) ? '#f59e0b' : '#d1d5db' }}>★</span>
        </button>
      ))}
      {value > 0 && <span className="ml-1 text-sm font-bold text-amber-600">{value}/5</span>}
    </div>
  );
}

// ─── Mini Pie Chart ────────────────────────────────────────────────────────────

function MiniPieChart({
  data, title, icon, activeFilter, onSliceClick,
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
      <p className="text-gray-400 text-sm text-center py-4">Belum ada data</p>
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
                <circle cx={60} cy={60} r={50} fill={s.color} opacity={hov === s.i || activeFilter === s.label ? 1 : 0.82} />
                <circle cx={60} cy={60} r={28} fill="white" />
              </g>
            ) : (
              <g key={s.i} style={{ cursor: onSliceClick ? 'pointer' : 'default' }}
                onClick={() => onSliceClick && onSliceClick(s.label)}
                onMouseEnter={() => setHov(s.i)} onMouseLeave={() => setHov(null)}
                transform={hov === s.i || activeFilter === s.label ? `translate(${Math.cos(cumAngle - (s.value/total)*Math.PI)*3}, ${Math.sin(cumAngle - (s.value/total)*Math.PI)*3})` : ''}>
                <path d={s.path} fill={s.color} opacity={hov === s.i || activeFilter === s.label ? 1 : 0.82} />
              </g>
            )
          ))}
          <text x="60" y="64" textAnchor="middle" fontSize="16" fontWeight="bold" fill="#374151">{total}</text>
        </svg>
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          {data.slice(0, 5).map((d, i) => (
            <div key={i} onClick={() => onSliceClick && onSliceClick(d.label)}
              className="flex items-center gap-2 cursor-pointer group"
              style={{ opacity: activeFilter && activeFilter !== d.label ? 0.45 : 1 }}>
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              <span className="text-[10px] text-gray-600 truncate group-hover:text-gray-900 transition-colors leading-tight">{d.label}</span>
              <span className="ml-auto text-[10px] font-bold text-gray-700 flex-shrink-0">{d.value}</span>
            </div>
          ))}
          {data.length > 5 && <p className="text-[9px] text-gray-400">+{data.length - 5} lainnya</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Loading Screen ────────────────────────────────────────────────────────────

function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999]"
      style={{ backgroundImage: `url('/IVP_Background.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.25)' }} />
      <div className="relative z-10 flex flex-col items-center gap-3 px-10 py-8 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.92)', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <svg className="w-12 h-12 animate-spin" viewBox="0 0 50 50" fill="none">
          <circle cx="25" cy="25" r="20" stroke="#f1f1f1" strokeWidth="5" />
          <path d="M25 5 A20 20 0 0 1 45 25" stroke="#7c3aed" strokeWidth="5" strokeLinecap="round" />
        </svg>
        <p className="text-gray-700 font-semibold text-sm tracking-wide">{message}</p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function FormReviewPage() {
  const router = useRouter();

  // Auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<GuestUser | null>(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [dashLoading, setDashLoading] = useState(false);
  const [appReady, setAppReady] = useState(false);
  const [loadingBar, setLoadingBar] = useState(0); // 0-100 progress bar
  const [loadingMessage, setLoadingMessage] = useState('Loading...');

  // Data
  const [reviews, setReviews] = useState<ReviewForm[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Notifications
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showBellPopup, setShowBellPopup] = useState(false);
  const [myPendingReviews, setMyPendingReviews] = useState<ReviewForm[]>([]);

  // Filters
  const [filterCategory, setFilterCategory] = useState<'all' | 'Demo Product' | 'BAST'>('all');
  const [searchProject, setSearchProject] = useState('');
  const [searchHandler, setSearchHandler] = useState('');
  const [filterReviewCat, setFilterReviewCat] = useState<'all' | 'Demo Product' | 'BAST'>('all');
  const [handlerFilter, setHandlerFilter] = useState<string | null>(null);
  const [productFilterChart, setProductFilterChart] = useState<string | null>(null);

  // Switch tabs
  const [switchTab, setSwitchTab] = useState<'Demo Product' | 'BAST'>('Demo Product');

  // Modals
  const [detailReview, setDetailReview] = useState<ReviewForm | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewForm | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ReviewForm | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Review form data
  const emptyReviewForm = {
    product_demo: '', grade_product_knowledge: 0, catatan_grade_product_knowledge: '',
    product_bast: '', grade_training_customer: 0, catatan_grade_training_customer: '',
    grade_product_knowledge_bast: 0, catatan_grade_product_knowledge_bast: '',
    foto_dokumentasi_url: '',
  };
  const [reviewFormData, setReviewFormData] = useState(emptyReviewForm);
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  // Toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const rfd = (patch: Partial<typeof emptyReviewForm>) =>
    setReviewFormData(prev => ({ ...prev, ...patch }));

  const isAdmin = currentUser?.role === 'admin';
  const isGuest = currentUser?.role === 'guest';
  const isTeam = currentUser?.role === 'team';

  // ─── Init ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    const user = saved ? (JSON.parse(saved) as GuestUser) : null;
    if (user) {
      setCurrentUser(user);
      setIsLoggedIn(true);
    }

    // Set pesan loading sesuai role
    if (user?.role === 'guest') setLoadingMessage('Memuat form review Anda...');
    else if (user?.role === 'team') setLoadingMessage('Memuat jadwal review tim...');
    else if (user?.role === 'admin') setLoadingMessage('Memuat semua data review...');
    else setLoadingMessage('Loading Form Review...');

    // Loading bar animasi
    setLoadingBar(20);
    const t1 = setTimeout(() => setLoadingBar(60), 200);
    const t2 = setTimeout(() => setLoadingBar(85), 500);

    fetchReviewsQuiet(user).then(() => {
      setLoadingBar(100);
      setTimeout(() => { setLoadingBar(0); setAppReady(true); }, 300);
    });

    // Realtime subscription
    const ch = supabase.channel('form-reviews-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'form_reviews' }, () => {
        const s = localStorage.getItem('currentUser');
        const u = s ? (JSON.parse(s) as GuestUser) : user;
        fetchReviewsQuiet(u);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Session timeout
  useEffect(() => {
    const check = () => {
      const savedTime = localStorage.getItem('loginTime');
      if (!savedTime) return;
      if (Date.now() - parseInt(savedTime) > 6 * 60 * 60 * 1000) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        const target = window.top !== window ? window.top : window;
        if (target) target.location.href = '/dashboard';
      }
    };
    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, []);

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchReviewsQuiet = async (user?: GuestUser | null) => {
    let activeUser: GuestUser | null = user ?? currentUser;
    if (!activeUser) {
      const saved = localStorage.getItem('currentUser');
      if (saved) { try { activeUser = JSON.parse(saved) as GuestUser; } catch {} }
    }

    let query = supabase.from('form_reviews').select('*').order('created_at', { ascending: false });

    // Guest hanya melihat data milik mereka (OR filter untuk kompatibilitas data lama)
    if (activeUser?.role === 'guest') {
      query = query.or(
        `guest_username.eq.${activeUser.username},sales_name.eq.${activeUser.full_name}`
      );
    }
    // Team: hanya lihat form review yang di-handle oleh mereka (assigned_to = username)
    else if (activeUser?.role === 'team') {
      query = query.eq('assigned_to', activeUser.username);
    }
    // Admin: lihat semua

    const { data, error } = await query;
    if (!error && data) {
      setReviews(data as ReviewForm[]);

      // ── Notif untuk Guest: pending review yang belum diisi
      if (activeUser?.role === 'guest') {
        const pending = (data as ReviewForm[]).filter(r => !r.grade_product_knowledge && !r.grade_product_knowledge_bast);
        setMyPendingReviews(pending);
        if (pending.length > 0) setTimeout(() => setShowNotificationPopup(true), 800);
      }

      // ── Notif untuk Team: form review milik mereka yang BELUM diisi guest
      if (activeUser?.role === 'team') {
        const pendingByGuest = (data as ReviewForm[]).filter(r =>
          !r.grade_product_knowledge && !r.grade_product_knowledge_bast
        );
        setMyPendingReviews(pendingByGuest);
        if (pendingByGuest.length > 0) setTimeout(() => setShowNotificationPopup(true), 800);
      }
    }
  };

  const fetchReviews = async () => {
    setListLoading(true);
    setLoadingBar(30);
    setTimeout(() => setLoadingBar(70), 200);
    await fetchReviewsQuiet();
    setLoadingBar(100);
    setTimeout(() => { setLoadingBar(0); setListLoading(false); }, 300);
  };

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  const handleSaveReview = async () => {
    if (!editingReview) return;

    const isDemo = editingReview.review_category === 'Demo Product';

    if (isDemo) {
      if (!reviewFormData.product_demo?.trim()) { notify('error', 'Product wajib diisi!'); return; }
      if (!reviewFormData.grade_product_knowledge) { notify('error', 'Grade Product Knowledge wajib diisi!'); return; }
    } else {
      if (!reviewFormData.product_bast?.trim()) { notify('error', 'Product wajib diisi!'); return; }
      if (!reviewFormData.grade_training_customer) { notify('error', 'Grade Training Customer wajib diisi!'); return; }
      if (!reviewFormData.grade_product_knowledge_bast) { notify('error', 'Grade Product Knowledge wajib diisi!'); return; }
    }

    setSaving(true);

    let fotoUrl = reviewFormData.foto_dokumentasi_url;
    if (fotoFile) {
      const ext = fotoFile.name.split('.').pop();
      const fileName = `review_foto_${editingReview.id}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('review-photos')
        .upload(fileName, fotoFile, { upsert: true });
      if (upErr) {
        notify('error', 'Gagal upload foto: ' + upErr.message);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('review-photos').getPublicUrl(fileName);
      fotoUrl = urlData?.publicUrl;
    }

    const payload: Partial<ReviewForm> = {
      foto_dokumentasi_url: fotoUrl,
      updated_at: new Date().toISOString(),
    };

    if (isDemo) {
      payload.product_demo = reviewFormData.product_demo;
      payload.grade_product_knowledge = reviewFormData.grade_product_knowledge;
      payload.catatan_grade_product_knowledge = reviewFormData.catatan_grade_product_knowledge;
    } else {
      payload.product_bast = reviewFormData.product_bast;
      payload.grade_training_customer = reviewFormData.grade_training_customer;
      payload.catatan_grade_training_customer = reviewFormData.catatan_grade_training_customer;
      payload.grade_product_knowledge_bast = reviewFormData.grade_product_knowledge_bast;
      payload.catatan_grade_product_knowledge_bast = reviewFormData.catatan_grade_product_knowledge_bast;
    }

    const { error } = await supabase.from('form_reviews').update(payload).eq('id', editingReview.id);
    setSaving(false);

    if (error) { notify('error', 'Gagal menyimpan: ' + error.message); return; }
    notify('success', 'Review berhasil disimpan!');
    setShowFormModal(false);
    setEditingReview(null);
    setReviewFormData(emptyReviewForm);
    setFotoFile(null);
    setFotoPreview(null);
    fetchReviewsQuiet();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const { error } = await supabase.from('form_reviews').delete().eq('id', deleteTarget.id);
    if (error) { notify('error', 'Gagal menghapus.'); return; }
    notify('success', 'Review dihapus.');
    setDetailReview(null);
    setShowDeleteModal(false);
    setDeleteTarget(null);
    setDeleteConfirmText('');
    fetchReviewsQuiet();
  };

  const openEdit = (r: ReviewForm) => {
    setEditingReview(r);
    setReviewFormData({
      // Pre-fill dari r.product (Reminder) jika product_demo/product_bast belum diisi guest
      product_demo: r.product_demo || r.product || '',
      grade_product_knowledge: r.grade_product_knowledge ?? 0,
      catatan_grade_product_knowledge: r.catatan_grade_product_knowledge ?? '',
      product_bast: r.product_bast || r.product || '',
      grade_training_customer: r.grade_training_customer ?? 0,
      catatan_grade_training_customer: r.catatan_grade_training_customer ?? '',
      grade_product_knowledge_bast: r.grade_product_knowledge_bast ?? 0,
      catatan_grade_product_knowledge_bast: r.catatan_grade_product_knowledge_bast ?? '',
      foto_dokumentasi_url: r.foto_dokumentasi_url ?? '',
    });
    setFotoFile(null);
    setFotoPreview(null);
    setDetailReview(null);
    setShowFormModal(true);
  };

  const openDeleteModal = (r: ReviewForm) => {
    setDeleteTarget(r);
    setDeleteConfirmText('');
    setShowDeleteModal(true);
  };

  // ─── Login ─────────────────────────────────────────────────────────────────

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*')
        .eq('username', loginForm.username).eq('password', loginForm.password).single();
      if (error || !data) { notify('error', 'Username atau password salah!'); return; }
      const now = Date.now();
      setDashLoading(true);
      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(data));
      localStorage.setItem('loginTime', now.toString());
      await fetchReviewsQuiet(data);
      setTimeout(() => setDashLoading(false), 1800);
    } catch { notify('error', 'Terjadi kesalahan.'); }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    setCurrentUser(null);
    setIsLoggedIn(false);
    const target = window.top !== window ? window.top : window;
    if (target) target.location.href = '/dashboard';
  };

  // ─── Filters ───────────────────────────────────────────────────────────────

  const filteredReviews = reviews.filter(r => {
    if (filterReviewCat !== 'all' && r.review_category !== filterReviewCat) return false;
    if (handlerFilter && r.assign_name !== handlerFilter) return false;
    if (productFilterChart) {
      const prod = r.review_category === 'Demo Product' ? r.product_demo : r.product_bast;
      if (prod !== productFilterChart) return false;
    }
    if (searchProject && !r.project_name?.toLowerCase().includes(searchProject.toLowerCase()) &&
        !r.address?.toLowerCase().includes(searchProject.toLowerCase())) return false;
    if (searchHandler && !r.assign_name?.toLowerCase().includes(searchHandler.toLowerCase())) return false;
    return true;
  });

  // Demo vs BAST split for table switch
  const demoReviews = filteredReviews.filter(r => r.review_category === 'Demo Product');
  const bastReviews = filteredReviews.filter(r => r.review_category === 'BAST');
  const tableReviews = switchTab === 'Demo Product' ? demoReviews : bastReviews;

  // Dashboard counts
  const totalDemo = reviews.filter(r => r.review_category === 'Demo Product').length;
  const totalTraining = reviews.filter(r => r.review_category === 'BAST').length;

  // Pie data
  const categoryPieData = (() => {
    const map: Record<string, number> = {};
    reviews.forEach(r => { map[r.reminder_category] = (map[r.reminder_category] || 0) + 1; });
    return Object.entries(map).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  })();

  const handlerPieData = (() => {
    const map: Record<string, number> = {};
    reviews.forEach(r => { if (r.assign_name) map[r.assign_name] = (map[r.assign_name] || 0) + 1; });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  })();

  const productPieData = (() => {
    const map: Record<string, number> = {};
    reviews.forEach(r => {
      const prod = r.review_category === 'Demo Product' ? r.product_demo : r.product_bast;
      if (prod) map[prod] = (map[prod] || 0) + 1;
    });
    return Object.entries(map).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([label, value], i) => ({ label, value, color: PIE_COLORS[i % PIE_COLORS.length] }));
  })();

  const myActivePendingReviews = reviews.filter(r =>
    currentUser && (
      // Guest: review miliknya yang belum diisi
      (currentUser.role === 'guest' && (
        r.guest_username === currentUser.username ||
        r.sales_name === currentUser.full_name
      )) ||
      // Team: review yang dia handle, tapi guest belum isi
      (currentUser.role === 'team' && r.assigned_to === currentUser.username)
    ) &&
    !r.grade_product_knowledge && !r.grade_product_knowledge_bast
  );

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm outline-none transition-all text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-violet-500/40";
  const inputStyle = { background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.12)' };

  // ─── Login Page ─────────────────────────────────────────────────────────────

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center relative"
        style={{ backgroundImage: `url('/IVP_Background.png')`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
        {toast && (
          <div className={`fixed top-5 right-5 z-[200] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 text-white ${toast.type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        )}
        <div className="relative z-10 bg-white/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md" style={{ border: '2px solid rgba(124,58,237,0.3)' }}>
          <div className="flex justify-center mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 6px 24px rgba(124,58,237,0.4)' }}>
              <span className="text-3xl">⭐</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-center mb-1 text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-purple-800">Login</h1>
          <p className="text-center text-gray-600 font-semibold mb-6 text-sm">Form Review Demo Produk & BAST<br /><span className="text-violet-600 font-bold">PTS IVP — Survey Team</span></p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Username</label>
              <input type="text" value={loginForm.username}
                onChange={e => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-violet-600 focus:ring-4 focus:ring-violet-200 transition-all font-medium bg-white"
                placeholder="Masukkan username"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Password</label>
              <input type="password" value={loginForm.password}
                onChange={e => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:border-violet-600 focus:ring-4 focus:ring-violet-200 transition-all font-medium bg-white"
                placeholder="Masukkan password"
                onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </div>
            <button onClick={handleLogin}
              className="w-full text-white py-3 rounded-xl font-bold shadow-xl transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading awal — tampilkan sebelum data siap (sesuai role)
  if (!appReady) return <LoadingScreen message={loadingMessage} />;

  if (dashLoading) return <LoadingScreen message="Memuat data..." />;

  // ─── Main Render ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen flex flex-col relative" style={{
      backgroundImage: `url('/IVP_Background.png')`,
      backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed',
    }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="relative z-10 flex flex-col min-h-screen">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-[200] px-5 py-3.5 rounded-xl shadow-2xl text-sm font-bold flex items-center gap-2 text-white animate-bounce`}
            style={{
              background: toast.type === 'success' ? '#059669' : '#dc2626',
              boxShadow: toast.type === 'success' ? '0 4px 20px rgba(5,150,105,0.4)' : '0 4px 20px rgba(220,38,38,0.4)',
            }}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
          </div>
        )}

        {/* ── DELETE MODAL ── */}
        {showDeleteModal && deleteTarget && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10001] p-4">
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl max-w-md w-full p-6"
              style={{ animation: 'scale-in 0.25s ease-out', border: '2px solid rgba(220,38,38,0.5)' }}>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">🗑️</span>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Hapus Review</h3>
                  <p className="text-xs font-medium text-gray-500">{deleteTarget.project_name}</p>
                  <p className="text-xs text-gray-400">{deleteTarget.review_category}</p>
                </div>
              </div>
              <div className="rounded-xl p-3 mb-4 text-xs"
                style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)', color: '#b91c1c' }}>
                ⚠️ <strong>Tindakan ini tidak dapat dibatalkan.</strong> Review ini akan dihapus permanen dari database.
              </div>
              <div className="mb-4">
                <label className="block text-sm font-bold mb-1 text-gray-700">
                  Ketik <span className="font-mono bg-red-100 text-red-700 px-1.5 py-0.5 rounded">HAPUS</span> untuk konfirmasi
                </label>
                <input type="text" value={deleteConfirmText} onChange={e => setDeleteConfirmText(e.target.value)}
                  placeholder="Ketik HAPUS di sini..."
                  className="w-full rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                  style={{ border: '2px solid rgba(220,38,38,0.3)', background: 'white' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleDelete} disabled={deleteConfirmText !== 'HAPUS'}
                  className="bg-gradient-to-r from-red-600 to-red-800 text-white py-2.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  🗑️ Hapus Permanen
                </button>
                <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); setDeleteConfirmText(''); }}
                  className="bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold hover:bg-gray-200 transition-all">
                  ✕ Batal
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FORM MODAL (Edit/View Review) ── */}
        {showFormModal && editingReview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) { setShowFormModal(false); setEditingReview(null); setReviewFormData(emptyReviewForm); } }}>
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4"
              style={{ animation: 'scale-in 0.25s ease-out', border: '1.5px solid rgba(124,58,237,0.25)' }}>
              {/* Header */}
              <div className="px-8 py-6 rounded-t-2xl" style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white">✏️ Isi Review</h2>
                    <p className="text-violet-200/80 text-xs mt-1">{editingReview.project_name}</p>
                    <p className="text-violet-300/70 text-xs mt-0.5">
                      {editingReview.review_category === 'Demo Product' ? '🖥️ Demo Product' : '📌 BAST (Training)'}
                    </p>
                  </div>
                  <button onClick={() => { setShowFormModal(false); setEditingReview(null); setReviewFormData(emptyReviewForm); }}
                    className="bg-white/15 hover:bg-white/25 text-white p-2 rounded-lg transition-all">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div className="p-8 space-y-5 max-h-[75vh] overflow-y-auto">
                {/* Project Info (Read-only) */}
                <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.15)' }}>
                  <p className="text-[10px] font-bold tracking-widest uppercase text-violet-600">Informasi Project</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div><span className="text-gray-400">Project:</span> <span className="font-semibold text-gray-700">{editingReview.project_name}</span></div>
                    <div><span className="text-gray-400">Lokasi:</span> <span className="font-semibold text-gray-700">{editingReview.address}</span></div>
                    <div><span className="text-gray-400">Sales:</span> <span className="font-semibold text-gray-700">{editingReview.sales_name}</span></div>
                    <div><span className="text-gray-400">Divisi:</span> <span className="font-semibold text-gray-700">{editingReview.sales_division}</span></div>
                    <div><span className="text-gray-400">Handler:</span> <span className="font-semibold text-gray-700">{editingReview.assign_name}</span></div>
                    <div><span className="text-gray-400">Kategori:</span> <span className="font-semibold text-gray-700">{editingReview.reminder_category}</span></div>
                  </div>
                </div>

                {editingReview.review_category === 'Demo Product' ? (
                  <>
                    <SectionHeader icon="🖥️" title="Review Demo Product" />
                    <FormField label="Product *">
                      <textarea value={reviewFormData.product_demo} onChange={e => rfd({ product_demo: e.target.value })}
                        rows={3} className={`${inputCls} resize-none`} style={inputStyle}
                        placeholder="Deskripsikan product yang di-demo-kan..." />
                    </FormField>
                    <FormField label="Grade Product Knowledge *">
                      <StarRating value={reviewFormData.grade_product_knowledge} onChange={v => rfd({ grade_product_knowledge: v })} />
                    </FormField>
                    <FormField label="Catatan Grade Product Knowledge">
                      <textarea value={reviewFormData.catatan_grade_product_knowledge} onChange={e => rfd({ catatan_grade_product_knowledge: e.target.value })}
                        rows={2} className={`${inputCls} resize-none`} style={inputStyle}
                        placeholder="Catatan penilaian product knowledge..." />
                    </FormField>
                  </>
                ) : (
                  <>
                    <SectionHeader icon="📌" title="Review BAST (Training)" />
                    <FormField label="Product *">
                      <textarea value={reviewFormData.product_bast} onChange={e => rfd({ product_bast: e.target.value })}
                        rows={3} className={`${inputCls} resize-none`} style={inputStyle}
                        placeholder="Deskripsikan product yang di-training-kan..." />
                    </FormField>
                    <FormField label="Grade Training Customer *">
                      <StarRating value={reviewFormData.grade_training_customer} onChange={v => rfd({ grade_training_customer: v })} />
                    </FormField>
                    <FormField label="Catatan Grade Training Customer">
                      <textarea value={reviewFormData.catatan_grade_training_customer} onChange={e => rfd({ catatan_grade_training_customer: e.target.value })}
                        rows={2} className={`${inputCls} resize-none`} style={inputStyle}
                        placeholder="Catatan penilaian training customer..." />
                    </FormField>
                    <FormField label="Grade Product Knowledge *">
                      <StarRating value={reviewFormData.grade_product_knowledge_bast} onChange={v => rfd({ grade_product_knowledge_bast: v })} />
                    </FormField>
                    <FormField label="Catatan Grade Product Knowledge">
                      <textarea value={reviewFormData.catatan_grade_product_knowledge_bast} onChange={e => rfd({ catatan_grade_product_knowledge_bast: e.target.value })}
                        rows={2} className={`${inputCls} resize-none`} style={inputStyle}
                        placeholder="Catatan penilaian product knowledge..." />
                    </FormField>
                  </>
                )}

                <SectionHeader icon="📸" title="Foto Dokumentasi" />
                <div>
                  <input ref={fotoRef} type="file" accept="image/*" className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setFotoFile(file);
                        const reader = new FileReader();
                        reader.onload = ev => setFotoPreview(ev.target?.result as string);
                        reader.readAsDataURL(file);
                      }
                    }} />
                  <button type="button" onClick={() => fotoRef.current?.click()}
                    className="w-full rounded-xl py-4 border-2 border-dashed transition-all text-sm font-semibold text-violet-600 hover:bg-violet-50"
                    style={{ borderColor: 'rgba(124,58,237,0.4)' }}>
                    📸 Upload Foto Dokumentasi
                  </button>
                  {(fotoPreview || reviewFormData.foto_dokumentasi_url) && (
                    <img src={fotoPreview || reviewFormData.foto_dokumentasi_url} alt="Foto" className="mt-3 rounded-xl w-full max-h-48 object-cover" />
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => { setShowFormModal(false); setEditingReview(null); setReviewFormData(emptyReviewForm); }}
                    className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                    style={{ background: 'rgba(255,255,255,0.55)', color: '#64748b', border: '1px solid rgba(0,0,0,0.12)' }}>
                    Batal
                  </button>
                  <button onClick={handleSaveReview} disabled={saving}
                    className="flex-1 text-white py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
                    {saving && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    💾 Simpan Review
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── DETAIL MODAL ── */}
        {detailReview && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 overflow-y-auto"
            onClick={e => { if (e.target === e.currentTarget) setDetailReview(null); }}>
            <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl my-4 overflow-hidden"
              style={{ animation: 'scale-in 0.25s ease-out', border: '1px solid rgba(0,0,0,0.1)', maxHeight: '96vh' }}>

              {/* Header */}
              <div className="px-6 py-5 relative"
                style={{ background: detailReview.review_category === 'Demo Product' ? 'linear-gradient(135deg,#7c3aeddd,#5b21b688)' : 'linear-gradient(135deg,#0ea5e9dd,#0284c788)' }}>
                <button onClick={() => setDetailReview(null)}
                  className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 hover:bg-black/30 text-white flex items-center justify-center font-bold text-lg">✕</button>
                <div className="flex flex-wrap gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: detailReview.review_category === 'Demo Product' ? '#7c3aed' : '#0ea5e9', border: '2px solid rgba(255,255,255,0.6)' }}>
                    {detailReview.review_category === 'Demo Product' ? '🖥️' : '📌'} {detailReview.review_category}
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                    style={{ background: 'rgba(0,0,0,0.25)', border: '2px solid rgba(255,255,255,0.4)' }}>
                    📋 {detailReview.reminder_category}
                  </span>
                  {/* Status badge */}
                  {(() => {
                    const hasReview = detailReview.review_category === 'Demo Product'
                      ? !!detailReview.grade_product_knowledge
                      : !!(detailReview.grade_training_customer && detailReview.grade_product_knowledge_bast);
                    return hasReview ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white"
                        style={{ background: '#059669', border: '2px solid rgba(255,255,255,0.5)' }}>
                        ✅ Sudah Diisi
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white animate-pulse"
                        style={{ background: '#d97706', border: '2px solid rgba(255,255,255,0.5)' }}>
                        ⏳ Belum Diisi
                      </span>
                    );
                  })()}
                </div>
                <h2 className="text-xl font-bold text-white leading-tight">{detailReview.project_name || '—'}</h2>
                {detailReview.address && <p className="text-white/80 text-sm mt-1 flex items-center gap-1.5">📍 {detailReview.address}</p>}
              </div>

              <div className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(95vh - 180px)' }}>

                {/* Info Cards Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { icon: '👤', label: 'Sales', value: detailReview.sales_name },
                    { icon: '🏢', label: 'Divisi', value: detailReview.sales_division },
                    { icon: '🛠️', label: 'Handler PTS', value: detailReview.assign_name },
                    { icon: '👥', label: 'Guest Reviewer', value: detailReview.guest_username },
                    { icon: '📅', label: 'Dibuat', value: formatDatetime(detailReview.created_at) },
                    { icon: '🔄', label: 'Update', value: detailReview.updated_at ? formatDatetime(detailReview.updated_at) : null },
                  ].filter(x => x.value).map((item, i) => (
                    <div key={i} className="rounded-xl px-4 py-3" style={{ background: 'rgba(248,250,252,0.9)', border: '1px solid rgba(0,0,0,0.07)' }}>
                      <p className="text-[9px] font-bold tracking-widest uppercase text-gray-400">{item.icon} {item.label}</p>
                      <p className="text-sm font-bold text-gray-800 mt-0.5 break-words">{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Demo Product review detail */}
                {detailReview.review_category === 'Demo Product' && (
                  <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(124,58,237,0.04)', border: '1.5px solid rgba(124,58,237,0.15)' }}>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-violet-600">🖥️ Review Demo Product</p>

                    {detailReview.product_demo ? (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Product yang Di-Demo</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white/60 rounded-lg px-3 py-2 border border-violet-100">{detailReview.product_demo}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic px-2">Product belum diisi</p>
                    )}

                    <div>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Grade Product Knowledge</p>
                      {detailReview.grade_product_knowledge ? (
                        <>
                          <StarRating value={detailReview.grade_product_knowledge} disabled />
                          {detailReview.catatan_grade_product_knowledge && (
                            <div className="mt-2 bg-white/60 rounded-lg px-3 py-2 border border-violet-100">
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Catatan</p>
                              <p className="text-xs text-gray-600 italic">{detailReview.catatan_grade_product_knowledge}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                          <span className="text-sm">⏳</span>
                          <p className="text-xs font-semibold text-amber-700">Belum diisi oleh guest</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* BAST review detail */}
                {detailReview.review_category === 'BAST' && (
                  <div className="rounded-xl p-4 space-y-4" style={{ background: 'rgba(14,165,233,0.04)', border: '1.5px solid rgba(14,165,233,0.15)' }}>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-sky-600">📌 Review BAST (Training)</p>

                    {detailReview.product_bast ? (
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Product yang Di-Training</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white/60 rounded-lg px-3 py-2 border border-sky-100">{detailReview.product_bast}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic px-2">Product belum diisi</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Grade Training Customer</p>
                        {detailReview.grade_training_customer ? (
                          <>
                            <StarRating value={detailReview.grade_training_customer} disabled />
                            {detailReview.catatan_grade_training_customer && (
                              <p className="text-xs text-gray-500 mt-2 italic bg-white/60 rounded-lg px-3 py-2 border border-sky-100">{detailReview.catatan_grade_training_customer}</p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <span className="text-sm">⏳</span>
                            <p className="text-xs font-semibold text-amber-700">Belum diisi</p>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Grade Product Knowledge</p>
                        {detailReview.grade_product_knowledge_bast ? (
                          <>
                            <StarRating value={detailReview.grade_product_knowledge_bast} disabled />
                            {detailReview.catatan_grade_product_knowledge_bast && (
                              <p className="text-xs text-gray-500 mt-2 italic bg-white/60 rounded-lg px-3 py-2 border border-sky-100">{detailReview.catatan_grade_product_knowledge_bast}</p>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <span className="text-sm">⏳</span>
                            <p className="text-xs font-semibold text-amber-700">Belum diisi</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Foto Dokumentasi */}
                {detailReview.foto_dokumentasi_url ? (
                  <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(0,0,0,0.08)' }}>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-gray-400 px-4 pt-3 pb-2">📸 Foto Dokumentasi</p>
                    <img
                      src={detailReview.foto_dokumentasi_url}
                      alt="Foto Dokumentasi"
                      className="w-full max-h-56 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(detailReview.foto_dokumentasi_url!, '_blank')}
                    />
                    <div className="px-4 pb-3 pt-1">
                      <a href={detailReview.foto_dokumentasi_url} target="_blank" rel="noopener noreferrer"
                        className="text-[11px] font-bold text-violet-600 hover:text-violet-800 transition-colors">
                        🔗 Buka foto di tab baru
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ background: 'rgba(0,0,0,0.03)', border: '1px dashed rgba(0,0,0,0.15)' }}>
                    <span className="text-gray-300 text-xl">📷</span>
                    <p className="text-xs text-gray-400">Belum ada foto dokumentasi</p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-1">
                  {/* Edit hanya untuk admin dan guest (bukan team) */}
                  {(isAdmin || isGuest) && (
                    <button onClick={() => openEdit(detailReview)}
                      className="flex-1 text-white py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', boxShadow: '0 3px 12px rgba(124,58,237,0.3)' }}>
                      ✏️ Edit / Isi Review
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => { setDetailReview(null); openDeleteModal(detailReview); }}
                      className="px-5 py-3 rounded-xl font-bold text-sm text-red-600 transition-all hover:bg-red-50 hover:scale-[1.01] flex items-center gap-2"
                      style={{ border: '1.5px solid rgba(220,38,38,0.35)' }}>
                      🗑️ Hapus
                    </button>
                  )}
                  <button onClick={() => setDetailReview(null)}
                    className="px-5 py-3 rounded-xl font-bold text-sm text-gray-500 transition-all hover:bg-gray-100"
                    style={{ border: '1px solid rgba(0,0,0,0.12)' }}>
                    ✕ Tutup
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── NOTIFICATION POPUP ── */}
        {showNotificationPopup && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden border-4 border-yellow-400"
              style={{ animation: 'scale-in 0.3s ease-out' }}>
              <div className="p-5 border-b-2 border-yellow-300" style={{ background: isTeam ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl animate-bounce">{isTeam ? '⭐' : '🔔'}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {isTeam ? 'Review Belum Diisi Guest' : 'Review Menunggu Kamu'}
                      </h3>
                      <p className="text-sm text-white/90">
                        {isTeam
                          ? `${myPendingReviews.length} jadwal kamu belum di-review oleh Guest`
                          : `${myPendingReviews.length} form review yang perlu kamu isi`}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowNotificationPopup(false)} className="text-white hover:bg-white/20 rounded-lg p-2 font-bold">✕</button>
                </div>
              </div>
              <div className="max-h-[calc(80vh-140px)] overflow-y-auto p-4 space-y-2">
                {myPendingReviews.map(r => (
                  <div key={r.id} onClick={() => { setDetailReview(r); setShowNotificationPopup(false); }}
                    className="rounded-xl p-3 border-2 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                    style={{ background: 'rgba(249,250,251,0.9)', borderColor: '#e5e7eb' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-violet-700"
                            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
                            {r.review_category === 'Demo Product' ? '🖥️' : '📌'} {r.review_category}
                          </span>
                        </div>
                        <p className="font-bold text-sm text-gray-800 truncate">{r.project_name || '—'}</p>
                        {r.address && <p className="text-xs text-gray-500 mt-0.5">📍 {r.address}</p>}
                        {isTeam && r.sales_name && (
                          <p className="text-xs text-violet-600 font-semibold mt-0.5">👤 Guest: {r.sales_name}</p>
                        )}
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700"
                          style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>⏳ Belum Diisi</span>
                        <p className="text-[10px] text-gray-500 mt-1">{isTeam ? r.sales_name : r.assign_name}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <button onClick={() => setShowNotificationPopup(false)}
                  className="w-full text-white py-3 rounded-xl font-bold transition-all"
                  style={{ background: isTeam ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
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
              <div className="p-5 border-b-2 border-yellow-300" style={{ background: isTeam ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{isTeam ? '⭐' : '🔔'}</span>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {isTeam ? 'Review Belum Diisi Guest' : 'Review Aktif Kamu'}
                      </h3>
                      <p className="text-sm text-white/90">
                        {myActivePendingReviews.length} belum diisi
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowBellPopup(false)} className="text-white hover:bg-white/20 rounded-lg p-2 font-bold">✕</button>
                </div>
              </div>
              <div className="max-h-[calc(80vh-140px)] overflow-y-auto p-4 space-y-2">
                {myActivePendingReviews.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-5xl mb-3">✅</div>
                    <p className="font-semibold">
                      {isTeam ? 'Semua Guest sudah mengisi review' : 'Semua review sudah diisi'}
                    </p>
                  </div>
                ) : myActivePendingReviews.map(r => (
                  <div key={r.id} onClick={() => { setDetailReview(r); setShowBellPopup(false); }}
                    className="rounded-xl p-3 border-2 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all"
                    style={{ background: 'rgba(249,250,251,0.9)', borderColor: '#e5e7eb' }}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-violet-700 mb-1"
                          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
                          {r.review_category === 'Demo Product' ? '🖥️' : '📌'} {r.review_category}
                        </span>
                        <p className="font-bold text-sm text-gray-800 truncate">{r.project_name || '—'}</p>
                        {r.address && <p className="text-xs text-gray-500 mt-0.5">📍 {r.address}</p>}
                        {isTeam && r.sales_name && (
                          <p className="text-xs text-violet-600 font-semibold mt-0.5">👤 Guest: {r.sales_name}</p>
                        )}
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-amber-700"
                        style={{ background: '#fef3c7', border: '1px solid #f59e0b' }}>⏳ Belum</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t-2 border-gray-200 bg-gray-50">
                <button onClick={() => setShowBellPopup(false)}
                  className="w-full text-white py-3 rounded-xl font-bold transition-all"
                  style={{ background: isTeam ? 'linear-gradient(135deg,#7c3aed,#5b21b6)' : 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
                  ✕ Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── HEADER ── */}
        <div className="sticky top-0 z-50"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {/* Loading Bar */}
          {loadingBar > 0 && (
            <div className="absolute top-0 left-0 w-full h-0.5 z-[60] overflow-hidden" style={{ background: 'rgba(124,58,237,0.15)' }}>
              <div
                className="h-full transition-all duration-300 ease-out"
                style={{
                  width: `${loadingBar}%`,
                  background: 'linear-gradient(90deg,#7c3aed,#a78bfa,#7c3aed)',
                  backgroundSize: '200% 100%',
                  animation: loadingBar < 100 ? 'shimmer 1.2s infinite' : 'none',
                  opacity: loadingBar === 100 ? 0 : 1,
                  transition: 'width 0.3s ease-out, opacity 0.3s ease-out',
                }}
              />
            </div>
          )}
          <div className="px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
              <span className="text-white text-base">⭐</span>
            </div>
            <div>
              <p className="text-[10px] font-semibold tracking-[0.2em] uppercase" style={{ color: '#7c3aed' }}>IndoVisual</p>
              <p className="font-bold text-sm leading-none tracking-wide text-slate-800">Form Review Demo & BAST</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Bell */}
            <button onClick={() => setShowBellPopup(true)}
              className="relative p-2 rounded-xl transition-all hover:bg-violet-50"
              style={{ border: '1px solid rgba(124,58,237,0.2)' }}>
              <span className="text-lg">🔔</span>
              {myActivePendingReviews.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full h-4.5 w-4.5 flex items-center justify-center min-w-[18px] px-1 animate-pulse">
                  {myActivePendingReviews.length}
                </span>
              )}
            </button>
            {/* User */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                {currentUser?.full_name?.charAt(0)?.toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">{currentUser?.full_name}</span>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white"
                style={{ background: currentUser?.role === 'admin' ? '#dc2626' : currentUser?.role === 'team' ? '#0ea5e9' : '#7c3aed' }}>
                {currentUser?.role?.toUpperCase()}
              </span>
            </div>
            <button onClick={handleLogout} title="Logout"
              className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all"
              style={{ border: '1px solid rgba(0,0,0,0.1)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 p-5 space-y-5">

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Demo Product', value: totalDemo, icon: '🖥️', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)' },
              { label: 'Total Training / BAST', value: totalTraining, icon: '📌', color: '#0ea5e9', bg: 'rgba(14,165,233,0.08)', border: 'rgba(14,165,233,0.25)' },
              { label: 'Belum Diisi', value: reviews.filter(r => !r.grade_product_knowledge && !r.grade_product_knowledge_bast).length, icon: '⏳', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)' },
              { label: 'Sudah Diisi', value: reviews.filter(r => r.grade_product_knowledge || r.grade_product_knowledge_bast).length, icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.25)' },
            ].map((card, i) => (
              <div key={i} className="rounded-2xl p-4 transition-all hover:scale-[1.01]"
                style={{ background: card.bg, border: `1px solid ${card.border}`, backdropFilter: 'blur(10px)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{card.icon}</span>
                  <span className="text-2xl font-black" style={{ color: card.color }}>{card.value}</span>
                </div>
                <p className="text-xs font-bold text-gray-600 tracking-wide">{card.label}</p>
              </div>
            ))}
          </div>

          {/* Mini Pie Charts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiniPieChart data={categoryPieData} title="Kategori Kegiatan" icon="📋"
              activeFilter={filterReviewCat !== 'all' ? filterReviewCat : null} />
            <MiniPieChart data={handlerPieData} title="Handler Team PTS" icon="👥"
              activeFilter={handlerFilter}
              onSliceClick={label => setHandlerFilter(prev => prev === label ? null : label)} />
            <MiniPieChart data={productPieData} title="Product" icon="📦"
              activeFilter={productFilterChart}
              onSliceClick={label => setProductFilterChart(prev => prev === label ? null : label)} />
          </div>

          {/* Table */}
          <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,0,0,0.09)', backdropFilter: 'blur(12px)', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
            {/* Table Header Controls */}
            <div className="px-5 py-4 flex flex-wrap items-center gap-3" style={{ borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
              <div className="flex items-center gap-2 flex-1 min-w-[180px]">
                <span className="text-base">⭐</span>
                <h2 className="font-bold text-slate-800 text-sm tracking-wide">Form Review Demo Produk & BAST</h2>
              </div>

              {/* Switch Tab */}
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1.5px solid rgba(124,58,237,0.25)' }}>
                {(['Demo Product', 'BAST'] as const).map(tab => (
                  <button key={tab} onClick={() => setSwitchTab(tab)}
                    className="px-4 py-2 text-xs font-bold transition-all"
                    style={switchTab === tab
                      ? { background: 'linear-gradient(135deg,#7c3aed,#5b21b6)', color: 'white' }
                      : { background: 'transparent', color: '#7c3aed' }}>
                    {tab === 'Demo Product' ? '🖥️' : '📌'} {tab}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
                <input value={searchProject} onChange={e => setSearchProject(e.target.value)}
                  placeholder="Cari project / lokasi..."
                  className="pl-9 pr-4 py-2 rounded-xl text-xs bg-white outline-none transition-all focus:ring-2 focus:ring-violet-400/30"
                  style={{ border: '1.5px solid rgba(0,0,0,0.12)', minWidth: 180 }} />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">👤</span>
                <input value={searchHandler} onChange={e => setSearchHandler(e.target.value)}
                  placeholder="Cari handler..."
                  className="pl-9 pr-4 py-2 rounded-xl text-xs bg-white outline-none transition-all focus:ring-2 focus:ring-violet-400/30"
                  style={{ border: '1.5px solid rgba(0,0,0,0.12)', minWidth: 140 }} />
              </div>

              {/* Filter */}
              <select value={filterReviewCat} onChange={e => setFilterReviewCat(e.target.value as any)}
                className="px-3 py-2 rounded-xl text-xs bg-white outline-none"
                style={{ border: '1.5px solid rgba(0,0,0,0.12)' }}>
                <option value="all">Semua Kategori</option>
                <option value="Demo Product">Demo Product</option>
                <option value="BAST">BAST</option>
              </select>

              <button onClick={fetchReviews}
                className="px-3 py-2 rounded-xl text-xs font-bold text-violet-600 transition-all hover:bg-violet-50"
                style={{ border: '1.5px solid rgba(124,58,237,0.3)' }}>
                🔄
              </button>
            </div>

            {/* Active Filters Chips */}
            {(handlerFilter || productFilterChart) && (
              <div className="px-5 py-2 flex items-center gap-2 flex-wrap" style={{ background: 'rgba(124,58,237,0.04)', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Filter Aktif:</span>
                {handlerFilter && (
                  <button onClick={() => setHandlerFilter(null)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-violet-700 hover:bg-violet-100 transition-all"
                    style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.3)' }}>
                    👤 {handlerFilter} ✕
                  </button>
                )}
                {productFilterChart && (
                  <button onClick={() => setProductFilterChart(null)} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold text-indigo-700 hover:bg-indigo-100 transition-all"
                    style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)' }}>
                    📦 {productFilterChart} ✕
                  </button>
                )}
              </div>
            )}

            {listLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'rgba(124,58,237,0.3)', borderTopColor: '#7c3aed' }} />
              </div>
            ) : tableReviews.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-5xl mb-3">📭</p>
                <p className="font-bold text-gray-600">Tidak ada data {switchTab}</p>
                <p className="text-sm text-gray-400 mt-1">Form review muncul otomatis dari Reminder Schedule yang Solved</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ borderCollapse: 'separate', borderSpacing: 0 }}>
                  <thead>
                    <tr style={{ background: 'rgba(248,250,252,0.95)', borderBottom: '1.5px solid rgba(0,0,0,0.07)' }}>
                      {['No', 'Project', 'Lokasi', 'Sales', 'Handler',
                        switchTab === 'Demo Product' ? 'Product Demo' : 'Product BAST',
                        switchTab === 'Demo Product' ? 'Grade PK' : 'Grade Training',
                        switchTab === 'BAST' ? 'Grade PK' : null,
                        'Status', 'Aksi'].filter(Boolean).map((h, i) => (
                        <th key={i} className="px-3 py-3 text-[10px] font-black uppercase tracking-widest text-gray-500 whitespace-nowrap"
                          style={{ borderRight: '1px solid rgba(0,0,0,0.06)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableReviews.map((r, idx) => {
                      const isDemo = r.review_category === 'Demo Product';
                      const hasReview = isDemo
                        ? !!r.grade_product_knowledge
                        : !!(r.grade_training_customer && r.grade_product_knowledge_bast);
                      return (
                        <tr key={r.id}
                          onClick={() => setDetailReview(r)}
                          className="cursor-pointer transition-all hover:bg-violet-50/40"
                          style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                          {/* No */}
                          <td className="px-3 py-3 text-[11px] font-bold text-gray-400 border-r border-gray-100 align-middle">{idx + 1}</td>
                          {/* Project */}
                          <td className="px-3 py-3 border-r border-gray-100 align-middle">
                            <div className="text-xs font-bold text-gray-800 leading-tight max-w-[140px] truncate">{r.project_name || '—'}</div>
                            <div className="text-[10px] text-violet-600 font-semibold mt-0.5">{r.reminder_category}</div>
                          </td>
                          {/* Lokasi */}
                          <td className="px-3 py-3 border-r border-gray-100 align-middle">
                            <div className="text-[10px] text-gray-500 max-w-[120px] truncate">📍 {r.address || '—'}</div>
                          </td>
                          {/* Sales */}
                          <td className="px-3 py-3 border-r border-gray-100 align-middle">
                            <div className="text-xs font-semibold text-gray-700 truncate max-w-[100px]">{r.sales_name || '—'}</div>
                            {r.sales_division && <div className="text-[10px] text-purple-600 font-semibold">{r.sales_division}</div>}
                          </td>
                          {/* Handler */}
                          <td className="px-3 py-3 border-r border-gray-100 align-middle">
                            <div className="flex items-center gap-1">
                              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg,#7c3aed,#5b21b6)' }}>
                                {r.assign_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <span className="text-[10px] font-bold text-gray-800 truncate max-w-[80px]">{r.assign_name}</span>
                            </div>
                          </td>
                          {/* Product */}
                          <td className="px-3 py-3 border-r border-gray-100 align-middle">
                            <div className="text-[10px] text-gray-600 max-w-[120px] line-clamp-2">
                              {isDemo
                                ? (r.product_demo || r.product || '—')
                                : (r.product_bast || r.product || '—')}
                            </div>
                          </td>
                          {/* Grade 1 */}
                          <td className="px-3 py-3 border-r border-gray-100 align-middle">
                            {isDemo
                              ? (r.grade_product_knowledge ? <StarRating value={r.grade_product_knowledge} disabled /> : <span className="text-gray-300 text-xs">—</span>)
                              : (r.grade_training_customer ? <StarRating value={r.grade_training_customer} disabled /> : <span className="text-gray-300 text-xs">—</span>)
                            }
                          </td>
                          {/* Grade 2 (BAST only) */}
                          {!isDemo && (
                            <td className="px-3 py-3 border-r border-gray-100 align-middle">
                              {r.grade_product_knowledge_bast ? <StarRating value={r.grade_product_knowledge_bast} disabled /> : <span className="text-gray-300 text-xs">—</span>}
                            </td>
                          )}
                          {/* Status */}
                          <td className="px-3 py-3 border-r border-gray-100 align-middle">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold"
                              style={hasReview
                                ? { background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' }
                                : { background: '#fef3c7', color: '#92400e', border: '1px solid #f59e0b' }}>
                              {hasReview ? '✅ Terisi' : '⏳ Belum'}
                            </span>
                          </td>
                          {/* Actions */}
                          <td className="px-3 py-1 align-middle text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={() => setDetailReview(r)} title="Detail" className="text-blue-500 hover:text-blue-700 transition-colors text-sm">👁</button>
                              {(isAdmin || isGuest) && (
                                <button onClick={() => openEdit(r)} title="Edit / Isi Review" className="text-violet-500 hover:text-violet-700 transition-colors text-sm">✏️</button>
                              )}
                              {isAdmin && (
                                <button onClick={() => openDeleteModal(r)} title="Hapus" className="text-red-400 hover:text-red-600 transition-colors text-sm">🗑️</button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 bg-white">
                  <span className="text-[10px] text-gray-400">{tableReviews.length} review ditemukan ({switchTab})</span>
                  <span className="text-[10px] text-gray-400">{tableReviews.length} of {reviews.length} total</span>
                </div>
              </div>
            )}
          </div>
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
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
        select option { background: #ffffff; color: #1e293b; }
        input[type="date"]::-webkit-calendar-picker-indicator,
        input[type="time"]::-webkit-calendar-picker-indicator { filter: invert(0.3); cursor: pointer; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.25); border-radius: 4px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
}
