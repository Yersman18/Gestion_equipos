"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';

interface Periferico {
  id: number;
  nombre: string;
  tipo: string;
  estado_tecnico: string;
  estado_disponibilidad: string;
  empleado_asignado_info?: {
    nombre_completo: string;
  };
}

const PerifericosPage = () => {
  const [perifericos, setPerifericos] = useState<Periferico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchPerifericos = async () => {
      try {
        const data = await fetchAuthenticated('/api/perifericos/');
        setPerifericos(data);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Ocurrió un error desconocido');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPerifericos();
  }, []);

  const handleReturn = async (periferico: Periferico) => {
    if (window.confirm(`¿Confirmar devolución de ${periferico.nombre}? Quedará disponible en inventario.`)) {
      try {
        await fetchAuthenticated(`/api/perifericos/${periferico.id}/`, {
          method: 'PUT',
          body: JSON.stringify({
            ...periferico,
            empleado_asignado: null,
            estado_disponibilidad: 'Disponible',
            fecha_entrega: null
          }),
        });

        setPerifericos(perifericos.map(p =>
          p.id === periferico.id
            ? { ...p, estado_disponibilidad: 'Disponible', empleado_asignado_info: undefined }
            : p
        ));
      } catch (err: any) {
        alert(`Error al devolver: ${err.message}`);
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas dar de baja este periférico?')) {
      try {
        await fetchAuthenticated(`/api/perifericos/${id}/`, {
          method: 'DELETE',
        });
        setPerifericos(perifericos.filter(p => p.id !== id));
      } catch (err) {
        if (err instanceof Error) {
          alert(`Error al eliminar: ${err.message}`);
        } else {
          alert('Ocurrió un error desconocido al eliminar.');
        }
      }
    }
  };

  const filteredPerifericos = perifericos.filter(periferico => {
    const search = searchTerm.toLowerCase();
    const matchesNombre = periferico.nombre.toLowerCase().includes(search);
    const matchesEmpleado = periferico.empleado_asignado_info?.nombre_completo?.toLowerCase().includes(search);
    return matchesNombre || matchesEmpleado;
  });

  const getEstadoTecnicoBadge = (estado: string) => {
    const badges: { [key: string]: string } = {
      'Funcional': 'bg-green-100 text-green-700 border-green-200',
      'Nuevo': 'bg-blue-100 text-blue-700 border-blue-200',
      'Con fallas': 'bg-orange-100 text-orange-700 border-orange-200',
      'Dañado': 'bg-red-100 text-red-700 border-red-200',
    };
    return badges[estado] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getDisponibilidadBadge = (disponibilidad: string) => {
    const badges: { [key: string]: string } = {
      'Disponible': 'bg-emerald-100 text-emerald-700 border-emerald-200',
      'Asignado': 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return badges[disponibilidad] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold">Cargando periféricos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header Formal */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center mb-2">
                <span className="text-4xl mr-3">🖱️</span>
                <h1 className="text-4xl font-black text-gray-800 tracking-tight">
                  Gestión de Periféricos
                </h1>
              </div>
              <p className="text-gray-500 font-medium ml-14">
                Administra teclados, mouse, monitores y más elementos del inventario tecnológico.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/perifericos/registrar/lote"
                className="bg-white hover:bg-gray-50 text-emerald-600 border-2 border-emerald-600 font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
              >
                <span>📦</span>
                <span>Registrar en Lote</span>
              </Link>
              <Link
                href="/perifericos/registrar"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-1 flex items-center justify-center gap-2"
              >
                <span>➕</span>
                <span>Registrar Periférico</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Búsqueda */}
        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-200 mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por tipo de periférico o colaborador..."
              className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute left-4 top-4.5 text-2xl">🔍</span>
          </div>
        </div>

        {/* Grid de Tarjetas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPerifericos.map((periferico) => (
            <div
              key={periferico.id}
              className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group"
            >
              {/* Header de tarjeta */}
              <div className="bg-gray-50 p-5 border-b border-gray-100 flex items-start justify-between relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${periferico.estado_disponibilidad === 'Disponible' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
                <div className="flex-1 pl-2">
                  <h3 className="text-gray-900 font-bold text-lg leading-tight uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                    {periferico.nombre}
                  </h3>
                  <p className="text-gray-500 text-[10px] font-black uppercase mt-1 tracking-wider">{periferico.tipo}</p>
                </div>
                <span className="text-xl">🖱️</span>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Estado Técnico</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getEstadoTecnicoBadge(periferico.estado_tecnico)}`}>
                      {periferico.estado_tecnico}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Disponibilidad</span>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${getDisponibilidadBadge(periferico.estado_disponibilidad)}`}>
                      {periferico.estado_disponibilidad}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-50">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-500 font-medium mr-2">👤</span>
                    <span className="text-gray-700">
                      {periferico.empleado_asignado_info ? (
                        <span className="font-bold">{periferico.empleado_asignado_info.nombre_completo}</span>
                      ) : (
                        <span className="text-gray-400 italic">Sin asignar</span>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-gray-50 px-5 py-3 flex justify-end items-center gap-2">
                {periferico.estado_disponibilidad === 'Asignado' && (
                  <button
                    onClick={() => handleReturn(periferico)}
                    className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1"
                  >
                    <span>🔄</span> Devolver
                  </button>
                )}
                <button
                  onClick={() => handleDelete(periferico.id)}
                  className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-3 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1"
                >
                  <span>🗑️</span>
                </button>
                <Link
                  href={`/perifericos/editar/${periferico.id}`}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors duration-200 flex items-center gap-1"
                >
                  <span>✏️</span> Editar
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPerifericos.length === 0 && (
          <div className="bg-white rounded-3xl p-16 text-center border-2 border-dashed border-gray-200">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">No se encontraron periféricos</h3>
            <p className="text-gray-500">Intenta ajustar tu búsqueda para encontrar lo que necesitas.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PerifericosPage;