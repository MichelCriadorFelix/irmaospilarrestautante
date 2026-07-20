import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Save, MapPin, Phone, User as UserIcon, Search } from 'lucide-react';

export default function Profile() {
  const { user, updateUser } = useAuth();
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    addressStreet: user?.addressStreet || '',
    addressNumber: user?.addressNumber || '',
    addressComplement: user?.addressComplement || '',
    addressNeighborhood: user?.addressNeighborhood || '',
    addressCity: user?.addressCity || '',
    addressState: user?.addressState || '',
    addressZip: user?.addressZip || '',
    addressReference: user?.addressReference || '',
  });

  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');

  // Update form if user data loads late
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        phone: user.phone || '',
        addressStreet: user.addressStreet || '',
        addressNumber: user.addressNumber || '',
        addressComplement: user.addressComplement || '',
        addressNeighborhood: user.addressNeighborhood || '',
        addressCity: user.addressCity || '',
        addressState: user.addressState || '',
        addressZip: user.addressZip || '',
        addressReference: user.addressReference || '',
      });
    }
  }, [user]);

  // Format phone dynamic mask
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digits = rawValue.replace(/\D/g, '').slice(0, 11);
    
    let formatted = '';
    if (digits.length > 0) {
      formatted = `(${digits.slice(0, 2)}`;
      if (digits.length > 2) {
        formatted += `) ${digits.slice(2, 7)}`;
      }
      if (digits.length > 7) {
        formatted += `-${digits.slice(7, 11)}`;
      }
    }
    
    setFormData(prev => ({ ...prev, phone: formatted }));
  };

  // Format CEP dynamic mask and trigger auto-lookup when fully typed (8 digits)
  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const digits = rawValue.replace(/\D/g, '').slice(0, 8);
    
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5)}`;
    }
    
    setFormData(prev => ({ ...prev, addressZip: formatted }));

    if (digits.length === 8) {
      lookupCEP(digits);
    }
  };

  const lookupCEP = async (cep: string) => {
    setCepLoading(true);
    setCepError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();
      
      if (data.erro) {
        setCepError('CEP não encontrado.');
      } else {
        setFormData(prev => ({
          ...prev,
          addressStreet: data.logradouro || prev.addressStreet,
          addressNeighborhood: data.bairro || prev.addressNeighborhood,
          addressCity: data.localidade || prev.addressCity,
          addressState: data.uf || prev.addressState,
        }));
      }
    } catch (err) {
      setCepError('Erro ao buscar o CEP.');
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Assemble the complete unified formatted address string
    const parts = [];
    if (formData.addressStreet) {
      let streetAndNum = formData.addressStreet;
      if (formData.addressNumber) streetAndNum += `, Nº ${formData.addressNumber}`;
      parts.push(streetAndNum);
    }
    if (formData.addressComplement) parts.push(formData.addressComplement);
    if (formData.addressNeighborhood) parts.push(formData.addressNeighborhood);
    if (formData.addressCity) {
      let cityAndState = formData.addressCity;
      if (formData.addressState) cityAndState += `/${formData.addressState.toUpperCase()}`;
      parts.push(cityAndState);
    }
    if (formData.addressZip) parts.push(`CEP: ${formData.addressZip}`);
    if (formData.addressReference) parts.push(`Ref: ${formData.addressReference}`);
    
    const combinedAddress = parts.join(' - ');

    // Update with both split values and the unified address
    await updateUser({
      ...formData,
      address: combinedAddress,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-brand/10 p-2.5 rounded-xl text-brand">
          <UserIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wider">Meus Dados</h1>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie suas informações de contato e endereço para entregas rápidas.</p>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informações Básicas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3 flex items-center gap-2">
            <UserIcon size={14} className="text-brand" /> Dados Pessoais
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Nome Completo
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium"
                placeholder="Seu nome completo"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Número de Contato (WhatsApp)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Phone size={14} />
                </span>
                <input
                  type="tel"
                  required
                  placeholder="(XX) XXXXX-XXXX"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className="w-full pl-10 pr-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Endereço de Entrega Detalhado */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-xs font-black text-gray-900 uppercase tracking-widest border-b border-gray-100 pb-3 flex items-center gap-2">
            <MapPin size={14} className="text-brand" /> Endereço de Entrega
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {/* CEP */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center justify-between">
                <span>CEP</span>
                {cepLoading && <span className="text-[9px] text-brand lowercase animate-pulse">buscando...</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  maxLength={9}
                  placeholder="00000-000"
                  value={formData.addressZip}
                  onChange={handleCEPChange}
                  className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium font-mono"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400">
                  <Search size={14} />
                </span>
              </div>
              {cepError && <p className="text-[9px] text-red-500 mt-1 font-bold">{cepError}</p>}
            </div>

            {/* Empty space on desktop for grid visual balance */}
            <div className="hidden md:block md:col-span-4" />

            {/* Rua */}
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Rua / Logradouro
              </label>
              <input
                type="text"
                required
                placeholder="Rua, Avenida, Travessa..."
                value={formData.addressStreet}
                onChange={e => setFormData({ ...formData, addressStreet: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium"
              />
            </div>

            {/* Número */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Número
              </label>
              <input
                type="text"
                required
                placeholder="Nº ou S/N"
                value={formData.addressNumber}
                onChange={e => setFormData({ ...formData, addressNumber: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium"
              />
            </div>

            {/* Complemento */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Complemento
              </label>
              <input
                type="text"
                placeholder="Ex: Apto 101, Bloco B, Fundos..."
                value={formData.addressComplement}
                onChange={e => setFormData({ ...formData, addressComplement: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium"
              />
            </div>

            {/* Bairro */}
            <div className="md:col-span-3">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Bairro
              </label>
              <input
                type="text"
                required
                placeholder="Nome do bairro"
                value={formData.addressNeighborhood}
                onChange={e => setFormData({ ...formData, addressNeighborhood: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium"
              />
            </div>

            {/* Município / Cidade */}
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Município / Cidade
              </label>
              <input
                type="text"
                required
                placeholder="Cidade"
                value={formData.addressCity}
                onChange={e => setFormData({ ...formData, addressCity: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium"
              />
            </div>

            {/* Estado */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Estado (UF)
              </label>
              <select
                required
                value={formData.addressState}
                onChange={e => setFormData({ ...formData, addressState: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium uppercase"
              >
                <option value="">Selecione...</option>
                <option value="AC">AC</option>
                <option value="AL">AL</option>
                <option value="AP">AP</option>
                <option value="AM">AM</option>
                <option value="BA">BA</option>
                <option value="CE">CE</option>
                <option value="DF">DF</option>
                <option value="ES">ES</option>
                <option value="GO">GO</option>
                <option value="MA">MA</option>
                <option value="MT">MT</option>
                <option value="MS">MS</option>
                <option value="MG">MG</option>
                <option value="PA">PA</option>
                <option value="PB">PB</option>
                <option value="PR">PR</option>
                <option value="PE">PE</option>
                <option value="PI">PI</option>
                <option value="RJ">RJ</option>
                <option value="RN">RN</option>
                <option value="RS">RS</option>
                <option value="RO">RO</option>
                <option value="RR">RR</option>
                <option value="SC">SC</option>
                <option value="SP">SP</option>
                <option value="SE">SE</option>
                <option value="TO">TO</option>
              </select>
            </div>

            {/* Ponto de Referência */}
            <div className="md:col-span-6">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Ponto de Referência
              </label>
              <input
                type="text"
                placeholder="Ex: Próximo à padaria, em frente ao colégio..."
                value={formData.addressReference}
                onChange={e => setFormData({ ...formData, addressReference: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand transition-colors font-medium"
              />
            </div>
          </div>
        </div>

        {/* Visualização do Endereço Completo */}
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-4">
          <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Como seu endereço aparecerá no pedido
          </span>
          <p className="text-xs text-gray-600 font-medium">
            {formData.addressStreet ? (
              <span>
                {formData.addressStreet}
                {formData.addressNumber ? `, Nº ${formData.addressNumber}` : ''}
                {formData.addressComplement ? ` - ${formData.addressComplement}` : ''}
                {formData.addressNeighborhood ? ` - ${formData.addressNeighborhood}` : ''}
                {formData.addressCity ? ` - ${formData.addressCity}` : ''}
                {formData.addressState ? `/${formData.addressState.toUpperCase()}` : ''}
                {formData.addressZip ? ` - CEP: ${formData.addressZip}` : ''}
                {formData.addressReference ? ` (Ref: ${formData.addressReference})` : ''}
              </span>
            ) : (
              <span className="text-gray-400 italic">Preencha os campos para ver a formatação do endereço.</span>
            )}
          </p>
        </div>

        {/* Botão Salvar */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <span className="text-xs font-black text-green-600 uppercase tracking-widest animate-pulse">
              Dados salvos com sucesso!
            </span>
          )}
          <button
            type="submit"
            className="bg-brand text-white px-6 py-3.5 rounded-xl shadow-sm hover:bg-brand-dark flex items-center gap-2 text-xs font-black uppercase tracking-widest transition-colors cursor-pointer select-none"
          >
            <Save size={16} />
            Salvar Dados
          </button>
        </div>
      </form>
    </div>
  );
}
