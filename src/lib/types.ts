// Mantencion
export type EstadoMantencion = "pendiente" | "en_proceso" | "completado"
export type FrecuenciaMantencion = "ninguna" | "mensual" | "trimestral" | "semestral" | "anual"

export interface Mantencion {
  id: string
  equipo: string
  equipos?: string[]
  numeroSerie: string
  tipo: "preventivo" | "correctivo" | "mensual"
  descripcion: string
  tecnico: string             // compat: nombres unidos por coma
  tecnicos?: string[]         // varios tecnicos (nombres)
  supervisor?: string         // supervisor asignado (nombre)
  frecuencia?: FrecuenciaMantencion
  fecha: string
  fechaInicio?: string        // fecha de inicio
  fechaEntrega?: string       // fecha de entrega
  estado: EstadoMantencion
  observaciones?: string
  proximaMantencion?: string
  completadoEn?: string
  informeId?: string          // informe generado al completar
  fotos?: string[]            // base64 images
  creadoEn: string
}

// Equipos (registro propio de equipos del usuario)
export interface Equipo {
  id: string
  nombre: string
  numeroSerie?: string
  tipo?: string
  marca?: string
  modelo?: string
  ubicacion?: string
  frecuencia?: FrecuenciaMantencion
  ultimaMantencion?: string
  proximaMantencion?: string
  activo: boolean
  notas?: string
  planos?: { url: string; nombre: string }[]
  instructivos?: { url: string; nombre: string }[]
  fichasTecnicas?: { url: string; nombre: string }[]
  insumos?: { url: string; nombre: string }[]
  informes?: { url: string; nombre: string }[]
  creadoEn: string
}

// Notificaciones in-app
export interface Notificacion {
  id: string
  usuarioId?: string
  tipo: string
  titulo: string
  mensaje?: string
  mantencionId?: string
  leida: boolean
  creadoEn: string
}

// Fabricacion
export type EstadoProyecto = "planificacion" | "en_progreso" | "control_calidad" | "completado" | "pausado"

export interface Proyecto {
  id: string
  nombre: string
  cliente: string
  descripcion: string
  estado: EstadoProyecto
  fechaInicio: string
  fechaEntrega: string
  responsable: string
  responsables?: string[]
  progreso: number
  notas?: string
  creadoEn: string
}

// Reparacion
export type EstadoReparacion = "recibido" | "diagnostico" | "en_reparacion" | "esperando_repuestos" | "listo" | "entregado"

export interface Reparacion {
  id: string
  equipo: string
  numeroSerie: string
  cliente: string
  telefono?: string
  falla: string
  diagnostico?: string
  repuestosUsados?: string
  tecnico: string
  fechaRecepcion: string
  fechaEstimada?: string
  fechaEntrega?: string
  estado: EstadoReparacion
  costoEstimado?: number
  costoFinal?: number
  fotos?: string[]          // base64 images
  creadoEn: string
}

// Bodega
export type Categoria = "equipo" | "accesorio" | "repuesto" | "consumible" | "herramienta"

export interface Bodega {
  id: string
  nombre: string
  descripcion?: string
  creadoEn: string
}

export interface ItemBodega {
  id: string
  codigo: string
  nombre: string
  categoria: Categoria
  descripcion?: string
  cantidad: number
  cantidadMinima: number
  bodega?: string
  ubicacion: string
  proveedor?: string
  precioUnitario?: number
  unidad: string
  creadoEn: string
  actualizadoEn: string
}

export interface MovimientoBodega {
  id: string
  itemId: string
  nombreItem?: string
  tipo: "entrada" | "salida"
  cantidad: number
  motivo: string
  referencia?: string
  fecha: string
  responsable: string
  creadoEn: string
}

// Arriendo
export type EstadoContrato = "activo" | "vencido" | "finalizado" | "suspendido"

export interface ContratoArriendo {
  id: string
  equipo: string
  codigoEquipo?: string
  cliente: string
  telefono?: string
  email?: string
  fechaInicio: string       // YYYY-MM-DD
  fechaTermino: string      // YYYY-MM-DD
  diasAviso: number         // alertar N días antes del vencimiento
  montoMensual?: number
  estado: EstadoContrato
  notas?: string
  creadoEn: string
}

export interface PagoArriendo {
  id: string
  contratoId: string
  tipo: "pago" | "extension"
  monto?: number
  fecha: string
  nuevaFechaTermino?: string  // solo si tipo === "extension"
  notas?: string
  creadoEn: string
}

// Importacion
export type EstadoImportacion = "solicitado" | "en_transito" | "en_aduana" | "recibido" | "distribuido"

export interface Importacion {
  id: string
  proveedor: string
  paisOrigen: string
  descripcion: string
  items: string
  cantidad: number
  fechaSolicitud: string
  fechaEstimada?: string
  fechaRecepcion?: string
  estado: EstadoImportacion
  numeroTracking?: string
  documentos?: string
  costoTotal?: number
  responsable: string
  notas?: string
  creadoEn: string
}

