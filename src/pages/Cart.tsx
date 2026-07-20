import React, { useState, useEffect } from 'react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { collection, addDoc } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Trash2, MapPin, Phone, User as UserIcon, Edit2, CreditCard, DollarSign, QrCode, MessageSquare, AlertCircle, Check, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Cart() {
  const { items, removeItem, total, clearCart } = useCart();
  const { user } = useAuth();
  const [address, setAddress] = useState(user?.address || '');
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit' | 'debit' | 'cash'>('pix');
  const [needChange, setNeedChange] = useState<boolean | null>(null);
  const [changeFor, setChangeFor] = useState('');
  const [notes, setNotes] = useState('');
  const navigate = useNavigate();

  const [alertState, setAlertState] = useState<{
    type: 'success' | 'error' | 'warning';
    message: string;
    submessage?: string;
  } | null>(null);

  useEffect(() => {
    if (alertState) {
      const timer = setTimeout(() => {
        setAlertState(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [alertState]);

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
      setAlertState({
        type: 'warning',
        message: 'Dados Incompletos',
        submessage: 'Preencha seus dados de contato e endereço antes de finalizar. Redirecionando...'
      });
      setTimeout(() => {
        navigate('/profile');
      }, 3000);
      return;
    }

    const parsedChangeFor = (paymentMethod === 'cash' && needChange === true)
      ? parseFloat(changeFor.replace(',', '.')) || null
      : null;

    if (paymentMethod === 'cash' && needChange === true) {
      if (!parsedChangeFor || parsedChangeFor <= total) {
        setAlertState({
          type: 'error',
          message: 'Troco Inválido',
          submessage: 'Por favor, informe um valor de troco válido e maior que o total do pedido.'
        });
        return;
      }
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
        paymentMethod,
        changeRequested: paymentMethod === 'cash' && needChange === true,
        changeFor: parsedChangeFor,
        address,
        notes: notes.trim() || null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      const orderRef = await addDoc(collection(db, 'orders'), orderPayload);
      
      clearCart();
      navigate(`/orders/${orderRef.id}`);
    } catch (error) {
      console.error(error);
      setAlertState({
        type: 'error',
        message: 'Erro ao criar pedido',
        submessage: 'Ocorreu um erro ao finalizar seu pedido. Tente novamente.'
      });
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

        </div>

      {/* Observações do Pedido */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-5 mb-6">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
          <MessageSquare size={14} className="text-brand" /> Observações do Pedido
        </h3>
        <div>
          <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
            Alguma informação ou instrução importante sobre o seu pedido?
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: sem cebola, sem farofa, troco para R$ 50, campainha com defeito..."
            maxLength={300}
            rows={3}
            className="w-full border border-gray-200 bg-gray-50 rounded-lg py-2 px-3 text-xs text-gray-800 placeholder:text-gray-400 focus:ring-brand focus:border-brand focus:outline-none font-medium resize-none"
          />
          <div className="flex justify-end mt-1">
            <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
              {notes.length}/300 caracteres
            </span>
          </div>
        </div>
      </div>

      {/* Forma de Pagamento */}
      <div className="bg-white shadow-sm rounded-xl border border-gray-100 p-5 mb-6">
        <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
          <CreditCard size={14} className="text-brand" /> Forma de Pagamento
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setPaymentMethod('pix')}
            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              paymentMethod === 'pix'
                ? 'border-brand bg-brand/5 text-brand shadow-sm shadow-brand/10'
                : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <QrCode size={20} />
            <span className="text-[10px] font-black uppercase tracking-wider">PIX</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('credit');
              setNeedChange(null);
            }}
            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              paymentMethod === 'credit'
                ? 'border-brand bg-brand/5 text-brand shadow-sm shadow-brand/10'
                : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CreditCard size={20} />
            <span className="text-[10px] font-black uppercase tracking-wider text-center">Crédito</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('debit');
              setNeedChange(null);
            }}
            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              paymentMethod === 'debit'
                ? 'border-brand bg-brand/5 text-brand shadow-sm shadow-brand/10'
                : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <CreditCard size={20} />
            <span className="text-[10px] font-black uppercase tracking-wider text-center">Débito</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setPaymentMethod('cash');
              setNeedChange(null);
            }}
            className={`p-4 rounded-xl border-2 flex flex-col items-center justify-center gap-2 transition-all cursor-pointer ${
              paymentMethod === 'cash'
                ? 'border-brand bg-brand/5 text-brand shadow-sm shadow-brand/10'
                : 'border-gray-100 hover:border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <DollarSign size={20} />
            <span className="text-[10px] font-black uppercase tracking-wider text-center">Dinheiro</span>
          </button>
        </div>

        {paymentMethod === 'pix' && (
          <p className="text-[10px] text-gray-400 mt-4 text-center font-bold uppercase tracking-wider">
            Você receberá as instruções e a chave PIX na próxima etapa para enviar o comprovante.
          </p>
        )}

        {(paymentMethod === 'credit' || paymentMethod === 'debit') && (
          <p className="text-[10px] text-gray-400 mt-4 text-center font-bold uppercase tracking-wider">
            O entregador levará a maquininha de cartão até o seu endereço para realizar a cobrança.
          </p>
        )}

        {paymentMethod === 'cash' && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">Precisa de Troco?</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNeedChange(true)}
                className={`flex-1 py-2 px-4 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  needChange === true
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Sim
              </button>
              <button
                type="button"
                onClick={() => {
                  setNeedChange(false);
                  setChangeFor('');
                }}
                className={`flex-1 py-2 px-4 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  needChange === false
                    ? 'bg-brand text-white border-brand shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                Não (Valor Exato)
              </button>
            </div>

            {needChange === true && (
              <div className="space-y-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block">
                  Troco para quanto?
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">R$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={changeFor}
                    onChange={(e) => setChangeFor(e.target.value.replace(/[^0-9,.]/g, ''))}
                    placeholder="Ex: 50,00"
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 focus:border-brand focus:ring-brand rounded-lg text-xs font-bold bg-white"
                  />
                </div>
                {changeFor && parseFloat(changeFor.replace(',', '.')) <= total && (
                  <p className="text-[9px] text-red-500 font-bold uppercase tracking-wider">
                    O valor para o troco deve ser maior que o total do pedido ({formatCurrency(total)}).
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleCheckout}
          disabled={
            loading || 
            isProfileIncomplete || 
            (paymentMethod === 'cash' && needChange === null) ||
            (paymentMethod === 'cash' && needChange === true && (!changeFor.trim() || parseFloat(changeFor.replace(',', '.')) <= total))
          }
          className="w-full sm:w-auto bg-brand text-white px-8 py-3 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm cursor-pointer"
        >
          {loading ? 'Processando...' : 'Finalizar Pedido'}
        </button>
      </div>

      {/* Floating Animated Toast Alert */}
      <AnimatePresence>
        {alertState && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 w-full max-w-xs px-4"
          >
            <div className={`rounded-xl shadow-xl border p-4 flex items-center gap-3 ${
              alertState.type === 'success' 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : alertState.type === 'warning'
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}>
              {alertState.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-emerald-500/20">
                  <Check size={18} className="stroke-[3]" />
                </div>
              ) : alertState.type === 'warning' ? (
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-amber-500/20">
                  <AlertCircle size={18} className="stroke-[3]" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-rose-500/20">
                  <X size={18} className="stroke-[3]" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-wider leading-tight">
                  {alertState.message}
                </p>
                {alertState.submessage && (
                  <p className="text-[10px] opacity-90 mt-0.5 leading-none font-medium">
                    {alertState.submessage}
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
