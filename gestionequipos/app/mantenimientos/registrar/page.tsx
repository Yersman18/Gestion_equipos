// gestionequipos/app/mantenimientos/registrar/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';

interface Equipo {
  id: number;
  nombre: string;
  marca: string;
  modelo: string;
  serial: string;
  sede: number;
}

interface Usuario {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export default function RegistrarMantenimientoPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { sedeActiva } = useSede();

  const [formData, setFormData] = useState({
    equipo: '',
    responsable: '',
    fecha_inicio: '',
    fecha_finalizacion: '',
    estado_mantenimiento: 'Pendiente',
    tipo_mantenimiento: 'Preventivo',
    descripcion_problema: '',
    notas: '',
    sede: sedeActiva?.id || '',
  });

  const [evidencia, setEvidencia] = useState<File | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!sedeActiva && !user?.is_superuser) {
      setError('Por favor, selecciona una sede para registrar mantenimientos.');
      setLoading(false);
      return;
    }
    
    setFormData((prev) => ({ ...prev, sede: sedeActiva?.id || '' }));

    const fetchInitialData = async () => {
      try {
        const headers = { 'Authorization': `Token ${token}` };
        
        const urlEquipos = `${process.env.NEXT_PUBLIC_API_URL}/api/equipos/${user?.is_superuser || !sedeActiva ? '' : `?sede=${sedeActiva?.id}`}`;
        const equiposRes = await fetch(urlEquipos, { headers });
        if (!equiposRes.ok) throw new Error('Error al cargar equipos.');
        const equiposData = await equiposRes.json();
        setEquipos(equiposData.results || equiposData);


        // Fetch usuarios
        const usuariosRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/usuarios/`, { headers });
        if (!usuariosRes.ok) throw new Error('Error al cargar usuarios.');
        const usuariosData = await usuariosRes.json();
        setUsuarios(usuariosData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isAuthenticated, isAuthLoading, router, token, sedeActiva, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setEvidencia(e.target.files[0]);
    } else {
      setEvidencia(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!formData.sede) {
      setError('La sede es obligatoria.');
      setLoading(false);
      return;
    }
    
    let headers: HeadersInit = {
      'Authorization': `Token ${token}`,
    };
    let body: BodyInit;

    if (evidencia) {
      const data = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
          data.append(key, String(value));
      });
      data.append('evidencia', evidencia);
      body = data;
      // No se establece Content-Type, el navegador lo hace por nosotros con el boundary correcto
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(formData);
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/`, {
        method: 'POST',
        headers: headers,
        body: body,
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          if (typeof errorData === 'object' && errorData !== null) {
            const messages = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`);
            throw new Error(messages.join(' | '));
          }
        } catch (e) {
          if (e instanceof Error) throw e;
          errorData = { detail: await response.text() };
        }
        throw new Error(errorData.detail || `Error ${response.status}: ${response.statusText}`);
      }

      setSuccessMessage('Mantenimiento registrado exitosamente.');
      setFormData({
        equipo: '',
        responsable: '',
        fecha_inicio: '',
        fecha_finalizacion: '',
        estado_mantenimiento: 'Pendiente',
        tipo_mantenimiento: 'Preventivo',
        descripcion_problema: '',
        notas: '',
        sede: sedeActiva?.id || '',
      });
      setEvidencia(null);
      const fileInput = document.getElementById('evidencia') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
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
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold text-lg">Cargando formulario...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <span className="text-4xl mr-3">🔧</span>
          <h1 className="text-3xl font-black text-gray-800">Registrar Nuevo Mantenimiento</h1>
        </div>
        <p className="text-gray-600 ml-14">Completa los datos para registrar un mantenimiento de equipo.</p>
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

      {error && !successMessage && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-5 mb-6 shadow-lg">
          <div className="flex items-center">
            <span className="text-3xl mr-3">⚠️</span>
            <div>
              <p className="text-red-800 font-bold">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <form className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden" onSubmit={handleSubmit}>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="text-3xl mr-3">📝</span>
            Formulario de Registro
          </h2>
        </div>

        <div className="p-8">
          <div className="space-y-8">
            <div>
              <div className="flex items-center mb-5 pb-3 border-b-2 border-green-200">
                <span className="text-2xl mr-2">📋</span>
                <h3 className="text-xl font-bold text-gray-800">Información General</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="equipo" className="block text-sm font-bold text-gray-700">
                    💻 Equipo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="equipo"
                    name="equipo"
                    value={formData.equipo}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
                    required
                  >
                    <option value="">Selecciona un equipo</option>
                    {equipos.map((equipo) => (
                      <option key={equipo.id} value={equipo.id}>
                        {equipo.nombre} ({equipo.marca} - {equipo.modelo} - {equipo.serial})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="responsable" className="block text-sm font-bold text-gray-700">
                    👤 Usuario Responsable <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
                    required
                  >
                    <option value="">Selecciona un usuario</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.first_name} {usuario.last_name} ({usuario.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center mb-5 pb-3 border-b-2 border-orange-200">
                <span className="text-2xl mr-2">🔧</span>
                <h3 className="text-xl font-bold text-gray-800">Detalles del Mantenimiento</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
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
                    value={formData.fecha_finalizacion}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
                  >
                    <option value="Pendiente">⏳ Pendiente</option>
                    <option value="En proceso">🔄 En Proceso</option>
                    <option value="Finalizado">✅ Finalizado</option>
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
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white"
                  >
                    <option value="Preventivo">🔍 Preventivo</option>
                    <option value="Correctivo">🔧 Correctivo</option>
                  </select>
                </div>
                
                <div className="md:col-span-2 space-y-2">
                  <label htmlFor="descripcion_problema" className="block text-sm font-bold text-gray-700">
                    🔍 Descripción del Problema <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="descripcion_problema"
                    name="descripcion_problema"
                    rows={4}
                    value={formData.descripcion_problema}
                    onChange={handleChange}
                    placeholder="Describe el problema que presenta el equipo..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
                    required
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
                    placeholder="Escribe cualquier detalle adicional sobre el mantenimiento..."
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"
                  ></textarea>
                </div>

                <div className="md:col-span-2 space-y-2">
                  <label htmlFor="evidencia" className="block text-sm font-bold text-gray-700">
                    📄 Adjuntar Evidencia (Opcional)
                  </label>
                  <input
                    type="file"
                    id="evidencia"
                    name="evidencia"
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t-2 border-gray-200">
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
                className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Registrar Mantenimiento</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </Layout>
  );
}