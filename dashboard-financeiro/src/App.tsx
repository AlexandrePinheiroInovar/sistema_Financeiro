import React from 'react';
import './index.css';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Layout } from './components/Layout/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();

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