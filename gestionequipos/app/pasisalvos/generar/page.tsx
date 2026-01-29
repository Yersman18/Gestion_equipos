'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { fetchAuthenticated } from '@/app/utils/api';
import { EmpleadoSelector } from '@/components/EmpleadoSelector';
import { useSede } from '@/app/context/SedeContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Empleado {
    id: number;
    nombre: string;
    apellido: string;
    cedula: string;
    cargo: string;
    area: string;
    ciudad?: string;
    fecha_ingreso?: string;
    fecha_retiro?: string;
}

interface EquipmentItem {
    tipo: string;
    marca_modelo: string;
    serial: string;
    accesorios: string;
    estado: string;
    observaciones: string;
}

const GenerarPasisalvoPage = () => {
    const router = useRouter();
    const { sedeActiva } = useSede();
    const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<number | ''>('');
    const [empleadoData, setEmpleadoData] = useState<Empleado | null>(null);
    const [equipmentList, setEquipmentList] = useState<EquipmentItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [statusInfo, setStatusInfo] = useState<any>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Campos editables del colaborador
    const [ciudad, setCiudad] = useState('');
    const [fechaIngreso, setFechaIngreso] = useState('');
    const [fechaRetiro, setFechaRetiro] = useState('');

    useEffect(() => {
        if (selectedEmpleadoId) {
            fetchClearanceInfo(selectedEmpleadoId);
        } else {
            setEmpleadoData(null);
            setEquipmentList([]);
            setStatusInfo(null);
        }
    }, [selectedEmpleadoId]);

    const fetchClearanceInfo = async (id: number) => {
        setLoading(true);
        try {
            const data = await fetchAuthenticated(`/api/pasisalvos/empleado/${id}/info/`);
            setStatusInfo(data);
            setEmpleadoData(data.empleado);
            setCiudad(data.empleado.ciudad || '');
            setFechaIngreso(data.empleado.fecha_ingreso || '');
            setFechaRetiro(data.empleado.fecha_retiro || '');

            const list: EquipmentItem[] = data.entregados_historial.map((h: any) => ({
                tipo: 'Equipo',
                marca_modelo: h.equipo_nombre,
                serial: h.equipo_serial,
                accesorios: 'Cargador, Mouse (N/A)',
                estado: 'Funcional',
                observaciones: h.observacion_devolucion || ''
            }));
            setEquipmentList(list);

        } catch (err: any) {
            alert(`Error al obtener info: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEquipment = () => {
        setEquipmentList([...equipmentList, { tipo: '', marca_modelo: '', serial: '', accesorios: '', estado: '', observaciones: '' }]);
    };

    const handleUpdateEquipment = (index: number, field: keyof EquipmentItem, value: string) => {
        const newList = [...equipmentList];
        newList[index][field] = value;
        setEquipmentList(newList);
    };

    const handleRemoveEquipment = (index: number) => {
        setEquipmentList(equipmentList.filter((_, i) => i !== index));
    };

    const generatePDF = () => {
        if (!empleadoData) return;

        const doc = new jsPDF() as any;
        const pageWidth = doc.internal.pageSize.getWidth();
        const primaryColor: [number, number, number] = [21, 128, 61];

        const logo = new Image();
        logo.src = '/img/logo.png';

        logo.onload = () => {
            doc.addImage(logo, 'PNG', 20, 12, 35, 12);

            // Cuadro estilizado para el código de control (Arriba Izquierda)
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFillColor(240, 253, 244); // Verde muy suave
            doc.roundedRect(20, 26, 40, 10, 1, 1, 'FD');
            doc.setFontSize(7);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('CONTROL DE CALIDAD', 22, 30);
            doc.setFontSize(8);
            doc.text('FORM-GTI-017 - V1', 22, 34);

            doc.setFontSize(22);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('INTEGRA S.A.S.', pageWidth - 20, 20, { align: 'right' });
            doc.setFontSize(14);
            doc.setTextColor(100);
            doc.text('Paz y Salvo – Área de Tecnología', pageWidth - 20, 30, { align: 'right' });
            doc.setFontSize(9);
            doc.text(`Fecha de generación automática: ${format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}`, pageWidth - 20, 38, { align: 'right' });
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(1.5);
            doc.line(20, 45, pageWidth - 20, 45);

            doc.setFontSize(11);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('1. INFORMACIÓN DEL COLABORADOR', 20, 55);

            doc.setFontSize(10);
            doc.setTextColor(50);
            doc.setFont('helvetica', 'normal');
            const colInfoY = 65;
            const leftCol = 25;
            const rightCol = 110;
            doc.text(`Nombre Completo: ${empleadoData.nombre} ${empleadoData.apellido}`, leftCol, colInfoY);
            doc.text(`Número de Documento: ${empleadoData.cedula}`, leftCol, colInfoY + 7);
            doc.text(`Cargo: ${empleadoData.cargo}`, leftCol, colInfoY + 14);
            doc.text(`Área o Proceso: ${empleadoData.area}`, leftCol, colInfoY + 21);
            doc.text(`Ciudad: ${ciudad}`, rightCol, colInfoY);
            doc.text(`Fecha de Ingreso: ${fechaIngreso ? format(new Date(fechaIngreso), 'dd/MM/yyyy') : 'N/A'}`, rightCol, colInfoY + 7);
            doc.text(`Fecha de Retiro: ${fechaRetiro ? format(new Date(fechaRetiro), 'dd/MM/yyyy') : 'N/A'}`, rightCol, colInfoY + 14);

            doc.setFontSize(11);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('2. EQUIPOS TECNOLÓGICOS ENTREGADOS', 20, 100);

            const tableData = equipmentList.map(item => [item.tipo, item.marca_modelo, item.serial, item.accesorios, item.estado, item.observaciones]);
            autoTable(doc, {
                startY: 105,
                head: [['Tipo de Activo', 'Marca y Modelo', 'N° Serie', 'Accesorios', 'Estado', 'Observaciones']],
                body: tableData,
                theme: 'grid',
                headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 9 },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: { 0: { cellWidth: 25 }, 1: { cellWidth: 35 }, 2: { cellWidth: 25 }, 3: { cellWidth: 30 }, 4: { cellWidth: 20 }, 5: { cellWidth: 'auto' } }
            });

            const finalY = (doc as any).lastAutoTable.finalY + 15;
            doc.setFontSize(11);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('ORDEN DE PAZ Y SALVO:', 20, finalY);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            const declaration = `Por medio de la presente, el área de Tecnología de INTEGRA S.A.S. certifica que el colaborador mencionado anteriormente ha realizado la entrega formal de los activos tecnológicos que se encontraban bajo su responsabilidad. Tras la revisión técnica satisfactoria, se declara que el colaborador queda a PAZ Y SALVO con el departamento de TI en lo referente a la devolución de equipos y elementos de trabajo.`;
            const splitText = doc.splitTextToSize(declaration, pageWidth - 40);
            doc.text(splitText, 20, finalY + 7);

            const signatureY = finalY + 50;
            doc.setDrawColor(200);

            // Columna Izquierda: Firma Colaborador
            doc.line(20, signatureY, 85, signatureY);
            doc.setTextColor(50);
            doc.text('Firma del Colaborador', 20, signatureY + 5);
            doc.text(`CC: ${empleadoData.cedula}`, 20, signatureY + 10);

            // Área de Fecha Manual Estilizada (Llamativa)
            doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setLineWidth(0.5);
            doc.line(20, signatureY + 22, 85, signatureY + 22);
            doc.setFontSize(8);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('FECHA DE FIRMA (Día / Mes / Año):', 20, signatureY + 18);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(150);
            doc.text('      /      / 202__', 70, signatureY + 18);

            // Columna Derecha: Firma TI
            doc.setFontSize(10);
            doc.line(115, signatureY, 190, signatureY);
            doc.text('Nombre y Firma Responsable TI', 115, signatureY + 5);
            doc.text('Área de Tecnología', 115, signatureY + 10);

            doc.setFontSize(8);
            doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
            doc.text(`Este documento certifica únicamente la devolución física de activos tecnológicos.`, pageWidth / 2, signatureY + 35, { align: 'center' });

            doc.save(`Paz_y_Salvo_${empleadoData.nombre}_${empleadoData.apellido}.pdf`);
        };

        logo.onerror = () => {
            alert("No se pudo cargar el logo. Se generará el PDF sin él.");
            generatePDF(); // Reintentar sin el logo
        };
    };

    const handleGeneratePazYSalvo = async () => {
        if (!selectedEmpleadoId || !statusInfo) {
            alert("Por favor, seleccione un colaborador.");
            return;
        }

        setIsSubmitting(true);

        const isApproved = statusInfo.esta_a_paz_y_salvo;
        let pendingDetails = '';
        if (!isApproved) {
            const { equipos, perifericos } = statusInfo.pendientes;
            const equipoDetails = equipos.map((e: any) => `Equipo: ${e.nombre} (${e.serial})`).join(', ');
            const perifericoDetails = perifericos.map((p: any) => `Periférico: ${p.nombre} (${p.tipo})`).join(', ');
            pendingDetails = `Pendientes: ${[equipoDetails, perifericoDetails].filter(Boolean).join('; ')}`;
        }

        const payload = {
            colaborador: selectedEmpleadoId,
            estado: isApproved ? 'Aprobado' : 'Con Pendientes',
            detalles_pendientes: pendingDetails,
            sede: statusInfo.empleado.sede || null, // Asignamos la sede del colaborador al paz y salvo
        };

        try {
            await fetchAuthenticated('/api/pasisalvos/', {
                method: 'POST',
                body: JSON.stringify(payload)
            });

            alert('Paz y salvo registrado exitosamente. Ahora se generará el PDF.');
            generatePDF();
            router.push('/pasisalvos');
        } catch (error: any) {
            alert(`Error al registrar el paz y salvo: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };


    return (
        <Layout>
            <div className="max-w-5xl mx-auto px-4 py-8">
                <div className="mb-8">
                    <div className="flex items-center mb-2">
                        <span className="text-4xl mr-3">✨</span>
                        <h1 className="text-3xl font-black text-gray-800">Generar Paz y Salvo de TI</h1>
                    </div>
                    <p className="text-gray-600 ml-14">Completa la información para generar el documento formal de entrega de equipos.</p>
                </div>

                <div className="space-y-8">
                    {/* 1. Selección de Empleado */}
                    <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                            <span className="bg-blue-100 text-blue-600 w-8 h-8 flex items-center justify-center rounded-full text-sm">1</span>
                            Seleccionar Colaborador
                        </h2>
                        <EmpleadoSelector
                            selectedEmpleadoId={selectedEmpleadoId}
                            onSelectEmpleado={setSelectedEmpleadoId}
                            onEmpleadoChange={() => { }}
                            sedeId={sedeActiva?.id !== 0 ? sedeActiva?.id : undefined}
                        />

                        {statusInfo && !statusInfo.esta_a_paz_y_salvo && (
                            <div className="mt-4 p-4 bg-amber-50 border-l-4 border-amber-500 rounded-lg">
                                <p className="text-amber-800 font-bold">⚠️ Atención: El colaborador aún tiene equipos asignados.</p>
                                <p className="text-amber-700 text-sm">Debe devolver todos los equipos y periféricos en el módulo de inventario antes de quedar formalmente a paz y salvo.</p>
                            </div>
                        )}
                    </section>

                    {empleadoData && (
                        <>
                            {/* 2. Información Adicional */}
                            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-600 w-8 h-8 flex items-center justify-center rounded-full text-sm">2</span>
                                    Información del Colaborador
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ciudad</label>
                                        <input type="text" value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fecha de Ingreso</label>
                                        <input type="date" value={fechaIngreso} onChange={(e) => setFechaIngreso(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fecha de Retiro</label>
                                        <input type="date" value={fechaRetiro} onChange={(e) => setFechaRetiro(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none" />
                                    </div>
                                </div>
                            </section>

                            {/* 3. Equipos Entregados */}
                            <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-600 w-8 h-8 flex items-center justify-center rounded-full text-sm">3</span>
                                        Equipos Tecnológicos Entregados
                                    </h2>
                                    <button onClick={handleAddEquipment} className="text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold text-sm transition-all border border-blue-100 italic">
                                        + Agregar equipo manualmente
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-xs font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                                <th className="py-3 px-2">Tipo</th>
                                                <th className="py-3 px-2">Marca/Modelo</th>
                                                <th className="py-3 px-2">Serial</th>
                                                <th className="py-3 px-2">Accesorios</th>
                                                <th className="py-3 px-2">Estado</th>
                                                <th className="py-3 px-2">Obs.</th>
                                                <th className="py-3 px-2"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {equipmentList.map((item, index) => (
                                                <tr key={index} className="group">
                                                    <td className="py-3 px-1"><input value={item.tipo} onChange={(e) => handleUpdateEquipment(index, 'tipo', e.target.value)} placeholder="Ej: Laptop" className="w-full text-xs font-bold p-2 bg-gray-50 rounded border-none focus:ring-1 focus:ring-blue-500" /></td>
                                                    <td className="py-3 px-1"><input value={item.marca_modelo} onChange={(e) => handleUpdateEquipment(index, 'marca_modelo', e.target.value)} placeholder="Ej: Dell Latitude" className="w-full text-xs p-2 bg-gray-50 rounded border-none" /></td>
                                                    <td className="py-3 px-1"><input value={item.serial} onChange={(e) => handleUpdateEquipment(index, 'serial', e.target.value)} placeholder="Serial" className="w-full text-xs font-mono p-2 bg-gray-50 rounded border-none" /></td>
                                                    <td className="py-3 px-1"><input value={item.accesorios} onChange={(e) => handleUpdateEquipment(index, 'accesorios', e.target.value)} placeholder="Ej: Cargador, Mouse" className="w-full text-xs p-2 bg-gray-50 rounded border-none" /></td>
                                                    <td className="py-3 px-1"><input value={item.estado} onChange={(e) => handleUpdateEquipment(index, 'estado', e.target.value)} placeholder="Funcional" className="w-full text-xs p-2 bg-gray-50 rounded border-none" /></td>
                                                    <td className="py-3 px-1"><input value={item.observaciones} onChange={(e) => handleUpdateEquipment(index, 'observaciones', e.target.value)} className="w-full text-xs p-2 bg-gray-50 rounded border-none" /></td>
                                                    <td className="py-3 px-1">
                                                        <button onClick={() => handleRemoveEquipment(index)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {equipmentList.length === 0 && (
                                                <tr>
                                                    <td colSpan={7} className="py-10 text-center text-gray-400 italic text-sm">
                                                        No hay equipos listados. Usa el historial o agrégalos manualmente.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </section>

                            {/* Botón de Generación */}
                            <div className="flex justify-end gap-4">
                                <button onClick={() => router.back()} className="px-8 py-4 text-gray-500 font-bold hover:text-gray-700 transition-all">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGeneratePazYSalvo}
                                    disabled={!statusInfo?.esta_a_paz_y_salvo || isSubmitting}
                                    className={`font-black py-4 px-12 rounded-2xl shadow-xl transition-all duration-300 flex items-center gap-3 ${statusInfo?.esta_a_paz_y_salvo && !isSubmitting
                                        ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-2xl hover:-translate-y-1'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                        }`}
                                    title={!statusInfo?.esta_a_paz_y_salvo ? "No se puede generar: El colaborador tiene activos pendientes" : ""}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            <span>Registrando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-2xl">📥</span>
                                            Generar y Registrar
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default GenerarPasisalvoPage;
