// app/mantenimientos/fechas/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';
import { Layout } from '@/components/Layout';
import { format, parseISO, differenceInDays, isPast, isFuture } from 'date-fns';

// --- 1. Definición de Tipos ---
interface Equipo {
  id: number;
  nombre: string;
  serial: string;
  sede_nombre: string;
  fecha_proximo_mantenimiento: string | null;
}

const ReporteMantenimientosPage = () => {
  const { token, user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { sedeActiva, isLoading: sedeLoading } = useSede();

  const [equiposVencidos, setEquiposVencidos] = useState<Equipo[]>([]);
  const [equiposProximos, setEquiposProximos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // --- 2. Carga y Procesamiento de Datos ---
  useEffect(() => {
    if (authLoading || sedeLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setError("Acceso no autorizado. Por favor, inicie sesión.");
      setLoading(false);
      return;
    }

    const fetchYProcesarEquipos = async () => {
      setLoading(true);
      setError(null);
      
      // La URL base para todos los equipos. La API se encargará de filtrar por usuario si no es superuser.
      const url = new URL(`${API_URL}/api/equipos/`);
      if (sedeActiva && !user?.is_superuser) {
        url.searchParams.append('sede', String(sedeActiva.id));
      }

      try {
        const response = await fetch(url.toString(), {
          headers: { 'Authorization': `Token ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudieron obtener los equipos.`);
        }

        const data: Equipo[] = await response.json();
        
        const hoy = new Date();
        const vencidos: Equipo[] = [];
        const proximos: Equipo[] = [];

        data.forEach(equipo => {
          if (equipo.fecha_proximo_mantenimiento) {
            const fechaProximo = parseISO(equipo.fecha_proximo_mantenimiento);
            
            // Mantenimientos Vencidos
            if (isPast(fechaProximo)) {
              vencidos.push(equipo);
            }
            // Próximos Mantenimientos (en los siguientes 30 días)
            else if (isFuture(fechaProximo) && differenceInDays(fechaProximo, hoy) <= 30) {
              proximos.push(equipo);
            }
          }
        });

        // Ordenar por fecha más cercana/más vencida
        vencidos.sort((a, b) => new Date(a.fecha_proximo_mantenimiento!).getTime() - new Date(b.fecha_proximo_mantenimiento!).getTime());
        proximos.sort((a, b) => new Date(a.fecha_proximo_mantenimiento!).getTime() - new Date(b.fecha_proximo_mantenimiento!).getTime());

        setEquiposVencidos(vencidos);
        setEquiposProximos(proximos);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchYProcesarEquipos();
  }, [token, user, isAuthenticated, authLoading, sedeActiva, sedeLoading, API_URL]);

  // --- 3. Componente de Tabla Reutilizable ---
  const MantenimientoTable = ({ title, equipos, color }: { title: string, equipos: Equipo[], color: string }) => (
    <div className="mb-12">
      <h2 className={`text-2xl font-bold mb-4 text-${color}-600`}>{title}</h2>
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr className={`border-b-2 border-gray-200 bg-gray-50 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider`}>
                <th className="px-6 py-4">Equipo</th>
                <th className="px-6 py-4">Serial</th>
                <th className="px-6 py-4">Sede</th>
                <th className="px-6 py-4">Fecha Programada</th>
                <th className="px-6 py-4 text-center">Días Restantes/Vencidos</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {equipos.length > 0 ? equipos.map((equipo, index) => {
                const fecha = parseISO(equipo.fecha_proximo_mantenimiento!);
                const diff = differenceInDays(fecha, new Date());
                const isVencido = diff < 0;

                return (
                  <tr key={equipo.id} className={`border-b border-gray-200 hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                    <td className="px-6 py-4">{equipo.nombre}</td>
                    <td className="px-6 py-4 font-mono">{equipo.serial}</td>
                    <td className="px-6 py-4">{equipo.sede_nombre}</td>
                    <td className="px-6 py-4">{format(fecha, 'dd/MM/yyyy')}</td>
                    <td className={`px-6 py-4 text-center font-bold ${isVencido ? 'text-red-500' : 'text-green-600'}`}>
                      {isVencido ? `${Math.abs(diff)} días vencido` : `${diff} días`}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-500">
                    No hay equipos en esta categoría.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // --- 4. Renderizado del Componente Principal ---
  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return <Layout><div className="text-red-500 text-center mt-10 p-4 bg-red-100 rounded-lg">{error}</div></Layout>;
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-black text-gray-800 mb-2">Reporte de Mantenimientos</h1>
        <p className="text-gray-600 mb-8">
          Vista proactiva de los mantenimientos vencidos y próximos a vencer.
          {sedeActiva && ` (Filtrado por sede: ${sedeActiva.nombre})`}
        </p>

        <MantenimientoTable title="🔴 Mantenimientos Vencidos" equipos={equiposVencidos} color="red" />
        <MantenimientoTable title="🟡 Próximos Mantenimientos (Siguientes 30 días)" equipos={equiposProximos} color="yellow" />

      </div>
    </Layout>
  );
};

export default ReporteMantenimientosPage;
