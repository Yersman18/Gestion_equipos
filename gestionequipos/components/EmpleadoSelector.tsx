'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/app/context/AuthContext';

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  cargo?: string;
  area?: string;
  cedula?: string;
}

interface EmpleadoSelectorProps {
  selectedEmpleadoId: number | '';
  onSelectEmpleado: (empleadoId: number | '') => void;
  onEmpleadoChange: (empleado: Empleado | null) => void;
}

export function EmpleadoSelector({ selectedEmpleadoId, onSelectEmpleado, onEmpleadoChange }: EmpleadoSelectorProps) {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredEmpleados, setFilteredEmpleados] = useState<Empleado[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated) {
      // Handle unauthenticated state
      return;
    }

    const fetchEmpleados = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/empleados/`, {
          headers: { 'Authorization': `Token ${token}` },
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar los empleados.');
        }

        const data: Empleado[] = await response.json();
        setEmpleados(data);
      } catch (err) {
        console.error("Error fetching employees:", err);
      }
    };

    fetchEmpleados();
  }, [isAuthenticated, isAuthLoading, token]);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <label htmlFor="empleadoSearch" className="block text-sm font-bold text-gray-700">
        👥 Seleccionar Colaborador
      </label>
      <input
        type="text"
        id="empleadoSearch"
        value={searchTerm}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setIsDropdownOpen(true);
          onSelectEmpleado(''); // Clear selected empleado when searching
          onEmpleadoChange(null);
        }}
        onFocus={() => setIsDropdownOpen(true)}
        placeholder="Escribe para buscar un colaborador..."
        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
      />
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