import { db } from '../database';
import type {
  Appointment,
  CreateAppointmentDTO,
  UpdateAppointmentDTO,
} from '../types/appointment';

class AppointmentService {
  getAllAppointments(): Appointment[] {
    return db.getAllAppointments();
  }

  getAppointmentById(id: string): Appointment {
    const appointment = db.getAppointmentById(id);
    if (!appointment) {
      throw new Error(`Cita con ID ${id} no encontrada`);
    }
    return appointment;
  }

  createAppointment(data: CreateAppointmentDTO): Appointment {
    // Validar datos
    this.validateAppointmentData(data);

    // Validar que la fecha no sea en el pasado
    const appointmentDate = new Date(`${data.fecha}T${data.hora}`);
    if (appointmentDate < new Date()) {
      throw new Error('No se puede agendar una cita en el pasado');
    }

    const id = Date.now().toString();
    const appointment: Appointment = {
      id,
      paciente: data.paciente,
      especialidad: data.especialidad,
      fecha: data.fecha,
      hora: data.hora,
      doctor: data.doctor,
      notas: data.notas || '',
      estado: 'pendiente',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return db.createAppointment(appointment);
  }

  updateAppointment(id: string, updates: UpdateAppointmentDTO): Appointment {
    const existing = this.getAppointmentById(id);

    // Validar nuevos datos si se proporcionan
    if (updates.fecha || updates.hora) {
      const fecha = updates.fecha || existing.fecha;
      const hora = updates.hora || existing.hora;
      const appointmentDate = new Date(`${fecha}T${hora}`);

      if (appointmentDate < new Date()) {
        throw new Error('No se puede agendar una cita en el pasado');
      }
    }

    const updated = db.updateAppointment(id, {
      ...updates,
      updatedAt: new Date(),
    });

    if (!updated) {
      throw new Error(`No se pudo actualizar la cita ${id}`);
    }

    return updated;
  }

  deleteAppointment(id: string): void {
    const exists = this.getAppointmentById(id);
    if (!exists) {
      throw new Error(`Cita con ID ${id} no encontrada`);
    }

    const deleted = db.deleteAppointment(id);
    if (!deleted) {
      throw new Error(`No se pudo eliminar la cita ${id}`);
    }
  }

  getAppointmentsByDoctor(doctor: string): Appointment[] {
    return db.getAppointmentsByDoctor(doctor);
  }

  getAppointmentsBySpecialty(specialty: string): Appointment[] {
    return db.getAppointmentsBySpecialty(specialty);
  }

  getAppointmentsByDate(date: string): Appointment[] {
    return db.getAppointmentsByDate(date);
  }

  getAppointmentsByPatient(patient: string): Appointment[] {
    return db.getAppointmentsByPatient(patient);
  }

  private validateAppointmentData(data: CreateAppointmentDTO): void {
    if (!data.paciente || !data.paciente.trim()) {
      throw new Error('El nombre del paciente es requerido');
    }

    if (!data.especialidad || !data.especialidad.trim()) {
      throw new Error('La especialidad es requerida');
    }

    if (!data.fecha || !this.isValidDate(data.fecha)) {
      throw new Error('Fecha inválida (formato: YYYY-MM-DD)');
    }

    if (!data.hora || !this.isValidTime(data.hora)) {
      throw new Error('Hora inválida (formato: HH:MM)');
    }

    if (!data.doctor || !data.doctor.trim()) {
      throw new Error('El nombre del doctor es requerido');
    }
  }

  private isValidDate(dateString: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;

    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  private isValidTime(timeString: string): boolean {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeString);
  }
}

export const appointmentService = new AppointmentService();