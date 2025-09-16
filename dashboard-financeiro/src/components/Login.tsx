import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import consultoriaGif from '../consultoria-nca-gif.gif';

export const Login: React.FC = () => {
  const { login, isLoading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = (): boolean => {
    const errors = {
      email: '',
      password: ''
    };

    // Validação de email
    if (!formData.email.trim()) {
      errors.email = 'E-mail é obrigatório';
    } else if (!validateEmail(formData.email)) {
      errors.email = 'E-mail inválido';
    }

    // Validação de senha
    if (!formData.password) {
      errors.password = 'Senha é obrigatória';
    } else if (formData.password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    setFieldErrors(errors);
    return !errors.email && !errors.password;
  };

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Limpar erro do campo quando usuário começar a digitar
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Limpar erro geral
    if (error) {
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validar formulário
    if (!validateForm()) {
      return;
    }

    try {
      const success = await login(formData.email, formData.password);

      if (!success) {
        setError('E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.');
      }
    } catch (err) {
      console.error('Erro durante login:', err);
      setError('Erro interno. Tente novamente mais tarde.');
    }
  };

  const PRIMARY_BLUE = '#1E3FAA';
  const ACCENT_GREEN = '#60D75A';

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${PRIMARY_BLUE} 0%, ${ACCENT_GREEN} 100%)`,
      position: 'relative',
      overflow: 'hidden',
      padding: 16
    }}>
      {/* keyframes para animar o degradê dos detalhes */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
      {/* Decorative blobs */}
      <div style={{
        position: 'absolute',
        top: -80,
        left: -80,
        width: 220,
        height: 220,
        backgroundImage: `linear-gradient(45deg, ${PRIMARY_BLUE}, ${ACCENT_GREEN})`,
        backgroundSize: '200% 200%',
        animation: 'gradientShift 8s ease infinite',
        borderRadius: '50% 40% 60% 35% / 45% 60% 40% 55%',
        opacity: 0.9
      }} />
      <div style={{
        position: 'absolute',
        bottom: -70,
        left: 40,
        width: 180,
        height: 180,
        backgroundImage: `linear-gradient(225deg, ${ACCENT_GREEN}, ${PRIMARY_BLUE})`,
        backgroundSize: '200% 200%',
        animation: 'gradientShift 10s ease-in-out infinite',
        borderRadius: '60% 35% 55% 40% / 55% 45% 60% 40%'
      }} />
      <div style={{
        position: 'absolute',
        top: 40,
        right: 80,
        width: 300,
        height: 220,
        backgroundImage: `linear-gradient(135deg, ${PRIMARY_BLUE} 0%, ${ACCENT_GREEN} 100%)`,
        backgroundSize: '200% 200%',
        animation: 'gradientShift 12s linear infinite',
        borderRadius: '32px',
        transform: 'rotate(20deg) skewX(-6deg)',
        boxShadow: '0 12px 40px rgba(30,63,170,0.25)'
      }} />
      {/* Layout: imagem à esquerda e card à direita */}
      <div style={{
        width: '100%',
        maxWidth: 1200,
        display: 'grid',
        gridTemplateColumns: '1fr 540px',
        alignItems: 'center',
        columnGap: 64,
        position: 'relative',
        zIndex: 1,
        padding: '0 8px 0 0'
      }}>
        <img src={consultoriaGif} alt="decor"
          style={{
            width: 560,
            maxWidth: '46vw',
            opacity: 1,
            filter: 'none',
            marginLeft: 0,
            transform: 'translateY(-6px)',
            justifySelf: 'center'
          }} />

        <div style={{
          width: 520,
          maxWidth: '96vw',
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 16px 40px rgba(0,0,0,0.18)',
          padding: 36
        }}>
        <div style={{ marginBottom: 10, color: '#1f2937', fontSize: 18, fontWeight: 600 }}>Bem vindo ao <span style={{ color: PRIMARY_BLUE, fontWeight: 800 }}>Dashboard Financeiro</span></div>
        <div style={{ marginBottom: 22, color: '#6b7280', fontSize: 14 }}>Preencha os dados do login para acessar</div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email */}
          <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Usuário</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              placeholder="seu@email.com"
              style={{
                width: '100%',
                height: 52,
                border: `1px solid ${fieldErrors.email ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: 6,
                padding: '0 14px',
                outline: 'none'
              }}
            />
            {fieldErrors.email && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{fieldErrors.email}</div>
            )}
          </div>

          {/* Password */}
          <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Senha</label>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="sua senha"
              style={{
                width: '100%',
                height: 52,
                border: `1px solid ${fieldErrors.password ? '#ef4444' : '#e5e7eb'}`,
                borderRadius: 6,
                padding: '0 56px 0 14px',
                outline: 'none'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              aria-label={showPassword ? 'Esconder senha' : 'Mostrar senha'}
              style={{
                position: 'absolute',
                right: 10,
                top: 10,
                height: 32,
                padding: '0 12px',
                borderRadius: 6,
                border: 'none',
                background: '#f3f4f6',
                cursor: 'pointer'
              }}
            >
              {showPassword ? 'Ocultar' : 'Mostrar'}
            </button>
            {fieldErrors.password && (
              <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{fieldErrors.password}</div>
            )}
          </div>

          {error && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fca5a5',
              color: '#991b1b',
              fontSize: 12,
              padding: '8px 10px',
              borderRadius: 6,
              marginBottom: 12
            }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            style={{
              width: '100%',
              height: 52,
              borderRadius: 8,
              border: 'none',
              color: '#ffffff',
              fontWeight: 800,
              letterSpacing: 0.3,
              cursor: 'pointer',
              background: `linear-gradient(90deg, ${PRIMARY_BLUE} 0%, ${ACCENT_GREEN} 100%)`,
              boxShadow: '0 10px 24px rgba(30,63,170,0.35)',
              fontSize: 15
            }}
          >
            {isLoading ? 'ENTRANDO...' : 'ENTRAR'}
          </button>
        </form>

        {/* footer helper removido por solicitação */}
        </div>
      </div>
    </div>
  );
};