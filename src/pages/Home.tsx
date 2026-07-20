import React, { useEffect, useState } from 'react';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Product } from '../types';
import { useCart } from '../context/CartContext';
import { formatCurrency } from '../lib/utils';
import { Plus } from 'lucide-react';
import { initialMenu } from '../lib/seedData';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

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
      alert("Faça login como Admin de Teste para carregar o cardápio padrão!");
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
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <h2 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-widest">Bebidas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {drinks.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [selectedOption, setSelectedOption] = useState<string>(product.options?.[0] || '');
  const [selectedSize, setSelectedSize] = useState<'1 pedaço' | '2 pedaços'>('1 pedaço');

  const handleAdd = () => {
    let finalPrice = product.price;
    if (product.category === 'refeicao' && selectedSize === '2 pedaços' && product.priceOption2 !== undefined) {
      finalPrice = product.priceOption2;
    }
    
    addItem({
      product,
      quantity: 1,
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
