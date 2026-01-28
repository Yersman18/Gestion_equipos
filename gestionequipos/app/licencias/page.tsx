'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { useSede } from '@/app/context/SedeContext';
import { useAuth } from '@/app/context/AuthContext';

interface Equipo {
    id: number;
    nombre: string;
    serial: string;
}

interface Licencia {
    id: number;
    equipo_asociado: number;
    equipo_asociado_info?: {
        nombre: string;
        serial: string;
    };
    tipo_licencia: string;
    tipo_activacion: string;
    clave: string;
    fecha_instalacion: string;
    fecha_vencimiento: string | null;
    estado: string;
    notas: string;
}

const LicenciasPage = () => {
    const { sedeActiva } = useSede();
    const { user } = useAuth();
    const [licencias, setLicencias] = useState<Licencia[]>([]);
    const [equipos, setEquipos] = useState<Equipo[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLicencia, setEditingLicencia] = useState<Licencia | null>(null);
    const [form, setForm] = useState({
        equipo_asociado: '',
        tipo_licencia: 'Sistema Operativo',
        tipo_activacion: 'Original',
        clave: '',
        fecha_instalacion: new Date().toISOString().split('T')[0],
        fecha_vencimiento: '',
        estado: 'Activa',
        notas: ''
    });

    useEffect(() => {
        fetchLicencias();
        fetchEquipos();
    }, [sedeActiva]);

    const fetchLicencias = async () => {
        setLoading(true);
        try {
            const url = sedeActiva ? `/api/licencias/?sede_id=${sedeActiva.id}` : '/api/licencias/';
            const data = await fetchAuthenticated(url);
            setLicencias(data);
        } catch (err) {
            console.error("Error al cargar licencias:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchEquipos = async () => {
        try {
            const url = sedeActiva ? `/api/equipos/?sede_id=${sedeActiva.id}` : '/api/equipos/';
            const data = await fetchAuthenticated(url);
            // Si el backend devuelve paginado, data.results
            const equiposList = data.results || data;
            setEquipos(equiposList);
        } catch (err) {
            console.error("Error al cargar equipos:", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingLicencia ? 'PUT' : 'POST';
            const url = editingLicencia ? `/api/licencias/${editingLicencia.id}/` : '/api/licencias/';

            const payload = {
                ...form,
                equipo_asociado: parseInt(form.equipo_asociado),
                fecha_vencimiento: form.fecha_vencimiento || null
            };

            await fetchAuthenticated(url, {
                method,
                body: JSON.stringify(payload),
            });

            setIsModalOpen(false);
            setEditingLicencia(null);
            fetchLicencias();
            alert(`Licencia ${editingLicencia ? 'actualizada' : 'registrada'} con éxito`);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleEdit = (lic: Licencia) => {
        setEditingLicencia(lic);
        setForm({
            equipo_asociado: lic.equipo_asociado.toString(),
            tipo_licencia: lic.tipo_licencia,
            tipo_activacion: lic.tipo_activacion,
            clave: lic.clave || '',
            fecha_instalacion: lic.fecha_instalacion,
            fecha_vencimiento: lic.fecha_vencimiento || '',
            estado: lic.estado,
            notas: lic.notas || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar esta licencia?')) {
            try {
                await fetchAuthenticated(`/api/licencias/${id}/`, { method: 'DELETE' });
                fetchLicencias();
            } catch (err: any) {
                alert(`Error al eliminar: ${err.message}`);
            }
        }
    };

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                    <div>
                        <div className="flex items-center mb-2">
                            <span className="text-4xl mr-3">🔑</span>
                            <h1 className="text-4xl font-black text-gray-800 tracking-tight">Gestión de Licencias</h1>
                        </div>
                        <p className="text-gray-500 font-medium ml-14">Control de software y activaciones por equipo.</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingLicencia(null);
                            setForm({
                                equipo_asociado: '',
                                tipo_licencia: 'Sistema Operativo',
                                tipo_activacion: 'Original',
                                clave: '',
                                fecha_instalacion: new Date().toISOString().split('T')[0],
                                fecha_vencimiento: '',
                                estado: 'Activa',
                                notas: ''
                            });
                            setIsModalOpen(true);
                        }}
                        className="bg-gray-900 hover:bg-black text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg flex items-center gap-2"
                    >
                        <span>+</span> Registrar Licencia
                    </button>
                </div>

                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Equipo</th>
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Software</th>
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Activación</th>
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Clave</th>
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Instalación</th>
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Vencimiento</th>
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Estado</th>
                                    <th className="p-6 text-xs font-bold text-gray-400 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-10 text-center text-gray-400">Cargando licencias...</td></tr>
                                ) : licencias.map(lic => {
                                    const isExpired = lic.fecha_vencimiento && new Date(lic.fecha_vencimiento) < new Date();
                                    return (
                                        <tr key={lic.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="p-6">
                                                <p className="font-bold text-gray-800">{lic.equipo_asociado_info?.nombre}</p>
                                                <p className="text-[10px] text-gray-400 font-mono">{lic.equipo_asociado_info?.serial}</p>
                                            </td>
                                            <td className="p-6 text-sm font-semibold text-gray-700">{lic.tipo_licencia}</td>
                                            <td className="p-6 text-sm text-gray-500">{lic.tipo_activacion}</td>
                                            <td className="p-6">
                                                <code className="bg-gray-100 px-2 py-1 rounded text-[10px] text-gray-600 truncate max-w-[100px] block">
                                                    {lic.clave || 'S/N'}
                                                </code>
                                            </td>
                                            <td className="p-6 text-sm text-gray-500">{lic.fecha_instalacion}</td>
                                            <td className="p-6">
                                                {lic.fecha_vencimiento ? (
                                                    <span className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-gray-500'}`}>
                                                        {lic.fecha_vencimiento}
                                                    </span>
                                                ) : <span className="text-gray-300 text-xs italic">N/A</span>}
                                            </td>
                                            <td className="p-6">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${lic.estado === 'Activa' ? 'bg-emerald-100 text-emerald-700' :
                                                        lic.estado === 'Vencida' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {lic.estado}
                                                </span>
                                            </td>
                                            <td className="p-6">
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleEdit(lic)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">✏️</button>
                                                    <button onClick={() => handleDelete(lic.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {!loading && licencias.length === 0 && (
                                    <tr><td colSpan={8} className="p-20 text-center text-gray-400 italic font-medium">No hay licencias registradas en esta sede.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* MODAL LICENCIA */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 bg-gray-900 border-b border-gray-800 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                <span>{editingLicencia ? '✏️' : '✨'}</span>
                                {editingLicencia ? 'Editar Licencia' : 'Registrar Nueva Licencia'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Equipo Asociado</label>
                                <select
                                    required
                                    value={form.equipo_asociado}
                                    onChange={e => setForm({ ...form, equipo_asociado: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-semibold"
                                >
                                    <option value="">Seleccione un equipo...</option>
                                    {equipos.map(eq => (
                                        <option key={eq.id} value={eq.id}>{eq.nombre} - {eq.serial}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tipo de Software</label>
                                <select
                                    value={form.tipo_licencia}
                                    onChange={e => setForm({ ...form, tipo_licencia: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="Sistema Operativo">Sistema Operativo</option>
                                    <option value="Office">Office</option>
                                    <option value="Antivirus">Antivirus</option>
                                    <option value="Adobe">Adobe</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Tipo de Activación</label>
                                <select
                                    value={form.tipo_activacion}
                                    onChange={e => setForm({ ...form, tipo_activacion: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="Original">Original</option>
                                    <option value="Pirateada">Pirateada</option>
                                    <option value="OEM">OEM</option>
                                    <option value="Volumen">Volumen</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Clave de Producto (Key)</label>
                                <input
                                    type="text"
                                    value={form.clave}
                                    onChange={e => setForm({ ...form, clave: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                    placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Fecha Instalación</label>
                                <input
                                    type="date"
                                    required
                                    value={form.fecha_instalacion}
                                    onChange={e => setForm({ ...form, fecha_instalacion: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Fecha Vencimiento</label>
                                <input
                                    type="date"
                                    value={form.fecha_vencimiento}
                                    onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Notas</label>
                                <textarea
                                    value={form.notas}
                                    onChange={e => setForm({ ...form, notas: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                                    rows={2}
                                />
                            </div>

                            <div className="md:col-span-2 pt-4 flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg active:scale-95"
                                >
                                    Guardar Licencia
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default LicenciasPage;
