'use client';

import { useState, useEffect, FormEvent, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { useRouter } from 'next/navigation';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '../../context/AuthContext'
import { useSede } from '../../context/SedeContext'
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
  'Nuevo', 'Funcional', 'Con fallas', 'Dañado', 'Desguazado', 'En reparación'
];

export default function RegistrarEquipoPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { sedeActiva, sedesPermitidas, isLoading: isSedeLoading } = useSede();

  // Campos del equipo
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

  // Estado de asignación
  const [empleadoAsignadoId, setEmpleadoAsignadoId] = useState<number | ''>('');
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [fechaRecibido, setFechaRecibido] = useState('');
  const [horaRecibido, setHoraRecibido] = useState('');
  const [nombreJefe, setNombreJefe] = useState('');
  const [cargoJefe, setCargoJefe] = useState('');
  const [observacionesUsuario, setObservacionesUsuario] = useState('');

  // Gestión de nuevo empleado
  const [showNewEmpleadoForm, setShowNewEmpleadoForm] = useState(false);
  const [newEmpleadoNombre, setNewEmpleadoNombre] = useState('');
  const [newEmpleadoApellido, setNewEmpleadoApellido] = useState('');
  const [newEmpleadoCedula, setNewEmpleadoCedula] = useState('');
  const [newEmpleadoCargo, setNewEmpleadoCargo] = useState('');
  const [newEmpleadoArea, setNewEmpleadoArea] = useState('');
  const [newEmpleadoCorreo, setNewEmpleadoCorreo] = useState('');

  // Estado del formulario
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mostrandoAsignacion, setMostrandoAsignacion] = useState(false);

  const sigCanvasUsuario = useRef<SignatureCanvas>(null);
  const sigCanvasJefe = useRef<SignatureCanvas>(null);
  const sigCanvasCompromiso = useRef<SignatureCanvas>(null);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (sedeActiva) {
      setSedeId(sedeActiva.id);
    }
  }, [router, isAuthenticated, isAuthLoading, sedeActiva]);


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    let finalEmpleadoId = empleadoAsignadoId;

    try {
      if (showNewEmpleadoForm && newEmpleadoNombre && newEmpleadoApellido) {
        const newEmpleadoRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/empleados/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Token ${token}`,
          },
          body: JSON.stringify({
            nombre: newEmpleadoNombre,
            apellido: newEmpleadoApellido,
            cedula: newEmpleadoCedula || null,
            email: newEmpleadoCorreo || null,
            cargo: newEmpleadoCargo || null,
            area: newEmpleadoArea || null,
          }),
        });

        if (!newEmpleadoRes.ok) {
          const errorData = await newEmpleadoRes.json();
          const errorMessage = Object.entries(errorData).map(([key, value]) => `${key}: ${value}`).join('; ');
          throw new Error(`Error al crear empleado: ${errorMessage}`);
        }
        const newEmpleado = await newEmpleadoRes.json();
        finalEmpleadoId = newEmpleado.id;
      }
      
      const esAsignado = finalEmpleadoId && mostrandoAsignacion;
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
        estado_disponibilidad: nuevaDisponibilidad,
        notas,
      };

      if (esAsignado) {
        const fechaRecibidoCompleta = fechaRecibido && horaRecibido ? `${fechaRecibido}T${horaRecibido}` : null;
        equipoData = {
          ...equipoData,
          empleado_asignado: finalEmpleadoId, // <<< CAMBIO CLAVE: Nombre de campo corregido
          fecha_entrega_a_colaborador: fechaEntrega || null,
          fecha_recibido_satisfaccion: fechaRecibidoCompleta,
          nombre_jefe: nombreJefe,
          cargo_jefe: cargoJefe,
          firma_recibido_usuario: sigCanvasUsuario.current?.isEmpty() ? undefined : sigCanvasUsuario.current?.toDataURL(),
          firma_recibido_jefe: sigCanvasJefe.current?.isEmpty() ? undefined : sigCanvasJefe.current?.toDataURL(),
          firma_compromiso: sigCanvasCompromiso.current?.isEmpty() ? undefined : sigCanvasCompromiso.current?.toDataURL(),
        };
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/equipos/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Token ${token}`,
        },
        body: JSON.stringify(equipoData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = Object.entries(errorData).map(([key, value]) => `${key}: ${value}`).join('; ');
        throw new Error(errorMessage || 'Ocurrió un error al registrar el equipo.');
      }

      router.push('/dashboard');

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearSignature = (canvasRef: React.RefObject<SignatureCanvas | null>) => {
    canvasRef.current?.clear();
  };

  return (
    <Layout>
      <div className="mb-8">
        <div className="flex items-center mb-2">
          <span className="text-4xl mr-3"></span>
          <h1 className="text-3xl font-black text-gray-800">Registrar Nuevo Equipo</h1>
        </div>
        <p className="text-gray-600 ml-14">Completa los datos para registrar un equipo en el inventario.</p>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 rounded-lg p-5 mb-6 shadow-lg">
          <div className="flex items-center">
            <span className="text-3xl mr-3"></span>
            <div>
              <p className="text-red-800 font-bold">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center">
            <span className="text-3xl mr-3"></span>
            Formulario de Registro
          </h2>
        </div>

        <div className="p-8">
          <form className="space-y-8" onSubmit={handleSubmit}>
            
            <div>
              <div className="flex items-center mb-5 pb-3 border-b-2 border-blue-200">
                <span className="text-2xl mr-2"></span>
                <h3 className="text-xl font-bold text-gray-800">Descripción del Equipo</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label htmlFor="nombre" className="block text-sm font-bold text-gray-700">
                     Nombre del Equipo <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="marca" className="block text-sm font-bold text-gray-700">
                     Marca <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="marca" value={marca} onChange={(e) => setMarca(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="modelo" className="block text-sm font-bold text-gray-700">
                     Modelo <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="modelo" value={modelo} onChange={(e) => setModelo(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="serial" className="block text-sm font-bold text-gray-700">
                     Serial <span className="text-red-500">*</span>
                  </label>
                  <input type="text" id="serial" value={serial} onChange={(e) => setSerial(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="ram" className="block text-sm font-bold text-gray-700">
                     RAM
                  </label>
                  <input type="text" id="ram" value={ram} onChange={(e) => setRam(e.target.value)} placeholder="Ej: 8GB" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="rom" className="block text-sm font-bold text-gray-700">
                     Almacenamiento (ROM)
                  </label>
                  <input type="text" id="rom" value={rom} onChange={(e) => setRom(e.target.value)} placeholder="Ej: 256GB SSD" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="sistemaOperativo" className="block text-sm font-bold text-gray-700">
                    Sistema Operativo
                  </label>
                  <input type="text" id="sistemaOperativo" value={sistemaOperativo} onChange={(e) => setSistemaOperativo(e.target.value)} placeholder="Ej: Windows 10 Pro" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="procesador" className="block text-sm font-bold text-gray-700">
                     Procesador
                  </label>
                  <input type="text" id="procesador" value={procesador} onChange={(e) => setProcesador(e.target.value)} placeholder="Ej: Intel Core i7-11800H" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="antivirus" className="block text-sm font-bold text-gray-700">
                     Antivirus Instalado
                  </label>
                  <input type="text" id="antivirus" value={antivirus} onChange={(e) => setAntivirus(e.target.value)} placeholder="Ej: ESET Endpoint Security" className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                </div>

                <div className="space-y-2">
                  <label htmlFor="tipoEquipo" className="block text-sm font-bold text-gray-700">
                     Tipo de Equipo
                  </label>
                  <select id="tipoEquipo" value={tipoEquipo} onChange={(e) => setTipoEquipo(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white">
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
                     Usuarios del Sistema Operativo
                  </label>
                  <textarea id="usuariosSistema" value={usuariosSistema} onChange={(e) => setUsuariosSistema(e.target.value)} rows={2} placeholder="Lista de usuarios locales o de dominio, separados por coma o salto de línea." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"></textarea>
                </div>

                <div className="space-y-2 md:col-span-3"> {/* Ocupa tres columnas si el grid tiene 3 */}
                  <label htmlFor="redesConectadas" className="block text-sm font-bold text-gray-700">
                     Redes Conectadas
                  </label>
                  <textarea id="redesConectadas" value={redesConectadas} onChange={(e) => setRedesConectadas(e.target.value)} rows={2} placeholder="Descripción de redes (WiFi, Ethernet, VPNs) y configuraciones relevantes." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"></textarea>
                </div>

                <div className="space-y-2">
                  <label htmlFor="sede" className="block text-sm font-bold text-gray-700">
                     Sede <span className="text-red-500">*</span>
                  </label>
                  <select id="sede" value={sedeId} onChange={(e) => setSedeId(Number(e.target.value))} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white">
                    {(sedesPermitidas.length === 0 || sedeId === '') && (<option value="" disabled>{sedesPermitidas.length === 0 ? 'No hay sedes disponibles' : 'Seleccione una sede'}</option>)}
                    {sedesPermitidas.map((s: Sede) => (<option key={s.id} value={s.id}>{s.nombre}</option>))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="estadoTecnico" className="block text-sm font-bold text-gray-700">
                     Estado Técnico
                  </label>
                  <select id="estadoTecnico" value={estadoTecnico} onChange={(e) => setEstadoTecnico(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all bg-white">
                    {ESTADO_TECNICO_CHOICES.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>

              <div className="mt-6 space-y-2">
                <label htmlFor="notas" className="block text-sm font-bold text-gray-700">
                   Notas Internas (TI)
                </label>
                <textarea id="notas" value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Información adicional del equipo..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"></textarea>
              </div>
            </div>

            {!mostrandoAsignacion && (
              <div className="text-center border-t-2 border-gray-200 pt-6">
                <button type="button" onClick={() => setMostrandoAsignacion(true)} className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 mx-auto">
                  <span className="text-xl"></span>
                  <span>Asignar a Colaborador</span>
                </button>
              </div>
            )}

            {mostrandoAsignacion && (
              <div className="space-y-8 border-t-2 border-blue-200 pt-8">
                <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                  <h2 className="text-xl font-bold text-blue-800 flex items-center">
                    <span className="text-2xl mr-2"></span>
                    Acta de Entrega y Asignación
                  </h2>
                </div>

                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-green-200">
                    <span className="text-2xl mr-2"></span>
                    <h3 className="text-xl font-bold text-gray-800">A Cargo de</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="relative md:col-span-2">
                      {/* <<< CAMBIO CLAVE: Componente EmpleadoSelector integrado >>> */}
                      <EmpleadoSelector
                        selectedEmpleadoId={empleadoAsignadoId}
                        onSelectEmpleado={setEmpleadoAsignadoId}
                        onEmpleadoChange={setSelectedEmpleado}
                      />
                      <div className="mt-2 text-right">
                        <button
                            type="button"
                            onClick={() => {
                                setShowNewEmpleadoForm(!showNewEmpleadoForm);
                                // Clear new employee form fields if canceling
                                if (showNewEmpleadoForm) {
                                    setNewEmpleadoNombre('');
                                    setNewEmpleadoApellido('');
                                    setNewEmpleadoCedula('');
                                    setNewEmpleadoCargo('');
                                    setNewEmpleadoArea('');
                                    setNewEmpleadoCorreo('');
                                }
                            }}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            {showNewEmpleadoForm ? 'Cancelar registro de Empleado' : 'Registrar Nuevo Empleado'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {showNewEmpleadoForm && (
                  <div className="p-4 border-2 border-dashed border-blue-300 rounded-lg">
                     <h4 className="text-lg font-bold text-gray-800 mb-4">Registrar Nuevo Empleado</h4>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       <div className="space-y-2">
                         <label htmlFor="newEmpleadoNombre" className="block text-sm font-bold text-gray-700">Nombre <span className="text-red-500">*</span></label>
                         <input type="text" id="newEmpleadoNombre" value={newEmpleadoNombre} onChange={e => setNewEmpleadoNombre(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"/>
                       </div>
                       <div className="space-y-2">
                         <label htmlFor="newEmpleadoApellido" className="block text-sm font-bold text-gray-700">Apellido <span className="text-red-500">*</span></label>
                         <input type="text" id="newEmpleadoApellido" value={newEmpleadoApellido} onChange={e => setNewEmpleadoApellido(e.target.value)} required className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"/>
                       </div>
                       <div className="space-y-2">
                         <label htmlFor="newEmpleadoCedula" className="block text-sm font-bold text-gray-700">Cédula</label>
                         <input type="text" id="newEmpleadoCedula" value={newEmpleadoCedula} onChange={e => setNewEmpleadoCedula(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"/>
                       </div>
                       <div className="space-y-2">
                         <label htmlFor="newEmpleadoCargo" className="block text-sm font-bold text-gray-700">Cargo</label>
                         <input type="text" id="newEmpleadoCargo" value={newEmpleadoCargo} onChange={e => setNewEmpleadoCargo(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"/>
                       </div>
                       <div className="space-y-2">
                         <label htmlFor="newEmpleadoArea" className="block text-sm font-bold text-gray-700">Área</label>
                         <input type="text" id="newEmpleadoArea" value={newEmpleadoArea} onChange={e => setNewEmpleadoArea(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"/>
                       </div>
                       <div className="space-y-2">
                         <label htmlFor="newEmpleadoCorreo" className="block text-sm font-bold text-gray-700">Correo Electrónico</label>
                         <input type="email" id="newEmpleadoCorreo" value={newEmpleadoCorreo} onChange={e => setNewEmpleadoCorreo(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg"/>
                       </div>
                     </div>
                  </div>
                )}

                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-purple-200">
                    <span className="text-2xl mr-2"></span>
                    <h3 className="text-xl font-bold text-gray-800">Recibido a Satisfacción</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="fechaRecibido" className="block text-sm font-bold text-gray-700">
                           Fecha
                        </label>
                        <input type="date" id="fechaRecibido" value={fechaRecibido} onChange={(e) => setFechaRecibido(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="horaRecibido" className="block text-sm font-bold text-gray-700">
                           Hora
                        </label>
                        <input type="time" id="horaRecibido" value={horaRecibido} onChange={(e) => setHoraRecibido(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-bold text-gray-700">
                         Firma de quien recibe
                      </label>
                      <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                        <SignatureCanvas ref={sigCanvasUsuario} canvasProps={{className: 'w-full h-24 border border-gray-200 rounded'}} />
                      </div>
                      <button type="button" onClick={() => clearSignature(sigCanvasUsuario)} className="text-sm text-red-600 hover:text-red-700 font-semibold">
                         Limpiar firma
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-orange-200">
                    <span className="text-2xl mr-2"></span>
                    <h3 className="text-xl font-bold text-gray-800">Datos de Jefe Inmediato</h3>
                    <span className="ml-2 text-sm text-gray-500">(Opcional)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="nombreJefe" className="block text-sm font-bold text-gray-700">
                         Nombre
                      </label>
                      <input type="text" id="nombreJefe" value={nombreJefe} onChange={(e) => setNombreJefe(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="cargoJefe" className="block text-sm font-bold text-gray-700">
                         Cargo
                      </label>
                      <input type="text" id="cargoJefe" value={cargoJefe} onChange={(e) => setCargoJefe(e.target.value)} className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"/>
                    </div>

                    <div className="md:col-span-2 space-y-2">
                      <label className="block text-sm font-bold text-gray-700">
                         Firma del Jefe Inmediato
                      </label>
                      <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                        <SignatureCanvas ref={sigCanvasJefe} canvasProps={{className: 'w-full h-24 border border-gray-200 rounded'}} />
                      </div>
                      <button type="button" onClick={() => clearSignature(sigCanvasJefe)} className="text-sm text-red-600 hover:text-red-700 font-semibold">
                        Limpiar firma
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center mb-5 pb-3 border-b-2 border-red-200">
                    <span className="text-2xl mr-2"></span>
                    <h3 className="text-xl font-bold text-gray-800">Compromiso</h3>
                  </div>
                  
                  <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-l-4 border-orange-400 mb-4">
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Declaro haber recibido el equipo descrito y me comprometo a mantenerlo en buen estado. Notificaré de inmediato al área de TI cualquier falla para su atención. Autorizo el descuento del valor del equipo en caso de daños, pérdidas o uso indebido, y asumo la responsabilidad de aplicar las medidas necesarias para su cuidado y seguridad.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700">
                       Firma de leído y entendido
                    </label>
                    <div className="border-2 border-gray-300 rounded-lg p-2 bg-white">
                      <SignatureCanvas ref={sigCanvasCompromiso} canvasProps={{className: 'w-full h-24 border border-gray-200 rounded'}} />
                    </div>
                    <button type="button" onClick={() => clearSignature(sigCanvasCompromiso)} className="text-sm text-red-600 hover:text-red-700 font-semibold">
                       Limpiar firma
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="observacionesUsuario" className="block text-sm font-bold text-gray-700">
                     Observaciones del Colaborador
                    <span className="ml-2 text-sm text-gray-500 font-normal">(Opcional)</span>
                  </label>
                  <textarea id="observacionesUsuario" value={observacionesUsuario} onChange={(e) => setObservacionesUsuario(e.target.value)} rows={3} placeholder="Cualquier observación adicional..." className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all resize-none"></textarea>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t-2 border-gray-200">
              <button type="button" onClick={() => router.back()} className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2">
                <span></span>
                <span>Cancelar</span>
              </button>
              <button type="submit" className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
                    <span>Registrando...</span>
                  </>
                ) : (
                  <>
                    <span></span>
                    <span>Registrar Equipo</span>
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