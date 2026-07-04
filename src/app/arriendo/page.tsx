"use client"

import { useEffect, useState } from "react"
import { contratos, pagosArriendo } from "@/lib/store"
import { ContratoArriendo, EstadoContrato, PagoArriendo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus, Pencil, Trash2, KeyRound, CalendarClock,
  AlertTriangle, CheckCircle2, Clock, ArrowRight,
  CreditCard, CalendarPlus, History,
} from "lucide-react"
import { SelectEquipo } from "@/components/ui/SelectEquipo"
import PageShell from "@/components/layout/PageShell"

// ── Utilidades de fecha ───────────────────────────────────────────────────────

function hoy() {
  return new Date().toISOString().slice(0, 10)
}

function diasRestantes(fechaTermino: string): number {
  const hoyMs = new Date(hoy()).getTime()
  const termMs = new Date(fechaTermino).getTime()
  return Math.ceil((termMs - hoyMs) / 86400000)
}

function formatFecha(f: string) {
  if (!f) return "—"
  const [y, m, d] = f.split("-")
  return `${d}/${m}/${y}`
}

function estadoVencimiento(c: ContratoArriendo): {
  label: string; color: string; bg: string; icon: React.ReactNode
} {
  if (c.estado === "finalizado") return { label: "Finalizado", color: "#16a34a", bg: "rgba(74,222,128,0.1)", icon: <CheckCircle2 size={13} /> }
  if (c.estado === "suspendido") return { label: "Suspendido", color: "#94a3b8", bg: "rgba(148,163,184,0.1)", icon: <Clock size={13} /> }
  const dias = diasRestantes(c.fechaTermino)
  if (dias < 0)  return { label: `Vencido hace ${Math.abs(dias)}d`, color: "#ef4444", bg: "rgba(239,68,68,0.1)", icon: <AlertTriangle size={13} /> }
  if (dias <= 7) return { label: `Vence en ${dias}d`, color: "#f97316", bg: "rgba(249,115,22,0.1)", icon: <AlertTriangle size={13} /> }
  if (dias <= 30) return { label: `Vence en ${dias}d`, color: "#fbbf24", bg: "rgba(251,191,36,0.1)", icon: <Clock size={13} /> }
  return { label: `${dias} días restantes`, color: "#0891b2", bg: "rgba(45,212,191,0.1)", icon: <CheckCircle2 size={13} /> }
}

// ── Formularios vacíos ────────────────────────────────────────────────────────

const emptyContrato = (): Omit<ContratoArriendo, "id" | "creadoEn"> => ({
  equipo: "", codigoEquipo: "", cliente: "", telefono: "", email: "",
  fechaInicio: hoy(), fechaTermino: "", diasAviso: 7,
  montoMensual: undefined, estado: "activo", notas: "",
})

const emptyExtension = (contratoId: string, fechaActual: string): Omit<PagoArriendo, "id" | "creadoEn"> => ({
  contratoId, tipo: "extension" as const,
  monto: undefined, fecha: hoy(),
  nuevaFechaTermino: fechaActual, notas: "",
})

const emptyPago = (contratoId: string): Omit<PagoArriendo, "id" | "creadoEn"> => ({
  contratoId, tipo: "pago" as const,
  monto: undefined, fecha: hoy(),
  nuevaFechaTermino: undefined, notas: "",
})

// ── Barra de días restantes ───────────────────────────────────────────────────

