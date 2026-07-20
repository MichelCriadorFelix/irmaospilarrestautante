import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { collection, addDoc } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Trash2, MapPin, Phone, User as UserIcon, Edit2 } from 'lucide-react';

export default function Cart() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isProfileIncomplete = !user?.phone || !user?.address;

  // Keep address synchronized with user profile data when loaded/changed
  useEffect(() => {
    if (user?.address) {
      setAddress(user.address);
    }
  }, [user?.address]);

  const handleCheckout = async () => {
    if (!user) return;
    if (items.length === 0) return;
    if (isProfileIncomplete) {
      alert('Por favor, preencha seus dados de contato e endereço antes de finalizar.');
      navigate('/profile');
      return;
    }
    
    setLoading(true);
    try {
      const orderPayload = sanitizeForFirestore({
        userId: user.uid,
        userName: user.name,
        userPhone: user.phone,
        items,
        total,
        status: 'pending_payment',
        paymentMethod: 'pix',
        address,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const orderRef = await addDoc(collection(db, 'orders'), orderPayload);
      
      clearCart();
      navigate(`/orders/${orderRef.id}`);
    } catch (error) {
      console.error(error);
      alert('Erro ao finalizar pedido.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Seu carrinho está vazio</h2>
        <button onClick={() => navigate('/')} className="text-brand hover:text-brand-dark font-bold uppercase tracking-widest text-xs">
          Voltar ao cardápio
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-wider">Carrinho</h1>
      
      {isProfileIncomplete && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-wider">Atenção: Dados Incompletos</p>
            <p className="text-xs mt-1 text-amber-700 font-medium">Você precisa cadastrar seu número de WhatsApp e endereço detalhado para podermos realizar a entrega.</p>
          </div>
          <button 
            onClick={() => navigate('/profile')} 
            className="whitespace-nowrap bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-lg transition-colors"
          >
            Cadastrar Agora
          </button>
        </div>
      )}

      <div className="bg-white shadow-sm overflow-hidden rounded-xl border border-gray-100 mb-6">
        <ul className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <li key={index} className="px-4 py-4 flex justify-between items-center">
              <div>
                <h4 className="text-sm font-bold text-gray-900">{item.product.name}</h4>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest font-bold">
                  {item.product.category === 'refeicao' && (
                    <>
                      {item.selectedSize} 
                      {item.selectedOption && ` • ${item.selectedOption}`}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="font-black text-gray-900">{formatCurrency(item.totalPrice)}</span>
                <button 
                  onClick={() => removeItem(index)}
                  className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-gray-50 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        <div className="bg-gray-50 px-4 py-4 flex justify-between items-center border-t border-gray-100">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Total</span>
          <span className="text-lg font-black text-brand">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-5 mb-6">
        <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
            <MapPin size={14} className="text-brand" /> Dados de Entrega
          </h3>
          {!isProfileIncomplete && (
            <button
              onClick={() => navigate('/profile')}
              className="text-[10px] font-bold uppercase tracking-widest text-brand hover:text-brand-dark flex items-center gap-1 transition-colors"
            >
              <Edit2 size={12} /> Alterar
            </button>
          )}
        </div>

        {isProfileIncomplete ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-3">Endereço Incompleto</p>
            <button
              onClick={() => navigate('/profile')}
              className="bg-brand text-white px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark transition-colors"
            >
              Cadastrar Endereço de Entrega
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-lg border border-gray-100">
              <div className="flex items-center gap-2 text-gray-700">
                <UserIcon size={14} className="text-gray-400" />
                <span className="font-semibold">Destinatário:</span>
                <span className="font-bold text-gray-900">{user?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Phone size={14} className="text-gray-400" />
                <span className="font-semibold">Contato (WhatsApp):</span>
                <span className="font-bold text-gray-900 font-mono">{user?.phone}</span>
              </div>
            </div>

            <div className="bg-gray-50/50 p-4 rounded-lg border border-gray-100 space-y-2 text-xs">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Endereço</span>
                <p className="font-bold text-gray-800">
                  {user?.addressStreet}, Nº {user?.addressNumber}
                  {user?.addressComplement && ` - ${user?.addressComplement}`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Bairro</span>
                  <p className="font-semibold text-gray-700">{user?.addressNeighborhood}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">CEP</span>
                  <p className="font-semibold text-gray-700 font-mono">{user?.addressZip}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Município</span>
                  <p className="font-semibold text-gray-700">{user?.addressCity}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Estado</span>
                  <p className="font-semibold text-gray-700 uppercase">{user?.addressState}</p>
                </div>
              </div>
              {user?.addressReference && (
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Ponto de Referência</span>
                  <p className="text-gray-600 font-medium italic">{user?.addressReference}</p>
                </div>
              )}
            </div>
          </div>
        )}

        <p className="text-[9px] text-gray-400 mt-3 font-bold uppercase tracking-widest text-center">O pagamento será realizado via PIX na próxima etapa.</p>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleCheckout}
          disabled={loading || isProfileIncomplete}
          className="w-full sm:w-auto bg-brand text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
        >
          {loading ? 'Processando...' : 'Finalizar Pedido e Pagar'}
        </button>
      </div>
    </div>
  );
}
