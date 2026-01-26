"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

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
    const [nombre, setNombre] = useState('');
    const [tipo, setTipo] = useState('Mouse');
    const [estadoTecnico, setEstadoTecnico] = useState('Funcional');
    const [notas, setNotas] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        const peripheralData = {
            nombre,
            tipo,
            estado_tecnico: estadoTecnico,
            notas,
            // Por defecto, un nuevo periférico estará disponible
            estado_disponibilidad: 'Disponible', 
        };

        try {
            const response = await fetch('http://127.0.0.1:8000/api/perifericos/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Aquí deberías incluir el token de autenticación si es necesario
                    // 'Authorization': `Token ${yourAuthToken}`,
                },
                body: JSON.stringify(peripheralData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Error al registrar el periférico');
            }

            // Si el registro es exitoso, redirige a la lista de periféricos
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
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Registrar Nuevo Periférico</h1>
            
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                {error && <div className="mb-4 text-red-500">{error}</div>}

                <div className="mb-4">
                    <label htmlFor="nombre" className="block text-gray-700 font-bold mb-2">Nombre</label>
                    <input
                        type="text"
                        id="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="tipo" className="block text-gray-700 font-bold mb-2">Tipo de Periférico</label>
                    <select
                        id="tipo"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        {TIPO_PERIFERICO_CHOICES.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="estadoTecnico" className="block text-gray-700 font-bold mb-2">Estado Técnico</label>
                    <select
                        id="estadoTecnico"
                        value={estadoTecnico}
                        onChange={(e) => setEstadoTecnico(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    >
                        {ESTADO_TECNICO_CHOICES.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-6">
                    <label htmlFor="notas" className="block text-gray-700 font-bold mb-2">Notas</label>
                    <textarea
                        id="notas"
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                        rows={4}
                    />
                </div>

                <div className="flex items-center justify-between">
                    <button
                        type="submit"
                        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                        disabled={submitting}
                    >
                        {submitting ? 'Registrando...' : 'Registrar'}
                    </button>
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RegistrarPerifericoPage;
