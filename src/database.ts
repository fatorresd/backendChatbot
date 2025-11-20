import type { Appointment } from './types/appointment';

class Database {
  private appointments: Map<string, Appointment> = new Map();

  constructor() {
    this.initializeWithMockData();
  }

  private initializeWithMockData(): void {
    const mockAppointments: Appointment[] = [
      {
        id: '1',
        paciente: 'Carlos López',
        especialidad: 'Cardiología',
        fecha: '2024-12-20',
        hora: '10:30',
        doctor: 'Dr. García',
        notas: 'Chequeo general',
        estado: 'confirmada',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '2',
        paciente: 'María Rodríguez',
        especialidad: 'Dermatología',
        fecha: '2024-12-21',
        hora: '14:00',
        doctor: 'Dra. Martínez',
        notas: 'Revisión de lunares',
        estado: 'pendiente',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: '3',
        paciente: 'Juan Pérez',
        especialidad: 'Oftalmología',
        fecha: '2024-12-19',
        hora: '09:00',
        doctor: 'Dr. Sánchez',
        notas: 'Examen de vista',
        estado: 'completada',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    mockAppointments.forEach((apt) => {
      this.appointments.set(apt.id, apt);
    });
  }

  getAllAppointments(): Appointment[] {
    return Array.from(this.appointments.values());
  }

  getAppointmentById(id: string): Appointment | null {
    return this.appointments.get(id) || null;
  }

  createAppointment(appointment: Appointment): Appointment {
    this.appointments.set(appointment.id, appointment);
    return appointment;
  }

  updateAppointment(id: string, updates: Partial<Appointment>): Appointment | null {
    const existing = this.appointments.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      id: existing.id, // Mantener el ID
      createdAt: existing.createdAt, // Mantener fecha de creación
      updatedAt: new Date(),
    };

    this.appointments.set(id, updated);
    return updated;
  }

  deleteAppointment(id: string): boolean {
    return this.appointments.delete(id);
  }

  getAppointmentsByDoctor(doctor: string): Appointment[] {
    return Array.from(this.appointments.values()).filter(
      (apt) => apt.doctor.toLowerCase() === doctor.toLowerCase()
    );
  }

  getAppointmentsBySpecialty(specialty: string): Appointment[] {
    return Array.from(this.appointments.values()).filter(
      (apt) => apt.especialidad.toLowerCase() === specialty.toLowerCase()
    );
  }

  getAppointmentsByDate(date: string): Appointment[] {
    return Array.from(this.appointments.values()).filter((apt) => apt.fecha === date);
  }

  getAppointmentsByPatient(patient: string): Appointment[] {
    return Array.from(this.appointments.values()).filter(
      (apt) => apt.paciente.toLowerCase() === patient.toLowerCase()
    );
  }
}

export const db = new Database();