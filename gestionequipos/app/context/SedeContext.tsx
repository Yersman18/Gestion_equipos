'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { useAuth, User } from './AuthContext'; // Importamos el tipo User

// --- 1. Definición de Tipos ---
interface Sede {
  id: number;
  nombre: string;
}
interface SedeContextType {
  sedesPermitidas: Sede[];
  sedeActiva: Sede | null;
  setSedeActiva: (sede: Sede) => void;
  isLoading: boolean;
}

// --- 2. Creación del Contexto ---
const SedeContext = createContext<SedeContextType | undefined>(undefined);

// --- 3. Creación del Proveedor del Contexto ---
export function SedeProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [sedeActiva, setSedeActivaState] = useState<Sede | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Solución Error 1: Casteamos 'user' para que TypeScript sepa que puede tener 'sedes_autorizadas'
  const sedesPermitidas = useMemo(() => {
    // Prioritize `sedes_autorizadas` if it exists (for users with multiple sedes)
    const autorizadas = (user as User & { sedes_autorizadas?: Sede[] })?.sedes_autorizadas;
    if (autorizadas && autorizadas.length > 0) {
      return autorizadas;
    }
    // Fallback to the user's primary `sede` if it exists
    if (user?.sede) {
      return [user.sede];
    }
    return [];
  }, [user]);

  useEffect(() => {
    if (isAuthLoading) {
      return; // Esperar a que el AuthContext termine de cargar
    }

    setIsLoading(true);

    if (sedesPermitidas.length > 0) {
      let sedeInicial: Sede | null = null;
      try {
        const storedSedeId = localStorage.getItem('sedeActivaId');
        if (storedSedeId) {
          // Solución Error 2: Añadimos el tipo explícito a 's'
          const sedeGuardada = sedesPermitidas.find((s: Sede) => s.id === parseInt(storedSedeId, 10));
          if (sedeGuardada) {
            sedeInicial = sedeGuardada;
          }
        }
      } catch (error) {
        console.error("Error al leer la sede activa de localStorage:", error);
        localStorage.removeItem('sedeActivaId');
      }

      // Si no hay sede guardada o la guardada no es válida, usar la primera de la lista de permitidas
      if (!sedeInicial && sedesPermitidas.length > 0) {
        sedeInicial = sedesPermitidas[0];
      }

      // Solución Error 3: Comprobamos que sedeInicial no sea null antes de usarlo
      if (sedeInicial) {
        setSedeActivaState(sedeInicial);
        localStorage.setItem('sedeActivaId', String(sedeInicial.id));
      }
    } else {
      setSedeActivaState(null);
    }

    setIsLoading(false);
  }, [isAuthLoading, sedesPermitidas]);

  const setSedeActiva = (sede: Sede) => {
    localStorage.setItem('sedeActivaId', String(sede.id));
    setSedeActivaState(sede);
  };

  return (
    <SedeContext.Provider value={{ sedesPermitidas, sedeActiva, setSedeActiva, isLoading }}>
      {children}
    </SedeContext.Provider>
  );
}

// --- 4. Hook personalizado para usar el contexto fácilmente ---
export function useSede() {
  const context = useContext(SedeContext);
  if (context === undefined) {
    throw new Error('useSede debe ser usado dentro de un SedeProvider');
  }
  return context;
}