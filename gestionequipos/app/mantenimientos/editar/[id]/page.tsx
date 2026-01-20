// gestionequipos/app/mantenimientos/editar/[id]/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/app/context/AuthContext';

interface MantenimientoData {
  equipo: number | string; // Corregido: de vuelta a 'equipo'
  descripcion_problema: string;
  responsable: number | string;
  fecha_inicio: string;
  fecha_finalizacion: string | null;
  estado_mantenimiento: string;
  tipo_mantenimiento: string;
  notas: string;
  sede: number | string;
  equipo_asociado_nombre?: string;
  usuario_responsable_username?: string;
}

interface EvidenciaFile {
  id: number;
  url: string;
  filename: string;
}

function EditMantenimientoForm() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const searchParams = useSearchParams();
  const isViewMode = searchParams.get('view') === 'true';

  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const [formData, setFormData] = useState<MantenimientoData>({
    equipo: '',
    descripcion_problema: '',
    responsable: '',
    fecha_inicio: '',
    fecha_finalizacion: null,
    estado_mantenimiento: 'Pendiente',
    tipo_mantenimiento: 'Preventivo',
    notas: '',
    sede: '',
  });

  const [newEvidencias, setNewEvidencias] = useState<File[]>([]);
  const [existingEvidencias, setExistingEvidencias] = useState<EvidenciaFile[]>([]);
  const [evidenciaFinalizacionUrl, setEvidenciaFinalizacionUrl] = useState<string | null>(null);
  const [evidenciaFinalizacionFilename, setEvidenciaFinalizacionFilename] = useState<string | null>(null);

  const [equipoNombre, setEquipoNombre] = useState('');
  const [usuarioNombre, setUsuarioNombre] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isReadOnly = true;

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
          equipo: mantenimientoData.equipo,
          descripcion_problema: mantenimientoData.descripcion_problema || '',
          responsable: mantenimientoData.responsable,
          fecha_inicio: mantenimientoData.fecha_inicio.split('T')[0],
          fecha_finalizacion: mantenimientoData.fecha_finalizacion ? mantenimientoData.fecha_finalizacion.split('T')[0] : null,
          estado_mantenimiento: mantenimientoData.estado_mantenimiento,
          tipo_mantenimiento: mantenimientoData.tipo_mantenimiento,
          notas: mantenimientoData.notas || '',
          sede: mantenimientoData.sede,
        });

        setEquipoNombre(mantenimientoData.equipo_asociado_nombre);
        setUsuarioNombre(mantenimientoData.usuario_responsable_username || 'No asignado');
        if (mantenimientoData.evidencias && Array.isArray(mantenimientoData.evidencias)) {
            setExistingEvidencias(mantenimientoData.evidencias.map((ev: any) => ({
                id: ev.id,
                url: ev.archivo_url || ev.archivo,
                filename: ev.archivo_filename || ev.archivo.substring(ev.archivo.lastIndexOf('/') + 1)
            })));
        }
        // Cargar evidencia de finalización si existe
        if (mantenimientoData.evidencia_finalizacion_url) {
            setEvidenciaFinalizacionUrl(mantenimientoData.evidencia_finalizacion_url);
            setEvidenciaFinalizacionFilename(mantenimientoData.evidencia_finalizacion_filename || 'Evidencia de finalización');
        }


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
    
    setFormData((prev) => {
      const newFormData = { ...prev, [name]: value };
      // Auto-actualizar estado a 'Finalizado' si se pone una fecha de finalización
      if (name === 'fecha_finalizacion' && value) {
        newFormData.estado_mantenimiento = 'Finalizado';
      }
      // Si se quita la fecha, volver a un estado anterior si es necesario (ej. 'En proceso')
      if (name === 'fecha_finalizacion' && !value && prev.estado_mantenimiento === 'Finalizado') {
        newFormData.estado_mantenimiento = 'En proceso';
      }
      return newFormData;
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewEvidencias(prev => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const handleRemoveNewEvidencia = (index: number) => {
    const updatedEvidencias = newEvidencias.filter((_, i) => i !== index);
    setNewEvidencias(updatedEvidencias);

    const fileInput = document.getElementById('evidencia') as HTMLInputElement;
    if (fileInput && updatedEvidencias.length === 0) {
        fileInput.value = "";
    }
  };

  const handleRemoveExistingEvidencia = async (id: number) => {
    if (isViewMode) return; 
    if (confirm('¿Estás seguro de que quieres eliminar esta evidencia? Esta acción es irreversible.')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/evidencias/${id}/`, {
          method: 'DELETE',
          headers: { 'Authorization': `Token ${token}` },
        });

        if (!response.ok) {
          throw new Error('No se pudo eliminar la evidencia.');
        }

        setExistingEvidencias(prev => prev.filter(ev => ev.id !== id));
        setSuccessMessage('Evidencia eliminada correctamente.');
        setTimeout(() => setSuccessMessage(null), 3000);

      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    const { equipo_asociado_nombre, usuario_responsable_username, ...payload } = formData;

    let headers: HeadersInit = {
      'Authorization': `Token ${token}`,
    };
    let body: BodyInit;

    if (newEvidencias.length > 0) {
      const data = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        data.append(key, value === null ? '' : String(value));
      });
      newEvidencias.forEach(file => {
        data.append('evidencias_uploads', file);
      });
      body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(payload);
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/${id}/`, {
        method: 'PUT',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        let errorData = await response.json();
        const errorMessage = errorData.error || Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join(' | ');
        throw new Error(errorMessage);
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
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <span className="text-4xl mr-3">{isReadOnly ? '👁️' : '✏️'}</span>
          <h1 className="text-3xl font-black text-gray-800">
            {isReadOnly ? 'Detalles del Mantenimiento' : 'Editar Mantenimiento'}
          </h1>
        </div>
        <p className="text-gray-600 ml-14">
          {isReadOnly ? 'Visualiza los datos del mantenimiento.' : 'Modifica los datos del mantenimiento seleccionado.'}
        </p>
      </div>

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

      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="text-3xl mr-3">📝</span>
            {isReadOnly ? 'Vista de Detalles' : 'Formulario de Edición'}
          </h2>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit}>
            <fieldset disabled={isReadOnly}>
              <div>
                <div className="flex items-center mb-5 pb-3 border-b-2 border-green-200">
                  <span className="text-2xl mr-2">🔧</span>
                  <h3 className="text-xl font-bold text-gray-800">Detalles del Mantenimiento</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label htmlFor="equipo_nombre" className="block text-sm font-bold text-gray-700">
                      💻 Equipo Asociado
                    </label>
                    <input
                      type="text"
                      id="equipo_nombre"
                      name="equipo_nombre"
                      value={equipoNombre}
                      readOnly
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="fecha_inicio" className="block text-sm font-bold text-gray-700">
                      📅 Fecha de Inicio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="fecha_inicio"
                      name="fecha_inicio"
                      value={formData.fecha_inicio}
                      readOnly
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all disabled:bg-gray-100 disabled:cursor-not-allowed cursor-not-allowed"
                      required
                    />
                  </div>

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
                      <option value="Cancelado">❌ Cancelado</option>
                    </select>
                  </div>

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

                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor="descripcion_problema" className="block text-sm font-bold text-gray-700">
                      🚨 Descripción del Problema
                    </label>
                    <textarea
                      id="descripcion_problema"
                      name="descripcion_problema"
                      rows={4}
                      value={formData.descripcion_problema}
                      onChange={handleChange}
                      placeholder="Describe el problema que presenta el equipo..."
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                    ></textarea>
                  </div>

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
                  
                  <div className="md:col-span-2 space-y-4">
                    {/* Evidencia de Finalización */}
                    {formData.estado_mantenimiento === 'Finalizado' && evidenciaFinalizacionUrl && (
                      <div className="bg-gradient-to-r from-teal-50 to-teal-100 border-l-4 border-teal-500 rounded-lg p-4">
                        <h4 className="block text-sm font-bold text-gray-700 mb-2">
                          ✅ Evidencia de Finalización
                        </h4>
                        <div className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                          <a 
                            href={evidenciaFinalizacionUrl} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-teal-600 hover:text-teal-800 hover:underline font-semibold flex items-center space-x-2"
                            title={evidenciaFinalizacionFilename || 'Ver evidencia de finalización'}
                          >
                            <span>📄</span>
                            <span>{evidenciaFinalizacionFilename || 'Evidencia de finalización'}</span>
                          </a>
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Archivo adjunto</span>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="block text-sm font-bold text-gray-700 mb-2">
                        📄 Evidencias Actuales
                      </h4>
                      {existingEvidencias.length > 0 ? (
                        <ul className="space-y-2">
                          {existingEvidencias.map((ev) => (
                            <li key={ev.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                              <a href={ev.url} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline truncate" title={ev.filename}>
                                {ev.filename}
                              </a>
                              {!isViewMode && (
                                <button type="button" onClick={() => handleRemoveExistingEvidencia(ev.id)} className="ml-4 text-red-500 hover:text-red-700 font-bold" title="Eliminar evidencia">
                                  &times;
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-gray-500">No hay evidencias existentes.</p>
                      )}
                    </div>
                    
                    {!isViewMode && (
                      <div>
                        <label htmlFor="evidencia" className="block text-sm font-bold text-gray-700">
                          ➕ Adjuntar Nuevas Evidencias
                        </label>
                        <input
                          type="file"
                          id="evidencia"
                          name="evidencias_uploads"
                          onChange={handleFileChange}
                          className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                          multiple
                        />
                        {newEvidencias.length > 0 && (
                          <div className="mt-4">
                            <h5 className="text-sm font-bold text-gray-700 mb-2">Archivos nuevos seleccionados:</h5>
                            <ul className="space-y-2">
                              {newEvidencias.map((file, index) => (
                                <li key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded-lg">
                                  <a href={URL.createObjectURL(file)} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-800 hover:underline truncate" title={file.name}>
                                    {file.name}
                                  </a>
                                  <button type="button" onClick={() => handleRemoveNewEvidencia(index)} className="ml-4 text-red-500 hover:text-red-700 font-bold" title="Quitar archivo">
                                    &times;
                                  </button>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </fieldset>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 mt-8 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>◀️</span>
                <span>Volver</span>
              </button>
              {!isReadOnly && (
                <button
                  type="submit"
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
              )}
            </div>
          </form>
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
