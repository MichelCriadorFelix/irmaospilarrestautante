import { useState } from 'react';
import { Cookie } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function CookieConsentBanner() {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);

  if (!user || user.cookieConsentAt) return null;

  const handleAccept = async () => {
    setSaving(true);
    try {
      await updateUser({ cookieConsentAt: Date.now() });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[60] p-3 md:p-4 pb-[calc(theme(spacing.3)+env(safe-area-inset-bottom))] md:pb-4">
      <div className="max-w-2xl mx-auto bg-gray-900 text-white rounded-xl shadow-2xl border border-gray-700 p-4 flex flex-col sm:flex-row items-center gap-3">
        <div className="p-2 bg-white/10 rounded-lg shrink-0">
          <Cookie size={18} />
        </div>
        <p className="text-[11px] leading-relaxed font-medium text-gray-200 flex-1 text-center sm:text-left">
          Usamos cookies e dados de navegação essenciais para o funcionamento do app e para melhorar sua experiência, conforme a LGPD. Ao continuar, você concorda com isso.
        </p>
        <button
          onClick={handleAccept}
          disabled={saving}
          className="shrink-0 bg-brand text-white text-[11px] font-bold uppercase tracking-widest px-5 py-2 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-60 cursor-pointer"
        >
          {saving ? 'Salvando...' : 'Aceitar'}
        </button>
      </div>
    </div>
  );
}
