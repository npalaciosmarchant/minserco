/**
 * migrate-localstorage.mjs
 *
 * Exporta todos los datos de localStorage del navegador a Supabase.
 *
 * INSTRUCCIONES:
 * 1. Abre la app en el navegador (localhost:3000) con los datos actuales.
 * 2. Abre la consola del navegador (F12 → Console).
 * 3. Pega y ejecuta el siguiente bloque para exportar los datos:
 *
 *    copy(JSON.stringify({
 *      mantenciones:    JSON.parse(localStorage.getItem('mantenciones')    || '[]'),
 *      reparaciones:    JSON.parse(localStorage.getItem('reparaciones')    || '[]'),
 *      bodega:          JSON.parse(localStorage.getItem('bodega')          || '[]'),
 *      movimientos:     JSON.parse(localStorage.getItem('movimientos')     || '[]'),
 *      importaciones:   JSON.parse(localStorage.getItem('importaciones')   || '[]'),
 *      contratos:       JSON.parse(localStorage.getItem('contratos')       || '[]'),
 *      pagosArriendo:   JSON.parse(localStorage.getItem('pagosArriendo')   || '[]'),
 *      clientesEquipos: JSON.parse(localStorage.getItem('clientesEquipos') || '[]'),
 *      cotizaciones:    JSON.parse(localStorage.getItem('cotizaciones')    || '[]'),
 *      ordenesTrabajo:  JSON.parse(localStorage.getItem('ordenesTrabajo')  || '[]'),
 *      tecnicos:        JSON.parse(localStorage.getItem('tecnicos')        || '[]'),
 *      asignaciones:    JSON.parse(localStorage.getItem('asignaciones')    || '[]'),
 *      proyectos:       JSON.parse(localStorage.getItem('proyectos')       || '[]'),
 *      proveedores:     JSON.parse(localStorage.getItem('proveedores')     || '[]'),
 *      gastos:          JSON.parse(localStorage.getItem('gastos')          || '[]'),
 *      informesEntrega: JSON.parse(localStorage.getItem('informesEntrega') || '[]'),
 *    }))
 *
 * 4. Pega el resultado en un archivo llamado "export.json" en esta carpeta.
 *
 * 5. Ejecuta desde la raíz del proyecto:
 *    node scripts/migrate-localstorage.mjs
 */

import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))

// Lee variables de entorno manualmente (sin dotenv para simplificar)
const envFile = readFileSync(join(__dirname, "../.env.local"), "utf8")
const env = Object.fromEntries(
  envFile.split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => l.split("=").map(p => p.trim()))
)

const SUPABASE_URL = env["NEXT_PUBLIC_SUPABASE_URL"]
const SERVICE_KEY  = env["SUPABASE_SERVICE_ROLE_KEY"]

if (!SUPABASE_URL || !SERVICE_KEY || SUPABASE_URL.includes("TU-PROYECTO")) {
  console.error("❌ Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local")
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false }
})

// Lee el export
const exportPath = join(__dirname, "export.json")
let data
try {
  data = JSON.parse(readFileSync(exportPath, "utf8"))
} catch {
  console.error("❌ No se encontró scripts/export.json — genera el archivo según las instrucciones.")
  process.exit(1)
}

// Mapeo camelCase → snake_case para cada tabla
function snakeCase(key) {
  const map = {
    numeroSerie: "numero_serie", proximaMantencion: "proxima_mantencion",
    fechaRecepcion: "fecha_recepcion", fechaEstimada: "fecha_estimada",
    fechaEntrega: "fecha_entrega", costoEstimado: "costo_estimado",
    costoFinal: "costo_final", repuestosUsados: "repuestos_usados",
    cantidadMinima: "cantidad_minima", precioUnitario: "precio_unitario",
    fechaInicio: "fecha_inicio", fechaTermino: "fecha_termino",
    diasAviso: "dias_aviso", montoMensual: "monto_mensual",
    codigoEquipo: "codigo_equipo", paisOrigen: "pais_origen",
    fechaSolicitud: "fecha_solicitud", numeroTracking: "numero_tracking",
    costoTotal: "costo_total", tipoEquipo: "tipo_equipo",
    fechaInstalacion: "fecha_instalacion", garantiaHasta: "garantia_hasta",
    ultimaMantencion: "ultima_mantencion", tecnicoResponsable: "tecnico_responsable",
    fechaEmision: "fecha_emision", fechaVencimiento: "fecha_vencimiento",
    validezDias: "validez_dias", fechaProgramada: "fecha_programada",
    costoManoObra: "costo_mano_obra", costoMateriales: "costo_materiales",
    tipoDocumento: "tipo_documento", numeroBoleta: "numero_boleta",
    faenaProyecto: "faena_proyecto", adjuntoBase64: "adjunto_base64",
    adjuntoNombre: "adjunto_nombre", adjuntoTipo: "adjunto_tipo",
    estadoEquipo: "estado_equipo", descripcionEntrega: "descripcion_entrega",
    itemsEntregados: "items_entregados", creadoEn: "creado_en",
    actualizadoEn: "actualizado_en", sitioWeb: "sitio_web",
    tiempoEntrega: "tiempo_entrega", nuevaFechaTermino: "nueva_fecha_termino",
    contratoId: "contrato_id", itemId: "item_id", nombreItem: "nombre_item",
    tecnicoId: "tecnico_id", horaInicio: "hora_inicio", horaFin: "hora_fin",
    fechaTermino2: "fecha_termino",
  }
  return map[key] ?? key
}

function convertRow(obj) {
  const out = {}
  for (const [k, v] of Object.entries(obj)) {
    if (k === "password") continue // no migrar contraseñas
    out[snakeCase(k)] = v
  }
  return out
}

async function migrate(table, rows, label) {
  if (!rows?.length) { console.log(`⏭  ${label}: sin datos`); return }
  const converted = rows.map(convertRow)
  const { error } = await sb.from(table).upsert(converted, { onConflict: "id", ignoreDuplicates: true })
  if (error) console.error(`❌ ${label}:`, error.message)
  else console.log(`✅ ${label}: ${rows.length} registros migrados`)
}

console.log("\n🚀 Iniciando migración de localStorage → Supabase\n")

await migrate("mantenciones",       data.mantenciones,    "Mantenciones")
await migrate("reparaciones",       data.reparaciones,    "Reparaciones")
await migrate("bodega",             data.bodega,          "Bodega")
await migrate("importaciones",      data.importaciones,   "Importaciones")
await migrate("clientes_equipos",   data.clientesEquipos, "Clientes/Equipos")
await migrate("contratos_arriendo", data.contratos,       "Contratos arriendo")
await migrate("pagos_arriendo",     data.pagosArriendo,   "Pagos arriendo")
await migrate("cotizaciones",       data.cotizaciones,    "Cotizaciones")
await migrate("ordenes_trabajo",    data.ordenesTrabajo,  "Órdenes de trabajo")
await migrate("tecnicos",           data.tecnicos,        "Técnicos")
await migrate("asignaciones_tecnico", data.asignaciones,  "Asignaciones")
await migrate("proyectos",          data.proyectos,       "Proyectos")
await migrate("proveedores",        data.proveedores,     "Proveedores")
await migrate("gastos",             data.gastos,          "Gastos")
await migrate("informes_entrega",   data.informesEntrega, "Informes entrega")

// Movimientos: no migrar stock (se recalculará desde bodega)
console.log("\n⚠️  Movimientos de bodega: omitidos (el stock ya está en 'bodega')\n")

console.log("🎉 Migración completada.\n")
