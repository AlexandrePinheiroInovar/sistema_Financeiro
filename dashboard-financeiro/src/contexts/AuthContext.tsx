import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

interface User {
  uid: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  sector?: string;
  isFirebaseUser?: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Função para buscar dados do usuário no Firestore
  const fetchUserData = async (firebaseUser: FirebaseUser): Promise<User> => {
    try {
      console.log('🔍 Buscando dados do usuário no Firestore...');
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (userDoc.exists()) {
        const userData = userDoc.data();
        console.log('✅ Dados encontrados no Firestore:', userData.name);

        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: userData.name || firebaseUser.email?.split('@')[0] || 'Usuário',
          role: userData.role || 'user',
          sector: userData.sector,
          isFirebaseUser: true
        };
      } else {
        console.log('⚠️ Usuário não encontrado no Firestore, usando dados do Firebase Auth');
        return {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          role: 'user', // Padrão para usuários não cadastrados
          isFirebaseUser: true
        };
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados do usuário:', error);
      return {
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.email?.split('@')[0] || 'Usuário',
        role: 'user',
        isFirebaseUser: true
      };
    }
  };

  useEffect(() => {
    // Listen to Firebase Auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in with Firebase - buscar dados completos no Firestore
        console.log('🔥 Usuário autenticado no Firebase:', firebaseUser.email);

        const userData = await fetchUserData(firebaseUser);
        setUser(userData);
        localStorage.setItem('dashboard-user', JSON.stringify(userData));

      } else {
        // No Firebase user, check localStorage for demo users
        const storedUser = localStorage.getItem('dashboard-user');
        if (storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            // Se não é usuário Firebase, manter dados locais
            if (!userData.isFirebaseUser) {
              setUser(userData);
            } else {
              // Era usuário Firebase mas não está mais logado
              setUser(null);
              localStorage.removeItem('dashboard-user');
            }
          } catch (error) {
            console.error('Error parsing stored user data:', error);
            localStorage.removeItem('dashboard-user');
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // Cleanup listener
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      // First, try Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Login Firebase realizado:', userCredential.user.email);

      // O onAuthStateChanged será disparado automaticamente e buscará os dados do Firestore
      setIsLoading(false);
      return true;
    } catch (firebaseError: any) {
      console.log('⚠️ Firebase Auth falhou, tentando demo users...', firebaseError.code);

      // Fallback to demo users for development
      const validCredentials = [
        { email: 'admin@dashboard.com', password: 'admin123', name: 'Administrador', role: 'admin' as const, sector: 'TI' },
        { email: 'usuario@dashboard.com', password: 'usuario123', name: 'Usuário', role: 'user' as const, sector: 'Financeiro' },
        { email: 'demo@dashboard.com', password: 'demo123', name: 'Demo User', role: 'user' as const, sector: 'Vendas' }
      ];

      const validUser = validCredentials.find(
        cred => cred.email === email && cred.password === password
      );

      if (validUser) {
        const userData: User = {
          uid: `demo-${validUser.email}`, // UID demo para compatibilidade
          email: validUser.email,
          name: validUser.name,
          role: validUser.role,
          sector: validUser.sector,
          isFirebaseUser: false
        };

        setUser(userData);
        localStorage.setItem('dashboard-user', JSON.stringify(userData));
        setIsLoading(false);
        console.log('✅ Login demo realizado:', userData.email);
        return true;
      } else {
        setIsLoading(false);
        return false;
      }
    }
  };

  const refreshUserData = async () => {
    if (auth.currentUser && user?.isFirebaseUser) {
      console.log('🔄 Atualizando dados do usuário...');
      const updatedUserData = await fetchUserData(auth.currentUser);
      setUser(updatedUserData);
      localStorage.setItem('dashboard-user', JSON.stringify(updatedUserData));
    }
  };

  const logout = async () => {
    try {
      // Try Firebase signOut first
      await signOut(auth);
      console.log('🔥 Firebase logout realizado');
    } catch (error) {
      console.log('⚠️ Firebase logout falhou, fazendo logout local');
    }

    // Always clear local state
    setUser(null);
    localStorage.removeItem('dashboard-user');
  };

  const value: AuthContextType = {
    user,
    login,
    logout,
    refreshUserData,
    isLoading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};