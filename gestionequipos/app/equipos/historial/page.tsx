'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';

interface HistorialMovimientoEquipo {
    id: number;
    equipo_nombre: string;
    equipo_serial: string;
    empleado_nombre: string;
    fecha_asignacion: string;
    fecha_devolucion: string | null;
    observacion_devolucion: string | null;
    es_baja: boolean;
    fecha_baja: string | null;
}

const HistorialEquiposPage = () => {
    const [historial, setHistorial] = useState<HistorialMovimientoEquipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('todos');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const data = await fetchAuthenticated('/api/equipos/historial/');
                setHistorial(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchHistorial();
    }, []);

    // Lógica de filtrado
    const historialFiltrado = historial.filter(h => {
        const search = searchTerm.toLowerCase();
        const matchSearch = (h.equipo_nombre?.toLowerCase() || '').includes(search) ||
            (h.equipo_serial?.toLowerCase() || '').includes(search) ||
            (h.empleado_nombre?.toLowerCase() || '').includes(search);

        // Filtrado por estado (Baja o No Baja)
        let matchEstado = true;
        if (filterEstado === 'baja') matchEstado = h.es_baja;
        if (filterEstado === 'activo') matchEstado = !h.es_baja && !h.fecha_devolucion;
        if (filterEstado === 'devuelto') matchEstado = !h.es_baja && !!h.fecha_devolucion;

        // Filtrado por fechas
        let matchDate = true;
        if (startDate || endDate) {
            const fechaAsig = new Date(h.fecha_asignacion);
            fechaAsig.setHours(0, 0, 0, 0);

            if (startDate) {
                const start = new Date(startDate);
                start.setHours(0, 0, 0, 0);
                if (fechaAsig < start) matchDate = false;
            }
            if (endDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (fechaAsig > end) matchDate = false;
            }
        }

        return matchSearch && matchEstado && matchDate;
    });

    if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div></Layout>;

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">Historial de Movimientos de Equipos</h1>
                    <p className="text-gray-500">Consulta asignaciones, devoluciones y bajas históricas de los equipos.</p>
                </div>

                {/* Panel de Filtros */}
                <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Buscador */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Búsqueda</label>
                            <input
                                type="text"
                                placeholder="Nombre, serial o colaborador..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
                            />
                        </div>

                        {/* Estado */}
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Estado</label>
                            <select
                                value={filterEstado}
                                onChange={(e) => setFilterEstado(e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm cursor-pointer"
                            >
                                <option value="todos">Todos los estados</option>
                                <option value="activo">En posesión</option>
                                <option value="devuelto">Devuelto / Reasignado</option>
                                <option value="baja">Dado de baja</option>
                            </select>
                        </div>

                        {/* Rango Fechas */}
                        <div className="lg:col-span-2">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Rango de Fecha de Asignación</label>
                            <div className="flex gap-2 items-center">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                />
                                <span className="text-gray-400">al</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                                />
                            </div>
                        </div>

                        {/* Botón Reset */}
                        <div className="flex items-end">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterEstado('todos');
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-lg transition-all text-sm"
                            >
                                🔄 Limpiar Filtros
                            </button>
                        </div>
                    </div>

                    <div className="mt-4 text-[11px] text-gray-400 font-medium">
                        Mostrando {historialFiltrado.length} de {historial.length} registros totales.
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Equipo</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Colaborador / Evento</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">F. Asignación</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Cierre</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {historialFiltrado.map((h) => (
                                    <tr key={h.id} className="hover:bg-gray-50 transition-colors relative">
                                        <td className="px-6 py-4 relative">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${h.es_baja ? 'bg-red-500' :
                                                h.fecha_devolucion ? 'bg-emerald-500' : 'bg-blue-500'
                                                }`}></div>
                                            <div className="text-sm font-bold text-gray-900 leading-tight pl-2">{h.equipo_nombre}</div>
                                            <div className="text-[10px] text-gray-400 font-black uppercase pl-2 tracking-wider">SN: {h.equipo_serial}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {h.es_baja ? (
                                                <span className="text-[10px] font-black text-red-600 uppercase bg-red-50 px-2 py-1 rounded border border-red-100 italic">Retirado del Inventario</span>
                                            ) : (
                                                <div className="text-sm text-gray-700 font-semibold flex items-center gap-2">
                                                    <span className="text-gray-400">👤</span> {h.empleado_nombre || 'Sin asignar'}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 font-mono bg-gray-50 px-2 py-1 rounded inline-block">
                                                📅 {new Date(h.fecha_asignacion).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {h.es_baja ? (
                                                <span className="px-2 py-1 text-[10px] font-black uppercase rounded bg-red-100 text-red-700 border border-red-200">De Baja</span>
                                            ) : h.fecha_devolucion ? (
                                                <span className="px-2 py-1 text-[10px] font-black uppercase rounded bg-emerald-100 text-emerald-700 border border-emerald-200">Devuelto</span>
                                            ) : (
                                                <span className="px-2 py-1 text-[10px] font-black uppercase rounded bg-blue-100 text-blue-700 border border-blue-200 shadow-sm animate-pulse-subtle">Asignado</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-xs">
                                            {h.es_baja ? (
                                                <div className="flex flex-col">
                                                    <span className="text-red-700 font-black">RETIRO: {h.fecha_baja ? new Date(h.fecha_baja).toLocaleDateString() : 'N/A'}</span>
                                                    <span className="text-[10px] italic text-gray-400 mt-1">"{h.observacion_devolucion}"</span>
                                                </div>
                                            ) : h.fecha_devolucion ? (
                                                <div className="flex flex-col">
                                                    <span className="text-emerald-700 font-black tracking-tight">CIERRE: {new Date(h.fecha_devolucion).toLocaleDateString()}</span>
                                                    {h.observacion_devolucion && <span className="text-[10px] italic text-gray-400 mt-1">"{h.observacion_devolucion}"</span>}
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-blue-600 font-black uppercase text-[10px] tracking-tight">
                                                    <span className="relative flex h-2 w-2">
                                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                                                    </span>
                                                    Activo en uso
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {historialFiltrado.length === 0 && (
                            <div className="text-center py-20 text-gray-500 bg-white">
                                <div className="text-5xl mb-4 text-gray-200">🗃️</div>
                                <p className="text-lg font-bold">No se encontraron movimientos</p>
                                <p className="text-sm">Ajusta los filtros de búsqueda.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @keyframes pulse-subtle {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
        .animate-pulse-subtle {
          animation: pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
        </Layout>
    );
};

export default HistorialEquiposPage;
