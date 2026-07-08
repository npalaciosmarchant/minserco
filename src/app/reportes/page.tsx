"use client"

import { useEffect, useState } from "react"
import ExcelJS from "exceljs"
import {
  mantenciones, reparaciones, proyectos, cotizaciones,
  ordenesTrabajo, clientesEquipos, contratos, bodega, importaciones, tecnicos, asignaciones, movimientos, pagosArriendo, proveedores,
} from "@/lib/store"
import { Download, FileSpreadsheet, BarChart3, Wrench, Settings, FileText, ClipboardList, Database, Upload } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const AZUL = "FF1A3673"

const ESTADOS: Record<string, string> = {
  completado: "Completado", pendiente: "Pendiente", en_proceso: "En proceso",
  entregado: "Entregado", en_reparacion: "En reparación", ingresado: "Ingresado",
  diagnostico: "Diagnóstico", esperando_repuestos: "Esperando repuestos", listo: "Listo para entrega",
  recibido: "Recibido",
  aceptada: "Aceptada", rechazada: "Rechazada", enviada: "Enviada", borrador: "Borrador", vencida: "Vencida",
  completada: "Completada", en_curso: "En curso", cancelada: "Cancelada", planificada: "Planificada",
}
function estadoLabel(e?: string | null): string {
  if (!e) return ""
  return ESTADOS[e] ?? e
}

function fmtClp(n: number): string {
  return `$${(n || 0).toLocaleString("es-CL")}`
}

function fmtFecha(v?: string | null): string {
  if (!v) return ""
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  return `${dd}-${mm}-${d.getFullYear()}`
}

type Col = { h: string; w: number }
type Celda = string | number

// Crea una hoja formateada: título, encabezados con estilo, filas y bloque resumen.
function crearHoja(
  wb: ExcelJS.Workbook, nombreHoja: string, titulo: string,
  cols: Col[], filas: Celda[][], resumen: [string, Celda][],
) {
  const ws = wb.addWorksheet(nombreHoja)
  ws.columns = cols.map(c => ({ width: c.w }))

  // Título
  const tRow = ws.addRow([titulo])
  ws.mergeCells(1, 1, 1, cols.length)
  tRow.getCell(1).font = { bold: true, size: 13, color: { argb: AZUL } }
  tRow.height = 20
  ws.addRow([])

  // Encabezados
  const hRow = ws.addRow(cols.map(c => c.h))
  hRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } }
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: AZUL } }
    cell.alignment = { vertical: "middle" }
    cell.border = { bottom: { style: "thin", color: { argb: "FFB0B7C3" } } }
  })

  // Datos
  if (filas.length === 0) {
    ws.addRow(["Sin registros en este período"])
  } else {
    filas.forEach(f => ws.addRow(f))
  }

  // Resumen
  if (resumen.length) {
    ws.addRow([])
    const rRow = ws.addRow(["RESUMEN"])
    rRow.getCell(1).font = { bold: true, color: { argb: AZUL } }
    resumen.forEach(([k, v]) => {
      const row = ws.addRow([k, v])
      row.getCell(1).font = { bold: true }
    })
  }
  return ws
}

