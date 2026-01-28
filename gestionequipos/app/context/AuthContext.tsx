// gestionequipos/app/context/AuthContext
'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// --- 1. Definición de Tipos ---

// La Sede de un usuario
interface Sede {
  id: number;
  nombre: string;
}

// Información del usuario que guardaremos
export interface User {
  user_id: number;
  username: string;
  email: string;
  is_superuser: boolean;
  rol: string | null;
  sede: Sede | null;
  sedes_autorizadas?: Sede[];
}
// Lo que nuestro contexto va a proveer
interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (userData: any, token: string) => void; // Aceptamos 'any' para flexibilidad desde la API
  logout: () => void;
}

// --- 2. Creación del Contexto ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- 3. Creación del Proveedor del Contexto ---
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true); // Para saber si ya se verificó la sesión
  const router = useRouter();

  useEffect(() => {
    // Al cargar la app, revisamos si hay datos de sesión en localStorage
    try {
      const storedToken = localStorage.getItem('authToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Error al cargar datos de sesión:", error);
      // Si hay un error (ej. JSON malformado), limpiamos todo
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (userDataFromApi: any, authToken: string) => {
    // Transformamos la respuesta de la API a nuestro objeto User
    const userData: User = {
      user_id: userDataFromApi.id,
      username: userDataFromApi.username,
      email: userDataFromApi.email,
      is_superuser: userDataFromApi.is_superuser,
      rol: userDataFromApi.rol || null,
      sede: userDataFromApi.sede && userDataFromApi.sede.id ? userDataFromApi.sede : null,
      sedes_autorizadas: userDataFromApi.sedes_autorizadas || []
    };

    // Guardamos los datos en el estado y en localStorage
    localStorage.setItem('authToken', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    setToken(authToken);
    setIsAuthenticated(true);
    router.push('/dashboard'); // Redirigimos al dashboard
  };

  const logout = () => {
    // Limpiamos el estado y localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    router.push('/login'); // Redirigimos a la página de login
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// --- 4. Hook personalizado para usar el contexto fácilmente ---
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
}