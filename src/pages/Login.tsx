import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginMock, loginWithSocial } = useAuth();
  const [companyInfo, setCompanyInfo] = useState<{ name: string; logoUrl?: string }>({
    name: "Irmãos Pilar"
  });
  const [showDomainWarning, setShowDomainWarning] = useState(false);
  const [warningProvider, setWarningProvider] = useState<'google' | 'facebook'>('google');

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

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setError('');
    try {
      await loginWithSocial(provider);
      proceedAfterLogin();
    } catch (err: any) {
      if (err.message && err.message.startsWith('UNAUTHORIZED_DOMAIN_FALLBACK|')) {
        const prov = err.message.split('|')[1] as 'google' | 'facebook';
        setWarningProvider(prov);
        setShowDomainWarning(true);
      } else {
        setError(err.message || `Erro ao autenticar com ${provider}`);
      }
    }
  };

  const proceedAfterLogin = () => {
    const stored = localStorage.getItem('mockUser');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.role === 'admin') {
          navigate('/admin');
          return;
        }
      } catch (parseErr) {
        console.error('Error parsing stored user in social login:', parseErr);
      }
    }
    navigate('/');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (email.includes('admin') || makeAdmin) {
        await loginMock('admin', email, name || undefined);
        navigate('/admin');
      } else {
        await loginMock('user', email, name || undefined);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTestLogin = async (role: 'admin' | 'user') => {
    setError('');
    try {
      await loginMock(role);
      navigate(role === 'admin' ? '/admin' : '/');
    } catch (err: any) {
      setError(err.message);
    }
  };



  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md flex flex-col items-center">
        <div className="flex justify-center text-brand shrink-0">
          {companyInfo.logoUrl ? (
            <div className="w-16 h-16 rounded-full border border-gray-200 shadow bg-white overflow-hidden flex items-center justify-center">
              <img src={companyInfo.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            </div>
          ) : (
            <UtensilsCrossed size={48} />
          )}
        </div>
        <h2 className="mt-4 text-center text-3xl font-black text-gray-900 uppercase tracking-wider">
          {companyInfo.name}
        </h2>
        <p className="mt-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Pedidos Online
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl border border-gray-100 sm:px-10">
          
          <div className="mb-6 space-y-3">
            <button
              onClick={() => handleTestLogin('admin')}
              className="w-full flex justify-center py-2.5 px-4 border border-brand bg-brand/10 rounded-lg shadow-sm text-xs font-bold text-brand hover:bg-brand/20 uppercase tracking-widest transition-colors"
            >
              Entrar como Admin de Teste
            </button>
            <button
              onClick={() => handleTestLogin('user')}
              className="w-full flex justify-center py-2.5 px-4 border border-gray-300 bg-gray-50 rounded-lg shadow-sm text-xs font-bold text-gray-700 hover:bg-gray-100 uppercase tracking-widest transition-colors"
            >
              Entrar como Usuário de Teste
            </button>
          </div>

          {/* Redes Sociais */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="px-2 bg-white text-gray-400">Ou entre com redes sociais</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-8">
            <button
              onClick={() => handleSocialLogin('google')}
              className="flex items-center justify-center py-2 px-2 border border-gray-200 rounded-lg shadow-sm bg-white text-[11px] font-black text-gray-700 hover:bg-gray-50 uppercase tracking-wider transition-colors cursor-pointer"
              title="Entrar com Google"
            >
              <svg className="w-4 h-4 mr-1.5 shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button
              onClick={() => handleSocialLogin('facebook')}
              className="flex items-center justify-center py-2 px-2 border border-gray-200 rounded-lg shadow-sm bg-white text-[11px] font-black text-gray-700 hover:bg-gray-50 uppercase tracking-wider transition-colors cursor-pointer"
              title="Entrar com Facebook"
            >
              <svg className="w-4 h-4 mr-1.5 shrink-0 fill-current text-[#1877F2]" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              Facebook
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="px-2 bg-white text-gray-400">Ou entre com email e senha</span>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
            {!isLogin && (
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nome</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:outline-none focus:ring-brand focus:border-brand text-sm"
                  />
                </div>
              </div>
            )}
            
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Email</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:outline-none focus:ring-brand focus:border-brand text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Senha</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg shadow-sm focus:outline-none focus:ring-brand focus:border-brand text-sm"
                />
              </div>
            </div>

            {!isLogin && (
              <div className="flex items-center">
                <input
                  id="admin"
                  type="checkbox"
                  checked={makeAdmin}
                  onChange={e => setMakeAdmin(e.target.checked)}
                  className="h-4 w-4 text-brand focus:ring-brand border-gray-300 rounded"
                />
                <label htmlFor="admin" className="ml-2 block text-xs text-gray-700">
                  Criar conta como Administrador
                </label>
              </div>
            )}

            {error && <div className="text-red-500 text-xs font-medium bg-red-50 p-2 rounded">{error}</div>}

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-xs font-bold text-white bg-brand hover:bg-brand-dark focus:outline-none uppercase tracking-widest transition-colors"
              >
                {isLogin ? 'Entrar' : 'Cadastrar'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-xs text-brand hover:text-brand-dark font-bold uppercase tracking-widest"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
            </button>
          </div>
        </div>
      </div>

      {showDomainWarning && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 text-amber-500 rounded-xl shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-gray-900 uppercase tracking-wide">
                    Acesso Liberado! (Domínio Não Autorizado)
                  </h3>
                  <p className="text-xs text-gray-500">
                    Sua conta de teste foi criada com sucesso e você já está conectado no sistema!
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-100 space-y-2">
                  <p className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    O que aconteceu?
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    O domínio <code className="bg-amber-100/70 px-1.5 py-0.5 rounded font-mono font-bold text-[11px]">{window.location.hostname}</code> não está autorizado para autenticação social nas configurações do seu projeto Firebase.
                  </p>
                  <p className="text-xs text-amber-900 leading-relaxed font-medium">
                    Para poupar seu tempo e não travar seu trabalho, geramos automaticamente um perfil de testes do <strong className="capitalize">{warningProvider}</strong>. Você já pode usar todas as funções do sistema agora!
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">
                    Como ativar o login real em 3 passos simples:
                  </h4>
                  <ol className="text-xs text-gray-600 space-y-2 list-decimal list-inside pl-1">
                    <li className="leading-relaxed">
                      Acesse o <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-brand font-bold hover:underline inline-flex items-center gap-0.5">Console do Firebase <ExternalLink size={10} /></a>
                    </li>
                    <li className="leading-relaxed">
                      Vá em <strong className="text-gray-800">Authentication</strong> &rarr; aba <strong className="text-gray-800">Settings</strong> (Configurações) &rarr; <strong className="text-gray-800">Authorized domains</strong> (Domínios Autorizados).
                    </li>
                    <li className="leading-relaxed">
                      Adicione o domínio <strong className="text-gray-800 font-mono">{window.location.hostname}</strong> na lista.
                    </li>
                  </ol>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => {
                    setShowDomainWarning(false);
                    proceedAfterLogin();
                  }}
                  className="w-full sm:w-auto bg-brand hover:bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-brand/20 active:scale-98"
                >
                  <CheckCircle size={16} />
                  Entendido, Acessar Sistema!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
