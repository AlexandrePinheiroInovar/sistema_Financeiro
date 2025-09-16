import React, { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

interface UserRegistrationProps {
  onClose?: () => void;
}

interface UserFormData {
  name: string;
  sector: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export const UserRegistration: React.FC<UserRegistrationProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    sector: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
    if (!formData.password || formData.password.length < 6) {
      setMessage({ type: 'error', text: 'Senha deve ter pelo menos 6 caracteres' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setMessage(null);

    try {
      // 1. Criar usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email, 
        formData.password
      );

      const userId = userCredential.user.uid;

      // 2. Salvar dados adicionais no Firestore
      await setDoc(doc(db, 'users', userId), {
        name: formData.name,
        sector: formData.sector,
        email: formData.email,
        role: formData.role,
        createdAt: new Date(),
        createdBy: auth.currentUser?.email || 'system'
      });

      setMessage({ 
        type: 'success', 
        text: `Usuário ${formData.name} cadastrado com sucesso!` 
      });

      // Limpar formulário após sucesso
      setFormData({
        name: '',
        sector: '',
        email: '',
        password: '',
        role: 'user'
      });

    } catch (error: any) {
      console.error('Erro ao cadastrar usuário:', error);
      
      let errorMessage = 'Erro ao cadastrar usuário';
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

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
      padding: '24px',
      maxWidth: '500px',
      margin: '0 auto',
      width: '100%'
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
            fontSize: '18px',
            fontWeight: 'bold'
          }}>
            👤
          </div>
          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#111827',
            margin: 0
          }}>
            Cadastrar Novo Usuário
          </h2>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              color: '#6b7280',
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            placeholder="Digite o nome completo do usuário"
            required
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
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
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            required
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
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
            E-mail (será usado como login) *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            placeholder="usuario@empresa.com"
            required
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

        {/* Senha */}
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
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s'
            }}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          />
        </div>

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
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '12px 16px',
              border: '2px solid #d1d5db',
              borderRadius: '8px',
              fontSize: '16px',
              outline: 'none',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#3b82f6';
              e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#d1d5db';
              e.target.style.boxShadow = 'none';
            }}
          >
            <option value="user">👤 Usuário (Acesso básico)</option>
            <option value="admin">👑 Administrador (Acesso completo)</option>
          </select>
        </div>

        {/* Mensagem */}
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
            fontWeight: '500'
          }}>
            <span style={{ fontSize: '18px' }}>
              {message.type === 'success' ? '✅' : '❌'}
            </span>
            {message.text}
          </div>
        )}

        {/* Botão */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            backgroundColor: loading ? '#9ca3af' : '#3b82f6',
            color: 'white',
            fontWeight: '600',
            fontSize: '16px',
            padding: '14px 24px',
            borderRadius: '8px',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            boxShadow: loading ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 8px -1px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
            }
          }}
        >
          {loading ? (
            <>
              <div style={{
                width: '20px',
                height: '20px',
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
              Cadastrando usuário...
            </>
          ) : (
            <>
              <span style={{ fontSize: '18px' }}>👤</span>
              Cadastrar Novo Usuário
            </>
          )}
        </button>
      </form>
    </div>
  );
};