"use client"

/**
 * store.ts — Minserco (Híbrido localStorage + Supabase)
 *
 * Estrategia:
 * - LEER: desde localStorage (síncrono, sin cambios en páginas existentes)
 * - ESCRIBIR: localStorage inmediato + Supabase en background
 * - SYNC: al hacer login, carga todo desde Supabase a localStorage
 *
 * Esto permite migrar sin tocar ninguna página existente.
 */

import { getSupabase } from "./supabase"
import {
  Mantencion, Proyecto, Reparacion, ItemBodega, MovimientoBodega,
  Importacion, ContratoArriendo, PagoArriendo, ClienteEquipo,
  Cotizacion, OrdenTrabajo, Tecnico, AsignacionTecnico,
  Usuario, Proveedor, Gasto, InformeEntrega, AlertaConfig,
  Equipo, Notificacion,
  DocumentoAdmin, Reunion, VisitaTecnica, Licitacion,
  Nodo, Tarea,
} from "./types"

// ── localStorage helpers (API pública sin cambios) ────────────────────────────

function getId() {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID()
    }
  } catch { /* fallback abajo */ }
  // Fallback UUID v4
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === "x" ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function lsGet<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  try { return JSON.parse(localStorage.getItem(key) || "[]") } catch { return [] }
}

function lsSet<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(key, JSON.stringify(data))
}

// ── Supabase snake_case helpers ───────────────────────────────────────────────

const CAMEL_TO_SNAKE: Record<string, string> = {
  numeroSerie:"numero_serie", proximaMantencion:"proxima_mantencion",
  fechaRecepcion:"fecha_recepcion", fechaEstimada:"fecha_estimada",
  fechaEntrega:"fecha_entrega", costoEstimado:"costo_estimado",
  costoFinal:"costo_final", repuestosUsados:"repuestos_usados",
  cantidadMinima:"cantidad_minima", precioUnitario:"precio_unitario",
  fechaInicio:"fecha_inicio", fechaTermino:"fecha_termino",
  diasAviso:"dias_aviso", montoMensual:"monto_mensual",
  codigoEquipo:"codigo_equipo", paisOrigen:"pais_origen",
  fechaSolicitud:"fecha_solicitud", numeroTracking:"numero_tracking",
  costoTotal:"costo_total", tipoEquipo:"tipo_equipo",
  fechaInstalacion:"fecha_instalacion", garantiaHasta:"garantia_hasta",
  ultimaMantencion:"ultima_mantencion", tecnicoResponsable:"tecnico_responsable",
  fechaEmision:"fecha_emision", fechaVencimiento:"fecha_vencimiento",
  validezDias:"validez_dias", fechaProgramada:"fecha_programada",
  costoManoObra:"costo_mano_obra", costoMateriales:"costo_materiales",
  tipoDocumento:"tipo_documento", numeroBoleta:"numero_boleta",
  faenaProyecto:"faena_proyecto", adjuntoBase64:"adjunto_base64",
  adjuntoNombre:"adjunto_nombre", adjuntoTipo:"adjunto_tipo",
  estadoEquipo:"estado_equipo", descripcionEntrega:"descripcion_entrega",
  itemsEntregados:"items_entregados", creadoEn:"creado_en",
  actualizadoEn:"actualizado_en", sitioWeb:"sitio_web",
  tiempoEntrega:"tiempo_entrega", nuevaFechaTermino:"nueva_fecha_termino",
  contratoId:"contrato_id", itemId:"item_id", nombreItem:"nombre_item",
  tecnicoId:"tecnico_id", horaInicio:"hora_inicio", horaFin:"hora_fin",
  diasSemana:"dias_semana", ultimaDisparo:"ultima_disparo",
  informeId:"informe_id", completadoEn:"completado_en",
  usuarioId:"usuario_id", mantencionId:"mantencion_id",
  supervisorId:"supervisor_id",
  fechaPublicacion:"fecha_publicacion", fechaCierre:"fecha_cierre",
  fichasTecnicas:"fichas_tecnicas", numeroSim:"numero_sim",
}

