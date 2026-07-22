import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Register PWA service worker statically compiled by vite-plugin-pwa
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  registerSW({ immediate: true });
}

// Catch the install prompt globally at the earliest possible moment
let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  (window as any).deferredPrompt = e;
  
  // Dispatch a custom event to notify React components that the prompt is available
  window.dispatchEvent(new CustomEvent('pwa-prompt-available', { detail: e }));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  (window as any).deferredPrompt = null;
  console.log('PWA was installed');
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
