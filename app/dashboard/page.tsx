'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface User {
  id: string;
  username: string;
  password: string;
  full_name: string;
  role: string;
}

interface MenuItem {
  title: string;
  icon: string;
  gradient: string;
  description: string;
  items: {
    name: string;
    url: string;
    icon: string;
    external?: boolean;
    embed?: boolean;
    internal?: boolean;
  }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  
  const [showSidebar, setShowSidebar] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeTitle, setIframeTitle] = useState<string>('');
  const [showTicketing, setShowTicketing] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    {
      title: 'Form BAST & Demo',
      icon: '📋',
      gradient: 'from-slate-700 via-slate-600 to-slate-500',
      description: 'Product review & handover documentation',
      items: [
        {
          name: 'Submit Form',
          url: 'https://portal.indovisual.co.id/form-review-demo-produk-bast-pts/',
          icon: '✍️',
          embed: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/1hIpMsZIadnJu85FiJ5Qojn_fOcYLl3iMsBagzZI4LYM/edit?usp=sharing',
          icon: '📑',
          embed: true
        }
      ]
    },
    {
      title: 'Ticket Troubleshooting',
      icon: '🎫',
      gradient: 'from-rose-700 via-rose-600 to-rose-500',
      description: 'Technical support & issue tracking',
      items: [
        {
          name: 'Ticket Management',
          url: '/ticketing',
          icon: '🔧',
          internal: true,
          embed: true
        }
      ]
    },
    {
      title: 'Daily Report',
      icon: '📈',
      gradient: 'from-emerald-700 via-emerald-600 to-emerald-500',
      description: 'Activity tracking & performance metrics',
      items: [
        {
          name: 'Submit Report',
          url: 'https://docs.google.com/forms/d/e/1FAIpQLSf2cCEPlQQcCR1IZ3GRx-ImgdJJ15rMxAoph77aNYmbl15gvw/viewform?embedded=true', 
          icon: '✍️',
          embed: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/19lriAzgdlhDotDFQaasLhtiyPyyICisikIfJMZekrsA/edit?usp=sharing',
          icon: '📑',
          embed: true
        },
        {
          name: 'View Summary',
          url: 'https://1drv.ms/x/c/25d404c0b5ee2b43/IQCJgi4jzvzqR6FWF5SHnmK8ASY5gGnpq_9QNyTXzkOh1HQ?e=KTJqG6',
          icon: '📊',
          embed: false,
          external: true
        }
      ]
    },
    {
      title: 'Database PTS',
      icon: '💼',
      gradient: 'from-indigo-700 via-indigo-600 to-indigo-500',
      description: 'Central repository & documentation',
      items: [
        {
          name: 'Access Database',
          url: 'https://1drv.ms/f/c/25d404c0b5ee2b43/IgBDK-61wATUIIAlAgQAAAAAARPyRqbKPJAap5G_Ol5NmA8?e=fFU8wh',
          icon: '🗄',
          embed: false
        }
      ]
    },
    {
      title: 'Unit Movement Log',
      icon: '🚚',
      gradient: 'from-amber-700 via-amber-600 to-amber-500',
      description: 'Equipment check-in & check-out tracking',
      items: [
        {
          name: 'Submit Movement',
          url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnfNZ1y96xei0KdMDewxGRr2nALwA0ZLW-kKPyGh5_YhK4HA/viewform?embedded=true',
          icon: '✍️',
          embed: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/1AO9-kBblzEst-z2_wGnMQe6EEK8CgwY3ABI9otG1Y8s/edit?usp=sharing',
          icon: '📑',
          embed: true
        }
      ]
    }
  ];

  const handleLogin = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', loginForm.username)
        .eq('password', loginForm.password)
        .single();

      if (error || !data) {
        alert('Username atau password salah!');
        return;
      }

      setCurrentUser(data);
      setIsLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(data));
    } catch (err) {
      alert('Login gagal!');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
    setShowSidebar(false);
    setIframeUrl(null);
    setShowTicketing(false);
    router.push('/dashboard');
  };

  const handleMenuClick = (item: MenuItem['items'][0], menuTitle: string) => {
    setIframeUrl(null);
    setShowTicketing(false);

    if (item.internal) {
      setShowSidebar(true);
      setShowTicketing(true);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    } else if (item.external && !item.embed) {
      window.open(item.url, '_blank');
    } else if (item.embed) {
      setShowSidebar(true);
      setIframeUrl(item.url);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    }
  };

  const handleBackToDashboard = () => {
    setShowSidebar(false);
    setIframeUrl(null);
    setShowTicketing(false);
    setIframeTitle('');
  };

  useEffect(() => {
    const saved = localStorage.getItem('currentUser');
    if (saved) {
      const user = JSON.parse(saved);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/95 backdrop-blur-sm p-12 rounded-lg shadow-2xl border border-slate-200">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 border-4 border-slate-300 border-t-rose-600 rounded-full animate-spin"></div>
            <p className="text-lg font-medium text-slate-700 tracking-wide">Loading Portal...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed p-4" 
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-2xl p-10 w-full max-w-md border border-slate-200">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-rose-600 to-rose-700 rounded-full mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">
              Portal Terpadu
            </h1>
            <p className="text-slate-600 font-medium">Support System - IndoVisual</p>
          </div>
          
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">USERNAME</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-slate-700 tracking-wide">PASSWORD</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border border-slate-300 rounded-md px-4 py-3 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 transition-all bg-white text-slate-800 font-medium"
                placeholder="Enter your password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-rose-600 to-rose-700 text-white py-4 rounded-md hover:from-rose-700 hover:to-rose-800 font-semibold shadow-lg hover:shadow-xl transition-all tracking-wide"
            >
              Sign In to Portal
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD UTAMA
  if (!showSidebar) {
    return (
      <div className="min-h-screen p-6 md:p-8 bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="max-w-[1600px] mx-auto">
          {/* Header */}
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl p-8 mb-8 border border-slate-200">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-6">
              <div className="flex items-center gap-6">
                <div className="hidden md:block w-16 h-16 bg-gradient-to-br from-rose-600 to-rose-700 rounded-lg shadow-lg flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-slate-800 mb-1 tracking-tight">
                    Portal Dashboard
                  </h1>
                  <p className="text-slate-600 font-medium">Support System - IndoVisual Professional Tools</p>
                  <p className="text-sm text-slate-500 mt-2">
                    Welcome back, <span className="font-semibold text-rose-600">{currentUser?.full_name}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-slate-700 hover:bg-slate-800 text-white px-8 py-3 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 justify-center"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>

          {/* Welcome Banner */}
          <div className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 rounded-lg shadow-xl p-8 mb-8 text-white border border-slate-700 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight">Welcome to Your Portal</h2>
              </div>
              <p className="text-white/90 text-lg font-medium">
                Access all your essential tools and resources in one centralized platform. Select a module below to begin.
              </p>
            </div>
          </div>

          {/* Main Menu Grid - WIDER LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {menuItems.map((menu, index) => (
              <div
                key={index}
                className="bg-white/95 backdrop-blur-sm rounded-lg shadow-xl border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] group"
                style={{ 
                  animation: `fadeInUp 0.5s ease-out ${index * 100}ms both`
                }}
              >
                {/* Menu Header */}
                <div className={`bg-gradient-to-r ${menu.gradient} p-6 text-white relative overflow-hidden`}>
                  <div className="absolute top-0 right-0 text-8xl opacity-10 -mr-4 -mt-4 transition-transform group-hover:scale-110 duration-300">
                    {menu.icon}
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="text-4xl">{menu.icon}</div>
                      <h3 className="text-xl font-bold tracking-tight">{menu.title}</h3>
                    </div>
                    <p className="text-white/90 text-sm font-medium">{menu.description}</p>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-6 space-y-3">
                  {menu.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={() => handleMenuClick(item, menu.title)}
                      className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-800 px-6 py-4 rounded-md font-semibold shadow-sm hover:shadow-md transition-all text-left flex items-center gap-4 group/item"
                    >
                      <div className="w-10 h-10 bg-white rounded-md shadow-sm flex items-center justify-center text-xl border border-slate-200 group-hover/item:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <span className="flex-1 tracking-wide">{item.name}</span>
                      {item.external && !item.embed ? (
                        <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-slate-400 transition-transform group-hover/item:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-12 text-center">
            <div className="inline-block bg-white/90 backdrop-blur-sm border border-slate-200 rounded-md px-8 py-4 shadow-lg">
              <p className="text-slate-700 text-sm font-semibold tracking-wide">
                © 2026 IndoVisual - Portal Terpadu Support (PTS IVP)
              </p>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </div>
    );
  }

  // VIEW DENGAN SIDEBAR
  return (
    <div className="flex h-screen overflow-hidden bg-cover bg-center bg-fixed" 
         style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      
      {/* Sidebar Navigation */}
      <div className={`bg-white/95 backdrop-blur-sm shadow-2xl transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-80'
      } flex flex-col border-r border-slate-200`}>
        
        {/* Sidebar Header */}
        <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-700 to-slate-600">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white tracking-tight">PTS Portal</h2>
                <p className="text-xs text-white/80 font-medium">{currentUser?.full_name}</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-md transition-all"
            >
              {sidebarCollapsed ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Sidebar Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {/* Dashboard Home Button */}
          <button
            onClick={handleBackToDashboard}
            className={`w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white p-4 rounded-md font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-3 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {!sidebarCollapsed && <span>Dashboard Home</span>}
          </button>

          {menuItems.map((menu, index) => (
            <div key={index} className="space-y-1">
              {/* Menu Title */}
              {!sidebarCollapsed && (
                <div className={`bg-gradient-to-r ${menu.gradient} text-white px-4 py-2 rounded-md font-semibold text-sm flex items-center gap-2 shadow-sm`}>
                  <span className="text-lg">{menu.icon}</span>
                  <span className="tracking-wide">{menu.title}</span>
                </div>
              )}
              
              {/* Menu Items */}
              {menu.items.map((item, itemIndex) => {
                const isActive = (showTicketing && item.internal) || (iframeUrl === item.url);
                return (
                  <button
                    key={itemIndex}
                    onClick={() => handleMenuClick(item, menu.title)}
                    className={`w-full bg-slate-50 hover:bg-slate-100 border text-slate-800 p-3 rounded-md font-medium shadow-sm transition-all flex items-center gap-3 ${
                      sidebarCollapsed ? 'justify-center text-xl' : ''
                    } ${isActive ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-200' : 'border-slate-200 hover:border-slate-300'}`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <span className="text-lg">{item.icon}</span>
                    {!sidebarCollapsed && <span className="text-sm tracking-wide">{item.name}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={handleLogout}
            className={`w-full bg-slate-700 hover:bg-slate-800 text-white p-4 rounded-md font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-3 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!sidebarCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bar */}
        <div className="bg-white/95 backdrop-blur-sm shadow-lg p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
                {iframeTitle}
              </h1>
              <p className="text-sm text-slate-600 font-medium mt-1">
                Use the sidebar to navigate or return to the dashboard
              </p>
            </div>
            <button
              onClick={handleBackToDashboard}
              className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-800 hover:to-slate-700 text-white px-6 py-3 rounded-md font-semibold shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-white">
          {showTicketing ? (
            <div className="w-full h-full overflow-auto">
              <iframe
                src="/ticketing"
                className="w-full h-full border-0"
                title="Ticketing System"
              />
            </div>
          ) : iframeUrl ? (
            <iframe
              src={iframeUrl}
              className="w-full h-full border-0"
              title={iframeTitle}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