async function descargarXlsx(wb: ExcelJS.Workbook, nombre: string) {
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

async function generarReporteMantenciones(mes: number, año: number) {
  const ms = mantenciones.getAll()
    .filter(m => { const d = new Date(m.creadoEn); return d.getMonth() === mes && d.getFullYear() === año })
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  const wb = new ExcelJS.Workbook()
  crearHoja(wb, "Mantenciones", `REPORTE DE MANTENCIONES — ${MESES[mes]} ${año}`,
    [{ h: "N°", w: 6 }, { h: "Equipo", w: 26 }, { h: "Tipo", w: 16 }, { h: "Estado", w: 14 }, { h: "Fecha registro", w: 15 }, { h: "Próxima mantención", w: 18 }, { h: "Técnico", w: 28 }, { h: "Observaciones", w: 40 }],
    ms.map((m, i) => [i + 1, m.equipo, m.tipo ?? "", estadoLabel(m.estado), fmtFecha(m.creadoEn), fmtFecha(m.proximaMantencion), m.tecnico ?? "", m.observaciones ?? ""]),
    [
      ["Total registros", ms.length],
      ["Completadas", ms.filter(m => m.estado === "completado").length],
      ["Pendientes", ms.filter(m => m.estado === "pendiente").length],
      ["En proceso", ms.filter(m => m.estado === "en_proceso").length],
    ])
  await descargarXlsx(wb, `Mantenciones_${MESES[mes]}_${año}.xlsx`)
}

async function generarReporteReparaciones(mes: number, año: number) {
  const rs = reparaciones.getAll()
    .filter(r => { const d = new Date(r.creadoEn); return d.getMonth() === mes && d.getFullYear() === año })
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
  const totalCosto = rs.reduce((s, r) => s + (r.costoFinal ?? r.costoEstimado ?? 0), 0)
  const wb = new ExcelJS.Workbook()
  crearHoja(wb, "Reparaciones", `REPORTE DE REPARACIONES — ${MESES[mes]} ${año}`,
    [{ h: "N°", w: 6 }, { h: "Equipo", w: 26 }, { h: "Cliente", w: 24 }, { h: "Estado", w: 16 }, { h: "Diagnóstico", w: 40 }, { h: "Costo estimado (CLP)", w: 18 }, { h: "Costo final (CLP)", w: 18 }, { h: "Fecha ingreso", w: 14 }, { h: "Técnico", w: 24 }],
    rs.map((r, i) => [i + 1, r.equipo, r.cliente ?? "", estadoLabel(r.estado), r.diagnostico ?? "", r.costoEstimado ?? 0, r.costoFinal ?? 0, fmtFecha(r.creadoEn), r.tecnico ?? ""]),
    [
      ["Total registros", rs.length],
      ["Entregadas", rs.filter(r => r.estado === "entregado").length],
      ["En reparación", rs.filter(r => r.estado === "en_reparacion").length],
      ["Ingresos estimados", fmtClp(totalCosto)],
    ])
  await descargarXlsx(wb, `Reparaciones_${MESES[mes]}_${año}.xlsx`)
}

async function generarReporteCotizaciones(mes: number, año: number) {
  const cs = cotizaciones.getAll()
    .filter(c => { const d = new Date(c.creadoEn); return d.getMonth() === mes && d.getFullYear() === año })
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero)))
  const aceptadas = cs.filter(c => c.estado === "aceptada")
  const wb = new ExcelJS.Workbook()
  crearHoja(wb, "Cotizaciones", `REPORTE DE COTIZACIONES — ${MESES[mes]} ${año}`,
    [{ h: "N°", w: 6 }, { h: "N° Cotización", w: 14 }, { h: "Cliente", w: 24 }, { h: "Empresa", w: 24 }, { h: "Estado", w: 12 }, { h: "Subtotal (CLP)", w: 15 }, { h: "Descuento %", w: 12 }, { h: "Total (CLP)", w: 15 }, { h: "Fecha emisión", w: 14 }, { h: "Fecha vencimiento", w: 16 }, { h: "Ítems", w: 8 }],
    cs.map((c, i) => [i + 1, c.numero, c.cliente ?? "", c.empresa ?? "", estadoLabel(c.estado), c.subtotal, c.descuento, c.total, fmtFecha(c.fechaEmision), fmtFecha(c.fechaVencimiento), c.items.length]),
    [
      ["Total cotizaciones", cs.length],
      ["Aceptadas", aceptadas.length],
      ["Rechazadas", cs.filter(c => c.estado === "rechazada").length],
      ["Enviadas", cs.filter(c => c.estado === "enviada").length],
      ["Total ingreso (aceptadas)", fmtClp(aceptadas.reduce((s, c) => s + c.total, 0))],
    ])
  await descargarXlsx(wb, `Cotizaciones_${MESES[mes]}_${año}.xlsx`)
}

