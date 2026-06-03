-- ============================================================
-- Minserco App — Schema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Habilitar extensiones necesarias
create extension if not exists "uuid-ossp";

-- ============================================================
-- USUARIOS Y AUTH
-- ============================================================
-- Supabase maneja auth.users automáticamente.
-- Esta tabla extiende el perfil con rol y nombre.

create table public.usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text not null unique,
  rol         text not null default 'tecnico' check (rol in ('admin','tecnico')),
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

alter table public.usuarios enable row level security;
create policy "usuarios: solo admin ve todos" on public.usuarios
  for select using (
    auth.uid() = id
    or exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );
create policy "usuarios: solo admin modifica" on public.usuarios
  for all using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );

-- ============================================================
-- MANTENCIÓN
-- ============================================================
create table public.mantenciones (
  id                  uuid primary key default uuid_generate_v4(),
  equipo              text not null,
  numero_serie        text not null default '',
  tipo                text not null check (tipo in ('preventivo','correctivo')),
  descripcion         text not null,
  tecnico             text not null,
  fecha               date not null,
  estado              text not null default 'pendiente' check (estado in ('pendiente','en_proceso','completado')),
  observaciones       text,
  proxima_mantencion  date,
  creado_en           timestamptz not null default now(),
  creado_por          uuid references auth.users(id)
);

alter table public.mantenciones enable row level security;
create policy "mantenciones: acceso autenticado" on public.mantenciones
  for all using (auth.uid() is not null);

-- ============================================================
-- REPARACIÓN
-- ============================================================
create table public.reparaciones (
  id                  uuid primary key default uuid_generate_v4(),
  equipo              text not null,
  numero_serie        text not null default '',
  cliente             text not null,
  telefono            text,
  falla               text not null,
  diagnostico         text,
  repuestos_usados    text,
  tecnico             text not null,
  fecha_recepcion     date not null,
  fecha_estimada      date,
  fecha_entrega       date,
  estado              text not null default 'recibido'
    check (estado in ('recibido','diagnostico','en_reparacion','esperando_repuestos','listo','entregado')),
  costo_estimado      numeric(12,2),
  costo_final         numeric(12,2),
  creado_en           timestamptz not null default now(),
  creado_por          uuid references auth.users(id)
);

alter table public.reparaciones enable row level security;
create policy "reparaciones: acceso autenticado" on public.reparaciones
  for all using (auth.uid() is not null);

-- ============================================================
-- BODEGA
-- ============================================================
create table public.bodega (
  id               uuid primary key default uuid_generate_v4(),
  codigo           text not null,
  nombre           text not null,
  categoria        text not null check (categoria in ('equipo','accesorio','repuesto','consumible','herramienta')),
  descripcion      text,
  cantidad         integer not null default 0,
  cantidad_minima  integer not null default 0,
  ubicacion        text not null default '',
  proveedor        text,
  precio_unitario  numeric(12,2),
  unidad           text not null default 'unidades',
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  creado_por       uuid references auth.users(id)
);

alter table public.bodega enable row level security;
create policy "bodega: acceso autenticado" on public.bodega
  for all using (auth.uid() is not null);

create table public.movimientos_bodega (
  id          uuid primary key default uuid_generate_v4(),
  item_id     uuid not null references public.bodega(id) on delete cascade,
  nombre_item text,
  tipo        text not null check (tipo in ('entrada','salida')),
  cantidad    integer not null,
  motivo      text not null,
  referencia  text,
  fecha       date not null,
  responsable text not null,
  creado_en   timestamptz not null default now(),
  creado_por  uuid references auth.users(id)
);

alter table public.movimientos_bodega enable row level security;
create policy "movimientos: acceso autenticado" on public.movimientos_bodega
  for all using (auth.uid() is not null);

-- Trigger para actualizar stock automáticamente
create or replace function actualizar_stock()
returns trigger language plpgsql as $$
begin
  if NEW.tipo = 'entrada' then
    update public.bodega set cantidad = cantidad + NEW.cantidad, actualizado_en = now()
    where id = NEW.item_id;
  else
    update public.bodega set cantidad = greatest(0, cantidad - NEW.cantidad), actualizado_en = now()
    where id = NEW.item_id;
  end if;
  return NEW;
end;
$$;

create trigger trg_actualizar_stock
  after insert on public.movimientos_bodega
  for each row execute function actualizar_stock();

-- ============================================================
-- IMPORTACIÓN
-- ============================================================
create table public.importaciones (
  id               uuid primary key default uuid_generate_v4(),
  proveedor        text not null,
  pais_origen      text not null default '',
  descripcion      text not null,
  items            text not null,
  cantidad         integer not null default 1,
  fecha_solicitud  date not null,
  fecha_estimada   date,
  fecha_recepcion  date,
  estado           text not null default 'solicitado'
    check (estado in ('solicitado','en_transito','en_aduana','recibido','distribuido')),
  numero_tracking  text,
  documentos       text,
  costo_total      numeric(12,2),
  responsable      text not null,
  notas            text,
  creado_en        timestamptz not null default now(),
  creado_por       uuid references auth.users(id)
);

