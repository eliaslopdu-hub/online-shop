/**
 * main.tsx — React entry point.
 * Mounts <App/> into #root. StrictMode is intentionally OFF here: R3F + GSAP
 * ScrollTrigger + Web Audio all hold imperative, frame-driven state that double-
 * invokes poorly under StrictMode's dev double-render. (Re-enable for component
 * debugging if you account for the double effect.)
 */

import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element #root not found in index.html');
}

createRoot(container).render(<App />);
