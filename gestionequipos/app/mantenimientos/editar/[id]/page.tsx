// gestionequipos/app/mantenimientos/editar/[id]/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/app/context/AuthContext';

interface MantenimientoData {
  equipo_asociado: number | string;
  usuario_responsable: number | string;
  fecha_inicio: string;
  fecha_finalizacion: string | null;
  estado_mantenimiento: string;
  tipo_mantenimiento: string;
  notas: string;
  sede: number | string;
  equipo_asociado_nombre?: string;
  usuario_responsable_username?: string;
}

function EditMantenimientoForm() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const searchParams = useSearchParams();
  const isViewMode = searchParams.get('view') === 'true';

  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [formData, setFormData] = useState<MantenimientoData>({
    equipo_asociado: '',
    usuario_responsable: '',
    fecha_inicio: '',
    fecha_finalizacion: null,
    estado_mantenimiento: 'Pendiente',
    tipo_mantenimiento: 'Preventivo',
    notas: '',
    sede: '',
  });

  const [equipoNombre, setEquipoNombre] = useState('');
  const [usuarioNombre, setUsuarioNombre] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchMantenimientoData = async () => {
      try {
        const headers = { 'Authorization': `Token ${token}` };
        const mantenimientoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/${id}/`, { headers });

        if (!mantenimientoRes.ok) {
          throw new Error('Error al cargar los datos del mantenimiento.');
        }

        const mantenimientoData = await mantenimientoRes.json();
        
        setFormData({
          equipo_asociado: mantenimientoData.equipo_asociado,
          usuario_responsable: mantenimientoData.usuario_responsable,
          fecha_inicio: mantenimientoData.fecha_inicio.split('T')[0],
          fecha_finalizacion: mantenimientoData.fecha_finalizacion ? mantenimientoData.fecha_finalizacion.split('T')[0] : null,
          estado_mantenimiento: mantenimientoData.estado_mantenimiento,
          tipo_mantenimiento: mantenimientoData.tipo_mantenimiento,
          notas: mantenimientoData.notas || '',
          sede: mantenimientoData.sede,
        });

        setEquipoNombre(mantenimientoData.equipo_asociado_nombre);
        setUsuarioNombre(mantenimientoData.usuario_responsable_username || 'No asignado');

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchMantenimientoData();
    }
  }, [isAuthenticated, isAuthLoading, router, token, id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewMode) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { equipo_asociado_nombre, usuario_responsable_username, ...payload } = formData;

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/${id}/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const detail = Object.values(errorData).flat().join(' ');
        throw new Error(detail || 'Error al actualizar el mantenimiento.');
      }

      setSuccessMessage('Mantenimiento actualizado exitosamente.');
      setTimeout(() => router.push('/mantenimientos'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isAuthLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold text-lg">Cargando formulario...</p>
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
          <span className="text-4xl mr-3">{isViewMode ? '👁️' : '✏️'}</span>
          <h1 className="text-3xl font-black text-gray-800">
            {isViewMode ? 'Detalles del Mantenimiento' : 'Editar Mantenimiento'}
          </h1>
        </div>
        <p className="text-gray-600 ml-14">
          {isViewMode ? 'Visualiza los datos del mantenimiento.' : 'Modifica los datos del mantenimiento seleccionado.'}
        </p>
      </div>

      {/* Mensaje de éxito */}
      {successMessage && (
        <div className="bg-gradient-to-r from-green-50 to-green-100 border-l-4 border-green-500 rounded-lg p-5 mb-6 shadow-lg animate-fadeIn">
          <div className="flex items-center">
            <span className="text-3xl mr-3">✅</span>
            <div>
              <p className="text-green-800 font-bold">¡Éxito!</p>
              <p className="text-green-700">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="text-3xl mr-3">📝</span>
            {isViewMode ? 'Vista de Detalles' : 'Formulario de Edición'}
          </h2>
        </div>

        <div className="p-8">
          <div onSubmit={handleSubmit}>
            <fieldset disabled={isViewMode}>
              {/* Información General */}
              <div className="mb-8">
                <div className="flex items-center mb-5 pb-3 border-b-2 border-orange-200">
                  <span className="text-2xl mr-2">📋</span>
                  <h3 className="text-xl font-bold text-gray-800">Información General</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Equipo */}
                  <div className="space-y-2">
                    <label htmlFor="equipo" className="block text-sm font-bold text-gray-700">
                      💻 Equipo
                    </label>
                    <input
                      type="text"
                      id="equipo"
                      name="equipo"
                      value={equipoNombre}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                      readOnly
                    />
                  </div>

                  {/* Usuario Asignado */}
                  <div className="space-y-2">
                    <label htmlFor="usuario_asignado" className="block text-sm font-bold text-gray-700">
                      👤 Usuario Responsable
                    </label>
                    <input
                      type="text"
                      id="usuario_asignado"
                      name="usuario_asignado"
                      value={usuarioNombre}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-700 font-semibold cursor-not-allowed"
                      readOnly
                    />
                  </div>
                </div>
              </div>

              {/* Detalles del Mantenimiento */}
              <div>
                <div className="flex items-center mb-5 pb-3 border-b-2 border-green-200">
                  <span className="text-2xl mr-2">🔧</span>
                  <h3 className="text-xl font-bold text-gray-800">Detalles del Mantenimiento</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Fecha de Inicio */}
                  <div className="space-y-2">
                    <label htmlFor="fecha_inicio" className="block text-sm font-bold text-gray-700">
                      📅 Fecha de Inicio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="fecha_inicio"
                      name="fecha_inicio"
                      value={formData.fecha_inicio}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                      required
                    />
                  </div>

                  {/* Fecha de Finalización */}
                  <div className="space-y-2">
                    <label htmlFor="fecha_finalizacion" className="block text-sm font-bold text-gray-700">
                      🏁 Fecha de Finalización
                    </label>
                    <input
                      type="date"
                      id="fecha_finalizacion"
                      name="fecha_finalizacion"
                      value={formData.fecha_finalizacion || ''}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
                    />
                  </div>

                  {/* Estado */}
                  <div className="space-y-2">
                    <label htmlFor="estado_mantenimiento" className="block text-sm font-bold text-gray-700">
                      📊 Estado del Mantenimiento
                    </label>
                    <select
                      id="estado_mantenimiento"
                      name="estado_mantenimiento"
                      value={formData.estado_mantenimiento}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="Pendiente">⏳ Pendiente</option>
                      <option value="En proceso">🔄 En proceso</option>
                      <option value="Finalizado">✅ Finalizado</option>
                    </select>
                  </div>

                  {/* Tipo */}
                  <div className="space-y-2">
                    <label htmlFor="tipo_mantenimiento" className="block text-sm font-bold text-gray-700">
                      🛠️ Tipo de Mantenimiento
                    </label>
                    <select
                      id="tipo_mantenimiento"
                      name="tipo_mantenimiento"
                      value={formData.tipo_mantenimiento}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="Preventivo">🔍 Preventivo</option>
                      <option value="Correctivo">🔧 Correctivo</option>
                    </select>
                  </div>

                  {/* Notas */}
                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor="notas" className="block text-sm font-bold text-gray-700">
                      📝 Notas y Observaciones
                    </label>
                    <textarea
                      id="notas"
                      name="notas"
                      rows={4}
                      value={formData.notas}
                      onChange={handleChange}
                      placeholder="Detalles adicionales del mantenimiento..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    ></textarea>
                  </div>
                </div>
              </div>
            </fieldset>

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-8 border-t-2 border-gray-200">
              {isViewMode ? (
                <button
                  type="button"
                  onClick={() => router.push('/mantenimientos/historial')}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                >
                  <span>◀️</span>
                  <span>Volver al Historial</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push('/mantenimientos')}
                    className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
                  >
                    <span>❌</span>
                    <span>Cancelar</span>
                  </button>
                  <button
                    type="submit"
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Actualizando...</span>
                      </>
                    ) : (
                      <>
                        <span>💾</span>
                        <span>Actualizar Mantenimiento</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default function EditarMantenimientoPage() {
  return (
    <Suspense fallback={
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold text-lg">Cargando...</p>
          </div>
        </div>
      </Layout>
    }>
      <EditMantenimientoForm />
    </Suspense>
  );
}