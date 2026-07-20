import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, ChatMessage } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Send, Upload, Copy, Check, CreditCard, ChefHat, Truck, CheckCircle, XCircle, Clock } from 'lucide-react';
import { playNotificationSound } from '../lib/audio';

const statusMap = {
  pending_payment: 'Aguardando Pagamento',
  preparing: 'Preparando',
  delivering: 'Em Entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

const steps = [
  { id: 'pending_payment', label: 'Pagamento', desc: 'Aguardando PIX', icon: CreditCard },
  { id: 'preparing', label: 'Preparo', desc: 'Na cozinha', icon: ChefHat },
  { id: 'delivering', label: 'Entrega', desc: 'A caminho', icon: Truck },
  { id: 'completed', label: 'Entregue', desc: 'Bom apetite!', icon: CheckCircle }
];

// Mock Pix Key
const PIX_KEY = "12.345.678/0001-90";

export default function OrderDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!id) return;
    
    // Listen to Order in real-time
    const orderRef = doc(db, 'orders', id);
    const unsubscribeOrder = onSnapshot(orderRef, (snapshot) => {
      if (snapshot.exists()) {
        const newOrderData = { id: snapshot.id, ...snapshot.data() } as Order;
        setOrder(prevOrder => {
          // Play status change sound if the status actually changed
          if (prevOrder && prevOrder.status !== newOrderData.status) {
            playNotificationSound('status_change');
          }
          return newOrderData;
        });
      }
    });

    // Listen to messages in real-time
    const q = query(collection(db, 'orders', id, 'messages'), orderBy('createdAt', 'asc'));
    const unsubscribeMessages = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage)));
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

      // Only play sound if message was added by someone else and is fresh (last 10 seconds)
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msgData = change.doc.data() as ChatMessage;
          if (msgData && msgData.senderId !== user?.uid && (Date.now() - msgData.createdAt < 10000)) {
            playNotificationSound('new_message');
          }
        }
      });
    });

    return () => {
      unsubscribeOrder();
      unsubscribeMessages();
    };
  }, [id, user?.uid]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !id) return;
    
    await addDoc(collection(db, 'orders', id, 'messages'), {
      senderId: user.uid,
      senderName: user.name,
      text: newMessage,
      createdAt: Date.now()
    });
    setNewMessage('');
  };

  const handleStatusChange = async (newStatus: Order['status']) => {
    if (!id) return;
    await updateDoc(doc(db, 'orders', id), { status: newStatus, updatedAt: Date.now() });
    setOrder(prev => prev ? { ...prev, status: newStatus } : null);
  };

  const copyPix = () => {
    navigator.clipboard.writeText(PIX_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!order) return <div className="p-8">Carregando...</div>;

  const isAdmin = user?.role === 'admin';

  const getStepStatus = (stepId: string) => {
    if (order.status === 'cancelled') return 'cancelled';
    
    const statusOrder = ['pending_payment', 'preparing', 'delivering', 'completed'];
    const currentIndex = statusOrder.indexOf(order.status);
    const stepIndex = statusOrder.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'current';
    return 'upcoming';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-64px)] overflow-hidden">
      
      {/* Left: Order Info */}
      <div className="lg:col-span-2 overflow-y-auto pr-4">
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
            <div>
              <h1 className="text-xl font-black text-gray-900 mb-0.5 uppercase tracking-wider">Pedido #{order.id.slice(-6).toUpperCase()}</h1>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">{format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}</p>
              {isAdmin && <p className="text-gray-900 mt-2 font-bold text-xs uppercase">Cliente: <span className="text-brand">{order.userName}</span></p>}
            </div>
            <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                    order.status === 'pending_payment' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'delivering' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
              {statusMap[order.status]}
            </span>
          </div>

          {/* Visual Order Progress Tracker / Stepper */}
          {order.status !== 'cancelled' ? (
            <div className="mb-8 bg-gray-50/70 rounded-2xl border border-gray-100 p-4 md:p-6">
              <div className="relative flex items-center justify-between">
                {/* Background track line */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-0.5 bg-gray-200 -z-0 hidden sm:block" />
                
                {/* Active progress track line */}
                <div 
                  className="absolute left-6 top-1/2 -translate-y-1/2 h-0.5 bg-brand -z-0 transition-all duration-500 hidden sm:block"
                  style={{
                    width: `${
                      order.status === 'pending_payment' ? '0%' :
                      order.status === 'preparing' ? '33.33%' :
                      order.status === 'delivering' ? '66.66%' :
                      '100%'
                    }`
                  }}
                />

                {/* Stepper items */}
                {steps.map((step, idx) => {
                  const status = getStepStatus(step.id);
                  const StepIcon = step.icon;
                  
                  return (
                    <div key={step.id} className="relative flex flex-col items-center flex-1 z-10">
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${
                        status === 'completed' ? 'bg-brand border-brand text-white shadow-sm shadow-brand/20' :
                        status === 'current' ? 'bg-white border-brand text-brand ring-4 ring-brand/10 font-bold scale-110' :
                        'bg-white border-gray-200 text-gray-400'
                      }`}>
                        <StepIcon size={18} className={status === 'current' ? 'animate-pulse' : ''} />
                      </div>
                      
                      <div className="text-center mt-2.5">
                        <p className={`text-[10px] md:text-xs font-black uppercase tracking-wider ${
                          status === 'current' ? 'text-brand' :
                          status === 'completed' ? 'text-gray-900 font-bold' :
                          'text-gray-400'
                        }`}>
                          {step.label}
                        </p>
                        <p className="text-[8px] md:text-[9px] text-gray-500 font-semibold uppercase tracking-widest mt-0.5">
                          {step.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="mb-8 bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 text-red-800">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                <XCircle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider">Pedido Cancelado</h4>
                <p className="text-xs text-red-700 mt-0.5 font-medium">Este pedido foi cancelado pelo estabelecimento. Se tiver alguma dúvida, pergunte no chat ao lado.</p>
              </div>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-bold text-xs text-gray-900 mb-2 uppercase tracking-widest">Itens</h3>
            <ul className="divide-y divide-gray-50">
              {order.items.map((item, idx) => (
                <li key={idx} className="py-2 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-sm text-gray-900">{item.quantity}x {item.product.name}</span>
                    <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest mt-0.5">
                      {item.selectedSize} {item.selectedOption && `• ${item.selectedOption}`}
                    </p>
                  </div>
                  <span className="font-black text-sm">{formatCurrency(item.totalPrice)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-xs uppercase tracking-widest text-gray-500">Total</span>
              <span className="font-black text-lg text-brand">{formatCurrency(order.total)}</span>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold text-xs text-gray-900 mb-2 uppercase tracking-widest">Endereço</h3>
            <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">{order.address}</p>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mt-6">
              <h3 className="font-bold text-[10px] text-gray-500 mb-3 uppercase tracking-widest">Controles do Administrador</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => handleStatusChange('preparing')} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-blue-700">Aprovar & Preparar</button>
                <button onClick={() => handleStatusChange('delivering')} className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-purple-700">Saiu p/ Entrega</button>
                <button onClick={() => handleStatusChange('completed')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-green-700">Concluído</button>
                <button onClick={() => handleStatusChange('cancelled')} className="bg-gray-800 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-gray-900">Cancelar</button>
              </div>
            </div>
          )}

          {/* User Pix Info */}
          {!isAdmin && order.status === 'pending_payment' && (
            <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200 mt-6 text-center">
              <h3 className="font-bold text-yellow-900 mb-2">Pagamento via PIX</h3>
              <p className="text-yellow-800 text-sm mb-4">
                Copie a chave PIX abaixo, realize o pagamento e envie o comprovante no chat ao lado.
              </p>
              <div className="flex items-center justify-center space-x-2">
                <code className="bg-white px-4 py-2 rounded font-mono text-lg font-bold border border-yellow-300">
                  {PIX_KEY}
                </code>
                <button onClick={copyPix} className="p-2 bg-yellow-200 text-yellow-900 rounded hover:bg-yellow-300 transition-colors">
                  {copied ? <Check size={20} /> : <Copy size={20} />}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Chat */}
      <div className="bg-white shadow rounded-lg flex flex-col h-full border border-gray-200">
        <div className="p-4 border-b bg-gray-50 rounded-t-lg">
          <h3 className="font-bold text-gray-900">Chat & Comprovantes</h3>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={`flex flex-col ${msg.senderId === user?.uid ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] rounded-xl p-3 shadow-sm ${
                msg.senderId === user?.uid ? 'bg-brand text-white rounded-br-sm' : 'bg-gray-100 text-gray-900 rounded-bl-sm border border-gray-200'
              }`}>
                {msg.senderId !== user?.uid && <span className="text-[9px] font-bold block mb-1 opacity-50 uppercase tracking-widest">{msg.senderName}</span>}
                <p className="text-xs font-medium leading-relaxed">{msg.text}</p>
              </div>
              <span className="text-[9px] font-bold uppercase text-gray-400 mt-1">{format(new Date(msg.createdAt), 'HH:mm')}</span>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSendMessage} className="p-3 border-t bg-white rounded-b-xl flex items-center space-x-2">
          {/* Note: In a real app, integrate Firebase Storage to upload images here */}
          <button type="button" className="p-2 text-brand hover:text-brand-dark transition-colors" title="Envio de imagens simplificado no protótipo">
            <Upload size={20} />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Digite uma mensagem..."
            className="flex-1 border border-gray-200 focus:border-brand focus:ring-brand bg-gray-50 rounded-lg px-3 py-2 text-sm"
          />
          <button type="submit" disabled={!newMessage.trim()} className="p-2 bg-brand text-white rounded-lg hover:bg-brand-dark disabled:opacity-50 transition-colors shadow-sm">
            <Send size={18} />
          </button>
        </form>
      </div>

    </div>
  );
}
