import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, addDoc } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../lib/firebase';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Edit, Trash2, Plus, X } from 'lucide-react';
import { initialMenu } from '../lib/seedData';

export default function AdminMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    category: 'refeicao',
    price: 0,
    available: true,
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return () => unsub();
  }, []);

  const handleToggleAvailable = async (product: Product) => {
    await updateDoc(doc(db, 'products', product.id), { available: !product.available });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteDoc(doc(db, 'products', id));
    }
  };

  const seedMenu = async () => {
    for (const item of initialMenu) {
      await setDoc(doc(collection(db, 'products')), item);
    }
    alert('Cardápio inicial carregado com sucesso!');
  };

  const handleEdit = (product: Product) => {
    setFormData(product);
    setEditingId(product.id);
    setIsFormOpen(true);
  };

  const handleAddNew = () => {
    setFormData({
      name: '',
      description: '',
      category: 'refeicao',
      price: 0,
      priceOption2: undefined,
      options: [],
      available: true,
    });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedData = sanitizeForFirestore(formData);
    if (editingId) {
      await updateDoc(doc(db, 'products', editingId), sanitizedData as any);
    } else {
      await addDoc(collection(db, 'products'), sanitizedData as any);
    }
    setIsFormOpen(false);
    setEditingId(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-black text-gray-900 uppercase tracking-wider">Gerenciar Cardápio</h1>
        <div className="flex gap-2">
          {products.length === 0 && (
            <button onClick={seedMenu} className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-200 text-[10px] font-bold uppercase tracking-widest transition-colors">
              Carregar Padrão
            </button>
          )}
          <button onClick={handleAddNew} className="bg-brand text-white px-4 py-2 rounded-lg shadow-sm hover:bg-brand-dark flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors">
            <Plus size={14} /> Novo Item
          </button>
        </div>
      </div>

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">{editingId ? 'Editar Item' : 'Novo Item'}</h2>
            <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Nome do Item</label>
              <input type="text" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-brand focus:border-brand" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Descrição</label>
              <input type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-brand focus:border-brand" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Categoria</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as any})} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-brand focus:border-brand">
                <option value="refeicao">Refeição</option>
                <option value="bebida">Bebida</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Preço Padrão (R$)</label>
              <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-brand focus:border-brand" />
            </div>
            {formData.category === 'refeicao' && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Acompanhamentos (separados por vírgula)</label>
                  <input type="text" value={formData.options?.join(', ') || ''} onChange={e => setFormData({...formData, options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)})} placeholder="Ex: batata frita, legume, verdura" className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-brand focus:border-brand" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Preço Opção 2 Pedaços (Opcional, R$)</label>
                  <input type="number" step="0.01" value={formData.priceOption2 !== undefined ? formData.priceOption2 : ''} onChange={e => setFormData({...formData, priceOption2: e.target.value ? parseFloat(e.target.value) : undefined})} className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-brand focus:border-brand" />
                </div>
              </>
            )}
            <div className="md:col-span-2 flex justify-end gap-2 mt-2">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-gray-50">Cancelar</button>
              <button type="submit" className="px-4 py-2 bg-brand text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-brand-dark">Salvar Item</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-100">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Item</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Categoria</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Preço</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-gray-500 uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-gray-500 uppercase tracking-widest">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {products.map(product => (
              <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <div className="text-xs font-bold text-gray-900 leading-tight">{product.name}</div>
                  <div className="text-[10px] text-gray-500 truncate max-w-[200px] mt-0.5">{product.description}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  {product.category === 'refeicao' ? 'Refeição' : 'Bebida'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-900 font-black">
                  {formatCurrency(product.price)}
                  {product.priceOption2 && <span className="text-[9px] text-brand font-bold uppercase tracking-widest block mt-0.5">2 pedaços: {formatCurrency(product.priceOption2)}</span>}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <button 
                    onClick={() => handleToggleAvailable(product)}
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest transition-colors ${
                      product.available ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-red-100 text-red-800 hover:bg-red-200'
                    }`}
                  >
                    {product.available ? 'Disponível' : 'Indisponível'}
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right space-x-2">
                  <button onClick={() => handleEdit(product)} className="text-gray-400 hover:text-brand inline-flex p-1.5 rounded-md hover:bg-brand/10 transition-colors">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(product.id)} className="text-gray-400 hover:text-red-600 inline-flex p-1.5 rounded-md hover:bg-red-50 transition-colors">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
