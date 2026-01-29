"use client";
import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';

const TIPO_PERIFERICO_CHOICES = [
    { value: 'Mouse', label: 'Mouse' },
    { value: 'Teclado', label: 'Teclado' },
    { value: 'Base', label: 'Base' },
    { value: 'Cargador', label: 'Cargador' },
    { value: 'Monitor', label: 'Monitor' },
    { value: 'Otro', label: 'Otro' },
];

const ESTADO_TECNICO_CHOICES = [
    { value: 'Funcional', label: 'Funcional' },
    { value: 'Con fallas', label: 'Con fallas' },
    { value: 'Dañado', label: 'Dañado' },
];

const RegistrarPerifericoPage = () => {
    const router = useRouter();
    const { user } = useAuth();
    const { sedeActiva, sedesPermitidas } = useSede();
    const [tipo, setTipo] = useState('Mouse');
    const [estadoTecnico, setEstadoTecnico] = useState('Funcional');
    const [sedeId, setSedeId] = useState<number | ''>('');
    const [notas, setNotas] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const isAdmin = useMemo(() => {
        return user?.is_superuser || user?.rol === 'ADMIN';
    }, [user]);

    useEffect(() => {
        if (sedeActiva && sedeActiva.id !== 0) {
            setSedeId(sedeActiva.id);
        } else if (sedesPermitidas.length > 0) {
            const primeraReal = sedesPermitidas.find(s => s.id !== 0);
            if (primeraReal) setSedeId(primeraReal.id);
        }
    }, [sedeActiva, sedesPermitidas]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const peripheralData: any = {
            nombre: tipo,
            tipo,
            estado_tecnico: estadoTecnico,
            notas,
            estado_disponibilidad: 'Disponible',
            sede: sedeId || null,
        };

        try {
            await fetchAuthenticated('/api/perifericos/', {
                method: 'POST',
                body: JSON.stringify(peripheralData),
            });
            router.push('/perifericos');
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocurrió un error desconocido');
            }
        } finally {
            setSubmitting(false);
        }
    };


    return (
        <Layout>
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Header Formal */}
                <div className="mb-10">
                    <div className="flex items-center mb-2">
                        <span className="text-4xl mr-4">🖱️</span>
                        <h1 className="text-3xl font-black text-gray-800 tracking-tight">
                            Registrar Nuevo Periférico
                        </h1>
                    </div>
                    <p className="text-gray-500 font-medium ml-14">
                        Completa los detalles para añadir un nuevo elemento al inventario de periféricos.
                    </p>
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden relative">
                    {/* Barra lateral de acento */}
                    <div className="absolute top-0 left-0 w-2 h-full bg-blue-600"></div>

                    <div className="p-8 md:p-10">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {error && (
                                <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-xl p-4 mb-6 shadow-sm flex items-center">
                                    <span className="text-2xl mr-3">⚠️</span>
                                    <p className="text-red-700 font-semibold">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Tipo */}
                                <div>
                                    <label htmlFor="tipo" className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
                                        Tipo de Periférico
                                    </label>
                                    <select
                                        id="tipo"
                                        value={tipo}
                                        onChange={(e) => setTipo(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer font-semibold text-gray-800"
                                    >
                                        {TIPO_PERIFERICO_CHOICES.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Estado Técnico */}
                                <div>
                                    <label htmlFor="estadoTecnico" className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
                                        Estado Técnico Inicial
                                    </label>
                                    <select
                                        id="estadoTecnico"
                                        value={estadoTecnico}
                                        onChange={(e) => setEstadoTecnico(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer font-semibold text-gray-800"
                                    >
                                        {ESTADO_TECNICO_CHOICES.map(option => (
                                            <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sede (Solo Admin) */}
                                {isAdmin && (
                                    <div className="md:col-span-2">
                                        <label htmlFor="sede" className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
                                            Sede de Asignación <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            id="sede"
                                            value={sedeId}
                                            onChange={(e) => setSedeId(Number(e.target.value))}
                                            required
                                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all cursor-pointer font-semibold text-gray-800"
                                        >
                                            <option value="" disabled>Seleccione una sede</option>
                                            {sedesPermitidas.filter(s => s.id !== 0).map((s) => (
                                                <option key={s.id} value={s.id}>{s.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {/* Notas */}
                                <div className="md:col-span-2">
                                    <label htmlFor="notas" className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1 tracking-wider">
                                        Notas Adicionales
                                    </label>
                                    <textarea
                                        id="notas"
                                        value={notas}
                                        onChange={(e) => setNotas(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all text-gray-800"
                                        rows={4}
                                        placeholder="Características especiales, serial, o información relevante..."
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-end gap-4 pt-6 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="w-full sm:w-auto px-8 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
                                >
                                    <span>❌</span> Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="w-full sm:w-auto px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                            <span>Registrando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>💾</span> Registrar Periférico
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </Layout>
    );
};

export default RegistrarPerifericoPage;

