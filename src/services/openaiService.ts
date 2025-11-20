import OpenAI from 'openai';
import { Appointment } from '../types/appointment';

console.log('================================');
console.log(' DEBUG OPENAI SERVICE');
console.log('================================');
console.log('API Key existe?:', !!process.env.OPENAI_API_KEY);
console.log('API Key length:', process.env.OPENAI_API_KEY?.length);
console.log('API Key primeros 20 chars:', process.env.OPENAI_API_KEY?.substring(0, 20));
console.log('API Key tiene espacios?:', process.env.OPENAI_API_KEY?.includes(' '));
console.log('================================\n');

const apiKey = process.env.OPENAI_API_KEY || 'apikey';

if (!apiKey) {
    console.error(' ERROR: No se encontró OPENAI_API_KEY');
    throw new Error('OPENAI_API_KEY no está configurada');
}

const openai = new OpenAI({
    apiKey: apiKey,
});

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface ProcessedRequest {
    intent: 'create' | 'view' | 'update' | 'delete' | 'search' | 'help' | 'unknown';
    action: string;
    data?: Record<string, string>;
    response: string;
}

class OpenAIService {
    private conversationHistory: ChatMessage[] = [];

    private systemPrompt = `Eres un asistente médico amable y profesional que ayuda a gestionar citas médicas.

IMPORTANTE: Cuando el usuario quiera agendar una cita, debes extraer y confirmar TODOS estos datos:
- Nombre del paciente
- Especialidad médica
- Fecha (formato YYYY-MM-DD)
- Hora (formato HH:MM en 24 horas)
- Nombre completo del doctor (con Dr./Dra.)

Si falta algún dato, pregunta específicamente por él.

PARA MODIFICAR CITAS:
- El usuario debe proporcionar el ID de la cita
- Puedes preguntar "¿Qué cita deseas modificar?" si no especifica el ID
- Extrae los campos que el usuario quiere cambiar
- Responde con el formato JSON incluyendo el ID y los campos a actualizar

Responde SIEMPRE en este formato JSON cuando detectes una intención de agendar:
{
    "intent": "create",
    "paciente": "nombre completo",
    "especialidad": "nombre especialidad",
    "fecha": "YYYY-MM-DD",
    "hora": "HH:MM",
    "doctor": "Dr./Dra. Nombre",
    "response": "mensaje amable confirmando"
}

Para actualizar:
{
    "intent": "update",
    "id": "ID_de_la_cita",
    "fecha": "nueva fecha si aplica",
    "hora": "nueva hora si aplica",
    "doctor": "nuevo doctor si aplica",
    "especialidad": "nueva especialidad si aplica",
    "response": "mensaje explicando el cambio"
}

Especialidades disponibles: Cardiología, Dermatología, Oftalmología, Neurología, General, Pediatría, Cirugía.`;

    async processMessage(userMessage: string, appointments: Appointment[]): Promise<ProcessedRequest> {
        this.conversationHistory.push({
            role: 'user',
            content: userMessage,
        });

        const appointmentsContext =
            appointments.length > 0
                ? `\n\nCitas actuales:\n${appointments
                    .map(
                        (apt) =>
                            `- ID: ${apt.id}, ${apt.fecha} ${apt.hora}: ${apt.doctor} (${apt.especialidad}) - ${apt.paciente} [${apt.estado}]`
                    )
                    .join('\n')}`
                : '\n\nNo hay citas agendadas.';

        try {
            const response = await openai.chat.completions.create({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: this.systemPrompt },
                    ...this.conversationHistory,
                    { role: 'user', content: `Contexto: ${appointmentsContext}` },
                ],
                temperature: 0.3,
                max_tokens: 800,
            });

            const assistantMessage =
                response.choices[0]?.message?.content || 'No pude procesar tu mensaje.';

            console.log(' Respuesta de OpenAI:', assistantMessage);

