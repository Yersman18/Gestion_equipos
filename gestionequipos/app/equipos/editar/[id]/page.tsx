'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useRouter, useParams } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/app/context/AuthContext';
import { useSede } from '@/app/context/SedeContext';
import { EmpleadoSelector } from '@/components/EmpleadoSelector';

interface Sede {
  id: number;
  nombre: string;
}

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  cargo?: string;
  area?: string;
}

const ESTADO_TECNICO_CHOICES = [
  'Nuevo', 'Reacondicionado'
];

const ESTADO_DISPONIBILIDAD_CHOICES = [
  'Disponible', 'Asignado', 'Reservado', 'No disponible por daño', 'No disponible por mantenimiento'
];

interface HistorialItem {
  id: number;
  fecha_cambio: string;
  campo_modificado: string;
  valor_anterior: string;
  valor_nuevo: string;
  tipo_accion: string;
  usuario_nombre: string | null;
}

function HistorialEquipo({ equipoId }: { equipoId: string | string[] }) {
  const [historial, setHistorial] = useState<HistorialItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  useEffect(() => {
    if (!equipoId || !token) return;

    const fetchHistorial = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/equipos/${equipoId}/historial/`, {
          headers: {
            'Authorization': `Token ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error('No se pudo cargar el historial de cambios.');
        }
        const data = await response.json();
        setHistorial(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistorial();
  }, [equipoId, token]);

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <p className="text-gray-600">Cargando historial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }
  
  if (historial.length === 0) {
    return (
        <div className="bg-gray-50 p-4 rounded-lg text-center">
            <p className="text-gray-500">No hay historial de cambios para este equipo.</p>
        </div>
    )
  }

  return (
    <div className="w-full">
        <div className="flex items-center mb-5 pb-3 border-b-2 border-gray-300">
            <span className="text-2xl mr-2">🗂️</span>
            <h3 className="text-xl font-bold text-gray-800">Historial de Cambios</h3>
        </div>
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Campo Modificado</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Anterior</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor Nuevo</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {historial.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(item.fecha_cambio).toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.usuario_nombre || 'Sistema'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">{item.campo_modificado}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 break-words">{item.valor_anterior}</td>
                            <td className="px-6 py-4 text-sm text-gray-500 break-words">{item.valor_nuevo}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
}


export default function EditarEquipoPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id;

  const { token, isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const { sedesPermitidas, isLoading: isSedeLoading } = useSede();

  // --- Estados del formulario ---
  const [nombre, setNombre] = useState('');
  const [marca, setMarca] = useState('');
  const [modelo, setModelo] = useState('');
  const [serial, setSerial] = useState('');
  const [ram, setRam] = useState('');
  const [rom, setRom] = useState('');
  // Nuevos campos de descripción detallada
  const [sistemaOperativo, setSistemaOperativo] = useState('');
  const [procesador, setProcesador] = useState('');
  const [antivirus, setAntivirus] = useState('');
  const [usuariosSistema, setUsuariosSistema] = useState('');
  const [tipoEquipo, setTipoEquipo] = useState('Desktop'); // Default
  const [redesConectadas, setRedesConectadas] = useState('');

  const [sedeId, setSedeId] = useState<number | ''>('');
  const [estadoTecnico, setEstadoTecnico] = useState('Nuevo');
  const [notas, setNotas] = useState('');
  
  // --- Estados de Mantenimiento ---
  const [fechaUltimoMantenimiento, setFechaUltimoMantenimiento] = useState('');
  const [fechaProximoMantenimiento, setFechaProximoMantenimiento] = useState('');

  // --- Estados de Asignación (Actualizado para Empleados) ---
  const [empleadoAsignadoId, setEmpleadoAsignadoId] = useState<number | ''>('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [fechaRecibido, setFechaRecibido] = useState('');
  const [horaRecibido, setHoraRecibido] = useState('');
  const [nombreJefe, setNombreJefe] = useState('');
  const [cargoJefe, setCargoJefe] = useState('');
  const [estadoDisponibilidad, setEstadoDisponibilidad] = useState('');
  const [mostrandoAsignacion, setMostrandoAsignacion] = useState(false);

  // Referencias para las firmas
  const sigCanvasUsuario = useRef<SignatureCanvas>(null);
  const sigCanvasJefe = useRef<SignatureCanvas>(null);
  const sigCanvasCompromiso = useRef<SignatureCanvas>(null);
  
  // --- Estados de Carga y Error ---
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [sedesParaFormulario, setSedesParaFormulario] = useState<Sede[]>([]);
  const [isSedesFormularioLoading, setIsSedesFormularioLoading] = useState(true);
  const [equipoData, setEquipoData] = useState<any>(null);

  useEffect(() => {
    if (isAuthLoading) return;

    const fetchAllSedes = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/sedes/`, {
          headers: { 'Authorization': `Token ${token}` },
        });
        if (!response.ok) throw new Error('No se pudieron cargar todas las sedes.');
        const data = await response.json();
        setSedesParaFormulario(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsSedesFormularioLoading(false);
      }
    };

    if (user?.is_superuser) {
      setIsSedesFormularioLoading(true);
      fetchAllSedes();
    } else {
      if (!isSedeLoading) {
        setSedesParaFormulario(sedesPermitidas);
        setIsSedesFormularioLoading(false);
      }
    }
  }, [user, isAuthLoading, token, sedesPermitidas, isSedeLoading]);

  useEffect(() => {
    if (isAuthLoading || isSedesFormularioLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!id || !token || sedesParaFormulario.length === 0) {
      setIsDataLoading(false);
      return;
    }

    const fetchEquipoData = async () => {
      setIsDataLoading(true);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/equipos/${id}/`, {
          headers: { 'Authorization': `Token ${token}` },
        });

        if (!response.ok) {
          throw new Error('No se pudieron cargar los datos del equipo.');
        }

        const data = await response.json();
        setEquipoData(data);
        
        setNombre(data.nombre || '');
        setMarca(data.marca || '');
        setModelo(data.modelo || '');
        setSerial(data.serial || '');
        setRam(data.ram || '');
        setRom(data.rom || '');
        setSistemaOperativo(data.sistema_operativo || '');
        setProcesador(data.procesador || '');
        setAntivirus(data.antivirus || '');
        setUsuariosSistema(data.usuarios_sistema || '');
        setTipoEquipo(data.tipo_equipo || 'Desktop');
        setRedesConectadas(data.redes_conectadas || '');
        setSedeId(data.sede || '');
        setEstadoTecnico(data.estado_tecnico || 'Nuevo');
        setNotas(data.notas || '');
        setEstadoDisponibilidad(data.estado_disponibilidad || 'Disponible');

        // Cargar fechas de mantenimiento
        setFechaUltimoMantenimiento(data.fecha_ultimo_mantenimiento?.split('T')[0] || '');
        setFechaProximoMantenimiento(data.fecha_proximo_mantenimiento?.split('T')[0] || '');


        // << CAMBIO CLAVE: Lógica para cargar el empleado asignado >>
        if (data.estado_disponibilidad === 'Asignado' && data.empleado_asignado_info) {
          setMostrandoAsignacion(true);
          
          setEmpleadoAsignadoId(data.empleado_asignado_info.id);
          
          if (data.fecha_entrega_a_colaborador) {
            setFechaEntrega(data.fecha_entrega_a_colaborador.split('T')[0]);
          }
          if (data.fecha_recibido_satisfaccion) {
            const [datePart, timePart] = data.fecha_recibido_satisfaccion.split('T');
            setFechaRecibido(datePart);
            if (timePart) {
              setHoraRecibido(timePart.substring(0, 5));
            }
          }

          setNombreJefe(data.nombre_jefe || '');
          setCargoJefe(data.cargo_jefe || '');
        }

      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchEquipoData();
  }, [id, isAuthenticated, isAuthLoading, router, token, isSedesFormularioLoading, sedesParaFormulario]);

  useEffect(() => {
    if (equipoData && !isDataLoading) {
      if (equipoData.firma_recibido_jefe && sigCanvasJefe.current) {
        sigCanvasJefe.current.fromDataURL(equipoData.firma_recibido_jefe);
      }
      if (equipoData.firma_compromiso && sigCanvasCompromiso.current) {
        sigCanvasCompromiso.current.fromDataURL(equipoData.firma_compromiso);
      }
      if (equipoData.firma_recibido_usuario && sigCanvasUsuario.current) {
        sigCanvasUsuario.current.fromDataURL(equipoData.firma_recibido_usuario);
      }
    }
  }, [equipoData, isDataLoading]);



  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const esAsignado = empleadoAsignadoId && mostrandoAsignacion;
    const nuevaDisponibilidad = esAsignado ? 'Asignado' : 'Disponible';

    let equipoData: any = {
      nombre,
      marca,
      modelo,
      serial,
      ram,
      rom,
      sistema_operativo: sistemaOperativo,
      procesador,
      antivirus,
      usuarios_sistema: usuariosSistema,
      tipo_equipo: tipoEquipo,
      redes_conectadas: redesConectadas,
      sede: sedeId,
      estado_tecnico: estadoTecnico,
      notas,
      estado_disponibilidad: nuevaDisponibilidad,
      fecha_proximo_mantenimiento: fechaProximoMantenimiento || null,
    };
    
    // Si el formulario de asignación se ha mostrado, debemos manejar todos los campos de asignación.
    if (mostrandoAsignacion) {
      const fechaRecibidoCompleta = fechaRecibido && horaRecibido ? `${fechaRecibido}T${horaRecibido}` : null;
      
      equipoData = {
        ...equipoData,
        // << CAMBIO CLAVE: Enviar `empleado_asignado` en lugar de `usuario_asignado_id` >>
        empleado_asignado: empleadoAsignadoId || null,
        fecha_entrega_a_colaborador: esAsignado ? (fechaEntrega || null) : null,
        fecha_recibido_satisfaccion: esAsignado ? fechaRecibidoCompleta : null,
        nombre_jefe: esAsignado ? nombreJefe : '',
        cargo_jefe: esAsignado ? cargoJefe : '',
        // Si no está asignado, enviamos null para borrar las firmas en el backend
        firma_recibido_jefe: esAsignado ? (sigCanvasJefe.current?.isEmpty() ? undefined : sigCanvasJefe.current?.toDataURL()) : null,
        firma_compromiso: esAsignado ? (sigCanvasCompromiso.current?.isEmpty() ? undefined : sigCanvasCompromiso.current?.toDataURL()) : null,
        firma_recibido_usuario: esAsignado ? (sigCanvasUsuario.current?.isEmpty() ? undefined : sigCanvasUsuario.current?.toDataURL()) : null,
      };
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/equipos/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(equipoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Object.entries(errorData).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ');
        throw new Error(errorMessage || 'Ocurrió un error al actualizar el equipo.');
      }
      
      router.push('/equipos');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSignature = (canvasRef: React.RefObject<SignatureCanvas | null>) => {
    canvasRef.current?.clear();
  };

  if (isDataLoading || isAuthLoading || isSedesFormularioLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-semibold text-lg">Cargando datos del equipo...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <span className="text-4xl mr-3">✏️</span>
          <h1 className="text-3xl font-black text-gray-800">Editar Equipo</h1>
        </div>
        <p className="text-gray-600 ml-14">Actualiza la información del equipo en el inventario.</p>
      </div>

      {/* Mensaje de error */}
      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-5 mb-6 shadow-lg">
          <div className="flex items-center">
            <span className="text-3xl mr-3">⚠️</span>
            <div>
              <p className="text-red-800 font-bold">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="text-3xl mr-3">📝</span>
            Formulario de Edición
          </h2>
        </div>

        <div className="p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            
            {/* Descripción del Equipo */}
            <div>
              <div className="flex items-center mb-5 pb-3 border-b-2 border-purple-200">
                <span className="text-2xl mr-2">💻</span>
                <h3 className="text-xl font-bold text-gray-800">Descripción del Equipo</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* ... (campos existentes) ... */}
                <div className="space-y-2">
                  <label htmlFor="nombre" className="block text-sm font-bold text-gray-700">
                    📌 Nombre del Equipo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="marca" className="block text-sm font-bold text-gray-700">
                    🏷️ Marca <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="marca"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="modelo" className="block text-sm font-bold text-gray-700">
                    📱 Modelo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="modelo"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="serial" className="block text-sm font-bold text-gray-700">
                    🔢 Serial <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="serial"
                    value={serial}
                    onChange={(e) => setSerial(e.target.value)}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="ram" className="block text-sm font-bold text-gray-700">
                    🧠 RAM
                  </label>
                  <input
                    type="text"
                    id="ram"
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    placeholder="Ej: 8GB"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="rom" className="block text-sm font-bold text-gray-700">
                    💾 Almacenamiento (ROM)
                  </label>
                  <input
                    type="text"
                    id="rom"
                    value={rom}
                    onChange={(e) => setRom(e.target.value)}
                    placeholder="Ej: 256GB SSD"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="sistemaOperativo" className="block text-sm font-bold text-gray-700">
                    💿 Sistema Operativo
                  </label>
                  <input type="text" id="sistemaOperativo" value={sistemaOperativo} onChange={(e) => setSistemaOperativo(e.target.value)} placeholder="Ej: Windows 10 Pro" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="procesador" className="block text-sm font-bold text-gray-700">
                    🧠 Procesador
                  </label>
                  <input type="text" id="procesador" value={procesador} onChange={(e) => setProcesador(e.target.value)} placeholder="Ej: Intel Core i7-11800H" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="antivirus" className="block text-sm font-bold text-gray-700">
                    🛡️ Antivirus Instalado
                  </label>
                  <input type="text" id="antivirus" value={antivirus} onChange={(e) => setAntivirus(e.target.value)} placeholder="Ej: ESET Endpoint Security" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="tipoEquipo" className="block text-sm font-bold text-gray-700">
                    💻 Tipo de Equipo
                  </label>
                  <select id="tipoEquipo" value={tipoEquipo} onChange={(e) => setTipoEquipo(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white">
                    <option value="Laptop">Laptop</option>
                    <option value="Desktop">Desktop</option>
                    <option value="Servidor">Servidor</option>
                    <option value="Tablet">Tablet</option>
                    <option value="Movil">Movil</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2"> {/* Ocupa dos columnas si el grid tiene 3 */}
                  <label htmlFor="usuariosSistema" className="block text-sm font-bold text-gray-700">
                    👥 Usuarios del Sistema Operativo
                  </label>
                  <textarea id="usuariosSistema" value={usuariosSistema} onChange={(e) => setUsuariosSistema(e.target.value)} rows={2} placeholder="Lista de usuarios locales o de dominio, separados por coma o salto de línea." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"></textarea>
                </div>

                <div className="space-y-2 md:col-span-3"> {/* Ocupa tres columnas si el grid tiene 3 */}
                  <label htmlFor="redesConectadas" className="block text-sm font-bold text-gray-700">
                    🌐 Redes Conectadas
                  </label>
                  <textarea id="redesConectadas" value={redesConectadas} onChange={(e) => setRedesConectadas(e.target.value)} rows={2} placeholder="Descripción de redes (WiFi, Ethernet, VPNs) y configuraciones relevantes." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"></textarea>
                </div>

                <div className="space-y-2">
                  <label htmlFor="sede" className="block text-sm font-bold text-gray-700">
                    📍 Sede <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="sede"
                    value={sedeId}
                    onChange={(e) => setSedeId(Number(e.target.value))}
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white"
                  >
                    <option value="" disabled>Seleccione una sede</option>
                    {sedesParaFormulario.map((s: Sede) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="estadoTecnico" className="block text-sm font-bold text-gray-700">
                    🔧 Estado Técnico
                  </label>
                  <select
                    id="estadoTecnico"
                    value={estadoTecnico}
                    onChange={(e) => setEstadoTecnico(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all bg-white"
                  >
                    {ESTADO_TECNICO_CHOICES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <label htmlFor="notas" className="block text-sm font-bold text-gray-700">
                  📝 Notas Internas (TI)
                </label>
                <textarea
                  id="notas"
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={3}
                  placeholder="Información adicional del equipo..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all resize-none"
                ></textarea>
              </div>
            </div>

            {/* Fechas de Mantenimiento */}
            <div>
              <div className="flex items-center mb-5 pb-3 border-b-2 border-yellow-300">
                <span className="text-2xl mr-2">🗓️</span>
                <h3 className="text-xl font-bold text-gray-800">Fechas de Mantenimiento</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label htmlFor="fechaUltimoMantenimiento" className="block text-sm font-bold text-gray-700">
                    Último Mantenimiento
                  </label>
                  <input
                    type="date"
                    id="fechaUltimoMantenimiento"
                    value={fechaUltimoMantenimiento}
                    readOnly
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg bg-gray-100 cursor-not-allowed"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="fechaProximoMantenimiento" className="block text-sm font-bold text-gray-700">
                    Próximo Mantenimiento (Editable)
                  </label>
                  <input
                    type="date"
                    id="fechaProximoMantenimiento"
                    value={fechaProximoMantenimiento}
                    onChange={(e) => setFechaProximoMantenimiento(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Botón para mostrar asignación */}
            {!mostrandoAsignacion && (
              <div className="text-center border-t-2 border-gray-200 pt-6">
                <button
                  type="button"
                  onClick={() => setMostrandoAsignacion(true)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 mx-auto"
                >
                  <span className="text-xl">👤</span>
                  <span>Asignar a Colaborador</span>
                </button>
              </div>
            )}

            {/* Formulario de Asignación */}
            {mostrandoAsignacion && (
              <div className="space-y-8 border-t-2 border-purple-200 pt-8">
                <div className="bg-purple-50 p-4 rounded-lg border-l-4 border-purple-500">
                  <h2 className="text-xl font-bold text-purple-800 flex items-center">
                    <span className="text-2xl mr-2">📄</span>
                    Acta de Entrega y Asignación
                  </h2>
                </div>

                {/* A Cargo de */}
                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-green-200">
                    <span className="text-2xl mr-2">👤</span>
                    <h3 className="text-xl font-bold text-gray-800">A Cargo de</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative md:col-span-2 space-y-2">
                        {/* << CAMBIO CLAVE: Componente EmpleadoSelector integrado >> */}
                        <EmpleadoSelector
                          selectedEmpleadoId={empleadoAsignadoId}
                          onSelectEmpleado={setEmpleadoAsignadoId}
                          onEmpleadoChange={setSelectedEmpleado}
                        />
                        {/* Mostrar info del empleado seleccionado */}
                        {selectedEmpleado && (
                          <div className="mt-2 p-3 bg-gray-200 rounded-lg border border-gray-300">
                            <p className="text-black"><strong>Cargo:</strong> {selectedEmpleado.cargo || 'No especificado'}</p>
                            <p className="text-black"><strong>Área:</strong> {selectedEmpleado.area || 'No especificada'}</p>
                          </div>
                        )}
                        <button 
                          type="button" 
                          className="text-red-600 hover:underline mt-2 text-sm"
                          onClick={() => setEmpleadoAsignadoId('')}
                        >
                          Limpiar asignación
                        </button>
                    </div>
                  </div>
                </div>

                {/* Recibido a Satisfacción */}
                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-purple-200">
                    <span className="text-2xl mr-2">✅</span>
                    <h3 className="text-xl font-bold text-gray-800">Recibido a Satisfacción</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="fechaRecibido" className="block text-sm font-bold text-gray-700">
                          📅 Fecha
                        </label>
                        <input
                          type="date"
                          id="fechaRecibido"
                          value={fechaRecibido}
                          onChange={(e) => setFechaRecibido(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="horaRecibido" className="block text-sm font-bold text-gray-700">
                          ⏰ Hora
                        </label>
                        <input
                          type="time"
                          id="horaRecibido"
                          value={horaRecibido}
                          onChange={(e) => setHoraRecibido(e.target.value)}
                          className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="responsableEntrega" className="block text-sm font-bold text-gray-700">
                        Responsable de la Entrega (TI)
                      </label>
                      <input type="text" id="responsableEntrega" value={user?.username || ''} disabled className="w-full px-4 py-3 border-2 border-gray-200 bg-gray-100 rounded-lg cursor-not-allowed"/>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700">
                        ✍️ Firma de quien recibe
                      </label>
                      <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                        <SignatureCanvas ref={sigCanvasUsuario} canvasProps={{className: 'w-full h-24 border border-gray-200 rounded'}} />
                      </div>
                      <button
                        type="button"
                        onClick={() => clearSignature(sigCanvasUsuario)}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        🗑️ Limpiar firma
                      </button>
                    </div>
                  </div>
                </div>

                {/* Datos de Jefe Inmediato */}
                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-orange-200">
                    <span className="text-2xl mr-2">👔</span>
                    <h3 className="text-xl font-bold text-gray-800">Datos de Jefe Inmediato</h3>
                    <span className="ml-2 text-sm text-gray-500">(Opcional)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="nombreJefe" className="block text-sm font-bold text-gray-700">
                        📛 Nombre
                      </label>
                      <input
                        type="text"
                        id="nombreJefe"
                        value={nombreJefe}
                        onChange={(e) => setNombreJefe(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="cargoJefe" className="block text-sm font-bold text-gray-700">
                        💼 Cargo
                      </label>
                      <input
                        type="text"
                        id="cargoJefe"
                        value={cargoJefe}
                        onChange={(e) => setCargoJefe(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                      />
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-bold text-gray-700">
                        ✍️ Firma del Jefe Inmediato
                      </label>
                      <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                        <SignatureCanvas ref={sigCanvasJefe} canvasProps={{className: 'w-full h-24 border border-gray-200 rounded'}} />
                      </div>
                      <button
                        type="button"
                        onClick={() => clearSignature(sigCanvasJefe)}
                        className="text-sm text-red-600 hover:text-red-700 font-semibold"
                      >
                        🗑️ Limpiar firma
                      </button>
                    </div>
                  </div>
                </div>

                {/* Compromiso */}
                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-red-200">
                    <span className="text-2xl mr-2">📋</span>
                    <h3 className="text-xl font-bold text-gray-800">Compromiso</h3>
                  </div>
                  
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-l-4 border-orange-400 mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Declaro haber recibido el equipo descrito y me comprometo a mantenerlo en buen estado. Notificaré de inmediato al área de TI cualquier falla para su atención. Autorizo el descuento del valor del equipo en caso de daños, pérdidas o uso indebido, y asumo la responsabilidad de aplicar las medidas necesarias para su cuidado y seguridad.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                      ✍️ Firma de leído y entendido
                    </label>
                    <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                      <SignatureCanvas ref={sigCanvasCompromiso} canvasProps={{className: 'w-full h-24 border border-gray-200 rounded'}} />
                    </div>
                    <button
                      type="button"
                      onClick={() => clearSignature(sigCanvasCompromiso)}
                      className="text-sm text-red-600 hover:text-red-700 font-semibold"
                    >
                      🗑️ Limpiar firma
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t-2 border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2"
              >
                <span>❌</span>
                <span>Cancelar</span>
              </button>
              <button
                type="submit"
                className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Guardando...</span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
