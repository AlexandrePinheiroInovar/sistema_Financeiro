import React from 'react';
import './index.css';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { useIdleTimer } from './hooks/useIdleTimer';

const AppContent: React.FC = () => {
  const { user, isLoading, logout } = useAuth();

  // Auto-logout após 30 minutos de inatividade (apenas para usuários logados)
  useIdleTimer({
    timeout: 30 * 60 * 1000, // 30 minutos em milissegundos
    onIdle: () => {
      if (user) {
        console.log('⏰ Usuário inativo por 30 minutos. Fazendo logout automático...');
        logout();
      }
    }
  });

  if (isLoading) {
    return (
      <div className="loading">
        <div>Carregando...</div>
      </div>
    );
  }

  return user ? (
    <Layout>
      <Dashboard />
    </Layout>
  ) : (
    <Login />
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;