alter table public.importaciones enable row level security;
create policy "importaciones: acceso autenticado" on public.importaciones
  for all using (auth.uid() is not null);

-- ============================================================
-- CLIENTES Y EQUIPOS EN TERRENO
-- ============================================================
create table public.clientes_equipos (
  id                   uuid primary key default uuid_generate_v4(),
  cliente              text not null,
  empresa              text not null,
  rut                  text,
  telefono             text,
  email                text,
  direccion            text not null default '',
  ciudad               text not null check (ciudad in ('Copiapó','La Serena','Viña del Mar','Otra')),
  equipo               text not null,
  codigo_equipo        text,
  tipo_equipo          text not null
    check (tipo_equipo in ('supresor_polvo','nebulizador','bomba','compresor','electrovalvula','filtro','otro')),
  numero_serie         text,
  fecha_instalacion    date not null,
  garantia_hasta       date,
  ultima_mantencion    date,
  proxima_mantencion   date,
  tecnico_responsable  text,
  estado               text not null default 'activo' check (estado in ('activo','inactivo','en_servicio')),
  notas                text,
  creado_en            timestamptz not null default now(),
  creado_por           uuid references auth.users(id)
);

alter table public.clientes_equipos enable row level security;
create policy "clientes_equipos: acceso autenticado" on public.clientes_equipos
  for all using (auth.uid() is not null);

-- ============================================================
-- CONTRATOS ARRIENDO
-- ============================================================
create table public.contratos_arriendo (
  id             uuid primary key default uuid_generate_v4(),
  equipo         text not null,
  codigo_equipo  text,
  cliente        text not null,
  telefono       text,
  email          text,
  fecha_inicio   date not null,
  fecha_termino  date not null,
  dias_aviso     integer not null default 7,
  monto_mensual  numeric(12,2),
  estado         text not null default 'activo'
    check (estado in ('activo','vencido','finalizado','suspendido')),
  notas          text,
  creado_en      timestamptz not null default now(),
  creado_por     uuid references auth.users(id)
);

alter table public.contratos_arriendo enable row level security;
create policy "contratos: acceso autenticado" on public.contratos_arriendo
  for all using (auth.uid() is not null);

create table public.pagos_arriendo (
  id                uuid primary key default uuid_generate_v4(),
  contrato_id       uuid not null references public.contratos_arriendo(id) on delete cascade,
  tipo              text not null check (tipo in ('pago','extension')),
  monto             numeric(12,2),
  fecha             date not null,
  nueva_fecha_termino date,
  notas             text,
  creado_en         timestamptz not null default now(),
  creado_por        uuid references auth.users(id)
);

alter table public.pagos_arriendo enable row level security;
create policy "pagos_arriendo: acceso autenticado" on public.pagos_arriendo
  for all using (auth.uid() is not null);

-- ============================================================
-- COTIZACIONES
-- ============================================================
create table public.cotizaciones (
  id             uuid primary key default uuid_generate_v4(),
  numero         text not null unique,
  cliente        text not null,
  empresa        text,
  email          text,
  telefono       text,
  ciudad         text,
  descripcion    text not null,
  items          jsonb not null default '[]',
  subtotal       numeric(12,2) not null default 0,
  descuento      numeric(12,2) not null default 0,
  total          numeric(12,2) not null default 0,
  validez_dias   integer not null default 30,
  estado         text not null default 'borrador'
    check (estado in ('borrador','enviada','aceptada','rechazada','vencida')),
  fecha_emision  date not null,
  fecha_vencimiento date not null,
  notas          text,
  creado_en      timestamptz not null default now(),
  creado_por     uuid references auth.users(id)
);

alter table public.cotizaciones enable row level security;
create policy "cotizaciones: acceso autenticado" on public.cotizaciones
  for all using (auth.uid() is not null);

-- ============================================================
-- ÓRDENES DE TRABAJO
-- ============================================================
create table public.ordenes_trabajo (
  id                uuid primary key default uuid_generate_v4(),
  numero            text not null unique,
  tipo              text not null
    check (tipo in ('instalacion','mantencion_terreno','reparacion_terreno','inspeccion')),
  cliente           text not null,
  empresa           text,
  direccion         text not null default '',
  ciudad            text not null check (ciudad in ('Copiapó','La Serena','Viña del Mar','Otra')),
  equipo            text,
  descripcion       text not null,
  tecnico           text not null,
  fecha_programada  date not null,
  fecha_inicio      date,
  fecha_termino     date,
  estado            text not null default 'pendiente'
    check (estado in ('pendiente','en_curso','completada','cancelada')),
  observaciones     text,
  costo_mano_obra   numeric(12,2),
  costo_materiales  numeric(12,2),
  creado_en         timestamptz not null default now(),
  creado_por        uuid references auth.users(id)
);

