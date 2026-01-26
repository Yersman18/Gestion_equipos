'use client';

import React, { useState, useEffect } from 'react';

// Define la estructura de un registro de historial
interface HistorialItem {
  id: number;
  fecha_cambio: string;
  valor_anterior: string;
  valor_nuevo: string;
  usuario_nombre: string;
}

// Define las props que recibirá el componente
interface HistorialAsignacionesProps {
  equipoId: number;
  token: string;
}

const HistorialAsignaciones: React.FC<HistorialAsignacionesProps> = ({ equipoId, token }) => {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!equipoId || !token) {
        setLoading(false);
        return;
    };

    const fetchHistorial = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://127.0.0.1:8000/api/inventory/equipos/${equipoId}/historial/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('No se pudo obtener el historial de asignaciones.');
        }

        const data: HistorialItem[] = await response.json();
        setHistorial(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchHistorial();
  }, [equipoId, token]);

  if (loading) {
    return <div>Cargando historial...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error: {error}</div>;
  }

  return (
    <div className="mt-6">
      <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">Historial de Asignaciones</h3>
      {historial.length > 0 ? (
        <div className="border-t border-gray-200">
          <ul role="list" className="divide-y divide-gray-200">
            {historial.map((item) => (
              <li key={item.id} className="py-4">
                <div className="flex space-x-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">
                        De: <span className="font-normal">{item.valor_anterior || 'Sin asignar'}</span>
                        <span className="mx-2">→</span>
                        A: <span className="font-normal">{item.valor_nuevo || 'Sin asignar'}</span>
                      </h4>
                      <p className="text-sm text-gray-500">{new Date(item.fecha_cambio).toLocaleString()}</p>
                    </div>
                    <p className="text-sm text-gray-600">
                      Cambio realizado por: <span className="font-semibold">{item.usuario_nombre || 'Sistema'}</span>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-500 mt-2">No hay historial de asignaciones para este equipo.</p>
      )}
    </div>
  );
};

export default HistorialAsignaciones;
