import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// expose the store for scripted visual testing in development builds only
if (import.meta.env.DEV) {
  import('./store/useStore').then(({ useStore }) => {
    (window as unknown as { __store: typeof useStore }).__store = useStore;
  });
}
