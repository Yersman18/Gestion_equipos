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
  equipo_tipo?: string;
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
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterEquipoTipo, setFilterEquipoTipo] = useState('todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

    const fetchMantenimientos = async () => {
      setLoading(true);
      setError(null);

      const url = new URL(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/`);
      // Eliminamos el hardcode de 'Finalizado' para permitir filtrar por cualquier estado

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
    const search = searchTerm.toLowerCase();
    const matchSearch = m.equipo_asociado_nombre?.toLowerCase().includes(search) ||
      m.usuario_responsable_username?.toLowerCase().includes(search);

    const matchTipo = filterTipo === 'todos' || m.tipo_mantenimiento === filterTipo;
    const matchEstado = filterEstado === 'todos' || m.estado_mantenimiento === filterEstado;
    const matchEquipoTipo = filterEquipoTipo === 'todos' || m.equipo_tipo === filterEquipoTipo;

    // Filtrado por fechas
    let matchDate = true;
    if (startDate || endDate) {
      const fechaMaint = new Date(m.fecha_inicio);
      fechaMaint.setHours(0, 0, 0, 0);

      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (fechaMaint < start) matchDate = false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (fechaMaint > end) matchDate = false;
      }
    }

    return matchSearch && matchTipo && matchEstado && matchEquipoTipo && matchDate;
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

  const getEstadoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'Pendiente': 'bg-amber-100 text-amber-700 border-amber-200',
      'En proceso': 'bg-blue-100 text-blue-700 border-blue-200',
      'Finalizado': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Cancelado': 'bg-red-100 text-red-700 border-red-200',
    };
    return badges[estado] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Obtener tipos de equipo únicos para el filtro
  const equiposTipos = Array.from(new Set(mantenimientos.map(m => m.equipo_tipo).filter(Boolean)));

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold text-lg">Cargando registros...</p>
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
            ? `Seguimiento de todos los mantenimientos para la sede: ${sedeActiva.nombre}`
            : 'Vista global de mantenimientos (Superusuario)'}
        </p>
      </div>

      {/* Panel de Filtros Avanzado */}
      <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Búsqueda */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Búsqueda General</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Equipo, responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all pl-10"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">🔍</span>
            </div>
          </div>

          {/* Filtro Estado */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Estado</label>
            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En proceso">En proceso</option>
              <option value="Finalizado">Finalizado</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Filtro Tipo Mantenimiento */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tipo Maint.</label>
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
            >
              <option value="todos">Todos los tipos</option>
              <option value="Preventivo">Preventivo</option>
              <option value="Correctivo">Correctivo</option>
            </select>
          </div>

          {/* Filtro Tipo Equipo */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tipo de Equipo</label>
            <select
              value={filterEquipoTipo}
              onChange={(e) => setFilterEquipoTipo(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer"
            >
              <option value="todos">Todos los equipos</option>
              {equiposTipos.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Rango de Fechas */}
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Rango de Fechas (Inicio)</label>
            <div className="flex flex-col md:flex-row gap-2 md:items-center w-full">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
              <span className="hidden md:block text-gray-400">al</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
              />
            </div>
          </div>

          {/* Botón Limpiar */}
          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setFilterTipo('todos');
                setFilterEstado('todos');
                setFilterEquipoTipo('todos');
                setStartDate('');
                setEndDate('');
              }}
              className="w-full py-3 px-4 bg-gray-100 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <span>🔄</span> Borrar Filtros
            </button>
          </div>
        </div>

        {/* Resumen de resultados */}
        <div className="mt-6 pt-6 border-t border-gray-100 flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Se encontraron <span className="font-bold text-blue-600">{mantenimientosFiltrados.length}</span> registros que coinciden con tu búsqueda.
          </p>
        </div>
      </div>

      {/* Listado de Tarjetas */}
      {mantenimientosFiltrados.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {mantenimientosFiltrados.map((m) => (
            <div key={m.id} className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group">
              {/* Header - Estilo Formal */}
              <div className="bg-gray-50 p-5 border-b border-gray-100 flex items-start justify-between relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${m.estado_mantenimiento === 'Finalizado' ? 'bg-emerald-500' :
                  m.estado_mantenimiento === 'Pendiente' ? 'bg-amber-500' :
                    m.estado_mantenimiento === 'Cancelado' ? 'bg-red-500' : 'bg-blue-500'
                  }`}></div>
                <div className="flex-1 pl-2">
                  <h3 className="text-gray-900 font-bold text-lg leading-tight uppercase tracking-tight">{m.equipo_asociado_nombre}</h3>
                  <p className="text-gray-500 text-[10px] font-black uppercase mt-1 tracking-wider">{m.equipo_tipo || 'Elemento Tecnológico'}</p>
                </div>
                <span className="text-xl">📜</span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getTipoBadge(m.tipo_mantenimiento)}`}>
                    {m.tipo_mantenimiento}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getEstadoBadge(m.estado_mantenimiento)}`}>
                    {m.estado_mantenimiento}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-24 font-medium">Responsable:</span>
                    <span className="font-bold text-gray-800">👤 {m.usuario_responsable_username || 'Sin asignar'}</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <span className="w-24 font-medium">Fecha Inicio:</span>
                    <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">
                      📅 {new Date(m.fecha_inicio).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                    </span>
                  </div>
                  {m.fecha_finalizacion && (
                    <div className="flex items-center text-sm text-gray-600">
                      <span className="w-24 font-medium">Finalizado:</span>
                      <span className="font-mono text-xs bg-emerald-50 text-emerald-700 px-2 py-1 rounded">
                        🏁 {new Date(m.fecha_finalizacion).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-gray-50 flex gap-2">
                  {m.evidencia_finalizacion_url && (
                    <a
                      href={m.evidencia_finalizacion_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
                    >
                      📄 Evidencia
                    </a>
                  )}
                  <Link
                    href={`/mantenimientos/editar/${m.id}?view=true`}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1"
                  >
                    👁️ Ver más
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-200">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">No se encontraron resultados</h3>
          <p className="text-gray-500">Intenta ajustar los filtros para encontrar lo que buscas.</p>
        </div>
      )}
    </Layout>
  );
};

export default HistorialMantenimientosPage;