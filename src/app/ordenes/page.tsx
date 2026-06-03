"use client"

import { useEffect, useState } from "react"
import { ordenesTrabajo } from "@/lib/store"
import { OrdenTrabajo, EstadoOT, TipoOT, CiudadOficina } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ClipboardList, Clock, Play, CheckCircle2, XCircle, MapPin, User, Wrench } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import DateFilter, { filterByDate, DateRange } from "@/components/ui/DateFilter"
import Pagination from "@/components/ui/Pagination"
import { usePagination } from "@/lib/usePagination"

const ciudades: CiudadOficina[] = ["Copiapó", "La Serena", "Viña del Mar", "Otra"]

const tiposOT: { value: TipoOT; label: string }[] = [
  { value: "instalacion", label: "Instalación" },
  { value: "mantencion_terreno", label: "Mantención en Terreno" },
  { value: "reparacion_terreno", label: "Reparación en Terreno" },
  { value: "inspeccion", label: "Inspección" },
]

const estadosOT: { value: EstadoOT; label: string; color: string; bg: string; border: string; icon: React.ElementType }[] = [
  { value: "pendiente",  label: "Pendiente",  color: "#64748b", bg: "#f8fafc", border: "#e2e8f0", icon: Clock },
  { value: "en_curso",   label: "En Curso",   color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe", icon: Play },
  { value: "completada", label: "Completada", color: "#059669", bg: "#f0fdf4", border: "#bbf7d0", icon: CheckCircle2 },
  { value: "cancelada",  label: "Cancelada",  color: "#dc2626", bg: "#fef2f2", border: "#fecaca", icon: XCircle },
]
const estadoMap = Object.fromEntries(estadosOT.map(e => [e.value, e]))

const empty = (): Omit<OrdenTrabajo, "id" | "creadoEn"> => ({
  numero: "", tipo: "instalacion",
  cliente: "", empresa: "", direccion: "", ciudad: "Copiapó",
  equipo: "", descripcion: "", tecnico: "",
  fechaProgramada: new Date().toISOString().slice(0, 10),
  fechaInicio: "", fechaTermino: "", estado: "pendiente",
  observaciones: "", costoManoObra: 0, costoMateriales: 0,
})

function fmtClp(n: number) {
  return n.toLocaleString("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 })
}

function OTCard({ ot, onEdit, onDelete }: { ot: OrdenTrabajo; onEdit: () => void; onDelete: () => void }) {
  const est = estadoMap[ot.estado]
  const Icon = est.icon
  const tipo = tiposOT.find(t => t.value === ot.tipo)?.label ?? ot.tipo
  const costoTotal = (ot.costoManoObra ?? 0) + (ot.costoMateriales ?? 0)

  return (
    <div className="rounded-xl overflow-hidden group transition-all duration-150 hover:translate-y-[-1px] hover:shadow-lg"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="h-0.5" style={{ background: est.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>{ot.numero}</span>
              <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full font-medium"
                style={{ background: est.color + "20", color: est.color }}>
                <Icon size={10} />{est.label}
              </span>
            </div>
            <div className="text-xs font-semibold px-1.5 py-0.5 rounded-md inline-block" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>{tipo}</div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil size={11} /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={onDelete}><Trash2 size={11} /></Button>
          </div>
        </div>

        <div className="font-semibold text-sm mb-0.5" style={{ color: "var(--foreground)" }}>{ot.empresa || ot.cliente}</div>
        {ot.empresa && <div className="text-xs mb-2" style={{ color: "var(--muted-foreground)" }}>{ot.cliente}</div>}

        <div className="text-xs mb-3 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>{ot.descripcion}</div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
            <MapPin size={10} />{ot.ciudad}
          </span>
          {ot.tecnico && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
              <User size={10} />{ot.tecnico}
            </span>
          )}
          {ot.equipo && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
              <Wrench size={10} />{ot.equipo}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted-foreground)" }}>
          <span>Programada: {ot.fechaProgramada}</span>
          {costoTotal > 0 && <span className="font-medium" style={{ color: "var(--foreground)" }}>{fmtClp(costoTotal)}</span>}
        </div>
      </div>
    </div>
  )
}

export default function OrdenesPage() {
  const [lista, setLista] = useState<OrdenTrabajo[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<OrdenTrabajo | null>(null)
  const [form, setForm] = useState(empty())
  const [vistaKanban, setVistaKanban] = useState(true)
  const [filtroCiudad, setFiltroCiudad] = useState<CiudadOficina | "todas">("todas")
  const [busqueda, setBusqueda] = useState("")

  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" })

  const cargar = () => setLista(ordenesTrabajo.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(ot?: OrdenTrabajo) {
    if (ot) { setEditando(ot); const { id, creadoEn, ...r } = ot; setForm(r) }
    else { setEditando(null); setForm({ ...empty(), numero: ordenesTrabajo.nextNumero() }) }
    setOpen(true)
  }

  function guardar() {
    if (!form.cliente || !form.descripcion || !form.tecnico) return
    editando ? ordenesTrabajo.update(editando.id, form) : ordenesTrabajo.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    ordenesTrabajo.delete(id); cargar()
  }

  const setS = (k: string, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const filtrada = lista.filter(ot => {
    if (filtroCiudad !== "todas" && ot.ciudad !== filtroCiudad) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return ot.cliente.toLowerCase().includes(q) || (ot.empresa ?? "").toLowerCase().includes(q) || ot.numero.toLowerCase().includes(q)
    }
    return true
  })

  const filtradaFecha = filterByDate(filtrada, dateRange)
  const { paged: pagedGrid, page: gridPage, totalPages: gridTotal, goTo: gridGoTo, reset: gridReset, total: gridTot } = usePagination(filtradaFecha, 20)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "En curso", value: lista.filter(o => o.estado === "en_curso").length, color: "#60a5fa" },
    { label: "Pendientes", value: lista.filter(o => o.estado === "pendiente").length, color: "#f59e0b" },
    { label: "Completadas", value: lista.filter(o => o.estado === "completada").length, color: "#0891b2" },
  ]

  return (
    <PageShell
      icon={ClipboardList}
      title="Órdenes de Trabajo"
      subtitle="Gestión y seguimiento de OTs"
      color="#60a5fa"
      stats={stats}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button className="px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={vistaKanban ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "transparent", color: "var(--muted-foreground)" }}
              onClick={() => setVistaKanban(true)}>Kanban</button>
            <button className="px-2.5 py-1.5 text-xs font-medium transition-colors"
              style={!vistaKanban ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "transparent", color: "var(--muted-foreground)" }}
              onClick={() => setVistaKanban(false)}>Lista</button>
          </div>
          <button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva OT</button>
        </div>
      }
    >
      <div className="mb-3"><DateFilter onChange={r => { setDateRange(r); gridReset() }} /></div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Buscar cliente, empresa, OT…" value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-64 h-8 text-sm" />
        {(["todas", ...ciudades] as const).map(c => (
          <button key={c} onClick={() => setFiltroCiudad(c as typeof filtroCiudad)}
            className={`filter-pill${filtroCiudad === c ? " active" : ""}`}>
            {c === "todas" ? "Todas" : c}
          </button>
        ))}
      </div>

      {vistaKanban ? (
        <div className="kanban-scroll flex gap-4 overflow-x-auto pb-3 flex-1" style={{ alignItems: "flex-start" }}>
          {estadosOT.map(est => {
            const cols = filtrada.filter(ot => ot.estado === est.value)
            return (
              <div key={est.value} className="shrink-0 flex flex-col rounded-xl overflow-hidden"
                style={{ width: "280px", border: `1px solid ${est.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="px-3 pt-3 pb-2.5 bg-white" style={{ borderBottom: `1px solid ${est.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: est.color }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">{est.label}</span>
                    </div>
                    <span className="text-[11px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center"
                      style={{ background: est.color + "20", color: est.color }}>{cols.length}</span>
                  </div>
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-48" style={{ background: est.bg }}>
                  {cols.length === 0 && (
                    <div className="py-10 text-center text-xs text-gray-400 rounded-lg border border-dashed border-gray-200">Sin órdenes</div>
                  )}
                  {cols.map(ot => <OTCard key={ot.id} ot={ot} onEdit={() => abrir(ot)} onDelete={() => eliminar(ot.id)} />)}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1">
          {filtrada.length === 0 && <div className="col-span-3 py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No hay órdenes.</div>}
          {pagedGrid.map(ot => <OTCard key={ot.id} ot={ot} onEdit={() => abrir(ot)} onDelete={() => eliminar(ot.id)} />)}
        </div>
        </>
      )}
      <Pagination page={gridPage} totalPages={gridTotal} total={gridTot} pageSize={20} onPage={gridGoTo} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar OT" : "Nueva Orden de Trabajo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>N° OT</Label><Input value={form.numero} onChange={e => setS("numero", e.target.value)} /></div>
              <div className="space-y-1"><Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setS("tipo", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposOT.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{estadosOT.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cliente *</Label><Input value={form.cliente} onChange={e => setS("cliente", e.target.value)} /></div>
              <div className="space-y-1"><Label>Empresa</Label><Input value={form.empresa ?? ""} onChange={e => setS("empresa", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Dirección</Label><Input value={form.direccion} onChange={e => setS("direccion", e.target.value)} /></div>
              <div className="space-y-1"><Label>Ciudad</Label>
                <Select value={form.ciudad} onValueChange={v => setS("ciudad", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ciudades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Equipo (si aplica)</Label><Input value={form.equipo ?? ""} onChange={e => setS("equipo", e.target.value)} placeholder="Nombre o código del equipo" /></div>
            <div className="space-y-1"><Label>Descripción del trabajo *</Label>
              <Textarea value={form.descripcion} onChange={e => setS("descripcion", e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Técnico asignado *</Label><Input value={form.tecnico} onChange={e => setS("tecnico", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha programada</Label><Input type="date" value={form.fechaProgramada} onChange={e => setS("fechaProgramada", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha inicio</Label><Input type="date" value={form.fechaInicio ?? ""} onChange={e => setS("fechaInicio", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha término</Label><Input type="date" value={form.fechaTermino ?? ""} onChange={e => setS("fechaTermino", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Costo mano de obra (CLP)</Label><Input type="number" min={0} value={form.costoManoObra ?? 0} onChange={e => setS("costoManoObra", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Costo materiales (CLP)</Label><Input type="number" min={0} value={form.costoMateriales ?? 0} onChange={e => setS("costoMateriales", Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear orden"}</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Pagination page={gridPage} totalPages={gridTotal} total={gridTot} pageSize={20} onPage={gridGoTo} />
    </PageShell>
  )
}