// app/mantenimientos/fechas/page.tsx
'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';
import { Layout } from '@/components/Layout';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import esLocale from '@fullcalendar/core/locales/es';

// --- Interfaces ---
interface MaintenanceEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  extendedProps: {
    estado_mantenimiento: string;
    equipo_nombre: string;
    responsable_nombre?: string;
    tipo_mantenimiento: string;
    descripcion_problema?: string;
    acciones_realizadas?: string;
    repuestos_utilizados?: string;
    notas?: string;
  };
}

interface StatsCardProps {
  title: string;
  count: number;
  color: string;
  icon: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ title, count, color, icon }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{title}</p>
        <p className={`text-2xl font-bold ${color}`}>{count}</p>
      </div>
      <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${icon} flex items-center justify-center`}>
        <div className="w-6 h-6 bg-white rounded-full opacity-30"></div>
      </div>
    </div>
  </div>
);

const CalendarMantenimientosPage = () => {
  const { token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { sedeActiva, isLoading: sedeLoading } = useSede();

  const [events, setEvents] = useState<MaintenanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MaintenanceEvent | null>(null);
  const [stats, setStats] = useState({
    pendientes: 0,
    enProceso: 0,
    finalizados: 0,
    atrasados: 0,
    total: 0
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (authLoading || sedeLoading) {
      setLoading(true);
      return;
    }
    if (!isAuthenticated) {
      setError("Acceso no autorizado. Por favor, inicie sesión.");
      setLoading(false);
      return;
    }

    const fetchMantenimientos = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`${API_URL}/api/mantenimientos/`);
        if (sedeActiva) {
          url.searchParams.append('sede_id', String(sedeActiva.id));
        }

        const response = await fetch(url.toString(), {
          headers: { 'Authorization': `Token ${token}` },
        });

        if (!response.ok) {
          throw new Error(`Error ${response.status}: No se pudieron obtener los mantenimientos.`);
        }

        const data = await response.json();
        
        let pendientes = 0;
        let enProceso = 0;
        let finalizados = 0;
        let atrasados = 0;

        const mappedEvents: MaintenanceEvent[] = data.map((mantenimiento: any) => {
          const isOverdue = mantenimiento.estado_mantenimiento !== 'Finalizado' && 
                            new Date(mantenimiento.fecha_inicio) < new Date() && 
                            mantenimiento.estado_mantenimiento !== 'Cancelado';

          // Contar estadísticas
          if (isOverdue) {
            atrasados++;
          } else {
            switch (mantenimiento.estado_mantenimiento) {
              case 'Pendiente':
                pendientes++;
                break;
              case 'En proceso':
                enProceso++;
                break;
              case 'Finalizado':
                finalizados++;
                break;
            }
          }

          let eventClassName = '';
          if (isOverdue) {
            eventClassName = 'calendar-event-overdue';
          } else {
            switch (mantenimiento.estado_mantenimiento) {
              case 'Pendiente':
                eventClassName = 'calendar-event-pending';
                break;
              case 'En proceso':
                eventClassName = 'calendar-event-process';
                break;
              case 'Finalizado':
                eventClassName = 'calendar-event-completed';
                break;
              case 'Cancelado':
                eventClassName = 'calendar-event-cancelled';
                break;
              default:
                eventClassName = 'calendar-event-default';
            }
          }

          return {
            id: mantenimiento.id.toString(),
            title: `${mantenimiento.tipo_mantenimiento} - ${mantenimiento.equipo_nombre}`,
            start: mantenimiento.fecha_inicio,
            end: mantenimiento.fecha_inicio, // Siempre mostrar solo el día de inicio en el calendario
            allDay: true,
            classNames: [eventClassName],
            extendedProps: {
              estado_mantenimiento: mantenimiento.estado_mantenimiento,
              equipo_nombre: mantenimiento.equipo_nombre,
              responsable_nombre: mantenimiento.responsable_nombre,
              tipo_mantenimiento: mantenimiento.tipo_mantenimiento,
              descripcion_problema: mantenimiento.descripcion_problema,
              acciones_realizadas: mantenimiento.acciones_realizadas,
              repuestos_utilizados: mantenimiento.repuestos_utilizados,
              notas: mantenimiento.notas,
            },
          };
        });

        setStats({
          pendientes,
          enProceso,
          finalizados,
          atrasados,
          total: data.length
        });
        setEvents(mappedEvents);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMantenimientos();
  }, [token, isAuthenticated, authLoading, sedeActiva, sedeLoading, API_URL]);

  const handleEventClick = (clickInfo: any) => {
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      start: clickInfo.event.startStr,
      end: clickInfo.event.endStr,
      allDay: clickInfo.event.allDay,
      extendedProps: clickInfo.event.extendedProps,
    });
  };

  const closeModal = () => {
    setSelectedEvent(null);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-gray-200 border-t-slate-900 mx-auto mb-4"></div>
            <p className="text-gray-500 font-medium text-lg">Cargando Calendario...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm max-w-2xl mx-auto mt-8">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Calendario de Mantenimientos
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-gray-600 text-sm">
              Visualiza y gestiona los mantenimientos de equipos
            </p>
            {sedeActiva && (
              <span className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-medium border border-emerald-200">
                <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                {sedeActiva.nombre}
              </span>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <StatsCard 
            title="Total" 
            count={stats.total} 
            color="text-gray-800" 
            icon="from-gray-400 to-gray-500"
          />
          <StatsCard 
            title="Pendientes" 
            count={stats.pendientes} 
            color="text-blue-600" 
            icon="from-blue-400 to-blue-500"
          />
          <StatsCard 
            title="En Proceso" 
            count={stats.enProceso} 
            color="text-yellow-600" 
            icon="from-yellow-400 to-yellow-500"
          />
          <StatsCard 
            title="Atrasados" 
            count={stats.atrasados} 
            color="text-red-600" 
            icon="from-red-400 to-red-500"
          />
          <StatsCard 
            title="Finalizados" 
            count={stats.finalizados} 
            color="text-green-600" 
            icon="from-green-400 to-green-500"
          />
        </div>

        {/* Leyenda */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Leyenda de Estados</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm text-gray-700">Pendiente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-yellow-500"></div>
              <span className="text-sm text-gray-700">En Proceso</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm text-gray-700">Finalizado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-red-500"></div>
              <span className="text-sm text-gray-700">Atrasado</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-gray-400"></div>
              <span className="text-sm text-gray-700">Cancelado</span>
            </div>
          </div>
        </div>

        {/* Calendario */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <style jsx global>{`
            .fc {
              font-family: inherit;
            }
            .fc .fc-toolbar {
              margin-bottom: 1.5rem;
            }
            .fc .fc-toolbar-title {
              font-size: 1.5rem;
              font-weight: 700;
              color: #1f2937;
            }
            .fc .fc-button {
              background-color: #ffffff;
              border: 1.5px solid #e5e7eb;
              color: #374151;
              font-weight: 500;
              text-transform: none;
              padding: 0.5rem 1rem;
              transition: all 0.2s;
              box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            }
            .fc .fc-button:hover {
              background-color: #f9fafb;
              border-color: #d1d5db;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }
            .fc .fc-button-primary:not(:disabled).fc-button-active {
              background: linear-gradient(to bottom, #10b981, #059669);
              border-color: #10b981;
              color: white;
              box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);
            }
            .fc .fc-button:focus {
              box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
            }
            .fc-theme-standard td,
            .fc-theme-standard th {
              border-color: #f3f4f6;
            }
            .fc-theme-standard .fc-scrollgrid {
              border-color: #e5e7eb;
              border-width: 1px;
            }
            .fc .fc-col-header-cell {
              background: linear-gradient(to bottom, #f9fafb, #f3f4f6);
              padding: 1rem 0.5rem;
              font-weight: 600;
              color: #374151;
              text-transform: uppercase;
              font-size: 0.7rem;
              letter-spacing: 0.05em;
              border-color: #e5e7eb;
            }
            .fc .fc-daygrid-day-number {
              color: #1f2937;
              font-weight: 600;
              padding: 0.5rem;
              font-size: 0.9rem;
            }
            .fc .fc-day-today {
              background-color: #f0fdf4 !important;
            }
            .fc .fc-day-today .fc-daygrid-day-number {
              background: linear-gradient(to bottom right, #10b981, #059669);
              color: white;
              border-radius: 6px;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-weight: 700;
            }
            .fc-daygrid-day-frame {
              min-height: 100px;
            }
            .fc-event {
              border: none;
              padding: 4px 6px;
              margin: 2px 3px;
              font-size: 0.75rem;
              font-weight: 600;
              border-radius: 6px;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
            }
            .fc-event:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }
            .fc-event-title {
              font-weight: 600;
            }
            .calendar-event-pending {
              background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
              color: white;
            }
            .calendar-event-process {
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
              color: white;
            }
            .calendar-event-completed {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              color: white;
            }
            .calendar-event-overdue {
              background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
              color: white;
              animation: pulse 2s infinite;
            }
            .calendar-event-cancelled {
              background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%);
              color: white;
              opacity: 0.6;
            }
            .calendar-event-default {
              background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%);
              color: white;
            }
            @keyframes pulse {
              0%, 100% {
                opacity: 1;
              }
              50% {
                opacity: 0.8;
              }
            }
          `}</style>
          
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            weekends={true}
            events={events}
            locale={esLocale}
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            buttonText={{
              today: 'Hoy',
              month: 'Mes',
              week: 'Semana',
              day: 'Día'
            }}
            eventClick={handleEventClick}
            editable={true}
            selectable={true}
            eventDrop={(info) => {
              alert(`Mantenimiento ${info.event.title} movido a ${info.event.startStr}`);
            }}
            select={(info) => {
              alert(`Seleccionado desde ${info.startStr} hasta ${info.endStr}`);
            }}
            height="auto"
            dayMaxEvents={3}
            moreLinkText="más"
          />
        </div>
      </div>

      {selectedEvent && (
        <MaintenanceDetailModal event={selectedEvent} onClose={closeModal} />
      )}
    </Layout>
  );
};

export default CalendarMantenimientosPage;

// --- Modal de Detalles ---
interface MaintenanceDetailModalProps {
  event: MaintenanceEvent;
  onClose: () => void;
}

const MaintenanceDetailModal: React.FC<MaintenanceDetailModalProps> = ({ event, onClose }) => {
  const getStatusInfo = (status: string) => {
    const isOverdue = status !== 'Finalizado' && new Date(event.start) < new Date() && status !== 'Cancelado';
    
    if (isOverdue) {
      return {
        badge: 'bg-red-100 text-red-700 border-red-300',
        icon: '⚠️',
        label: 'ATRASADO'
      };
    }

    switch (status) {
      case 'Pendiente':
        return {
          badge: 'bg-blue-100 text-blue-700 border-blue-300',
          icon: '📋',
          label: status.toUpperCase()
        };
      case 'En proceso':
        return {
          badge: 'bg-yellow-100 text-yellow-700 border-yellow-300',
          icon: '⚙️',
          label: status.toUpperCase()
        };
      case 'Finalizado':
        return {
          badge: 'bg-green-100 text-green-700 border-green-300',
          icon: '✓',
          label: status.toUpperCase()
        };
      case 'Cancelado':
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: '✕',
          label: status.toUpperCase()
        };
      default:
        return {
          badge: 'bg-gray-100 text-gray-700 border-gray-300',
          icon: '•',
          label: status.toUpperCase()
        };
    }
  };

  const statusInfo = getStatusInfo(event.extendedProps.estado_mantenimiento);

  const InfoSection = ({ icon, label, value }: { icon: string; label: string; value: string | undefined }) => {
    if (!value) return null;
    return (
      <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-0.5">{icon}</div>
          <div className="flex-1">
            <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              {label}
            </dt>
            <dd className="text-sm text-gray-800 leading-relaxed">
              {value}
            </dd>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-60 flex justify-center items-center p-4 z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden border border-gray-200">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-6 py-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{statusInfo.icon}</span>
                <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold border ${statusInfo.badge}`}>
                  {statusInfo.label}
                </span>
              </div>
              <h2 className="text-2xl font-bold mb-1">
                {event.extendedProps.tipo_mantenimiento}
              </h2>
              <p className="text-gray-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                {event.extendedProps.equipo_nombre}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors p-2 hover:bg-white/10 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Fechas destacadas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
              <p className="text-xs text-gray-300 mb-1">Fecha de Inicio</p>
              <p className="text-sm font-semibold">
                {new Date(event.start).toLocaleDateString('es-ES', { 
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric' 
                })}
              </p>
            </div>
            {event.end && event.start !== event.end && (
              <div className="bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                <p className="text-xs text-gray-300 mb-1">Fecha de Fin</p>
                <p className="text-sm font-semibold">
                  {new Date(event.end).toLocaleDateString('es-ES', { 
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric' 
                  })}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Contenido */}
        <div className="px-6 py-6 max-h-96 overflow-y-auto bg-gray-50">
          <div className="space-y-4">
            {event.extendedProps.responsable_nombre && (
              <InfoSection 
                icon="👤"
                label="Responsable Asignado" 
                value={event.extendedProps.responsable_nombre} 
              />
            )}

            <InfoSection 
              icon="🔍"
              label="Descripción del Problema" 
              value={event.extendedProps.descripcion_problema} 
            />

            <InfoSection 
              icon="🔧"
              label="Acciones Realizadas" 
              value={event.extendedProps.acciones_realizadas} 
            />

            <InfoSection 
              icon="🔩"
              label="Repuestos Utilizados" 
              value={event.extendedProps.repuestos_utilizados} 
            />

            <InfoSection 
              icon="📝"
              label="Notas Adicionales" 
              value={event.extendedProps.notas} 
            />
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black text-white font-semibold py-3 px-4 rounded-lg transition-all shadow-lg hover:shadow-xl"
          >
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
};