'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { useAuth } from '../context/AuthContext';
import { useSede } from '../context/SedeContext';

// Define las interfaces para los datos que vamos a manejar
interface Mantenimiento {
  id: number;
  equipo_nombre: string;
  tipo_mantenimiento: string;
  estado_mantenimiento: string;
  fecha_inicio: string;
  responsable_nombre: string;
  sede_nombre: string;
}

interface ProximoMantenimiento {
  equipo_id: number;
  equipo_nombre:string;
  fecha_proximo_mantenimiento: string;
  dias_restantes: number;
  sede_nombre: string;
  estado_ciclo?: string; // Nuevo campo para el estado del ciclo
}

type Tab = 'en-proceso' | 'proximos' | 'historial';

export default function MantenimientosPage() {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { sedeActiva } = useSede();
  
  const [activeTab, setActiveTab] = useState<Tab>('en-proceso');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para cada tipo de dato
  const [mantenimientosEnProceso, setMantenimientosEnProceso] = useState<Mantenimiento[]>([]);
  const [proximosMantenimientos, setProximosMantenimientos] = useState<ProximoMantenimiento[]>([]);
  const [historialMantenimientos, setHistorialMantenimientos] = useState<Mantenimiento[]>([]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      
      // Construimos la URL base con el filtro de sede si es necesario
      const sedeQuery = user?.is_superuser ? '' : `?sede_id=${sedeActiva?.id || ''}`;
      if (!user?.is_superuser && !sedeActiva) {
        setIsLoading(false);
        return;
      }

      try {
        // Hacemos las 3 peticiones a la API en paralelo para más eficiencia
        const [procesoRes, proximosRes, historialRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/?estado=en_proceso${sedeQuery ? '&' + sedeQuery.substring(1) : ''}`, { headers: { 'Authorization': `Token ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/proximos/${sedeQuery}`, { headers: { 'Authorization': `Token ${token}` } }),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mantenimientos/?estado=finalizado${sedeQuery ? '&' + sedeQuery.substring(1) : ''}`, { headers: { 'Authorization': `Token ${token}` } })
        ]);

        if (!procesoRes.ok || !proximosRes.ok || !historialRes.ok) {
          throw new Error('No se pudieron cargar los datos de mantenimiento.');
        }

        const [procesoData, proximosData, historialData] = await Promise.all([
          procesoRes.json(),
          proximosRes.json(),
          historialRes.json()
        ]);

        // Calcular estado_ciclo para proximosMantenimientos
        const proximosMantenimientosConEstado = proximosData.map((pm: ProximoMantenimiento) => {
            let estado_ciclo_calculado = '';
            if (pm.dias_restantes < 0) {
                estado_ciclo_calculado = 'Atrasado';
            } else if (pm.dias_restantes >= 0 && pm.dias_restantes <= 7) {
                estado_ciclo_calculado = 'Pendiente';
            } else {
                estado_ciclo_calculado = 'Próximo';
            }
            return { ...pm, estado_ciclo: estado_ciclo_calculado };
        });

        setMantenimientosEnProceso(procesoData);
        setProximosMantenimientos(proximosMantenimientosConEstado);
        setHistorialMantenimientos(historialData);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user, token, isAuthenticated, isAuthLoading, sedeActiva, router]);

  const renderActiveTabContent = () => {
    if (isLoading) {
      return <p>Cargando...</p>;
    }
    if (error) {
      return <p className="text-red-500">Error: {error}</p>;
    }
    if (!user?.is_superuser && !sedeActiva) {
        return <p className="text-yellow-700">Por favor, selecciona una sede para continuar.</p>;
    }

    switch (activeTab) {
      case 'en-proceso':
        return <TablaMantenimientos data={mantenimientosEnProceso} />;
      case 'proximos':
        return <TablaProximosMantenimientos data={proximosMantenimientos} />;
      case 'historial':
        return <TablaMantenimientos data={historialMantenimientos} esHistorial={true} />;
      default:
        return null;
    }
  };

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-800">Gestión de Mantenimientos</h1>
          <p className="text-gray-600 mt-1">
            Controla los mantenimientos preventivos y correctivos de los equipos.
          </p>
        </div>
        <Link href="/mantenimientos/registrar" className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">
          Registrar Mantenimiento
        </Link>
      </div>

      {/* Pestañas de navegación */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('en-proceso')}
              className={`${activeTab === 'en-proceso' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              En Proceso ({mantenimientosEnProceso.length})
            </button>
            <button
              onClick={() => setActiveTab('proximos')}
              className={`${activeTab === 'proximos' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Próximos Mantenimientos ({proximosMantenimientos.length})
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`${activeTab === 'historial' ? 'border-green-500 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Historial ({historialMantenimientos.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido de la pestaña activa */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        {renderActiveTabContent()}
      </div>
    </Layout>
  );
}

// Componente para la tabla de mantenimientos (En Proceso e Historial)
const TablaMantenimientos = ({ data, esHistorial = false }: { data: Mantenimiento[], esHistorial?: boolean }) => {
  if (data.length === 0) return <p>No hay mantenimientos para mostrar.</p>;
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipo</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{esHistorial ? 'Fecha Finalización' : 'Fecha Inicio'}</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map(m => (
          <tr key={m.id}>
            <td className="px-6 py-4 whitespace-nowrap">{m.equipo_nombre}</td>
            <td className="px-6 py-4 whitespace-nowrap">{m.tipo_mantenimiento}</td>
            <td className="px-6 py-4 whitespace-nowrap">{m.estado_mantenimiento}</td>
            <td className="px-6 py-4 whitespace-nowrap">{m.fecha_inicio}</td>
            <td className="px-6 py-4 whitespace-nowrap">{m.sede_nombre}</td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
              {esHistorial ? (
                <Link href={`/mantenimientos/editar/${m.id}`} className="text-blue-600 hover:text-blue-800">Ver</Link>
              ) : (
                m.estado_mantenimiento !== 'finalizado' ? (
                  <Link href={`/mantenimientos/editar/${m.id}`} className="text-blue-600 hover:text-blue-800">Editar</Link>
                ) : (
                  <span className="text-gray-500">Finalizado</span>
                )
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Componente para la tabla de próximos mantenimientos
const TablaProximosMantenimientos = ({ data }: { data: ProximoMantenimiento[] }) => {
  if (data.length === 0) return <p>No hay próximos mantenimientos programados.</p>;
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipo</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próximo Mantenimiento</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Días Restantes</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado del Ciclo</th>
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {data.map(pm => (
          <tr key={pm.equipo_id}>
            <td className="px-6 py-4 whitespace-nowrap">{pm.equipo_nombre}</td>
            <td className="px-6 py-4 whitespace-nowrap">{pm.fecha_proximo_mantenimiento}</td>
            <td className="px-6 py-4 whitespace-nowrap">{pm.dias_restantes}</td>
            <td className="px-6 py-4 whitespace-nowrap">{pm.sede_nombre}</td>
            <td className="px-6 py-4 whitespace-nowrap">
                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full
                  ${pm.estado_ciclo === 'Atrasado' ? 'bg-red-100 text-red-800' : ''}
                  ${pm.estado_ciclo === 'Pendiente' ? 'bg-yellow-100 text-yellow-800' : ''}
                  ${pm.estado_ciclo === 'Próximo' ? 'bg-green-100 text-green-800' : ''}
                `}>
                  {pm.estado_ciclo}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
              <Link href={`/equipos/detalle/${pm.equipo_id}`} className="text-blue-600 hover:text-blue-800">Ver Equipo</Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
