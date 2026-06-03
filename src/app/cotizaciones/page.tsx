"use client"

import { useEffect, useState } from "react"
import { cotizaciones, ordenesTrabajo } from "@/lib/store"
import { Cotizacion, CotizacionItem, EstadoCotizacion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, FileText, Send, CheckCircle2, XCircle, Clock, AlertCircle, ClipboardList, Printer } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { imprimirCotizacionPDF } from "@/lib/cotizacion-pdf"

const estados: { value: EstadoCotizacion; label: string; color: string; icon: React.ElementType }[] = [
  { value: "borrador",  label: "Borrador",  color: "#94a3b8", icon: FileText },
  { value: "enviada",   label: "Enviada",   color: "#7c3aed", icon: Send },
  { value: "aceptada",  label: "Aceptada",  color: "#0891b2", icon: CheckCircle2 },
  { value: "rechazada", label: "Rechazada", color: "#ef4444", icon: XCircle },
  { value: "vencida",   label: "Vencida",   color: "#f97316", icon: AlertCircle },
]
const estadoMap = Object.fromEntries(estados.map(e => [e.value, e]))

const emptyItem = (): CotizacionItem => ({ descripcion: "", cantidad: 1, precioUnitario: 0, subtotal: 0 })

function emptyForm(): Omit<Cotizacion, "id" | "creadoEn"> {
  const hoy = new Date()
  const vence = new Date(hoy); vence.setDate(vence.getDate() + 30)
  return {
    numero: "", cliente: "", empresa: "", email: "", telefono: "", ciudad: "",
    descripcion: "", items: [emptyItem()], subtotal: 0, descuento: 0, total: 0,
    validezDias: 30, estado: "borrador",
    fechaEmision: hoy.toISOString().slice(0, 10),
    fechaVencimiento: vence.toISOString().slice(0, 10),
    notas: "",
  }
}

