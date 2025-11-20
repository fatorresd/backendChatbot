# Backend - Sistema de Citas Médicas

API REST para gestionar citas médicas con operaciones CRUD completas.

## ‼️ Requisitos Previos

Un detalle importante a considerar es el uso de la **API Key** durante el desarrollo y pruebas del proyecto.  
La API Key proporcionada inicialmente para la prueba **no funcionaba**, lo que impedía realizar las solicitudes a OpenAI.

Sin embargo, al utilizar una **API Key personal** (en el video se puede visualizar sin problemas, en caso de que quieran utilizarla, esta con gpt 3.5, y la cree explicitamente para este bot), con permisos activos para realizar consultas a OpenAI, el sistema funcionó sin inconvenientes.

Gracias a esto, pude encontrar una **solución espontánea** frente a un problema interesante que surgió durante el proceso.


##  Requisitos Previos

- Node.js (versión 20.19.0 o superior)
- npm (versión 8.0.0 o superior)

## Instalación

```bash
git clone https://github.com/fatorresd/backendChatbot.git
cd backendChatbot
npm install
```
## Crear .env para ejecutar en local
- Asi debe lucir el .env
  
```bash
PORT=3001
NODE_ENV=development

OPENAI_API_KEY=apikeysecrethere Importante aca colocar la apiscretKey
```

## Desarrollo

```bash
npm run dev
```

El servidor estará disponible en: `http://localhost:3001`

## Construcción

```bash
npm run build
npm start
```

## Endpoints

### Obtener todas las citas
```
GET /api/appointments
```

Parámetros opcionales:
- `doctor` - Filtrar por nombre del doctor
- `especialidad` - Filtrar por especialidad
- `fecha` - Filtrar por fecha (YYYY-MM-DD)
- `paciente` - Filtrar por nombre del paciente

**Respuesta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "1",
      "paciente": "Carlos López",
      "especialidad": "Cardiología",
      "fecha": "2024-12-20",
      "hora": "10:30",
      "doctor": "Dr. García",
      "notas": "Chequeo general",
      "estado": "confirmada",
      "createdAt": "2024-11-19T10:00:00.000Z",
      "updatedAt": "2024-11-19T10:00:00.000Z"
    }
  ],
  "count": 1
}
```

### Obtener una cita específica
```
GET /api/appointments/:id
```

### Crear una nueva cita
```
POST /api/appointments
Content-Type: application/json

{
  "paciente": "Juan Pérez",
  "especialidad": "Dermatología",
  "fecha": "2024-12-25",
  "hora": "15:00",
  "doctor": "Dra. Martínez",
  "notas": "Consulta inicial"
}
```

**Respuesta (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": "1234567890",
    "paciente": "Juan Pérez",
    "especialidad": "Dermatología",
    "fecha": "2024-12-25",
    "hora": "15:00",
    "doctor": "Dra. Martínez",
    "notas": "Consulta inicial",
    "estado": "pendiente",
    "createdAt": "2024-11-19T10:00:00.000Z",
    "updatedAt": "2024-11-19T10:00:00.000Z"
  },
  "message": "Cita creada exitosamente"
}
```

### Actualizar una cita
```
PUT /api/appointments/:id
Content-Type: application/json

{
  "fecha": "2024-12-26",
  "hora": "16:00"
}
```

### Eliminar una cita
```
DELETE /api/appointments/:id
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Cita eliminada exitosamente"
}
```

## Estados de cita

- `pendiente` - Cita pendiente de confirmación
- `confirmada` - Cita confirmada
- `cancelada` - Cita cancelada
- `completada` - Cita realizada

## Validaciones

- Las fechas deben estar en formato YYYY-MM-DD
- Las horas deben estar en formato HH:MM
- No se puede agendar citas en el pasado
- El nombre del paciente y doctor son obligatorios
- La especialidad es requerida

## Almacenamiento

Los datos se almacenan en memoria y se reinician cada vez que se reinicia el servidor.
