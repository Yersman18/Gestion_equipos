'use client';

import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/app/context/AuthContext';

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  cedula?: string;
  cargo?: string;
  area?: string;
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  const handleDelete = async (id: number) => {
    if (!token) {
      setError('No hay token de autenticación disponible.');
      return;
    }

    if (window.confirm('¿Estás seguro de que quieres eliminar este empleado?')) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/empleados/${id}/`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Fallo al eliminar el empleado.');
        }

        setEmpleados(empleados.filter((emp) => emp.id !== id));
        alert('Empleado eliminado con éxito.');
      } catch (err: any) {
        setError(err.message);
        alert(`Error al eliminar empleado: ${err.message}`);
      }
    }
  };

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchEmpleados = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/empleados/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch employees');
        }

        const data: Empleado[] = await response.json();
        setEmpleados(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmpleados();
  }, [isAuthenticated, isAuthLoading, router, token]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold text-lg">Cargando empleados...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <span className="text-4xl mr-3">👥</span>
          <h1 className="text-3xl font-black text-gray-800">Gestión de Empleados</h1>
        </div>
        <p className="text-gray-600 ml-14">Administra el listado de empleados en el sistema.</p>
      </div>

      {/* Botón para crear nuevo empleado */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => router.push('/empleados/registrar')}
          className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center space-x-2 transition-all duration-200 shadow-lg"
        >
          <span>➕</span>
          <span>Registrar Nuevo Empleado</span>
        </button>
      </div>

      {/* Tabla de Empleados */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="text-3xl mr-3">📋</span>
            Listado de Empleados
          </h2>
        </div>
        <div className="p-6">
          {empleados.length === 0 ? (
            <p className="text-gray-600 text-center py-8">No hay empleados registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nombre Completo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cédula
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cargo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Área
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {empleados.map((empleado) => (
                    <tr key={empleado.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {empleado.nombre} {empleado.apellido}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {empleado.cedula || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {empleado.cargo || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {empleado.area || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => router.push(`/empleados/editar/${empleado.id}`)}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(empleado.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                        {/* Aquí se pueden añadir botones para eliminar, ver detalles, etc. */}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
