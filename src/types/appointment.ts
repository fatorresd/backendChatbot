export interface Appointment {
  id: string;
  paciente: string;
  especialidad: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:MM
  doctor: string;
  notas?: string;
  estado: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentDTO {
  paciente: string;
  especialidad: string;
  fecha: string;
  hora: string;
  doctor: string;
  notas?: string;
}

export interface UpdateAppointmentDTO {
  paciente?: string;
  especialidad?: string;
  fecha?: string;
  hora?: string;
  doctor?: string;
  notas?: string;
  estado?: 'pendiente' | 'confirmada' | 'cancelada' | 'completada';
}

export interface AppointmentResponse {
  success: boolean;
  data?: Appointment | Appointment[];
  message?: string;
  error?: string;
}