function DiasBar({ contrato }: { contrato: ContratoArriendo }) {
  if (contrato.estado === "finalizado" || contrato.estado === "suspendido") return null
  const total = Math.max(1, Math.ceil(
    (new Date(contrato.fechaTermino).getTime() - new Date(contrato.fechaInicio).getTime()) / 86400000
  ))
  const dias = diasRestantes(contrato.fechaTermino)
  const pct = Math.max(0, Math.min(100, (dias / total) * 100))
  const color = dias < 0 ? "#ef4444" : dias <= 7 ? "#f97316" : dias <= 30 ? "#fbbf24" : "#2dd4bf"
  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ArriendoPage() {
  const [lista, setLista] = useState<ContratoArriendo[]>([])
  const [pagos, setPagos] = useState<PagoArriendo[]>([])

  // Modales
  const [openContrato, setOpenContrato] = useState(false)
  const [openExtension, setOpenExtension] = useState(false)
  const [openPago, setOpenPago] = useState(false)
  const [openHistorial, setOpenHistorial] = useState(false)

  const [editando, setEditando] = useState<ContratoArriendo | null>(null)
  const [contratoActivo, setContratoActivo] = useState<ContratoArriendo | null>(null)

  const [formContrato, setFormContrato] = useState(emptyContrato())
  const [formExt, setFormExt] = useState(emptyExtension("", ""))
  const [formPago, setFormPago] = useState(emptyPago(""))

  const [filtro, setFiltro] = useState<EstadoContrato | "todos" | "alerta">("todos")

  const cargar = () => {
    // Sincronizar estado vencido automáticamente
    const hoyStr = hoy()
    const todos = contratos.getAll()
    todos.forEach(c => {
      if (c.estado === "activo" && c.fechaTermino < hoyStr) {
        contratos.update(c.id, { estado: "vencido" })
      }
    })
    setLista(contratos.getAll().slice().reverse())
    setPagos(pagosArriendo.getAll())
  }

  useEffect(() => { cargar() }, [])

  // ── Contrato CRUD ─────────────────────────────────────────────────────────

  function abrirContrato(c?: ContratoArriendo) {
    if (c) { setEditando(c); const { id, creadoEn, ...r } = c; setFormContrato(r) }
    else { setEditando(null); setFormContrato(emptyContrato()) }
    setOpenContrato(true)
  }

  function guardarContrato() {
    if (!formContrato.equipo || !formContrato.cliente || !formContrato.fechaTermino) return
    editando
      ? contratos.update(editando.id, formContrato)
      : contratos.add(formContrato)
    cargar(); setOpenContrato(false)
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar este contrato?")) return
    contratos.delete(id); cargar()
  }

  // ── Extensión ─────────────────────────────────────────────────────────────

  function abrirExtension(c: ContratoArriendo) {
    setContratoActivo(c)
    setFormExt(emptyExtension(c.id, c.fechaTermino))
    setOpenExtension(true)
  }

  function guardarExtension() {
    if (!formExt.nuevaFechaTermino || formExt.nuevaFechaTermino <= (contratoActivo?.fechaTermino ?? "")) return
    pagosArriendo.add(formExt)
    cargar(); setOpenExtension(false)
  }

  // ── Pago ──────────────────────────────────────────────────────────────────

  function abrirPago(c: ContratoArriendo) {
    setContratoActivo(c)
    setFormPago(emptyPago(c.id))
    setOpenPago(true)
  }

  function guardarPago() {
    if (!formPago.monto) return
    pagosArriendo.add(formPago)
    cargar(); setOpenPago(false)
  }

  // ── Historial ─────────────────────────────────────────────────────────────

  function abrirHistorial(c: ContratoArriendo) {
    setContratoActivo(c); setOpenHistorial(true)
  }

  // ── Filtros ───────────────────────────────────────────────────────────────

  const setFC = (k: string, v: string) => setFormContrato(f => ({ ...f, [k]: v }))
  const setFN = (k: string, v: number) => setFormContrato(f => ({ ...f, [k]: v }))

  const alertas = lista.filter(c => {
    if (c.estado === "finalizado" || c.estado === "suspendido") return false
    const d = diasRestantes(c.fechaTermino)
    return d <= (c.diasAviso ?? 7)
  })

  const filtrada = (() => {
    if (filtro === "todos") return lista
    if (filtro === "alerta") return alertas
    return lista.filter(c => c.estado === filtro)
  })()

  const conteos = {
    activo: lista.filter(c => c.estado === "activo").length,
    vencido: lista.filter(c => c.estado === "vencido").length,
    finalizado: lista.filter(c => c.estado === "finalizado").length,
    suspendido: lista.filter(c => c.estado === "suspendido").length,
  }

  const historialContrato = contratoActivo
    ? pagos.filter(p => p.contratoId === contratoActivo.id).slice().reverse()
    : []

  const arriendoStats = [
    { label: "Activos", value: conteos.activo, color: "#0891b2" },
    { label: "Alertas", value: alertas.length, color: alertas.length > 0 ? "#f97316" : undefined },
    { label: "Vencidos", value: conteos.vencido, color: conteos.vencido > 0 ? "#ef4444" : undefined },
  ]

  return (
    <PageShell
      icon={KeyRound}
      title="Arriendo de Equipos"
      subtitle="Contratos activos, vencimientos y pagos"
      color="#fbbf24"
      stats={arriendoStats}
      actions={<button className="btn-accent" onClick={() => abrirContrato()}><Plus size={14} /> Nuevo Contrato</button>}
    >

      {/* ── Panel de alertas ── */}
      {alertas.length > 0 && (
        <div className="rounded-xl p-4 mb-5" style={{ background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.3)" }}>
          <div className="flex items-center gap-2 text-sm font-semibold mb-2" style={{ color: "#f97316" }}>
            <AlertTriangle size={15} />
            {alertas.length} contrato{alertas.length > 1 ? "s" : ""} requieren atención
          </div>
          <div className="space-y-1">
            {alertas.map(c => {
              const { label, color } = estadoVencimiento(c)
              return (
                <div key={c.id} className="flex items-center justify-between">
                  <span className="text-xs" style={{ color }}>
                    • {c.equipo} — {c.cliente} · {label}
                  </span>
                  <button
                    className="text-xs px-2 py-0.5 rounded-lg flex items-center gap-1 transition-opacity hover:opacity-80"
                    style={{ background: "rgba(249,115,22,0.15)", color: "#f97316" }}
                    onClick={() => abrirExtension(c)}
                  >
                    <CalendarPlus size={11} /> Extender
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Filtros ── */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {[
          { key: "todos", label: `Todos (${lista.length})` },
          { key: "alerta", label: `⚠ Alerta (${alertas.length})` },
          { key: "activo", label: `Activos (${conteos.activo})` },
          { key: "vencido", label: `Vencidos (${conteos.vencido})` },
          { key: "finalizado", label: `Finalizados (${conteos.finalizado})` },
          { key: "suspendido", label: `Suspendidos (${conteos.suspendido})` },
        ].map(f => (
          <button
            key={f.key}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
            style={filtro === f.key
              ? { background: "var(--primary)", color: "var(--primary-foreground)" }
              : { background: "var(--card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
            }
            onClick={() => setFiltro(f.key as typeof filtro)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* ── Lista de contratos ── */}
      <div className="space-y-2">
        {filtrada.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            No hay contratos en esta categoría.
          </div>
        )}
        {filtrada.map(c => {
          const est = estadoVencimiento(c)
          const historial = pagos.filter(p => p.contratoId === c.id)
          const ultimoPago = historial.filter(p => p.tipo === "pago").slice(-1)[0]
          return (
            <div
              key={c.id}
              className="rounded-xl p-4"
              style={{ background: "var(--card)", border: `1px solid ${est.color}30` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">

                  {/* Fila título */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>{c.equipo}</span>
                    {c.codigoEquipo && (
                      <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                        {c.codigoEquipo}
                      </span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1"
                      style={{ background: est.bg, color: est.color }}
                    >
                      {est.icon} {est.label}
                    </span>
                  </div>

                  {/* Cliente */}
                  <div className="text-sm mb-1" style={{ color: "var(--muted-foreground)" }}>
                    <strong style={{ color: "var(--foreground)" }}>{c.cliente}</strong>
                    {c.telefono && <span> · {c.telefono}</span>}
                    {c.email && <span> · {c.email}</span>}
                  </div>

                  {/* Fechas y monto */}
                  <div className="flex flex-wrap gap-4 text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>
                    <span>Inicio: <strong style={{ color: "var(--foreground)" }}>{formatFecha(c.fechaInicio)}</strong></span>
                    <span>Término: <strong style={{ color: est.color }}>{formatFecha(c.fechaTermino)}</strong></span>
                    {c.montoMensual && (
                      <span>Monto mensual: <strong style={{ color: "#fbbf24" }}>${c.montoMensual.toLocaleString("es-CL")}</strong></span>
                    )}
                    {ultimoPago && (
                      <span>Último pago: <strong style={{ color: "#16a34a" }}>{formatFecha(ultimoPago.fecha)}</strong></span>
                    )}
                    <span style={{ color: "var(--muted-foreground)" }}>
                      {historial.length} movimiento{historial.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <DiasBar contrato={c} />

                  {c.notas && (
                    <p className="text-xs mt-2 italic" style={{ color: "var(--muted-foreground)" }}>{c.notas}</p>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-opacity hover:opacity-80 font-medium"
                    style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}
                    onClick={() => abrirExtension(c)}
                  >
                    <CalendarPlus size={12} /> Extender
                  </button>
                  <button
                    className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-opacity hover:opacity-80 font-medium"
                    style={{ background: "rgba(74,222,128,0.1)", color: "#16a34a" }}
                    onClick={() => abrirPago(c)}
                  >
                    <CreditCard size={12} /> Pago
                  </button>
                  <button
                    className="text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-opacity hover:opacity-80"
                    style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}
                    onClick={() => abrirHistorial(c)}
                  >
                    <History size={12} /> Historial
                  </button>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100" onClick={() => abrirContrato(c)}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 opacity-50 hover:opacity-100 text-red-400" onClick={() => eliminar(c.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Modal: Nuevo/Editar Contrato ── */}
      <Dialog open={openContrato} onOpenChange={setOpenContrato}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Contrato" : "Nuevo Contrato de Arriendo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Equipo *</Label>
                <SelectEquipo value={formContrato.equipo} onChange={v => setFC("equipo", v)} />
              </div>
              <div className="space-y-1">
                <Label>Código</Label>
                <Input value={formContrato.codigoEquipo ?? ""} onChange={e => setFC("codigoEquipo", e.target.value)} placeholder="SP-200-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cliente *</Label>
                <Input value={formContrato.cliente} onChange={e => setFC("cliente", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Teléfono</Label>
                <Input value={formContrato.telefono ?? ""} onChange={e => setFC("telefono", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={formContrato.email ?? ""} onChange={e => setFC("email", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fecha inicio</Label>
                <Input type="date" value={formContrato.fechaInicio} onChange={e => setFC("fechaInicio", e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Fecha término *</Label>
                <Input type="date" value={formContrato.fechaTermino} onChange={e => setFC("fechaTermino", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto mensual ($)</Label>
                <Input
                  type="number"
                  value={formContrato.montoMensual ?? ""}
                  onChange={e => setFN("montoMensual", Number(e.target.value))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Alertar con N días de anticipación</Label>
                <Input
                  type="number"
                  min={1}
                  value={formContrato.diasAviso}
                  onChange={e => setFN("diasAviso", Number(e.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Estado</Label>
              <Select value={formContrato.estado} onValueChange={v => v && setFC("estado", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="suspendido">Suspendido</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea value={formContrato.notas ?? ""} onChange={e => setFC("notas", e.target.value)} rows={2} />
            </div>
            <Button className="w-full" onClick={guardarContrato}>
              {editando ? "Guardar cambios" : "Crear contrato"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Extender plazo ── */}
      <Dialog open={openExtension} onOpenChange={setOpenExtension}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus size={18} style={{ color: "#fbbf24" }} />
              Extender Plazo — {contratoActivo?.equipo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg p-3 text-sm" style={{ background: "var(--accent)" }}>
              <span style={{ color: "var(--muted-foreground)" }}>Fecha término actual: </span>
              <strong style={{ color: "#fbbf24" }}>{formatFecha(contratoActivo?.fechaTermino ?? "")}</strong>
            </div>
            <div className="space-y-1">
              <Label>Nueva fecha término *</Label>
              <Input
                type="date"
                value={formExt.nuevaFechaTermino ?? ""}
                min={contratoActivo?.fechaTermino}
                onChange={e => setFormExt(f => ({ ...f, nuevaFechaTermino: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto pagado ($)</Label>
                <Input
                  type="number"
                  value={formExt.monto ?? ""}
                  onChange={e => setFormExt(f => ({ ...f, monto: Number(e.target.value) }))}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha pago</Label>
                <Input
                  type="date"
                  value={formExt.fecha}
                  onChange={e => setFormExt(f => ({ ...f, fecha: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                value={formExt.notas ?? ""}
                onChange={e => setFormExt(f => ({ ...f, notas: e.target.value }))}
                rows={2}
                placeholder="Ej: Pagó con transferencia, renovación mensual..."
              />
            </div>
            <Button className="w-full" style={{ background: "#fbbf24", color: "#111827" }} onClick={guardarExtension}>
              <CalendarPlus size={15} className="mr-2" />
              Confirmar extensión
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Registrar Pago ── */}
      <Dialog open={openPago} onOpenChange={setOpenPago}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard size={18} style={{ color: "#16a34a" }} />
              Registrar Pago — {contratoActivo?.equipo}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Monto ($) *</Label>
                <Input
                  type="number"
                  value={formPago.monto ?? ""}
                  onChange={e => setFormPago(f => ({ ...f, monto: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-1">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={formPago.fecha}
                  onChange={e => setFormPago(f => ({ ...f, fecha: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                value={formPago.notas ?? ""}
                onChange={e => setFormPago(f => ({ ...f, notas: e.target.value }))}
                rows={2}
                placeholder="Ej: Transferencia, efectivo, depósito..."
              />
            </div>
            <Button className="w-full" style={{ background: "#4ade80", color: "#111827" }} onClick={guardarPago}>
              <CreditCard size={15} className="mr-2" />
              Registrar pago
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Modal: Historial ── */}
      <Dialog open={openHistorial} onOpenChange={setOpenHistorial}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History size={18} style={{ color: "#7c3aed" }} />
              Historial — {contratoActivo?.equipo} · {contratoActivo?.cliente}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            {historialContrato.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: "var(--muted-foreground)" }}>
                Sin movimientos registrados.
              </p>
            )}
            {historialContrato.map(p => (
              <div
                key={p.id}
                className="rounded-lg p-3 flex items-start gap-3"
                style={{ background: "var(--accent)", border: "1px solid var(--border)" }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                  style={p.tipo === "extension"
                    ? { background: "rgba(251,191,36,0.15)" }
                    : { background: "rgba(74,222,128,0.12)" }
                  }
                >
                  {p.tipo === "extension"
                    ? <CalendarPlus size={13} style={{ color: "#fbbf24" }} />
                    : <CreditCard size={13} style={{ color: "#16a34a" }} />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
                      {p.tipo === "extension" ? "Extensión de plazo" : "Pago registrado"}
                    </span>
                    {p.monto && (
                      <span className="text-sm font-bold" style={{ color: "#16a34a" }}>
                        ${p.monto.toLocaleString("es-CL")}
                      </span>
                    )}
                  </div>
                  {p.nuevaFechaTermino && (
                    <p className="text-xs" style={{ color: "#fbbf24" }}>
                      Nueva fecha término: {formatFecha(p.nuevaFechaTermino)}
                    </p>
                  )}
                  <div className="flex gap-3 text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                    <span>{formatFecha(p.fecha)}</span>
                    {p.notas && <span>· {p.notas}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
