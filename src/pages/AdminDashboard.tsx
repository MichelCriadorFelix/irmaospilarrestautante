import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, where, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order, FinanceEntry, CompanyInfo } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, subDays } from 'date-fns';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  BellRing, 
  CheckCircle, 
  Clock, 
  Package, 
  Calendar, 
  Search, 
  Filter, 
  TrendingUp, 
  User, 
  DollarSign, 
  MapPin, 
  Phone, 
  ShieldAlert, 
  List, 
  Info, 
  Settings, 
  ChefHat, 
  Truck, 
  Utensils, 
  TrendingDown, 
  Eye, 
  ExternalLink, 
  RefreshCw, 
  Landmark,
  Save,
  Check
} from 'lucide-react';
import { playNotificationSound } from '../lib/audio';

const statusMap = {
  pending_payment: 'Aguardando PIX',
  preparing: 'Preparando',
  delivering: 'Em Entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

const statusColors = {
  pending_payment: 'bg-orange-100 text-orange-800 border-orange-200',
  preparing: 'bg-blue-100 text-blue-800 border-blue-200',
  delivering: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-800 border-green-200',
  cancelled: 'bg-red-100 text-red-800 border-red-200'
};

const paymentMap = {
  pix: 'PIX',
  credit: 'Cartão de Crédito',
  debit: 'Cartão de Débito',
  cash: 'Dinheiro na Entrega'
};

type PeriodType = 'day' | 'week' | 'month' | 'trimester' | 'semester' | 'year';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'realtime' | 'history' | 'crm' | 'settings'>('realtime');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [finances, setFinances] = useState<FinanceEntry[]>([]);
  const [stats, setStats] = useState({ pending: 0, preparing: 0, todayTotal: 0 });
  
  // Settings Form State
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: "Irmãos Pilar",
    phone: "21 99999-9999",
    address: "Avenida Prefeito José Amorim, Nº 500, Jardim Meriti, São João de Meriti - RJ",
    pixKey: "12.345.678/0001-90",
    pixKeyName: "Irmãos Pilar Ltda"
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedSuccess, setSettingsSavedSuccess] = useState(false);

  // History Search/Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPayment, setFilterPayment] = useState<string>('all');
  const [historyPeriod, setHistoryPeriod] = useState<'all' | 'today' | 'week' | 'month'>('all');

  // CRM period selection
  const [crmPeriod, setCrmPeriod] = useState<PeriodType>('month');

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }

    // Load Company Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'company_info'), (snapshot) => {
      if (snapshot.exists()) {
        setCompanyInfo(snapshot.data() as CompanyInfo);
      }
    });

    // Load finances for cost analysis
    const unsubFinances = onSnapshot(collection(db, 'finances'), (snapshot) => {
      setFinances(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FinanceEntry)));
    });

    // Load ALL orders for dynamic list filtering & history & CRM
    const qAll = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeOrders = onSnapshot(qAll, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      setAllOrders(orders);

      // Realtime stats for today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayStartMs = todayStart.getTime();

      let pending = 0;
      let preparing = 0;
      let todayTotal = 0;

      orders.forEach(order => {
        if (order.status === 'pending_payment') pending++;
        if (order.status === 'preparing') preparing++;
        if (order.createdAt >= todayStartMs && order.status === 'completed') {
          todayTotal += order.total;
        }
      });

      // Sound notification for new orders
      let hasNewRecentOrder = false;
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          // Created in the last 15 seconds
          if (data && data.createdAt && (Date.now() - data.createdAt < 15000)) {
            hasNewRecentOrder = true;
          }
        }
      });

      if (hasNewRecentOrder) {
        playNotificationSound('new_order');
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Novo Pedido Recebido!', {
            body: 'Você recebeu um novo pedido para analisar.',
            icon: '/icon-192.png'
          });
        }
      }

      setStats({ pending, preparing, todayTotal });
    });

    return () => {
      unsubSettings();
      unsubFinances();
      unsubscribeOrders();
    };
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'company_info'), companyInfo);
      setSettingsSavedSuccess(true);
      setTimeout(() => setSettingsSavedSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao salvar dados da empresa:', err);
      alert('Ocorreu um erro ao salvar as configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  // --- Calculations for Tab 2: Orders History ---
  const filteredHistoryOrders = allOrders.filter(order => {
    const matchSearch = 
      order.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.address && order.address.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchStatus = filterStatus === 'all' || order.status === filterStatus;
    const matchPayment = filterPayment === 'all' || order.paymentMethod === filterPayment;

    let matchPeriod = true;
    if (historyPeriod === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      matchPeriod = order.createdAt >= todayStart.getTime();
    } else if (historyPeriod === 'week') {
      const weekAgo = subDays(new Date(), 7);
      matchPeriod = order.createdAt >= weekAgo.getTime();
    } else if (historyPeriod === 'month') {
      const monthAgo = subDays(new Date(), 30);
      matchPeriod = order.createdAt >= monthAgo.getTime();
    }

    return matchSearch && matchStatus && matchPayment && matchPeriod;
  });

  // --- Calculations for Tab 3: CRM ---
  const getCrmPeriodMs = (period: PeriodType): number => {
    const now = new Date();
    if (period === 'day') {
      const start = new Date();
      start.setHours(0,0,0,0);
      return start.getTime();
    }
    if (period === 'week') return subDays(now, 7).getTime();
    if (period === 'month') return subDays(now, 30).getTime();
    if (period === 'trimester') return subDays(now, 90).getTime();
    if (period === 'semester') return subDays(now, 180).getTime();
    if (period === 'year') return subDays(now, 365).getTime();
    return 0;
  };

  const startMs = getCrmPeriodMs(crmPeriod);
  const crmOrders = allOrders.filter(o => o.createdAt >= startMs);
  const crmCompletedOrders = crmOrders.filter(o => o.status === 'completed');
  const crmCancelledOrders = crmOrders.filter(o => o.status === 'cancelled');

  const crmRevenue = crmCompletedOrders.reduce((sum, o) => sum + o.total, 0);
  const crmCompletedCount = crmCompletedOrders.length;
  const crmAverageTicket = crmCompletedCount > 0 ? crmRevenue / crmCompletedCount : 0;
  const crmCancelledCount = crmCancelledOrders.length;
  const crmTotalCount = crmOrders.length;

  // Filter finances for cost calculations
  const crmFinances = finances.filter(f => f.date >= startMs);
  const crmFixedCosts = crmFinances.filter(f => f.type === 'fixed_cost').reduce((sum, f) => sum + f.amount, 0);
  const crmVariableCosts = crmFinances.filter(f => f.type === 'variable_cost').reduce((sum, f) => sum + f.amount, 0);
  const crmTotalCosts = crmFixedCosts + crmVariableCosts;
  const crmNetProfit = crmRevenue - crmTotalCosts;

  // CRM: Top Products sold in selected period
  const productQuantities: { [key: string]: { name: string; quantity: number; revenue: number } } = {};
  crmCompletedOrders.forEach(order => {
    order.items.forEach(item => {
      const pid = item.product.id;
      if (!productQuantities[pid]) {
        productQuantities[pid] = { name: item.product.name, quantity: 0, revenue: 0 };
      }
      productQuantities[pid].quantity += item.quantity;
      productQuantities[pid].revenue += item.totalPrice;
    });
  });

  const topCrmProducts = Object.values(productQuantities)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const maxProductQuantity = topCrmProducts.length > 0 ? Math.max(...topCrmProducts.map(p => p.quantity)) : 1;

  // CRM: Payment methods breakdown
  const paymentBreakdown = { pix: 0, credit: 0, debit: 0, cash: 0 };
  crmCompletedOrders.forEach(o => {
    const method = o.paymentMethod || 'pix';
    if (paymentBreakdown[method] !== undefined) {
      paymentBreakdown[method] += o.total;
    }
  });

  // Recharts Data for selected period
  const rechartsCrmData = [
    { name: 'Faturamento', Valor: crmRevenue, fill: '#10b981' },
    { name: 'Custo Fixo', Valor: crmFixedCosts, fill: '#ef4444' },
    { name: 'Custo Variável', Valor: crmVariableCosts, fill: '#f97316' },
    { name: 'Lucro Líquido', Valor: crmNetProfit, fill: '#3b82f6' }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 uppercase tracking-tight">{companyInfo.name}</h1>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mt-0.5">Admin Central de Operações</p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="px-2.5 py-1 bg-green-100 text-green-700 border border-green-200 rounded text-[9px] font-black uppercase tracking-widest animate-pulse flex items-center">
            <span className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5 inline-block"></span>
            Conexão Live
          </span>
        </div>
      </div>

      {/* Tabs Switcher Navigation */}
      <div className="flex flex-wrap border-b border-gray-200 mb-6 gap-1">
        <button
          onClick={() => setActiveTab('realtime')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'realtime' 
              ? 'border-brand text-brand bg-brand/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <BellRing size={16} />
          <span>Monitor Real-Time</span>
          {allOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length > 0 && (
            <span className="bg-brand text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold ml-1">
              {allOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'history' 
              ? 'border-brand text-brand bg-brand/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <List size={16} />
          <span>Histórico de Pedidos</span>
        </button>

        <button
          onClick={() => setActiveTab('crm')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'crm' 
              ? 'border-brand text-brand bg-brand/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <TrendingUp size={16} />
          <span>CRM & Analítico</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'settings' 
              ? 'border-brand text-brand bg-brand/5' 
              : 'border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50'
          }`}
        >
          <Settings size={16} />
          <span>Dados da Empresa</span>
        </button>
      </div>

      {/* TAB 1: REAL-TIME MONITOR */}
      {activeTab === 'realtime' && (
        <div className="space-y-6">
          {/* Top Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-100 text-orange-600 rounded-lg">
                <BellRing size={20} className="animate-bounce" />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none">Aguardando PIX</p>
                <p className="text-xl font-black text-gray-900 mt-1">{stats.pending}</p>
                <p className="text-[9px] text-orange-600 font-bold mt-0.5">Pendentes de aprovação</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <ChefHat size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none">Em Preparo</p>
                <p className="text-xl font-black text-gray-900 mt-1">{stats.preparing}</p>
                <p className="text-[9px] text-blue-600 font-bold mt-0.5">Em fritura/cozinha</p>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-100 text-green-600 rounded-lg">
                <DollarSign size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none">Faturado Hoje</p>
                <p className="text-xl font-black text-green-600 mt-1">{formatCurrency(stats.todayTotal)}</p>
                <p className="text-[9px] text-green-600 font-bold mt-0.5">Apenas pedidos concluídos</p>
              </div>
            </div>
          </div>

          {/* Active Orders List */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="bg-gray-50/70 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-black text-xs text-gray-900 uppercase tracking-widest flex items-center">
                <Package size={14} className="mr-2 text-brand" /> Pedidos em Andamento
              </h3>
              <span className="text-[10px] bg-brand/10 text-brand px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                Total: {allOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length}
              </span>
            </div>

            {allOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').length === 0 ? (
              <div className="p-10 text-center text-xs text-gray-400 font-medium flex flex-col items-center justify-center space-y-2">
                <Package size={36} className="text-gray-300" />
                <p>Nenhum pedido em andamento no momento.</p>
                <p className="text-[10px] text-gray-400">Os novos pedidos aparecerão aqui em tempo real com alertas sonoros!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {allOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled').map(order => (
                  <Link 
                    key={order.id} 
                    to={`/admin/orders/${order.id}`} 
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors gap-3 block"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-500 border border-gray-200 flex-shrink-0">
                        <Utensils size={18} className="text-brand" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-black text-gray-900 uppercase">
                            {order.userName}
                          </p>
                          <span className="text-[10px] text-gray-400 font-bold uppercase">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1 font-semibold leading-relaxed max-w-lg truncate">
                          {order.items.map(i => `${i.quantity}x ${i.product.name}`).join(' • ')}
                        </p>
                        {order.notes && (
                          <div className="mt-1 px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-800 text-[9px] font-bold rounded flex items-center gap-1 uppercase tracking-wider max-w-md">
                            <span className="inline-block w-1 h-1 rounded-full bg-amber-500 animate-pulse"></span>
                            Obs: {order.notes}
                          </div>
                        )}
                        <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-wider">
                          {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')} • {paymentMap[order.paymentMethod || 'pix']}
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-1.5 border-t sm:border-0 pt-2 sm:pt-0 border-gray-50">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${statusColors[order.status]}`}>
                        {statusMap[order.status]}
                      </span>
                      <p className="font-black text-sm text-gray-900">{formatCurrency(order.total)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: DETAILED ORDERS HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 border border-gray-200 rounded-xl shadow-sm space-y-3">
            <h3 className="font-black text-[10px] text-gray-500 uppercase tracking-widest mb-1">Buscar & Filtrar no Histórico</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Search Bar */}
              <div className="relative sm:col-span-2">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cliente, ID do pedido, ou endereço..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg py-1.5 pl-9 pr-3 text-xs placeholder:text-gray-400 focus:ring-brand focus:border-brand"
                />
              </div>

              {/* Status Dropdown */}
              <div>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg py-1.5 px-3 text-xs focus:ring-brand focus:border-brand font-semibold text-gray-700"
                >
                  <option value="all">Todos os Status</option>
                  <option value="pending_payment">Aguardando PIX</option>
                  <option value="preparing">Preparando</option>
                  <option value="delivering">Em Entrega</option>
                  <option value="completed">Concluídos</option>
                  <option value="cancelled">Cancelados</option>
                </select>
              </div>

              {/* Payment Method Dropdown */}
              <div>
                <select
                  value={filterPayment}
                  onChange={e => setFilterPayment(e.target.value)}
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg py-1.5 px-3 text-xs focus:ring-brand focus:border-brand font-semibold text-gray-700"
                >
                  <option value="all">Formas de Pagamento</option>
                  <option value="pix">PIX</option>
                  <option value="credit">Cartão de Crédito</option>
                  <option value="debit">Cartão de Débito</option>
                  <option value="cash">Dinheiro</option>
                </select>
              </div>
            </div>

            {/* Period Quick Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mr-2">Período:</span>
              {[
                { id: 'all', label: 'Todo o Histórico' },
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Últimos 7 dias' },
                { id: 'month', label: 'Últimos 30 dias' }
              ].map(periodTab => (
                <button
                  key={periodTab.id}
                  onClick={() => setHistoryPeriod(periodTab.id as any)}
                  className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded border transition-colors ${
                    historyPeriod === periodTab.id
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {periodTab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Orders History Table */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50/70 border-b border-gray-200 flex justify-between items-center">
              <span className="text-xs font-black uppercase tracking-widest text-gray-900 flex items-center">
                <List size={14} className="mr-2 text-brand" /> Resultados Encontrados
              </span>
              <span className="text-[10px] bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-black">
                {filteredHistoryOrders.length}
              </span>
            </div>

            {filteredHistoryOrders.length === 0 ? (
              <div className="p-12 text-center text-xs text-gray-400 font-semibold space-y-2">
                <Package size={32} className="mx-auto text-gray-300" />
                <p>Nenhum pedido atende aos filtros selecionados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/40 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="p-3 pl-4">ID / Data</th>
                      <th className="p-3">Cliente / Contato</th>
                      <th className="p-3">Itens do Pedido</th>
                      <th className="p-3">Pagamento</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right pr-4">Total</th>
                      <th className="p-3 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                    {filteredHistoryOrders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="p-3 pl-4">
                          <span className="font-black text-gray-950 uppercase block">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-[9px] text-gray-400 font-bold block mt-0.5">
                            {format(new Date(order.createdAt), 'dd/MM/yyyy HH:mm')}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-bold text-gray-900 block">{order.userName}</span>
                          {order.address && (
                            <span className="text-[10px] text-gray-400 font-semibold block max-w-xs truncate leading-normal" title={order.address}>
                              <MapPin size={10} className="inline mr-0.5 -mt-0.5 text-gray-400" />
                              {order.address}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="space-y-0.5">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="text-[10px] text-gray-600 truncate max-w-xs">
                                <strong className="text-gray-900">{item.quantity}x</strong> {item.product.name} 
                                <span className="text-[9px] text-gray-400 ml-1">({item.selectedSize})</span>
                              </div>
                            ))}
                            {order.notes && (
                              <div className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded inline-block uppercase mt-1 truncate max-w-[200px]" title={order.notes}>
                                Obs: {order.notes}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-semibold bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                            {paymentMap[order.paymentMethod || 'pix']}
                          </span>
                          {order.paymentMethod === 'cash' && order.changeRequested && (
                            <span className="text-[9px] text-gray-500 font-bold block mt-1 uppercase">
                              Troco para: {formatCurrency(order.changeFor || 0)}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border tracking-wider ${statusColors[order.status]}`}>
                            {statusMap[order.status]}
                          </span>
                        </td>
                        <td className="p-3 text-right pr-4 font-black text-gray-950">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="p-3 text-center">
                          <Link 
                            to={`/admin/orders/${order.id}`}
                            className="inline-flex items-center gap-1 bg-brand text-white px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider hover:bg-brand-dark transition-colors"
                          >
                            <Eye size={11} />
                            <span>Ver / Chat</span>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: ADVANCED SALES CRM & ANALYTICS */}
      {activeTab === 'crm' && (
        <div className="space-y-6">
          {/* CRM Period selector tabs */}
          <div className="bg-white p-3 border border-gray-200 rounded-xl shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-xs text-gray-900 uppercase tracking-wider">CRM de Vendas & Relatório Comercial</h3>
              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Analise o desempenho e a saúde financeira do restaurante</p>
            </div>
            <div className="flex flex-wrap gap-1">
              {[
                { id: 'day', label: 'Hoje' },
                { id: 'week', label: '7 Dias' },
                { id: 'month', label: '30 Dias' },
                { id: 'trimester', label: 'Trimestre' },
                { id: 'semester', label: 'Semestre' },
                { id: 'year', label: 'Ano' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCrmPeriod(tab.id as PeriodType)}
                  className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded border transition-colors ${
                    crmPeriod === tab.id
                      ? 'bg-brand text-white border-brand'
                      : 'bg-white border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Core Analytics Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-green-500">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block leading-none">Receita Total</span>
              <p className="text-sm md:text-lg font-black text-gray-900 mt-1.5">{formatCurrency(crmRevenue)}</p>
              <span className="text-[9px] text-green-600 font-semibold mt-1 inline-block uppercase">Pedidos finalizados</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-red-500">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block leading-none">Custo Fixo</span>
              <p className="text-sm md:text-lg font-black text-gray-900 mt-1.5">{formatCurrency(crmFixedCosts)}</p>
              <span className="text-[9px] text-red-500 font-semibold mt-1 inline-block uppercase">Histórico finances</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-orange-500">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block leading-none">Custo Variável</span>
              <p className="text-sm md:text-lg font-black text-gray-900 mt-1.5">{formatCurrency(crmVariableCosts)}</p>
              <span className="text-[9px] text-orange-500 font-semibold mt-1 inline-block uppercase">Ingredientes e outros</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-blue-500">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block leading-none">Lucro Líquido</span>
              <p className={`text-sm md:text-lg font-black mt-1.5 ${crmNetProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(crmNetProfit)}</p>
              <span className="text-[9px] text-gray-400 font-semibold mt-1 inline-block uppercase">Margem de lucro</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-indigo-500">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block leading-none">Pedidos Pagos</span>
              <p className="text-sm md:text-lg font-black text-gray-900 mt-1.5">{crmCompletedCount}</p>
              <span className="text-[9px] text-indigo-500 font-semibold mt-1 inline-block uppercase">Cancelados: {crmCancelledCount}</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm border-l-4 border-l-yellow-500">
              <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block leading-none">Ticket Médio</span>
              <p className="text-sm md:text-lg font-black text-gray-900 mt-1.5">{formatCurrency(crmAverageTicket)}</p>
              <span className="text-[9px] text-yellow-600 font-semibold mt-1 inline-block uppercase">Valor por compra</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Visual Comparative Chart */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Balancete de Receitas vs Despesas</h4>
              <div className="h-64 flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rechartsCrmData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#9ca3af" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="#9ca3af" fontSize={10} />
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Bar dataKey="Valor" radius={[4, 4, 0, 0]} maxBarSize={60} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Products / Best Sellers */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
              <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Mais Vendidos do Período</h4>
              
              {topCrmProducts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-xs text-gray-400 font-medium py-10">
                  <Utensils size={32} className="text-gray-300 mb-2" />
                  <p>Sem dados de produtos vendidos neste período.</p>
                </div>
              ) : (
                <div className="space-y-4 flex-1 justify-center flex flex-col">
                  {topCrmProducts.map((prod, idx) => {
                    const percentage = (prod.quantity / maxProductQuantity) * 100;
                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-gray-800">{idx + 1}º {prod.name}</span>
                          <span className="font-black text-gray-900">{prod.quantity} unidades <span className="text-[10px] text-gray-400">({formatCurrency(prod.revenue)})</span></span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-brand h-full rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Payment Methods Breakdowns */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest mb-4">Faturamento por Forma de Pagamento</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-yellow-50/50 rounded-xl border border-yellow-100 flex items-center gap-3">
                <div className="p-2 bg-yellow-100 text-yellow-700 rounded-lg">
                  <Landmark size={18} />
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block">PIX</span>
                  <span className="text-sm font-black text-gray-900 block mt-0.5">{formatCurrency(paymentBreakdown.pix)}</span>
                </div>
              </div>

              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block">Crédito</span>
                  <span className="text-sm font-black text-gray-900 block mt-0.5">{formatCurrency(paymentBreakdown.credit)}</span>
                </div>
              </div>

              <div className="p-4 bg-purple-50/50 rounded-xl border border-purple-100 flex items-center gap-3">
                <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block">Débito</span>
                  <span className="text-sm font-black text-gray-900 block mt-0.5">{formatCurrency(paymentBreakdown.debit)}</span>
                </div>
              </div>

              <div className="p-4 bg-green-50/50 rounded-xl border border-green-100 flex items-center gap-3">
                <div className="p-2 bg-green-100 text-green-700 rounded-lg">
                  <DollarSign size={18} />
                </div>
                <div>
                  <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest block">Dinheiro</span>
                  <span className="text-sm font-black text-gray-900 block mt-0.5">{formatCurrency(paymentBreakdown.cash)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: COMPANY DETAILS / CONFIGURATIONS */}
      {activeTab === 'settings' && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 bg-gray-50/70 border-b border-gray-200">
            <h3 className="font-black text-xs text-gray-900 uppercase tracking-widest flex items-center gap-2">
              <Settings size={14} className="text-brand" /> Dados do Estabelecimento
            </h3>
            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Gerencie os dados públicos exibidos aos clientes nas telas de pedido, chat e comprovantes</p>
          </div>

          <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
            {settingsSavedSuccess && (
              <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-green-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 animate-fade-in">
                <Check size={16} />
                <span>Configurações salvas e publicadas com sucesso!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome do Estabelecimento</label>
                <input
                  type="text"
                  required
                  value={companyInfo.name}
                  onChange={e => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                  placeholder="Ex: Irmãos Pilar Restaurante"
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 focus:ring-brand focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Telefone / WhatsApp de Contato</label>
                <input
                  type="text"
                  required
                  value={companyInfo.phone}
                  onChange={e => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                  placeholder="Ex: 21 99999-9999"
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 focus:ring-brand focus:border-brand"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Endereço Completo</label>
              <input
                type="text"
                required
                value={companyInfo.address}
                onChange={e => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                placeholder="Ex: Avenida Prefeito José Amorim, Nº 500, São João de Meriti - RJ"
                className="w-full border border-gray-200 bg-gray-50 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 focus:ring-brand focus:border-brand"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-gray-100 pt-4">
              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Chave PIX do Estabelecimento</label>
                <input
                  type="text"
                  required
                  value={companyInfo.pixKey}
                  onChange={e => setCompanyInfo({ ...companyInfo, pixKey: e.target.value })}
                  placeholder="Chave CNPJ, Celular, E-mail, CPF, etc..."
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 focus:ring-brand focus:border-brand"
                />
              </div>

              <div>
                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Nome do Beneficiário / Razão Social</label>
                <input
                  type="text"
                  required
                  value={companyInfo.pixKeyName}
                  onChange={e => setCompanyInfo({ ...companyInfo, pixKeyName: e.target.value })}
                  placeholder="Ex: Irmãos Pilar de Meriti Ltda"
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 focus:ring-brand focus:border-brand"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="bg-brand text-white text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-lg hover:bg-brand-dark flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
              >
                {savingSettings ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save size={16} />
                )}
                <span>Salvar Configurações</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