const SNAKE_TO_CAMEL = Object.fromEntries(
  Object.entries(CAMEL_TO_SNAKE).map(([c, s]) => [s, c])
)

function toSnake(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === "creadoEn" || k === "actualizadoEn") continue // DB maneja timestamps
    // Cadenas vacías -> null: evita errores en columnas date/uuid (ej. proxima_mantencion "")
    out[CAMEL_TO_SNAKE[k] ?? k] = v === "" ? null : v
  }
  return out
}

function toCamel(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    out[SNAKE_TO_CAMEL[k] ?? k] = v
  }
  return out
}

function sbInsert(row: Record<string, unknown>) {
  const { id, ...rest } = row
  void id
  return toSnake(rest)
}

function sbUpdate(changes: Record<string, unknown>) {
  const { id, creadoEn, actualizadoEn, ...rest } = changes as Record<string, unknown>
  void id; void creadoEn; void actualizadoEn
  return toSnake(rest)
}

// Sincroniza silenciosamente a Supabase sin bloquear la UI
async function syncUp(table: string, row: Record<string, unknown>, op: "upsert" | "delete") {
  try {
    const sb = getSupabase()
    if (op === "delete") {
      await sb.from(table).delete().eq("id", row.id as string)
    } else {
      await sb.from(table).upsert(toSnake(row), { onConflict: "id" })
    }
  } catch (e) {
    console.warn(`[store] Supabase sync error (${table}):`, e)
  }
}

// ── SYNC DESDE SUPABASE (llamar al hacer login) ───────────────────────────────

export async function syncFromSupabase() {
  const sb = getSupabase()
  const tables: Array<{ sbTable: string; lsKey: string }> = [
    { sbTable: "mantenciones",       lsKey: "mantenciones"    },
    { sbTable: "reparaciones",       lsKey: "reparaciones"    },
    { sbTable: "proyectos",          lsKey: "proyectos"       },
    { sbTable: "bodega",             lsKey: "bodega"          },
    { sbTable: "movimientos_bodega", lsKey: "movimientos"     },
    { sbTable: "importaciones",      lsKey: "importaciones"   },
    { sbTable: "contratos_arriendo", lsKey: "contratos"       },
    { sbTable: "pagos_arriendo",     lsKey: "pagosArriendo"   },
    { sbTable: "clientes_equipos",   lsKey: "clientesEquipos" },
    { sbTable: "cotizaciones",       lsKey: "cotizaciones"    },
    { sbTable: "ordenes_trabajo",    lsKey: "ordenesTrabajo"  },
    { sbTable: "tecnicos",           lsKey: "tecnicos"        },
    { sbTable: "asignaciones_tecnico", lsKey: "asignaciones"  },
    { sbTable: "proveedores",        lsKey: "proveedores"     },
    { sbTable: "gastos",             lsKey: "gastos"          },
    { sbTable: "informes_entrega",   lsKey: "informesEntrega" },
    { sbTable: "alertas_config",     lsKey: "alertasConfig"   },
    { sbTable: "equipos",            lsKey: "equipos"         },
    { sbTable: "notificaciones",     lsKey: "notificaciones"  },
    { sbTable: "usuarios",           lsKey: "usuarios"        },
    { sbTable: "documentos_admin",   lsKey: "documentosAdmin" },
    { sbTable: "reuniones",          lsKey: "reuniones"       },
    { sbTable: "visitas_tecnicas",   lsKey: "visitasTecnicas" },
    { sbTable: "licitaciones",       lsKey: "licitaciones"    },
    { sbTable: "nodos",              lsKey: "nodos"           },
    { sbTable: "tareas",             lsKey: "tareas"          },
  ]

  await Promise.all(tables.map(async ({ sbTable, lsKey }) => {
    try {
      const { data } = await sb.from(sbTable).select("*")
      if (data) {
        const camel = data.map(r => toCamel(r as Record<string, unknown>))
        lsSet(lsKey, camel)
      }
    } catch (e) {
      console.warn(`[sync] ${sbTable}:`, e)
    }
  }))
}

// ── MANTENCIONES ──────────────────────────────────────────────────────────────

