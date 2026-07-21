import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, UserPlus, Mail, Lock, User as UserIcon, Loader2, AlertCircle, CheckCircle, ArrowLeft, UtensilsCrossed } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Login() {
  const { loginWithEmail, registerWithEmail, resendVerification, user, logout } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const navigate = useNavigate();

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

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

  // Redirect if logged in and verified
  useEffect(() => {
    if (user && user.emailVerified) {
      navigate(user.role === 'admin' ? '/admin' : '/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!name.trim()) throw new Error('Nome é obrigatório');
        await registerWithEmail(email, password, name);
        setSuccess('Conta criada! Verifique seu e-mail para ativar seu acesso.');
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      let message = 'Ocorreu um erro ao processar sua solicitação.';
      
      if (err.code === 'auth/user-not-found') message = 'Usuário não encontrado.';
      else if (err.code === 'auth/wrong-password') message = 'Senha incorreta.';
      else if (err.code === 'auth/email-already-in-use') message = 'Este e-mail já está em uso.';
      else if (err.code === 'auth/invalid-email') message = 'E-mail inválido.';
      else if (err.code === 'auth/weak-password') message = 'A senha deve ter pelo menos 6 caracteres.';
      
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await resendVerification();
      setSuccess('E-mail de verificação reenviado!');
    } catch (err) {
      setError('Erro ao reenviar e-mail.');
    } finally {
      setLoading(false);
    }
  };

  // If user is logged in but not verified
  if (user && !user.emailVerified) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 p-8 text-center"
        >
          <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail size={40} className="animate-pulse" />
          </div>
          
          <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">Confirme seu E-mail</h2>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Enviamos um link de confirmação para <span className="font-bold text-gray-900">{user.email}</span>. 
            Você precisa clicar no link para liberar seu acesso ao sistema.
          </p>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-100 text-green-700 rounded-xl flex items-center gap-3 text-sm font-bold">
              <CheckCircle size={18} />
              {success}
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handleResend}
              disabled={loading}
              className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-lg active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Reenviar E-mail'}
            </button>
            
            <button
              onClick={() => logout()}
              className="w-full bg-white text-gray-500 border border-gray-200 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Voltar ao Login
            </button>
          </div>

          <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            Não esqueça de verificar sua pasta de SPAM.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand rounded-3xl rotate-12 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand/20">
            {companyInfo.logoUrl ? (
              <img src={companyInfo.logoUrl} alt="Logo" className="w-12 h-12 -rotate-12 object-contain" />
            ) : (
              <UtensilsCrossed size={40} className="text-white -rotate-12" />
            )}
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase tracking-tighter italic">{companyInfo.name}</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em]">Gastronomia de Excelência</p>
        </div>

        <motion.div 
          layout
          className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100"
        >
          {/* Header Toggle */}
          <div className="flex bg-gray-50 p-2 m-4 rounded-2xl border border-gray-100">
            <button
              onClick={() => { setIsRegister(false); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isRegister ? 'bg-white text-brand shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Login
            </button>
            <button
              onClick={() => { setIsRegister(true); setError(null); setSuccess(null); }}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isRegister ? 'bg-white text-brand shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              Cadastro
            </button>
          </div>

          <div className="p-8 pt-4">
            <AnimatePresence mode="wait">
              <motion.form
                key={isRegister ? 'reg' : 'login'}
                initial={{ opacity: 0, x: isRegister ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isRegister ? -20 : 20 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl flex items-center gap-3 text-xs font-bold animate-shake">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                {success && (
                  <div className="p-4 bg-green-50 border border-green-100 text-green-700 rounded-2xl flex items-center gap-3 text-xs font-bold">
                    <CheckCircle size={18} />
                    {success}
                  </div>
                )}

                {isRegister && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative group">
                      <UserIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={e => setName(e.target.value)}
                        placeholder="Como devemos te chamar?"
                        className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/5 outline-none transition-all"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                  <div className="relative group">
                    <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Ex: seu@email.com"
                      className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/5 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative group">
                    <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand transition-colors" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-50 border-2 border-gray-50 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:border-brand focus:ring-4 focus:ring-brand/5 outline-none transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-brand text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-dark transition-all shadow-xl shadow-brand/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-6"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <>
                      {isRegister ? <UserPlus size={20} /> : <LogIn size={20} />}
                      {isRegister ? 'Criar minha conta' : 'Entrar no Sistema'}
                    </>
                  )}
                </button>
              </motion.form>
            </AnimatePresence>
          </div>
        </motion.div>

        <p className="mt-8 text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">
          © {new Date().getFullYear()} {companyInfo.name} • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
