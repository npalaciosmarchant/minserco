"use client"

import { useEffect, useState } from "react"
import {
  mantenciones, reparaciones, proyectos, cotizaciones,
  ordenesTrabajo, clientesEquipos, contratos, bodega, importaciones, tecnicos, asignaciones, movimientos, pagosArriendo, proveedores,
} from "@/lib/store"
import { Download, FileSpreadsheet, BarChart3, Wrench, Settings, FileText, ClipboardList, Users, KeyRound, Package, Ship, Database, Upload } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function escCsv(v: string | number | undefined | null): string {
  if (v === null || v === undefined) return ""
  const s = String(v)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`
  return s
}

function fila(...cols: (string | number | undefined | null)[]): string {
  return cols.map(escCsv).join(",") + "\r\n"
}

function fmtClp(n: number): string {
  return `$${n.toLocaleString("es-CL")}`
}

function descargarCsv(contenido: string, nombre: string) {
  const bom = "﻿" // UTF-8 BOM para Excel
  const blob = new Blob([bom + contenido], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = nombre
  a.click()
  URL.revokeObjectURL(url)
}

function generarReporteMantenciones(mes: number, año: number) {
  const ms = mantenciones.getAll().filter(m => {
    const d = new Date(m.creadoEn)
    return d.getMonth() === mes && d.getFullYear() === año
  })
  let csv = fila("ID","Equipo","Tipo","Estado","Fecha","Próx. Mantención","Técnico","Notas")
  ms.forEach(m => csv += fila(m.id, m.equipo, m.tipo, m.estado, m.creadoEn.slice(0,10), m.proximaMantencion ?? "", m.tecnico, m.observaciones ?? ""))
  csv += "\r\n"
  csv += fila("RESUMEN")
  csv += fila("Total registros", ms.length)
  csv += fila("Completados", ms.filter(m => m.estado === "completado").length)
  csv += fila("Pendientes", ms.filter(m => m.estado === "pendiente").length)
  csv += fila("En proceso", ms.filter(m => m.estado === "en_proceso").length)
  descargarCsv(csv, `Mantenciones_${MESES[mes]}_${año}.csv`)
}

function generarReporteReparaciones(mes: number, año: number) {
  const rs = reparaciones.getAll().filter(r => {
    const d = new Date(r.creadoEn)
    return d.getMonth() === mes && d.getFullYear() === año
  })
  let csv = fila("ID","Equipo","Cliente","Estado","Diagnóstico","Costo estimado","Costo final","Fecha ingreso","Técnico")
  rs.forEach(r => csv += fila(r.id, r.equipo, r.cliente, r.estado, r.diagnostico ?? "", r.costoEstimado ?? 0, r.costoFinal ?? 0, r.creadoEn.slice(0,10), r.tecnico))
  csv += "\r\n"
  const totalCosto = rs.reduce((s, r) => s + (r.costoFinal ?? r.costoEstimado ?? 0), 0)
  csv += fila("RESUMEN")
  csv += fila("Total registros", rs.length)
  csv += fila("Entregados", rs.filter(r => r.estado === "entregado").length)
  csv += fila("En reparación", rs.filter(r => r.estado === "en_reparacion").length)
  csv += fila("Ingresos estimados", fmtClp(totalCosto))
  descargarCsv(csv, `Reparaciones_${MESES[mes]}_${año}.csv`)
}

function generarReporteCotizaciones(mes: number, año: number) {
  const cs = cotizaciones.getAll().filter(c => {
    const d = new Date(c.creadoEn)
    return d.getMonth() === mes && d.getFullYear() === año
  })
  let csv = fila("Número","Cliente","Empresa","Estado","Subtotal","Descuento%","Total","Fecha emisión","Fecha vencimiento","Items")
  cs.forEach(c => csv += fila(c.numero, c.cliente, c.empresa ?? "", c.estado, c.subtotal, c.descuento, c.total, c.fechaEmision, c.fechaVencimiento, c.items.length))
  csv += "\r\n"
  const aceptadas = cs.filter(c => c.estado === "aceptada")
  csv += fila("RESUMEN")
  csv += fila("Total cotizaciones", cs.length)
  csv += fila("Aceptadas", aceptadas.length)
  csv += fila("Rechazadas", cs.filter(c => c.estado === "rechazada").length)
  csv += fila("Enviadas", cs.filter(c => c.estado === "enviada").length)
  csv += fila("Total ingreso (aceptadas)", fmtClp(aceptadas.reduce((s, c) => s + c.total, 0)))
  descargarCsv(csv, `Cotizaciones_${MESES[mes]}_${año}.csv`)
}

function generarReporteOTs(mes: number, año: number) {
  const ots = ordenesTrabajo.getAll().filter(o => {
    const d = new Date(o.creadoEn)
    return d.getMonth() === mes && d.getFullYear() === año
  })
  let csv = fila("Número","Cliente","Empresa","Tipo","Estado","Técnico","Fecha inicio","Fecha término","Costo materiales","Costo mano obra","Notas")
  ots.forEach(o => csv += fila(o.numero, o.cliente, o.empresa ?? "", o.tipo, o.estado, o.tecnico, o.fechaInicio ?? "", o.fechaTermino ?? "", o.costoMateriales ?? 0, o.costoManoObra ?? 0, o.observaciones ?? ""))
  csv += "\r\n"
  csv += fila("RESUMEN")
  csv += fila("Total OTs", ots.length)
  csv += fila("Completadas", ots.filter(o => o.estado === "completada").length)
  csv += fila("En curso", ots.filter(o => o.estado === "en_curso").length)
  csv += fila("Ingresos estimados", fmtClp(ots.reduce((s, o) => s + (o.costoMateriales ?? 0) + (o.costoManoObra ?? 0), 0)))
  descargarCsv(csv, `OrdenesTrabajo_${MESES[mes]}_${año}.csv`)
}

function generarReporteCompleto(mes: number, año: number) {
  const ms = mantenciones.getAll().filter(m => new Date(m.creadoEn).getMonth() === mes && new Date(m.creadoEn).getFullYear() === año)
  const rs = reparaciones.getAll().filter(r => new Date(r.creadoEn).getMonth() === mes && new Date(r.creadoEn).getFullYear() === año)
  const ps = proyectos.getAll().filter(p => new Date(p.creadoEn).getMonth() === mes && new Date(p.creadoEn).getFullYear() === año)
  const cs = cotizaciones.getAll().filter(c => new Date(c.creadoEn).getMonth() === mes && new Date(c.creadoEn).getFullYear() === año)
  const ots = ordenesTrabajo.getAll().filter(o => new Date(o.creadoEn).getMonth() === mes && new Date(o.creadoEn).getFullYear() === año)
  const ingresoCots = cs.filter(c => c.estado === "aceptada").reduce((s, c) => s + c.total, 0)
  const ingresoRep = rs.reduce((s, r) => s + (r.costoFinal ?? r.costoEstimado ?? 0), 0)
  const ingresoOTs = ots.reduce((s, o) => s + (o.costoMateriales ?? 0) + (o.costoManoObra ?? 0), 0)

  let csv = `REPORTE MENSUAL MINSERCO — ${MESES[mes].toUpperCase()} ${año}\r\n\r\n`
  csv += fila("MÓDULO","MÉTRICA","VALOR")
  csv += fila("Mantenciones","Total registros", ms.length)
  csv += fila("Mantenciones","Completadas", ms.filter(m => m.estado === "completado").length)
  csv += fila("Mantenciones","Pendientes", ms.filter(m => m.estado === "pendiente").length)
  csv += fila("Reparaciones","Total registros", rs.length)
  csv += fila("Reparaciones","Entregadas", rs.filter(r => r.estado === "entregado").length)
  csv += fila("Reparaciones","Ingresos estimados", fmtClp(ingresoRep))
  csv += fila("Fabricación","Total proyectos", ps.length)
  csv += fila("Fabricación","Completados", ps.filter(p => p.estado === "completado").length)
  csv += fila("Cotizaciones","Total generadas", cs.length)
  csv += fila("Cotizaciones","Aceptadas", cs.filter(c => c.estado === "aceptada").length)
  csv += fila("Cotizaciones","Ingreso cotizaciones aceptadas", fmtClp(ingresoCots))
  csv += fila("Órdenes de Trabajo","Total OTs", ots.length)
  csv += fila("Órdenes de Trabajo","Completadas", ots.filter(o => o.estado === "completada").length)
  csv += fila("Órdenes de Trabajo","Ingreso OTs", fmtClp(ingresoOTs))
  csv += fila("TOTAL","Ingreso total estimado", fmtClp(ingresoCots + ingresoRep + ingresoOTs))
  descargarCsv(csv, `Reporte_Completo_${MESES[mes]}_${año}.csv`)
}

type Modulo = { id: string; label: string; icon: React.ElementType; color: string; fn: (mes: number, año: number) => void; descripcion: string }

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
      subtitle="Exporta datos por módulo en formato CSV compatible con Excel"
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
            <p className="text-xs text-gray-500">Resumen ejecutivo de todos los módulos en un solo archivo CSV</p>
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
                CSV
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
        Los archivos CSV se abren directamente en Microsoft Excel, LibreOffice Calc y Google Sheets. Incluyen BOM UTF-8 para compatibilidad con caracteres especiales en español.
      </p>
      </div>
    </PageShell>
  )
}
