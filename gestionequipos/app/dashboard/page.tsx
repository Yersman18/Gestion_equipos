'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useRouter } from 'next/navigation';

// Interface para un item de estadística individual (e.g., por estado)
interface StatItem {
  [key: string]: string | number;
  count: number;
}

// Interface para el objeto completo de estadísticas del dashboard
interface DashboardStats {
  total_equipos: number;
  equipos_dados_de_baja: number; // Equipos inactivos
  total_mantenimientos: number;
  mantenimientos_activos: number; // Suma de 'Pendiente' y 'En proceso'
  total_perifericos: number;
  total_licencias: number;
  total_usuarios: number;
  proximos_mantenimientos: number; // Mantenimientos 'Pendientes' en los próximos 30 días
  equipos_por_estado: StatItem[];
  equipos_por_disponibilidad: StatItem[];
  mantenimientos_por_estado: StatItem[];
}

// Componente para una tarjeta de estadística
const StatCard = ({ title, value, description, colorClass, large = false }: { title: string, value: number | string, description: string, colorClass: string, large?: boolean }) => {
  if (large) {
    return (
      <div className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100 h-full`}>
        <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colorClass}`}></div>
        <div className="p-8 flex flex-col justify-between h-full">
          <div>
            <p className="text-gray-500 text-sm font-medium mb-4">{title}</p>
            <h3 className="text-gray-800 font-semibold text-xl mb-2">{description}</h3>
          </div>
          <div>
            <div className="text-7xl font-bold text-gray-800 mb-4">
              {value}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative bg-white rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-100`}>
      <div className={`absolute top-0 left-0 w-1 h-full bg-gradient-to-b ${colorClass}`}></div>
      <div className="p-6">
        <p className="text-gray-500 text-sm font-medium mb-2">{title}</p>
        <h3 className="text-gray-600 text-sm leading-relaxed mb-4">{description}</h3>
        <div className="text-5xl font-bold text-gray-800">
          {value}
        </div>
      </div>
    </div>
  );
};


// Componente principal del Dashboard
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
          throw new Error(`Error del servidor (${response.status})`);
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

  // --- Renderizado condicional ---
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
          <p className="text-red-800 font-medium">Error al cargar el dashboard: {error}</p>
        </div>
      </Layout>
    );
  }

  // --- Extracción y cálculo de datos del estado `stats` ---
  const equiposEnOperacion = stats?.equipos_por_disponibilidad?.find(
    (item) => item.estado_disponibilidad === 'Asignado'
  )?.count || 0;

  const equiposDisponibles = stats?.equipos_por_disponibilidad?.find(
    (item) => item.estado_disponibilidad === 'Disponible'
  )?.count || 0;

  const equiposEnReparacion = stats?.equipos_por_estado?.find(
    (item) => item.estado_tecnico === 'En reparación'
  )?.count || 0;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center mb-2">
            <span className="text-4xl mr-3">📊</span>
            <h1 className="text-4xl font-black text-gray-800 tracking-tight">
              Panel de Control
            </h1>
          </div>
          <p className="text-gray-500 font-medium ml-14">
            Resumen en tiempo real del inventario tecnológico y estado de los mantenimientos.
          </p>
        </div>

        {/* Sección de Estadísticas Principales */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="En Operación"
            value={equiposEnOperacion}
            description="Equipos asignados actualmente"
            colorClass="from-blue-500 to-blue-600"
          />
          <StatCard
            title="Disponibles"
            value={equiposDisponibles}
            description="Listos para ser asignados"
            colorClass="from-emerald-500 to-emerald-600"
          />
          <StatCard
            title="Dados de Baja"
            value={stats?.equipos_dados_de_baja || 0}
            description="Equipos retirados o inactivos"
            colorClass="from-slate-400 to-slate-500"
          />
        </div>

        {/* Sección de Mantenimientos */}
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Gestión de Mantenimientos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
          <StatCard
            title="Mantenimientos Activos"
            value={stats?.mantenimientos_activos || 0}
            description="Pendientes o En Proceso"
            colorClass="from-yellow-500 to-yellow-600"
          />
          <StatCard
            title="Próximos Mantenimientos"
            value={stats?.proximos_mantenimientos || 0}
            description="En los siguientes 30 días"
            colorClass="from-sky-500 to-sky-600"
          />
          <StatCard
            title="En Reparación"
            value={equiposEnReparacion}
            description="Equipos en taller"
            colorClass="from-orange-500 to-orange-600"
          />
        </div>

        {/* Sección de Resumen General y Desgloses */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Columna de Resumen General */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Resumen General</h2>
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-4xl font-bold text-slate-700 mb-2">{stats?.total_equipos || 0}</div>
              <div className="text-sm text-gray-500 font-medium">Total Equipos Activos</div>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-4xl font-bold text-slate-700 mb-2">{stats?.total_perifericos || 0}</div>
              <div className="text-sm text-gray-500 font-medium">Total Periféricos</div>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-4xl font-bold text-slate-700 mb-2">{stats?.total_licencias || 0}</div>
              <div className="text-sm text-gray-500 font-medium">Total Licencias</div>
            </div>
            <div className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="text-4xl font-bold text-slate-700 mb-2">{stats?.total_usuarios || 0}</div>
              <div className="text-sm text-gray-500 font-medium">Total Usuarios</div>
            </div>
          </div>

          {/* Columna de Desgloses */}
          <div className="lg:col-span-2 space-y-8">
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-800 font-semibold text-lg mb-4">Mantenimientos por Estado</h3>
              <ul className="space-y-3">
                {stats?.mantenimientos_por_estado?.map(item => (
                  <li key={`mantenimiento-${item.estado_mantenimiento}`} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{item.estado_mantenimiento}</span>
                    <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-8 bg-white rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-800 font-semibold text-lg mb-4">Equipos por Estado Técnico</h3>
              <ul className="space-y-3">
                {stats?.equipos_por_estado?.map(item => (
                  <li key={`equipo-${item.estado_tecnico}`} className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">{item.estado_tecnico}</span>
                    <span className="font-bold text-gray-800 bg-gray-100 px-2 py-1 rounded">{item.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

        </div>

      </div>
    </Layout>
  );
}
