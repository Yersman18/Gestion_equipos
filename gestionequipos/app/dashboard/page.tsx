'use client';

import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { useRouter } from 'next/navigation';
import { useSede } from '@/app/context/SedeContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Monitor, Settings, AlertTriangle, CheckCircle, Package, Users, Shield, Clock, TrendingUp, Laptop, MousePointer2, FileText
} from 'lucide-react';

// Interface para un item de estadística individual
interface StatItem {
  [key: string]: string | number;
  count: number;
}

// Interface para el objeto completo de estadísticas
interface DashboardStats {
  total_equipos: number;
  equipos_dados_de_baja: number;
  total_mantenimientos: number;
  mantenimientos_activos: number;
  mantenimientos_vencidos: number;
  mantenimientos_finalizados_tarde: number;
  total_perifericos: number;
  total_licencias: number;
  licencias_vencidas: number;
  licencias_por_vencer: number;
  total_usuarios: number;
  proximos_mantenimientos: number;
  equipos_por_estado: StatItem[];
  equipos_por_disponibilidad: StatItem[];
  equipos_por_tipo: StatItem[];
  mantenimientos_por_estado: StatItem[];
  mantenimientos_por_tipo: StatItem[];
  perifericos_por_tipo: StatItem[];
  licencias_por_estado: StatItem[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b', '#ec4899', '#06b6d4'];

const CustomCard = ({ children, title, icon: Icon, className = "" }: { children: React.ReactNode, title: string, icon: any, className?: string }) => (
  <div className={`bg-white rounded-3xl shadow-sm border border-gray-100 p-6 ${className}`}>
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 bg-slate-50 rounded-xl text-slate-600">
        <Icon size={20} />
      </div>
      <h3 className="font-bold text-gray-800 tracking-tight">{title}</h3>
    </div>
    {children}
  </div>
);

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { sedeActiva } = useSede();

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const queryParams = sedeActiva && sedeActiva.id !== 0 ? `?sede_id=${sedeActiva.id}` : '';
        const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/api/dashboard/stats/${queryParams}`;
        const response = await fetch(apiUrl, {
          headers: { 'Authorization': `Token ${token}` },
        });

        if (!response.ok) throw new Error(`Error del servidor (${response.status})`);
        const data: DashboardStats = await response.json();
        setStats(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [router, sedeActiva]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-[80vh]">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 bg-blue-500 rounded-full animate-bounce mb-4"></div>
            <p className="text-gray-400 font-bold">Analizando inventario...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-red-50 border border-red-200 rounded-3xl p-6 text-red-800 font-bold shadow-sm">
            Hubo un error al cargar las estadísticas. Por favor intenta de nuevo.
            <div className="text-sm font-normal mt-2">{error}</div>
          </div>
        </div>
      </Layout>
    );
  }

  // Preparar datos para gráficos con protección contra nulos/indefinidos
  const chartDataDisponibilidad = stats?.equipos_por_disponibilidad?.map(item => ({
    name: item.estado_disponibilidad,
    value: item.count
  })) || [];

  const chartDataTipoEquipo = stats?.equipos_por_tipo?.map(item => ({
    name: item.tipo_equipo || 'Otros',
    value: item.count
  })) || [];

  const chartDataMantenimiento = stats?.mantenimientos_por_estado?.map(item => ({
    name: item.estado_mantenimiento,
    total: item.count
  })) || [];

  const chartDataPerifericos = stats?.perifericos_por_tipo?.map(item => ({
    name: item.tipo || 'Otros',
    value: item.count
  })) || [];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl relative z-50">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.1em] mb-1">{label || payload[0].name}</p>
          <div className="flex items-center gap-2">
            <span className="text-white text-xl font-black">
              {payload[0].value || payload[0].payload.total}
            </span>
            <span className="text-slate-400 text-xs font-bold">unidades</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">

        {/* Banner de Bienvenida y Resumen Rápido */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight mb-2">Panel de Control</h1>
            <p className="text-gray-500 flex items-center gap-2 font-medium">
              <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
              Estado operativo de {sedeActiva?.id === 0 ? 'todas las sedes' : `Sede ${sedeActiva?.nombre}`}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 px-6 shadow-sm">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Monitor size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Equipos</p>
                <p className="text-2xl font-black text-gray-800">{stats?.total_equipos || 0}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 px-6 shadow-sm">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                <Users size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase">Usuarios</p>
                <p className="text-2xl font-black text-gray-800">{stats?.total_usuarios || 0}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Sección de Alertas */}
        {(stats?.mantenimientos_vencidos || 0) > 0 || (stats?.licencias_vencidas || 0) > 0 || (stats?.licencias_por_vencer || 0) > 0 || (stats?.mantenimientos_finalizados_tarde || 0) > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {(stats?.mantenimientos_vencidos || 0) > 0 && (
              <div className="bg-red-50 border border-red-100 p-5 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-red-500 text-white rounded-2xl shadow-lg shadow-red-200">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-red-900 text-sm">Mantenimientos Vencidos</h4>
                  <p className="text-2xl font-black text-red-600 leading-none">{stats?.mantenimientos_vencidos}</p>
                </div>
              </div>
            )}
            {(stats?.licencias_vencidas || 0) > 0 && (
              <div className="bg-amber-50 border border-amber-100 p-5 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
                  <Shield size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Licencias Vencidas</h4>
                  <p className="text-2xl font-black text-amber-600 leading-none">{stats?.licencias_vencidas}</p>
                </div>
              </div>
            )}
            {(stats?.mantenimientos_finalizados_tarde || 0) > 0 && (
              <div className="bg-rose-50 border border-rose-100 p-5 rounded-3xl flex items-center gap-4">
                <div className="p-3 bg-rose-400 text-white rounded-2xl shadow-lg shadow-rose-200">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-rose-900 text-sm">Entregas Tarde</h4>
                  <p className="text-2xl font-black text-rose-500 leading-none">{stats?.mantenimientos_finalizados_tarde}</p>
                </div>
              </div>
            )}
            <div className="bg-blue-50 border border-blue-100 p-5 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-blue-500 text-white rounded-2xl shadow-lg shadow-blue-200">
                <TrendingUp size={20} />
              </div>
              <div>
                <h4 className="font-bold text-blue-900 text-sm">Próximos Manten.</h4>
                <p className="text-2xl font-black text-blue-600 leading-none">{stats?.proximos_mantenimientos || 0}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-3xl flex items-center gap-3 px-6">
            <CheckCircle className="text-emerald-500" size={20} />
            <p className="text-emerald-700 font-bold text-sm italic">Todo está operando bajo parámetros normales.</p>
          </div>
        )}

        {/* Gráficos Principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Disponibilidad y Tipo de Equipo */}
          <div className="space-y-8">
            <CustomCard title="Disponibilidad de Activos" icon={CheckCircle} className="h-[350px]">
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={chartDataDisponibilidad}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {chartDataDisponibilidad.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CustomCard>

            <CustomCard title="Equipos por Categoría" icon={Laptop} className="h-[350px]">
              <ResponsiveContainer width="100%" height="85%">
                <PieChart>
                  <Pie
                    data={chartDataTipoEquipo}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {chartDataTipoEquipo.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CustomCard>
          </div>

          {/* Mantenimientos y Periféricos */}
          <div className="space-y-8">
            <CustomCard title="Estado de Mantenimientos" icon={Settings} className="h-[350px]">
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartDataMantenimiento}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                  <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </CustomCard>

            <CustomCard title="Tipos de Periféricos" icon={MousePointer2} className="h-[350px]">
              <ResponsiveContainer width="100%" height="85%">
                <BarChart data={chartDataPerifericos} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </CustomCard>
          </div>
        </div>

        {/* Desglose Detallado de Licencias y Mantenimientos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <CustomCard title="Estado de Licencias" icon={Shield}>
            <div className="space-y-4">
              {stats?.licencias_por_estado?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="font-semibold text-gray-700">{item.estado}</span>
                  </div>
                  <span className="font-black text-gray-900">{item.count}</span>
                </div>
              ))}
              {(!stats?.licencias_por_estado || stats.licencias_por_estado.length === 0) && (
                <p className="text-gray-400 text-center py-4 italic">No hay datos de licencias</p>
              )}
            </div>
          </CustomCard>

          <CustomCard title="Tipos de Tareas Realizadas" icon={FileText}>
            <div className="space-y-4">
              {stats?.mantenimientos_por_tipo?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="font-semibold text-gray-700">{item.tipo_mantenimiento}</span>
                  </div>
                  <span className="font-black text-gray-900">{item.count}</span>
                </div>
              ))}
              {(!stats?.mantenimientos_por_tipo || stats.mantenimientos_por_tipo.length === 0) && (
                <p className="text-gray-400 text-center py-4 italic">No hay datos de tareas</p>
              )}
            </div>
          </CustomCard>
        </div>

      </div>
    </Layout>
  );
}