export const mantenciones = {
  getAll: (): Mantencion[] => lsGet("mantenciones"),
  add: (m: Omit<Mantencion, "id" | "creadoEn">): Mantencion => {
    const item: Mantencion = { ...m, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("mantenciones", [...mantenciones.getAll(), item])
    syncUp("mantenciones", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Mantencion>) => {
    lsSet("mantenciones", mantenciones.getAll().map(m => m.id === id ? { ...m, ...changes } : m))
    syncUp("mantenciones", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("mantenciones", mantenciones.getAll().filter(m => m.id !== id))
    syncUp("mantenciones", { id }, "delete")
  },
}

// ── PROYECTOS ─────────────────────────────────────────────────────────────────

export const proyectos = {
  getAll: (): Proyecto[] => lsGet("proyectos"),
  add: (p: Omit<Proyecto, "id" | "creadoEn">): Proyecto => {
    const item: Proyecto = { ...p, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("proyectos", [...proyectos.getAll(), item])
    syncUp("proyectos", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Proyecto>) => {
    lsSet("proyectos", proyectos.getAll().map(p => p.id === id ? { ...p, ...changes } : p))
    syncUp("proyectos", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("proyectos", proyectos.getAll().filter(p => p.id !== id))
    syncUp("proyectos", { id }, "delete")
  },
}

// ── REPARACIONES ──────────────────────────────────────────────────────────────

export const reparaciones = {
  getAll: (): Reparacion[] => lsGet("reparaciones"),
  add: (r: Omit<Reparacion, "id" | "creadoEn">): Reparacion => {
    const item: Reparacion = { ...r, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("reparaciones", [...reparaciones.getAll(), item])
    syncUp("reparaciones", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Reparacion>) => {
    lsSet("reparaciones", reparaciones.getAll().map(r => r.id === id ? { ...r, ...changes } : r))
    syncUp("reparaciones", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("reparaciones", reparaciones.getAll().filter(r => r.id !== id))
    syncUp("reparaciones", { id }, "delete")
  },
}

// ── BODEGA ────────────────────────────────────────────────────────────────────

export const bodega = {
  getAll: (): ItemBodega[] => lsGet("bodega"),
  add: (item: Omit<ItemBodega, "id" | "creadoEn" | "actualizadoEn">): ItemBodega => {
    const now = new Date().toISOString()
    const newItem: ItemBodega = { ...item, id: getId(), creadoEn: now, actualizadoEn: now }
    lsSet("bodega", [...bodega.getAll(), newItem])
    syncUp("bodega", newItem as unknown as Record<string, unknown>, "upsert")
    return newItem
  },
  update: (id: string, changes: Partial<ItemBodega>) => {
    const now = new Date().toISOString()
    lsSet("bodega", bodega.getAll().map(i => i.id === id ? { ...i, ...changes, actualizadoEn: now } : i))
    syncUp("bodega", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("bodega", bodega.getAll().filter(i => i.id !== id))
    syncUp("bodega", { id }, "delete")
  },
}

export const movimientos = {
  getAll: (): MovimientoBodega[] => lsGet("movimientos"),
  add: (m: Omit<MovimientoBodega, "id" | "creadoEn">): MovimientoBodega => {
    const items = bodega.getAll()
    const target = items.find(i => i.id === m.itemId)
    const item: MovimientoBodega = { ...m, nombreItem: target?.nombre, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("movimientos", [...movimientos.getAll(), item])
    if (target) {
      const nueva = m.tipo === "entrada" ? target.cantidad + m.cantidad : target.cantidad - m.cantidad
      bodega.update(m.itemId, { cantidad: Math.max(0, nueva) })
    }
    syncUp("movimientos_bodega", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
}

// ── ARRIENDOS ─────────────────────────────────────────────────────────────────

export const contratos = {
  getAll: (): ContratoArriendo[] => lsGet("contratos"),
  add: (c: Omit<ContratoArriendo, "id" | "creadoEn">): ContratoArriendo => {
    const item: ContratoArriendo = { ...c, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("contratos", [...contratos.getAll(), item])
    syncUp("contratos_arriendo", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<ContratoArriendo>) => {
    lsSet("contratos", contratos.getAll().map(c => c.id === id ? { ...c, ...changes } : c))
    syncUp("contratos_arriendo", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("contratos", contratos.getAll().filter(c => c.id !== id))
    syncUp("contratos_arriendo", { id }, "delete")
  },
}

export const pagosArriendo = {
  getAll: (): PagoArriendo[] => lsGet("pagosArriendo"),
  add: (p: Omit<PagoArriendo, "id" | "creadoEn">): PagoArriendo => {
    const item: PagoArriendo = { ...p, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("pagosArriendo", [...pagosArriendo.getAll(), item])
    if (p.tipo === "extension" && p.nuevaFechaTermino) {
      contratos.update(p.contratoId, { fechaTermino: p.nuevaFechaTermino, estado: "activo" })
    }
    syncUp("pagos_arriendo", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  getByContrato: (contratoId: string): PagoArriendo[] =>
    pagosArriendo.getAll().filter(p => p.contratoId === contratoId),
}

// ── IMPORTACIONES ─────────────────────────────────────────────────────────────

export const importaciones = {
  getAll: (): Importacion[] => lsGet("importaciones"),
  add: (imp: Omit<Importacion, "id" | "creadoEn">): Importacion => {
    const item: Importacion = { ...imp, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("importaciones", [...importaciones.getAll(), item])
    syncUp("importaciones", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Importacion>) => {
    lsSet("importaciones", importaciones.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("importaciones", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("importaciones", importaciones.getAll().filter(i => i.id !== id))
    syncUp("importaciones", { id }, "delete")
  },
}

// ── CLIENTES Y EQUIPOS ────────────────────────────────────────────────────────

export const clientesEquipos = {
  getAll: (): ClienteEquipo[] => lsGet("clientesEquipos"),
  add: (c: Omit<ClienteEquipo, "id" | "creadoEn">): ClienteEquipo => {
    const item: ClienteEquipo = { ...c, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("clientesEquipos", [...clientesEquipos.getAll(), item])
    syncUp("clientes_equipos", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<ClienteEquipo>) => {
    lsSet("clientesEquipos", clientesEquipos.getAll().map(c => c.id === id ? { ...c, ...changes } : c))
    syncUp("clientes_equipos", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("clientesEquipos", clientesEquipos.getAll().filter(c => c.id !== id))
    syncUp("clientes_equipos", { id }, "delete")
  },
}

// ── COTIZACIONES ──────────────────────────────────────────────────────────────

export const cotizaciones = {
  getAll: (): Cotizacion[] => lsGet("cotizaciones"),
  add: (c: Omit<Cotizacion, "id" | "creadoEn">): Cotizacion => {
    const item: Cotizacion = { ...c, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("cotizaciones", [...cotizaciones.getAll(), item])
    syncUp("cotizaciones", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Cotizacion>) => {
    lsSet("cotizaciones", cotizaciones.getAll().map(c => c.id === id ? { ...c, ...changes } : c))
    syncUp("cotizaciones", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("cotizaciones", cotizaciones.getAll().filter(c => c.id !== id))
    syncUp("cotizaciones", { id }, "delete")
  },
  nextNumero: (): string => {
    const year = new Date().getFullYear()
    const all = cotizaciones.getAll().filter(c => c.numero.includes(String(year)))
    return `COT-${year}-${String(all.length + 1).padStart(3, "0")}`
  },
}

// ── ÓRDENES DE TRABAJO ────────────────────────────────────────────────────────

export const ordenesTrabajo = {
  getAll: (): OrdenTrabajo[] => lsGet("ordenesTrabajo"),
  add: (o: Omit<OrdenTrabajo, "id" | "creadoEn">): OrdenTrabajo => {
    const item: OrdenTrabajo = { ...o, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("ordenesTrabajo", [...ordenesTrabajo.getAll(), item])
    syncUp("ordenes_trabajo", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<OrdenTrabajo>) => {
    lsSet("ordenesTrabajo", ordenesTrabajo.getAll().map(o => o.id === id ? { ...o, ...changes } : o))
    syncUp("ordenes_trabajo", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("ordenesTrabajo", ordenesTrabajo.getAll().filter(o => o.id !== id))
    syncUp("ordenes_trabajo", { id }, "delete")
  },
  nextNumero: (): string => {
    const year = new Date().getFullYear()
    const all = ordenesTrabajo.getAll().filter(o => o.numero.includes(String(year)))
    return `OT-${year}-${String(all.length + 1).padStart(3, "0")}`
  },
}

// ── TÉCNICOS ──────────────────────────────────────────────────────────────────

export const tecnicos = {
  getAll: (): Tecnico[] => lsGet("tecnicos"),
  add: (t: Omit<Tecnico, "id" | "creadoEn">): Tecnico => {
    const item: Tecnico = { ...t, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("tecnicos", [...tecnicos.getAll(), item])
    syncUp("tecnicos", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Tecnico>) => {
    lsSet("tecnicos", tecnicos.getAll().map(t => t.id === id ? { ...t, ...changes } : t))
    syncUp("tecnicos", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("tecnicos", tecnicos.getAll().filter(t => t.id !== id))
    syncUp("tecnicos", { id }, "delete")
  },
}

export const asignaciones = {
  getAll: (): AsignacionTecnico[] => lsGet("asignaciones"),
  add: (a: Omit<AsignacionTecnico, "id" | "creadoEn">): AsignacionTecnico => {
    const item: AsignacionTecnico = { ...a, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("asignaciones", [...asignaciones.getAll(), item])
    syncUp("asignaciones_tecnico", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<AsignacionTecnico>) => {
    lsSet("asignaciones", asignaciones.getAll().map(a => a.id === id ? { ...a, ...changes } : a))
    syncUp("asignaciones_tecnico", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("asignaciones", asignaciones.getAll().filter(a => a.id !== id))
    syncUp("asignaciones_tecnico", { id }, "delete")
  },
}

// ── USUARIOS ──────────────────────────────────────────────────────────────────

export const usuarios = {
  getAll: (): Usuario[] => lsGet("usuarios"),
  add: (u: Omit<Usuario, "id" | "creadoEn">): Usuario => {
    const item: Usuario = { ...u, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("usuarios", [...usuarios.getAll(), item])
    return item
  },
  update: (id: string, changes: Partial<Usuario>) => {
    lsSet("usuarios", usuarios.getAll().map(u => u.id === id ? { ...u, ...changes } : u))
  },
  delete: (id: string) => {
    lsSet("usuarios", usuarios.getAll().filter(u => u.id !== id))
  },
  findByEmail: (email: string): Usuario | undefined =>
    usuarios.getAll().find(u => u.email.toLowerCase() === email.toLowerCase()),
  ensureAdmin: () => {
    // No-op: usuarios gestionados por Supabase Auth
  },
}

export const session = {
  get: (): Usuario | null => {
    if (typeof window === "undefined") return null
    try { return JSON.parse(localStorage.getItem("sesionActual") || "null") } catch { return null }
  },
  set: (u: Usuario | null) => {
    if (typeof window === "undefined") return
    if (u) localStorage.setItem("sesionActual", JSON.stringify(u))
    else localStorage.removeItem("sesionActual")
  },
}

// ── PROVEEDORES ───────────────────────────────────────────────────────────────

export const proveedores = {
  getAll: (): Proveedor[] => lsGet("proveedores"),
  add: (p: Omit<Proveedor, "id" | "creadoEn">): Proveedor => {
    const item: Proveedor = { ...p, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("proveedores", [...proveedores.getAll(), item])
    syncUp("proveedores", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Proveedor>) => {
    lsSet("proveedores", proveedores.getAll().map(p => p.id === id ? { ...p, ...changes } : p))
    syncUp("proveedores", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("proveedores", proveedores.getAll().filter(p => p.id !== id))
    syncUp("proveedores", { id }, "delete")
  },
}

// ── GASTOS ────────────────────────────────────────────────────────────────────

export const gastos = {
  getAll: (): Gasto[] => lsGet("gastos"),
  add: (g: Omit<Gasto, "id" | "creadoEn">): Gasto => {
    const item: Gasto = { ...g, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("gastos", [...gastos.getAll(), item])
    syncUp("gastos", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Gasto>) => {
    lsSet("gastos", gastos.getAll().map(g => g.id === id ? { ...g, ...changes } : g))
    syncUp("gastos", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("gastos", gastos.getAll().filter(g => g.id !== id))
    syncUp("gastos", { id }, "delete")
  },
}

// ── INFORMES DE ENTREGA ───────────────────────────────────────────────────────

export const informesEntrega = {
  getAll: (): InformeEntrega[] => lsGet("informesEntrega"),
  add: (inf: Omit<InformeEntrega, "id" | "creadoEn">): InformeEntrega => {
    const item: InformeEntrega = { ...inf, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("informesEntrega", [...informesEntrega.getAll(), item])
    syncUp("informes_entrega", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<InformeEntrega>) => {
    lsSet("informesEntrega", informesEntrega.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("informes_entrega", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("informesEntrega", informesEntrega.getAll().filter(i => i.id !== id))
    syncUp("informes_entrega", { id }, "delete")
  },
  nextNumero: (): string => {
    const all = informesEntrega.getAll()
    return `IFE-${new Date().getFullYear()}-${String(all.length + 1).padStart(3, "0")}`
  },
}

// ── ALERTAS CONFIG ────────────────────────────────────────────────────────────

const DEFAULT_ALERTAS: AlertaConfig[] = [
  { id:"fin-jornada",  tipo:"fin_jornada",           activa:true, hora:"17:30", diasSemana:[1,2,3,4,5], mensaje:"Fin de jornada: revisa gastos e informes pendientes" },
  { id:"rec-gastos",   tipo:"recordatorio_gastos",   activa:true, hora:"12:00", diasSemana:[5],          mensaje:"Viernes: envía las rendiciones de gastos de la semana" },
  { id:"rec-informes", tipo:"recordatorio_informes", activa:true, hora:"16:00", diasSemana:[1,2,3,4,5], mensaje:"Recuerda emitir informes de entrega pendientes" },
]

export const alertasConfig = {
  getAll: (): AlertaConfig[] => {
    const stored = lsGet<AlertaConfig>("alertasConfig")
    return stored.length > 0 ? stored : DEFAULT_ALERTAS
  },
  update: (id: string, changes: Partial<AlertaConfig>) => {
    const all = alertasConfig.getAll()
    const updated = all.map(a => a.id === id ? { ...a, ...changes } : a)
    lsSet("alertasConfig", updated)
    syncUp("alertas_config", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  marcarDisparado: (id: string) => {
    alertasConfig.update(id, { ultimaDisparo: new Date().toISOString().slice(0, 10) })
  },
}

// Exportar sbInsert/sbUpdate por si algún módulo futuro los necesita
export { sbInsert, sbUpdate }


// ── EQUIPOS ───────────────────────────────────────────────────────────────────

export const equipos = {
  getAll: (): Equipo[] => lsGet("equipos"),
  add: (e: Omit<Equipo, "id" | "creadoEn">): Equipo => {
    const item: Equipo = { ...e, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("equipos", [...equipos.getAll(), item])
    syncUp("equipos", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Equipo>) => {
    lsSet("equipos", equipos.getAll().map(e => e.id === id ? { ...e, ...changes } : e))
    syncUp("equipos", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("equipos", equipos.getAll().filter(e => e.id !== id))
    syncUp("equipos", { id }, "delete")
  },
}

// ── NOTIFICACIONES ────────────────────────────────────────────────────────────

export const notificaciones = {
  getAll: (): Notificacion[] => lsGet("notificaciones"),
  add: (n: Omit<Notificacion, "id" | "creadoEn">): Notificacion => {
    const item: Notificacion = { ...n, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("notificaciones", [...notificaciones.getAll(), item])
    syncUp("notificaciones", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  marcarLeida: (id: string) => {
    lsSet("notificaciones", notificaciones.getAll().map(n => n.id === id ? { ...n, leida: true } : n))
    syncUp("notificaciones", { id, leida: true } as Record<string, unknown>, "upsert")
  },
  marcarTodasLeidas: () => {
    notificaciones.getAll().filter(n => !n.leida).forEach(n => notificaciones.marcarLeida(n.id))
  },
}


// ── SECCIÓN ADMINISTRATIVA ────────────────────────────────────────────────────

export const documentosAdmin = {
  getAll: (): DocumentoAdmin[] => lsGet("documentosAdmin"),
  add: (d: Omit<DocumentoAdmin, "id" | "creadoEn">): DocumentoAdmin => {
    const item: DocumentoAdmin = { ...d, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("documentosAdmin", [...documentosAdmin.getAll(), item])
    syncUp("documentos_admin", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<DocumentoAdmin>) => {
    lsSet("documentosAdmin", documentosAdmin.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("documentos_admin", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("documentosAdmin", documentosAdmin.getAll().filter(i => i.id !== id))
    syncUp("documentos_admin", { id }, "delete")
  },
}

export const reuniones = {
  getAll: (): Reunion[] => lsGet("reuniones"),
  add: (r: Omit<Reunion, "id" | "creadoEn">): Reunion => {
    const item: Reunion = { ...r, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("reuniones", [...reuniones.getAll(), item])
    syncUp("reuniones", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Reunion>) => {
    lsSet("reuniones", reuniones.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("reuniones", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("reuniones", reuniones.getAll().filter(i => i.id !== id))
    syncUp("reuniones", { id }, "delete")
  },
}

export const visitasTecnicas = {
  getAll: (): VisitaTecnica[] => lsGet("visitasTecnicas"),
  add: (v: Omit<VisitaTecnica, "id" | "creadoEn">): VisitaTecnica => {
    const item: VisitaTecnica = { ...v, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("visitasTecnicas", [...visitasTecnicas.getAll(), item])
    syncUp("visitas_tecnicas", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<VisitaTecnica>) => {
    lsSet("visitasTecnicas", visitasTecnicas.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("visitas_tecnicas", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("visitasTecnicas", visitasTecnicas.getAll().filter(i => i.id !== id))
    syncUp("visitas_tecnicas", { id }, "delete")
  },
}

export const licitaciones = {
  getAll: (): Licitacion[] => lsGet("licitaciones"),
  add: (l: Omit<Licitacion, "id" | "creadoEn">): Licitacion => {
    const item: Licitacion = { ...l, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("licitaciones", [...licitaciones.getAll(), item])
    syncUp("licitaciones", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Licitacion>) => {
    lsSet("licitaciones", licitaciones.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("licitaciones", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("licitaciones", licitaciones.getAll().filter(i => i.id !== id))
    syncUp("licitaciones", { id }, "delete")
  },
}


// ── NODOS y TAREAS ────────────────────────────────────────────────────────────

export const nodos = {
  getAll: (): Nodo[] => lsGet("nodos"),
  add: (n: Omit<Nodo, "id" | "creadoEn">): Nodo => {
    const item: Nodo = { ...n, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("nodos", [...nodos.getAll(), item])
    syncUp("nodos", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Nodo>) => {
    lsSet("nodos", nodos.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("nodos", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("nodos", nodos.getAll().filter(i => i.id !== id))
    syncUp("nodos", { id }, "delete")
  },
}

export const tareas = {
  getAll: (): Tarea[] => lsGet("tareas"),
  add: (t: Omit<Tarea, "id" | "creadoEn">): Tarea => {
    const item: Tarea = { ...t, id: getId(), creadoEn: new Date().toISOString() }
    lsSet("tareas", [...tareas.getAll(), item])
    syncUp("tareas", item as unknown as Record<string, unknown>, "upsert")
    return item
  },
  update: (id: string, changes: Partial<Tarea>) => {
    lsSet("tareas", tareas.getAll().map(i => i.id === id ? { ...i, ...changes } : i))
    syncUp("tareas", { id, ...changes } as Record<string, unknown>, "upsert")
  },
  delete: (id: string) => {
    lsSet("tareas", tareas.getAll().filter(i => i.id !== id))
    syncUp("tareas", { id }, "delete")
  },
}
