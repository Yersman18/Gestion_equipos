"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchAuthenticated } from '@/app/utils/api'; // Importar la función centralizada

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

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este periférico?')) {
      try {
        await fetchAuthenticated(`/api/perifericos/${id}/`, {
          method: 'DELETE',
        });
        // Actualizar el estado para remover el periférico eliminado
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

  const filteredPerifericos = perifericos.filter(periferico =>
    periferico.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Cargando periféricos...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Gestión de Periféricos</h1>
        <div className="flex gap-4">
          <Link href="/perifericos/registrar" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Registrar Periférico
          </Link>
          <Link href="/perifericos/registrar/lote" className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">
            Registrar en Lote
          </Link>
        </div>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre..."
          className="w-full px-4 py-2 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto bg-white rounded-lg shadow">
        <table className="min-w-full leading-normal">
          <thead>
            <tr>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Nombre
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Tipo
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado Técnico
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Disponibilidad
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Asignado a
              </th>
              <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100"></th>
            </tr>
          </thead>
          <tbody>
            {filteredPerifericos.map((periferico) => (
              <tr key={periferico.id}>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{periferico.nombre}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">{periferico.tipo}</p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <span
                    className={`relative inline-block px-3 py-1 font-semibold leading-tight ${
                      periferico.estado_tecnico === 'Funcional'
                        ? 'text-green-900'
                        : 'text-red-900'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-0 ${
                        periferico.estado_tecnico === 'Funcional'
                          ? 'bg-green-200'
                          : 'bg-red-200'
                      } opacity-50 rounded-full`}
                    ></span>
                    <span className="relative">{periferico.estado_tecnico}</span>
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                <span
                    className={`relative inline-block px-3 py-1 font-semibold leading-tight ${
                      periferico.estado_disponibilidad === 'Disponible'
                        ? 'text-blue-900'
                        : 'text-yellow-900'
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`absolute inset-0 ${
                        periferico.estado_disponibilidad === 'Disponible'
                          ? 'bg-blue-200'
                          : 'bg-yellow-200'
                      } opacity-50 rounded-full`}
                    ></span>
                    <span className="relative">{periferico.estado_disponibilidad}</span>
                  </span>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm">
                  <p className="text-gray-900 whitespace-no-wrap">
                    {periferico.empleado_asignado_info?.nombre_completo || 'No asignado'}
                  </p>
                </td>
                <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-right">
                  <Link href={`/perifericos/editar/${periferico.id}`} className="text-indigo-600 hover:text-indigo-900 mr-4">
                    Editar
                  </Link>
                  <button
                    onClick={() => handleDelete(periferico.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerifericosPage;