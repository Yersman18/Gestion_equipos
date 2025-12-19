'use client';

import { useAuth } from '../../context/AuthContext';
import { useSede } from '../..//context/SedeContext';
import Link from 'next/link';

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { sedesPermitidas, sedeActiva, setSedeActiva, isLoading: isSedeLoading } = useSede();

  const handleSedeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedSedeId = Number(event.target.value);
    const nuevaSedeActiva = sedesPermitidas.find(sede => sede.id === selectedSedeId);
    if (nuevaSedeActiva) {
      setSedeActiva(nuevaSedeActiva);
      // Opcional: Recargar la página para que los datos se actualicen
      window.location.reload();
    }
  };

  // No renderizar el Navbar si el usuario no está autenticado
  if (!isAuthenticated) {
    return null;
  }

  return (
    <nav className="bg-gray-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="font-bold text-xl text-green-400">
              Gestión Integra
            </Link>
          </div>

          <div className="flex items-center space-x-4">
            {/* --- Selector de Sede --- */}
            {sedesPermitidas.length > 1 ? (
              <div className="flex items-center">
                <label htmlFor="sede-selector" className="text-sm font-medium mr-2">Sede:</label>
                <select
                  id="sede-selector"
                  value={sedeActiva?.id || ''}
                  onChange={handleSedeChange}
                  disabled={isSedeLoading}
                  className="bg-gray-700 border border-gray-600 rounded-md py-1 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {sedesPermitidas.map(sede => (
                    <option key={sede.id} value={sede.id}>{sede.nombre}</option>
                  ))}
                </select>
              </div>
            ) : (
              <span className="text-sm">{sedeActiva?.nombre}</span>
            )}

            <span className="text-sm font-medium">|</span>
            <span className="text-sm">Hola, {user?.username}</span>
            <button onClick={logout} className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-1 px-3 rounded-lg transition-colors">
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
