import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleResetAndReload = () => {
    try {
      // Clear localStorage to fix any state corruption issues
      localStorage.removeItem('mockUser');
      // Also clear other potential cache elements if any
    } catch (e) {
      console.error('Failed to clear localStorage on crash:', e);
    }
    // Hard reload the application (bypassing cache if supported)
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-md w-full text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <AlertTriangle size={28} />
            </div>
            
            <div className="space-y-1.5">
              <h1 className="text-base font-black text-gray-900 uppercase tracking-wider">Algo deu errado</h1>
              <p className="text-xs text-gray-500 leading-relaxed">
                Houve uma falha inesperada no carregamento desta página. Não se preocupe, podemos tentar recuperar agora mesmo!
              </p>
            </div>

            {this.state.error && (
              <div className="bg-gray-50 rounded-lg p-3 text-left border border-gray-150 max-h-24 overflow-y-auto">
                <p className="font-mono text-[9px] text-gray-400 uppercase tracking-widest font-black mb-1">Diagnóstico:</p>
                <p className="font-mono text-[10px] text-red-600 font-bold break-all leading-tight">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleResetAndReload}
              className="w-full flex items-center justify-center gap-2 bg-brand text-white py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-dark shadow-md active:scale-95 transition-all"
            >
              <RefreshCw size={14} className="animate-spin-slow" />
              Recarregar & Limpar Cache
            </button>
          </div>
        </div>
      );
    }

    return this.children;
  }
}
