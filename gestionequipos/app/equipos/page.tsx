'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { useAuth } from '../context/AuthContext';
import { useSede } from '../context/SedeContext';
import { fetchAuthenticated } from '../utils/api'; // <-- 1. IMPORTAR

interface Equipo {
  id: number;
  nombre: string;
  marca: string;
  modelo: string;
  serial: string;
  estado_tecnico: string;
  estado_disponibilidad: string;
  sede: number;
  sede_nombre?: string;
  empleado_asignado_info?: {
    id: number;
    nombre: string;
    apellido: string;
    nombre_completo: string;
    cargo?: string;
    area?: string;
    tiene_user: boolean;
    user_id: number | null;
  };
  total_mantenimientos?: number;
  diagnostico_salud?: {
    rango: string;
    color: string;
    mensaje: string;
  };
}

export default function EquiposPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { sedeActiva, isLoading: isSedeLoading } = useSede();

  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchEquipos = async () => {
      setIsLoadingData(true);
      setError(null);

      const params = new URLSearchParams();
      if (sedeActiva) {
        params.append('sede', String(sedeActiva.id));
      } else if (!user?.is_superuser) {
        // Si no es superuser y no hay sede seleccionada (y no está cargando), no mostramos nada
        if (!isSedeLoading) {
          setEquipos([]);
          setIsLoadingData(false);
          return;
        }
      }

      const apiUrl = `/api/equipos/?${params.toString()}`;

      try {
        // <-- 2. USAR fetchAuthenticated -->
        const data = await fetchAuthenticated(apiUrl);
        setEquipos(Array.isArray(data) ? data : data.results || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchEquipos();
  }, [user, isAuthenticated, isAuthLoading, isSedeLoading, sedeActiva, router]);

  const handleDevolver = async (equipo: Equipo) => {
    if (window.confirm(`¿Estás seguro de que quieres devolver el equipo ${equipo.nombre} al inventario? Quedará disponible para ser asignado nuevamente.`)) {
      try {
        await fetchAuthenticated(`/api/equipos/${equipo.id}/`, {
          method: 'PATCH', // Usamos PATCH para actualizar solo lo necesario
          body: JSON.stringify({
            empleado_asignado: null,
            estado_disponibilidad: 'Disponible',
            fecha_entrega_a_colaborador: null
          }),
        });

        setEquipos(prevEquipos => prevEquipos.map(e =>
          e.id === equipo.id
            ? { ...e, estado_disponibilidad: 'Disponible', empleado_asignado_info: undefined }
            : e
        ));
        alert('Equipo devuelto al inventario exitosamente.');
      } catch (err: any) {
        alert(`Error al devolver el equipo: ${err.message}`);
      }
    }
  };

  const handleDarDeBaja = async (equipoId: number) => {
    if (window.confirm('¿Estás seguro de que quieres dar de baja este equipo? El equipo se archivará y no aparecerá en las listas principales, pero no se eliminará permanentemente.')) {
      try {
        // <-- 3. USAR fetchAuthenticated -->
        await fetchAuthenticated(`/api/equipos/${equipoId}/`, {
          method: 'DELETE',
        });

        setEquipos(prevEquipos => prevEquipos.filter(equipo => equipo.id !== equipoId));
        alert('Equipo dado de baja exitosamente.');

      } catch (err: any) {
        setError(err.message);
        alert(`Error al dar de baja: ${err.message}`);
      }
    }
  };

  // Filtrar equipos
  const equiposFiltrados = equipos.filter(equipo => {
    const matchSearch = equipo.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipo.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
      equipo.serial.toLowerCase().includes(searchTerm.toLowerCase());
    const matchEstado = filterEstado === 'todos' || equipo.estado_disponibilidad === filterEstado;
    return matchSearch && matchEstado;
  });

  // Función para obtener el color del badge según el estado
  const getEstadoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'Funcional': 'bg-green-100 text-green-700 border-green-200',
      'Defectuoso': 'bg-red-100 text-red-700 border-red-200',
      'Desguazado': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return badges[estado] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getDisponibilidadBadge = (disponibilidad: string) => {
    const badges: { [key: string]: string } = {
      'Disponible': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Asignado': 'bg-blue-100 text-blue-700 border-blue-200',
      'En mantenimiento': 'bg-orange-100 text-orange-700 border-orange-200',
      'Inactivo': 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return badges[disponibilidad] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const renderContent = () => {
    if (isLoadingData || (isAuthLoading && !user)) {
      return (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Cargando equipos...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-6 shadow-lg">
          <div className="flex items-center">
            <span className="text-3xl mr-3"></span>
            <p className="text-red-700 font-semibold">Error: {error}</p>
          </div>
        </div>
      );
    }

    if (!user?.is_superuser && !sedeActiva) {
      return (
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-l-4 border-yellow-500 rounded-lg p-8 shadow-lg text-center">
          <span className="text-5xl mb-4 block"></span>
          <p className="text-yellow-800 font-semibold text-lg">Por favor, selecciona una sede para ver los equipos.</p>
        </div>
      );
    }

    if (equiposFiltrados.length === 0) {
      return (
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-l-4 border-gray-400 rounded-lg p-8 shadow-lg text-center">
          <span className="text-5xl mb-4 block"></span>
          <p className="text-gray-700 font-semibold text-lg">
            {equipos.length === 0
              ? (user?.is_superuser ? 'No hay equipos registrados en el sistema.' : 'No hay equipos registrados en esta sede.')
              : 'No se encontraron equipos con los filtros aplicados.'}
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {equiposFiltrados.map((equipo) => (
          <div key={equipo.id} className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-200 group">
            {/* Header de la tarjeta - Estilo Formal */}
            <div className="bg-gray-50 p-5 border-b border-gray-100 flex items-start justify-between relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600"></div>
              <div className="flex-1 pl-2">
                <h3 className="text-gray-900 font-bold text-lg mb-1 leading-tight group-hover:text-blue-700 transition-colors uppercase tracking-tight">{equipo.nombre}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-xs font-semibold px-2 py-0.5 bg-gray-200 rounded uppercase tracking-wider">{equipo.marca}</span>
                  <span className="text-gray-500 text-xs font-medium">{equipo.modelo}</span>
                </div>
              </div>
              <span className="text-xl">💻</span>
            </div>

            {/* Contenido de la tarjeta */}
            <div className="p-5 space-y-3">
              {/* Serial */}
              <div className="flex items-center text-sm">
                <span className="text-gray-500 font-medium w-24">Serial:</span>
                <span className="text-gray-800 font-mono bg-gray-100 px-2 py-1 rounded">{equipo.serial}</span>
              </div>

              {/* Sede */}
              <div className="flex items-center text-sm">
                <span className="text-gray-500 font-medium w-24">Sede:</span>
                <span className="text-gray-800 font-semibold">{equipo.sede_nombre || 'N/A'}</span>
              </div>

              {/* Estados */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Estado técnico:</span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getEstadoBadge(equipo.estado_tecnico)}`}>
                    {equipo.estado_tecnico}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 font-medium">Disponibilidad:</span>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${getDisponibilidadBadge(equipo.estado_disponibilidad)}`}>
                    {equipo.estado_disponibilidad}
                  </span>
                </div>
              </div>

              {/* Salud Técnica */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">Salud Técnica:</span>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${equipo.diagnostico_salud?.color === 'green' ? 'bg-emerald-500' :
                        equipo.diagnostico_salud?.color === 'yellow' ? 'bg-amber-500' : 'bg-red-500'
                      }`}></span>
                    <span className={`text-[10px] font-black uppercase ${equipo.diagnostico_salud?.color === 'green' ? 'text-emerald-700' :
                        equipo.diagnostico_salud?.color === 'yellow' ? 'text-amber-700' : 'text-red-700'
                      }`}>
                      {equipo.diagnostico_salud?.rango}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-400 font-medium">Historial: {equipo.total_mantenimientos} mantenimientos</span>
                  {equipo.diagnostico_salud?.color === 'red' && (
                    <span className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-100 font-bold animate-bounce">⚠️ REEMPLAZO SUGERIDO</span>
                  )}
                </div>
              </div>

              {/* Usuario asignado */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 font-medium mr-2">👤</span>
                  <span className="text-gray-700">
                    {equipo.empleado_asignado_info ? (
                      <span className="font-semibold">{equipo.empleado_asignado_info.nombre_completo}</span>
                    ) : (
                      <span className="text-gray-400 italic">Sin asignar</span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="bg-gray-50 px-5 py-3 flex justify-end items-center gap-2">
              {equipo.estado_disponibilidad === 'Asignado' && (
                <button
                  onClick={() => handleDevolver(equipo)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
                >
                  <span>🔄</span>
                  <span>Devolver</span>
                </button>
              )}
              <button
                onClick={() => handleDarDeBaja(equipo.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
              >
                <span>🗑️</span>
                <span>Dar de Baja</span>
              </button>
              <Link
                href={`/equipos/editar/${equipo.id}`}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
              >
                <span>✏️</span>
                <span>Editar</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Layout>
      {/* Header con título y botón */}
      <div className="mb-10">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center mb-2">
              <span className="text-4xl mr-3">💻</span>
              <h1 className="text-4xl font-black text-gray-800 tracking-tight">
                Gestión de Equipos
              </h1>
            </div>
            <p className="text-gray-500 font-medium ml-14">
              {user?.is_superuser
                ? 'Panel global de inventario tecnológico (Todas las Sedes)'
                : (sedeActiva ? `Inventario tecnológico asignado a la sede: ${sedeActiva.nombre}` : 'Selecciona una sede para gestionar el inventario')}
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/equipos/historial"
              className="bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 font-bold py-4 px-6 rounded-2xl transition-all duration-300 shadow-sm flex items-center justify-center space-x-2"
            >
              <span className="text-xl">📜</span>
              <span>Historial de Movimientos</span>
            </Link>
            <Link
              href="/equipos/registrar"
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center space-x-2"
            >
              <span className="text-xl">➕</span>
              <span>Registrar Equipo</span>
            </Link>
          </div>
        </div>

        {/* Barra de búsqueda y filtros */}
        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Búsqueda */}
            <div className="relative">
              <input
                type="text"
                placeholder=" Buscar por nombre, marca o serial..."
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
                <option value="todos"> Todos los estados</option>
                <option value="Disponible">Disponible</option>
                <option value="Asignado"> Asignado</option>
                <option value="En mantenimiento"> En mantenimiento</option>
                <option value="Inactivo"> Inactivo</option>
              </select>
            </div>
          </div>

          {/* Contador de resultados */}
          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
            <span>
              Mostrando <span className="font-bold text-green-600">{equiposFiltrados.length}</span> de <span className="font-bold">{equipos.length}</span> equipos
            </span>
            {(searchTerm || filterEstado !== 'todos') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterEstado('todos');
                }}
                className="text-red-600 hover:text-red-700 font-semibold"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      {renderContent()}
    </Layout>
  );
}