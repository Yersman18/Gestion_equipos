import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '../app/context/AuthContext';

import { useSede } from '../app/context/SedeContext';

interface NavbarProps {
  toggleSidebar: () => void;
}

export function Navbar({ toggleSidebar }: NavbarProps) {
  const { user, logout } = useAuth();
  const { sedeActiva, sedesPermitidas, setSedeActiva } = useSede();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSedeDropdown, setShowSedeDropdown] = useState(false);

  return (
    <header className="bg-gradient-to-r from-green-500 via-green-600 to-green-500 shadow-lg h-16 flex items-center justify-between px-4 md:px-6">
      {/* Botón Hamburguesa para móvil */}
      <button onClick={toggleSidebar} className="text-white md:hidden p-2 rounded-md hover:bg-white/20 transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
        </svg>
      </button>

      {/* Selector de Sede */}
      <div className="relative hidden md:block">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => sedesPermitidas.length > 1 && setShowSedeDropdown(!showSedeDropdown)}
            className={`bg-white/20 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2 border border-white/30 transition-all ${sedesPermitidas.length > 1 ? 'hover:bg-white/30' : ''
              }`}
          >
            <span>Sede:</span>
            <span className="font-bold">{sedeActiva?.nombre || 'Sin sede'}</span>
            {sedesPermitidas.length > 1 && (
              <svg className={`w-4 h-4 transform transition-transform ${showSedeDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>
        </div>

        {showSedeDropdown && sedesPermitidas.length > 1 && (
          <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl py-2 w-56 z-50 border border-gray-200">
            {sedesPermitidas.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSedeActiva(s);
                  setShowSedeDropdown(false);
                  window.location.reload(); // Recargar para aplicar filtros globales
                }}
                className={`w-full text-left px-4 py-2 hover:bg-green-50 transition-colors flex items-center justify-between ${sedeActiva?.id === s.id ? 'text-green-600 font-bold bg-green-50/50' : 'text-gray-700'
                  }`}
              >
                <span>{s.nombre}</span>
                {sedeActiva?.id === s.id && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>


      {/* Página Principal Badge */}
      <div className="absolute left-1/2 transform -translate-x-1/2 hidden md:block">
        <div className="bg-white/90 px-6 py-2 rounded-full shadow-lg border-2 border-white">
          <span className="font-bold text-green-700">Página principal</span>
        </div>
      </div>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-all duration-200 border border-white/30"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl py-2 w-48 z-50 border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm text-gray-500">Usuario</p>
              {/* Mostramos el nombre de usuario real */}
              <p className="font-semibold text-gray-800">{user?.username || 'Usuario'}</p>
            </div>
            <button
              onClick={logout} // El botón ahora usa el logout del contexto
              className="w-full text-left px-4 py-2 hover:bg-red-50 transition-colors text-red-600 font-medium flex items-center space-x-2"
            >
              <span>🚪</span>
              <span>Cerrar Sesión</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
