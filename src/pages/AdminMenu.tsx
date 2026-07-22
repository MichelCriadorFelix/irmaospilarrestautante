import React, { useEffect, useState } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc, addDoc } from 'firebase/firestore';
import { db, sanitizeForFirestore, handleFirestoreError, OperationType } from '../lib/firebase';
import { Product } from '../types';
import { formatCurrency } from '../lib/utils';
import { Edit, Trash2, Plus, X, Check, AlertTriangle, AlertCircle, Search } from 'lucide-react';
import { initialMenu } from '../lib/seedData';
import { AnimatePresence, motion } from 'framer-motion';

export default function AdminMenu() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    description: '',
    category: 'refeicao',
    price: 0,
    available: true,
  });

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [alert, setAlert] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
    submessage?: string;
  } | null>(null);

  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
    });
    return () => unsub();
  }, []);

  const handleToggleAvailable = async (product: Product) => {
    try {
      await updateDoc(doc(db, 'products', product.id), { available: !product.available });
      setAlert({
        type: 'success',
        message: 'Status Atualizado!',
        submessage: `O item "${product.name}" agora está ${!product.available ? 'Disponível' : 'Indisponível'}.`
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `products/${product.id}`);
    }
  };

  const handleDeleteAttempt = (product: Product) => {
    setProductToDelete(product);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await deleteDoc(doc(db, 'products', productToDelete.id));
      setAlert({
        type: 'success',
        message: 'Item Excluído!',
        submessage: `O item "${productToDelete.name}" foi removido com sucesso.`
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `products/${productToDelete.id}`);
    } finally {
      setProductToDelete(null);
    }
  };

  const seedMenu = async () => {
    try {
      for (const item of initialMenu) {
        await setDoc(doc(collection(db, 'products')), item);
      }
      setAlert({
        type: 'success',
        message: 'Cardápio Inicial Carregado!',
        submessage: `${initialMenu.length} itens padrões foram criados.`
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'products');
    }
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
    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), sanitizedData as any);
        setAlert({
          type: 'success',
          message: 'Item Atualizado!',
          submessage: `As alterações em "${formData.name}" foram salvas.`
        });
      } else {
        await addDoc(collection(db, 'products'), sanitizedData as any);
        setAlert({
          type: 'success',
          message: 'Item Criado!',
          submessage: `"${formData.name}" foi adicionado com sucesso.`
        });
      }
      setIsFormOpen(false);
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'products');
    }
  };

  const filteredProducts = products.filter(product => 
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, descrição ou categoria..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-brand"
            />
          </div>
          <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'itens'}
          </div>
        </div>

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
            {filteredProducts.length > 0 ? (
              filteredProducts.map(product => (
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
                    <button onClick={() => handleDeleteAttempt(product)} className="text-gray-400 hover:text-red-600 inline-flex p-1.5 rounded-md hover:bg-red-50 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500">
                  Nenhum item encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {productToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50"
            onClick={() => setProductToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-gray-100"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-4">
                  <AlertTriangle size={24} className="stroke-[2.5]" />
                </div>
                
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-wider mb-2">
                  Excluir Item?
                </h3>
                
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-4">
                  Tem certeza que deseja remover este item permanentemente do cardápio?
                </p>

                <div className="w-full bg-red-50/50 rounded-xl border border-red-100/50 p-4 mb-6 text-left">
                  <h4 className="text-xs font-black text-red-950">
                    {productToDelete.name}
                  </h4>
                  <p className="text-[10px] text-red-800 font-bold uppercase tracking-wider mt-1">
                    Categoria: {productToDelete.category === 'refeicao' ? 'Refeição' : 'Bebida'}
                  </p>
                  <p className="text-[10px] text-red-900 font-black mt-0.5">
                    Preço: {formatCurrency(productToDelete.price)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button
                    onClick={() => setProductToDelete(null)}
                    className="py-2.5 px-4 border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-600 uppercase tracking-widest rounded-xl transition-all cursor-pointer active:scale-98"
                  >
                    Não, Cancelar
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-md shadow-red-600/20 transition-all cursor-pointer active:scale-98"
                  >
                    Sim, Excluir
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
                : alert.type === 'error'
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-gray-800 border-gray-700 text-white"
            }`}>
              {alert.type === 'success' ? (
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-emerald-500/20">
                  <Check size={18} className="stroke-[3]" />
                </div>
              ) : alert.type === 'error' ? (
                <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center shrink-0 text-white shadow-sm shadow-rose-500/20">
                  <AlertCircle size={18} className="stroke-[3]" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center shrink-0 text-white">
                  <Check size={18} className="stroke-[3]" />
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
