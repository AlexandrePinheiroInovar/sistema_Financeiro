import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal, ProgressModal } from './Modal';

interface User {
  id: string;
  name: string;
  sector: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: any;
  createdBy: string;
}

interface UserFormData {
  name: string;
  sector: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export const UserManagement: React.FC = () => {
  const { user, refreshUserData } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    sector: '',
    email: '',
    password: '',
    role: 'user'
  });

  const sectors = [
    'Administrativo',
    'Comercial',
    'Contabilidade',
    'Diretoria',
    'Financeiro',
    'Jurídico',
    'Logística',
    'Marketing',
    'Operações',
    'Produção',
    'Recursos Humanos',
    'Tecnologia da Informação',
    'Vendas'
  ];

  // Carregar usuários
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];

      querySnapshot.forEach((doc) => {
        usersData.push({
          id: doc.id,
          ...doc.data()
        } as User);
      });

      setUsers(usersData.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds));
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar usuários' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setMessage({ type: 'error', text: 'Nome é obrigatório' });
      return false;
    }
    if (!formData.sector.trim()) {
      setMessage({ type: 'error', text: 'Setor é obrigatório' });
      return false;
    }
    if (!formData.email.trim()) {
      setMessage({ type: 'error', text: 'E-mail é obrigatório' });
      return false;
    }
    if (!editingUser && (!formData.password || formData.password.length < 6)) {
      setMessage({ type: 'error', text: 'Senha deve ter pelo menos 6 caracteres' });
      return false;
    }
    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);

    try {
      // Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Salvar dados no Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: formData.name,
        sector: formData.sector,
        email: formData.email,
        role: formData.role,
        createdAt: new Date(),
        createdBy: user?.email || 'system'
      });

      console.log('✅ Dados do usuário salvos no Firestore');

      setMessage({ type: 'success', text: `Usuário ${formData.name} criado com sucesso!` });
      resetForm();
      loadUsers();

      // Atualizar dados do usuário atual se necessário
      await refreshUserData();

    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      let errorMessage = 'Erro ao criar usuário';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'E-mail inválido';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Senha muito fraca';
      }

      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser || !validateForm()) return;

    setLoading(true);
    setMessage(null);

    try {
      await updateDoc(doc(db, 'users', editingUser.id), {
        name: formData.name,
        sector: formData.sector,
        email: formData.email,
        role: formData.role,
        updatedAt: new Date(),
        updatedBy: user?.email || 'system'
      });

      setMessage({ type: 'success', text: `Usuário ${formData.name} atualizado com sucesso!` });
      resetForm();
      loadUsers();

    } catch (error) {
      console.error('Erro ao atualizar usuário:', error);
      setMessage({ type: 'error', text: 'Erro ao atualizar usuário' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
      setMessage({ type: 'success', text: 'Usuário removido com sucesso!' });
      setShowDeleteConfirm(null);
      loadUsers();
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
      setMessage({ type: 'error', text: 'Erro ao remover usuário' });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sector: '',
      email: '',
      password: '',
      role: 'user'
    });
    setShowCreateForm(false);
    setEditingUser(null);
  };

  const startEdit = (userToEdit: User) => {
    setFormData({
      name: userToEdit.name,
      sector: userToEdit.sector,
      email: userToEdit.email,
      password: '',
      role: userToEdit.role
    });
    setEditingUser(userToEdit);
    setShowCreateForm(true);
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Data não disponível';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR');
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: '#3b82f6',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>
              👥
            </div>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0,
                marginBottom: '4px'
              }}>
                Gerenciamento de Usuários
              </h1>
              <p style={{
                color: '#6b7280',
                margin: 0,
                fontSize: '16px'
              }}>
                Cadastre, edite e gerencie usuários do sistema
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateForm(true)}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{ fontSize: '18px' }}>+</span>
            Novo Usuário
          </button>
        </div>
      </div>

      {/* Mensagem de feedback */}
      {message && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2',
          color: message.type === 'success' ? '#166534' : '#991b1b',
          border: `2px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '24px'
        }}>
          <span style={{ fontSize: '18px' }}>
            {message.type === 'success' ? '✅' : '❌'}
          </span>
          {message.text}
        </div>
      )}

      {/* Grid Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showCreateForm ? '1fr 400px' : '1fr',
        gap: '24px'
      }}>

        {/* Lista de Usuários */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: 'bold',
              color: '#111827',
              margin: 0
            }}>
              Usuários Cadastrados ({users.length})
            </h2>
          </div>

          {loading ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                border: '4px solid #e5e7eb',
                borderTop: '4px solid #3b82f6',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              Carregando usuários...
            </div>
          ) : users.length === 0 ? (
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
              <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>Nenhum usuário encontrado</h3>
              <p style={{ margin: 0 }}>Clique em "Novo Usuário" para começar</p>
            </div>
          ) : (
            <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
              {users.map((userItem, index) => (
                <div
                  key={userItem.id}
                  style={{
                    padding: '20px',
                    borderBottom: index < users.length - 1 ? '1px solid #e5e7eb' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      backgroundColor: userItem.role === 'admin' ? '#f59e0b' : '#3b82f6',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontSize: '20px',
                      fontWeight: 'bold'
                    }}>
                      {userItem.role === 'admin' ? '👑' : '👤'}
                    </div>
                    <div>
                      <h3 style={{
                        margin: '0 0 4px 0',
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111827'
                      }}>
                        {userItem.name}
                      </h3>
                      <p style={{
                        margin: '0 0 2px 0',
                        fontSize: '14px',
                        color: '#6b7280'
                      }}>
                        {userItem.email}
                      </p>
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          backgroundColor: '#e5e7eb',
                          borderRadius: '12px',
                          color: '#374151'
                        }}>
                          {userItem.sector}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          padding: '2px 8px',
                          backgroundColor: userItem.role === 'admin' ? '#fef3c7' : '#dbeafe',
                          borderRadius: '12px',
                          color: userItem.role === 'admin' ? '#92400e' : '#1e40af'
                        }}>
                          {userItem.role === 'admin' ? 'Administrador' : 'Usuário'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => startEdit(userItem)}
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px'
                      }}
                    >
                      ✏️ Editar
                    </button>

                    {userItem.id !== user?.uid && (
                      <button
                        onClick={() => setShowDeleteConfirm(userItem.id)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        🗑️ Remover
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Formulário de Criação/Edição */}
        {showCreateForm && (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            padding: '24px',
            height: 'fit-content',
            position: 'sticky',
            top: '24px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#111827',
                margin: 0
              }}>
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h3>
              <button
                onClick={resetForm}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                editingUser ? handleUpdateUser() : handleCreateUser();
              }}
              style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
            >
              {/* Nome */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  required
                />
              </div>

              {/* Setor */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Setor *
                </label>
                <select
                  name="sector"
                  value={formData.sector}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                  required
                >
                  <option value="">Selecione o setor</option>
                  {sectors.map(sector => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>

              {/* E-mail */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  E-mail *
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                  disabled={!!editingUser}
                  required
                />
              </div>

              {/* Senha */}
              {!editingUser && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Senha *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '2px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                    minLength={6}
                    required
                  />
                </div>
              )}

              {/* Perfil */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Perfil de Acesso
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '2px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="user">👤 Usuário</option>
                  <option value="admin">👑 Administrador</option>
                </select>
              </div>

              {/* Botões */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '8px'
              }}>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    flex: 1,
                    padding: '10px',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '10px',
                    backgroundColor: loading ? '#9ca3af' : '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  {loading ? 'Salvando...' : (editingUser ? 'Atualizar' : 'Criar Usuário')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      <ConfirmModal
        isOpen={!!showDeleteConfirm}
        title="Confirmar Exclusão"
        message="Tem certeza que deseja remover este usuário? Esta ação não pode ser desfeita."
        confirmText="Remover"
        cancelText="Cancelar"
        onConfirm={() => showDeleteConfirm && handleDeleteUser(showDeleteConfirm)}
        onCancel={() => setShowDeleteConfirm(null)}
        isDestructive={true}
      />

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};