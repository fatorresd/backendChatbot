import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import appointmentRoutes from './routes/appointments';
import chatRoutes from './routes/chat';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

console.log('================================');
console.log(' DEBUG - Variables de entorno:');
console.log('================================');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('OPENAI_API_KEY existe?:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_API_KEY length:', process.env.OPENAI_API_KEY?.length);
console.log('OPENAI_API_KEY primeros 20 caracteres:', process.env.OPENAI_API_KEY?.substring(0, 20));
console.log('================================\n');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

// Rutas
app.use('/api/appointments', appointmentRoutes);
app.use('/api/chat', chatRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manejo de rutas no encontradas
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
  });
});

// Manejo de errores
app.use(errorHandler);

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`
    ================================
        Servidor médico en ejecución
    ================================
      URL: http://localhost:${PORT}
      API: http://localhost:${PORT}/api/appointments
      Chat: http://localhost:${PORT}/api/chat
      Health: http://localhost:${PORT}/api/health
    ================================
  `);
});

export default app;