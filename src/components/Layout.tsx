import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { onSnapshot, doc, setDoc, addDoc, collection } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
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
  Laptop,
  AlertTriangle,
  Copy,
  Upload,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { cn, getBillingPauseState, formatCountdown, compressImageToBase64, formatCurrency } from '../lib/utils';
import { BillingInfo, BillingProofType } from '../types';
import { useExitGuard } from '../hooks/useExitGuard';
import CookieConsentBanner from './CookieConsentBanner';

export default function Layout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { items } = useCart();
  const isAdmin = user?.role === 'admin';
  useExitGuard(isAdmin ? '/admin' : '/');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(() => (window as any).deferredPrompt || null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(true);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logoUrl?: string }>({
    name: "Irmãos Pilar"
  });
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [billingLoaded, setBillingLoaded] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'billing'), (snapshot) => {
      setBilling(snapshot.exists() ? (snapshot.data() as BillingInfo) : null);
      setBillingLoaded(true);
    });
    return () => unsub();
  }, []);

  // The first admin to load the app after this billing gate ships starts
  // the 48h launch-fee clock — there's no server-side cron to do this, so
  // it's bootstrapped client-side the first time an admin is present and
  // the doc doesn't exist yet.
  useEffect(() => {
    if (!billingLoaded || billing || !user || user.role !== 'admin') return;
    setDoc(doc(db, 'settings', 'billing'), {
      launchFeePaid: false,
      launchFeeDeadline: Date.now() + 48 * 60 * 60 * 1000,
      launchFeeAmount: 200,
      monthlyFeeAmount: 100,
      nextDueDate: null,
      lastConfirmedPaymentAt: null,
      pixKey: '21990857331',
      pixBeneficiary: 'Rafael Vitor Silva',
      pixBank: 'Infinite Pay',
    }).catch(err => console.error('Failed to bootstrap billing doc', err));
  }, [billingLoaded, billing, user]);

  const pauseState = useMemo(() => getBillingPauseState(billing), [billing]);

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

    const handlePromptAvailable = (e: any) => {
      console.log('PWA: Native install prompt available');
      const event = e.detail || e;
      setDeferredPrompt(event);
      (window as any).deferredPrompt = event;
    };

    const handleAppInstalled = () => {
      console.log('PWA: App installed successfully');
      setIsStandalone(true);
      setShowInstallBanner(false);
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };

    window.addEventListener('pwa-prompt-available', handlePromptAvailable);
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      handlePromptAvailable(e);
    });
    window.addEventListener('appinstalled', handleAppInstalled);

    const checkStandalone = () => {
      setIsStandalone(
        window.matchMedia('(display-mode: standalone)').matches || 
        (window.navigator as any).standalone === true
      );
    };
    checkStandalone();

    const media = window.matchMedia('(display-mode: standalone)');
    const listener = (e: any) => {
      setIsStandalone(e.matches);
      if (e.matches) setShowInstallBanner(false);
    };
    media.addEventListener('change', listener);

    return () => {
      unsub();
      window.removeEventListener('pwa-prompt-available', handlePromptAvailable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      media.removeEventListener('change', listener);
    };
  }, []);

  const isIos = () => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    return /iphone|ipad|ipod/.test(userAgent);
  };

  const handleInstallClick = async () => {
    const promptToUse = deferredPrompt || (window as any).deferredPrompt;

    if (promptToUse) {
      console.log('PWA: Triggering native install prompt...');
      try {
        promptToUse.prompt();
        promptToUse.userChoice.then((choiceResult: any) => {
          console.log(`PWA: User choice result: ${choiceResult.outcome}`);
          if (choiceResult.outcome === 'accepted') {
            setShowInstallBanner(false);
            setDeferredPrompt(null);
            (window as any).deferredPrompt = null;
          }
        });
      } catch (e) {
        console.error('PWA: Error triggering prompt:', e);
      }
    } else if (isIos()) {
      setShowIosInstructions(true);
    } else {
      console.log('PWA: Native install prompt not ready yet or browser manages installation natively.');
      setShowAndroidInstructions(true);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  // Non-admin (customer) access is fully blocked while paused — this is a
  // billing dispute, not something to explain to end customers, so the
  // message stays neutral. Admins keep full access so they can resolve it.
  if (user && !isAdmin && pauseState.paused) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas p-6 text-center">
        <div>
          <div className="w-16 h-16 bg-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed size={28} className="text-gray-400" />
          </div>
          <h1 className="font-black text-lg text-gray-900 uppercase tracking-wide mb-2">Serviço Temporariamente Indisponível</h1>
          <p className="text-sm text-gray-500 font-medium max-w-sm mx-auto">Estamos em manutenção no momento. Pedimos desculpas pelo transtorno — voltamos em breve.</p>
        </div>
      </div>
    );
  }

  const handleLogout = async () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex flex-col min-h-[100dvh]">
      {isAdmin && user && billing && (
        <BillingBanner billing={billing} pauseState={pauseState} user={user} />
      )}

      {/* GLOBAL INSTALL BANNER - Displayed whenever app is accessed via web browser */}
      {user && !isStandalone && showInstallBanner && (
        <div className="bg-brand text-white px-4 py-2.5 flex items-center justify-between shadow-md z-50 sticky top-0 w-full animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-1.5 rounded-lg shrink-0">
              <Download size={18} className="animate-bounce" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider leading-tight">Instale nosso App!</p>
              <p className="text-[9px] text-white/80 font-medium">Acesso rápido e direto na sua tela inicial.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleInstallClick}
              className="bg-white text-brand px-3.5 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-gray-100 transition-all shadow-sm cursor-pointer active:scale-95"
            >
              Instalar
            </button>
            <button 
              onClick={() => setShowInstallBanner(false)} 
              className="p-1 text-white/60 hover:text-white transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* IOS INSTRUCTIONS MODAL */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowIosInstructions(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowIosInstructions(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full">
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Smartphone size={32} className="text-brand" />
            </div>
            
            <h3 className="text-center font-black text-lg text-gray-900 mb-2 uppercase tracking-wide">Instalar no iPhone</h3>
            <p className="text-center text-sm text-gray-500 font-medium mb-8">Para instalar nosso app no seu iPhone ou iPad:</p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-600 text-sm">1</div>
                <div>
                  <p className="text-sm text-gray-800 font-bold">Botão Compartilhar</p>
                  <p className="text-xs text-gray-500 mt-1">Toque no ícone de compartilhar (quadrado com seta para cima) na barra inferior do Safari.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-600 text-sm">2</div>
                <div>
                  <p className="text-sm text-gray-800 font-bold">Adicionar à Tela de Início</p>
                  <p className="text-xs text-gray-500 mt-1">Role a lista para baixo e toque em "Adicionar à Tela de Início".</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowIosInstructions(false)}
              className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-8 hover:bg-brand-dark transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

      {/* ANDROID INSTRUCTIONS MODAL */}
      {showAndroidInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowAndroidInstructions(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAndroidInstructions(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full">
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Smartphone size={32} className="text-brand" />
            </div>
            
            <h3 className="text-center font-black text-lg text-gray-900 mb-2 uppercase tracking-wide">Instalar no Android</h3>
            <p className="text-center text-sm text-gray-500 font-medium mb-8">Para instalar nosso app no seu celular (Recomendamos usar o <strong>Google Chrome</strong>):</p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-600 text-sm">1</div>
                <div>
                  <p className="text-sm text-gray-800 font-bold">Menu do Navegador</p>
                  <p className="text-xs text-gray-500 mt-1">Toque nos três pontinhos verticais (⋮) no canto superior direito do navegador Chrome.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-600 text-sm">2</div>
                <div>
                  <p className="text-sm text-gray-800 font-bold">Instalar Aplicativo</p>
                  <p className="text-xs text-gray-500 mt-1">Selecione "Instalar aplicativo" ou "Adicionar à Tela Inicial".</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowAndroidInstructions(false)}
              className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-8 hover:bg-brand-dark transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}

    <div className="flex-1 bg-canvas text-text-main flex flex-col md:flex-row font-sans relative">

      {/* HEADER FOR MOBILE (md:hidden) */}
      <header className="bg-dark text-white h-14 px-4 flex items-center justify-between border-b border-gray-800 md:hidden sticky top-0 z-40">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center font-bold text-white overflow-hidden shrink-0">
            {companyInfo.logoUrl && !logoError ? (
              <img src={companyInfo.logoUrl} onError={() => setLogoError(true)} alt="Logo" className="w-full h-full object-cover" />
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
              {companyInfo.logoUrl && !logoError ? (
                <img src={companyInfo.logoUrl} onError={() => setLogoError(true)} alt="Logo" className="w-full h-full object-cover" />
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
        </div>
  <CookieConsentBanner />
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

// Persistent, non-dismissable billing status strip shown to every admin on
// every admin page (rendered once in Layout so it can never be closed or
// scrolled away from). Its content and urgency change with billing phase;
// it always carries a way to copy the Pix key and submit a payment proof.
type BillingPhase = 'launch_pending' | 'launch_paused' | 'need_due_date' | 'active_ok' | 'monthly_warning' | 'monthly_paused';

function BillingBanner({ billing, pauseState, user }: {
  billing: BillingInfo;
  pauseState: { paused: boolean; reason: 'launch_fee_overdue' | 'monthly_overdue' | null; deadline: number | null };
  user: { uid: string; name: string; email: string };
}) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState('');
  const [proposedDate, setProposedDate] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyPix = () => {
    navigator.clipboard.writeText(billing.pixKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const phase: BillingPhase = (() => {
    if (!billing.launchFeePaid) {
      return pauseState.paused ? 'launch_paused' : 'launch_pending';
    }
    if (!billing.nextDueDate) return 'need_due_date';
    if (pauseState.paused) return 'monthly_paused';
    const daysLeft = Math.ceil((billing.nextDueDate - Date.now()) / (24 * 60 * 60 * 1000));
    return daysLeft <= 5 ? 'monthly_warning' : 'active_ok';
  })();

  const handleSendProof = async (type: BillingProofType) => {
    setUploading(true);
    try {
      const file = fileInputRef.current?.files?.[0];
      const imageUrl = file ? await compressImageToBase64(file) : null;
      const requestedDueDate = type === 'set_due_date' && proposedDate
        ? new Date(`${proposedDate}T12:00:00`).getTime()
        : null;
      await addDoc(collection(db, 'billingProofs'), sanitizeForFirestore({
        senderId: user.uid,
        senderName: user.name,
        senderEmail: user.email,
        imageUrl,
        note: note.trim() || null,
        requestedDueDate,
        type,
        status: 'pending',
        createdAt: Date.now(),
      }));
      setSent(true);
      setNote('');
      setProposedDate('');
      setFileName('');
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setSent(false), 5000);
    } catch (err) {
      console.error('Failed to send billing proof', err);
    } finally {
      setUploading(false);
    }
  };

  // Calm, informational strip once everything's up to date — no need to
  // grab attention here, just keep the next due date visible.
  if (phase === 'active_ok') {
    const daysLeft = Math.ceil((billing.nextDueDate! - Date.now()) / (24 * 60 * 60 * 1000));
    return (
      <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-2 text-center text-[11px] font-bold text-emerald-800 sticky top-0 z-[70]">
        Próxima mensalidade ({formatCurrency(billing.monthlyFeeAmount)}) vence em {format(billing.nextDueDate!, 'dd/MM/yyyy')} — faltam {daysLeft} dia{daysLeft !== 1 ? 's' : ''}.
      </div>
    );
  }

  const urgent = phase === 'launch_paused' || phase === 'monthly_paused';
  const isMonthly = phase === 'monthly_warning' || phase === 'monthly_paused';
  const amount = isMonthly ? billing.monthlyFeeAmount : billing.launchFeeAmount;
  const label = isMonthly ? 'Mensalidade' : 'Taxa de Lançamento';
  const proofType: BillingProofType = phase === 'need_due_date' ? 'set_due_date' : isMonthly ? 'monthly' : 'launch_fee';

  // Explains, in plain language, exactly why this is showing up — the
  // launch fee is a one-time first payment; from the next monthly cycle
  // onward the same panel reappears for the recurring fee instead.
  const explanation = phase === 'need_due_date'
    ? 'A Taxa de Lançamento já foi confirmada! Agora só falta escolher o dia do mês em que a mensalidade vai vencer a partir de setembro.'
    : isMonthly
    ? `Isso está aparecendo porque a mensalidade de ${formatCurrency(billing.monthlyFeeAmount)} referente ao uso do app ainda não foi confirmada.`
    : `Isso está aparecendo porque a Taxa de Lançamento (pagamento único de ${formatCurrency(billing.launchFeeAmount)} para ativação do app) ainda não foi confirmada. A partir do mês que vem, este aviso passa a ser sobre a mensalidade de ${formatCurrency(billing.monthlyFeeAmount)}.`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="sticky top-0 z-[70]"
      >
        <div className={`relative overflow-hidden border-b-4 ${urgent ? 'bg-gradient-to-r from-red-700 via-red-600 to-red-700 border-red-900' : 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 border-amber-700'}`}>
          {urgent && (
            <motion.div
              className="absolute inset-0 bg-white/10"
              animate={{ opacity: [0, 0.25, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
          <div className="relative max-w-3xl mx-auto px-4 py-4">
            <div className="flex items-start gap-3">
              {/* Attention-grabbing icon with a pinging ring behind it */}
              <div className="relative shrink-0 mt-0.5">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${urgent ? 'bg-white' : 'bg-white'}`}></span>
                <span className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full ${urgent ? 'bg-white text-red-700' : 'bg-white text-amber-600'}`}>
                  {phase === 'need_due_date' ? <Clock size={16} /> : <AlertTriangle size={16} />}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className={`text-sm font-black uppercase tracking-wide leading-tight ${urgent ? 'text-white' : 'text-amber-950'}`}>
                  {phase === 'need_due_date'
                    ? 'Falta escolher o vencimento da mensalidade'
                    : urgent
                    ? `App Pausado — ${label} Não Confirmada`
                    : `${label} Pendente — ${formatCurrency(amount)}`}
                </p>
                <p className={`text-[11px] font-semibold mt-1 leading-relaxed ${urgent ? 'text-white/90' : 'text-amber-900/90'}`}>
                  {explanation}
                </p>
                {!urgent && phase !== 'need_due_date' && pauseState.deadline && (
                  <p className="text-[11px] font-black mt-1 text-amber-950 flex items-center gap-1">
                    <Clock size={11} /> Prazo: {formatCountdown(pauseState.deadline)} — depois disso o app pausa automaticamente.
                  </p>
                )}
                {urgent && (
                  <p className="text-[11px] font-bold mt-1 text-white/90">
                    Envie o comprovante abaixo. Só Michel ou Rafael podem confirmar o pagamento e liberar o app de novo.
                  </p>
                )}
              </div>
            </div>

            {/* Payment info card */}
            {phase !== 'need_due_date' && (
              <div className="mt-3 bg-white rounded-xl p-3 shadow-sm">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1.5">Dados para pagamento (Pix)</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-black text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">{billing.pixKey}</span>
                  <button
                    type="button"
                    onClick={copyPix}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-gray-900 text-white hover:bg-gray-700'}`}
                  >
                    <Copy size={12} /> {copied ? 'Copiado!' : 'Copiar Chave'}
                  </button>
                  <span className="text-[11px] text-gray-500 font-semibold">{billing.pixBeneficiary} · {billing.pixBank}</span>
                </div>
              </div>
            )}

            {/* Upload / due-date proposal card */}
            <div className="mt-2 bg-white rounded-xl p-3 shadow-sm space-y-2">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                {phase === 'need_due_date' ? 'Escolha a data de vencimento' : 'Enviar comprovante de pagamento'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {phase === 'need_due_date' ? (
                  <input
                    type="date"
                    value={proposedDate}
                    onChange={e => setProposedDate(e.target.value)}
                    className="text-xs font-bold rounded-lg px-3 py-2 text-gray-800 border border-gray-200 bg-gray-50"
                  />
                ) : (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={e => setFileName(e.target.files?.[0]?.name || '')}
                      className="hidden"
                      id="billing-proof-file"
                    />
                    <label
                      htmlFor="billing-proof-file"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-700 hover:bg-gray-200 cursor-pointer transition-colors shrink-0"
                    >
                      <Upload size={13} /> Selecionar Comprovante
                    </label>
                    {fileName && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 max-w-[140px] truncate">
                        <ImageIcon size={11} className="shrink-0" /> <span className="truncate">{fileName}</span>
                      </span>
                    )}
                  </>
                )}
                <input
                  type="text"
                  placeholder="Observação (opcional)"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="text-xs font-medium rounded-lg px-3 py-2 text-gray-800 border border-gray-200 bg-gray-50 flex-1 min-w-[140px]"
                />
              </div>
              <button
                type="button"
                disabled={uploading || (phase === 'need_due_date' && !proposedDate)}
                onClick={() => handleSendProof(proofType)}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-wider disabled:opacity-50 transition-colors ${urgent ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-amber-600 text-white hover:bg-amber-700'}`}
              >
                {uploading ? 'Enviando...' : phase === 'need_due_date' ? 'Enviar Data Escolhida' : 'Enviar Comprovante'}
              </button>
              {sent && (
                <p className="text-[11px] font-bold text-green-700">Enviado! Aguardando confirmação de Michel ou Rafael.</p>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