async function generarReporteOTs(mes: number, año: number) {
  const ots = ordenesTrabajo.getAll()
    .filter(o => { const d = new Date(o.creadoEn); return d.getMonth() === mes && d.getFullYear() === año })
    .sort((a, b) => String(a.numero).localeCompare(String(b.numero)))
  const wb = new ExcelJS.Workbook()
  crearHoja(wb, "Órdenes de Trabajo", `REPORTE DE ÓRDENES DE TRABAJO — ${MESES[mes]} ${año}`,
    [{ h: "N°", w: 6 }, { h: "N° OT", w: 12 }, { h: "Cliente", w: 24 }, { h: "Empresa", w: 24 }, { h: "Tipo", w: 18 }, { h: "Estado", w: 14 }, { h: "Técnico", w: 24 }, { h: "Fecha inicio", w: 14 }, { h: "Fecha término", w: 14 }, { h: "Costo materiales (CLP)", w: 18 }, { h: "Costo mano de obra (CLP)", w: 20 }, { h: "Total (CLP)", w: 15 }, { h: "Observaciones", w: 40 }],
    ots.map((o, i) => {
      const total = (o.costoMateriales ?? 0) + (o.costoManoObra ?? 0)
      return [i + 1, o.numero, o.cliente ?? "", o.empresa ?? "", o.tipo ?? "", estadoLabel(o.estado), o.tecnico ?? "", fmtFecha(o.fechaInicio), fmtFecha(o.fechaTermino), o.costoMateriales ?? 0, o.costoManoObra ?? 0, total, o.observaciones ?? ""]
    }),
    [
      ["Total OTs", ots.length],
      ["Completadas", ots.filter(o => o.estado === "completada").length],
      ["En curso", ots.filter(o => o.estado === "en_curso").length],
      ["Ingresos estimados", fmtClp(ots.reduce((s, o) => s + (o.costoMateriales ?? 0) + (o.costoManoObra ?? 0), 0))],
    ])
  await descargarXlsx(wb, `OrdenesTrabajo_${MESES[mes]}_${año}.xlsx`)
}

async function generarReporteCompleto(mes: number, año: number) {
  const ms = mantenciones.getAll().filter(m => new Date(m.creadoEn).getMonth() === mes && new Date(m.creadoEn).getFullYear() === año)
  const rs = reparaciones.getAll().filter(r => new Date(r.creadoEn).getMonth() === mes && new Date(r.creadoEn).getFullYear() === año)
  const ps = proyectos.getAll().filter(p => new Date(p.creadoEn).getMonth() === mes && new Date(p.creadoEn).getFullYear() === año)
  const cs = cotizaciones.getAll().filter(c => new Date(c.creadoEn).getMonth() === mes && new Date(c.creadoEn).getFullYear() === año)
  const ots = ordenesTrabajo.getAll().filter(o => new Date(o.creadoEn).getMonth() === mes && new Date(o.creadoEn).getFullYear() === año)
  const ingresoCots = cs.filter(c => c.estado === "aceptada").reduce((s, c) => s + c.total, 0)
  const ingresoRep = rs.reduce((s, r) => s + (r.costoFinal ?? r.costoEstimado ?? 0), 0)
  const ingresoOTs = ots.reduce((s, o) => s + (o.costoMateriales ?? 0) + (o.costoManoObra ?? 0), 0)

  const wb = new ExcelJS.Workbook()
  const filas: Celda[][] = [
    ["Mantenciones", "Total registros", ms.length],
    ["Mantenciones", "Completadas", ms.filter(m => m.estado === "completado").length],
    ["Mantenciones", "Pendientes", ms.filter(m => m.estado === "pendiente").length],
    ["Reparaciones", "Total registros", rs.length],
    ["Reparaciones", "Entregadas", rs.filter(r => r.estado === "entregado").length],
    ["Reparaciones", "Ingresos estimados", fmtClp(ingresoRep)],
    ["Fabricación", "Total proyectos", ps.length],
    ["Fabricación", "Completados", ps.filter(p => p.estado === "completado").length],
    ["Cotizaciones", "Total generadas", cs.length],
    ["Cotizaciones", "Aceptadas", cs.filter(c => c.estado === "aceptada").length],
    ["Cotizaciones", "Ingreso cotizaciones aceptadas", fmtClp(ingresoCots)],
    ["Órdenes de Trabajo", "Total OTs", ots.length],
    ["Órdenes de Trabajo", "Completadas", ots.filter(o => o.estado === "completada").length],
    ["Órdenes de Trabajo", "Ingreso OTs", fmtClp(ingresoOTs)],
    ["TOTAL", "Ingreso total estimado", fmtClp(ingresoCots + ingresoRep + ingresoOTs)],
  ]
  crearHoja(wb, "Resumen", `REPORTE MENSUAL MINSERCO — ${MESES[mes].toUpperCase()} ${año}`,
    [{ h: "Módulo", w: 24 }, { h: "Métrica", w: 34 }, { h: "Valor", w: 20 }],
    filas, [])
  await descargarXlsx(wb, `Reporte_Completo_${MESES[mes]}_${año}.xlsx`)
}

