-- Tabla de usuarios con roles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('admin', 'tecnico')),
  activo BOOLEAN DEFAULT true,
  telefono VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de auditoría (registra todos los cambios)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(20) NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  entity_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  entity_nombre VARCHAR(255),
  changes JSONB, -- { "antes": {...}, "despues": {...} }
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Equipos
CREATE TABLE IF NOT EXISTS equipos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_serie VARCHAR(255) UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(100),
  marca VARCHAR(100),
  modelo VARCHAR(100),
  ubicacion VARCHAR(255),
  estado VARCHAR(50) CHECK (estado IN ('operativo', 'mantenimiento', 'reparacion', 'fuera_servicio')) DEFAULT 'operativo',
  cliente_id UUID,
  especificaciones JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Mantenciones
CREATE TABLE IF NOT EXISTS mantenciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID NOT NULL REFERENCES equipos(id),
  numero_serie VARCHAR(255),
  equipo VARCHAR(255),
  numero_serie_ref VARCHAR(255),
  tipo VARCHAR(50) CHECK (tipo IN ('preventivo', 'correctivo')) DEFAULT 'preventivo',
  descripcion TEXT,
  tecnico_id UUID REFERENCES users(id),
  tecnico VARCHAR(255),
  fecha DATE,
  estado VARCHAR(50) CHECK (estado IN ('pendiente', 'en_proceso', 'completado')) DEFAULT 'pendiente',
  observaciones TEXT,
  proxima_mantencion DATE,
  costo_estimado DECIMAL(12, 2),
  costo_real DECIMAL(12, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Reparaciones
CREATE TABLE IF NOT EXISTS reparaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo_id UUID NOT NULL REFERENCES equipos(id),
  equipo VARCHAR(255),
  numero_serie VARCHAR(255),
  descripcion_problema TEXT,
  tecnico_id UUID REFERENCES users(id),
  tecnico VARCHAR(255),
  fecha_entrada DATE,
  estado VARCHAR(50) CHECK (estado IN ('recibido', 'diagnostico', 'en_reparacion', 'esperando_repuestos', 'listo', 'entregado')) DEFAULT 'recibido',
  costo_mano_obra DECIMAL(12, 2),
  costo_repuestos DECIMAL(12, 2),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bodega / Inventario
CREATE TABLE IF NOT EXISTS bodega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  codigo VARCHAR(100) UNIQUE,
  cantidad INTEGER DEFAULT 0,
  cantidad_minima INTEGER DEFAULT 5,
  unidad VARCHAR(50) DEFAULT 'unidad',
  precio_unitario DECIMAL(12, 2),
  proveedor_id UUID,
  ubicacion_estante VARCHAR(100),
  descripcion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Movimientos de bodega (auditoría de stock)
CREATE TABLE IF NOT EXISTS movimientos_bodega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES bodega(id),
  tipo VARCHAR(50) CHECK (tipo IN ('entrada', 'salida', 'ajuste')) DEFAULT 'entrada',
  cantidad INTEGER NOT NULL,
  usuario_id UUID NOT NULL REFERENCES users(id),
  referencia VARCHAR(255), -- mantencion_id, reparacion_id, etc
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Contratos de Arriendo
CREATE TABLE IF NOT EXISTS contratos_arriendo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipo VARCHAR(255),
  cliente VARCHAR(255),
  fecha_inicio DATE,
  fecha_termino DATE,
  dias_aviso INTEGER DEFAULT 7,
  monto_mensual DECIMAL(12, 2),
  estado VARCHAR(50) CHECK (estado IN ('activo', 'suspendido', 'finalizado', 'vencido')) DEFAULT 'activo',
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) UNIQUE NOT NULL,
  cliente VARCHAR(255),
  cliente_id UUID,
  descripcion TEXT,
  total DECIMAL(12, 2),
  estado VARCHAR(50) CHECK (estado IN ('borrador', 'enviada', 'aceptada', 'rechazada')) DEFAULT 'borrador',
  fecha_creacion DATE DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  items JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Órdenes de Trabajo
