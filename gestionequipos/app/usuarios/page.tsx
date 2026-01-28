'use client';

import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { useAuth } from '@/app/context/AuthContext';

interface Sede {
    id: number;
    nombre: string;
}

interface UserGestion {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    is_superuser: boolean;
    rol: string;
    sede: Sede | null;
    cargo: string | null;
    area: string | null;
}

const UsuariosPage = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserGestion[]>([]);
    const [sedes, setSedes] = useState<Sede[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserGestion | null>(null);
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        email: '',
        first_name: '',
        last_name: '',
        rol: 'USUARIO',
        sede_id: '' as string | number,
        cargo: '',
        area: '',
        is_superuser: false
    });

    useEffect(() => {
        fetchUsers();
        fetchSedes();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await fetchAuthenticated('/api/usuarios/gestion/');
            setUsers(data);
        } catch (err) {
            console.error("Error al cargar usuarios:", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSedes = async () => {
        try {
            const data = await fetchAuthenticated('/api/sedes/');
            setSedes(data);
        } catch (err) {
            console.error("Error al cargar sedes:", err);
        }
    };

    const handleOpenModal = (user: UserGestion | null = null) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                username: user.username,
                password: '', // No cargar password
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                rol: user.rol || 'USUARIO',
                sede_id: user.sede?.id || '',
                cargo: user.cargo || '',
                area: user.area || '',
                is_superuser: user.is_superuser
            });
        } else {
            setEditingUser(null);
            setFormData({
                username: '',
                password: '',
                email: '',
                first_name: '',
                last_name: '',
                rol: 'USUARIO',
                sede_id: '',
                cargo: '',
                area: '',
                is_superuser: false
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                username: formData.username,
                email: formData.email,
                first_name: formData.first_name,
                last_name: formData.last_name,
                is_superuser: formData.is_superuser,
                rol: formData.rol,
                cargo: formData.cargo,
                area: formData.area,
                sede_id: formData.sede_id === '' ? null : Number(formData.sede_id)
            };

            if (formData.password) {
                (payload as any).password = formData.password;
            }

            const method = editingUser ? 'PUT' : 'POST';
            const url = editingUser ? `/api/usuarios/gestion/${editingUser.id}/` : '/api/usuarios/gestion/';

            await fetchAuthenticated(url, {
                method,
                body: JSON.stringify(payload),
            });

            setIsModalOpen(false);
            fetchUsers();
            alert(`Usuario ${editingUser ? 'actualizado' : 'creado'} con éxito`);
        } catch (err: any) {
            console.error("Error completo:", err);
            alert(`${err.message}`);
        }
    };

    const handleDelete = async (id: number) => {
        if (id === currentUser?.user_id) {
            alert("No puedes eliminarte a ti mismo.");
            return;
        }
        if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
            try {
                await fetchAuthenticated(`/api/usuarios/gestion/${id}/`, { method: 'DELETE' });
                fetchUsers();
            } catch (err: any) {
                alert(`Error: ${err.message}`);
            }
        }
    };

    const filteredUsers = users.filter(u =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${u.first_name} ${u.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header Formal & Responsive */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <div className="flex items-center mb-2">
                            <span className="text-4xl mr-3">👥</span>
                            <h1 className="text-4xl font-black text-gray-800 tracking-tight">Gestión de Usuarios</h1>
                        </div>
                        <p className="text-gray-500 font-medium ml-1 md:ml-14">Administra los accesos, roles y sedes de todo el equipo.</p>
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-black py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all flex items-center justify-center gap-2"
                    >
                        <span>✨</span> Nuevo Usuario
                    </button>
                </div>

                {/* Búsqueda */}
                <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100 mb-8">
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Buscar por nombre, usuario o email..."
                            className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 pl-12"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <span className="absolute left-4 top-4.5 text-2xl">🔍</span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center p-20"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600"></div></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredUsers.map(u => (
                            <div key={u.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden group transition-all duration-300">
                                {/* Side Indicator */}
                                <div className="relative">
                                    <div className={`absolute top-0 left-0 w-1.5 h-full ${u.is_superuser ? 'bg-amber-500' : u.rol === 'ADMIN' ? 'bg-blue-600' : 'bg-green-500'}`}></div>
                                    <div className="p-6">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-14 w-14 bg-gray-100 text-gray-600 rounded-2xl flex items-center justify-center text-xl font-black shadow-inner">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-black text-gray-800 text-lg truncate">@{u.username}</p>
                                                <p className="text-xs text-gray-400 truncate">{u.email}</p>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rol</span>
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-black ${u.is_superuser || u.rol === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {u.is_superuser ? 'SUPERUSER' : u.rol}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Sede</span>
                                                <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${u.sede ? 'text-blue-600 bg-blue-50' : 'text-purple-600 bg-purple-50'}`}>
                                                    {u.sede?.nombre || 'Acceso Global'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                                <div className="min-w-0">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cargo / Área</p>
                                                    <p className="text-sm font-bold text-gray-700 truncate">{u.cargo || 'N/A'}</p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-black truncate">{u.area || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-6 flex gap-2 pt-4 border-t border-gray-50">
                                            <button
                                                onClick={() => handleOpenModal(u)}
                                                className="flex-1 py-3 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white font-black rounded-xl transition-all flex items-center justify-center gap-2 text-sm"
                                            >
                                                <span>✏️</span> Editar
                                            </button>
                                            <button
                                                onClick={() => handleDelete(u.id)}
                                                className="h-12 w-12 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-black rounded-xl transition-all flex items-center justify-center text-lg"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* MODAL USUARIO - Optimizado para móvil */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in duration-300">
                        <div className="sticky top-0 z-10 p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/95 backdrop-blur-md">
                            <div>
                                <h3 className="text-2xl font-black text-gray-800">{editingUser ? 'Editar Usuario' : 'Crear Usuario'}</h3>
                                <p className="text-sm text-gray-500 font-medium">Define los accesos y perfil.</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="h-12 w-12 flex items-center justify-center rounded-2xl hover:bg-gray-200 transition-all text-gray-400 text-xl font-black">✕</button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 md:p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Username</label>
                                    <input required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Contraseña {editingUser && '(Dejar en blanco)'}</label>
                                    <input required={!editingUser} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} type="password" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800" />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Email</label>
                                    <input required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} type="email" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nombres</label>
                                    <input value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Apellidos</label>
                                    <input value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Rol</label>
                                    <select value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 cursor-pointer">
                                        <option value="USUARIO">Usuario (Sede específica)</option>
                                        <option value="ADMIN">Administrador (Global)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Sede Asignada</label>
                                    <select value={formData.sede_id} onChange={e => setFormData({ ...formData, sede_id: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800 cursor-pointer">
                                        <option value="">-- Sin sede (Acceso Global) --</option>
                                        {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Cargo</label>
                                    <input value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Área</label>
                                    <input value={formData.area} onChange={e => setFormData({ ...formData, area: e.target.value })} type="text" className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-green-500 focus:bg-white rounded-2xl outline-none transition-all font-bold text-gray-800" />
                                </div>
                            </div>

                            <div className="mt-8 flex items-center gap-4 bg-amber-50 p-4 rounded-2xl border border-amber-100">
                                <input id="is_super" type="checkbox" checked={formData.is_superuser} onChange={e => setFormData({ ...formData, is_superuser: e.target.checked })} className="h-6 w-6 rounded-lg accent-amber-600" />
                                <label htmlFor="is_super" className="text-sm font-black text-amber-800 cursor-pointer">Dar permisos de Superusuario (Acceso Total)</label>
                            </div>

                            <div className="mt-10 flex flex-col md:flex-row gap-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="order-2 md:order-1 flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-2xl transition-all">Cancelar</button>
                                <button type="submit" className="order-1 md:order-2 flex-1 py-4 bg-green-600 text-white font-black rounded-2xl hover:bg-green-700 transition-all shadow-lg hover:shadow-xl">
                                    {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </Layout>
    );
};

export default UsuariosPage;
