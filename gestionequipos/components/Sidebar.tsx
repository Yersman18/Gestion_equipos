'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Auditoría', href: '/dashboard/auditoria', icon: '🕵️', adminOnly: true },
  {
    name: 'Equipos', href: '/equipos', icon: '💻', submenu: [
      { name: 'Registrar equipo', href: '/equipos/registrar' },
      { name: 'Historial', href: '/equipos/historial' }
    ]
  },
  {
    name: 'Mantenimiento', href: '/mantenimientos', icon: '🔧', submenu: [
      { name: 'Registrar', href: '/mantenimientos/registrar' },
      { name: 'Historial', href: '/mantenimientos/historial' },
      { name: 'Fechas', href: '/mantenimientos/fechas' }
    ]
  },
  { name: 'Empleados', href: '/empleados', icon: '👥' },
  { name: 'Licencias', href: '/licencias', icon: '🔑' },
  {
    name: 'Periféricos', href: '/perifericos', icon: '🖱️', submenu: [
      { name: 'Inventario', href: '/perifericos/inventario' },
      { name: 'Historial', href: '/perifericos/historial' }
    ]
  },
  { name: 'Paz y Salvo', href: '/pasisalvos', icon: '📜' },
  { name: 'Configuración', href: '/configuracion', icon: '⚙️' },
];

export function Sidebar({ isOpen, toggleSidebar }: SidebarProps) {
  const { user } = useAuth();
  const { sedesPermitidas, sedeActiva, setSedeActiva } = useSede();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Filtrar items: Solo superusuarios o admins ven Usuarios y Configuración avanzada
  const filteredNavItems = navItems.filter(item => {
    if ((item as any).adminOnly) return user?.is_superuser || user?.rol === 'ADMIN';
    if (item.name === 'Usuarios') return user?.is_superuser || user?.rol === 'ADMIN';
    return true;
  });

  // Si no está en navItems pero queremos agregarlo dinámicamente si es admin
  const finalNavItems = [...filteredNavItems];
  if ((user?.is_superuser || user?.rol === 'ADMIN') && !finalNavItems.find(i => i.name === 'Usuarios')) {
    finalNavItems.push({ name: 'Usuarios', href: '/usuarios', icon: '👤' });
  }

  const handleLinkClick = () => {
    if (window.innerWidth < 768) { // Cierra el sidebar en móvil al hacer clic
      toggleSidebar();
    }
  };

  return (
    <aside className={`bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 text-white flex flex-col shadow-2xl transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative md:w-64 fixed inset-y-0 left-0 w-64 z-30`}>
      {/* Logo */}
      <div className="h-20 flex items-center justify-center bg-black/20 border-b border-green-500/20">
        <div className="bg-white rounded-lg px-6 py-2 shadow-lg">

          <img src="/img/logo.png" alt="INTEGRA Logo" className="h-12" />

        </div>
      </div>

      {/* Sede Selector (Solo para usuarios con múltiples sedes o admins) */}
      {sedesPermitidas.length > 1 && (
        <div className="px-4 py-3 bg-white/5 border-b border-white/10">
          <label className="block text-[10px] font-black text-green-500 uppercase tracking-widest mb-2 px-1">
            📍 Cambiar Sede
          </label>
          <select
            value={sedeActiva?.id || ''}
            onChange={(e) => {
              const selected = sedesPermitidas.find(s => s.id === parseInt(e.target.value));
              if (selected) setSedeActiva(selected);
            }}
            className="w-full bg-gray-900 text-xs font-bold py-2 px-3 rounded-lg border border-green-500/30 focus:border-green-500 outline-none transition-all cursor-pointer"
          >
            {sedesPermitidas.map(s => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-grow p-4 space-y-1 overflow-y-auto scrollbar-hide">
        {finalNavItems.map((item) => (
          <div key={item.name}>
            <Link href={item.href} onClick={handleLinkClick}>
              <div
                className="flex items-center justify-between p-3 rounded-lg hover:bg-green-500/10 transition-all duration-200 cursor-pointer group border border-transparent hover:border-green-500/30"
              >
                <div className="flex items-center">
                  <span className="mr-3 text-xl">{item.icon}</span>
                  <span className="font-medium group-hover:text-green-400 transition-colors">{item.name}</span>
                </div>
                {item.submenu && (
                  <span
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setExpandedItem(expandedItem === item.name ? null : item.name);
                    }}
                    className={`text-xs transition-transform p-2 ${expandedItem === item.name ? 'rotate-180' : ''}`}
                  >
                    ▼
                  </span>
                )}
              </div>
            </Link>

            {/* Submenu */}
            {item.submenu && expandedItem === item.name && (
              <div className="ml-8 mt-1 space-y-1">
                {item.submenu.map((subitem) => (
                  <Link key={subitem.name} href={subitem.href} onClick={handleLinkClick}>
                    <div className="p-2 pl-4 text-sm text-gray-300 hover:text-green-400 hover:bg-green-500/5 rounded-lg transition-all cursor-pointer border-l-2 border-transparent hover:border-green-500">
                      {subitem.name}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="text-center text-xs text-gray-400 space-y-1">
          <p className="font-semibold text-green-400">Gestión de Inventario</p>
          <p>v1.0</p>
        </div>
      </div>
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </aside>
  );
}