            this.conversationHistory.push({
                role: 'assistant',
                content: assistantMessage,
            });

            if (this.conversationHistory.length > 20) {
                this.conversationHistory = this.conversationHistory.slice(-20);
            }

            // Intentar parsear como JSON primero
            let extractedData: Record<string, string> = {};
            let intentFromAI = this.determineIntent(userMessage);
            let responseText = assistantMessage;

            try {
                // Buscar JSON en la respuesta
                const jsonMatch = assistantMessage.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    const parsed = JSON.parse(jsonMatch[0]);
                   // Extraer datos comunes para create/update/delete si vienen en JSON
                    if (parsed.intent === 'create' || parsed.intent === 'update' || parsed.intent === 'delete') {
                        intentFromAI = parsed.intent;
                        if (parsed.id) extractedData.id = String(parsed.id).trim();
                        if (parsed.paciente) extractedData.paciente = parsed.paciente;
                        if (parsed.especialidad) extractedData.especialidad = parsed.especialidad;
                        if (parsed.fecha) extractedData.fecha = parsed.fecha;
                        if (parsed.hora) extractedData.hora = parsed.hora;
                        if (parsed.doctor) extractedData.doctor = parsed.doctor;
                        responseText = parsed.response || assistantMessage;
                    }
                        if (parsed.intent === 'create') {
                        intentFromAI = 'create';
                        extractedData = {
                            paciente: parsed.paciente || '',
                            especialidad: parsed.especialidad || '',
                            fecha: parsed.fecha || '',
                            hora: parsed.hora || '',
                            doctor: parsed.doctor || '',
                        };
                        responseText = parsed.response || assistantMessage;
                    }
                }
            } catch (e) {
                // Si no es JSON, extraer manualmente
                console.log(' No se encontró JSON, extrayendo manualmente...');
                extractedData = this.extractAppointmentData(userMessage, assistantMessage);
            }

            console.log(' Intent detectado:', intentFromAI);
            console.log(' Datos extraídos:', extractedData);

            return {
                intent: intentFromAI,
                action: this.getAction(intentFromAI),
                data: extractedData,
                response: responseText,
            };
        } catch (error) {
            console.error(' OpenAI Error:', error);
            throw new Error('Error al procesar el mensaje con OpenAI');
        }
    }

    private determineIntent(message: string): ProcessedRequest['intent'] {
        const lowerMessage = message.toLowerCase();

        if (
            lowerMessage.includes('agendar') ||
            lowerMessage.includes('nueva cita') ||
            lowerMessage.includes('quiero una cita') ||
            lowerMessage.includes('reservar') ||
            lowerMessage.includes('programar') ||
            lowerMessage.includes('crear')
        ) {
            return 'create';
        }

        if (
            lowerMessage.includes('ver') ||
            lowerMessage.includes('mis citas') ||
            lowerMessage.includes('cuáles son') ||
            lowerMessage.includes('tengo') ||
            lowerMessage.includes('mostrar') ||
            lowerMessage.includes('listar')
        ) {
            return 'view';
        }

        if (
            lowerMessage.includes('cambiar') ||
            lowerMessage.includes('modificar') ||
            lowerMessage.includes('actualizar') ||
            lowerMessage.includes('reprogramar') ||
            lowerMessage.includes('editar') ||
            lowerMessage.includes('mover')
        ) {
            return 'update';
        }

        if (
            lowerMessage.includes('cancelar') ||
            lowerMessage.includes('eliminar') ||
            lowerMessage.includes('borrar') ||
            lowerMessage.includes('quitar')
        ) {
            return 'delete';
        }

        if (
            lowerMessage.includes('buscar') ||
            lowerMessage.includes('especialidades') ||
            lowerMessage.includes('disponible') ||
            lowerMessage.includes('encontrar')
        ) {
            return 'search';
        }

        if (
            lowerMessage.includes('ayuda') ||
            lowerMessage.includes('qué puedes') ||
            lowerMessage.includes('cómo funciona') ||
            lowerMessage.includes('ayúdame')
        ) {
            return 'help';
        }

        return 'unknown';
    }

    private extractAppointmentData(userMessage: string, aiResponse: string): Record<string, string> {
        const data: Record<string, string> = {};
        const combinedText = `${userMessage} ${aiResponse}`.toLowerCase();

        // Extraer ID (mejorado)
        const idPatterns = [
            /\b(?:id|cita|número)[\s:]+(\d+)\b/i,
            /\bcita\s+(\d+)\b/i,
            /\b(\d+)\b/,  // Cualquier número si no se encuentra otro patrón
        ];
        
        for (const pattern of idPatterns) {
            const match = userMessage.match(pattern);
            if (match) {
                data.id = match[1];
                break;
            }
        }

        // Extraer estado
        const estados = ['pendiente', 'confirmada', 'cancelada', 'completada'];
        estados.forEach((estado) => {
            if (combinedText.includes(estado)) {
                data.estado = estado;
            }
        });

        // Extraer doctor (más flexible)
        const doctorPatterns = [
            /(?:doctor|dr\.?|dra\.?)\s+([a-záéíóúñ]+(?:\s+[a-záéíóúñ]+)?)/i,
            /(?:con|con el|con la)\s+(?:doctor|dr\.?|dra\.?)\s+([a-záéíóúñ]+)/i,
        ];

        for (const pattern of doctorPatterns) {
            const match = userMessage.match(pattern);
            if (match) {
                const doctorName = match[1].trim();
                data.doctor = doctorName.startsWith('Dr') ? doctorName : `Dr. ${doctorName}`;
                break;
            }
        }

        // Extraer fecha (múltiples formatos)
        const datePatterns = [
            /(\d{4}-\d{2}-\d{2})/,
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
            /(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i,
        ];

        for (const pattern of datePatterns) {
            const match = userMessage.match(pattern);
            if (match) {
                if (match[0].includes('-')) {
                    data.fecha = match[0];
                } else if (match[0].includes('/')) {
                    const [, day, month, year] = match;
                    data.fecha = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                }
                break;
            }
        }

        // Extraer hora (más flexible)
        const timePatterns = [
            /(\d{1,2}):(\d{2})/,
            /(\d{1,2})\s*(?:de\s+la\s+)?(mañana|tarde|noche)/i,
            /a\s+las\s+(\d{1,2})/i,
        ];

        for (const pattern of timePatterns) {
            const match = userMessage.match(pattern);
            if (match) {
                if (match[0].includes(':')) {
                    data.hora = match[0];
                } else {
                    let hour = parseInt(match[1]);
                    if (match[2]) {
                        const period = match[2].toLowerCase();
                        if (period === 'tarde' && hour < 12) hour += 12;
                        if (period === 'noche' && hour < 12) hour += 12;
                    }
                    data.hora = `${hour.toString().padStart(2, '0')}:00`;
                }
                break;
            }
        }

        // Extraer especialidad
        const especialidades = [
            'Cardiología',
            'Dermatología',
            'Oftalmología',
            'Neurología',
            'General',
            'Pediatría',
            'Cirugía',
        ];

        especialidades.forEach((esp) => {
            if (combinedText.includes(esp.toLowerCase())) {
                data.especialidad = esp;
            }
        });

        return data;
    }

    private getAction(intent: ProcessedRequest['intent']): string {
        const actions: Record<ProcessedRequest['intent'], string> = {
            create: 'create_appointment',
            view: 'view_appointments',
            update: 'update_appointment',
            delete: 'delete_appointment',
            search: 'search_appointments',
            help: 'show_help',
            unknown: 'ask_clarification',
        };

        return actions[intent];
    }

    clearHistory(): void {
        this.conversationHistory = [];
    }
}

export const openaiService = new OpenAIService();