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
                {/* Header Formal */}
                <div className="mb-10">
                    <div className="flex items-center mb-2">
                        <span className="text-4xl mr-3">📂</span>
                        <h1 className="text-4xl font-black text-gray-800 tracking-tight">Historial de Movimientos</h1>
                    </div>
                    <p className="text-gray-500 font-medium ml-1 md:ml-14">Seguimiento detallado de asignaciones, devoluciones y bajas.</p>
                </div>

                {/* Panel de Filtros Moderno y Responsive */}
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-100 mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
                        {/* Buscador */}
                        <div className="md:col-span-2 lg:col-span-4">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Búsqueda rápida</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Nombre, serial o colaborador..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 pl-10"
                                />
                                <span className="absolute left-3 top-3.5 text-lg">🔍</span>
                            </div>
                        </div>

                        {/* Estado */}
                        <div className="lg:col-span-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Estado del registro</label>
                            <select
                                value={filterEstado}
                                onChange={(e) => setFilterEstado(e.target.value)}
                                className="w-full px-5 py-3 bg-gray-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 cursor-pointer"
                            >
                                <option value="todos">Todos los eventos</option>
                                <option value="activo">En posesión (Activos)</option>
                                <option value="devuelto">Devueltos / Finalizados</option>
                                <option value="baja">Dados de baja</option>
                            </select>
                        </div>

                        {/* Rango Fechas */}
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Fecha de Asignación</label>
                            <div className="flex flex-col md:flex-row gap-2 md:items-center w-full">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold text-gray-800 text-sm"
                                />
                                <span className="hidden md:block text-gray-300 font-black">/</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-gray-50 border-2 border-transparent focus:border-blue-500 rounded-xl font-bold text-gray-800 text-sm"
                                />
                            </div>
                        </div>

                        {/* Botón Reset */}
                        <div className="flex items-end md:col-span-2 lg:col-span-2">
                            <button
                                onClick={() => {
                                    setSearchTerm('');
                                    setFilterEstado('todos');
                                    setStartDate('');
                                    setEndDate('');
                                }}
                                className="w-full py-3 bg-gray-900 hover:bg-black text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span>🔄</span> Restablecer
                            </button>
                        </div>
                    </div>
                </div>

                {/* Vista en Tarjetas (Cards) para Movimientos */}
                <div className="space-y-4">
                    {historialFiltrado.map((h) => (
                        <div key={h.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-md border border-gray-100 overflow-hidden transition-all group relative">
                            {/* Side Indicator */}
                            <div className={`absolute left-0 top-0 bottom-0 w-2 ${h.es_baja ? 'bg-red-500' : h.fecha_devolucion ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>

                            <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-center gap-6">
                                {/* Equipo Info */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center text-xl shadow-inner ${h.es_baja ? 'bg-red-50 text-red-600' : h.fecha_devolucion ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                            💻
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-800 leading-tight">{h.equipo_nombre}</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">SN: <span className="text-gray-600">{h.equipo_serial}</span></p>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4 mt-4">
                                        <div className="bg-gray-50 px-4 py-2 rounded-xl">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Responsable</p>
                                            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                {h.es_baja ? (
                                                    <span className="text-red-600 italic">Equipo fuera de servicio</span>
                                                ) : (
                                                    <><span className="text-gray-400">👤</span> {h.empleado_nombre || 'Sin datos'}</>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gray-50 px-4 py-2 rounded-xl">
                                            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Fecha Asignación</p>
                                            <p className="text-sm font-bold text-gray-700">📅 {new Date(h.fecha_asignacion).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Status & Cierre */}
                                <div className="flex flex-col md:items-end gap-3 min-w-[200px]">
                                    {h.es_baja ? (
                                        <span className="px-4 py-1.5 text-xs font-black uppercase rounded-full bg-red-100 text-red-700 border border-red-200">De Baja</span>
                                    ) : h.fecha_devolucion ? (
                                        <span className="px-4 py-1.5 text-xs font-black uppercase rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Finalizado</span>
                                    ) : (
                                        <span className="px-4 py-1.5 text-xs font-black uppercase rounded-full bg-blue-100 text-blue-700 border border-blue-200 shadow-sm animate-pulse-subtle">Activo / En Uso</span>
                                    )}

                                    <div className="text-right">
                                        {h.es_baja ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-red-700">Retirado el {h.fecha_baja ? new Date(h.fecha_baja).toLocaleDateString() : 'N/A'}</span>
                                                {h.observacion_devolucion && <span className="text-[11px] italic text-gray-400 mt-1 max-w-[200px]">"{h.observacion_devolucion}"</span>}
                                            </div>
                                        ) : h.fecha_devolucion ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm font-black text-emerald-700">Cierre el {new Date(h.fecha_devolucion).toLocaleDateString()}</span>
                                                {h.observacion_devolucion && <span className="text-[11px] italic text-gray-400 mt-1 max-w-[200px]">"{h.observacion_devolucion}"</span>}
                                            </div>
                                        ) : (
                                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1 justify-end">
                                                <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                                                Actualmente asignado
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {historialFiltrado.length === 0 && (
                        <div className="bg-white rounded-[2rem] p-20 text-center border-2 border-dashed border-gray-100">
                            <div className="text-6xl mb-4">🏜️</div>
                            <h3 className="text-xl font-bold text-gray-800">No se encontraron movimientos</h3>
                            <p className="text-gray-500">Intenta ajustar los filtros de búsqueda o el rango de fechas.</p>
                        </div>
                    )}
                </div>
            </div>

            <style jsx global>{`
                @keyframes pulse-subtle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.8; transform: scale(0.98); }
                }
                .animate-pulse-subtle {
                    animation: pulse-subtle 3s ease-in-out infinite;
                }
            `}</style>
        </Layout>
    );
};

export default HistorialEquiposPage;
