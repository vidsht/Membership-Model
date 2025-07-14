import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Global error handler for ResizeObserver and extension connection issues
const handleGlobalError = (event) => {
  // Suppress ResizeObserver errors
  if (event.message === 'ResizeObserver loop completed with undelivered notifications.') {
    event.preventDefault();
    console.warn('ResizeObserver error suppressed:', event.message);
    return false;
  }
  
  // Suppress browser extension connection errors
  if (event.message && event.message.includes('Could not establish connection') && 
      event.message.includes('Receiving end does not exist')) {
    event.preventDefault();
    console.warn('Browser extension connection error suppressed:', event.message);
    return false;
  }
};

// Global unhandled promise rejection handler
const handleUnhandledRejection = (event) => {
  // Suppress ResizeObserver rejections
  if (event.reason && event.reason.message && event.reason.message.includes('ResizeObserver')) {
    event.preventDefault();
    console.warn('ResizeObserver promise rejection suppressed:', event.reason.message);
    return false;
  }
  
  // Suppress browser extension connection rejections
  if (event.reason && event.reason.message && 
      event.reason.message.includes('Could not establish connection') && 
      event.reason.message.includes('Receiving end does not exist')) {
    event.preventDefault();
    console.warn('Browser extension connection promise rejection suppressed:', event.reason.message);
    return false;
  }
};

// Add global error listeners
window.addEventListener('error', handleGlobalError);
window.addEventListener('unhandledrejection', handleUnhandledRejection);

// Override console.error to filter out ResizeObserver errors
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out ResizeObserver errors
  if (args[0] && typeof args[0] === 'string' && (
    args[0].includes('ResizeObserver') ||
    (args[0].includes('Could not establish connection') && args[0].includes('Receiving end does not exist'))
  )) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Override console.warn to filter out ResizeObserver warnings
const originalConsoleWarn = console.warn;
console.warn = (...args) => {
  // Filter out ResizeObserver and extension connection warnings
  if (args[0] && typeof args[0] === 'string' && (
    args[0].includes('ResizeObserver') ||
    (args[0].includes('Could not establish connection') && args[0].includes('Receiving end does not exist'))
  )) {
    return;
  }
  originalConsoleWarn.apply(console, args);
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
