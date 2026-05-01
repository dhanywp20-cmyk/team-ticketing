'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string; username: string; password: string;
  full_name: string; role: string; team_type?: string;
  sales_division?: string; allowed_menus?: string[];
}

interface MenuItem {
  title: string; icon: string; gradient: string;
  description: string; key: string;
  items: { name: string; url: string; icon: string; external?: boolean; embed?: boolean; internal?: boolean }[];
}

// ─── detect mobile ────────────────────────────────────────────────────────────
function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return mobile;
}

const ALL_MENUS: MenuItem[] = [
  {
    title: 'Reminder Schedule', icon: '📅', key: 'reminder-schedule',
    gradient: 'from-rose-600 to-rose-500',
    description: 'Jadwal dan pengingat tim',
    items: [{ name: 'Reminder Schedule', url: '/reminder-schedule', icon: '📅', internal: true, embed: true }],
  },
  {
    title: 'Ticketing', icon: '🎫', key: 'ticketing',
    gradient: 'from-red-700 to-red-500',
    description: 'Ticket troubleshooting & tracking',
    items: [{ name: 'Ticket Troubleshooting', url: '/ticketing', icon: '🎫', internal: true, embed: true }],
  },
  {
    title: 'Form Require Project', icon: '📋', key: 'form-require',
    gradient: 'from-violet-700 to-violet-500',
    description: 'Request form untuk Project Sales',
    items: [{ name: 'Form Require Project', url: '/form-require-project', icon: '📋', internal: true, embed: true }],
  },
  {
    title: 'Form Review', icon: '⭐', key: 'form-review',
    gradient: 'from-amber-600 to-amber-400',
    description: 'Review dan penilaian tim',
    items: [{ name: 'Form Review', url: '/form-review', icon: '⭐', internal: true, embed: true }],
  },
  {
    title: 'Unit Movement Log', icon: '🚚', key: 'unit-movement',
    gradient: 'from-amber-700 to-amber-500',
    description: 'Equipment check-in & check-out tracking',
    items: [{ name: 'Unit Movement Log', url: '/unit-movement', icon: '🚚', internal: true, embed: true }],
  },
];

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────
function MobileBottomNav({ active, menus, onSelect, onHome }: {
  active: string | null; menus: MenuItem[];
  onSelect: (key: string) => void; onHome: () => void;
}) {
  const shown = menus.slice(0, 4);
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex border-t"
      style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)', borderColor: 'rgba(0,0,0,0.1)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {/* Home */}
      <button onClick={onHome} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors"
        style={{ color: active === null ? '#dc2626' : '#94a3b8' }}>
        <span style={{ fontSize: 20 }}>🏠</span>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.04em' }}>Home</span>
      </button>
      {shown.map(m => (
        <button key={m.key} onClick={() => onSelect(m.key)}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors relative"
          style={{ color: active === m.key ? '#dc2626' : '#94a3b8' }}>
          {active === m.key && (
            <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: '#dc2626' }} />
          )}
          <span style={{ fontSize: 18 }}>{m.icon}</span>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.03em', textAlign: 'center', lineHeight: 1.2 }}>
            {m.title.split(' ')[0]}
          </span>
        </button>
      ))}
      {/* More — if menus > 4 */}
      {menus.length > 4 && (
        <button onClick={() => onSelect('__more__')}
          className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5"
          style={{ color: '#94a3b8' }}>
          <span style={{ fontSize: 20 }}>⋯</span>
          <span style={{ fontSize: 9, fontWeight: 700 }}>More</span>
        </button>
      )}
    </div>
  );
}

