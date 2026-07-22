import React, { useEffect, useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { onSnapshot, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  UtensilsCrossed, 
  ShoppingCart, 
  History, 
  LogOut, 
  LayoutDashboard, 
  Menu as MenuIcon, 
  DollarSign, 
  Bell,
  Download,
  User as UserIcon,
  Share2,
  PlusSquare,
  X,
  Smartphone,
  Laptop
} from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logoUrl?: string }>({
    name: "Irmãos Pilar"
  });

  useEffect(() => {
    // Escuta alterações de nome e logo em tempo real
    const unsub = onSnapshot(doc(db, 'settings', 'company_info'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCompanyInfo({
          name: data.name || "Irmãos Pilar",
          logoUrl: data.logoUrl
        });
      }
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });

    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true
      );
    };
    checkStandalone();

    const media = window.matchMedia('(display-mode: standalone)');
    const listener = (e: any) => setIsStandalone(e.matches);
    media.addEventListener('change', listener);

    return () => {
      unsub();
      media.removeEventListener('change', listener);
    };
  }, []);

  const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt || deferredPrompt;
    
    if (promptEvent) {
      promptEvent.prompt();
      try {
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
      } catch (e) {
        console.error(e);
      }
      (window as any).deferredPrompt = null;
      setDeferredPrompt(null);
    } else {
      setShowInstallModal(true);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="min-h-[100dvh] bg-canvas text-text-main flex flex-col md:flex-row font-sans">
      {/* HEADER FOR MOBILE (md:hidden) */}
      <header className="bg-dark text-white h-14 px-4 flex items-center justify-between border-b border-gray-800 md:hidden sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
            {companyInfo.logoUrl ? (
              <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <UtensilsCrossed size={16} />
            )}
          </div>
          <div>
            <h1 className="font-bold text-xs leading-none uppercase tracking-wider">{companyInfo.name}</h1>
            <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">{isAdmin ? "Admin" : "Pedidos"}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {!isStandalone && (
            <button onClick={handleInstallClick} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Instalar App">
              <Download size={18} className="animate-bounce-slow" />
            </button>
          )}
          {user && (
            <button onClick={handleLogout} className="p-1.5 text-gray-400 hover:text-red-400 transition-colors" title="Sair">
              <LogOut size={18} />
            </button>
          )}
        </div>
      </header>

      {/* SIDEBAR FOR DESKTOP (md:flex) */}
      <nav className="bg-dark text-white md:w-64 flex-shrink-0 md:min-h-screen flex-col border-r border-gray-800 hidden md:flex">
        <div className="p-6 flex flex-col items-start border-b border-gray-800 relative w-full">
          <div className="flex items-center space-x-3 font-bold text-xl">
            <div className="w-10 h-10 bg-brand rounded-lg flex items-center justify-center font-bold text-xl text-white overflow-hidden shrink-0">
              {companyInfo.logoUrl ? (
                <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <UtensilsCrossed size={20} />
              )}
            </div>
            <div>
              <h1 className="font-bold leading-tight uppercase tracking-wider text-sm">{companyInfo.name}</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest">{isAdmin ? "Admin Central" : "Pedidos"}</p>
            </div>
          </div>
        </div>

        {user && (
          <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
            {isAdmin ? (
              <>
                <NavLink to="/admin" current={location.pathname} icon={<LayoutDashboard size={18} />} label="Dashboard" />
                <NavLink to="/admin/menu" current={location.pathname} icon={<MenuIcon size={18} />} label="Cardápio" />
                <NavLink to="/admin/finances" current={location.pathname} icon={<DollarSign size={18} />} label="Financeiro" />
              </>
            ) : (
              <>
                <NavLink to="/" current={location.pathname} icon={<MenuIcon size={18} />} label="Fazer Pedido" />
                <NavLink to="/cart" current={location.pathname} icon={
                  <div className="relative">
                    <ShoppingCart size={18} />
                    {items.length > 0 && (
                      <span className="absolute -top-2 -right-2.5 bg-yellow-400 text-red-950 text-[10px] font-black px-1.5 py-0.5 rounded-full line-height-none leading-none">
                        {items.length}
                      </span>
                    )}
                  </div>
                } label="Carrinho" />
                <NavLink to="/orders" current={location.pathname} icon={<History size={18} />} label="Meus Pedidos" />
                <NavLink to="/profile" current={location.pathname} icon={<UserIcon size={18} />} label="Meus Dados" />
              </>
            )}
          </div>
        )}

        {/* Desktop Install / Logout footer */}
        {user && (
          <div className="p-4 border-t border-gray-800">
            {!isStandalone && (
              <button 
                onClick={handleInstallClick}
                className="w-full flex items-center justify-center space-x-2 px-3 py-2 mb-3 rounded-lg bg-brand hover:bg-brand-dark transition-colors"
              >
                <Download size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Instalar App</span>
              </button>
            )}
            <div className="text-[10px] mb-2 px-3 text-gray-500 font-bold uppercase tracking-widest truncate">{user.name}</div>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors text-sm"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        )}
      </nav>

      {/* FIXED BOTTOM NAVIGATION BAR FOR MOBILE (md:hidden) */}
      {user && (
        <nav className="fixed bottom-0 left-0 right-0 bg-dark text-white h-16 border-t border-gray-800 flex justify-around items-center z-50 md:hidden px-2 pb-safe">
          {isAdmin ? (
            <>
              <MobileTabLink to="/admin" current={location.pathname} icon={<LayoutDashboard size={20} />} label="Painel" />
              <MobileTabLink to="/admin/menu" current={location.pathname} icon={<MenuIcon size={20} />} label="Cardápio" />
              <MobileTabLink to="/admin/finances" current={location.pathname} icon={<DollarSign size={20} />} label="Finanças" />
            </>
          ) : (
            <>
              <MobileTabLink to="/" current={location.pathname} icon={<MenuIcon size={20} />} label="Cardápio" />
              <MobileTabLink to="/cart" current={location.pathname} icon={
                <div className="relative">
                  <ShoppingCart size={20} />
                  {items.length > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-yellow-400 text-red-950 text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full leading-none">
                      {items.length}
                    </span>
                  )}
                </div>
              } label="Carrinho" />
              <MobileTabLink to="/orders" current={location.pathname} icon={<History size={20} />} label="Pedidos" />
              <MobileTabLink to="/profile" current={location.pathname} icon={<UserIcon size={20} />} label="Dados" />
            </>
          )}
        </nav>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full relative pb-20 md:pb-0">
        <Outlet />
      </main>

      {/* PWA INSTALLATION INSTRUCTIONAL MODAL */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden text-gray-800 animate-fade-in">
            {/* Modal Header */}
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Download size={18} className="text-brand" />
                <h3 className="font-black text-xs uppercase tracking-widest text-gray-900">Como Instalar o Aplicativo</h3>
              </div>
              <button 
                onClick={() => setShowInstallModal(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 text-xs">
              <p className="text-gray-500 font-medium leading-relaxed">
                Instale nosso aplicativo em sua tela inicial para um acesso super rápido, melhor desempenho e acompanhamento em tempo real dos seus pedidos!
              </p>

              <div className="space-y-4">
                {/* General/Android Instructions */}
                <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-blue-900 font-bold">
                    <Download size={16} className="text-blue-600" />
                    <span>Android / Chrome / Edge</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-blue-800 font-medium">
                    <li>Abra o menu do navegador (ícone de 3 pontos no canto superior direito).</li>
                    <li>Toque em <strong className="font-bold">"Instalar aplicativo"</strong> ou <strong className="font-bold">"Adicionar à Tela inicial"</strong>.</li>
                    <li>Confirme a instalação no botão Instalar.</li>
                  </ol>
                </div>

                {/* iOS Instructions */}
                <div className="border border-amber-100 bg-amber-50/50 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <Smartphone size={16} className="text-amber-600" />
                    <span>iPhone / iPad (Safari)</span>
                  </div>
                  <ol className="list-decimal list-inside space-y-1.5 text-amber-800 font-medium">
                    <li>Abra o link do aplicativo no navegador <strong className="font-bold">Safari</strong>.</li>
                    <li className="inline-flex items-center gap-1 flex-wrap">
                      Toque no botão de <strong className="font-bold flex items-center gap-1 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm text-gray-700 text-[10px]"><Share2 size={10} /> Compartilhar</strong> na barra.
                    </li>
                    <li className="inline-flex items-center gap-1 flex-wrap">
                      Selecione a opção <strong className="font-bold flex items-center gap-1 bg-white border border-gray-200 px-1.5 py-0.5 rounded shadow-sm text-gray-700 text-[10px]"><PlusSquare size={10} /> Adicionar à Tela de Início</strong>.
                    </li>
                    <li>Toque em <strong className="font-bold text-brand">Adicionar</strong> no canto superior direito para concluir!</li>
                  </ol>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100">
                <button
                  onClick={() => setShowInstallModal(false)}
                  className="px-4 py-2 bg-brand text-white font-bold uppercase tracking-wider text-[10px] rounded-lg hover:bg-brand-dark transition-all active:scale-95 shadow-sm"
                >
                  Entendi!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NavLink({ to, current, icon, label }: { to: string, current: string, icon: React.ReactNode, label: string }) {
  const isActive = current === to;
  return (
    <Link 
      to={to} 
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all",
        isActive ? "bg-brand text-white shadow-sm" : "text-gray-400 hover:text-white hover:bg-gray-800/30"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function MobileTabLink({ to, current, icon, label }: { to: string, current: string, icon: React.ReactNode, label: string }) {
  const isActive = current === to;
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center flex-1 h-full py-1 text-center transition-colors gap-0.5",
        isActive ? "text-brand font-bold" : "text-gray-500 font-medium"
      )}
    >
      <div className="p-1 rounded-lg transition-transform active:scale-90">
        {icon}
      </div>
      <span className="text-[9px] uppercase tracking-wider leading-none">{label}</span>
    </Link>
  );
}
