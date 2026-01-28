'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';

interface Sede {
    id: number;
    nombre: string;
    direccion: string | null;
    ciudad: string | null;
    pais: string;
}

const ConfiguracionPage = () => {
    const { user } = useAuth();
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loadingSedes, setLoadingSedes] = useState(true);

    // Estados para Modal de Sede
    const [isSedeModalOpen, setIsSedeModalOpen] = useState(false);
    const [editingSede, setEditingSede] = useState<Sede | null>(null);
    const [sedeForm, setSedeForm] = useState({ nombre: '', direccion: '', ciudad: '' });

    // Estados para Cambiar Contraseña
    const [isPassModalOpen, setIsPassModalOpen] = useState(false);
    const [passForm, setPassForm] = useState({ old_password: '', new_password: '', confirm_password: '' });

    useEffect(() => {
        fetchSedes();
    }, []);

    const fetchSedes = async () => {
        setLoadingSedes(true);
        try {
            const data = await fetchAuthenticated('/api/sedes/');
            setSedes(data);
        } catch (err) {
            console.error("Error al cargar sedes:", err);
        } finally {
            setLoadingSedes(false);
        }
    };

    const handleSedeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const method = editingSede ? 'PUT' : 'POST';
            const url = editingSede ? `/api/sedes/${editingSede.id}/` : '/api/sedes/';

            await fetchAuthenticated(url, {
                method,
                body: JSON.stringify(sedeForm),
            });

            setIsSedeModalOpen(false);
            setEditingSede(null);
            setSedeForm({ nombre: '', direccion: '', ciudad: '' });
            fetchSedes();
            alert(`Sede ${editingSede ? 'actualizada' : 'creada'} con éxito`);
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    const handleEditSede = (sede: Sede) => {
        setEditingSede(sede);
        setSedeForm({
            nombre: sede.nombre,
            direccion: sede.direccion || '',
            ciudad: sede.ciudad || ''
        });
        setIsSedeModalOpen(true);
    };

    const handleDeleteSede = async (id: number) => {
        if (window.confirm('¿Estás seguro de eliminar esta sede? Esto podría afectar a los equipos y empleados asociados.')) {
            try {
                await fetchAuthenticated(`/api/sedes/${id}/`, { method: 'DELETE' });
                fetchSedes();
            } catch (err: any) {
                alert(`Error al eliminar: ${err.message}`);
            }
        }
    };

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passForm.new_password !== passForm.confirm_password) {
            alert("La nueva contraseña y la confirmación no coinciden.");
            return;
        }

        try {
            await fetchAuthenticated('/api/usuarios/gestion/change_password/', {
                method: 'POST',
                body: JSON.stringify({
                    old_password: passForm.old_password,
                    new_password: passForm.new_password
                })
            });
            setIsPassModalOpen(false);
            setPassForm({ old_password: '', new_password: '', confirm_password: '' });
            alert("Contraseña actualizada con éxito.");
        } catch (err: any) {
            alert(`Error: ${err.message}`);
        }
    };

    return (
        <Layout>
            <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="mb-10">
                    <div className="flex items-center mb-2">
                        <span className="text-4xl mr-3">⚙️</span>
                        <h1 className="text-4xl font-black text-gray-800 tracking-tight">Configuración del Sistema</h1>
                    </div>
                    <p className="text-gray-500 font-medium ml-14">Administra los parámetros básicos y tu perfil de usuario.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* SECCIÓN SEDES */}
                    <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col">
                        <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    <span>🏢</span> Gestión de Sedes
                                </h2>
                                <p className="text-xs text-gray-400 font-medium">Ubicaciones físicas de la empresa.</p>
                            </div>
                            <button
                                onClick={() => { setEditingSede(null); setSedeForm({ nombre: '', direccion: '', ciudad: '' }); setIsSedeModalOpen(true); }}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl transition-all shadow-md"
                            >
                                + Nueva Sede
                            </button>
                        </div>

                        <div className="flex-1 p-6">
                            {loadingSedes ? (
                                <div className="flex justify-center p-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
                            ) : (
                                <div className="space-y-3">
                                    {sedes.map(sede => (
                                        <div key={sede.id} className="group flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 hover:bg-white transition-all">
                                            <div>
                                                <h3 className="font-bold text-gray-800">{sede.nombre}</h3>
                                                <p className="text-xs text-gray-500">{sede.ciudad}, {sede.direccion || 'Sin dirección'}</p>
                                            </div>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => handleEditSede(sede)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                                                <button onClick={() => handleDeleteSede(sede.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
                                            </div>
                                        </div>
                                    ))}
                                    {sedes.length === 0 && <p className="text-center text-gray-400 py-10 italic">No hay sedes registradas.</p>}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SECCIÓN PERFIL */}
                    <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span>👤</span> Mi Perfil
                            </h2>
                            <p className="text-xs text-gray-400 font-medium">Información de tu cuenta actual.</p>
                        </div>

                        <div className="p-8">
                            <div className="flex items-center gap-6 mb-8">
                                <div className="h-20 w-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl text-white shadow-lg">
                                    {user?.username?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-gray-800">@{user?.username}</h3>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${user?.is_superuser ? 'bg-purple-100 text-purple-700 border border-purple-200' : 'bg-blue-100 text-blue-700 border border-blue-200'
                                        }`}>
                                        {user?.rol || (user?.is_superuser ? 'Super Administrador' : 'Usuario')}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Correo Electrónico</label>
                                    <p className="text-sm font-semibold text-gray-800">{user?.email || 'No asignado'}</p>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Sede Asignada</label>
                                    <p className="text-sm font-semibold text-gray-800">{user?.sede?.nombre || 'Acceso Global'}</p>
                                </div>
                            </div>

                            <div className="mt-8">
                                <button
                                    onClick={() => setIsPassModalOpen(true)}
                                    className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-lg flex items-center justify-center gap-2"
                                >
                                    <span>🔒</span> Cambiar Contraseña
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* AJUSTES PAZ Y SALVO (Simulado) */}
                    <section className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden lg:col-span-2">
                        <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <span>📄</span> Ajustes de Paz y Salvo de TI
                            </h2>
                            <p className="text-xs text-gray-400 font-medium">Información predeterminada para los documentos generados.</p>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nombre Responsable TI (Firma)</label>
                                <input type="text" placeholder="Ej: Juan Pérez" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nit / Documento Empresa</label>
                                <input type="text" placeholder="900.000.000-1" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                            </div>
                        </div>
                    </section>

                </div>
            </div>

            {/* MODAL SEDE */}
            {isSedeModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">{editingSede ? 'Editar Sede' : 'Nueva Sede'}</h3>
                            <button onClick={() => setIsSedeModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handleSedeSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nombre de la Sede</label>
                                <input
                                    required
                                    type="text"
                                    value={sedeForm.nombre}
                                    onChange={e => setSedeForm({ ...sedeForm, nombre: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ciudad</label>
                                <input
                                    type="text"
                                    value={sedeForm.ciudad}
                                    onChange={e => setSedeForm({ ...sedeForm, ciudad: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Dirección</label>
                                <input
                                    type="text"
                                    value={sedeForm.direccion}
                                    onChange={e => setSedeForm({ ...sedeForm, direccion: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsSedeModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg">Guardar Sede</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL CONTRASEÑA */}
            {isPassModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-gray-800">Cambiar Contraseña</h3>
                            <button onClick={() => setIsPassModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Contraseña Actual</label>
                                <input
                                    required
                                    type="password"
                                    value={passForm.old_password}
                                    onChange={e => setPassForm({ ...passForm, old_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Nueva Contraseña</label>
                                <input
                                    required
                                    type="password"
                                    value={passForm.new_password}
                                    onChange={e => setPassForm({ ...passForm, new_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Confirmar Nueva Contraseña</label>
                                <input
                                    required
                                    type="password"
                                    value={passForm.confirm_password}
                                    onChange={e => setPassForm({ ...passForm, confirm_password: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                />
                            </div>
                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsPassModalOpen(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-all">Cancelar</button>
                                <button type="submit" className="flex-1 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-lg">Actualizar Contraseña</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </Layout>
    );
};

export default ConfiguracionPage;
