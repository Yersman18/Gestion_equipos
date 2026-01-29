'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';

import { fetchAuthenticated } from '@/app/utils/api';

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  cargo?: string;
  area?: string;
  cedula?: string;
  sede?: number;
}

interface EmpleadoSelectorProps {
  selectedEmpleadoId: number | '';
  onSelectEmpleado: (empleadoId: number | '') => void;
  onEmpleadoChange: (empleado: Empleado | null) => void;
  sedeId?: number; // Sede opcional para filtrar
}

export function EmpleadoSelector({ selectedEmpleadoId, onSelectEmpleado, onEmpleadoChange, sedeId }: EmpleadoSelectorProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmpleados, setFilteredEmpleados] = useState<Empleado[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { sedeActiva } = useSede();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Determinar la sede efectiva para filtrar
  const effectiveSedeId = sedeId !== undefined ? sedeId : (sedeActiva?.id !== 0 ? sedeActiva?.id : undefined);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      return;
    }

    const fetchEmpleados = async () => {
      try {
        // Si hay una sede específica, la inyectamos en la URL
        const url = effectiveSedeId
          ? `/api/empleados/?sede=${effectiveSedeId}`
          : '/api/empleados/';

        const data: Empleado[] = await fetchAuthenticated(url);
        setEmpleados(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmpleados();
  }, [isAuthenticated, isAuthLoading, effectiveSedeId]);


  useEffect(() => {
    if (searchTerm) {
      const filtered = empleados.filter(e =>
        e.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.apellido.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.cedula && e.cedula.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredEmpleados(filtered);
    } else {
      setFilteredEmpleados(empleados);
    }
  }, [searchTerm, empleados]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const selectedEmpleado = empleados.find(e => e.id === selectedEmpleadoId) || null;
    onEmpleadoChange(selectedEmpleado);
    if (selectedEmpleado) {
      setSearchTerm(`${selectedEmpleado.nombre} ${selectedEmpleado.apellido}`);
    } else {
      setSearchTerm('');
    }
  }, [selectedEmpleadoId, empleados, onEmpleadoChange]);

  const handleSelectEmpleado = (empleado: Empleado) => {
    onSelectEmpleado(empleado.id);
    setIsDropdownOpen(false);
  };

  const handleClear = () => {
    onSelectEmpleado('');
    onEmpleadoChange(null);
    setIsDropdownOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label htmlFor="empleadoSearch" className="block text-sm font-bold text-gray-700 mb-1">
        👥 Asignar a Colaborador
      </label>
      <div className="relative">
        <input
          type="text"
          id="empleadoSearch"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsDropdownOpen(true);
            if (selectedEmpleadoId) {
              onSelectEmpleado('');
              onEmpleadoChange(null);
            }
          }}
          onFocus={() => setIsDropdownOpen(true)}
          placeholder="Buscar por nombre, apellido o cédula..."
          className="w-full px-4 py-3 pr-10 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
          autoComplete="off"
        />
        {selectedEmpleadoId && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
            aria-label="Limpiar selección"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
      {isDropdownOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredEmpleados.length > 0 ? (
            filteredEmpleados.map(empleado => (
              <div
                key={empleado.id}
                onClick={() => handleSelectEmpleado(empleado)}
                className="px-4 py-2 cursor-pointer text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {empleado.nombre} {empleado.apellido} {empleado.cedula && `(${empleado.cedula})`}
              </div>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500">
              No se encontraron colaboradores.
            </div>
          )}
        </div>
      )}
    </div>
  );
}