function fmtClp(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

function CotizacionCard({ c, onEdit, onDelete, onConvertir, onImprimir }: {
  c: Cotizacion; onEdit: () => void; onDelete: () => void; onConvertir: () => void; onImprimir: () => void
}) {
  const est = estadoMap[c.estado]
  const Icon = est.icon
  const diasHasta = Math.ceil((new Date(c.fechaVencimiento).getTime() - Date.now()) / 86400000)
  const proxima = diasHasta >= 0 && diasHasta <= 7 && c.estado === "enviada"

  return (
    <div className="rounded-xl overflow-hidden group transition-all duration-150 hover:translate-y-[-1px] hover:shadow-lg"
      style={{ background: "var(--card)", border: `1px solid ${proxima ? "#f97316" : "var(--border)"}` }}>
      <div className="h-0.5" style={{ background: est.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded"
                style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>{c.numero}</span>
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: est.color + "20", color: est.color }}>
                <Icon size={10} />{est.label}
              </span>
            </div>
            <div className="font-semibold text-sm mt-1.5" style={{ color: "var(--foreground)" }}>{c.empresa || c.cliente}</div>
            {c.empresa && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{c.cliente}</div>}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" title="Descargar PDF" onClick={onImprimir}>
              <Printer size={11} style={{ color: "#f59e0b" }} />
            </Button>
            {c.estado === "aceptada" && (
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Crear OT desde esta cotización" onClick={onConvertir}>
                <ClipboardList size={11} style={{ color: "#0891b2" }} />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil size={11} /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={onDelete}><Trash2 size={11} /></Button>
          </div>
        </div>

        <div className="text-xs mb-3 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>{c.descripcion}</div>

        <div className="flex items-center justify-between p-2.5 rounded-lg mb-3" style={{ background: "var(--accent)" }}>
          <div>
            {c.descuento > 0 && (
              <div className="text-xs line-through" style={{ color: "var(--muted-foreground)" }}>{fmtClp(c.subtotal)}</div>
            )}
            <div className="font-bold text-base" style={{ color: "var(--foreground)" }}>{fmtClp(c.total)}</div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{c.items.length} item{c.items.length !== 1 ? "s" : ""}</div>
          </div>
          {c.descuento > 0 && (
            <span className="text-xs font-semibold px-2 py-1 rounded-lg"
              style={{ background: "rgba(45,212,191,0.15)", color: "#0891b2" }}>
              -{c.descuento}% dto.
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>Emitida: {c.fechaEmision}</span>
          <span className={proxima ? "text-orange-400 font-medium" : ""}>
            {diasHasta < 0 ? "Vencida" : `Vence: ${c.fechaVencimiento}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function ItemsTable({ items, onChange }: { items: CotizacionItem[]; onChange: (items: CotizacionItem[]) => void }) {
  function update(idx: number, field: keyof CotizacionItem, val: string | number) {
    const next = items.map((it, i) => {
      if (i !== idx) return it
      const updated = { ...it, [field]: val }
      updated.subtotal = updated.cantidad * updated.precioUnitario
      return updated
    })
    onChange(next)
  }
  function add() { onChange([...items, emptyItem()]) }
  function remove(idx: number) { onChange(items.filter((_, i) => i !== idx)) }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <Label>Items</Label>
        <button onClick={add} className="text-xs px-2 py-1 rounded-lg font-medium flex items-center gap-1"
          style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
          <Plus size={11} /> Agregar item
        </button>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="grid text-xs font-medium px-3 py-2"
          style={{ gridTemplateColumns: "1fr 70px 120px 100px 28px", background: "var(--accent)", color: "var(--muted-foreground)" }}>
          <span>Descripcion</span><span className="text-right">Cant.</span><span className="text-right">Precio unit.</span><span className="text-right">Subtotal</span><span />
        </div>
        {items.map((it, idx) => (
          <div key={idx} className="grid items-center gap-1 px-2 py-1.5"
            style={{ gridTemplateColumns: "1fr 70px 120px 100px 28px", borderTop: "1px solid var(--border)" }}>
            <Input value={it.descripcion} onChange={e => update(idx, "descripcion", e.target.value)} className="h-7 text-xs" placeholder="Descripcion" />
            <Input type="number" min={1} value={it.cantidad} onChange={e => update(idx, "cantidad", Number(e.target.value))} className="h-7 text-xs text-right" />
            <Input type="number" min={0} value={it.precioUnitario} onChange={e => update(idx, "precioUnitario", Number(e.target.value))} className="h-7 text-xs text-right" />
            <div className="text-xs text-right font-medium pr-1" style={{ color: "var(--foreground)" }}>{fmtClp(it.subtotal)}</div>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => remove(idx)}><Trash2 size={11} /></Button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CotizacionesPage() {
  const router = useRouter()
  const [lista, setLista] = useState<Cotizacion[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Cotizacion | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [filtroEstado, setFiltroEstado] = useState<EstadoCotizacion | "todos">("todos")
  const [busqueda, setBusqueda] = useState("")

  const cargar = () => setLista(cotizaciones.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function calcularTotales(items: CotizacionItem[], descuento: number) {
    const subtotal = items.reduce((s, it) => s + it.subtotal, 0)
    const total = Math.round(subtotal * (1 - descuento / 100))
    return { subtotal, total }
  }

  function abrir(c?: Cotizacion) {
    if (c) { setEditando(c); const { id, creadoEn, ...r } = c; setForm(r) }
    else { setEditando(null); setForm({ ...emptyForm(), numero: cotizaciones.nextNumero() }) }
    setOpen(true)
  }

  function guardar() {
    if (!form.cliente || !form.descripcion) return
    const totales = calcularTotales(form.items, form.descuento)
    const final = { ...form, ...totales }
    editando ? cotizaciones.update(editando.id, final) : cotizaciones.add(final)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminacion?")) return
    cotizaciones.delete(id); cargar()
  }

  function convertirAOT(c: Cotizacion) {
    ordenesTrabajo.add({
      numero: ordenesTrabajo.nextNumero(),
      tipo: "instalacion",
      cliente: c.cliente,
      empresa: c.empresa ?? "",
      direccion: "",
      ciudad: (c.ciudad as any) ?? "Otra",
      equipo: "",
      descripcion: `${c.descripcion}\n\nOrigen: Cotizacion ${c.numero}`,
      tecnico: "",
      fechaProgramada: new Date().toISOString().slice(0, 10),
      fechaInicio: "", fechaTermino: "",
      estado: "pendiente",
      observaciones: `Desde cotizacion ${c.numero} - Total: ${fmtClp(c.total)}`,
      costoManoObra: 0,
      costoMateriales: c.total,
    })
    cotizaciones.update(c.id, { estado: "aceptada" })
    cargar()
    router.push("/ordenes")
  }

  const setS = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  function handleItems(items: CotizacionItem[]) {
    const { subtotal, total } = calcularTotales(items, form.descuento)
    setForm(f => ({ ...f, items, subtotal, total }))
  }

  function handleDescuento(v: number) {
    const { subtotal, total } = calcularTotales(form.items, v)
    setForm(f => ({ ...f, descuento: v, subtotal, total }))
  }

  const filtrada = lista.filter(c => {
    if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return c.cliente.toLowerCase().includes(q) || (c.empresa ?? "").toLowerCase().includes(q) || c.numero.toLowerCase().includes(q)
    }
    return true
  })

  const totalesPorEstado = estados.map(e => ({ ...e, count: lista.filter(c => c.estado === e.value).length }))
  const totalAceptadas = lista.filter(c => c.estado === "aceptada").reduce((s, c) => s + c.total, 0)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Aceptadas", value: lista.filter(c => c.estado === "aceptada").length, color: "#0891b2" },
    { label: "Pendientes", value: lista.filter(c => c.estado === "enviada").length, color: "#fbbf24" },
    { label: "Monto acept.", value: fmtClp(totalAceptadas), color: "#7c3aed" },
  ]

  return (
    <PageShell
      icon={FileText}
      title="Cotizaciones"
      subtitle="Gestión de presupuestos y propuestas comerciales"
      color="#a78bfa"
      stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Cotización</button>}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Buscar cliente, empresa, numero..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-64 h-8 text-sm" />
        <button onClick={() => setFiltroEstado("todos")} className={`filter-pill${filtroEstado === "todos" ? " active" : ""}`}>Todos ({lista.length})</button>
        {totalesPorEstado.map(e => (
          <button key={e.value} onClick={() => setFiltroEstado(e.value)} className={`filter-pill${filtroEstado === e.value ? " active" : ""}`}>
            {e.label} ({e.count})
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1">
        {filtrada.length === 0 && (
          <div className="col-span-3 py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            No hay cotizaciones.
          </div>
        )}
        {filtrada.map(c => (
          <CotizacionCard key={c.id} c={c}
            onEdit={() => abrir(c)}
            onDelete={() => eliminar(c.id)}
            onConvertir={() => convertirAOT(c)}
            onImprimir={() => imprimirCotizacionPDF(c)} />
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Cotizacion" : "Nueva Cotizacion"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>N Cotizacion</Label>
                <Input value={form.numero} onChange={e => setS("numero", e.target.value)} /></div>
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{estados.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cliente *</Label>
                <Input value={form.cliente} onChange={e => setS("cliente", e.target.value)} /></div>
              <div className="space-y-1"><Label>Empresa</Label>
                <Input value={form.empresa ?? ""} onChange={e => setS("empresa", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Email</Label>
                <Input value={form.email ?? ""} onChange={e => setS("email", e.target.value)} /></div>
              <div className="space-y-1"><Label>Telefono</Label>
                <Input value={form.telefono ?? ""} onChange={e => setS("telefono", e.target.value)} /></div>
              <div className="space-y-1"><Label>Ciudad</Label>
                <Input value={form.ciudad ?? ""} onChange={e => setS("ciudad", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Descripcion general *</Label>
              <Textarea value={form.descripcion} onChange={e => setS("descripcion", e.target.value)} rows={2}
                placeholder="Ej: Suministro e instalacion de sistema supresor de polvo" /></div>

            <ItemsTable items={form.items} onChange={handleItems} />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Descuento (%)</Label>
                <Input type="number" min={0} max={100} value={form.descuento} onChange={e => handleDescuento(Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Validez (dias)</Label>
                <Input type="number" min={1} value={form.validezDias} onChange={e => setS("validezDias", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Fecha vencimiento</Label>
                <Input type="date" value={form.fechaVencimiento} onChange={e => setS("fechaVencimiento", e.target.value)} /></div>
            </div>

            <div className="p-3 rounded-lg space-y-1" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: "var(--muted-foreground)" }}>Subtotal</span>
                <span>{fmtClp(form.subtotal)}</span>
              </div>
              {form.descuento > 0 && (
                <div className="flex justify-between text-sm">
                  <span style={{ color: "var(--muted-foreground)" }}>Descuento ({form.descuento}%)</span>
                  <span style={{ color: "#0891b2" }}>-{fmtClp(form.subtotal - form.total)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base pt-1" style={{ borderTop: "1px solid var(--border)" }}>
                <span>Total</span>
                <span style={{ color: "var(--primary)" }}>{fmtClp(form.total)}</span>
              </div>
            </div>

            <div className="space-y-1"><Label>Notas</Label>
              <Textarea value={form.notas ?? ""} onChange={e => setS("notas", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>
              {editando ? "Guardar cambios" : "Crear cotizacion"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
