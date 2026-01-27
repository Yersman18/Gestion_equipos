"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated, ApiError } from '@/app/utils/api';
import { EmpleadoSelector } from '@/components/EmpleadoSelector';

const TIPO_PERIFERICO_CHOICES = [
    'Mouse', 'Teclado', 'Base', 'Cargador', 'Monitor', 'Otro'
];
const ESTADO_TECNICO_CHOICES = [
    'Funcional', 'Con fallas', 'Dañado'
];

interface PerifericoData {
    nombre: string;
    tipo: string;
    estado_tecnico: string;
    estado_disponibilidad: string;
    notas: string;
    empleado_asignado: number | '' | null;
}

const EditarPerifericoPage = () => {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [formData, setFormData] = useState<PerifericoData | null>(null);
    const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | ''>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchPeriferico = useCallback(async () => {
        if (!id) return;
        try {
            const data = await fetchAuthenticated(`/api/perifericos/${id}/`);
            setFormData({
                ...data,
                empleado_asignado: data.empleado_asignado || '',
            });
            setSelectedEmpleadoId(data.empleado_asignado || '');
        } catch (err) {
            if (err instanceof ApiError && err.status === 404) {
                setError('El periférico no fue encontrado. Es posible que haya sido eliminado.');
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocurrió un error desconocido al cargar el periférico');
            }
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchPeriferico();
    }, [fetchPeriferico]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleEmpleadoSelect = (empleadoId: number | '') => {
        setSelectedEmpleadoId(empleadoId);
        setFormData(prev => {
            if (!prev) return null;
            const newEstadoDisponibilidad = empleadoId ? 'Asignado' : 'Disponible';
            return { 
                ...prev, 
                empleado_asignado: empleadoId,
                estado_disponibilidad: newEstadoDisponibilidad 
            };
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData || !id) return;
        setSubmitting(true);
        setError(null);

        const dataToSubmit = {
            ...formData,
            empleado_asignado: selectedEmpleadoId || null,
        };

        try {
            await fetchAuthenticated(`/api/perifericos/${id}/`, {
                method: 'PUT',
                body: JSON.stringify(dataToSubmit),
            });
            router.push('/perifericos');
        } catch (err) {
            if (err instanceof ApiError) {
                setError(`Error al actualizar: ${err.message}`);
            } else if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Ocurrió un error desconocido al actualizar el periférico');
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <Layout><div className="text-center py-10">Cargando...</div></Layout>;
    
    if (error) return (
        <Layout>
            <div className="container mx-auto px-4 py-8 text-center">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                    <strong className="font-bold">Error: </strong>
                    <span className="block sm:inline">{error}</span>
                </div>
                <button
                    onClick={() => router.push('/perifericos')}
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Volver a la lista
                </button>
            </div>
        </Layout>
    );

    if (!formData) return (
        <Layout>
            <div className="container mx-auto px-4 py-8 text-center">
                <p>Periférico no encontrado.</p>
                <button
                    onClick={() => router.push('/perifericos')}
                    className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Volver a la lista
                </button>
            </div>
        </Layout>
    );

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Editar Periférico</h1>
                
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                    {error && (
                        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
                            {error}
                        </div>
                    )}
                    <div className="mb-4">
                        <label htmlFor="nombre" className="block text-gray-700 font-bold mb-2">Nombre</label>
                        <input
                            type="text" id="nombre" name="nombre"
                            value={formData.nombre} onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="tipo" className="block text-gray-700 font-bold mb-2">Tipo</label>
                            <select name="tipo" value={formData.tipo} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700">
                                {TIPO_PERIFERICO_CHOICES.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="estado_tecnico" className="block text-gray-700 font-bold mb-2">Estado Técnico</label>
                            <select name="estado_tecnico" value={formData.estado_tecnico} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700">
                                {ESTADO_TECNICO_CHOICES.map(op => <option key={op} value={op}>{op}</option>)}
                            </select>
                        </div>
                    </div>

                    
                    <div className="mb-4">
                        <EmpleadoSelector
                            selectedEmpleadoId={selectedEmpleadoId}
                            onSelectEmpleado={handleEmpleadoSelect}
                            onEmpleadoChange={() => {}}
                        />
                    </div>

                    <div className="mb-6">
                        <label htmlFor="notas" className="block text-gray-700 font-bold mb-2">Notas</label>
                        <textarea
                            name="notas" value={formData.notas} onChange={handleChange}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                            rows={4}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" disabled={submitting}>
                            {submitting ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                        <button type="button" onClick={() => router.back()} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default EditarPerifericoPage;
