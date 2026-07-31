import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Loader2, AlertCircle, UtensilsCrossed, ShieldCheck, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

function GoogleIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

export default function Login() {
  const { loginWithGoogle, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);
  const navigate = useNavigate();

  const [companyInfo, setCompanyInfo] = useState<{ name: string; logoUrl?: string }>({
    name: "Irmãos Pilar"
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'company_info'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setCompanyInfo({
          name: data.name || "Irmãos Pilar",
          logoUrl: data.logoUrl
        });
      }
    });

    return () => unsub();
  }, []);

  // Redirect automatically when user is logged in
  useEffect(() => {
    if (user) {
      navigate(user.role === 'admin' ? '/admin' : '/');
    }
  }, [user, navigate]);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);

    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error(err);
      let message = 'Não foi possível concluir o login com o Google.';
      
      if (err.code === 'auth/popup-closed-by-user') {
        message = 'A janela de login do Google foi fechada antes de concluir.';
      } else if (err.code === 'auth/popup-blocked') {
        message = 'O seu navegador bloqueou o pop-up do Google. Por favor, permita os pop-ups e tente novamente.';
      } else if (err.code === 'auth/network-request-failed') {
        message = 'Falha na conexão com a internet. Verifique sua rede e tente novamente.';
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 selection:bg-brand selection:text-white">
      <div className="w-full max-w-md">
        {/* Branding Section */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-20 h-20 bg-brand rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand/20 border-2 border-white"
          >
            {companyInfo.logoUrl && !logoError ? (
              <img 
                src={companyInfo.logoUrl} 
                onError={() => setLogoError(true)} 
                alt="Logo" 
                className="w-12 h-12 -rotate-12 object-contain" 
              />
            ) : (
              <UtensilsCrossed size={40} className="text-white -rotate-12" />
            )}
          </motion.div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter italic">
            {companyInfo.name}
          </h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.25em]">
            Gastronomia de Excelência
          </p>
        </div>

        {/* Login Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 p-8 text-center relative"
        >
          <div className="inline-flex items-center gap-2 bg-brand/10 text-brand px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-4">
            <Sparkles size={14} />
            <span>Acesso Rápido & Seguro</span>
          </div>

          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">
            Entrar no Sistema
          </h2>
          <p className="text-xs text-gray-500 mb-8 leading-relaxed">
            Faça login utilizando exclusivamente sua conta <strong className="text-gray-800">Google</strong> para acessar o cardápio e fazer seus pedidos.
          </p>

          {error && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-start gap-3 text-left text-xs font-bold"
            >
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div>
                <p>{error}</p>
              </div>
            </motion.div>
          )}

          {/* Single Google Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white text-gray-800 border-2 border-gray-200 hover:border-brand/40 py-4 px-6 rounded-2xl font-black text-sm transition-all shadow-md hover:shadow-xl active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-3.5 group relative overflow-hidden"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin text-brand" size={22} />
                <span className="uppercase text-xs tracking-wider">Conectando ao Google...</span>
              </>
            ) : (
              <>
                <GoogleIcon className="w-6 h-6 shrink-0 group-hover:scale-110 transition-transform" />
                <span className="uppercase tracking-wider text-xs font-black group-hover:text-brand transition-colors">
                  Entrar com a Conta Google
                </span>
              </>
            )}
          </button>

          {/* Smart Persistence Info */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-3 bg-gray-50/80 -mx-8 -mb-8 p-4 text-left">
            <ShieldCheck size={28} className="text-emerald-500 shrink-0" />
            <div>
              <p className="text-[11px] font-black text-gray-800 uppercase tracking-wide leading-tight">
                Login Inteligente & Permanente
              </p>
              <p className="text-[10px] text-gray-500 mt-0.5">
                Você entra uma única vez e permanece conectado neste dispositivo.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <p className="mt-8 text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">
          © {new Date().getFullYear()} {companyInfo.name} • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