type Modulo = { id: string; label: string; icon: React.ElementType; color: string; fn: (mes: number, año: number) => Promise<void>; descripcion: string }

export default function ReportesPage() {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [año, setAño] = useState(hoy.getFullYear())
  const [stats, setStats] = useState({ mantenciones: 0, reparaciones: 0, cotizaciones: 0, ots: 0, ingreso: 0 })

  useEffect(() => {
    const ms = mantenciones.getAll().filter(m => new Date(m.creadoEn).getMonth() === mes && new Date(m.creadoEn).getFullYear() === año)
    const rs = reparaciones.getAll().filter(r => new Date(r.creadoEn).getMonth() === mes && new Date(r.creadoEn).getFullYear() === año)
    const cs = cotizaciones.getAll().filter(c => new Date(c.creadoEn).getMonth() === mes && new Date(c.creadoEn).getFullYear() === año)
    const ots = ordenesTrabajo.getAll().filter(o => new Date(o.creadoEn).getMonth() === mes && new Date(o.creadoEn).getFullYear() === año)
    const ingresoCots = cs.filter(c => c.estado === "aceptada").reduce((s, c) => s + c.total, 0)
    const ingresoRep = rs.reduce((s, r) => s + (r.costoFinal ?? r.costoEstimado ?? 0), 0)
    const ingresoOTs = ots.reduce((s, o) => s + (o.costoMateriales ?? 0) + (o.costoManoObra ?? 0), 0)
    setStats({ mantenciones: ms.length, reparaciones: rs.length, cotizaciones: cs.length, ots: ots.length, ingreso: ingresoCots + ingresoRep + ingresoOTs })
  }, [mes, año])

  const modulos: Modulo[] = [
    { id: "mantenciones", label: "Mantenciones", icon: Wrench, color: "#f59e0b", fn: generarReporteMantenciones, descripcion: "Equipos, estados, técnicos y próximas fechas" },
    { id: "reparaciones", label: "Reparaciones", icon: Settings, color: "#fb923c", fn: generarReporteReparaciones, descripcion: "Diagnósticos, costos y estados de entrega" },
    { id: "cotizaciones", label: "Cotizaciones", icon: FileText, color: "#059669", fn: generarReporteCotizaciones, descripcion: "Números, montos, estados y fechas de validez" },
    { id: "ordenes", label: "Órdenes de Trabajo", icon: ClipboardList, color: "#60a5fa", fn: generarReporteOTs, descripcion: "Tipos, técnicos, costos y estados" },
  ]

  const años = [hoy.getFullYear() - 1, hoy.getFullYear(), hoy.getFullYear() + 1]

  return (
    <PageShell
      icon={BarChart3}
      title="Reportes Mensuales"
      subtitle="Exporta datos por módulo en archivos Excel (.xlsx)"
      color="#f59e0b"
    >
      <div className="space-y-6">

      {/* Selector de período */}
      <div className="rounded-xl p-4 flex flex-wrap items-center gap-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2">
          <BarChart3 size={16} style={{ color: "#f59e0b" }} />
          <span className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Período:</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {MESES.map((m, i) => (
            <button key={m} onClick={() => setMes(i)}
              className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors"
              style={mes === i
                ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                : { background: "var(--accent)", color: "var(--muted-foreground)" }}>
              {m.slice(0, 3)}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {años.map(a => (
            <button key={a} onClick={() => setAño(a)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={año === a
                ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                : { background: "var(--accent)", color: "var(--muted-foreground)" }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen del período seleccionado */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Mantenciones", value: stats.mantenciones, color: "#f59e0b" },
          { label: "Reparaciones", value: stats.reparaciones, color: "#fb923c" },
          { label: "Cotizaciones", value: stats.cotizaciones, color: "#059669" },
          { label: "OTs", value: stats.ots, color: "#60a5fa" },
          { label: "Ingreso estimado", value: `$${stats.ingreso.toLocaleString("es-CL")}`, color: "#7c3aed", isString: true },
        ].map(({ label, value, color, isString }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--muted-foreground)" }}>{label}</p>
            {isString
              ? <p className="text-sm font-bold truncate" style={{ color }}>{value as string}</p>
              : <p className="text-2xl font-bold" style={{ color }}>{value as number}</p>
            }
          </div>
        ))}
      </div>

      {/* Reporte completo */}
      <div className="rounded-xl p-5 flex items-center justify-between bg-white"
        style={{ border: "1px solid #e5e7eb", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#fef3c7" }}>
            <FileSpreadsheet size={20} style={{ color: "#d97706" }} />
          </div>
          <div>
            <p className="font-bold text-sm text-gray-900">Reporte Completo — {MESES[mes]} {año}</p>
            <p className="text-xs text-gray-500">Resumen ejecutivo de todos los módulos en un solo archivo Excel</p>
          </div>
        </div>
        <button
          onClick={() => generarReporteCompleto(mes, año)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:opacity-90"
          style={{ background: "#1a3673", color: "#ffffff" }}>
          <Download size={15} />
          Descargar
        </button>
      </div>

      {/* Módulos individuales */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#6b7280" }}>Reportes por módulo</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {modulos.map(({ id, label, icon: Icon, color, fn, descripcion }) => (
            <div key={id} className="rounded-xl p-4 flex items-center justify-between gap-4"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: color + "20" }}>
                  <Icon size={17} style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{label}</p>
                  <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{descripcion}</p>
                </div>
              </div>
              <button
                onClick={() => fn(mes, año)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all hover:scale-[1.02] shrink-0"
                style={{ background: color + "20", color }}>
                <Download size={13} />
                Excel
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Exportar / Importar JSON */}
      <div className="rounded-xl p-5 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center gap-2 mb-1">
          <Database size={16} style={{ color: "#7c3aed" }} />
          <h2 className="text-sm font-bold" style={{ color: "var(--foreground)" }}>Backup y Migración de datos</h2>
        </div>
        <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
          Exporta <strong style={{ color: "var(--foreground)" }}>todos los datos</strong> del sistema a un archivo JSON. Úsalo como backup o para importar a la futura plataforma web / app móvil.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            onClick={() => {
              const data = {
                exportadoEn: new Date().toISOString(),
                version: "1.0",
                mantenciones: mantenciones.getAll(),
                reparaciones: reparaciones.getAll(),
                proyectos: proyectos.getAll(),
                cotizaciones: cotizaciones.getAll(),
                ordenesTrabajo: ordenesTrabajo.getAll(),
                clientesEquipos: clientesEquipos.getAll(),
                contratos: contratos.getAll(),
                bodega: bodega.getAll(),
                importaciones: importaciones.getAll(),
                tecnicos: tecnicos.getAll(),
                asignaciones: asignaciones.getAll(),
                movimientos: movimientos.getAll(),
                pagosArriendo: pagosArriendo.getAll(),
                proveedores: proveedores.getAll(),
              }
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
              const url = URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `minserco_backup_${new Date().toISOString().slice(0,10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.01]"
            style={{ background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)", color: "#7c3aed" }}>
            <Download size={16} />
            Exportar todo como JSON
          </button>

          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm cursor-pointer transition-all hover:scale-[1.01]"
            style={{ background: "rgba(96,165,250,0.15)", border: "1px dashed rgba(96,165,250,0.4)", color: "#60a5fa" }}>
            <Upload size={16} />
            Importar desde JSON
            <input type="file" accept=".json" className="hidden" onChange={e => {
              const file = e.target.files?.[0]
              if (!file) return
              const reader = new FileReader()
              reader.onload = ev => {
                try {
                  const data = JSON.parse(ev.target?.result as string)
                  if (!data.version) { alert("Archivo no válido"); return }
                  const total = Object.keys(data).filter(k => Array.isArray(data[k])).reduce((s, k) => s + data[k].length, 0)
                  if (!confirm(`¿Importar ${total} registros? Esto reemplazará los datos existentes de cada módulo importado.`)) return
                  if (data.mantenciones) localStorage.setItem("mantenciones", JSON.stringify(data.mantenciones))
                  if (data.reparaciones) localStorage.setItem("reparaciones", JSON.stringify(data.reparaciones))
                  if (data.proyectos) localStorage.setItem("proyectos", JSON.stringify(data.proyectos))
                  if (data.cotizaciones) localStorage.setItem("cotizaciones", JSON.stringify(data.cotizaciones))
                  if (data.ordenesTrabajo) localStorage.setItem("ordenesTrabajo", JSON.stringify(data.ordenesTrabajo))
                  if (data.clientesEquipos) localStorage.setItem("clientesEquipos", JSON.stringify(data.clientesEquipos))
                  if (data.contratos) localStorage.setItem("contratos", JSON.stringify(data.contratos))
                  if (data.bodega) localStorage.setItem("bodega", JSON.stringify(data.bodega))
                  if (data.importaciones) localStorage.setItem("importaciones", JSON.stringify(data.importaciones))
                  if (data.tecnicos) localStorage.setItem("tecnicos", JSON.stringify(data.tecnicos))
                  if (data.asignaciones) localStorage.setItem("asignaciones", JSON.stringify(data.asignaciones))
                  if (data.movimientos) localStorage.setItem("movimientos", JSON.stringify(data.movimientos))
                  if (data.pagosArriendo) localStorage.setItem("pagosArriendo", JSON.stringify(data.pagosArriendo))
                  if (data.proveedores) localStorage.setItem("proveedores", JSON.stringify(data.proveedores))
                  alert(`✓ Importación completada: ${total} registros cargados. La página se recargará.`)
                  window.location.reload()
                } catch { alert("Error al leer el archivo JSON") }
              }
              reader.readAsText(file)
              e.target.value = ""
            }} />
          </label>
        </div>
        <p className="text-xs" style={{ color: "#6b7280" }}>
          El JSON exportado contiene todos los módulos y es compatible con la futura API REST. Guárdalo en un lugar seguro como respaldo.
        </p>
      </div>

      <p className="text-xs text-center" style={{ color: "#9ca3af" }}>
        Los reportes se descargan en formato Excel (.xlsx) con columnas ya formateadas y se abren directamente en Microsoft Excel, LibreOffice Calc y Google Sheets.
      </p>
      </div>
    </PageShell>
  )
}
