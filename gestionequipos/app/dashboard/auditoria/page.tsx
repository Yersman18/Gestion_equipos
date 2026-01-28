'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';

interface AuditoriaEntry {
    id: string | number;
    tipo: 'EQUIPO' | 'PERIFERICO' | 'MANTENIMIENTO';
    accion: string;
    entidad: string;
    detalle: string;
    colaborador?: string;
    usuario?: string;
    fecha: string;
    color: string;
    icon: string;
}

const AuditoriaDashboard = () => {
    const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    const [entries, setEntries] = useState<AuditoriaEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterTipo, setFilterTipo] = useState('todos');

    useEffect(() => {
        if (isAuthLoading) return;
        if (!isAuthenticated || !(user?.is_superuser || user?.rol === 'ADMIN')) {
            router.push('/dashboard');
            return;
        }

        const fetchAllHistory = async () => {
            setLoading(true);
            try {
                // Fetching all histories in parallel
                const [equiposHist, perifericosHist, mantenimientos] = await Promise.all([
                    fetchAuthenticated('/api/equipos/historial/').catch(() => []),
                    fetchAuthenticated('/api/perifericos/historial/').catch(() => []),
                    fetchAuthenticated('/api/mantenimientos/').catch(() => ({ results: [] }))
                ]);

                const unified: AuditoriaEntry[] = [];

                // 1. Process Equipment Movements (Assignments/Returns/Bajas)
                (equiposHist || []).forEach((h: any) => {
                    const usuarioAction = h.es_baja ? 'dio de baja el equipo' : (h.fecha_devolucion ? 'recibió la devolución de' : 'asignó el equipo');
                    unified.push({
                        id: `E-${h.id}`,
                        tipo: 'EQUIPO',
                        accion: h.es_baja ? 'Baja de Equipo' : (h.fecha_devolucion ? 'Devolución' : 'Asignación'),
                        entidad: h.equipo_nombre,
                        detalle: h.es_baja
                            ? `Sistema registró que el equipo ${h.equipo_nombre} fue retirado.`
                            : `${h.empleado_nombre} ${h.fecha_devolucion ? 'devolvió' : 'recibió'} el equipo ${h.equipo_nombre}.`,
                        colaborador: h.empleado_nombre,
                        fecha: h.fecha_baja || h.fecha_devolucion || h.fecha_asignacion,
                        color: h.es_baja ? 'red' : (h.fecha_devolucion ? 'emerald' : 'blue'),
                        icon: '💻'
                    });
                });

                // 2. Process Peripheral Movements
                (perifericosHist || []).forEach((h: any) => {
                    unified.push({
                        id: `P-${h.id}`,
                        tipo: 'PERIFERICO',
                        accion: h.es_baja ? 'Baja de Periférico' : (h.fecha_devolucion ? 'Devolución' : 'Asignación'),
                        entidad: h.periferico_nombre,
                        detalle: h.es_baja
                            ? `Se retiró el periférico ${h.periferico_nombre} del sistema.`
                            : `${h.empleado_nombre} ${h.fecha_devolucion ? 'entregó' : 'recibió'} el periférico ${h.periferico_nombre} (${h.periferico_tipo}).`,
                        colaborador: h.empleado_nombre,
                        fecha: h.fecha_baja || h.fecha_devolucion || h.fecha_asignacion,
                        color: h.es_baja ? 'red' : (h.fecha_devolucion ? 'emerald' : 'indigo'),
                        icon: '🖱️'
                    });
                });

                // 3. Process Maintenances
                const maintData = mantenimientos.results || mantenimientos || [];
                maintData.forEach((m: any) => {
                    unified.push({
                        id: `M-${m.id}`,
                        tipo: 'MANTENIMIENTO',
                        accion: `Mantenimiento ${m.tipo_mantenimiento}`,
                        entidad: m.equipo_asociado_nombre,
                        detalle: `${m.usuario_responsable_username || 'Un técnico'} cambió el estado a ${m.estado_mantenimiento} para ${m.equipo_asociado_nombre}.`,
                        usuario: m.usuario_responsable_username,
                        fecha: m.fecha_inicio,
                        color: 'purple',
                        icon: '🔧'
                    });
                });

                // Sort by date descending
                unified.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
                setEntries(unified);

            } catch (err) {
                console.error("Error cargando auditoría:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllHistory();
    }, [isAuthenticated, isAuthLoading, user, router]);

    const filteredEntries = entries.filter(e => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
            (e.entidad || '').toLowerCase().includes(search) ||
            (e.detalle || '').toLowerCase().includes(search) ||
            (e.colaborador || '').toLowerCase().includes(search) ||
            (e.usuario || '').toLowerCase().includes(search);

        const matchesTipo = filterTipo === 'todos' || e.tipo === filterTipo;

        return matchesSearch && matchesTipo;
    });

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-10">
                    <div className="flex items-center mb-2">
                        <span className="text-4xl mr-3">🕵️</span>
                        <h1 className="text-4xl font-black text-gray-800 tracking-tight">Dashboard de Auditoría</h1>
                    </div>
                    <p className="text-gray-500 font-medium ml-14">Vista global de todos los movimientos, cambios y mantenimientos realizados en el sistema.</p>
                </div>

                {/* Filtros */}
                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mb-8 flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Buscar por Entidad, Usuario o Detalle</label>
                        <input
                            type="text"
                            placeholder="Ej: Laptop Dell, Juan Perez, Mantenimiento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800"
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Filtrar por Tipo</label>
                        <select
                            value={filterTipo}
                            onChange={(e) => setFilterTipo(e.target.value)}
                            className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 cursor-pointer"
                        >
                            <option value="todos">Todos los eventos</option>
                            <option value="EQUIPO">💻 Equipos</option>
                            <option value="PERIFERICO">🖱️ Periféricos</option>
                            <option value="MANTENIMIENTO">🔧 Mantenimientos</option>
                        </select>
                    </div>
                </div>

                {/* Timeline / Feed */}
                {loading ? (
                    <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div></div>
                ) : (
                    <div className="space-y-4">
                        {filteredEntries.map((entry) => (
                            <div key={entry.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-md border border-gray-100 p-6 transition-all group overflow-hidden relative">
                                <div className={`absolute left-0 top-0 bottom-0 w-2 bg-${entry.color}-500`}></div>
                                <div className="flex flex-col md:flex-row md:items-center gap-6">
                                    {/* Categoría e Icono */}
                                    <div className="flex items-center gap-4 min-w-[200px]">
                                        <div className={`h-14 w-14 rounded-2xl flex items-center justify-center text-2xl shadow-inner bg-${entry.color}-50 text-${entry.color}-600`}>
                                            {entry.icon}
                                        </div>
                                        <div>
                                            <span className={`text-[10px] font-black uppercase tracking-widest text-${entry.color}-600`}>{entry.tipo}</span>
                                            <h3 className="text-gray-800 font-black leading-tight">{entry.accion}</h3>
                                        </div>
                                    </div>

                                    {/* Información Principal */}
                                    <div className="flex-1">
                                        <p className="text-gray-500 text-xs font-bold uppercase tracking-tighter mb-1">Entidad: <span className="text-gray-800">{entry.entidad}</span></p>
                                        <p className="text-gray-700 font-medium">{entry.detalle}</p>
                                    </div>

                                    {/* Quién y Cuándo */}
                                    <div className="flex flex-col md:items-end min-w-[180px]">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-gray-400">👤</span>
                                            <span className="text-sm font-bold text-gray-700">
                                                {entry.usuario || entry.colaborador || 'Sistema'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400">📅</span>
                                            <span className="text-xs font-mono text-gray-500">
                                                {new Date(entry.fecha).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Acción Directa */}
                                    <div className="md:ml-4">
                                        <button
                                            onClick={() => {
                                                if (entry.tipo === 'EQUIPO') router.push(`/equipos`);
                                                if (entry.tipo === 'PERIFERICO') router.push(`/perifericos`);
                                                if (entry.tipo === 'MANTENIMIENTO') router.push(`/mantenimientos/historial`);
                                            }}
                                            className="h-10 w-10 flex items-center justify-center rounded-xl bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-800 transition-all"
                                        >
                                            👁️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {filteredEntries.length === 0 && (
                            <div className="bg-white rounded-3xl p-20 text-center border-2 border-dashed border-gray-100">
                                <div className="text-6xl mb-4">🏜️</div>
                                <h3 className="text-xl font-bold text-gray-800">No se encontraron registros</h3>
                                <p className="text-gray-500">Intenta cambiar los términos de búsqueda o filtros.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx global>{`
                .bg-blue-500 { background-color: #3b82f6; }
                .text-blue-600 { color: #2563eb; }
                .bg-blue-50 { background-color: #eff6ff; }
                
                .bg-emerald-500 { background-color: #10b981; }
                .text-emerald-600 { color: #059669; }
                .bg-emerald-50 { background-color: #ecfdf5; }
                
                .bg-red-500 { background-color: #ef4444; }
                .text-red-600 { color: #dc2626; }
                .bg-red-50 { background-color: #fef2f2; }
                
                .bg-indigo-500 { background-color: #6366f1; }
                .text-indigo-600 { color: #4f46e5; }
                .bg-indigo-50 { background-color: #eef2ff; }
                
                .bg-purple-500 { background-color: #a855f7; }
                .text-purple-600 { color: #9333ea; }
                .bg-purple-50 { background-color: #f5f3ff; }
            `}</style>
        </Layout>
    );
};

export default AuditoriaDashboard;