CREATE TABLE IF NOT EXISTS ordenes_trabajo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero VARCHAR(50) UNIQUE NOT NULL,
  cliente VARCHAR(255),
  cliente_id UUID,
  descripcion TEXT,
  estado VARCHAR(50) CHECK (estado IN ('pendiente', 'en_curso', 'completada', 'cancelada')) DEFAULT 'pendiente',
  tecnico_asignado_id UUID REFERENCES users(id),
  fecha_creacion DATE DEFAULT CURRENT_DATE,
  fecha_limite DATE,
  costo_estimado DECIMAL(12, 2),
  costo_real DECIMAL(12, 2),
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clientes
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  rut VARCHAR(50) UNIQUE,
  tipo VARCHAR(50) CHECK (tipo IN ('empresa', 'persona')) DEFAULT 'empresa',
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  contacto_principal VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Proveedores
CREATE TABLE IF NOT EXISTS proveedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  rut VARCHAR(50) UNIQUE,
  email VARCHAR(255),
  telefono VARCHAR(20),
  direccion TEXT,
  ciudad VARCHAR(100),
  contacto_principal VARCHAR(255),
  tiempo_entrega_dias INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Gastos
CREATE TABLE IF NOT EXISTS gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL,
  categoria VARCHAR(100),
  descripcion VARCHAR(255),
  monto DECIMAL(12, 2),
  comprobante_numero VARCHAR(50),
  proveedor_id UUID REFERENCES proveedores(id),
  usuario_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Importaciones
CREATE TABLE IF NOT EXISTS importaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_referencia VARCHAR(100),
  descripcion TEXT,
  proveedor_id UUID REFERENCES proveedores(id),
  fecha_orden DATE,
  fecha_llegada_estimada DATE,
  fecha_llegada_real DATE,
  costo_total DECIMAL(12, 2),
  estado VARCHAR(50) CHECK (estado IN ('pendiente', 'en_transito', 'recibida', 'cancelada')) DEFAULT 'pendiente',
  notas TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Informes de Entrega
CREATE TABLE IF NOT EXISTS informes_entrega (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero_referencia VARCHAR(100),
  orden_trabajo_id UUID REFERENCES ordenes_trabajo(id),
  cliente_id UUID REFERENCES clientes(id),
  fecha DATE DEFAULT CURRENT_DATE,
  descripcion_trabajo TEXT,
  estado_equipo VARCHAR(255),
  firma_cliente BYTEA,
  foto_antes BYTEA,
  foto_despues BYTEA,
  observaciones TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Preferencias de Notificaciones
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  alert_type VARCHAR(100), -- stock_bajo, mantencion_vencida, etc
  email BOOLEAN DEFAULT false,
  slack BOOLEAN DEFAULT true,
  push BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, alert_type)
);

-- Alertas (registro de notificaciones enviadas)
CREATE TABLE IF NOT EXISTS alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  tipo VARCHAR(100), -- stock_bajo, mantencion_vencida, etc
  titulo VARCHAR(255),
  mensaje TEXT,
  entidad_tipo VARCHAR(50), -- mantencion, reparacion, etc
  entidad_id VARCHAR(255),
  canal VARCHAR(50) CHECK (canal IN ('push', 'slack', 'email')) DEFAULT 'push',
  enviada BOOLEAN DEFAULT false,
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para optimización
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_mantenciones_estado ON mantenciones(estado);
CREATE INDEX idx_mantenciones_tecnico ON mantenciones(tecnico_id);
CREATE INDEX idx_reparaciones_estado ON reparaciones(estado);
CREATE INDEX idx_reparaciones_tecnico ON reparaciones(tecnico_id);
CREATE INDEX idx_bodega_cantidad ON bodega(cantidad);
CREATE INDEX idx_alertas_user_id ON alertas(user_id);
CREATE INDEX idx_alertas_leida ON alertas(leida);
CREATE INDEX idx_alertas_created_at ON alertas(created_at);
