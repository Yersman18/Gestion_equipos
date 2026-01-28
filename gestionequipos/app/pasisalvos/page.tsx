'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Pasisalvo {
    id: number;
    colaborador_info: {
        nombre_completo: string;
        cedula: string;
    };
    fecha_generacion: string;
    estado: string;
    generado_por_username: string;
    pdf_url: string | null;
}

const PasisalvosPage = () => {
    const [pasisalvos, setPasisalvos] = useState<Pasisalvo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchPasisalvos = async () => {
            try {
                const data = await fetchAuthenticated('/api/pasisalvos/');
                // Nota: Asumiendo que el serializador devuelve colaborador_info. Si no, ajustaremos.
                setPasisalvos(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchPasisalvos();
    }, []);

    const filteredPasisalvos = pasisalvos.filter(p =>
        p.colaborador_info?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.colaborador_info?.cedula?.includes(searchTerm)
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center mb-2">
                            <span className="text-4xl mr-3">📄</span>
                            <h1 className="text-4xl font-black text-gray-800 tracking-tight">Paces y Salvos de TI</h1>
                        </div>
                        <p className="text-gray-500 font-medium ml-14">Gestión de certificaciones de entrega de equipos tecnológicos.</p>
                    </div>
                    <Link
                        href="/pasisalvos/generar"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-2xl hover:-translate-y-1 flex items-center justify-center gap-2"
                    >
                        <span>✨</span>
                        <span>Generar Nuevo Paz y Salvo</span>
                    </Link>
                </div>

                <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-200 mb-8">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por colaborador o cédula..."
                            className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pl-12"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-4 top-4.5 text-2xl">🔍</span>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Colaborador</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fecha Generación</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Generado por</th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredPasisalvos.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-gray-900">{p.colaborador_info?.nombre_completo || 'N/A'}</div>
                                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">CC: {p.colaborador_info?.cedula || 'N/A'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 font-mono">
                                                {format(new Date(p.fecha_generacion), "dd 'de' MMMM, yyyy", { locale: es })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${p.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                                                    p.estado === 'Con Pendientes' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                                        'bg-red-100 text-red-700 border-red-200'
                                                }`}>
                                                {p.estado}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-medium">
                                            @{p.generado_por_username}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button className="text-blue-600 hover:text-blue-800 font-bold text-sm bg-blue-50 px-4 py-2 rounded-lg transition-all">
                                                👁️ Ver Detalles
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredPasisalvos.length === 0 && !loading && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-10 text-center text-gray-500 italic">
                                            No se encontraron registros de paz y salvo.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default PasisalvosPage;
