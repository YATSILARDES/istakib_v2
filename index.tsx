import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';


// DEBUG: Catch global errors
window.onerror = function (message, source, lineno, colno, error) {
  console.error(`Global Error: ${message}`, error);
  alert(`Error: ${message}\nSource: ${source}:${lineno}`);
  return false;
};

window.onunhandledrejection = function (event) {
  console.error(`Unhandled Rejection:`, event.reason);
  alert(`Unhandled Rejection: ${event.reason}`);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);