# Backend Minserco - Documentación Técnica

Sistema de gestión operacional con autenticación, auditoría y notificaciones.

---

## Estructura del proyecto

```
src/
├── server/
│   ├── api/
│   │   ├── users.ts (autenticación, registro)
│   │   └── mantenciones.ts (CRUD ejemplo)
│   ├── middleware/
│   │   ├── auth.ts (JWT, verificación)
│   │   └── audit.ts (logging de cambios)
│   ├── db/
│   │   ├── index.ts (conexión a PostgreSQL)
│   │   ├── schema.sql (definición de tablas)
│   │   └── seed.ts (datos iniciales)
│   ├── types.ts (interfaces TypeScript)
│   └── index.ts (servidor Express principal)
├── app/ (Next.js frontend)
├── components/
├── lib/
└── types/
```

---

## Tecnologías

Backend:
- Express.js (servidor HTTP)
- PostgreSQL (base de datos)
- JWT (autenticación)
- bcryptjs (contraseñas hasheadas)

Herramientas:
- Docker (PostgreSQL + Redis)
- TypeScript (type safety)
- Bull (colas de trabajo)
- Redis (cache + worker queue)

---

## Instalación rápida

1. Instalar Docker
2. `docker-compose up -d`
3. `npm install`
4. `npm run db:init`
5. `npm run db:seed`
6. `npm run api:dev`

Acceso:
- API: http://localhost:3001
- BD: localhost:5432
- Admin: sergioalbornoz@minserco.cl / Minserco2024!Temporal
- Técnico: tecnico@minserco.cl / Tecnico2024!Temporal

---

## Autenticación

El sistema usa JWT (JSON Web Tokens) con roles:

### Obtener token (login)

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sergioalbornoz@minserco.cl",
    "password": "Minserco2024!Temporal"
  }'
```

Retorna:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGc...",
    "user": {
      "id": "...",
      "nombre": "Sergio Albornoz",
      "email": "sergioalbornoz@minserco.cl",
      "rol": "admin"
    }
  }
}
```

### Usar token en requests

```bash
curl -X GET http://localhost:3001/api/mantenciones \
  -H "Authorization: Bearer eyJhbGc..."
```

---

## Rol: ADMIN

Permisos:
- Crear/actualizar/eliminar usuarios
- Ver logs de auditoría completos
- Acceso a todos los módulos
- Configurar notificaciones

Restricciones:
- Ninguna (acceso total)

---

## Rol: TECNICO

Permisos:
- Ver mantenciones asignadas
- Crear/actualizar reparaciones
- Ver equipos y bodega
- Registrar actividades

Restricciones:
- No puede crear usuarios
- No puede ver logs de auditoría
- No puede eliminar registros críticos

---

## Sistema de Auditoría

Cada acción (CREATE, UPDATE, DELETE) se registra automáticamente:

```sql
-- Tabla: audit_logs
id, user_id, action, entity_type, entity_id, changes, created_at
```

Ejemplo: cambio en mantención

```json
{
  "id": "abc123...",
  "user_id": "admin_id",
  "action": "UPDATE",
  "entity_type": "mantencion",
  "entity_id": "mant_001",
  "changes": {
    "antes": { "estado": "pendiente", "tecnico": "Juan" },
    "despues": { "estado": "en_proceso", "tecnico": "Pedro" }
  },
  "created_at": "2024-06-03T14:30:00Z"
}
```

Consultar auditoría:

```bash
curl -X GET 'http://localhost:3001/api/admin/audit-logs?entityType=mantencion' \
  -H "Authorization: Bearer token"
```

---

## Endpoints disponibles

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | /api/auth/login | Login con email/password |
| GET | /api/auth/me | Obtener usuario actual |
| POST | /api/auth/register | Crear nuevo usuario (admin only) |

### Mantenciones

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/mantenciones | Listar (paginado) |
| POST | /api/mantenciones | Crear |
| GET | /api/mantenciones/:id | Obtener una |
| PATCH | /api/mantenciones/:id | Actualizar |
| DELETE | /api/mantenciones/:id | Eliminar |

### Auditoría

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | /api/admin/audit-logs | Ver logs de cambios |

---

## Base de datos

### Tablas principales

- users: usuarios del sistema
- mantenciones: registros de mantención
- reparaciones: reparaciones de equipos
- equipos: catálogo de equipos
- bodega: inventario
- contratos_arriendo: contratos de arriendo
- cotizaciones: presupuestos
- ordenes_trabajo: órdenes de trabajo
- audit_logs: registro de todos los cambios

Todas las tablas tienen:
- id (UUID primary key)
- created_at (timestamp automático)
- updated_at (timestamp automático)

---

## Variables de entorno

Requeridas:
```
DATABASE_URL=postgresql://minserco:password@localhost:5432/minserco_prod
JWT_SECRET=tu_secret_aqui
REDIS_URL=redis://localhost:6379
NODE_ENV=development
API_PORT=3001
```

Opcionales:
```
SLACK_BOT_TOKEN=xoxb-...
SENDGRID_API_KEY=SG.xxx...
APP_URL=http://localhost:3000
```

---

## Desarrollo

### Añadir nuevo endpoint

1. Crear archivo en `src/server/api/entidad.ts`
2. Importar en `src/server/index.ts`
3. Usar middleware `verifyAuth` para proteger
4. Llamar a `logAudit()` para cambios

Ejemplo:

```typescript
import { Router } from 'express'
import { verifyAuth } from '../middleware/auth'
import { logAudit } from '../middleware/audit'

const router = Router()

router.post('/', verifyAuth, async (req, res) => {
  // Lógica aquí
  await logAudit(req.user.id, 'CREATE', 'entidad', id, nombre)
  res.json({ success: true, data })
})

export default router
```

---

## Seguridad

Implementado:
- Contraseñas hasheadas con bcrypt
- JWT para autenticación
- CORS configurado
- Helmet para headers de seguridad
- SQL injection prevention (prepared statements)

Falta configurar para producción:
- HTTPS
- Rate limiting
- CSRF protection
- Secrets en variables de entorno del servidor
- Backup automático de BD

---

## Monitoreo

Logs en:
- console (desarrollo)
- Database audit_logs (auditoría)

Próximamente:
- Logs a archivo
- Alertas en Slack
- Dashboards de monitoreo

---

## Troubleshooting

Error: "Connection refused" en 5432
- Verificar: `docker ps`
- Reiniciar: `docker-compose restart postgres`

Error: "Password authentication failed"
- Verificar credenciales en `.env.local`
- Default: minserco / minserco_dev_2024

Error: "table audit_logs does not exist"
- Ejecutar: `npm run db:init`

Error: "No users found"
- Ejecutar: `npm run db:seed`

---

## Performance

Índices creados en:
- audit_logs (user_id, entity_type, created_at)
- mantenciones (estado, tecnico)
- reparaciones (estado)
- bodega (cantidad)
- alertas (user_id, leida)

Más índices según necesidad.

---

## Roadmap

Fase 1 (Completada):
- Backend Express + PostgreSQL
- Autenticación JWT
- Sistema de auditoría
- CRUD básico mantenciones

Fase 2 (En progreso):
- Conectar frontend
- Notificaciones (Slack, Email, Push)
- Reportes automáticos

Fase 3 (Próxima):
- Dominio .cl
- Deploy a Vercel
- Integración con sistemas externos

