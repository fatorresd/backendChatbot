import { Router, Request, Response } from 'express';
import { appointmentService } from '../services/appointmentService';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// GET /api/appointments - Obtener todas las citas
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { doctor, especialidad, fecha, paciente } = req.query;

    let appointments;

    if (doctor) {
      appointments = appointmentService.getAppointmentsByDoctor(doctor as string);
    } else if (especialidad) {
      appointments = appointmentService.getAppointmentsBySpecialty(especialidad as string);
    } else if (fecha) {
      appointments = appointmentService.getAppointmentsByDate(fecha as string);
    } else if (paciente) {
      appointments = appointmentService.getAppointmentsByPatient(paciente as string);
    } else {
      appointments = appointmentService.getAllAppointments();
    }

    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  })
);

// GET /api/appointments/:id - Obtener una cita específica
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const appointment = appointmentService.getAppointmentById(id);

    res.json({
      success: true,
      data: appointment,
    });
  })
);

// POST /api/appointments - Crear una nueva cita
router.post(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { paciente, especialidad, fecha, hora, doctor, notas } = req.body;

    const appointment = appointmentService.createAppointment({
      paciente,
      especialidad,
      fecha,
      hora,
      doctor,
      notas,
    });

    res.status(201).json({
      success: true,
      data: appointment,
      message: 'Cita creada exitosamente',
    });
  })
);

// PUT /api/appointments/:id - Actualizar una cita
router.put(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const updates = req.body;

    const appointment = appointmentService.updateAppointment(id, updates);

    res.json({
      success: true,
      data: appointment,
      message: 'Cita actualizada exitosamente',
    });
  })
);

// DELETE /api/appointments/:id - Eliminar una cita
router.delete(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    appointmentService.deleteAppointment(id);

    res.json({
      success: true,
      message: 'Cita eliminada exitosamente',
    });
  })
);

export default router;