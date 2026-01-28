'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { EmpleadoSelector } from '@/components/EmpleadoSelector';

interface Periferico {
  id: number;
  nombre: string;
  tipo: string;
  estado_tecnico: string;
  estado_disponibilidad: string;
}

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  cargo?: string;
  area?: string;
}

const InventarioPerifericosPage = () => {
  const router = useRouter();
  const [perifericos, setPerifericos] = useState<Periferico[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');

  useEffect(() => {
    const fetchPerifericos = async () => {
      try {
        const data = await fetchAuthenticated('/api/perifericos/');
        // Solo mostramos periféricos que NO estén asignados
        setPerifericos(data.filter((p: Periferico) => p.estado_disponibilidad === 'Disponible'));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPerifericos();
  }, []);

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPerifericos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPerifericos.map(p => p.id));
    }
  };

  const handleAssign = async () => {
    if (!selectedEmpleadoId) {
      alert('Por favor selecciona un colaborador');
      return;
    }
    if (selectedIds.length === 0) {
      alert('No hay periféricos seleccionados');
      return;
    }

    setSubmitting(true);
    try {
      // Como no hay endpoint de bulk update, lo hacemos uno por uno (o podrías sugerir crear uno en el backend)
      // Para efectos de simplicidad en esta fase, usaremos Promise.all
      const promises = selectedIds.map(id => {
        const p = perifericos.find(item => item.id === id);
        return fetchAuthenticated(`/api/perifericos/${id}/`, {
          method: 'PUT',
          body: JSON.stringify({
            ...p,
            empleado_asignado: selectedEmpleadoId,
            estado_disponibilidad: 'Asignado',
            fecha_entrega: new Date().toISOString()
          })
        });
      });

      await Promise.all(promises);
      alert('Periféricos asignados correctamente');
      router.push('/perifericos');
    } catch (err: any) {
      alert('Error al asignar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPerifericos = perifericos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === 'Todos' || p.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const tipos = ['Todos', ...new Set(perifericos.map(p => p.tipo))];

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Inventario de Periféricos</h1>
            <p className="text-gray-500">Asigna múltiples periféricos a un colaborador de forma masiva.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Buscar por nombre..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="w-full md:w-48">
                  <select
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    value={filterTipo}
                    onChange={(e) => setFilterTipo(e.target.value)}
                  >
                    {tipos.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredPerifericos.length && filteredPerifericos.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Periférico</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPerifericos.map(p => (
                      <tr
                        key={p.id}
                        className={`hover:bg-blue-50 cursor-pointer transition-colors ${selectedIds.includes(p.id) ? 'bg-blue-50' : ''}`}
                        onClick={() => handleToggleSelect(p.id)}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => handleToggleSelect(p.id)}
                            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{p.nombre}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">{p.tipo}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">{p.estado_tecnico}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredPerifericos.length === 0 && (
                  <div className="text-center py-10 text-gray-500">No hay periféricos disponibles que coincidan con la búsqueda.</div>
                )}
              </div>
            </div>
          </div>

          {/* Assignment Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 sticky top-8">
              <h2 className="text-xl font-bold text-gray-800 mb-6">Asignación Masiva</h2>

              <div className="space-y-6">
                <EmpleadoSelector
                  selectedEmpleadoId={selectedEmpleadoId}
                  onSelectEmpleado={setSelectedEmpleadoId}
                  onEmpleadoChange={() => { }}
                />

                <div className="border-t pt-6">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">Resumen de Selección</h3>
                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600">Periféricos seleccionados:</span>
                      <span className="font-bold text-blue-600 text-lg">{selectedIds.length}</span>
                    </div>
                    {selectedIds.length > 0 && (
                      <div className="max-h-40 overflow-y-auto space-y-1 mt-2">
                        {perifericos.filter(p => selectedIds.includes(p.id)).map(p => (
                          <div key={p.id} className="text-xs text-gray-500 flex justify-between">
                            <span>{p.nombre}</span>
                            <span className="text-gray-400">{p.tipo}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleAssign}
                    disabled={submitting || selectedIds.length === 0 || !selectedEmpleadoId}
                    className={`w-full py-3 rounded-xl font-bold text-white transition-all shadow-lg ${submitting || selectedIds.length === 0 || !selectedEmpleadoId
                        ? 'bg-gray-300 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 transform hover:-translate-y-1'
                      }`}
                  >
                    {submitting ? 'Asignando...' : `Asignar ${selectedIds.length} periféricos`}
                  </button>
                  <p className="text-[10px] text-gray-400 mt-4 text-center text-balance italic">
                    Esta acción actualizará los estados y registrará el movimiento en el historial.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default InventarioPerifericosPage;
