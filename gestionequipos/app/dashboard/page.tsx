'use client';

import { useEffect, useState } from 'react';
import {Layout} from '@/components/Layout';
import { useRouter } from 'next/navigation';

interface StatItem {
  [key: string]: string | number;
  count: number;
}

interface DashboardStats {
  total_equipos: number;
  total_mantenimientos: number;
  total_perifericos: number;
  total_licencias: number;
  total_usuarios: number;
  proximos_mantenimientos: number;
  equipos_por_estado: StatItem[];
  equipos_por_disponibilidad: StatItem[];
  mantenimientos_por_estado: StatItem[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchStats = async () => {
      try {
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/stats/`;
        const response = await fetch(apiUrl, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          try {
            const errorData = JSON.parse(errorText);
            throw new Error(errorData.detail || `Error del servidor (${response.status}).`);
          } catch (jsonError) {
            throw new Error(`Error del servidor (${response.status}). Detalles: ${errorText || 'Error desconocido.'}`);
          }
        }

        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [router]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 border-t-slate-900 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium text-lg">Cargando Dashboard...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-1 h-12 bg-red-500 rounded-full"></div>
            <p className="text-red-800 font-medium">Error: {error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const equiposActivos = stats?.equipos_por_estado?.find(
    (item) => item.estado_tecnico === 'Funcional'
  )?.count || 0;

  const equiposDisponibles = stats?.equipos_por_disponibilidad?.find(
    (item) => item.estado_disponibilidad === 'Disponible'
  )?.count || 0;

  const equiposDesguazados = stats?.equipos_por_estado?.find(
    (item) => item.estado_tecnico === 'Desguazado'
  )?.count || 0;

  const equiposEnMantenimiento = stats?.equipos_por_disponibilidad?.find(
    (item) => item.estado_disponibilidad === 'En mantenimiento'
  )?.count || 0;

  const mantenimientosPendientes = stats?.proximos_mantenimientos || 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="space-y-6">
            <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-emerald-500 to-emerald-600"></div>
              <div className="p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-2">Mantenimientos próximos</p>
                    <h3 className="text-gray-600 text-sm leading-relaxed">Equipos pendientes de revisión</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold text-emerald-600">
                      {mantenimientosPendientes}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-600"></div>
              <div className="p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-2">Equipos activos</p>
                    <h3 className="text-gray-600 text-sm leading-relaxed">En operación actualmente</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold text-blue-600">
                      {equiposActivos}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-500 to-teal-600"></div>
              <div className="p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-2">Equipos disponibles</p>
                    <h3 className="text-gray-600 text-sm leading-relaxed">Listos para asignar</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold text-teal-600">
                      {equiposDisponibles}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-slate-400 to-slate-500"></div>
              <div className="p-8">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-gray-500 text-sm font-medium mb-2">Equipos desguazados</p>
                    <h3 className="text-gray-600 text-sm leading-relaxed">Dados de baja</h3>
                  </div>
                  <div className="text-right">
                    <div className="text-5xl font-bold text-slate-600">
                      {equiposDesguazados}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:row-span-2">
            <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 h-full">
              <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-orange-500 to-orange-600"></div>
              <div className="p-8 flex flex-col justify-between h-full">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-4">Equipos en mantenimiento</p>
                  <h3 className="text-gray-800 font-semibold text-xl mb-2">En proceso de reparación</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">Actualmente en revisión técnica</p>
                </div>
                
                <div>
                  <div className="text-7xl font-bold text-orange-600 mb-4">
                    {equiposEnMantenimiento}
                  </div>
                  <div className="inline-block px-4 py-2 bg-orange-50 rounded-lg border border-orange-100">
                    <span className="text-orange-700 font-medium text-xs">En servicio técnico</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div className="mt-10 bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
          <h3 className="text-gray-800 font-semibold text-lg mb-6">Resumen General</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-4xl font-bold text-slate-700 mb-2">{stats?.total_equipos || 0}</div>
              <div className="text-xs text-gray-500 font-medium">Total Equipos</div>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-4xl font-bold text-slate-700 mb-2">{stats?.total_perifericos || 0}</div>
              <div className="text-xs text-gray-500 font-medium">Periféricos</div>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-4xl font-bold text-slate-700 mb-2">
                {stats?.total_licencias || 0}
              </div>
              <div className="text-xs text-gray-500 font-medium">Licencias</div>
            </div>
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <div className="text-4xl font-bold text-slate-700 mb-2">{stats?.total_mantenimientos || 0}</div>
              <div className="text-xs text-gray-500 font-medium">Mantenimientos</div>
            </div>
          </div>
        </div>

      </div>
    </Layout>
  );
}
