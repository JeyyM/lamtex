import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Prevent scroll wheel from changing number input values globally.
// Blurring the input hands scroll back to the page without preventing the wheel event.
document.addEventListener(
  'wheel',
  () => {
    if (
      document.activeElement instanceof HTMLInputElement &&
      document.activeElement.type === 'number'
    ) {
      document.activeElement.blur();
    }
  },
  { passive: true },
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
