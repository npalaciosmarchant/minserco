-- ============================================================
-- Minserco App — Seed de usuarios iniciales
-- IMPORTANTE: Ejecutar DESPUÉS de schema.sql
--
-- Estos usuarios se crean vía Supabase Auth (no directamente
-- en la tabla usuarios). Sigue los pasos:
--
-- 1. Ve a Supabase Dashboard → Authentication → Users → Add User
--    Usuario admin:
--      Email:    admin@minsercoapp.cl
--      Password: Minserco2025!
--
--    Usuario técnico:
--      Email:    tecnico@minsercoapp.cl
--      Password: Tecnico2025!
--
-- 2. Copia los UUID que Supabase asigna a cada usuario
--    y reemplaza los valores de abajo.
--
-- 3. Ejecuta este script en SQL Editor.
-- ============================================================

-- Reemplaza estos UUID con los que Supabase generó al crear los usuarios
-- (los ves en Authentication → Users → columna "UID")

insert into public.usuarios (id, nombre, email, rol, activo)
values
  -- Admin principal
  ('REEMPLAZAR-CON-UUID-ADMIN',  'Administrador Minserco', 'admin@minsercoapp.cl',    'admin',   true),
  -- Técnico de ejemplo
  ('REEMPLAZAR-CON-UUID-TECNICO','Técnico Minserco',       'tecnico@minsercoapp.cl',  'tecnico', true)
on conflict (id) do update
  set nombre = excluded.nombre,
      rol    = excluded.rol,
      activo = excluded.activo;

-- Alertas por defecto para el admin
insert into public.alertas_config (id, tipo, activa, hora, dias_semana, mensaje, usuario_id)
values
  ('fin-jornada',   'fin_jornada',           true, '17:30', '{1,2,3,4,5}', 'Fin de jornada: revisa gastos e informes pendientes',        'REEMPLAZAR-CON-UUID-ADMIN'),
  ('rec-gastos',    'recordatorio_gastos',   true, '12:00', '{5}',         'Viernes: envía las rendiciones de gastos de la semana',       'REEMPLAZAR-CON-UUID-ADMIN'),
  ('rec-informes',  'recordatorio_informes', true, '16:00', '{1,2,3,4,5}', 'Recuerda emitir informes de entrega pendientes',             'REEMPLAZAR-CON-UUID-ADMIN')
on conflict (id) do nothing;
