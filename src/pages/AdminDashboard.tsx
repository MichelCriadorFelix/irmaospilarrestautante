import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { BellRing, CheckCircle, Clock, Package } from 'lucide-react';
import { playNotificationSound } from '../lib/audio';

const statusMap = {
  pending_payment: 'Aguardando PIX',
  preparing: 'Preparando',
  delivering: 'Em Entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

export default function AdminDashboard() {
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, todayTotal: 0 });

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const q = query(
      collection(db, 'orders'),
      where('createdAt', '>=', todayStart.getTime()),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      
      // Calculate stats
      let pending = 0;
      let preparing = 0;
      let todayTotal = 0;

      orders.forEach(order => {
        if (order.status === 'pending_payment') pending++;
        if (order.status === 'preparing') preparing++;
        if (order.status === 'completed') todayTotal += order.total;
      });

      // Detect newly added orders in real-time
      let hasNewRecentOrder = false;
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Check if order was created in the last 15 seconds to prevent playing on first load
          if (data && data.createdAt && (Date.now() - data.createdAt < 15000)) {
            hasNewRecentOrder = true;
          }
        }
      });

      if (hasNewRecentOrder) {
        // Play the loud double-ascending notification chime
        playNotificationSound('new_order');
        
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Novo Pedido Recebido!', {
            body: 'Você recebeu um novo pedido para analisar.',
            icon: '/icon-192.png'
          });
        }
      }

      setStats({ pending, preparing, todayTotal });
      // Only show active orders in the main list
      setActiveOrders(orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled'));
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold text-gray-900">Painel de Controle Real-Time</h1>
        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-bold uppercase animate-pulse">● LIVE</span>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-yellow-100 rounded-full text-yellow-600 mr-4">
            <BellRing size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Aguardando PIX</p>
            <p className="text-xl font-bold text-gray-900">{stats.pending}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600 mr-4">
            <Clock size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Em Preparo</p>
            <p className="text-xl font-bold text-gray-900">{stats.preparing}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex items-center">
          <div className="p-3 bg-green-100 rounded-full text-green-600 mr-4">
            <CheckCircle size={20} />
          </div>
          <div>
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Vendas de Hoje</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(stats.todayTotal)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
          <h3 className="font-bold text-xs uppercase flex items-center">
            <Package size={14} className="mr-2" /> Pedidos em Andamento
          </h3>
          <span className="text-[10px] text-gray-500">Total: {activeOrders.length}</span>
        </div>
        {activeOrders.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500">Nenhum pedido em andamento no momento.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activeOrders.map(order => (
              <Link key={order.id} to={`/admin/orders/${order.id}`} className="p-3 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors block">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center">
                    <Package className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{order.userName} (Pedido #{order.id.slice(-6).toUpperCase()})</p>
                    <p className="text-[10px] text-gray-500">{format(new Date(order.createdAt), 'HH:mm')} • {order.items.length} itens</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                    order.status === 'pending_payment' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    'bg-purple-100 text-purple-800'
                  }`}>
                    {statusMap[order.status]}
                  </span>
                  <p className="font-black text-xs">{formatCurrency(order.total)}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
