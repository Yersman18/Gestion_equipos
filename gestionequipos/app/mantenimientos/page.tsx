'use client';
import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Mantenimiento {
  id: number;
  equipo_asociado_nombre: string;
  usuario_responsable_username: string;
  tipo_mantenimiento: string;
  estado_mantenimiento: string;
  fecha_inicio: string;
  sede: number;
}

const MantenimientosPage: React.FC = () => {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  
  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { sedeActiva, isLoading: isSedeLoading } = useSede();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading || isSedeLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Para usuarios no super-admins, si no hay sede activa, no mostrar nada.
    if (!sedeActiva && !user?.is_superuser) {
      setLoading(false);
      setMantenimientos([]);
      return;
    }

    const fetchMantenimientos = async () => {
      setLoading(true);
      setError(null);
      
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/`);
      // Si hay una sede activa, la añadimos como filtro.
      // Si el usuario es superuser y no hay sede, se traen todos.
      if (sedeActiva) {
        url.searchParams.append('sede', String(sedeActiva.id));
      }

      try {
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar los mantenimientos.');
        }

        const data = await response.json();
        const mantenimientosArray = Array.isArray(data) ? data : data.results || [];
        setMantenimientos(mantenimientosArray);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMantenimientos();
  }, [isAuthenticated, isAuthLoading, isSedeLoading, router, token, sedeActiva, user]);

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este mantenimiento?')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/${id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Error al eliminar el mantenimiento.');
        }

        setMantenimientos(mantenimientos.filter((m) => m.id !== id));
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  // Filtrar mantenimientos
  const mantenimientosFiltrados = mantenimientos.filter(m => {
    const matchSearch = m.equipo_asociado_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       m.usuario_responsable_username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === 'todos' || m.estado_mantenimiento === filterEstado;
    return matchSearch && matchEstado;
  });

  // Función para obtener el color del badge según el estado
  const getEstadoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'Pendiente': 'bg-yellow-100 text-yellow-700 border-yellow-200',
      'En proceso': 'bg-blue-100 text-blue-700 border-blue-200',
      'Finalizado': 'bg-green-100 text-green-700 border-green-200',
      'Cancelado': 'bg-red-100 text-red-700 border-red-200',
    };
    return badges[estado] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getTipoBadge = (tipo: string) => {
    const badges: { [key: string]: string } = {
      'Preventivo': 'bg-purple-100 text-purple-700 border-purple-200',
      'Correctivo': 'bg-orange-100 text-orange-700 border-orange-200',
      'Predictivo': 'bg-teal-100 text-teal-700 border-teal-200',
    };
    return badges[tipo] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold text-lg">Cargando mantenimientos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-6 shadow-lg">
          <div className="flex items-center">
            <span className="text-3xl mr-3">⚠️</span>
            <p className="text-red-700 font-semibold">Error: {error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header con título y botón */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center">
              <span className="text-4xl mr-3">🔧</span>
              Gestión de Mantenimientos
            </h1>
            <p className="text-gray-600 mt-1">
              {sedeActiva 
                ? `Mantenimientos para la sede: ${sedeActiva.nombre}`
                : 'Todos los mantenimientos (Vista de Superusuario)'}
            </p>
          </div>
          <Link 
            href="/mantenimientos/registrar" 
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <span className="text-xl">➕</span>
            <span>Registrar Mantenimiento</span>
          </Link>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar por equipo o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Filtro por estado */}
            <div className="relative">
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer"
              >
                <option value="todos">📊 Todos los estados</option>
                <option value="Pendiente">⏳ Pendiente</option>
                <option value="En proceso">🔄 En proceso</option>
                <option value="Finalizado">✅ Finalizado</option>
              </select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Mostrando <span className="font-bold text-green-600">{mantenimientosFiltrados.length}</span> de <span className="font-bold">{mantenimientos.length}</span> mantenimientos
            </span>
            {(searchTerm || filterEstado !== 'todos') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterEstado('todos');
                }}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Limpiar filtros ✖️
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {mantenimientosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mantenimientosFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 group">
              {/* Header de la tarjeta */}
              <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{m.equipo_asociado_nombre}</h3>
                    <p className="text-white/90 text-sm">Mantenimiento {m.tipo_mantenimiento}</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                    <span className="text-2xl">🔧</span>
                  </div>
                </div>
              </div>

              {/* Contenido de la tarjeta */}
              <div className="p-5 space-y-3">
                {/* Responsable */}
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 font-medium w-28">Responsable:</span>
                  <span className="text-gray-800 font-semibold">
                    {m.usuario_responsable_username ? (
                      <span>👤 {m.usuario_responsable_username}</span>
                    ) : (
                      <span className="text-gray-400 italic">No asignado</span>
                    )}
                  </span>
                </div>

                {/* Fecha de inicio */}
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 font-medium w-28">Fecha inicio:</span>
                  <span className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">
                    📅 {new Date(m.fecha_inicio).toLocaleDateString('es-ES', { 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>

                {/* Tipo y Estado */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Tipo:</span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getTipoBadge(m.tipo_mantenimiento)}`}>
                      {m.tipo_mantenimiento}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-medium">Estado:</span>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getEstadoBadge(m.estado_mantenimiento)}`}>
                      {m.estado_mantenimiento}
                    </span>
                  </div>
                </div>
              </div>

              {/* Footer con acciones */}
              <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
                <Link 
                  href={`/mantenimientos/editar/${m.id}`} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                >
                  <span>✏️</span>
                  <span>Editar</span>
                </Link>
                <button 
                  onClick={() => handleDelete(m.id)} 
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                >
                  <span>🗑️</span>
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-lg p-8 shadow-lg text-center">
          <span className="text-5xl mb-4 block">📋</span>
          <p className="text-gray-700 font-semibold text-lg">
            {mantenimientos.length === 0 && !loading
              ? 'No hay mantenimientos registrados para la sede actual.'
              : 'No se encontraron mantenimientos con los filtros aplicados.'}
          </p>
        </div>
      )}
    </Layout>
  );
};

export default MantenimientosPage;