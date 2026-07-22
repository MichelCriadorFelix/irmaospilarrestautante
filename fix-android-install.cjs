const fs = require('fs');

let content = fs.readFileSync('src/components/Layout.tsx', 'utf8');

// Add showAndroidInstructions state
content = content.replace('const [showIosInstructions, setShowIosInstructions] = useState(false);', 'const [showIosInstructions, setShowIosInstructions] = useState(false);\n  const [showAndroidInstructions, setShowAndroidInstructions] = useState(false);');

// Update handleInstallClick
const checkInstallRegex = /const handleInstallClick = async \(\) => \{[\s\S]*?alert\('Seu navegador não suporta instalação direta ou o app já está instalado\.'\);\n    \}\n  \};/m;

const newHandleInstall = `const handleInstallClick = async () => {
    const promptEvent = (window as any).deferredPrompt || deferredPrompt;
    
    if (promptEvent) {
      promptEvent.prompt();
      try {
        const choiceResult = await promptEvent.userChoice;
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
          setShowInstallBanner(false);
        }
      } catch (e) {
        console.error(e);
      }
      (window as any).deferredPrompt = null;
      setDeferredPrompt(null);
    } else if (isIos()) {
      setShowIosInstructions(true);
    } else if (isAndroid()) {
      setShowAndroidInstructions(true);
    } else {
      alert('Para instalar no computador, clique no ícone de instalação (monitor com seta) na barra de endereços do Chrome ou Edge, próximo ao ícone de favoritos.');
    }
  };`;

content = content.replace(checkInstallRegex, newHandleInstall);

// Add Android Modal just after iOS Modal
const androidModal = `
      {/* ANDROID INSTRUCTIONS MODAL */}
      {showAndroidInstructions && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4" onClick={() => setShowAndroidInstructions(false)}>
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowAndroidInstructions(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full">
              <X size={20} />
            </button>
            
            <div className="w-16 h-16 bg-brand/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
              <Smartphone size={32} className="text-brand" />
            </div>
            
            <h3 className="text-center font-black text-lg text-gray-900 mb-2 uppercase tracking-wide">Instalar no Android</h3>
            <p className="text-center text-sm text-gray-500 font-medium mb-8">Para instalar nosso app, siga os passos no seu navegador Chrome:</p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-600 text-sm">1</div>
                <div>
                  <p className="text-sm text-gray-800 font-bold">Abra o Menu</p>
                  <p className="text-xs text-gray-500 mt-1">Toque nos três pontinhos (⋮) no canto superior direito do Chrome.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center shrink-0 font-black text-gray-600 text-sm">2</div>
                <div>
                  <p className="text-sm text-gray-800 font-bold">Instalar Aplicativo</p>
                  <p className="text-xs text-gray-500 mt-1">Selecione "Instalar aplicativo" ou "Adicionar à tela inicial" na lista.</p>
                </div>
              </div>
            </div>
            
            <button 
              onClick={() => setShowAndroidInstructions(false)}
              className="w-full bg-brand text-white py-4 rounded-xl font-black uppercase tracking-widest text-xs mt-8 hover:bg-brand-dark transition-colors"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
`;

content = content.replace(/\{\/\* IOS INSTRUCTIONS MODAL \*\/\}/, `${androidModal}\n      {/* IOS INSTRUCTIONS MODAL */}`);

fs.writeFileSync('src/components/Layout.tsx', content);
