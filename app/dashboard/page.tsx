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
  color: string;
  items: {
    name: string;
    url: string;
    icon: string;
    external?: boolean;
    embed?: boolean;
    internal?: boolean; // Tambahan untuk internal component
  }[];
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(true);
  
  // State untuk content view
  const [showSidebar, setShowSidebar] = useState(false);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [iframeTitle, setIframeTitle] = useState<string>('');
  const [showTicketing, setShowTicketing] = useState(false); // State untuk ticketing
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    {
      title: 'Form BAST & Demo',
      icon: '📝',
      color: 'from-blue-500 to-blue-700',
      items: [
        {
          name: 'Input Form',
          url: 'https://portal.indovisual.co.id/form-review-demo-produk-bast-pts/',
          icon: '✍️',
          embed: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/1hIpMsZIadnJu85FiJ5Qojn_fOcYLl3iMsBagzZI4LYM/edit?usp=sharing',
          icon: '📊',
          embed: true
        }
      ]
    },
    {
      title: 'Ticket Troubleshooting',
      icon: '🎫',
      color: 'from-red-500 to-red-700',
      items: [
        {
          name: 'Ticket',
          url: '/ticketing',
          icon: '🔧',
          internal: true,
          embed: true
        }
      ]
    },
    {
      title: 'Daily Report',
      icon: '📅',
      color: 'from-green-500 to-green-700',
      items: [
        {
          name: 'Input Form',
          url: 'https://docs.google.com/forms/d/e/1FAIpQLSf2cCEPlQQcCR1IZ3GRx-ImgdJJ15rMxAoph77aNYmbl15gvw/viewform?embedded=true', 
          icon: '✍️',
          embed: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/19lriAzgdlhDotDFQaasLhtiyPyyICisikIfJMZekrsA/edit?usp=sharing',
          icon: '📊',
          embed: true
        },
        {
          name: 'View Summary',
          url: 'https://1drv.ms/x/c/25d404c0b5ee2b43/IQCJgi4jzvzqR6FWF5SHnmK8ASY5gGnpq_9QNyTXzkOh1HQ?e=KTJqG6',
          icon: '📈',
          embed: false,
          external: true
        }
      ]
    },
    {
      title: 'Database PTS',
      icon: '💾',
      color: 'from-purple-500 to-purple-700',
      items: [
        {
          name: 'Akses Database',
          url: 'https://1drv.ms/f/c/25d404c0b5ee2b43/IgBDK-61wATUIIAlAgQAAAAAARPyRqbKPJAap5G_Ol5NmA8?e=fFU8wh',
          icon: '🔗',
          embed: true
        }
      ]
    },
    {
      title: 'Keluar/Masuk Unit PTS Room',
      icon: '📥📤',
      color: 'from-orange-500 to-orange-700',
      items: [
        {
          name: 'Input Form',
          url: 'https://docs.google.com/forms/d/e/1FAIpQLSfnfNZ1y96xei0KdMDewxGRr2nALwA0ZLW-kKPyGh5_YhK4HA/viewform?embedded=true', // 
          icon: '✍️',
          embed: true
        },
        {
          name: 'View Database',
          url: 'https://docs.google.com/spreadsheets/d/1AO9-kBblzEst-z2_wGnMQe6EEK8CgwY3ABI9otG1Y8s/edit?usp=sharing',
          icon: '📊',
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
    // Reset states
    setIframeUrl(null);
    setShowTicketing(false);

    if (item.internal) {
      // Internal component (Ticketing system)
      setShowSidebar(true);
      setShowTicketing(true);
      setIframeTitle(`${menuTitle} - ${item.name}`);
    } else if (item.external && !item.embed) {
      // External link - buka tab baru
      window.open(item.url, '_blank');
    } else if (item.embed) {
      // Embed dalam iframe
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
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-red-600 mx-auto"></div>
          <p className="mt-4 font-bold text-center">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl p-8 w-full max-w-md border-4 border-red-600">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-2">
              DASHBOARD
            </h1>
            <p className="text-gray-700 font-bold">Portal Terpadu PTS IVP</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-800">Username</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({...loginForm, username: e.target.value})}
                className="w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all bg-white"
                placeholder="Masukkan username"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-800">Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                className="w-full border-3 border-gray-400 rounded-xl px-4 py-3 focus:border-red-600 focus:ring-4 focus:ring-red-200 transition-all bg-white"
                placeholder="Masukkan password"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white py-4 rounded-xl hover:from-red-700 hover:to-red-900 font-bold shadow-xl transition-all text-lg"
            >
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD UTAMA (Tanpa Sidebar)
  if (!showSidebar) {
    return (
      <div className="min-h-screen p-4 md:p-8 bg-cover bg-center bg-fixed" 
           style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="bg-white/60 backdrop-blur-md rounded-2xl shadow-2xl p-6 mb-8 border-4 border-red-600">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800 mb-2">
                  🏢 Dashboard
                </h1>
                <p className="text-gray-700 font-bold text-lg">Portal Terpadu Support - IndoVisual</p>
                <p className="text-sm text-gray-600 mt-1">
                  Welcome, <span className="font-bold text-red-600">{currentUser?.full_name}</span>
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-gradient-to-r from-red-500 to-red-700 text-white px-6 py-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-xl transition-all"
              >
                🚪 Logout
              </button>
            </div>
          </div>

          {/* Welcome Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-2xl p-8 mb-8 text-white border-4 border-blue-900">
            <h2 className="text-3xl font-bold mb-3">Selamat Datang di Portal PTS IVP! 👋</h2>
            <p className="text-lg opacity-90">
              Pilih menu di bawah untuk mengakses sistem yang Anda butuhkan.
            </p>
          </div>

          {/* Main Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map((menu, index) => (
              <div
                key={index}
                className="bg-white/60 backdrop-blur-md rounded-2xl shadow-xl border-3 border-gray-300 overflow-hidden hover:shadow-2xl transition-all transform hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Menu Header */}
                <div className={`bg-gradient-to-r ${menu.color} p-6 text-white`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-4xl">{menu.icon}</span>
                    <h3 className="text-xl font-bold">{menu.title}</h3>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-6 space-y-3">
                  {menu.items.map((item, itemIndex) => (
                    <button
                      key={itemIndex}
                      onClick={() => handleMenuClick(item, menu.title)}
                      className="w-full bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-800 px-6 py-4 rounded-xl font-bold shadow-md hover:shadow-lg transition-all text-left flex items-center gap-3 border-2 border-gray-300 hover:border-gray-400"
                    >
                      <span className="text-2xl">{item.icon}</span>
                      <span className="flex-1">{item.name}</span>
                      {item.external && !item.embed && (
                        <span className="text-sm text-gray-500">↗</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-white text-sm font-semibold drop-shadow-lg bg-black/30 backdrop-blur-sm rounded-xl px-6 py-3 inline-block">
              © 2026 IndoVisual - Portal Terpadu Support (PTS IVP)
            </p>
          </div>
        </div>

        <style jsx>{`
          @keyframes fade-in {
            from {
              opacity: 0;
              transform: translateY(20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .animate-fade-in {
            animation: fade-in 0.5s ease-out forwards;
            opacity: 0;
          }
        `}</style>
      </div>
    );
  }

  // VIEW DENGAN SIDEBAR (Ketika ada content)
  return (
    <div className="flex h-screen overflow-hidden bg-cover bg-center bg-fixed" 
         style={{ backgroundImage: 'url(/IVP_Background.png)' }}>
      
      {/* Sidebar Navigation */}
      <div className={`bg-white/60 backdrop-blur-md shadow-2xl transition-all duration-300 ${
        sidebarCollapsed ? 'w-20' : 'w-80'
      } flex flex-col border-r-4 border-red-600`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b-2 border-gray-300 bg-gradient-to-r from-red-600 to-red-800">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex-1">
                <h2 className="text-lg font-bold text-white">PTS IVP</h2>
                <p className="text-xs text-white/90">{currentUser?.full_name}</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all"
            >
              {sidebarCollapsed ? '☰' : '✕'}
            </button>
          </div>
        </div>

        {/* Sidebar Menu */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Dashboard Home Button */}
          <button
            onClick={handleBackToDashboard}
            className={`w-full bg-gradient-to-r from-gray-700 to-gray-900 text-white p-3 rounded-xl hover:from-gray-800 hover:to-black font-bold shadow-lg transition-all ${
              sidebarCollapsed ? 'text-center' : 'text-left'
            }`}
          >
            {sidebarCollapsed ? '🏠' : '🏠 Back to Dashboard'}
          </button>

          {menuItems.map((menu, index) => (
            <div key={index} className="space-y-2">
              {/* Menu Title */}
              {!sidebarCollapsed && (
                <div className={`bg-gradient-to-r ${menu.color} text-white px-3 py-2 rounded-lg font-bold text-sm flex items-center gap-2`}>
                  <span>{menu.icon}</span>
                  <span>{menu.title}</span>
                </div>
              )}
              
              {/* Menu Items */}
              {menu.items.map((item, itemIndex) => {
                const isActive = (showTicketing && item.internal) || (iframeUrl === item.url);
                return (
                  <button
                    key={itemIndex}
                    onClick={() => handleMenuClick(item, menu.title)}
                    className={`w-full bg-gray-100 hover:bg-gray-200 text-gray-800 p-3 rounded-lg font-semibold shadow transition-all border-2 border-gray-300 hover:border-gray-400 ${
                      sidebarCollapsed ? 'text-center text-xl' : 'text-left flex items-center gap-2'
                    } ${isActive ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-300' : ''}`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <span>{item.icon}</span>
                    {!sidebarCollapsed && <span className="text-sm">{item.name}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t-2 border-gray-300">
          <button
            onClick={handleLogout}
            className={`w-full bg-gradient-to-r from-red-500 to-red-700 text-white p-3 rounded-xl hover:from-red-600 hover:to-red-800 font-bold shadow-lg transition-all ${
              sidebarCollapsed ? 'text-center' : 'text-left'
            }`}
          >
            {sidebarCollapsed ? '🚪' : '🚪 Logout'}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Top Bar */}
        <div className="bg-white/70 backdrop-blur-md shadow-lg p-4 border-b-4 border-red-600">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-800">
                {iframeTitle}
              </h1>
              <p className="text-sm text-gray-600">
                Gunakan menu kiri untuk navigasi atau kembali ke dashboard
              </p>
            </div>
            <button
              onClick={handleBackToDashboard}
              className="bg-gradient-to-r from-blue-600 to-blue-800 text-white px-6 py-3 rounded-xl hover:from-blue-700 hover:to-blue-900 font-bold shadow-lg transition-all"
            >
              ← Kembali ke Dashboard
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden bg-white">
          {showTicketing ? (
            // Embed Ticketing System as Component
            <div className="w-full h-full overflow-auto">
              <iframe
                src="/ticketing"
                className="w-full h-full border-0"
                title="Ticketing System"
              />
            </div>
          ) : iframeUrl ? (
            // External Iframe
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
