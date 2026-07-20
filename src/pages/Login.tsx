import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { loginMock } = useAuth();

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
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center text-brand">
          <UtensilsCrossed size={48} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-black text-gray-900 uppercase tracking-wider">
          Irmãos Pilar
        </h2>
        <p className="mt-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-widest">
          Pedidos Online
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-xl border border-gray-100 sm:px-10">
          
          <div className="mb-8 space-y-3">
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

          <div className="relative mb-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
              <span className="px-2 bg-white text-gray-400">Ou entre com sua conta</span>
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
    </div>
  );
}
