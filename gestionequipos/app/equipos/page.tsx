'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { useAuth } from '../context/AuthContext';
import { useSede } from '../context/SedeContext';

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
}

export default function EquiposPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
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
      let apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/equipos/`;

      if (!user?.is_superuser) {
        if (isSedeLoading) return;
        if (!sedeActiva) {
          setEquipos([]);
          setIsLoadingData(false);
          return;
        }
        apiUrl += `?sede_id=${sedeActiva.id}`;
      }

      try {
        const response = await fetch(apiUrl, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) throw new Error('No se pudieron cargar los equipos.');
        const data = await response.json();
        setEquipos(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoadingData(false);
      }
    };

    fetchEquipos();
  }, [user, token, isAuthenticated, isAuthLoading, isSedeLoading, sedeActiva, router]);

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

  const handleDelete = async (equipoId: number) => {
    if (!token) {
      setError('No autorizado para realizar esta acción.');
      return;
    }

    if (window.confirm('¿Estás seguro de que quieres eliminar este equipo? Esta acción no se puede deshacer.')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/equipos/${equipoId}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMessage = errorData.detail || 'No se pudo eliminar el equipo.';
          throw new Error(errorMessage);
        }

        // Eliminar el equipo de la lista localmente
        setEquipos(prevEquipos => prevEquipos.filter(equipo => equipo.id !== equipoId));
        alert('Equipo eliminado exitosamente.');

      } catch (err: any) {
        setError(err.message);
      }
    }
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
            {/* Header de la tarjeta */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-bold text-lg mb-1">{equipo.nombre}</h3>
                  <p className="text-white/90 text-sm">{equipo.marca} {equipo.modelo}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full p-2">
                  <span className="text-2xl"></span>
                </div>
              </div>
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
            <div className="bg-gray-50 px-5 py-3 flex justify-end space-x-2"> {/* Added space-x-2 for spacing */}
              <button 
                onClick={() => handleDelete(equipo.id)}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
              >
                <span></span>
                <span>Eliminar</span>
              </button>
              <Link 
                href={`/equipos/editar/${equipo.id}`} 
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-1"
              >
                <span></span>
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
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-800 flex items-center">
              <span className="text-4xl mr-3"></span>
              Equipos
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.is_superuser ? '(Todas las Sedes)' : (sedeActiva ? `${sedeActiva.nombre}` : '')}
            </p>
          </div>
          <Link 
            href="/equipos/registrar" 
            className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
          >
            <span className="text-xl"></span>
            <span>Registrar Equipo</span>
          </Link>
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