"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';

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

const RegistrarPerifericosEnLotePage = () => {
    const router = useRouter();
    const [nombreBase, setNombreBase] = useState('');
    const [cantidad, setCantidad] = useState(1);
    const [tipo, setTipo] = useState('Mouse');
    const [estadoTecnico, setEstadoTecnico] = useState('Funcional');
    const [notas, setNotas] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        if (cantidad <= 0) {
            setError("La cantidad debe ser mayor que cero.");
            setSubmitting(false);
            return;
        }

        const requests = [];
        for (let i = 1; i <= cantidad; i++) {
            const peripheralData = {
                nombre: `${nombreBase} - ${i}`,
                tipo,
                estado_tecnico: estadoTecnico,
                notas,
                estado_disponibilidad: 'Disponible',
            };
            requests.push(fetchAuthenticated('/api/perifericos/', {
                method: 'POST',
                body: JSON.stringify(peripheralData),
            }));
        }

        try {
            await Promise.all(requests);
            setSuccessMessage(`¡${cantidad} periféricos registrados exitosamente! Redirigiendo...`);
            setTimeout(() => {
                router.push('/perifericos');
            }, 2000);
        } catch (err) {
            if (err instanceof Error) {
                setError(`Error al registrar los periféricos: ${err.message}`);
            } else {
                setError('Ocurrió un error desconocido durante el registro en lote.');
            }
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold mb-6">Registrar Periféricos en Lote</h1>
                
                <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md">
                    {error && <div className="mb-4 text-red-500 bg-red-100 p-3 rounded">{error}</div>}
                    {successMessage && <div className="mb-4 text-green-700 bg-green-100 p-3 rounded">{successMessage}</div>}

                    <div className="mb-4">
                        <label htmlFor="nombreBase" className="block text-gray-700 font-bold mb-2">Nombre Base</label>
                        <input
                            type="text"
                            id="nombreBase"
                            value={nombreBase}
                            onChange={(e) => setNombreBase(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            placeholder="Ej: Mouse Dell USB"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="cantidad" className="block text-gray-700 font-bold mb-2">Cantidad</label>
                        <input
                            type="number"
                            id="cantidad"
                            value={cantidad}
                            onChange={(e) => setCantidad(Number(e.target.value))}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                            min="1"
                            required
                        />
                    </div>

                    <div className="mb-4">
                        <label htmlFor="tipo" className="block text-gray-700 font-bold mb-2">Tipo de Periférico</label>
                        <select
                            id="tipo"
                            value={tipo}
                            onChange={(e) => setTipo(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
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
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                        >
                            {ESTADO_TECNICO_CHOICES.map(option => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </select>
                    </div>

                    <div className="mb-6">
                        <label htmlFor="notas" className="block text-gray-700 font-bold mb-2">Notas (Opcional)</label>
                        <textarea
                            id="notas"
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"
                            rows={3}
                            placeholder="Notas comunes para todo el lote"
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="submit"
                            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                            disabled={submitting}
                        >
                            {submitting ? `Registrando ${cantidad} periféricos...` : 'Registrar Lote'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/perifericos')}
                            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                        >
                            Cancelar
                        </button>
                    </div>
                </form>
            </div>
        </Layout>
    );
};

export default RegistrarPerifericosEnLotePage;
