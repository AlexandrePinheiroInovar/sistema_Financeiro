import React, { useState, useMemo, useEffect } from 'react';
import { FileUpload } from './FileUpload';
import { KPICards } from './Cards/KPICards';
import { DRE } from './DRE';
import { DREPivot } from './DREPivot';
import { DREFullPivot } from './DREFullPivot';
import { CustomLineChart } from './Charts/LineChart';
import { CustomBarChart } from './Charts/BarChart';
import { GaugeChart } from './Charts/GaugeChart';
import { DataTable } from './Table/DataTable';
import { Filters } from './Filters';
import { UserRegistration } from './UserRegistration';
import { UserManagement } from './UserManagement';
import { ConfirmModal, ProgressModal } from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { updatePassword } from 'firebase/auth';
import { auth } from '../firebase';
import { FinancialRecord, PeriodFilter } from '../types';
import { DataService } from '../services/dataService';
import { FirestoreService } from '../services/firestoreService';

export const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<FinancialRecord[]>([]);
  const [darkMode, setDarkMode] = useState(true);
  // Desabilitado por padrão para o app considerar sempre o arquivo enviado
  const [disableDevAutoload, setDisableDevAutoload] = useState(true);
  const [firebaseStatus, setFirebaseStatus] = useState<'checking' | 'connected' | 'error' | 'permission-denied'>('checking');
  const [showUserRegistration, setShowUserRegistration] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteProgress, setShowDeleteProgress] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState('');
  const [deleteResult, setDeleteResult] = useState('');
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStep, setUploadStep] = useState('');
  const [currentModule, setCurrentModule] = useState<'dashboard' | 'users'>('dashboard');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>({
    type: 'monthly',
    period: 'all'
  });

  // Apply period filter to the already filtered records
  const finalFilteredRecords = useMemo(() => {
    // Debug: let's temporarily return just filteredRecords to test
    if (periodFilter.period === 'all') {
      return filteredRecords;
    }
    return DataService.filterByPeriod(filteredRecords, periodFilter.period, periodFilter.type);
  }, [filteredRecords, periodFilter]);

  const chartData = useMemo(() => {
    return {
      categoryData: DataService.getCategoryData(finalFilteredRecords),
      evolutionData: DataService.getEvolutionData(filteredRecords),
      comparisonData: DataService.getComparisonData(finalFilteredRecords),
      marginData: DataService.calculateDRE(finalFilteredRecords).margemLiquida
    };
  }, [finalFilteredRecords, filteredRecords]);


  const handleDataLoaded = async (data: FinancialRecord[]) => {
    try {
      console.log(`📊 UPLOAD: Arquivo processado com ${data.length} registros`);

      // Atualizar estado local imediatamente
      setRecords(data);
      setFilteredRecords(data);
      setPeriodFilter({ type: 'monthly', period: 'all' });

      console.log(`📊 ESTADO LOCAL: ${data.length} registros carregados na interface`);

      // Salvar no Firestore se usuário estiver logado
      if (user?.email && firebaseStatus === 'connected') {
        setShowUploadProgress(true);
        setUploadProgress(0);
        setUploadStep('Iniciando salvamento...');

        console.log(`💾 FIREBASE: Iniciando salvamento de ${data.length} registros...`);

        // Interceptar logs para mostrar progresso
        const originalLog = console.log;
        const batchSize = 400; // Mesmo valor do FirestoreService
        const totalBatches = Math.ceil(data.length / batchSize);

        console.log = (...args) => {
          const message = args.join(' ');

          // Capturar progresso dos batches
          if (message.includes('💾 Salvando batch')) {
            const batchMatch = message.match(/batch (\d+)/);
            if (batchMatch) {
              const currentBatch = parseInt(batchMatch[1]);
              const percentage = ((currentBatch - 1) / totalBatches) * 100;
              setUploadProgress(percentage);
              setUploadStep(`Salvando batch ${currentBatch} de ${totalBatches}`);
            }
          }

          // Capturar conclusão dos batches
          if (message.includes('✅ Batch') && message.includes('salvo com sucesso')) {
            const batchMatch = message.match(/Batch (\d+) salvo com sucesso/);
            if (batchMatch) {
              const currentBatch = parseInt(batchMatch[1]);
              const percentage = (currentBatch / totalBatches) * 100;
              setUploadProgress(percentage);
              setUploadStep(`Batch ${currentBatch} de ${totalBatches} salvo ✅`);
            }
          }

          // Capturar delays
          if (message.includes('⏳ Aguardando')) {
            setUploadStep('Aguardando para evitar sobrecarga...');
          }

          originalLog(...args);
        };

        await FirestoreService.saveRecords(data, user.email);

        // Restaurar console.log original
        console.log = originalLog;

        setUploadProgress(100);
        setUploadStep('Salvamento concluído!');
        console.log(`✅ FIREBASE: Todos os ${data.length} registros salvos com sucesso!`);

        // Fechar modal após 2 segundos
        setTimeout(() => {
          setShowUploadProgress(false);
          setUploadProgress(0);
          setUploadStep('');
        }, 2000);

      } else {
        console.log('⚠️ FIREBASE: Dados salvos apenas localmente (usuário não logado ou Firebase desconectado)');
      }
    } catch (error) {
      console.error('❌ ERRO no handleDataLoaded:', error);
      setShowUploadProgress(false);
      setUploadProgress(0);
      setUploadStep('');
      // Continuar funcionando mesmo se a gravação falhar
      alert(`Dados carregados localmente. Erro ao salvar no banco: ${(error as Error).message}`);
    }
  };

  // Carregar dados salvos do Firestore quando o usuário estiver logado
  useEffect(() => {
    const loadSavedData = async () => {
      if (!user?.email) {
        setFirebaseStatus('checking');
        return;
      }
      
      try {
        // Testar conexão primeiro
        console.log('🔗 Testando conexão com Firebase...');
        setFirebaseStatus('checking');
        const connected = await FirestoreService.testConnection();
        
        if (!connected) {
          console.log('⚠️ Conexão com Firebase falhou, usando dados locais');
          setFirebaseStatus('permission-denied');
          return;
        }
        
        setFirebaseStatus('connected');
        console.log('🔍 Verificando dados salvos no Firebase...');
        const savedRecords = await FirestoreService.loadRecords(user.email);

        if (savedRecords.length > 0) {
          console.log(`📊 CARREGAMENTO: ${savedRecords.length} registros encontrados no Firebase`);
          setRecords(savedRecords);
          setFilteredRecords(savedRecords);
          setPeriodFilter({ type: 'monthly', period: 'all' });
          setDisableDevAutoload(true); // Não carregar sample se já tem dados
          console.log(`📊 ESTADO LOCAL: ${savedRecords.length} registros carregados na interface desde o Firebase`);
          return;
        }
        
        console.log('📭 Nenhum dado salvo encontrado no Firebase');
      } catch (error: any) {
        console.error('❌ Erro ao carregar dados do Firebase:', error);
        if (error.code === 'permission-denied') {
          setFirebaseStatus('permission-denied');
        } else {
          setFirebaseStatus('error');
        }
      }
    };

    if (user?.email && records.length === 0) {
      loadSavedData();
    }
  }, [user?.email, records.length]);

  // DEV: auto-carrega um CSV de exemplo para visualização imediata
  useEffect(() => {
    const autoLoadSample = async () => {
      try {
        const res = await fetch('/sample-data.csv');
        if (!res.ok) return; // sem arquivo de exemplo
        const blob = await res.blob();
        const file = new File([blob], 'sample-data.csv', { type: 'text/csv' });
        const data = await DataService.parseFile(file);
        setRecords(data);
        setFilteredRecords(data);
        setPeriodFilter({ type: 'monthly', period: 'all' });
      } catch (e) {
        console.error('Falha ao auto-carregar sample-data.csv:', e);
      }
    };

    if ((import.meta as any).env?.DEV && records.length === 0 && !disableDevAutoload && !user?.email) {
      autoLoadSample();
    }
  }, [records.length, disableDevAutoload, user?.email]);

  const handleFilterChange = (filtered: FinancialRecord[]) => {
    setFilteredRecords(filtered);
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };


  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordData.newPassword || !passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Por favor, preencha todos os campos' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (!auth.currentUser) {
      setPasswordMessage({ type: 'error', text: 'Usuário não autenticado' });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage(null);

    try {
      await updatePassword(auth.currentUser, passwordData.newPassword);
      setPasswordMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });

      // Limpar formulário após sucesso
      setPasswordData({ newPassword: '', confirmPassword: '' });

      // Fechar modal após 2 segundos
      setTimeout(() => {
        setShowChangePassword(false);
        setPasswordMessage(null);
      }, 2000);

    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);

      let errorMessage = 'Erro ao atualizar senha';
      if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca';
      } else if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'Por segurança, você precisa fazer login novamente antes de alterar a senha';
      }

      setPasswordMessage({ type: 'error', text: errorMessage });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setShowDeleteProgress(true);
    setIsDeleting(true);
    setDeleteProgress('Iniciando processo de exclusão...');

    try {
      // Apagar dados do Firestore se usuário estiver logado
      if (user?.email && firebaseStatus === 'connected') {
        setDeleteProgress('Conectando ao Firebase...');

        // Interceptar logs para mostrar progresso
        const originalLog = console.log;
        console.log = (...args) => {
          const message = args.join(' ');
          if (message.includes('📄 Encontrados') || message.includes('🗑️') || message.includes('⏳') || message.includes('✅')) {
            setDeleteProgress(message);
          }
          originalLog(...args);
        };

        await FirestoreService.clearUserRecords(user.email);

        // Restaurar console.log original
        console.log = originalLog;

        setDeleteProgress('Dados removidos do Firebase com sucesso!');
      } else {
        setDeleteProgress('Limpando dados locais...');
      }

      // Limpar estado local
      setRecords([]);
      setFilteredRecords([]);
      setPeriodFilter({ type: 'monthly', period: 'all' });
      setDisableDevAutoload(true);

      const totalDeleted = records.length;
      setDeleteResult(`✅ ${totalDeleted} registros foram removidos com sucesso!`);
      setDeleteProgress('');

    } catch (error) {
      console.error('❌ Erro ao apagar dados:', error);
      setDeleteResult(`❌ Erro ao apagar dados: ${(error as Error).message}`);
      setDeleteProgress('');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={darkMode ? '' : 'light'}>
      <div className="container">
        <header className="header">
          <h1><span className="dre-loc-text">DRE LOC</span><span className="agora-text">AGORA</span></h1>
          <div className="header-controls">

            {/* Navegação de Módulos */}
            <div style={{ display: 'flex', gap: '8px', marginRight: '16px' }}>
              <button
                onClick={() => setCurrentModule('dashboard')}
                style={{
                  backgroundColor: currentModule === 'dashboard' ? '#3b82f6' : 'transparent',
                  color: currentModule === 'dashboard' ? 'white' : '#6b7280',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s'
                }}
              >
                📊 Dashboard
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => setCurrentModule('users')}
                  style={{
                    backgroundColor: currentModule === 'users' ? '#10b981' : 'transparent',
                    color: currentModule === 'users' ? 'white' : '#6b7280',
                    border: '2px solid #10b981',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  👥 Usuários
                </button>
              )}
            </div>

            <div className="user-menu" style={{ position: 'relative' }}>
              <div
                className="user-info"
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ cursor: 'pointer', position: 'relative' }}
              >
                <div className="user-avatar">
                  {getUserInitials(user?.name || 'U')}
                </div>
                <div>
                  <span style={{ fontWeight: '600' }}>
                    {user?.name || user?.email?.split('@')[0] || 'Usuário'}
                  </span>
                  {user?.sector && (
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {user.sector}
                    </div>
                  )}
                  <div className="firebase-status">
                    {firebaseStatus === 'checking' && <span>🔄 Verificando Firebase...</span>}
                    {firebaseStatus === 'connected' && <span style={{color: '#10b981'}}>✅ Firebase conectado</span>}
                    {firebaseStatus === 'permission-denied' && <span style={{color: '#f59e0b'}}>⚠️ Firebase sem permissão</span>}
                    {firebaseStatus === 'error' && <span style={{color: '#ef4444'}}>❌ Erro no Firebase</span>}
                  </div>
                </div>
                <div style={{
                  marginLeft: '8px',
                  transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}>
                  ▼
                </div>
              </div>

              {/* Dropdown Menu */}
              {showUserMenu && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                  border: '1px solid #e5e7eb',
                  minWidth: '200px',
                  zIndex: 50,
                  marginTop: '8px'
                }}>
                  <div style={{ padding: '8px 0' }}>
                    {/* Perfil */}
                    <div style={{
                      padding: '12px 16px',
                      borderBottom: '1px solid #e5e7eb',
                      backgroundColor: '#f9fafb'
                    }}>
                      <div style={{ fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                        {user?.name || user?.email?.split('@')[0] || 'Usuário'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#6b7280' }}>
                        {user?.email}
                      </div>
                      {user?.sector && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          backgroundColor: '#e5e7eb',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          display: 'inline-block',
                          marginTop: '4px'
                        }}>
                          {user.sector}
                        </div>
                      )}
                    </div>

                    {/* Menu Items */}
                    <button
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowUserMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      🔑 Trocar Senha
                    </button>

                    <button
                      onClick={() => {
                        toggleTheme();
                        setShowUserMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#374151',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {darkMode ? '☀️' : '🌙'} {darkMode ? 'Tema Claro' : 'Tema Escuro'}
                    </button>

                    <div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }} />

                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        padding: '12px 16px',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontWeight: '500'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      🚪 Sair
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Conteúdo dos Módulos */}
        {currentModule === 'users' ? (
          <UserManagement />
        ) : (
          // Módulo Dashboard Financeiro
          records.length === 0 ? (
            <FileUpload onDataLoaded={handleDataLoaded} userRole={user?.role} />
          ) : (
            <>
              <div className="dashboard-summary">
                <p>
                  Exibindo <strong>{finalFilteredRecords.length}</strong> registros de{' '}
                  <strong>{records.length}</strong> total
                </p>

                <div style={{ display: 'flex', gap: '12px', marginLeft: 'auto', alignItems: 'center' }}>
                  {/* Botão de importar nova planilha - apenas para administradores */}
                  {user?.role === 'admin' && (
                    <div style={{ position: 'relative' }}>
                      <input
                        type="file"
                        id="file-input-dashboard"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Criar um evento simulado para usar a mesma lógica do FileUpload
                            const fakeFileUpload = {
                              handleFile: async (file: File) => {
                                try {
                                  const data = await DataService.parseFile(file);
                                  if (data.length === 0) {
                                    alert('Nenhum registro válido encontrado no arquivo.');
                                    return;
                                  }
                                  // Mesclar novos dados com os existentes
                                  const mergedData = [...records, ...data];
                                  await handleDataLoaded(mergedData);
                                } catch (err) {
                                  alert(err instanceof Error ? err.message : 'Erro ao processar arquivo');
                                }
                              }
                            };
                            fakeFileUpload.handleFile(file);
                          }
                          // Limpar o input para permitir selecionar o mesmo arquivo novamente
                          e.target.value = '';
                        }}
                        style={{ display: 'none' }}
                      />
                      <label
                        htmlFor="file-input-dashboard"
                        className="upload-button"
                        style={{ cursor: 'pointer', margin: 0 }}
                        title="Adicionar mais dados ao sistema"
                      >
                        📊 Importar Planilha
                      </label>
                    </div>
                  )}

                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="upload-button"
                    title="Limpa os dados carregados para subir uma nova planilha"
                    disabled={isDeleting}
                    style={{ margin: 0 }}
                  >
                    🗑️ Apagar Tudo
                  </button>
                </div>
              </div>

              <Filters records={records} onFilterChange={handleFilterChange} />

              <KPICards records={filteredRecords} />

              <DRE records={finalFilteredRecords} />

              <div className="charts-section">
                <CustomBarChart
                  data={chartData.categoryData}
                  title="Distribuição por Categoria"
                  layout="vertical"
                />
                <CustomBarChart
                  data={chartData.comparisonData}
                  title="Comparativo DRE"
                />
              </div>

              <div className="charts-section">
                <CustomLineChart
                  data={chartData.evolutionData}
                  title="Evolução Mensal"
                />
                <GaugeChart
                  value={chartData.marginData}
                  title="Margem Líquida"
                />
              </div>

              <DataTable records={finalFilteredRecords} />

              <DREPivot records={finalFilteredRecords} />

              <DREFullPivot records={finalFilteredRecords} />
            </>
          )
        )}

        {/* Modal de cadastro de usuário - apenas para administradores */}
        {showUserRegistration && user?.role === 'admin' && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <UserRegistration onClose={() => setShowUserRegistration(false)} />
            </div>
          </div>
        )}

        {/* Modal de confirmação de exclusão */}
        <ConfirmModal
          isOpen={showDeleteConfirm}
          title="Apagar tudo?"
          message={`Deseja realmente apagar todos os dados do sistema? Esta ação não pode ser desfeita.`}
          confirmText="🗑️ Sim, apagar tudo"
          cancelText="Não, cancelar"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            console.log('🔍 Modal cancelado');
            setShowDeleteConfirm(false);
          }}
          isDestructive={true}
        />

        {/* Modal de progresso/resultado da exclusão */}
        <ProgressModal
          isOpen={showDeleteProgress}
          title={deleteResult ? "Exclusão Concluída" : "Apagando Dados"}
          message={deleteResult || "Aguarde enquanto os dados são removidos..."}
          progress={deleteProgress}
          isLoading={!deleteResult}
          showCloseButton={!!deleteResult}
          onClose={() => {
            setShowDeleteProgress(false);
            setDeleteResult('');
            setDeleteProgress('');
          }}
        />

        {/* Modal de troca de senha */}
        {showChangePassword && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              maxHeight: '90vh',
              overflow: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px',
                borderBottom: '2px solid #e5e7eb',
                paddingBottom: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    backgroundColor: '#3b82f6',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '18px'
                  }}>
                    🔑
                  </div>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#111827',
                    margin: 0
                  }}>
                    Trocar Senha
                  </h2>
                </div>
                <button
                  onClick={() => setShowChangePassword(false)}
                  style={{
                    color: '#6b7280',
                    backgroundColor: 'transparent',
                    border: 'none',
                    fontSize: '20px',
                    cursor: 'pointer',
                    padding: '8px',
                    borderRadius: '4px'
                  }}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Nova Senha *
                  </label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite sua nova senha (mínimo 6 caracteres)"
                    minLength={6}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Confirmar Nova Senha *
                  </label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme sua nova senha"
                    minLength={6}
                    required
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                  />
                </div>

                {/* Mensagem de feedback */}
                {passwordMessage && (
                  <div style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    backgroundColor: passwordMessage.type === 'success' ? '#dcfce7' : '#fee2e2',
                    color: passwordMessage.type === 'success' ? '#166534' : '#991b1b',
                    border: `2px solid ${passwordMessage.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <span style={{ fontSize: '16px' }}>
                      {passwordMessage.type === 'success' ? '✅' : '❌'}
                    </span>
                    {passwordMessage.text}
                  </div>
                )}

                <div style={{
                  display: 'flex',
                  gap: '12px',
                  marginTop: '8px'
                }}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePassword(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                      setPasswordMessage(null);
                    }}
                    disabled={passwordLoading}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      backgroundColor: passwordLoading ? '#f9fafb' : '#f3f4f6',
                      color: passwordLoading ? '#9ca3af' : '#374151',
                      border: '2px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: passwordLoading ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    style={{
                      flex: 1,
                      padding: '12px 24px',
                      backgroundColor: passwordLoading ? '#9ca3af' : '#3b82f6',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: passwordLoading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {passwordLoading ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff',
                          borderTop: '2px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        <style>{`
                          @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                          }
                        `}</style>
                        Atualizando...
                      </>
                    ) : (
                      'Confirmar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal de progresso do upload */}
        <ProgressModal
          isOpen={showUploadProgress}
          title="Salvando Dados"
          message="Salvando registros no Firebase..."
          progressPercentage={uploadProgress}
          currentStep={uploadStep}
          isLoading={uploadProgress < 100}
          showCloseButton={uploadProgress >= 100}
          onClose={() => {
            setShowUploadProgress(false);
            setUploadProgress(0);
            setUploadStep('');
          }}
        />
      </div>
    </div>
  );
};
