import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Order } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const statusMap = {
  pending_payment: 'Aguardando Pagamento',
  preparing: 'Preparando',
  delivering: 'Em Entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, 'orders'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order)));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading) return <div className="p-8 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Carregando pedidos...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-wider">Meus Pedidos</h1>
      
      {orders.length === 0 ? (
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center py-12">Nenhum pedido encontrado.</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <Link 
              key={order.id} 
              to={`/orders/${order.id}`}
              className="block bg-white shadow-sm rounded-xl p-5 hover:shadow-md transition-shadow border border-gray-100"
            >
              <div className="flex justify-between items-center mb-3">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Pedido #{order.id.slice(-6).toUpperCase()}</span>
                  <h3 className="text-sm font-bold text-gray-900 mt-0.5">
                    {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
                  </h3>
                </div>
                <div className="text-right">
                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest ${
                    order.status === 'pending_payment' ? 'bg-orange-100 text-orange-800' :
                    order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                    order.status === 'delivering' ? 'bg-purple-100 text-purple-800' :
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {statusMap[order.status]}
                  </span>
                  <div className="mt-1 font-black text-gray-900">{formatCurrency(order.total)}</div>
                </div>
              </div>
              <p className="text-[10px] text-gray-500 truncate border-t border-gray-50 pt-3">
                {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(', ')}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
