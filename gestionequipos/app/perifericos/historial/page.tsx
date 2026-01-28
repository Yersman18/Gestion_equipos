'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';

interface HistorialPeriferico {
  id: number;
  periferico_nombre: string;
  empleado_nombre: string;
  fecha_asignacion: string;
  fecha_devolucion: string | null;
  observacion_devolucion: string | null;
}

const HistorialPerifericosPage = () => {
  const [historial, setHistorial] = useState<HistorialPeriferico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistorial = async () => {
      try {
        const data = await fetchAuthenticated('/api/perifericos/historial/');
        setHistorial(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistorial();
  }, []);

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Historial de Asignaciones</h1>
          <p className="text-gray-500">Registro histórico de entregas y devoluciones de periféricos.</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periférico</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Colaborador</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Asignación</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado de Entrega</th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devolución</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historial.map((h) => (
                  <tr key={h.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{h.periferico_nombre}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700">{h.empleado_nombre}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600">
                        {new Date(h.fecha_asignacion).toLocaleDateString()} {new Date(h.fecha_asignacion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-700">Asignado</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {h.fecha_devolucion ? (
                        <div className="flex flex-col">
                          <span className="text-emerald-600 font-medium">Devuelto: {new Date(h.fecha_devolucion).toLocaleDateString()}</span>
                          {h.observacion_devolucion && <span className="text-xs italic">"{h.observacion_devolucion}"</span>}
                        </div>
                      ) : (
                        <span className="text-amber-600 font-medium italic">En posesión</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historial.length === 0 && (
              <div className="text-center py-20 text-gray-500 bg-white">
                <p className="text-lg font-medium">No hay registros de historial aún.</p>
                <p className="text-sm">Las asignaciones hechas en el inventario aparecerán aquí.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HistorialPerifericosPage;