// Clientes y Equipos en Terreno
export type CiudadOficina = "Copiapó" | "La Serena" | "Viña del Mar" | "Otra"
export type EstadoEquipoTerreno = "activo" | "inactivo" | "en_servicio"
export type TipoEquipoTerreno = "supresor_polvo" | "nebulizador" | "bomba" | "compresor" | "electrovalvula" | "filtro" | "otro"

export interface ClienteEquipo {
  id: string
  cliente: string
  empresa: string
  rut?: string
  telefono?: string
  email?: string
  direccion: string
  ciudad: CiudadOficina
  equipo: string
  codigoEquipo?: string
  tipoEquipo: TipoEquipoTerreno
  numeroSerie?: string
  fechaInstalacion: string
  garantiaHasta?: string
  ultimaMantencion?: string
  proximaMantencion?: string
  tecnicoResponsable?: string
  estado: EstadoEquipoTerreno
  notas?: string
  creadoEn: string
}

// Cotizaciones
export type EstadoCotizacion = "borrador" | "enviada" | "aceptada" | "rechazada" | "vencida"

export interface CotizacionItem {
  descripcion: string
  cantidad: number
  precioUnitario: number
  subtotal: number
}

export interface Cotizacion {
  id: string
  numero: string
  cliente: string
  empresa?: string
  email?: string
  telefono?: string
  ciudad?: string
  descripcion: string
  items: CotizacionItem[]
  subtotal: number
  descuento: number
  total: number
  validezDias: number
  estado: EstadoCotizacion
  fechaEmision: string
  fechaVencimiento: string
  notas?: string
  creadoEn: string
}

// Órdenes de Trabajo
export type EstadoOT = "pendiente" | "en_curso" | "completada" | "cancelada"
export type TipoOT = "instalacion" | "mantencion_terreno" | "reparacion_terreno" | "inspeccion" | "fabricacion" | "puesta_marcha" | "emergencia" | "retiro"

export interface OrdenTrabajo {
  id: string
  numero: string
  tipo: TipoOT
  cliente: string
  empresa?: string
  direccion: string
  ciudad: CiudadOficina
  equipo?: string
  descripcion: string
  tecnico: string
  tecnicos?: string[]
  fechaProgramada: string
  fechaInicio?: string
  fechaTermino?: string
  estado: EstadoOT
  observaciones?: string
  costoManoObra?: number
  costoMateriales?: number
  creadoEn: string
}

// Técnicos y Agenda
export interface Tecnico {
  id: string
  nombre: string
  especialidad: string
  telefono?: string
  email?: string
  oficina: CiudadOficina
  activo: boolean
  creadoEn: string
}

export type EstadoAsignacion = "programado" | "en_curso" | "completado" | "cancelado"

export interface AsignacionTecnico {
  id: string
  tecnicoId: string
  tipo: TipoOT
  cliente: string
  descripcion: string
  ciudad: CiudadOficina
  fecha: string
  horaInicio?: string
  horaFin?: string
  estado: EstadoAsignacion
  creadoEn: string
}

// Usuarios y Auth
export type RolUsuario = "admin" | "tecnico" | "supervisor" | "administrativo"

export interface Usuario {
  id: string
  nombre: string
  email: string
  password: string
  rol: RolUsuario
  telefono?: string
  telegramChatId?: string
  supervisorId?: string       // supervisor a cargo (id de usuario), solo para tecnicos
  activo: boolean
  creadoEn: string
  permisos?: string[] // módulos a los que tiene acceso (solo técnicos)
  debeChangiarPassword?: boolean // forzar cambio en primer login
}

// Proveedores
export type CategoriaProveedor = "equipos" | "repuestos" | "consumibles" | "servicios" | "otro"

export interface Proveedor {
  id: string
  nombre: string
  pais: string
  ciudad?: string
  contacto?: string
  telefono?: string
  email?: string
  sitioWeb?: string
  categorias: CategoriaProveedor[]
  productos: string
  tiempoEntrega?: string
  calificacion?: number
  notas?: string
  activo: boolean
  creadoEn: string
}

// ── Rendición de Gastos ────────────────────────────────────────────
export type CategoriaGasto =
  | "materiales" | "viaticos" | "herramientas" | "servicios"
  | "combustible" | "alojamiento" | "otro"

export type EstadoGasto = "borrador" | "enviado" | "aprobado" | "rechazado"

export type TipoDocumentoGasto = "boleta" | "factura" | "otro"

