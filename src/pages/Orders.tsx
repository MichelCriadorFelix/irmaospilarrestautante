import React, { useEffect, useState } from 'react';
import { collection, query, where, orderBy, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Order, Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { format } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';

const statusMap = {
  pending_payment: 'Aguardando Pagamento',
  preparing: 'Preparando',
  delivering: 'Em Entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

export default function Orders() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [repeatingId, setRepeatingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

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

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleRepeat = async (e: React.MouseEvent, order: Order) => {
    e.preventDefault();
    e.stopPropagation();
    setRepeatingId(order.id);
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const currentProducts = new Map(snapshot.docs.map(d => [d.id, { id: d.id, ...d.data() } as Product]));

      let addedCount = 0;
      const unavailable: string[] = [];

      for (const item of order.items) {
        const current = currentProducts.get(item.product.id);
        if (!current || !current.available) {
          unavailable.push(item.product.name);
          continue;
        }
        const unitPrice = (item.selectedSize === '2 pedaços' && current.priceOption2 !== undefined)
          ? current.priceOption2
          : current.price;

        addItem({
          product: current,
          quantity: item.quantity,
          selectedOption: item.selectedOption,
          selectedSize: item.selectedSize,
          totalPrice: unitPrice
        });
        addedCount++;
      }

      if (addedCount === 0) {
        setNotice('Nenhum item desse pedido está mais disponível no cardápio.');
        return;
      }

      if (unavailable.length > 0) {
        setNotice(`${addedCount} item(ns) adicionados. Indisponíveis: ${unavailable.join(', ')}.`);
        setTimeout(() => navigate('/cart'), 1200);
      } else {
        navigate('/cart');
      }
    } finally {
      setRepeatingId(null);
    }
  };

  if (loading) return <div className="p-8 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Carregando pedidos...</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-xl font-black text-gray-900 mb-6 uppercase tracking-wider">Meus Pedidos</h1>

      {notice && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold rounded-lg p-3">
          {notice}
        </div>
      )}

      {orders.length === 0 ? (
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest text-center py-12">Nenhum pedido encontrado.</p>
      ) : (
        <div className="space-y-4">
          {orders.map(order => (
            <div
              key={order.id}
              className="bg-white shadow-sm rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <Link to={`/orders/${order.id}`} className="block p-5">
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
              <div className="border-t border-gray-50 px-5 py-3 flex justify-end">
                <button
                  onClick={(e) => handleRepeat(e, order)}
                  disabled={repeatingId === order.id}
                  className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand hover:text-brand-dark transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <RotateCcw size={13} className={repeatingId === order.id ? 'animate-spin' : ''} />
                  Repetir Pedido
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
