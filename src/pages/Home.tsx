import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product, CompanyInfo } from '../types';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { Plus, Check, X, ShoppingBag, HelpCircle, AlertCircle } from 'lucide-react';
import { initialMenu } from '../lib/seedData';
import { useAuth } from '../context/AuthContext';
import { AnimatePresence, motion } from 'framer-motion';
import { isStoreOpen } from '../lib/openingHours';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const { user } = useAuth();
  const { addItem } = useCart();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'company_info'), (snapshot) => {
      if (snapshot.exists()) {
        setCompanyInfo(snapshot.data() as CompanyInfo);
      }
    });
    return () => unsub();
  }, []);

  const [pendingAdd, setPendingAdd] = useState<{
    product: Product;
    selectedOption?: string;
    selectedSize?: '1 pedaço' | '2 pedaços';
    totalPrice: number;
  } | null>(null);

  const [alert, setAlert] = useState<{
    type: 'success' | 'cancel' | 'warning';
    message: string;
    submessage?: string;
  } | null>(null);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  const handleAddAttempt = (
    product: Product, 
    selectedOption?: string, 
    selectedSize?: '1 pedaço' | '2 pedaços', 
    totalPrice?: number
  ) => {
    const status = isStoreOpen(companyInfo);
    if (!status.isOpen && user?.role !== 'admin') {
      setAlert({
        type: 'warning',
        message: 'Estamos Fechados',
        submessage: status.reason
      });
      return;
    }

    setPendingAdd({
      product,
      selectedOption,
      selectedSize,
      totalPrice: totalPrice ?? product.price
    });
  };

  const handleConfirmAdd = () => {
    if (!pendingAdd) return;
    const status = isStoreOpen(companyInfo);
    if (!status.isOpen && user?.role !== 'admin') {
      setAlert({
        type: 'warning',
        message: 'Estamos Fechados',
        submessage: status.reason
      });
      setPendingAdd(null);
      return;
    }

    addItem({
      product: pendingAdd.product,
      quantity: 1,
      selectedOption: pendingAdd.selectedOption,
      selectedSize: pendingAdd.selectedSize,
      totalPrice: pendingAdd.totalPrice
    });

    setAlert({
      type: 'success',
      message: 'Item adicionado!',
      submessage: `${pendingAdd.product.name} está no seu carrinho.`
    });
    setPendingAdd(null);
  };

  const handleCancelAdd = () => {
    if (!pendingAdd) return;
    setAlert({
      type: 'cancel',
      message: 'Adição cancelada',
      submessage: `${pendingAdd.product.name} não foi adicionado.`
    });
    setPendingAdd(null);
  };

  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, 'products'));
    const prods = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
    setProducts(prods);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAutoSeed = async () => {
    if (!user) {
      setAlert({
        type: 'warning',
        message: 'Acesso Restrito',
        submessage: 'Faça login como Admin de Teste para carregar o cardápio padrão!'
      });
      return;
    }
    setLoading(true);
    for (const item of initialMenu) {
      await addDoc(collection(db, 'products'), item);
    }
    await fetchProducts();
  };

  const meals = products.filter(p => p.category === 'refeicao' && p.available);
  const drinks = products.filter(p => p.category === 'bebida' && p.available);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Friendly Closed Alert Banner */}
      {(() => {
        const status = isStoreOpen(companyInfo);
        if (!status.isOpen) {
          return (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-start gap-3 shadow-xs animate-pulse">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-lg shrink-0 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-950">Aviso: Estabelecimento Fechado</h3>
                <p className="text-xs font-bold mt-1 text-amber-800 leading-relaxed">{status.reason}</p>
                <p className="text-[10px] uppercase font-black tracking-widest text-amber-600 mt-2">Você ainda pode navegar no cardápio, mas os pedidos estão suspensos no momento.</p>
              </div>
            </div>
          );
        }
        return null;
      })()}

      <div className="mb-6 bg-brand/10 p-4 rounded-xl border border-brand/20">
        <h1 className="text-xl font-black text-gray-900 mb-1 uppercase tracking-wider">Cardápio</h1>
        <p className="text-[10px] text-gray-700 uppercase tracking-widest font-bold">Todas as refeições acompanham arroz, feijão, macarrão e farofa.</p>
        <p className="text-[10px] text-brand font-bold uppercase tracking-widest mt-1">Opção: batata frita, legumes ou verduras.</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-sm font-bold text-gray-500 uppercase tracking-widest">Carregando cardápio...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 shadow-sm">
          <h2 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-wider">Cardápio Vazio</h2>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-6">O cardápio ainda não foi configurado.</p>
          <button 
            onClick={handleAutoSeed}
            className="bg-brand text-white px-6 py-2 rounded-lg font-bold text-xs uppercase tracking-widest hover:bg-brand-dark transition-colors shadow-sm"
          >
            Carregar Cardápio de Teste
          </button>
        </div>
      ) : (
        <>
          <h2 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest">Refeições</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {meals.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddAttempt={(details) => handleAddAttempt(product, details.selectedOption, details.selectedSize, details.totalPrice)}
              />
            ))}
          </div>

          <h2 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest">Bebidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {drinks.map(product => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onAddAttempt={(details) => handleAddAttempt(product, details.selectedOption, details.selectedSize, details.totalPrice)}
              />
            ))}
          </div>
        </>
      )}

      {/* Friendly Popup Modal */}
      <AnimatePresence>
        {pendingAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={handleCancelAdd}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full overflow-hidden border border-gray-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-4">
                  <ShoppingBag size={24} className="stroke-[2.5]" />
                </div>
                
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-2">
                  Confirmar Adição?
                </h3>
                
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">
                  Deseja adicionar este item ao seu carrinho de compras?
                </p>

                <div className="w-full bg-gray-50 rounded-xl border border-gray-100 p-4 mb-6 text-left">
                  <h4 className="text-xs font-black text-gray-900 mb-1">
                    {pendingAdd.product.name}
                  </h4>
                  {pendingAdd.product.description && (
                    <p className="text-[10px] text-gray-500 leading-tight mb-3 font-medium">
                      {pendingAdd.product.description}
                    </p>
                  )}
                  
                  <div className="space-y-1.5 border-t border-gray-100 pt-3 text-[10px] uppercase tracking-wider font-bold text-gray-600">
                    {pendingAdd.selectedOption && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Opção:</span>
                        <span className="text-gray-800">{pendingAdd.selectedOption}</span>
                      </div>
                    )}
                    {pendingAdd.selectedSize && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Tamanho:</span>
                        <span className="text-gray-800">{pendingAdd.selectedSize}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs font-black pt-1.5 border-t border-dashed border-gray-200 mt-1.5">
                      <span className="text-gray-900">Preço Total:</span>
                      <span className="text-brand">{formatCurrency(pendingAdd.totalPrice)}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={handleCancelAdd}
                    className="py-2.5 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-98"
                  >
                    Não, Cancelar
                  </button>
                  <button
                    onClick={handleConfirmAdd}
                    className="py-2.5 px-4 bg-brand hover:bg-brand-dark text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md shadow-brand/20 transition-all cursor-pointer active:scale-98"
                  >
                    Sim, Adicionar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Animated Toast Alert */}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9, x: '-50%' }}
            animate={{ opacity: 1, y: 0, scale: 1, x: '-50%' }}
            exit={{ opacity: 0, y: 20, scale: 0.9, x: '-50%' }}
            className="fixed bottom-6 left-1/2 z-50 w-full max-w-xs px-4"
          >
            <div className={`rounded-xl shadow-xl border p-4 flex items-center gap-3 ${
              alert.type === 'success' 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
                : alert.type === 'warning'
                ? "bg-amber-50 border-amber-200 text-amber-800"
                : "bg-gray-800 border-gray-700 text-white"
            }`}>
              {alert.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-emerald-500/20">
                  <Check size={18} className="stroke-[3]" />
                </div>
              ) : alert.type === 'warning' ? (
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-amber-500/20">
                  <AlertCircle size={18} className="stroke-[3]" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0 text-white">
                  <X size={18} className="stroke-[3]" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-xs font-black uppercase tracking-wider leading-tight">
                  {alert.message}
                </p>
                {alert.submessage && (
                  <p className="text-[10px] opacity-90 mt-0.5 leading-none font-medium">
                    {alert.submessage}
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

function ProductCard({ 
  product, 
  onAddAttempt 
}: { 
  product: Product; 
  onAddAttempt: (details: { selectedOption?: string; selectedSize?: '1 pedaço' | '2 pedaços'; totalPrice: number }) => void; 
}) {
  const [selectedOption, setSelectedOption] = useState<string>(
    product.options && product.options.length > 0 ? 'Nenhum' : ''
  );
  const [selectedSize, setSelectedSize] = useState<'1 pedaço' | '2 pedaços'>('1 pedaço');

  const handleAdd = () => {
    let finalPrice = product.price;
    if (product.category === 'refeicao' && selectedSize === '2 pedaços' && product.priceOption2 !== undefined) {
      finalPrice = product.priceOption2;
    }
    
    onAddAttempt({
      selectedOption: product.category === 'refeicao' ? selectedOption : undefined,
      selectedSize: product.category === 'refeicao' ? selectedSize : undefined,
      totalPrice: finalPrice
    });
  };

  const currentPrice = (product.category === 'refeicao' && selectedSize === '2 pedaços' && product.priceOption2 !== undefined) 
    ? product.priceOption2 
    : product.price;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-3 flex flex-col justify-between hover:shadow-md transition-shadow">
      <div>
        <div className="flex justify-between items-start mb-1">
          <div className="flex-1">
            <h3 className="text-xs font-bold text-gray-900 leading-tight">{product.name}</h3>
            {product.description && <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>}
          </div>
          <div className="text-right ml-2">
            {product.category === 'refeicao' && selectedSize === '1 pedaço' && product.priceOption2 !== undefined && <p className="text-[9px] text-brand font-bold uppercase tracking-widest">A partir de</p>}
            <p className="text-sm font-black text-gray-900">{formatCurrency(currentPrice)}</p>
          </div>
        </div>
        
        {product.category === 'refeicao' && (
          <div className="space-y-2 mt-3 border-t border-gray-50 pt-3">
            {product.options && product.options.length > 0 && (
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Acompanhamento</label>
                <select 
                  className="w-full text-xs py-1 px-2 border border-gray-200 rounded-md focus:border-brand focus:ring-brand bg-gray-50"
                  value={selectedOption}
                  onChange={e => setSelectedOption(e.target.value)}
                >
                  <option value="Nenhum">Nenhum</option>
                  {product.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              </div>
            )}
            
            {product.priceOption2 !== undefined && (
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Tamanho</label>
                <div className="flex space-x-3 bg-gray-50 p-1.5 rounded-md border border-gray-100">
                  <label className="flex items-center text-xs flex-1 justify-center cursor-pointer">
                    <input type="radio" className="text-brand focus:ring-brand w-3 h-3" checked={selectedSize === '1 pedaço'} onChange={() => setSelectedSize('1 pedaço')} />
                    <span className="ml-1.5 font-medium">1 Pedaço</span>
                  </label>
                  <label className="flex items-center text-xs flex-1 justify-center cursor-pointer border-l border-gray-200 pl-3">
                    <input type="radio" className="text-brand focus:ring-brand w-3 h-3" checked={selectedSize === '2 pedaços'} onChange={() => setSelectedSize('2 pedaços')} />
                    <span className="ml-1.5 font-medium">2 Pedaços</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="mt-3">
        <button 
          onClick={handleAdd}
          className="w-full py-1.5 bg-brand text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-brand-dark transition-colors"
        >
          Adicionar
        </button>
      </div>
    </div>
  );
}
