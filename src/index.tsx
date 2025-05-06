import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

// Create root element
const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

// Create root
const root = createRoot(rootElement);

// Render app
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 