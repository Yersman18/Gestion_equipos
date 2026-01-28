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

        // Actualizar lista local
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
    if (window.confirm('¿Estás seguro de que deseas dar de baja este periférico? Se eliminará del inventario activo pero quedará en el historial.')) {
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Cargando periféricos...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 shadow-sm">
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
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
                Administra teclados, mouse, monitores y más elementos del inventario.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/perifericos/registrar"
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>➕</span>
                <span>Registrar Periférico</span>
              </Link>
              <Link
                href="/perifericos/registrar/lote"
                className="bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>📦</span>
                <span>Registrar en Lote</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Buscar por tipo de periférico o nombre de colaborador..."
            className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table Rows */}
        <div className="space-y-4">
          {filteredPerifericos.map((periferico) => (
            <div
              key={periferico.id}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100 overflow-hidden"
            >
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-5 gap-4">
                {/* Left Section - Main Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <h3 className="text-lg font-semibold text-gray-800">{periferico.nombre}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-600 text-sm">
                      {periferico.empleado_asignado_info?.nombre_completo || (
                        <span className="italic text-gray-400">Sin asignar</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Middle Section - Status Badges */}
                <div className="flex flex-wrap gap-4 items-center">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 text-xs font-medium">Estado técnico</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${periferico.estado_tecnico === 'Funcional'
                        ? 'bg-green-100 text-green-700'
                        : periferico.estado_tecnico === 'Nuevo'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-orange-100 text-orange-700'
                        }`}
                    >
                      {periferico.estado_tecnico}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-gray-500 text-xs font-medium">Disponibilidad</span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${periferico.estado_disponibilidad === 'Disponible'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-yellow-100 text-yellow-700'
                        }`}
                    >
                      {periferico.estado_disponibilidad}
                    </span>
                  </div>
                </div>

                {/* Right Section - Actions */}
                <div className="flex gap-2">
                  {periferico.estado_disponibilidad === 'Asignado' && (
                    <button
                      onClick={() => handleReturn(periferico)}
                      className="bg-amber-500 hover:bg-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm shadow-sm"
                    >
                      Devolver
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(periferico.id)}
                    className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm shadow-sm"
                  >
                    Dar de Baja
                  </button>
                  <Link
                    href={`/perifericos/editar/${periferico.id}`}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm shadow-sm inline-block"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPerifericos.length === 0 && (
          <div className="text-center py-16 bg-white rounded-lg border border-gray-100 shadow-sm">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">No se encontraron periféricos</h3>
            <p className="text-gray-500">Intenta con otro término de búsqueda</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PerifericosPage;