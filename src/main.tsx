import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import './index.css';

// Global error handlers to prevent silent script failure crashes from third-party map or tracking scripts
window.addEventListener('error', (event) => {
  if (event.message === 'Script error.') {
    console.warn('Cross-origin script error captured safely:', event);
    event.preventDefault();
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Unhandled promise rejection captured safely:', event.reason);
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

