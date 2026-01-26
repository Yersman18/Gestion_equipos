"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';

const TIPO_PERIFERICO_CHOICES = [
    'Mouse', 'Teclado', 'Base', 'Cargador', 'Monitor', 'Otro'
];
const ESTADO_TECNICO_CHOICES = [
    'Funcional', 'Con fallas', 'Dañado'
];
const ESTADO_DISPONIBILIDAD_CHOICES = [
    'Disponible', 'Asignado', 'Devuelto'
];

interface Empleado {
    id: number;
    nombre: string;
    apellido: string;
}

interface Periferico {
    nombre: string;
    tipo: string;
    estado_tecnico: string;
    estado_disponibilidad: string;
    empleado_asignado: number | null;
    notas: string;
}

const EditarPerifericoPage = () => {
    const router = useRouter();
    const params = useParams();
    const { id } = params;

    const [periferico, setPeriferico] = useState<Periferico | null>(null);
    const [empleados, setEmpleados] = useState<Empleado[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchPeriferico = useCallback(async () => {
        if (!id) return;
        try {
            const response = await fetch(`http://127.0.0.1:8000/api/perifericos/${id}/`);
            if (!response.ok) throw new Error('Error al obtener el periférico');
            const data = await response.json();
            setPeriferico(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        }
    }, [id]);

    const fetchEmpleados = async () => {
        try {
            const response = await fetch('http://127.0.0.1:8000/api/empleados/');
            if (!response.ok) throw new Error('Error al obtener los empleados');
            const data = await response.json();
            setEmpleados(data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        Promise.all([fetchPeriferico(), fetchEmpleados()]).finally(() => setLoading(false));
    }, [fetchPeriferico]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setPeriferico(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!periferico || !id) return;
        setSubmitting(true);
        setError(null);

        try {
            const response = await fetch(`http://127.0.0.1:8000/api/perifericos/${id}/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Token ${yourAuthToken}`,
                },
                body: JSON.stringify({
                    ...periferico,
                    empleado_asignado: periferico.empleado_asignado || null,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(JSON.stringify(errorData));
            }

            router.push('/perifericos');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error al actualizar');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div>Cargando...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!periferico) return <div>Periférico no encontrado.</div>;

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Editar Periférico</h1>
            
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <label htmlFor="nombre" className="block text-gray-700 font-bold mb-2">Nombre</label>
                    <input
                        type="text" id="nombre" name="nombre"
                        value={periferico.nombre} onChange={handleChange}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" required
                    />
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="tipo" className="block text-gray-700 font-bold mb-2">Tipo</label>
                        <select name="tipo" value={periferico.tipo} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700">
                            {TIPO_PERIFERICO_CHOICES.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="estado_tecnico" className="block text-gray-700 font-bold mb-2">Estado Técnico</label>
                        <select name="estado_tecnico" value={periferico.estado_tecnico} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700">
                            {ESTADO_TECNICO_CHOICES.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="estado_disponibilidad" className="block text-gray-700 font-bold mb-2">Disponibilidad</label>
                        <select name="estado_disponibilidad" value={periferico.estado_disponibilidad} onChange={handleChange} className="shadow border rounded w-full py-2 px-3 text-gray-700">
                            {ESTADO_DISPONIBILIDAD_CHOICES.map(op => <option key={op} value={op}>{op}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="empleado_asignado" className="block text-gray-700 font-bold mb-2">Asignar a Empleado</label>
                        <select 
                            name="empleado_asignado" 
                            value={periferico.empleado_asignado || ''} 
                            onChange={handleChange} 
                            className="shadow border rounded w-full py-2 px-3 text-gray-700"
                        >
                            <option value="">No asignado</option>
                            {empleados.map(emp => (
                                <option key={emp.id} value={emp.id}>{emp.nombre} {emp.apellido}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="mb-6">
                    <label htmlFor="notas" className="block text-gray-700 font-bold mb-2">Notas</label>
                    <textarea
                        name="notas" value={periferico.notas} onChange={handleChange}
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
    );
};

export default EditarPerifericoPage;
