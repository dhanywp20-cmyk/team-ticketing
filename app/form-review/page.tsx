'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

// Lazy initialization for Supabase client
let _supabase: any = null;
const getSupabase = () => {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      return { 
        from: () => ({ 
          select: () => ({ order: () => ({ ascending: () => ({}) }), eq: () => ({ in: () => ({}) }) }),
          update: () => ({ eq: () => ({}) }),
          insert: () => ({})
        }),
        storage: { from: () => ({ upload: () => ({}), getPublicUrl: () => ({ data: {} }) }) }
      } as any;
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
};

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

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

// ─── Star Rating Component ────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (v: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hover, setHover] = useState(0);
  const starSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-2xl';
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => !readOnly && onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(0)}
          className={`${starSize} transition-transform ${!readOnly ? 'hover:scale-110 cursor-pointer' : 'cursor-default'}`}
        >
          <span style={{ color: star <= (hover || value) ? '#f59e0b' : '#d1d5db' }}>★</span>
        </button>
      ))}
      {value > 0 && (
        <span className="ml-1 text-xs font-bold text-amber-600">{value}/5</span>
      )}
    </div>
  );
}

// ─── Image Upload Component ───────────────────────────────────────────────────

function ImageUploadField({
  value,
  onChange,
  readOnly = false,
}: {
  value: string;
  onChange?: (url: string) => void;
  readOnly?: boolean;
}) {
  const supabase = getSupabase();
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setPreview(value || ''); }, [value]);

  const handleFile = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `review_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage
        .from('review-photos')
        .upload(fileName, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage
        .from('review-photos')
        .getPublicUrl(data.path);
      const url = urlData.publicUrl;
      setPreview(url);
      onChange?.(url);
    } catch (e: any) {
      console.error('Upload error:', e);
    } finally {
      setUploading(false);
    }
  };

  if (readOnly) {
    if (!preview) return <span className="text-slate-400 text-sm italic">Tidak ada foto</span>;
    return (
      <a href={preview} target="_blank" rel="noopener noreferrer">
        <img src={preview} alt="Dokumentasi" className="max-h-48 rounded-xl border border-slate-200 object-cover hover:opacity-90 transition-opacity cursor-zoom-in" referrerPolicy="no-referrer" />
      </a>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      {preview ? (
        <div className="relative group">
          <img src={preview} alt="Preview" className="max-h-40 rounded-xl border border-slate-200 object-cover" referrerPolicy="no-referrer" />
          {!readOnly && (
            <button
              type="button"
              onClick={() => { setPreview(''); onChange?.(''); }}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
            >×</button>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex flex-col items-center justify-center gap-2 w-full h-28 border-2 border-dashed border-slate-300 rounded-xl hover:border-cyan-400 hover:bg-cyan-50 transition-all text-slate-400 hover:text-cyan-600"
        >
          {uploading ? (
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span className="text-2xl">📷</span>
              <span className="text-xs font-medium">Klik untuk upload foto</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Modal Detail/Edit ────────────────────────────────────────────────────────

function ReviewModal({
  record,
  mode,
  onClose,
  onSaved,
}: {
  record: ReviewRecord;
  mode: 'view' | 'edit';
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = getSupabase();
  const [activeTab, setActiveTab] = useState<ReviewCategory>(record.review_category);
  const [form, setForm] = useState<ReviewRecord>({ ...record });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const isEdit = mode === 'edit';
  const isDemoProduct = record.reminder_category === 'Demo Product';

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSave = async () => {
    if (!form.product.trim()) { notify('error', 'Produk wajib diisi!'); return; }
    if (!form.grade_product_knowledge) { notify('error', 'Grade Product Knowledge wajib diisi!'); return; }
    if (!isDemoProduct && !form.grade_training_customer) { notify('error', 'Grade Training Customer wajib diisi!'); return; }
    setSaving(true);
    const payload: any = {
      product: form.product,
      grade_product_knowledge: form.grade_product_knowledge,
      catatan_product_knowledge: form.catatan_product_knowledge,
      foto_dokumentasi_url: form.foto_dokumentasi_url,
      updated_at: new Date().toISOString(),
    };
    if (!isDemoProduct) {
      payload.grade_training_customer = form.grade_training_customer;
      payload.catatan_training_customer = form.catatan_training_customer;
    }
    const { error } = await supabase.from('reviews').update(payload).eq('id', record.id);
    setSaving(false);
    if (error) { notify('error', 'Gagal menyimpan: ' + error.message); return; }
    notify('success', 'Review berhasil disimpan!');
    setTimeout(() => { onSaved(); onClose(); }, 1000);
  };

  const gradeLabel = (g: number) => {
    const labels: Record<number, string> = { 1: 'Sangat Buruk', 2: 'Buruk', 3: 'Cukup', 4: 'Baik', 5: 'Sangat Baik' };
    return g ? labels[g] : '';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.12)' }}>
                {isDemoProduct ? '🖥️' : '🎓'}
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">{record.project_name}</h2>
                <p className="text-white/50 text-xs mt-0.5">{isEdit ? 'Edit Review' : 'Detail Review'} — {record.reminder_category}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nama Project', value: record.project_name, icon: '🏢' },
              { label: 'Lokasi', value: record.address, icon: '📍' },
              { label: 'Nama Sales', value: record.sales_name, icon: '👤' },
              { label: 'Handler', value: record.assign_name, icon: '🔧' },
              { label: 'Tanggal Dibuat', value: new Date(record.created_at).toLocaleDateString(), icon: '⏱️' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{icon} {label}</p>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{value || '—'}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-all text-sm">Tutup</button>
          {isEdit && (
            <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm transition-all" style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}>
              {saving ? 'Menyimpan...' : '💾 Simpan Review'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Guest Form Modal ─────────────────────────────────────────────────────────

function GuestFormModal({
  reminder,
  onClose,
  onSaved,
}: {
  reminder: Reminder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const supabase = getSupabase();
  const isDemoProduct = reminder.category === 'Demo Product';
  const reviewCat: ReviewCategory = isDemoProduct ? 'Demo Product' : 'BAST';

  const [form, setForm] = useState({
    product: '',
    grade_product_knowledge: 0,
    catatan_product_knowledge: '',
    grade_training_customer: 0,
    catatan_training_customer: '',
    foto_dokumentasi_url: '',
  });
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async () => {
    if (!form.product.trim()) { notify('error', 'Produk wajib diisi!'); return; }
    if (!form.grade_product_knowledge) { notify('error', 'Grade Product Knowledge wajib diisi!'); return; }
    if (!isDemoProduct && !form.grade_training_customer) { notify('error', 'Grade Training Customer wajib diisi!'); return; }

    setSaving(true);
    const payload: any = {
      reminder_id: reminder.id,
      project_name: reminder.project_name || reminder.title || '',
      address: reminder.address,
      sales_name: reminder.sales_name,
      sales_division: reminder.sales_division,
      assign_name: reminder.assign_name,
      review_category: reviewCat,
      reminder_category: reminder.category,
      product: form.product,
      grade_product_knowledge: form.grade_product_knowledge,
      catatan_product_knowledge: form.catatan_product_knowledge,
      foto_dokumentasi_url: form.foto_dokumentasi_url || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (!isDemoProduct) {
      payload.grade_training_customer = form.grade_training_customer;
      payload.catatan_training_customer = form.catatan_training_customer;
    }

    const { error } = await supabase.from('reviews').insert([payload]);
    setSaving(false);
    if (error) { notify('error', 'Gagal submit: ' + error.message); return; }
    notify('success', 'Review berhasil dikirim! Terima kasih.');
    setTimeout(() => { onSaved(); onClose(); }, 1500);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        <div className="px-6 py-5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2644 100%)' }}>
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="text-2xl">⭐</div>
                <h2 className="text-white font-bold">Form Review</h2>
             </div>
             <button onClick={onClose} className="text-white/50">×</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
           <textarea rows={3} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} className="w-full border-2 p-3 rounded-xl focus:border-blue-400 outline-none" placeholder="Product..." />
           <StarRating value={form.grade_product_knowledge} onChange={v => setForm(f => ({ ...f, grade_product_knowledge: v }))} size="lg" />
           <ImageUploadField value={form.foto_dokumentasi_url} onChange={url => setForm(f => ({ ...f, foto_dokumentasi_url: url }))} />
        </div>
        <div className="p-4 border-t flex gap-3">
           <button onClick={onClose} className="flex-1 p-3 border-2 rounded-xl">Batal</button>
           <button onClick={handleSubmit} disabled={saving} className="flex-1 p-3 bg-blue-900 text-white rounded-xl font-bold">Submit</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormReviewPage() {
  const supabase = getSupabase();
  const router = useRouter();
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [solvedReminders, setSolvedReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [guestReminder, setGuestReminder] = useState<Reminder | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const { data: reviewData } = await supabase.from('reviews').select('*').order('created_at', { ascending: false });
    if (reviewData) setReviews(reviewData as ReviewRecord[]);

    const { data: reminderData } = await supabase.from('reminders').select('*').eq('status', 'done').in('category', ['Demo Product', 'Training', 'Konfigurasi & Training']);
    if (reminderData) {
      const ids = new Set((reviewData ?? []).map((r: any) => r.reminder_id));
      setSolvedReminders((reminderData as Reminder[]).filter(r => !ids.has(r.id)));
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filteredReviews = useMemo(() => {
    return reviews.filter(r => 
      r.project_name.toLowerCase().includes(search.toLowerCase()) ||
      r.sales_name.toLowerCase().includes(search.toLowerCase())
    );
  }, [reviews, search]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {guestReminder && <GuestFormModal reminder={guestReminder} onClose={() => setGuestReminder(null)} onSaved={fetchAll} />}
      {selectedReview && <ReviewModal record={selectedReview} mode={modalMode} onClose={() => setSelectedReview(null)} onSaved={fetchAll} />}

      <header className="sticky top-0 z-40 bg-white border-b-2 border-red-600 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white text-xl">⭐</div>
          <h1 className="text-xl font-black text-slate-800">Form Review Platform</h1>
        </div>
        <button onClick={() => router.push('/reminder-schedule')} className="px-4 py-2 border-2 border-slate-200 rounded-xl font-bold text-sm">🗓️ Schedule</button>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {solvedReminders.length > 0 && (
          <div className="space-y-3">
             <h2 className="text-sm font-black text-red-600 uppercase tracking-widest">🔴 Menunggu Review ({solvedReminders.length})</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {solvedReminders.map(r => (
                   <motion.div whileHover={{ scale: 1.02 }} key={r.id} className="bg-white p-5 rounded-[32px] border-2 border-amber-100 shadow-sm flex flex-col gap-4">
                      <h3 className="font-black text-slate-800 leading-tight">{r.project_name}</h3>
                      <button onClick={() => setGuestReminder(r)} className="w-full bg-red-600 text-white py-3 rounded-2xl font-black text-xs uppercase tracking-widest">✍️ Isi Review Sekarang</button>
                   </motion.div>
                ))}
             </div>
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           <div className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm h-64">
              <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie data={[{ name: 'Demo Product', value: reviews.filter(r => r.review_category === 'Demo Product').length }, { name: 'BAST', value: reviews.filter(r => r.review_category === 'BAST').length }].filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                       {COLORS.map((color, idx) => <Cell key={`cell-${idx}`} fill={color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                 </PieChart>
              </ResponsiveContainer>
           </div>
        </div>

        {/* List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredReviews.map(r => (
              <motion.div layout whileHover={{ y: -5 }} key={r.id} className="bg-white p-6 rounded-[40px] border border-slate-100 shadow-sm cursor-pointer" onClick={() => { setSelectedReview(r); setModalMode('view'); }}>
                 <h3 className="text-lg font-black text-slate-800 uppercase">{r.project_name}</h3>
                 <p className="text-xs text-slate-400 font-bold mt-2">Handler: {r.assign_name}</p>
              </motion.div>
           ))}
        </div>
      </div>
    </div>
  );
}
