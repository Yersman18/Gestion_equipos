'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { EmpleadoSelector } from '@/components/EmpleadoSelector';

import { useSede } from '@/app/context/SedeContext';

interface Periferico {
  id: number;
  nombre: string;
  tipo: string;
  estado_tecnico: string;
  estado_disponibilidad: string;
  empleado_asignado: number | null;
}

const InventarioPerifericosPage = () => {
  const router = useRouter();
  const { sedeActiva, isLoading: isSedeLoading } = useSede();
  const [availablePerifericos, setAvailablePerifericos] = useState<Periferico[]>([]);
  const [allPerifericos, setAllPerifericos] = useState<Periferico[]>([]);
  const [empleadoPerifericos, setEmpleadoPerifericos] = useState<string[]>([]); // Tipos que ya tiene el empleado
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | ''>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState('Todos');

  useEffect(() => {
    if (isSedeLoading) return;

    const fetchPerifericos = async () => {
      setLoading(true);
      try {
        const queryParams = sedeActiva ? `?sede=${sedeActiva.id}` : ''; // Note: API usually uses 'sede' for admin filter based on views.py check
        const data = await fetchAuthenticated(`/api/perifericos/${queryParams}`);
        setAllPerifericos(data);
        // Solo mostramos periféricos que NO estén asignados
        setAvailablePerifericos(data.filter((p: Periferico) => p.estado_disponibilidad === 'Disponible'));
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPerifericos();
  }, [sedeActiva, isSedeLoading]);

  // Detectar periféricos que ya tiene el empleado seleccionado
  useEffect(() => {
    if (selectedEmpleadoId) {
      const heldTypes = allPerifericos
        .filter(p => p.empleado_asignado === selectedEmpleadoId)
        .map(p => p.tipo);
      setEmpleadoPerifericos(heldTypes);

      // Limpiar selección de periféricos cuyos tipos ya tiene el empleado
      setSelectedIds(prev => prev.filter(id => {
        const p = availablePerifericos.find(item => item.id === id);
        return p && !heldTypes.includes(p.tipo);
      }));
    } else {
      setEmpleadoPerifericos([]);
    }
  }, [selectedEmpleadoId, allPerifericos, availablePerifericos]);

  const handleToggleSelect = (id: number) => {
    const p = availablePerifericos.find(item => item.id === id);
    if (!p) return;

    if (!selectedIds.includes(id)) {
      // Validar si el empleado ya tiene este tipo
      if (empleadoPerifericos.includes(p.tipo)) {
        alert(`Este colaborador ya tiene asignado un periférico de tipo: ${p.tipo}. Debe devolver el anterior antes de asignar uno nuevo.`);
        return;
      }
      // Validar si ya seleccionó otro del mismo tipo en esta sesión
      const alreadySelectedTypeOfSameType = availablePerifericos.find(
        item => selectedIds.includes(item.id) && item.tipo === p.tipo
      );
      if (alreadySelectedTypeOfSameType) {
        alert(`Ya has seleccionado otro ${p.tipo} para asignar. Solo puedes asignar uno de cada tipo.`);
        return;
      }
    }

    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredPerifericos.length) {
      setSelectedIds([]);
    } else {
      // Solo seleccionar los que no causen conflicto de tipo
      const newSelection: number[] = [];
      const selectedTypesCount: Record<string, boolean> = {};

      filteredPerifericos.forEach(p => {
        if (!empleadoPerifericos.includes(p.tipo) && !selectedTypesCount[p.tipo]) {
          newSelection.push(p.id);
          selectedTypesCount[p.tipo] = true;
        }
      });

      if (newSelection.length < filteredPerifericos.length) {
        alert("Algunos periféricos no se seleccionaron porque el colaborador ya tiene ese tipo o hay duplicados en la lista.");
      }
      setSelectedIds(newSelection);
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
      const promises = selectedIds.map(id => {
        const p = availablePerifericos.find(item => item.id === id);
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

  const filteredPerifericos = availablePerifericos.filter(p => {
    const matchesSearch = p.nombre.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = filterTipo === 'Todos' || p.tipo === filterTipo;
    return matchesSearch && matchesTipo;
  });

  const tipos = ['Todos', ...new Set(availablePerifericos.map(p => p.tipo))];

  if (loading) return <Layout><div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <div className="flex items-center mb-2">
                <span className="text-4xl mr-3">📦</span>
                <h1 className="text-4xl font-black text-gray-800 tracking-tight">
                  Inventario de Periféricos
                </h1>
              </div>
              <p className="text-gray-500 font-medium ml-14">
                Asigna múltiples periféricos a un colaborador de forma masiva y eficiente.
              </p>
            </div>
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
                    placeholder="Buscar por tipo..."
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
                      <th className="px-6 py-3 text-left w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.length === filteredPerifericos.length && filteredPerifericos.length > 0}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo de Periférico</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPerifericos.map(p => {
                      const isAlreadyHeld = empleadoPerifericos.includes(p.tipo);
                      const isAnotherOfSameTypeSelected = !selectedIds.includes(p.id) && selectedIds.some(id => {
                        const sel = availablePerifericos.find(item => item.id === id);
                        return sel?.tipo === p.tipo;
                      });

                      return (
                        <tr
                          key={p.id}
                          className={`hover:bg-blue-50/30 cursor-pointer transition-all relative ${selectedIds.includes(p.id) ? 'bg-blue-50/50' : ''} ${isAlreadyHeld ? 'opacity-50 grayscale bg-gray-50' : ''}`}
                          onClick={() => handleToggleSelect(p.id)}
                        >
                          <td className="px-6 py-4 relative" onClick={(e) => e.stopPropagation()}>
                            <div className={`absolute top-0 left-0 w-1 h-full ${selectedIds.includes(p.id) ? 'bg-blue-600' : 'bg-transparent'}`}></div>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(p.id)}
                              disabled={isAlreadyHeld}
                              onChange={() => handleToggleSelect(p.id)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 disabled:opacity-30"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <div className="text-sm font-bold text-gray-900 uppercase tracking-tight">{p.nombre}</div>
                              <div className="text-[10px] text-gray-400 font-black uppercase tracking-wider">{p.tipo}</div>
                              {isAlreadyHeld && (
                                <span className="text-[9px] text-red-600 font-black uppercase tracking-tighter mt-1 bg-red-50 self-start px-1 rounded border border-red-100">
                                  ⚠️ Ya posee este tipo
                                </span>
                              )}
                              {isAnotherOfSameTypeSelected && !isAlreadyHeld && (
                                <span className="text-[9px] text-amber-600 font-black uppercase tracking-tighter mt-1 bg-amber-50 self-start px-1 rounded border border-amber-100">
                                  ⚠️ Selección duplicada
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded border ${p.estado_tecnico === 'Funcional'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                              : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                              {p.estado_tecnico}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
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
                        {availablePerifericos.filter(p => selectedIds.includes(p.id)).map(p => (
                          <div key={p.id} className="text-xs text-gray-500 flex justify-between">
                            <span>{p.nombre}</span>
                            <span className="text-gray-400 font-medium">{p.tipo}</span>
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
                    Regla: Solo se permite un periférico de cada tipo por colaborador.
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
