'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      alert('Gagal upload foto: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  if (readOnly) {
    if (!preview) return <span className="text-slate-400 text-sm italic">Tidak ada foto</span>;
    return (
      <a href={preview} target="_blank" rel="noopener noreferrer">
        <img src={preview} alt="Dokumentasi" className="max-h-48 rounded-xl border border-slate-200 object-cover hover:opacity-90 transition-opacity cursor-zoom-in" />
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
          <img src={preview} alt="Preview" className="max-h-40 rounded-xl border border-slate-200 object-cover" />
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
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

          {/* Category Switch Tab */}
          <div className="flex gap-2 mt-4">
            {(['Demo Product', 'BAST'] as ReviewCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={activeTab === cat
                  ? { background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }
                }
              >
                {cat === 'Demo Product' ? '🖥️' : '🎓'} {cat}
              </button>
            ))}
          </div>
        </div>

        {notification && (
          <div className={`mx-5 mt-4 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 flex-shrink-0 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Project Info */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nama Project', value: record.project_name, icon: '🏢' },
              { label: 'Lokasi', value: record.address, icon: '📍' },
              { label: 'Nama Sales', value: record.sales_name, icon: '👤' },
              { label: 'Divisi Sales', value: record.sales_division, icon: '🏷️' },
              { label: 'Handler', value: record.assign_name, icon: '🔧' },
              { label: 'Tanggal Dibuat', value: new Date(record.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }), icon: '📅' },
            ].map(({ label, value, icon }) => (
              <div key={label} className="bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{icon} {label}</p>
                <p className="text-sm font-semibold text-slate-800 leading-snug">{value || '—'}</p>
              </div>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'Demo Product' && (
            <div className="space-y-4">
              <div className="h-px bg-gradient-to-r from-violet-200 via-violet-100 to-transparent" />
              <h3 className="text-sm font-bold text-violet-700 flex items-center gap-2">🖥️ Demo Product</h3>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Product</label>
                {isEdit ? (
                  <textarea
                    rows={3}
                    value={form.product}
                    onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none resize-none"
                    placeholder="Deskripsikan produk yang di-demo..."
                  />
                ) : (
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 whitespace-pre-wrap">{record.product || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Grade Product Knowledge</label>
                {isEdit ? (
                  <StarRating value={form.grade_product_knowledge} onChange={v => setForm(f => ({ ...f, grade_product_knowledge: v }))} />
                ) : (
                  <div className="flex items-center gap-2">
                    <StarRating value={record.grade_product_knowledge} readOnly />
                    {record.grade_product_knowledge > 0 && (
                      <span className="text-xs text-amber-600 font-semibold">{gradeLabel(record.grade_product_knowledge)}</span>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Catatan Grade Product Knowledge</label>
                {isEdit ? (
                  <textarea
                    rows={2}
                    value={form.catatan_product_knowledge}
                    onChange={e => setForm(f => ({ ...f, catatan_product_knowledge: e.target.value }))}
                    className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-violet-200 focus:border-violet-400 outline-none resize-none"
                    placeholder="Catatan mengenai product knowledge..."
                  />
                ) : (
                  <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 whitespace-pre-wrap">{record.catatan_product_knowledge || '—'}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Foto Dokumentasi</label>
                <ImageUploadField
                  value={isEdit ? form.foto_dokumentasi_url || '' : record.foto_dokumentasi_url || ''}
                  onChange={url => setForm(f => ({ ...f, foto_dokumentasi_url: url }))}
                  readOnly={!isEdit}
                />
              </div>
            </div>
          )}

          {activeTab === 'BAST' && (
            <div className="space-y-4">
              <div className="h-px bg-gradient-to-r from-teal-200 via-teal-100 to-transparent" />
              <h3 className="text-sm font-bold text-teal-700 flex items-center gap-2">🎓 BAST</h3>

              {isDemoProduct ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 font-medium">
                  ⚠️ Data BAST tidak tersedia — trigger dari Reminder Schedule adalah Demo Product.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Product</label>
                    {isEdit ? (
                      <textarea rows={3} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none resize-none"
                        placeholder="Deskripsikan produk BAST..." />
                    ) : (
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 whitespace-pre-wrap">{record.product || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Grade Training Customer</label>
                    {isEdit ? (
                      <StarRating value={form.grade_training_customer || 0} onChange={v => setForm(f => ({ ...f, grade_training_customer: v }))} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <StarRating value={record.grade_training_customer || 0} readOnly />
                        {(record.grade_training_customer || 0) > 0 && (
                          <span className="text-xs text-amber-600 font-semibold">{gradeLabel(record.grade_training_customer!)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Catatan Grade Training Customer</label>
                    {isEdit ? (
                      <textarea rows={2} value={form.catatan_training_customer || ''} onChange={e => setForm(f => ({ ...f, catatan_training_customer: e.target.value }))}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none resize-none"
                        placeholder="Catatan mengenai training customer..." />
                    ) : (
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 whitespace-pre-wrap">{record.catatan_training_customer || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Grade Product Knowledge</label>
                    {isEdit ? (
                      <StarRating value={form.grade_product_knowledge} onChange={v => setForm(f => ({ ...f, grade_product_knowledge: v }))} />
                    ) : (
                      <div className="flex items-center gap-2">
                        <StarRating value={record.grade_product_knowledge} readOnly />
                        {record.grade_product_knowledge > 0 && (
                          <span className="text-xs text-amber-600 font-semibold">{gradeLabel(record.grade_product_knowledge)}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Catatan Grade Product Knowledge</label>
                    {isEdit ? (
                      <textarea rows={2} value={form.catatan_product_knowledge} onChange={e => setForm(f => ({ ...f, catatan_product_knowledge: e.target.value }))}
                        className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none resize-none"
                        placeholder="Catatan mengenai product knowledge..." />
                    ) : (
                      <p className="text-sm text-slate-700 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100 whitespace-pre-wrap">{record.catatan_product_knowledge || '—'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Foto Dokumentasi</label>
                    <ImageUploadField
                      value={isEdit ? form.foto_dokumentasi_url || '' : record.foto_dokumentasi_url || ''}
                      onChange={url => setForm(f => ({ ...f, foto_dokumentasi_url: url }))}
                      readOnly={!isEdit}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-all text-sm">
            Tutup
          </button>
          {isEdit && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0f172a, #1e293b)' }}
            >
              {saving ? 'Menyimpan...' : '💾 Simpan Review'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Guest Form Modal (link tanpa login) ─────────────────────────────────────

function GuestFormModal({
  reminder,
  onClose,
  onSaved,
}: {
  reminder: Reminder;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isDemoProduct = reminder.category === 'Demo Product';
  const reviewCat: ReviewCategory = isDemoProduct ? 'Demo Product' : 'BAST';

  const [activeTab, setActiveTab] = useState<ReviewCategory>(reviewCat);
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
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2644 100%)' }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⭐</div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">Form Review</h2>
                <p className="text-white/50 text-xs">Demo Produk & BAST</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/50 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {/* Info project */}
          <div className="mt-3 bg-white/10 rounded-xl px-4 py-3 text-white/80 text-xs space-y-1">
            <div className="flex items-center gap-2"><span>🏢</span><span className="font-semibold">{reminder.project_name || reminder.title}</span></div>
            <div className="flex items-center gap-2"><span>📍</span><span>{reminder.address}</span></div>
            <div className="flex items-center gap-2"><span>🔧</span><span>Handler: {reminder.assign_name}</span></div>
            <div className="flex items-center gap-2"><span>🏷️</span><span>Kategori: {reminder.category}</span></div>
          </div>
          {/* Tab Switch */}
          <div className="flex gap-2 mt-3">
            {(['Demo Product', 'BAST'] as ReviewCategory[]).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className="px-4 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={activeTab === cat
                  ? { background: 'rgba(255,255,255,0.18)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)' }
                  : { background: 'transparent', color: 'rgba(255,255,255,0.45)', border: '1px solid rgba(255,255,255,0.1)' }
                }
              >
                {cat === 'Demo Product' ? '🖥️' : '🎓'} {cat}
              </button>
            ))}
          </div>
        </div>

        {notification && (
          <div className={`mx-5 mt-3 px-4 py-3 rounded-lg text-sm font-semibold flex items-center gap-2 flex-shrink-0 ${notification.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === 'Demo Product' && (
            <div className="space-y-4">
              {!isDemoProduct && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
                  ⚠️ Trigger dari Reminder: <strong>{reminder.category}</strong> — Tab ini untuk referensi saja. Isi BAST tab.
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Product <span className="text-red-500">*</span></label>
                <textarea rows={3} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                  placeholder="Deskripsikan produk yang di-demo..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Grade Product Knowledge <span className="text-red-500">*</span></label>
                <StarRating value={form.grade_product_knowledge} onChange={v => setForm(f => ({ ...f, grade_product_knowledge: v }))} size="lg" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Catatan Grade Product Knowledge</label>
                <textarea rows={2} value={form.catatan_product_knowledge} onChange={e => setForm(f => ({ ...f, catatan_product_knowledge: e.target.value }))}
                  className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none resize-none"
                  placeholder="Catatan opsional..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Foto Dokumentasi</label>
                <ImageUploadField value={form.foto_dokumentasi_url} onChange={url => setForm(f => ({ ...f, foto_dokumentasi_url: url }))} />
              </div>
            </div>
          )}

          {activeTab === 'BAST' && (
            <div className="space-y-4">
              {isDemoProduct ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 font-medium">
                  ⚠️ Trigger dari Reminder: <strong>Demo Product</strong> — BAST tidak diperlukan. Silakan isi tab Demo Product.
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Product <span className="text-red-500">*</span></label>
                    <textarea rows={3} value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none resize-none"
                      placeholder="Deskripsikan produk BAST..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Grade Training Customer <span className="text-red-500">*</span></label>
                    <StarRating value={form.grade_training_customer} onChange={v => setForm(f => ({ ...f, grade_training_customer: v }))} size="lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Catatan Grade Training Customer</label>
                    <textarea rows={2} value={form.catatan_training_customer} onChange={e => setForm(f => ({ ...f, catatan_training_customer: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none resize-none"
                      placeholder="Catatan opsional..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Grade Product Knowledge <span className="text-red-500">*</span></label>
                    <StarRating value={form.grade_product_knowledge} onChange={v => setForm(f => ({ ...f, grade_product_knowledge: v }))} size="lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Catatan Grade Product Knowledge</label>
                    <textarea rows={2} value={form.catatan_product_knowledge} onChange={e => setForm(f => ({ ...f, catatan_product_knowledge: e.target.value }))}
                      className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none resize-none"
                      placeholder="Catatan opsional..." />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">Foto Dokumentasi</label>
                    <ImageUploadField value={form.foto_dokumentasi_url} onChange={url => setForm(f => ({ ...f, foto_dokumentasi_url: url }))} />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0 bg-slate-50/50">
          <button onClick={onClose} className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-xl font-semibold hover:bg-slate-100 transition-all text-sm">
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl font-bold text-white text-sm transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2644)' }}
          >
            {saving ? 'Mengirim...' : '📤 Submit Review'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FormReviewPage() {
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [solvedReminders, setSolvedReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<ReviewCategory>('Demo Product');

  const [selectedReview, setSelectedReview] = useState<ReviewRecord | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');

  const [guestReminder, setGuestReminder] = useState<Reminder | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const REVIEW_CATEGORIES_TRIGGER: Record<string, ReviewCategory> = {
    'Demo Product': 'Demo Product',
    'Konfigurasi & Training': 'BAST',
    'Training': 'BAST',
  };

  const notify = (type: 'success' | 'error', msg: string) => {
    setNotification({ type, msg });
    setTimeout(() => setNotification(null), 3500);
  };

  // ── Check if opened via guest link (URL param: ?reminder_id=xxx)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rid = params.get('reminder_id');
    if (rid) {
      fetchReminderForGuest(rid);
    }
  }, []);

  const fetchReminderForGuest = async (rid: string) => {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('id', rid)
      .eq('status', 'done')
      .in('category', ['Demo Product', 'Konfigurasi & Training', 'Training'])
      .single();
    if (!error && data) {
      setGuestReminder(data as Reminder);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    // Fetch reviews
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*')
      .order('created_at', { ascending: false });
    if (reviewData) setReviews(reviewData as ReviewRecord[]);

    // Fetch solved reminders that have trigger categories but no review yet
    const { data: reminderData } = await supabase
      .from('reminders')
      .select('*')
      .eq('status', 'done')
      .in('category', ['Demo Product', 'Konfigurasi & Training', 'Training'])
      .order('created_at', { ascending: false });

    if (reminderData) {
      const existingReminderIds = new Set((reviewData ?? []).map((r: any) => r.reminder_id));
      const pending = (reminderData as Reminder[]).filter(r => !existingReminderIds.has(r.id));
      setSolvedReminders(pending);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    const ch1 = supabase.channel('review-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, () => setTimeout(fetchAll, 400))
      .subscribe();
    const ch2 = supabase.channel('reminder-realtime-review')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reminders' }, () => setTimeout(fetchAll, 400))
      .subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); };
  }, [fetchAll]);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus review ini?')) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (error) { notify('error', 'Gagal menghapus: ' + error.message); return; }
    notify('success', 'Review berhasil dihapus.');
    fetchAll();
  };

  // Filtered list
  const filteredReviews = reviews.filter(r => {
    const matchSearch = !search || [r.project_name, r.sales_name, r.assign_name, r.address].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    const matchCat = filterCategory === 'all' || r.reminder_category === filterCategory;
    return matchSearch && matchCat;
  });

  const displayedReviews = filteredReviews.filter(r =>
    activeTab === 'Demo Product' ? r.review_category === 'Demo Product' : r.review_category === 'BAST'
  );

  const StarDisplay = ({ value }: { value: number }) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <span key={s} className="text-sm" style={{ color: s <= value ? '#f59e0b' : '#e2e8f0' }}>★</span>
      ))}
    </div>
  );

  const getCategoryBadgeStyle = (cat: string) => {
    const styles: Record<string, { bg: string; text: string; border: string }> = {
      'Demo Product': { bg: 'rgba(167,139,250,0.15)', text: '#7c3aed', border: 'rgba(167,139,250,0.4)' },
      'Konfigurasi & Training': { bg: 'rgba(52,211,153,0.15)', text: '#059669', border: 'rgba(52,211,153,0.4)' },
      'Training': { bg: 'rgba(251,191,36,0.15)', text: '#d97706', border: 'rgba(251,191,36,0.4)' },
    };
    return styles[cat] ?? { bg: 'rgba(148,163,184,0.15)', text: '#64748b', border: 'rgba(148,163,184,0.4)' };
  };

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Guest Form Modal */}
      {guestReminder && (
        <GuestFormModal
          reminder={guestReminder}
          onClose={() => setGuestReminder(null)}
          onSaved={() => { fetchAll(); setGuestReminder(null); }}
        />
      )}

      {/* Review Detail/Edit Modal */}
      {selectedReview && (
        <ReviewModal
          record={selectedReview}
          mode={modalMode}
          onClose={() => setSelectedReview(null)}
          onSaved={fetchAll}
        />
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 shadow-md" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
        <div className="px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: 'rgba(255,255,255,0.1)' }}>
              ⭐
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Form Review</h1>
              <p className="text-white/50 text-xs">Demo Produk & BAST · Platform Survey Team</p>
            </div>
          </div>
          {/* Stats */}
          <div className="flex items-center gap-3">
            {solvedReminders.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold animate-pulse"
                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5' }}>
                🔔 {solvedReminders.length} Menunggu Review
              </div>
            )}
            <div className="px-3 py-1.5 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)' }}>
              Total: {reviews.length}
            </div>
          </div>
        </div>
      </div>

      {/* Global Notification */}
      {notification && (
        <div className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2 ${notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}
          style={{ animation: 'slideIn 0.2s ease' }}>
          {notification.type === 'success' ? '✅' : '❌'} {notification.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Pending Reviews Section */}
        {solvedReminders.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-500 animate-pulse">🔴</span>
              <h2 className="text-sm font-bold text-slate-700 uppercase tracking-widest">Menunggu Review ({solvedReminders.length})</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {solvedReminders.map(rem => {
                const catStyle = getCategoryBadgeStyle(rem.category);
                const projectName = rem.project_name || rem.title || 'Tanpa Nama';
                const guestLink = `${typeof window !== 'undefined' ? window.location.origin : ''}/form-review?reminder_id=${rem.id}`;
                return (
                  <div key={rem.id} className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden hover:shadow-md transition-all"
                    style={{ borderLeft: '4px solid #f59e0b' }}>
                    <div className="px-4 py-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-bold text-slate-800 text-sm leading-tight flex-1">{projectName}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}>
                          {rem.category}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-slate-500">
                        <p>📍 {rem.address || '—'}</p>
                        <p>👤 {rem.sales_name} · {rem.sales_division}</p>
                        <p>🔧 {rem.assign_name}</p>
                      </div>
                    </div>
                    <div className="px-4 pb-3 flex gap-2">
                      <button
                        onClick={() => setGuestReminder(rem)}
                        className="flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
                        style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2644)' }}
                      >
                        ✍️ Isi Review
                      </button>
                      <button
                        onClick={() => { navigator.clipboard.writeText(guestLink); notify('success', 'Link disalin!'); }}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all"
                        title="Salin guest link"
                      >
                        🔗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-5">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari project, sales, handler..."
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-slate-200 focus:border-slate-400 outline-none bg-slate-50"
              />
            </div>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-700 bg-slate-50 focus:ring-2 focus:ring-slate-200 outline-none font-medium"
            >
              <option value="all">Semua Kategori</option>
              <option value="Demo Product">Demo Product</option>
              <option value="Konfigurasi & Training">Konfigurasi & Training</option>
              <option value="Training">Training</option>
            </select>
          </div>

          {/* Category Tab Switch */}
          <div className="flex gap-2 mt-4">
            {(['Demo Product', 'BAST'] as ReviewCategory[]).map(cat => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className="px-5 py-2 rounded-xl text-sm font-bold transition-all"
                style={activeTab === cat
                  ? { background: '#0f172a', color: '#fff', boxShadow: '0 2px 8px rgba(15,23,42,0.25)' }
                  : { background: 'rgba(0,0,0,0.04)', color: '#64748b', border: '1px solid rgba(0,0,0,0.08)' }
                }
              >
                {cat === 'Demo Product' ? '🖥️' : '🎓'} {cat}
                <span className="ml-2 text-[11px] opacity-70">
                  ({reviews.filter(r => r.review_category === cat && (filterCategory === 'all' || r.reminder_category === filterCategory)).length})
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : displayedReviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <span className="text-5xl mb-3">📋</span>
              <p className="font-semibold text-sm">Belum ada review {activeTab}</p>
              <p className="text-xs mt-1">Review akan muncul otomatis saat Reminder berstatus Done</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100" style={{ background: 'rgba(15,23,42,0.03)' }}>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Project</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sales / Divisi</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Handler</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Kategori</th>
                    {activeTab === 'BAST' && (
                      <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grade Training</th>
                    )}
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Grade PK</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Foto</th>
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tgl</th>
                    <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayedReviews.map(r => {
                    const catStyle = getCategoryBadgeStyle(r.reminder_category);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-slate-800 text-sm leading-tight max-w-[160px] truncate">{r.project_name}</p>
                          <p className="text-xs text-slate-400 truncate max-w-[160px]">📍 {r.address}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-700 truncate max-w-[120px]">{r.sales_name}</p>
                          <p className="text-xs text-slate-400">{r.sales_division}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700 truncate max-w-[120px]">{r.assign_name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold px-2 py-1 rounded-full"
                            style={{ background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}` }}>
                            {r.reminder_category}
                          </span>
                        </td>
                        {activeTab === 'BAST' && (
                          <td className="px-4 py-3">
                            {r.grade_training_customer ? (
                              <div>
                                <StarDisplay value={r.grade_training_customer} />
                                <p className="text-[10px] text-slate-400 mt-0.5 max-w-[100px] truncate">{r.catatan_training_customer}</p>
                              </div>
                            ) : <span className="text-slate-300 text-xs">—</span>}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          <StarDisplay value={r.grade_product_knowledge} />
                          <p className="text-[10px] text-slate-400 mt-0.5 max-w-[100px] truncate">{r.catatan_product_knowledge}</p>
                        </td>
                        <td className="px-4 py-3">
                          {r.foto_dokumentasi_url ? (
                            <a href={r.foto_dokumentasi_url} target="_blank" rel="noopener noreferrer">
                              <img src={r.foto_dokumentasi_url} alt="foto" className="w-10 h-10 rounded-lg object-cover border border-slate-200 hover:opacity-80 transition-opacity" />
                            </a>
                          ) : (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-slate-500 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' })}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-center">
                            {/* View */}
                            <button
                              onClick={() => { setSelectedReview(r); setModalMode('view'); }}
                              title="Lihat Detail"
                              className="p-2 rounded-lg hover:bg-blue-50 text-blue-500 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                            </button>
                            {/* Edit */}
                            <button
                              onClick={() => { setSelectedReview(r); setModalMode('edit'); }}
                              title="Edit Review"
                              className="p-2 rounded-lg hover:bg-amber-50 text-amber-500 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            {/* Delete */}
                            <button
                              onClick={() => handleDelete(r.id)}
                              title="Hapus Review"
                              className="p-2 rounded-lg hover:bg-red-50 text-red-400 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
