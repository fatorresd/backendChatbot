import { Router, Request, Response } from 'express';
import { openaiService } from '../services/openaiService';
import { appointmentService } from '../services/appointmentService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

interface ChatRequest {
    message: string;
}

interface ChatResponse {
    success: boolean;
    response: string;
    intent?: string;
    action?: string;
    data?: Record<string, string>;
    appointmentData?: any;
    showUpdateForm?: boolean; 
    currentAppointment?: any;
    error?: string;
}

// POST /api/chat - Procesar mensaje con OpenAI
router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
        const { message } = req.body as ChatRequest;

        if (!message || !message.trim()) {
            res.status(400).json({
                success: false,
                error: 'El mensaje no puede estar vacío',
            } as ChatResponse);
            return;
        }

        // Obtener todas las citas (contexto)
        const appointments = appointmentService.getAllAppointments();

        // Procesar mensaje con OpenAI
        const processedRequest = await openaiService.processMessage(message, appointments);

        let appointmentData = null;
        let finalResponse = processedRequest.response;

        try {
            switch (processedRequest.intent) {
                case 'create':
                    if (processedRequest.data && 
                        processedRequest.data.paciente && 
                        processedRequest.data.especialidad &&
                        processedRequest.data.fecha && 
                        processedRequest.data.hora && 
                        processedRequest.data.doctor) {
                        
                        appointmentData = appointmentService.createAppointment({
                            paciente: processedRequest.data.paciente,
                            especialidad: processedRequest.data.especialidad,
                            fecha: processedRequest.data.fecha,
                            hora: processedRequest.data.hora,
                            doctor: processedRequest.data.doctor,
                            notas: processedRequest.data.notas || ''
                        });
                        
                        finalResponse = `✅ ¡Cita creada exitosamente!\n\n` +
                            `📋 Detalles:\n` +
                            `- Paciente: ${appointmentData.paciente}\n` +
                            `- Especialidad: ${appointmentData.especialidad}\n` +
                            `- Fecha: ${appointmentData.fecha}\n` +
                            `- Hora: ${appointmentData.hora}\n` +
                            `- Doctor: ${appointmentData.doctor}\n` +
                            `- Estado: ${appointmentData.estado}\n\n` +
                            `ID de cita: ${appointmentData.id}`;
                    } else {
                        finalResponse = processedRequest.response + 
                            "\n\n⚠️ Necesito más información para crear la cita. Por favor proporciona:\n" +
                            "- Nombre del paciente\n" +
                            "- Especialidad\n" +
                            "- Fecha (YYYY-MM-DD)\n" +
                            "- Hora (HH:MM)\n" +
                            "- Nombre del doctor";
                    }
                    break;

                case 'view':
                    const allAppointments = appointmentService.getAllAppointments();
                    if (allAppointments.length > 0) {
                        finalResponse = `📅 Tienes ${allAppointments.length} cita(s):\n\n` +
                            allAppointments.map((apt, index) => 
                                `${index + 1}. ${apt.paciente} - ${apt.especialidad}\n` +
                                `   📍 ${apt.fecha} a las ${apt.hora}\n` +
                                `   👨‍⚕️ ${apt.doctor}\n` +
                                `   📊 Estado: ${apt.estado}\n` +
                                `   🆔 ID: ${apt.id}\n`
                            ).join('\n');
                        appointmentData = allAppointments;
                    } else {
                        finalResponse = "📭 No tienes citas agendadas actualmente.";
                    }
                    break;

                case 'update':
                    // Para actualizar necesitamos el ID de la cita
                    if (processedRequest.data?.id) {
                        // Obtener la cita actual
                        const currentAppointment = appointmentService.getAppointmentById(processedRequest.data.id);
                        
                        // Si solo se proporciona el ID, mostrar formulario con datos actuales
                        if (Object.keys(processedRequest.data).length === 1) {
                            finalResponse = `📋 Cita actual:\n\n` +
                                `- Paciente: ${currentAppointment.paciente}\n` +
                                `- Especialidad: ${currentAppointment.especialidad}\n` +
                                `- Fecha: ${currentAppointment.fecha}\n` +
                                `- Hora: ${currentAppointment.hora}\n` +
                                `- Doctor: ${currentAppointment.doctor}\n` +
                                `- Estado: ${currentAppointment.estado}\n\n` +
                                `🔧 ¿Qué deseas modificar? Puedes cambiar la fecha, hora, doctor o especialidad.`;
                            
                            res.json({
                                success: true,
                                response: finalResponse,
                                intent: processedRequest.intent,
                                action: processedRequest.action,
                                data: processedRequest.data,
                                showUpdateForm: true,
                                currentAppointment: currentAppointment,
                            } as ChatResponse);
                            return;
                        }
                        
                        // Si hay datos adicionales, realizar la actualización
                        const updates: any = {};
                        if (processedRequest.data.fecha) updates.fecha = processedRequest.data.fecha;
                        if (processedRequest.data.hora) updates.hora = processedRequest.data.hora;
                        if (processedRequest.data.doctor) updates.doctor = processedRequest.data.doctor;
                        if (processedRequest.data.especialidad) updates.especialidad = processedRequest.data.especialidad;
                        if (processedRequest.data.estado) updates.estado = processedRequest.data.estado;
                        
                        appointmentData = appointmentService.updateAppointment(
                            processedRequest.data.id,
                            updates
                        );
                        
                        finalResponse = `✅ ¡Cita actualizada exitosamente!\n\n` +
                            `📋 Nuevos detalles:\n` +
                            `- Paciente: ${appointmentData.paciente}\n` +
                            `- Especialidad: ${appointmentData.especialidad}\n` +
                            `- Fecha: ${appointmentData.fecha}\n` +
                            `- Hora: ${appointmentData.hora}\n` +
                            `- Doctor: ${appointmentData.doctor}\n` +
                            `- Estado: ${appointmentData.estado}`;
                    } else {
                        // Si no hay ID, listar las citas para que el usuario elija
                        const allAppointments = appointmentService.getAllAppointments();
                        if (allAppointments.length > 0) {
                            finalResponse = processedRequest.response + 
                                "\n\n📅 Citas disponibles para modificar:\n\n" +
                                allAppointments.map((apt, index) => 
                                    `${index + 1}. ${apt.paciente} - ${apt.especialidad}\n` +
                                    `   📍 ${apt.fecha} a las ${apt.hora}\n` +
                                    `   👨‍⚕️ ${apt.doctor}\n` +
                                    `   🆔 ID: ${apt.id}\n`
                                ).join('\n') +
                                "\n\n💡 Dime el ID de la cita que deseas modificar.";
                            appointmentData = allAppointments;
                        } else {
                            finalResponse = "📭 No tienes citas para modificar.";
                        }
                    }
                    break;

                case 'delete':
                    if (processedRequest.data?.id) {
                        appointmentService.deleteAppointment(processedRequest.data.id);
                        finalResponse = `✅ Cita con ID ${processedRequest.data.id} eliminada exitosamente.`;
                    } else {
                        finalResponse = processedRequest.response + 
                            "\n\n⚠️ Para eliminar una cita, necesito el ID. " +
                            "Puedes ver tus citas con 'ver mis citas' para obtener el ID.";
                    }
                    if (processedRequest.data?.id) {
                        const id = String(processedRequest.data.id).trim();
                        console.log('[DELETE] solicitada ID ->', id);
                        // Log antes
                        try {
                            const existsBefore = !!appointmentService.getAppointmentById(id);
                            console.log('[DELETE] existe antes?:', existsBefore);
                        } catch { console.log('[DELETE] existe antes?: false'); }

                        appointmentService.deleteAppointment(id);

                        try {
                            appointmentService.getAppointmentById(id);
                            console.log('[DELETE] sigue existiendo tras delete -> true');
                        } catch {
                            console.log('[DELETE] existe después?: false (borrado OK)');
                        }

                        finalResponse = `✅ Cita con ID ${id} eliminada exitosamente.`;
                    } else {
                        finalResponse = processedRequest.response + 
                            "\n\n⚠️ Para eliminar una cita, necesito el ID. " +
                            "Puedes ver tus citas con 'ver mis citas' para obtener el ID.";
                }
                    break;

                case 'search':
                    // Búsqueda por diferentes criterios
                    if (processedRequest.data?.doctor) {
                        appointmentData = appointmentService.getAppointmentsByDoctor(processedRequest.data.doctor);
                    } else if (processedRequest.data?.especialidad) {
                        appointmentData = appointmentService.getAppointmentsBySpecialty(processedRequest.data.especialidad);
                    } else if (processedRequest.data?.fecha) {
                        appointmentData = appointmentService.getAppointmentsByDate(processedRequest.data.fecha);
                    }
                    
                    if (appointmentData && appointmentData.length > 0) {
                        finalResponse = `🔍 Encontré ${appointmentData.length} cita(s):\n\n` +
                            appointmentData.map((apt: any, index: number) => 
                                `${index + 1}. ${apt.paciente} - ${apt.especialidad}\n` +
                                `   📍 ${apt.fecha} a las ${apt.hora}\n` +
                                `   👨‍⚕️ ${apt.doctor}\n` +
                                `   🆔 ID: ${apt.id}\n`
                            ).join('\n');
                    } else {
                        finalResponse = "🔍 No encontré citas con esos criterios.";
                    }
                    break;

                default:
                    // Para 'help' o 'unknown', usar la respuesta de OpenAI
                    finalResponse = processedRequest.response;
            }
        } catch (error: any) {
            finalResponse = `❌ Error: ${error.message}\n\n${processedRequest.response}`;
        }

        const response: ChatResponse = {
            success: true,
            response: finalResponse,
            intent: processedRequest.intent,
            action: processedRequest.action,
            data: processedRequest.data,
            appointmentData: appointmentData,
        };

        res.json(response);
    })
);

export default router;