alter table public.ordenes_trabajo enable row level security;
create policy "ordenes: acceso autenticado" on public.ordenes_trabajo
  for all using (auth.uid() is not null);

-- ============================================================
-- TÉCNICOS Y ASIGNACIONES
-- ============================================================
create table public.tecnicos (
  id           uuid primary key default uuid_generate_v4(),
  nombre       text not null,
  especialidad text not null default '',
  telefono     text,
  email        text,
  oficina      text not null check (oficina in ('Copiapó','La Serena','Viña del Mar','Otra')),
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),
  creado_por   uuid references auth.users(id)
);

alter table public.tecnicos enable row level security;
create policy "tecnicos: acceso autenticado" on public.tecnicos
  for all using (auth.uid() is not null);

create table public.asignaciones_tecnico (
  id           uuid primary key default uuid_generate_v4(),
  tecnico_id   uuid not null references public.tecnicos(id) on delete cascade,
  tipo         text not null
    check (tipo in ('instalacion','mantencion_terreno','reparacion_terreno','inspeccion')),
  cliente      text not null,
  descripcion  text not null,
  ciudad       text not null check (ciudad in ('Copiapó','La Serena','Viña del Mar','Otra')),
  fecha        date not null,
  hora_inicio  text,
  hora_fin     text,
  estado       text not null default 'programado'
    check (estado in ('programado','en_curso','completado','cancelado')),
  creado_en    timestamptz not null default now(),
  creado_por   uuid references auth.users(id)
);

alter table public.asignaciones_tecnico enable row level security;
create policy "asignaciones: acceso autenticado" on public.asignaciones_tecnico
  for all using (auth.uid() is not null);

-- ============================================================
-- PROVEEDORES
-- ============================================================
create table public.proveedores (
  id              uuid primary key default uuid_generate_v4(),
  nombre          text not null,
  pais            text not null,
  ciudad          text,
  contacto        text,
  telefono        text,
  email           text,
  sitio_web       text,
  categorias      text[] not null default '{}',
  productos       text not null default '',
  tiempo_entrega  text,
  calificacion    integer check (calificacion between 1 and 5),
  notas           text,
  activo          boolean not null default true,
  creado_en       timestamptz not null default now(),
  creado_por      uuid references auth.users(id)
);

alter table public.proveedores enable row level security;
create policy "proveedores: acceso autenticado" on public.proveedores
  for all using (auth.uid() is not null);

-- ============================================================
-- GASTOS
-- ============================================================
create table public.gastos (
  id               uuid primary key default uuid_generate_v4(),
  fecha            date not null,
  categoria        text not null
    check (categoria in ('materiales','viaticos','herramientas','servicios','combustible','alojamiento','otro')),
  descripcion      text not null,
  monto            numeric(12,2) not null,
  moneda           text not null default 'CLP' check (moneda in ('CLP','USD')),
  responsable      text not null,
  tipo_documento   text not null default 'boleta' check (tipo_documento in ('boleta','factura','otro')),
  numero_boleta    text,
  faena_proyecto   text,
  adjunto_base64   text,
  adjunto_nombre   text,
  adjunto_tipo     text,
  estado           text not null default 'borrador'
    check (estado in ('borrador','enviado','aprobado','rechazado')),
  observaciones    text,
  creado_en        timestamptz not null default now(),
  creado_por       uuid references auth.users(id)
);

alter table public.gastos enable row level security;
create policy "gastos: todos ven los suyos" on public.gastos
  for select using (
    creado_por = auth.uid()
    or exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );
create policy "gastos: crear propio" on public.gastos
  for insert with check (auth.uid() is not null);
create policy "gastos: editar propio o admin" on public.gastos
  for update using (
    creado_por = auth.uid()
    or exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );
create policy "gastos: eliminar propio o admin" on public.gastos
  for delete using (
    creado_por = auth.uid()
    or exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );

-- ============================================================
-- INFORMES DE ENTREGA
-- ============================================================
create table public.informes_entrega (
  id                   uuid primary key default uuid_generate_v4(),
  numero               text not null unique,
  equipo               text not null,
  numero_serie         text,
  cliente              text not null,
  empresa              text,
  direccion            text,
  tecnico              text not null,
  fecha_entrega        date not null,
  estado_equipo        text not null
    check (estado_equipo in ('excelente','bueno','regular','con_fallas')),
  descripcion_entrega  text not null,
  items_entregados     text[] not null default '{}',
  observaciones        text,
  estado               text not null default 'borrador' check (estado in ('borrador','emitido')),
  creado_en            timestamptz not null default now(),
  creado_por           uuid references auth.users(id)
);