export interface Gasto {
  id: string
  fecha: string
  categoria: CategoriaGasto
  descripcion: string
  monto: number
  moneda: "CLP" | "USD"
  responsable: string
  tipoDocumento: TipoDocumentoGasto
  numeroBoleta?: string
  faenaProyecto?: string      // faena o proyecto asociado
  adjuntoBase64?: string      // imagen/PDF en base64 (registros antiguos)
  adjuntoUrl?: string         // enlace del archivo en Storage (nuevo)
  adjuntoNombre?: string      // nombre del archivo
  adjuntoTipo?: string        // MIME type
  estado: EstadoGasto
  observaciones?: string
  creadoEn: string
}

// ── Informe de Entrega de Equipos ──────────────────────────────────
export type EstadoEquipoEntrega = "excelente" | "bueno" | "regular" | "con_fallas"
export type EstadoInformeEntrega = "borrador" | "emitido"

export interface InformeEntrega {
  id: string
  numero: string
  equipo: string
  equipos?: string[]
  numeroSerie?: string
  cliente: string
  empresa?: string
  direccion?: string
  tecnico: string
  fechaEntrega: string
  responsables?: string[]
  estadoEquipo: EstadoEquipoEntrega
  descripcionEntrega: string
  itemsEntregados: string[]
  observaciones?: string
  fotos?: string[]
  estado: EstadoInformeEntrega
  creadoEn: string
}

// ── Configuración de Alertas Programadas ──────────────────────────
export type TipoAlertaConfig =
  | "fin_jornada"
  | "recordatorio_gastos"
  | "recordatorio_informes"
  | "recordatorio_ots"

export interface AlertaConfig {
  id: string
  tipo: TipoAlertaConfig
  activa: boolean
  hora: string
  diasSemana: number[]
  mensaje: string
  ultimaDisparo?: string
}

export interface NotificacionEmailConfig {
  emailDestinatario: string
  habilitado: boolean
  resumenDiario: boolean
  urgentesInmediato: boolean
}


// ── SECCIÓN ADMINISTRATIVA ────────────────────────────────────────────────────
export type EstadoDocumento = "pendiente" | "presentado" | "aprobado" | "rechazado"
export interface DocumentoAdmin {
  id: string
  nombre: string
  tipo?: string
  entidad?: string
  fecha?: string
  estado: EstadoDocumento
  responsable?: string
  archivos?: { url: string; nombre: string }[]
  enlace?: string
  observaciones?: string
  creadoEn: string
}

export type EstadoAgenda = "programada" | "realizada" | "cancelada"
export interface Reunion {
  id: string
  titulo: string
  fecha?: string
  hora?: string
  lugar?: string
  participantes?: string
  tema?: string
  notas?: string
  estado: EstadoAgenda
  creadoEn: string
}

export interface VisitaTecnica {
  id: string
  cliente: string
  fecha?: string
  hora?: string
  direccion?: string
  tecnico?: string
  motivo?: string
  estado: EstadoAgenda
  observaciones?: string
  creadoEn: string
}

export type EstadoLicitacion = "en_estudio" | "en_preparacion" | "presentada" | "adjudicada" | "no_adjudicada" | "desierta"
export interface Licitacion {
  id: string
  nombre: string
  organismo?: string
  numero?: string
  fechaPublicacion?: string
  fechaCierre?: string
  monto?: number
  estado: EstadoLicitacion
  archivos?: { url: string; nombre: string }[]
  enlace?: string
  observaciones?: string
  creadoEn: string
}


// ── NODOS (servicio SIM) y TAREAS ─────────────────────────────────────────────
export type EstadoNodo = "activo" | "suspendido" | "vencido"
export interface Nodo {
  id: string
  equipo: string
  numeroSerie?: string
  numeroSim?: string
  cliente?: string
  fechaInicio?: string
  fechaTermino?: string
  responsable?: string
  estado: EstadoNodo
  observaciones?: string
  creadoEn: string
}

export type EstadoTarea = "pendiente" | "en_proceso" | "completada"
export interface Tarea {
  id: string
  titulo: string
  tipo?: string
  fecha?: string
  hora?: string
  responsable?: string
  responsables?: string[]
  fechaLimite?: string
  fotos?: string[]
  estado: EstadoTarea
  descripcion?: string
  creadoEn: string
}

// Pagos
export type EstadoPago = "pendiente" | "pagado" | "vencido"
export interface Pago {
  id: string
  concepto: string
  tipo?: "por_pagar" | "por_cobrar"
  contraparte?: string
  monto?: number
  moneda?: "CLP" | "USD"
  fechaVencimiento?: string
  estado: EstadoPago
  responsable?: string
  notas?: string
  creadoEn: string
}


// Instalación (supresión de polvo por nebulización aire-agua)
export interface Instalacion {
  id: string
  cliente?: string
  faena?: string
  puntoDescarga?: string
  presionAire: number
  presionAgua: number
  nBoquillas: number
  boquillaTipo: string
  largoCorrea?: number
  espaciamiento?: number
  resultado?: unknown
  observaciones?: string
  creadoEn: string
}
