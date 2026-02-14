import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', background: '#111', color: '#ff385c', height: '100vh', overflow: 'auto', fontFamily: 'system-ui, sans-serif' }}>
          <h1 style={{ marginBottom: '20px' }}>Algo salió mal ⚠️</h1>
          <div style={{ background: 'rgba(255,56,96,0.1)', padding: '20px', borderRadius: '10px', border: '1px solid rgba(255,56,96,0.2)', marginBottom: '30px' }}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>{this.state.error && this.state.error.toString()}</h3>
            <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>Es posible que haya datos guardados que causan conflicto.</p>
          </div>

          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/';
            }}
            style={{
              padding: '16px 32px',
              fontSize: '1rem',
              fontWeight: '800',
              background: '#fff',
              color: '#000',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(255,255,255,0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            🔄 RESTAURAR APLICACIÓN (Borrar Datos)
          </button>

          <details style={{ marginTop: '40px' }}>
            <summary style={{ cursor: 'pointer', opacity: 0.5, marginBottom: '10px' }}>Ver detalles técnicos</summary>
            <pre style={{ color: '#aaa', fontSize: '0.7rem', overflowX: 'auto', background: '#000', padding: '20px', borderRadius: '10px' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
