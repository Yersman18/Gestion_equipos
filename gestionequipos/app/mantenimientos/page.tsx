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
  fecha_finalizacion?: string | null;
  sede: number;
  evidencia_finalizacion_url?: string | null;
  evidencia_finalizacion_filename?: string | null;
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

  const [mantenimientoToFinalize, setMantenimientoToFinalize] = useState<Mantenimiento | null>(null);
  const [evidenciaFinalizacion, setEvidenciaFinalizacion] = useState<File | null>(null);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState<string | null>(null);

  // Crear dependencias primitivas y estables para el useEffect
  const sedeId = sedeActiva?.id;
  const isSuperuser = user?.is_superuser;

  useEffect(() => {
    if (isAuthLoading || isSedeLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    // Usar las dependencias primitivas en la lógica
    if (!isSuperuser && !sedeId) {
      setLoading(false);
      setMantenimientos([]);
      return;
    }

    const fetchMantenimientos = async () => {
      setLoading(true);
      setError(null);
      
      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/`);
      
      if (sedeId) {
        url.searchParams.append('sede_id', String(sedeId));
      }

      if (filterEstado !== 'todos') {
        url.searchParams.append('estado_mantenimiento', filterEstado);
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
  }, [isAuthenticated, isAuthLoading, isSedeLoading, router, token, sedeId, isSuperuser, filterEstado]);

  const handleCancel = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres cancelar este mantenimiento? Esta acción no se puede deshacer.')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/${id}/cancelar/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al cancelar el mantenimiento.');
        }

        const updatedMantenimiento = await response.json();
        setMantenimientos(mantenimientos.map(m => m.id === id ? updatedMantenimiento : m));

      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleIniciarProceso = async (id: number) => {
    if (window.confirm('¿Estás seguro de que quieres iniciar este mantenimiento? Su estado cambiará a "En proceso".')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/${id}/iniciar_proceso/`, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al iniciar el proceso del mantenimiento.');
        }

        const updatedMantenimiento = await response.json();
        setMantenimientos(mantenimientos.map(m => m.id === id ? updatedMantenimiento : m));

      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const openFinalizarModal = (mantenimiento: Mantenimiento) => {
    setMantenimientoToFinalize(mantenimiento);
    setFinalizeError(null);
    setEvidenciaFinalizacion(null);
  };

  const closeFinalizarModal = () => {
    setMantenimientoToFinalize(null);
  };

  const handleSubmitFinalizacion = async () => {
    if (!mantenimientoToFinalize || !evidenciaFinalizacion) {
      setFinalizeError('Debes seleccionar un archivo de evidencia.');
      return;
    }

    setIsFinalizing(true);
    setFinalizeError(null);

    const formData = new FormData();
    formData.append('evidencia_finalizacion', evidenciaFinalizacion);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/${mantenimientoToFinalize.id}/finalizar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al finalizar el mantenimiento.');
      }

      const updatedMantenimiento = await response.json();
      setMantenimientos(mantenimientos.map(m => m.id === updatedMantenimiento.id ? updatedMantenimiento : m));
      closeFinalizarModal();

    } catch (err: any) {
      setFinalizeError(err.message);
    } finally {
      setIsFinalizing(false);
    }
  };

  const mantenimientosFiltrados = mantenimientos.filter(m => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchEquipo = m.equipo_asociado_nombre && m.equipo_asociado_nombre.toLowerCase().includes(searchTermLower);
    const matchUsuario = m.usuario_responsable_username && m.usuario_responsable_username.toLowerCase().includes(searchTermLower);
    return matchEquipo || matchUsuario;
  });

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

        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <input
                type="text"
                placeholder="🔍 Buscar por equipo o responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
              />
            </div>

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
                <option value="Cancelado">❌ Cancelado</option>
              </select>
            </div>
          </div>

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

      {mantenimientosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {mantenimientosFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 group">
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

              <div className="p-5 space-y-3">
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

                <div className="flex items-center text-sm">
                  <span className="text-gray-500 font-medium w-28">Fecha inicio:</span>
                  <span className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">
                    📅 {(() => {
                      const [year, month, day] = m.fecha_inicio.split('-').map(Number);
                      return new Date(year, month - 1, day).toLocaleDateString('es-ES', { 
                        year: 'numeric', 
                        month: 'short', 
                        day: 'numeric' 
                      });
                    })()}
                  </span>
                </div>

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
                  {m.fecha_finalizacion && (
                    <div className="flex items-center text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-500 font-medium w-28">Fecha fin:</span>
                      <span className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded text-xs">
                        📅 {(() => {
                          const [year, month, day] = m.fecha_finalizacion.split('-').map(Number);
                          return new Date(year, month - 1, day).toLocaleDateString('es-ES', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          });
                        })()}
                      </span>
                    </div>
                  )}
                  {m.estado_mantenimiento === 'Finalizado' && m.evidencia_finalizacion_url && (
                    <div className="pt-2 border-t border-gray-200">
                      <a
                        href={m.evidencia_finalizacion_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center space-x-2 text-sm text-teal-600 hover:text-teal-800 font-semibold hover:underline"
                        title={m.evidencia_finalizacion_filename || 'Ver evidencia de finalización'}
                      >
                        <span>📄</span>
                        <span>Ver Evidencia de Finalización</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 px-5 py-3 flex flex-wrap justify-end items-center gap-2">
                {m.estado_mantenimiento === 'Pendiente' && (
                  <button
                    onClick={() => handleIniciarProceso(m.id)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                  >
                    <span>▶️</span>
                    <span>Iniciar Proceso</span>
                  </button>
                )}
                <Link 
                  href={`/mantenimientos/editar/${m.id}`} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                >
                  <span>✏️</span>
                  <span>Editar</span>
                </Link>
                <button
                  onClick={() => openFinalizarModal(m)}
                  className={`font-semibold text-sm px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-white ${
                    m.estado_mantenimiento === 'Finalizado' || m.estado_mantenimiento === 'Cancelado'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                  disabled={m.estado_mantenimiento === 'Finalizado' || m.estado_mantenimiento === 'Cancelado'}
                >
                  <span>✅</span>
                  <span>Finalizar</span>
                </button>
                <button
                  onClick={() => handleCancel(m.id)}
                  className={`font-semibold text-sm px-3 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1 text-white ${
                    m.estado_mantenimiento === 'Finalizado' || m.estado_mantenimiento === 'Cancelado'
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                  disabled={m.estado_mantenimiento === 'Finalizado' || m.estado_mantenimiento === 'Cancelado'}
                >
                  <span>❌</span>
                  <span>Cancelar</span>
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
              ? 'No hay mantenimientos registrados para la sede actual o con el filtro aplicado.'
              : 'No se encontraron mantenimientos con los filtros aplicados.'}
          </p>
        </div>
      )}

      {mantenimientoToFinalize && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Finalizar Mantenimiento</h2>
                <p className="mb-6 text-gray-600">
                    Para finalizar el mantenimiento del equipo <span className="font-bold">{mantenimientoToFinalize.equipo_asociado_nombre}</span>, por favor adjunta la evidencia de finalización.
                </p>
                
                <div className="space-y-2">
                    <label htmlFor="evidencia_finalizacion" className="block text-sm font-bold text-gray-700">
                        📄 Evidencia de Finalización <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="file"
                        id="evidencia_finalizacion"
                        name="evidencia_finalizacion"
                        onChange={(e) => setEvidenciaFinalizacion(e.target.files ? e.target.files[0] : null)}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                        required
                    />
                </div>

                {finalizeError && (
                    <div className="mt-4 text-red-600 text-sm font-semibold">
                        {finalizeError}
                    </div>
                )}

                <div className="flex justify-end gap-4 mt-8">
                    <button
                        onClick={closeFinalizarModal}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded-lg transition-colors"
                        disabled={isFinalizing}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmitFinalizacion}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center disabled:bg-gray-400"
                        disabled={isFinalizing || !evidenciaFinalizacion}
                    >
                        {isFinalizing ? (
                            <><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Finalizando...</>
                        ) : (
                            'Confirmar Finalización'
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}
    </Layout>
  );
};

export default MantenimientosPage;