alter table public.informes_entrega enable row level security;
create policy "informes_entrega: acceso autenticado" on public.informes_entrega
  for all using (auth.uid() is not null);

-- ============================================================
-- PROYECTOS (FABRICACIÓN)
-- ============================================================
create table public.proyectos (
  id             uuid primary key default uuid_generate_v4(),
  nombre         text not null,
  cliente        text not null,
  descripcion    text not null default '',
  estado         text not null default 'planificacion'
    check (estado in ('planificacion','en_progreso','control_calidad','completado','pausado')),
  fecha_inicio   date not null,
  fecha_entrega  date not null,
  responsable    text not null,
  progreso       integer not null default 0 check (progreso between 0 and 100),
  notas          text,
  creado_en      timestamptz not null default now(),
  creado_por     uuid references auth.users(id)
);

alter table public.proyectos enable row level security;
create policy "proyectos: acceso autenticado" on public.proyectos
  for all using (auth.uid() is not null);

-- ============================================================
-- CONFIGURACIÓN DE ALERTAS
-- ============================================================
create table public.alertas_config (
  id            text primary key,
  tipo          text not null,
  activa        boolean not null default true,
  hora          text not null default '17:30',
  dias_semana   integer[] not null default '{1,2,3,4,5}',
  mensaje       text not null default '',
  ultima_disparo date,
  usuario_id    uuid references auth.users(id)
);

alter table public.alertas_config enable row level security;
create policy "alertas_config: acceso propio" on public.alertas_config
  for all using (auth.uid() is not null);

-- ============================================================
-- AUDIT LOG (Fase 3 — se activa automáticamente)
-- ============================================================
create table public.audit_log (
  id          bigint generated always as identity primary key,
  tabla       text not null,
  operacion   text not null check (operacion in ('INSERT','UPDATE','DELETE')),
  registro_id text not null,
  datos_antes jsonb,
  datos_despues jsonb,
  usuario_id  uuid references auth.users(id),
  usuario_email text,
  ip          text,
  creado_en   timestamptz not null default now()
);

alter table public.audit_log enable row level security;
create policy "audit_log: solo admin" on public.audit_log
  for select using (
    exists (select 1 from public.usuarios u where u.id = auth.uid() and u.rol = 'admin')
  );

-- Función genérica de auditoría
create or replace function log_cambio()
returns trigger language plpgsql security definer as $$
begin
  insert into public.audit_log (tabla, operacion, registro_id, datos_antes, datos_despues, usuario_id)
  values (
    TG_TABLE_NAME,
    TG_OP,
    coalesce(NEW.id::text, OLD.id::text),
    case when TG_OP = 'DELETE' or TG_OP = 'UPDATE' then row_to_json(OLD)::jsonb else null end,
    case when TG_OP = 'INSERT' or TG_OP = 'UPDATE' then row_to_json(NEW)::jsonb else null end,
    auth.uid()
  );
  return coalesce(NEW, OLD);
end;
$$;

-- Aplicar audit triggers a tablas críticas
create trigger audit_mantenciones after insert or update or delete on public.mantenciones
  for each row execute function log_cambio();
create trigger audit_reparaciones after insert or update or delete on public.reparaciones
  for each row execute function log_cambio();
create trigger audit_ordenes after insert or update or delete on public.ordenes_trabajo
  for each row execute function log_cambio();
create trigger audit_gastos after insert or update or delete on public.gastos
  for each row execute function log_cambio();
create trigger audit_bodega after insert or update or delete on public.bodega
  for each row execute function log_cambio();
create trigger audit_contratos after insert or update or delete on public.contratos_arriendo
  for each row execute function log_cambio();

-- ============================================================
-- ÍNDICES para rendimiento
-- ============================================================
create index idx_mantenciones_estado on public.mantenciones(estado);
create index idx_mantenciones_fecha on public.mantenciones(fecha);
create index idx_reparaciones_estado on public.reparaciones(estado);
create index idx_contratos_estado on public.contratos_arriendo(estado);
create index idx_contratos_fecha_termino on public.contratos_arriendo(fecha_termino);
create index idx_bodega_cantidad on public.bodega(cantidad);
create index idx_gastos_estado on public.gastos(estado);
create index idx_gastos_fecha on public.gastos(fecha);
create index idx_ordenes_estado on public.ordenes_trabajo(estado);
create index idx_audit_tabla on public.audit_log(tabla, creado_en desc);
create index idx_audit_usuario on public.audit_log(usuario_id, creado_en desc);
