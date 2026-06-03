# Setup Backend - Minserco v2.0

Guía para configurar el backend con PostgreSQL, Redis y Node.js.

---

## Paso 1: Instalar Docker

Descargar e instalar Docker desde https://www.docker.com/products/docker-desktop

---

## Paso 2: Iniciar PostgreSQL y Redis

Desde la carpeta raíz del proyecto:

```bash
docker-compose up -d
```

Esto inicia:
- PostgreSQL en puerto 5432 (usuario: minserco, password: minserco_dev_2024)
- Redis en puerto 6379

Verificar que están corriendo:
```bash
docker ps
```

---

## Paso 3: Instalar dependencias

```bash
npm install
```

---

## Paso 4: Crear tablas en la base de datos

```bash
npm run db:init
```

Esto ejecuta el SQL en `src/server/db/schema.sql` y crea todas las tablas.

---

## Paso 5: Poblar datos iniciales

```bash
npm run db:seed
```

Esto crea:
- Usuario ADMIN: sergioalbornoz@minserco.cl / Minserco2024!Temporal
- Usuario TECNICO: tecnico@minserco.cl / Tecnico2024!Temporal
- 3 equipos de ejemplo
- 2 mantenciones de ejemplo
- 3 items de bodega

---

## Paso 6: Iniciar el servidor API

En una terminal separada:

```bash
npm run api:dev
```

El API estará en http://localhost:3001

---

## Paso 7: Verificar que funciona

Hacer un login:

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sergioalbornoz@minserco.cl",
    "password": "Minserco2024!Temporal"
  }'
```

Debería retornar un token JWT.

---

## Paso 8: Obtener mantenciones

Con el token obtenido, hacer:

```bash
curl -X GET http://localhost:3001/api/mantenciones \
  -H "Authorization: Bearer TU_TOKEN"
```

---

## Variables de entorno (.env.local)

Todos los valores importantes están en `.env.local`:

```
DATABASE_URL=postgresql://minserco:minserco_dev_2024@localhost:5432/minserco_prod
JWT_SECRET=minserco_jwt_secret_2024_desarrollo_supersecreto
REDIS_URL=redis://localhost:6379
```

No compartir este archivo en GitHub. Añadir a `.gitignore`.

---

## Endpoints disponibles

### Autenticación
- POST /api/auth/login - Login
- GET /api/auth/me - Obtener perfil
- POST /api/auth/register (admin) - Crear usuario

### Mantenciones
- GET /api/mantenciones - Listar (paginado)
- POST /api/mantenciones - Crear
- GET /api/mantenciones/:id - Obtener una
- PATCH /api/mantenciones/:id - Actualizar
- DELETE /api/mantenciones/:id - Eliminar

### Auditoría
- GET /api/admin/audit-logs - Ver logs de cambios

---

## Parar los servicios

```bash
docker-compose down
```

---

## Troubleshooting

### "Connection refused" en puerto 5432
- Verificar que Docker está corriendo
- Verificar: `docker ps`
- Reiniciar: `docker-compose down` y `docker-compose up -d`

### "Password authentication failed"
- Verificar credenciales en `.env.local`
- Credenciales por defecto: minserco / minserco_dev_2024

### "Tabla no existe"
- Ejecutar: `npm run db:init`

### "Sin datos de ejemplo"
- Ejecutar: `npm run db:seed`

---

## Próximos pasos

1. Conectar el frontend (Next.js) al API
2. Implementar notificaciones (Slack, Email)
3. Crear página de auditoría
4. Implementar más endpoints CRUD

Ver: PLAN_IMPLEMENTACION.md

