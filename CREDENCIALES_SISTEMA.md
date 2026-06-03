# Credenciales del Sistema - CONFIDENCIAL

Guardar en lugar seguro. No compartir.

---

## Usuario ADMINISTRADOR

Email: sergioalbornoz@minserco.cl
Password: Minserco2024!Temporal
Rol: admin

Acceso:
- Crear y eliminar usuarios
- Ver logs de auditoría completos
- Configurar notificaciones globales
- Acceso a todos los módulos

**Cambiar password inmediatamente después del primer login**

---

## Usuario TECNICO (Demo)

Email: tecnico@minserco.cl
Password: Tecnico2024!Temporal
Rol: tecnico

Acceso:
- Ver mantenciones asignadas
- Ver equipos
- Registrar reparaciones
- Ver bodega

No puede:
- Crear usuarios
- Ver logs de auditoría
- Eliminar registros

---

## Base de datos

Host: localhost
Puerto: 5432
Usuario: minserco
Password: minserco_dev_2024
Base de datos: minserco_prod

Usar cuando sea necesario acceso directo (pgAdmin, DBeaver, etc.)

---

## JWT Secret (desarrollo)

Secret: minserco_jwt_secret_2024_desarrollo_supersecreto

CAMBIAR ANTES DE PRODUCCIÓN

---

## Credenciales Externas (pendientes)

### Email (SendGrid/Gmail)
- API Key: (pendiente)
- Email: (pendiente)

### Slack
- Bot Token: (pendiente)
- Signing Secret: (pendiente)

### Dominio
- .cl a registrar en nic.cl
- DNS configurar después

---

## Cambios de seguridad recomendados

1. Cambiar passwords después del primer login
2. Generar nuevo JWT_SECRET para producción
3. Configurar credenciales de email
4. Configurar bot de Slack
5. Habilitar HTTPS en producción
6. Configurar variables en servidor (no en .env.local)

