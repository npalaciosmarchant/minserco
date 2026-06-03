"use client"

import { useEffect, useState } from "react"
import { reparaciones } from "@/lib/store"
import { Reparacion, EstadoReparacion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, LayoutGrid, List, Settings, User, AlertTriangle, CheckCircle2 } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import DateFilter, { filterByDate, DateRange } from "@/components/ui/DateFilter"
import Pagination from "@/components/ui/Pagination"
import { usePagination } from "@/lib/usePagination"

const estados: { value: EstadoReparacion; label: string; color: string; bg: string; border: string }[] = [
  { value: "recibido",           label: "Recibido",        color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  { value: "diagnostico",        label: "Diagnóstico",     color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { value: "en_reparacion",      label: "Reparando",       color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { value: "esperando_repuestos",label: "Esp. Repuestos",  color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  { value: "listo",              label: "Listo",           color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  { value: "entregado",          label: "Entregado",       color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
]
const estadoMap = Object.fromEntries(estados.map(e => [e.value, e]))

const empty = (): Omit<Reparacion, "id" | "creadoEn"> => ({
  equipo: "", numeroSerie: "", cliente: "", telefono: "", falla: "",
  diagnostico: "", repuestosUsados: "", tecnico: "",
  fechaRecepcion: new Date().toISOString().slice(0, 10),
  fechaEstimada: "", fechaEntrega: "", estado: "recibido",
  costoEstimado: undefined, costoFinal: undefined,
})

function ReparacionCard({ r, onEdit, onDelete }: { r: Reparacion; onEdit: () => void; onDelete: () => void }) {
  const est = estadoMap[r.estado]
  const hoy = new Date().toISOString().slice(0, 10)
  const vencida = r.fechaEstimada && r.fechaEstimada < hoy && r.estado !== "entregado" && r.estado !== "listo"
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-150 hover:translate-y-[-2px] hover:shadow-lg group"
      style={{ background: "var(--card)", border: `1px solid ${vencida ? "#f87171" : "var(--border)"}` }}
    >
      <div className="h-0.5 w-full" style={{ background: est.color }} />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="font-semibold text-sm leading-snug" style={{ color: "var(--foreground)" }}>{r.equipo}</div>
            {r.numeroSerie && (
              <span className="text-xs font-mono px-1 py-0.5 rounded mt-0.5 inline-block"
                style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>#{r.numeroSerie}</span>
            )}
          </div>
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil size={11} /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={onDelete}><Trash2 size={11} /></Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md"
            style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
            <User size={10} />{r.cliente}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
            {r.tecnico}
          </span>
          {vencida && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
              <AlertTriangle size={10} /> Vencida
            </span>
          )}
          {r.estado === "listo" && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: "rgba(45,212,191,0.15)", color: "#0891b2" }}>
              <CheckCircle2 size={10} /> Listo p/entregar
            </span>
          )}
        </div>

        <p className="text-xs line-clamp-2 mb-2" style={{ color: "var(--muted-foreground)" }}>{r.falla}</p>

        {r.diagnostico && (
          <p className="text-xs px-2 py-1.5 rounded-lg mb-2 italic"
            style={{ background: "var(--accent)", color: "var(--muted-foreground)", borderLeft: `2px solid ${est.color}60` }}>
            {r.diagnostico}
          </p>
        )}

        <div className="flex items-center justify-between text-xs pt-1" style={{ borderTop: "1px solid var(--border)", color: "var(--muted-foreground)" }}>
          <span>{r.fechaRecepcion}</span>
          <div className="flex gap-2">
            {r.costoEstimado && !r.costoFinal && (
              <span className="font-semibold" style={{ color: est.color }}>${r.costoEstimado.toLocaleString("es-CL")}</span>
            )}
            {r.costoFinal && (
              <span className="font-bold" style={{ color: "#16a34a" }}>${r.costoFinal.toLocaleString("es-CL")}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ReparacionPage() {
  const [lista, setLista] = useState<Reparacion[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Reparacion | null>(null)
  const [form, setForm] = useState(empty())
  const [filtro, setFiltro] = useState<EstadoReparacion | "todos">("todos")
  const [vista, setVista] = useState<"kanban" | "lista">("kanban")

  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" })

  const cargar = () => setLista(reparaciones.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(r?: Reparacion) {
    if (r) { setEditando(r); const { id, creadoEn, ...rest } = r; setForm(rest) }
    else { setEditando(null); setForm(empty()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.equipo || !form.cliente || !form.falla || !form.tecnico) return
    editando ? reparaciones.update(editando.id, form) : reparaciones.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    reparaciones.delete(id); cargar()
  }

  const setS = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setN = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }))
  const filtrada = filtro === "todos" ? lista : lista.filter(r => r.estado === filtro)
  const filtradaFecha = filterByDate(filtrada, dateRange)
  const { paged, page, totalPages, goTo, reset, total } = usePagination(filtradaFecha, 20)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Listos", value: lista.filter(r => r.estado === "listo").length, color: "#0891b2" },
    { label: "Reparando", value: lista.filter(r => r.estado === "en_reparacion").length, color: "#7c3aed" },
    { label: "Vencidos", value: lista.filter(r => r.fechaEstimada && r.fechaEstimada < new Date().toISOString().slice(0,10) && r.estado !== "entregado" && r.estado !== "listo").length, color: "#f87171" },
  ]

  return (
    <PageShell
      icon={Settings}
      title="Reparación de Equipos"
      subtitle="Gestión de ingresos y estado de reparaciones"
      color="#a78bfa"
      stats={stats}
      actions={
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button className="px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors"
              style={vista === "kanban" ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "transparent", color: "var(--muted-foreground)" }}
              onClick={() => setVista("kanban")}><LayoutGrid size={13} /> Kanban</button>
            <button className="px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors"
              style={vista === "lista" ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "transparent", color: "var(--muted-foreground)" }}
              onClick={() => setVista("lista")}><List size={13} /> Lista</button>
          </div>
          <button className="btn-accent" onClick={() => abrir()}>
            <Plus size={14} /> Nuevo Ingreso
          </button>
        </div>
      }
    >

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Reparación" : "Ingresar Equipo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Equipo *</Label><Input value={form.equipo} onChange={e => setS("equipo", e.target.value)} /></div>
              <div className="space-y-1"><Label>N° Serie</Label><Input value={form.numeroSerie} onChange={e => setS("numeroSerie", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cliente *</Label><Input value={form.cliente} onChange={e => setS("cliente", e.target.value)} /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.telefono ?? ""} onChange={e => setS("telefono", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Falla reportada *</Label><Textarea value={form.falla} onChange={e => setS("falla", e.target.value)} rows={2} /></div>
            <div className="space-y-1"><Label>Diagnóstico</Label><Textarea value={form.diagnostico ?? ""} onChange={e => setS("diagnostico", e.target.value)} rows={2} /></div>
            <div className="space-y-1"><Label>Repuestos utilizados</Label><Textarea value={form.repuestosUsados ?? ""} onChange={e => setS("repuestosUsados", e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Técnico *</Label><Input value={form.tecnico} onChange={e => setS("tecnico", e.target.value)} /></div>
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "recibido")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{estados.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha recepción</Label><Input type="date" value={form.fechaRecepcion} onChange={e => setS("fechaRecepcion", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha estimada</Label><Input type="date" value={form.fechaEstimada ?? ""} onChange={e => setS("fechaEstimada", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Costo estimado ($)</Label><Input type="number" value={form.costoEstimado ?? ""} onChange={e => setN("costoEstimado", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Costo final ($)</Label><Input type="number" value={form.costoFinal ?? ""} onChange={e => setN("costoFinal", Number(e.target.value))} /></div>
            </div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Registrar ingreso"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="mb-3 flex items-center gap-3"><DateFilter onChange={r => { setDateRange(r); reset() }} /></div>
      {vista === "kanban" && (
        <div className="kanban-scroll flex gap-4 overflow-x-auto pb-3 flex-1" style={{ alignItems: "flex-start" }}>
          {estados.map(est => {
            const cols = lista.filter(r => r.estado === est.value)
            return (
              <div key={est.value} className="shrink-0 flex flex-col rounded-xl overflow-hidden"
                style={{ width: "260px", border: `1px solid ${est.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                <div className="px-3 pt-3 pb-2.5 bg-white" style={{ borderBottom: `1px solid ${est.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: est.color }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">{est.label}</span>
                    </div>
                    <span className="text-[11px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center"
                      style={{ background: est.color + "20", color: est.color }}>{cols.length}</span>
                  </div>
                  {est.value === "listo" && cols.length > 0 && (
                    <p className="text-xs mt-1 font-medium" style={{ color: est.color }}>⚡ Pendiente de entrega</p>
                  )}
                </div>
                <div className="flex-1 p-2 space-y-2 min-h-48" style={{ background: est.bg }}>
                  {cols.length === 0 && (
                    <div className="py-10 text-center text-xs text-gray-400 rounded-lg border border-dashed border-gray-200">Sin equipos</div>
                  )}
                  {cols.map(r => (
                    <ReparacionCard key={r.id} r={r} onEdit={() => abrir(r)} onDelete={() => eliminar(r.id)} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {vista === "lista" && (
        <div>
          <div className="flex gap-1.5 flex-wrap mb-4">
            <button className={`filter-pill${filtro === "todos" ? " active" : ""}`} onClick={() => setFiltro("todos")}>
              Todos ({lista.length})
            </button>
            {estados.map(e => (
              <button key={e.value} className={`filter-pill${filtro === e.value ? " active" : ""}`} onClick={() => setFiltro(e.value)}>
                {e.label} ({lista.filter(r => r.estado === e.value).length})
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {filtrada.length === 0 && (
              <div className="empty-state glass-section"><Settings size={40} /><p>Sin registros.</p></div>
            )}
            {filtrada.map(r => <ReparacionCard key={r.id} r={r} onEdit={() => abrir(r)} onDelete={() => eliminar(r.id)} />)}
          </div>
        </div>
      )}
    </PageShell>
  )
}
