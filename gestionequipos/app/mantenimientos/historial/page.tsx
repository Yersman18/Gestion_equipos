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
  fecha_finalizacion: string;
  evidencia_url: string | null;
  evidencia_filename: string | null;
  evidencia_finalizacion_url: string | null;
  evidencia_finalizacion_filename: string | null;
}

const HistorialMantenimientosPage: React.FC = () => {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');
  
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
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

    if (!sedeActiva && !useAuth().user?.is_superuser) {
      setMantenimientos([]);
      setLoading(false);
      return;
    }

    const fetchMantenimientos = async () => {
      setLoading(true);
      setError(null);
      
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/`);
      url.searchParams.append('estado_mantenimiento', 'Finalizado');
      
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
          throw new Error('No se pudo cargar el historial de mantenimientos.');
        }

        const data = await response.json();
        setMantenimientos(data.results || data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMantenimientos();
  }, [isAuthenticated, isAuthLoading, isSedeLoading, router, token, sedeActiva]);

  // Filtrar mantenimientos
  const mantenimientosFiltrados = mantenimientos.filter(m => {
    const matchSearch = m.equipo_asociado_nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       m.usuario_responsable_username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchTipo = filterTipo === 'todos' || m.tipo_mantenimiento === filterTipo;
    return matchSearch && matchTipo;
  });

  // Función para obtener el color del badge según el tipo
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
            <p className="text-gray-600 font-semibold text-lg">Cargando historial...</p>
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
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <span className="text-4xl mr-3">📜</span>
          <h1 className="text-3xl font-black text-gray-800">Historial de Mantenimientos</h1>
        </div>
        <p className="text-gray-600 ml-14">
            {sedeActiva
                ? `Historial de mantenimientos finalizados para la sede: ${sedeActiva.nombre}`
                : 'Historial de todos los mantenimientos finalizados (Vista de Superusuario)'}
        </p>
      </div>

      {/* Barra de búsqueda y filtros */}
      <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200 mb-6">
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

          {/* Filtro por tipo */}
          <div className="relative">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all bg-white cursor-pointer"
            >
              <option value="todos">📊 Todos los tipos</option>
              <option value="Preventivo">🔍 Preventivo</option>
              <option value="Correctivo">🔧 Correctivo</option>
            </select>
          </div>
        </div>

        {/* Contador de resultados */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>
            Mostrando <span className="font-bold text-green-600">{mantenimientosFiltrados.length}</span> de <span className="font-bold">{mantenimientos.length}</span> registros
          </span>
          {(searchTerm || filterTipo !== 'todos') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTipo('todos');
              }}
              className="text-red-600 hover:text-red-700 font-semibold"
            >
              Limpiar filtros ✖️
            </button>
          )}
        </div>
      </div>

      {/* Contenido principal */}
      {mantenimientosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mantenimientosFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 group">
              {/* Header de la tarjeta */}
              <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-bold text-lg mb-1">{m.equipo_asociado_nombre}</h3>
                    <p className="text-white/90 text-sm">Mantenimiento Finalizado ✓</p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                    <span className="text-2xl">✅</span>
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

                {/* Tipo */}
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-500 font-medium">Tipo:</span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getTipoBadge(m.tipo_mantenimiento)}`}>
                    {m.tipo_mantenimiento}
                  </span>
                </div>

                {/* Fechas */}
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 font-medium w-28">Inicio:</span>
                    <span className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                      📅 {new Date(m.fecha_inicio).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric',
                        timeZone: 'UTC'
                      })}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 font-medium w-28">Finalización:</span>
                    <span className="text-gray-800 font-mono bg-green-100 px-2 py-1 rounded text-xs">
                      🏁 {m.fecha_finalizacion 
                        ? new Date(m.fecha_finalizacion).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : 'N/A'}
                    </span>
                  </div>
                </div>

                {/* Duración */}
                {m.fecha_finalizacion && (
                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-700 font-medium">⏱️ Duración:</span>
                      <span className="text-blue-800 font-bold">
                        {Math.ceil((new Date(m.fecha_finalizacion).getTime() - new Date(m.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24))} días
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer con acciones */}
              <div className="bg-gray-50 px-5 py-3 flex justify-end gap-2">
                {m.evidencia_finalizacion_url && (
                  <a
                    href={m.evidencia_finalizacion_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                    title={m.evidencia_finalizacion_filename || 'Ver evidencia'}
                  >
                    <span>📄</span>
                    <span>Ver Evidencia</span>
                  </a>
                )}
                <Link 
                  href={`/mantenimientos/editar/${m.id}?view=true`} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                >
                  <span>👁️</span>
                  <span>Ver Detalles</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-lg p-8 shadow-lg text-center">
          <span className="text-5xl mb-4 block">📋</span>
          <p className="text-gray-700 font-semibold text-lg">
            {mantenimientos.length === 0 && !loading
              ? 'No hay mantenimientos finalizados en el historial para la sede actual.'
              : 'No se encontraron mantenimientos con los filtros aplicados.'}
          </p>
        </div>
      )}

      {/* Estadísticas del historial */}
      {mantenimientos.length > 0 && (
        <div className="mt-8 bg-white rounded-xl shadow-lg p-6 border border-gray-200">
          <h3 className="text-gray-800 font-bold text-lg mb-4 flex items-center">
            <span className="text-2xl mr-2">📊</span>
            Estadísticas del Historial
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">
                {mantenimientos.filter(m => m.tipo_mantenimiento === 'Preventivo').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Preventivos</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg">
              <div className="text-3xl font-bold text-orange-600">
                {mantenimientos.filter(m => m.tipo_mantenimiento === 'Correctivo').length}
              </div>
              <div className="text-sm text-gray-600 mt-1">Correctivos</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
              <div className="text-3xl font-bold text-green-600">{mantenimientos.length}</div>
              <div className="text-sm text-gray-600 mt-1">Total Completados</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default HistorialMantenimientosPage;