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
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const [todasLasSedes, setTodasLasSedes] = useState<Sede[]>([]);
  const [sedeActiva, setSedeActivaState] = useState<Sede | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Determinar si el usuario es admin/superuser
  const isAdmin = useMemo(() => {
    return user?.is_superuser || user?.rol === 'ADMIN';
  }, [user]);

  // Si es admin, cargamos todas las sedes de la API
  useEffect(() => {
    const fetchSedes = async () => {
      if (!isAdmin || !token) return;
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sedes/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTodasLasSedes(data);
        }
      } catch (error) {
        console.error("Error al cargar todas las sedes:", error);
      }
    };

    if (!isAuthLoading && isAdmin) {
      fetchSedes();
    }
  }, [isAdmin, token, isAuthLoading]);

  // Las sedes permitidas dependen de si es admin o no
  const sedesPermitidas = useMemo(() => {
    let permitidas: Sede[] = [];

    if (isAdmin && todasLasSedes.length > 0) {
      permitidas = [...todasLasSedes];
      // Añadimos opción de "Todas las Sedes" para admins
      const todasOption: Sede = { id: 0, nombre: 'Todas las Sedes' };
      if (!permitidas.find(s => s.id === 0)) {
        permitidas.unshift(todasOption);
      }
      return permitidas;
    }

    // Si no es admin, lógica anterior
    const autorizadas = (user as User & { sedes_autorizadas?: Sede[] })?.sedes_autorizadas;
    if (autorizadas && autorizadas.length > 0) {
      permitidas = autorizadas;
    } else if (user?.sede) {
      permitidas = [user.sede];
    }

    return permitidas;
  }, [user, isAdmin, todasLasSedes]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    // Solo procedemos si ya tenemos las sedes permitidas cargadas (si somos admin, esperamos a que todasLasSedes tenga algo)
    if (isAdmin && todasLasSedes.length === 0) {
      // Podríamos estar todavía cargando sedes para el admin
      // No quitamos el loading todavía
      return;
    }

    setIsLoading(true);

    if (sedesPermitidas.length > 0) {
      let sedeInicial: Sede | null = null;
      try {
        const storedSedeId = localStorage.getItem('sedeActivaId');
        if (storedSedeId) {
          const sedeGuardada = sedesPermitidas.find((s: Sede) => s.id === parseInt(storedSedeId, 10));
          if (sedeGuardada) {
            sedeInicial = sedeGuardada;
          }
        }
      } catch (error) {
        console.error("Error al leer la sede activa de localStorage:", error);
        localStorage.removeItem('sedeActivaId');
      }

      if (!sedeInicial && sedesPermitidas.length > 0) {
        sedeInicial = sedesPermitidas[0];
      }

      if (sedeInicial) {
        setSedeActivaState(sedeInicial);
        localStorage.setItem('sedeActivaId', String(sedeInicial.id));
      }
    } else {
      setSedeActivaState(null);
    }

    setIsLoading(false);
  }, [isAuthLoading, sedesPermitidas, isAdmin, todasLasSedes]);

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