// ─── Mobile Header ────────────────────────────────────────────────────────────
function MobileHeader({ user, title, onBack, onLogout }: {
  user: User; title?: string; onBack?: () => void; onLogout: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  return (
    <>
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,0,0,0.08)' }}>
        {onBack ? (
          <button onClick={onBack} className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#fee2e2' }}>
            <svg className="w-5 h-5" style={{ color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        ) : (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800 truncate leading-tight">
            {title || 'Work Management Portal'}
          </p>
          <p className="text-[10px] text-slate-500 leading-tight">IndoVisual PTS IVP</p>
        </div>
        <button onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border flex-shrink-0"
          style={{ background: 'rgba(220,38,38,0.06)', borderColor: 'rgba(220,38,38,0.2)' }}>
          <div className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
            {user.full_name?.[0]?.toUpperCase()}
          </div>
          <svg className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
          </svg>
        </button>
      </div>
      {showMenu && (
        <div className="absolute top-16 right-3 z-50 rounded-2xl shadow-2xl overflow-hidden border"
          style={{ background: 'white', borderColor: 'rgba(0,0,0,0.08)', minWidth: 200 }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(0,0,0,0.06)', background: '#fef2f2' }}>
            <p className="font-bold text-sm text-slate-800">{user.full_name}</p>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-500">{user.role}</p>
          </div>
          <button onClick={() => { setShowMenu(false); onLogout(); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Sign Out
          </button>
        </div>
      )}
    </>
  );
}

// ─── Mobile Home Grid ─────────────────────────────────────────────────────────
function MobileHomeGrid({ user, menus, onSelect }: {
  user: User; menus: MenuItem[]; onSelect: (key: string) => void;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam';

  const GRAD_MAP: Record<string, string> = {
    'from-rose-600 to-rose-500':    'linear-gradient(135deg,#e11d48,#f43f5e)',
    'from-red-700 to-red-500':      'linear-gradient(135deg,#b91c1c,#ef4444)',
    'from-violet-700 to-violet-500':'linear-gradient(135deg,#6d28d9,#8b5cf6)',
    'from-amber-600 to-amber-400':  'linear-gradient(135deg,#d97706,#fbbf24)',
    'from-amber-700 to-amber-500':  'linear-gradient(135deg,#b45309,#f59e0b)',
    'from-indigo-700 to-indigo-500':'linear-gradient(135deg,#3730a3,#6366f1)',
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 px-4 pt-4" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Greeting */}
      <div className="mb-5 px-1">
        <p className="text-xs text-slate-500 font-medium">{greeting},</p>
        <h2 className="text-xl font-black text-slate-800">{user.full_name.split(' ')[0]} 👋</h2>
      </div>

      {/* Menu grid 2 cols */}
      <div className="grid grid-cols-2 gap-3">
        {menus.map((menu) => {
          const bg = GRAD_MAP[menu.gradient] ?? 'linear-gradient(135deg,#dc2626,#b91c1c)';
          return (
            <button key={menu.key} onClick={() => onSelect(menu.key)}
              className="rounded-2xl overflow-hidden text-left transition-all active:scale-95"
              style={{ background: bg, boxShadow: '0 4px 16px rgba(0,0,0,0.15)' }}>
              <div className="p-4 relative overflow-hidden">
                {/* decorative circle */}
                <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white opacity-10"/>
                <div className="text-3xl mb-2">{menu.icon}</div>
                <p className="text-white font-bold text-sm leading-tight">{menu.title}</p>
                <p className="text-white/70 text-[11px] mt-1 leading-tight line-clamp-2">{menu.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <p className="text-center text-[10px] text-slate-400 mt-8 pb-2">
        © 2026 IndoVisual — Work Management Support (PTS IVP)
      </p>
    </div>
  );
}

// ─── Mobile WebView (fullscreen iframe) ──────────────────────────────────────
function MobileWebView({ url, title, isInternal, onBack }: {
  url: string; title: string; isInternal: boolean; onBack: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const fullUrl = isInternal ? (typeof window !== 'undefined' ? window.location.origin + url : url) : url;

  return (
    <div className="flex flex-col" style={{ height: '100dvh' }}>
      {/* Minimal back bar */}
      <div className="flex items-center gap-3 px-4 py-3 flex-shrink-0 border-b"
        style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(12px)', borderColor: 'rgba(0,0,0,0.08)' }}>
        <button onClick={onBack}
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#fee2e2' }}>
          <svg className="w-4 h-4" style={{ color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7"/>
          </svg>
        </button>
        <p className="font-bold text-sm text-slate-800 flex-1 truncate">{title}</p>
        {!loaded && (
          <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ border: '2px solid #fca5a5', borderTopColor: '#dc2626', animation: 'spin 0.7s linear infinite' }}/>
        )}
      </div>
      {/* iframe fills rest */}
      <iframe
        src={fullUrl}
        className="flex-1 w-full border-0"
        style={{ height: '100%' }}
        onLoad={() => setLoaded(true)}
        allow="camera; microphone; geolocation"
      />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

// ─── Login Screen Mobile ──────────────────────────────────────────────────────
function MobileLogin({ onLogin }: { onLogin: (u: User) => void }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [regForm, setRegForm] = useState({ full_name: '', username: '', password: '', confirm_password: '', sales_division: '' });
  const [regLoading, setRegLoading] = useState(false);
  const [regDone, setRegDone] = useState(false);

  const doLogin = async () => {
    if (!form.username || !form.password) { alert('Isi username dan password!'); return; }
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').eq('username', form.username).eq('password', form.password).single();
    setLoading(false);
    if (error || !data) { alert('Username atau password salah!'); return; }
    if (data.team_type === 'Pending Approval') { alert('Akun masih menunggu persetujuan admin.'); return; }
    localStorage.setItem('currentUser', JSON.stringify(data));
    localStorage.setItem('loginTime', Date.now().toString());
    onLogin(data);
  };

  const doRegister = async () => {
    const { full_name, username, password, confirm_password, sales_division } = regForm;
    if (!full_name || !username || !password) { alert('Semua field wajib diisi!'); return; }
    if (password !== confirm_password) { alert('Password tidak cocok!'); return; }
    setRegLoading(true);
    const { data: exist } = await supabase.from('users').select('id').eq('username', username).maybeSingle();
    if (exist) { alert('Username sudah dipakai!'); setRegLoading(false); return; }
    const { error } = await supabase.from('users').insert([{ full_name, username, password, role: 'guest', sales_division, team_type: 'Pending Approval', allowed_menus: [] }]);
    setRegLoading(false);
    if (error) { alert('Registrasi gagal: ' + error.message); return; }
    setRegDone(true);
  };

  const inp = "w-full px-4 py-3.5 rounded-2xl text-sm border outline-none transition-all bg-white/80";
  const inpStyle = { borderColor: 'rgba(220,38,38,0.25)', boxShadow: 'none' };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg,#1a0505 0%,#0f172a 100%)' }}>
      {/* Top hero */}
      <div className="flex flex-col items-center pt-16 pb-8 px-6">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 shadow-2xl"
          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 8px 32px rgba(220,38,38,0.4)' }}>
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <h1 className="text-white font-black text-2xl text-center">Work Management</h1>
        <p className="text-white/50 text-sm font-medium mt-1">IndoVisual PTS IVP</p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl px-6 pt-6 pb-10">
        {/* Tab */}
        <div className="flex gap-1 p-1 rounded-2xl mb-6" style={{ background: '#f1f5f9' }}>
          {(['login','register'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={tab === t ? { background: 'white', color: '#dc2626', boxShadow: '0 1px 6px rgba(0,0,0,0.1)' } : { color: '#94a3b8' }}>
              {t === 'login' ? 'Masuk' : 'Daftar'}
            </button>
          ))}
        </div>

        {tab === 'login' ? (
          <div className="space-y-3">
            <input className={inp} style={inpStyle} placeholder="Username" value={form.username}
              onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && doLogin()} autoCapitalize="none"/>
            <input type="password" className={inp} style={inpStyle} placeholder="Password" value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && doLogin()}/>
            <button onClick={doLogin} disabled={loading}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white mt-2 transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.35)' }}>
              {loading ? 'Memuat...' : 'Masuk →'}
            </button>
          </div>
        ) : regDone ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="font-bold text-slate-800 text-lg">Pendaftaran Berhasil!</h3>
            <p className="text-slate-500 text-sm mt-2">Akun menunggu persetujuan admin. Anda akan dihubungi segera.</p>
            <button onClick={() => { setTab('login'); setRegDone(false); }}
              className="mt-6 px-6 py-3 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>Ke Halaman Login</button>
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { key: 'full_name', ph: 'Nama Lengkap' },
              { key: 'username', ph: 'Username / Email' },
              { key: 'password', ph: 'Password (min 6 karakter)', type: 'password' },
              { key: 'confirm_password', ph: 'Konfirmasi Password', type: 'password' },
            ].map(f => (
              <input key={f.key} type={f.type ?? 'text'} className={inp} style={inpStyle}
                placeholder={f.ph} value={(regForm as any)[f.key]}
                onChange={e => setRegForm(p => ({ ...p, [f.key]: e.target.value }))}
                autoCapitalize={f.key === 'full_name' ? 'words' : 'none'}/>
            ))}
            <select className={inp} style={{ ...inpStyle, color: regForm.sales_division ? '#0f172a' : '#94a3b8' }}
              value={regForm.sales_division} onChange={e => setRegForm(p => ({ ...p, sales_division: e.target.value }))}>
              <option value="">Pilih Divisi Sales</option>
              {['SGP','BSD','Bogor','Bandung','Surabaya','Medan','Makassar','Bali','Lainnya'].map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <button onClick={doRegister} disabled={regLoading}
              className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.35)' }}>
              {regLoading ? 'Mendaftar...' : 'Daftar Sekarang →'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const isMobile = useIsMobile();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visibleMenus, setVisibleMenus] = useState<MenuItem[]>([]);

  // Mobile state
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [activeMenu, setActiveMenu] = useState<MenuItem | null>(null);

  // Desktop state (existing — preserved)
  const [showSidebar, setShowSidebar] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [showTicketing, setShowTicketing] = useState(false);
  const [internalUrl, setInternalUrl] = useState('/ticketing');
  const [iframeTitle, setIframeTitle] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    const savedTime = localStorage.getItem('loginTime');
    if (saved) {
      if (savedTime && Date.now() - parseInt(savedTime) > 6 * 60 * 60 * 1000) {
        localStorage.removeItem('currentUser'); localStorage.removeItem('loginTime');
        setLoading(false); return;
      }
      const u: User = JSON.parse(saved);
      setCurrentUser(u); setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role?.toLowerCase();
    const allowed = currentUser.allowed_menus;
    if (!allowed || role === 'superadmin' || role === 'admin') {
      setVisibleMenus(ALL_MENUS);
    } else {
      setVisibleMenus(ALL_MENUS.filter(m => allowed.includes(m.key)));
    }
  }, [currentUser]);

  const handleLogout = () => {
    setIsLoggedIn(false); setCurrentUser(null);
    localStorage.removeItem('currentUser'); localStorage.removeItem('loginTime');
    setActiveKey(null); setActiveMenu(null);
    setShowSidebar(false); setIframeUrl(null);
  };

  const handleMobileSelect = (key: string) => {
    const menu = visibleMenus.find(m => m.key === key);
    if (!menu) return;
    setActiveKey(key);
    setActiveMenu(menu);
  };

  // ─── Loading ───────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg,#1a0505,#0f172a)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl"
          style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)' }}>
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
          </svg>
        </div>
        <div className="w-8 h-8 rounded-full" style={{ border: '3px solid rgba(220,38,38,0.25)', borderTopColor: '#dc2626', animation: 'spin 0.8s linear infinite' }}/>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  // ─── Login ─────────────────────────────────────────────────────────────────
  if (!isLoggedIn) return <MobileLogin onLogin={u => { setCurrentUser(u); setIsLoggedIn(true); }}/>;

  // ─── MOBILE LAYOUT ─────────────────────────────────────────────────────────
  if (isMobile) {
    // If user tapped a menu → show fullscreen webview
    if (activeMenu) {
      const item = activeMenu.items[0];
      return (
        <MobileWebView
          url={item.url}
          title={activeMenu.title}
          isInternal={!!item.internal}
          onBack={() => { setActiveKey(null); setActiveMenu(null); }}
        />
      );
    }

    // Home screen
    return (
      <div className="flex flex-col bg-slate-50" style={{ height: '100dvh', overflow: 'hidden' }}>
        <div className="relative flex-shrink-0">
          <MobileHeader user={currentUser!} onLogout={handleLogout}/>
        </div>
        <MobileHomeGrid user={currentUser!} menus={visibleMenus} onSelect={handleMobileSelect}/>
        <MobileBottomNav
          active={activeKey}
          menus={visibleMenus}
          onSelect={handleMobileSelect}
          onHome={() => { setActiveKey(null); setActiveMenu(null); }}
        />
      </div>
    );
  }

  // ─── DESKTOP LAYOUT (existing behavior preserved) ──────────────────────────
  // NOTE: Paste your EXISTING desktop return JSX below this line.
  // The mobile detection above means mobile users never reach this code.
  // This is just a fallback placeholder — replace with your full desktop JSX.
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <p className="text-slate-500 text-sm">Desktop layout — paste existing JSX here.</p>
    </div>
  );
}
