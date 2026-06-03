"use client"

import { useEffect, useState } from "react"
import { proyectos } from "@/lib/store"
import { Proyecto, EstadoProyecto } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, LayoutGrid, List, Factory, Calendar, User, TrendingUp } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const estados: { value: EstadoProyecto; label: string; color: string; bg: string; border: string }[] = [
  { value: "planificacion",   label: "Planificación",   color: "#64748b", bg: "#f8fafc", border: "#e2e8f0" },
  { value: "en_progreso",     label: "En Progreso",     color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { value: "control_calidad", label: "Control Calidad", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { value: "pausado",         label: "Pausado",         color: "#ea580c", bg: "#fff7ed", border: "#fed7aa" },
  { value: "completado",      label: "Completado",      color: "#059669", bg: "#f0fdf4", border: "#bbf7d0" },
]
const estadoMap = Object.fromEntries(estados.map(e => [e.value, e]))

const empty = (): Omit<Proyecto, "id" | "creadoEn"> => ({
  nombre: "", cliente: "", descripcion: "", estado: "planificacion",
  fechaInicio: new Date().toISOString().slice(0, 10),
  fechaEntrega: "", responsable: "", progreso: 0, notas: "",
})

function ProyectoCard({ p, onEdit, onDelete }: { p: Proyecto; onEdit: () => void; onDelete: () => void }) {
  const est = estadoMap[p.estado]
  const diasRestantes = p.fechaEntrega
    ? Math.ceil((new Date(p.fechaEntrega).getTime() - Date.now()) / 86400000)
    : null
  const urgente = diasRestantes !== null && diasRestantes <= 3 && p.estado !== "completado"
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-150 hover:translate-y-[-2px] hover:shadow-lg group"
      style={{ background: "var(--card)", border: `1px solid ${urgente ? "#f97316" : "var(--border)"}` }}
    >
      {/* Color accent top bar */}
      <div className="h-0.5 w-full" style={{ background: est.color }} />
      <div className="p-3.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="font-semibold text-sm leading-snug" style={{ color: "var(--foreground)" }}>{p.nombre}</span>
          <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil size={11} /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={onDelete}><Trash2 size={11} /></Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2.5">
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
            <User size={10} />{p.cliente}
          </span>
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
            {p.responsable}
          </span>
          {p.fechaEntrega && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium"
              style={{ background: urgente ? "rgba(249,115,22,0.15)" : "var(--accent)", color: urgente ? "#f97316" : "var(--muted-foreground)" }}>
              <Calendar size={10} />
              {urgente && diasRestantes! <= 0 ? `Vencido` : diasRestantes !== null ? `${diasRestantes}d` : p.fechaEntrega}
            </span>
          )}
        </div>

        {p.descripcion && (
          <p className="text-xs line-clamp-2 mb-2.5" style={{ color: "var(--muted-foreground)" }}>{p.descripcion}</p>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
              <TrendingUp size={10} /> Progreso
            </span>
            <span className="font-semibold" style={{ color: est.color }}>{p.progreso}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${p.progreso}%`, background: `linear-gradient(90deg, ${est.color}99, ${est.color})` }} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FabricacionPage() {
  const [lista, setLista] = useState<Proyecto[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Proyecto | null>(null)
  const [form, setForm] = useState(empty())
  const [vista, setVista] = useState<"kanban" | "lista">("kanban")
  const [tabActivo, setTabActivo] = useState<EstadoProyecto | "todos">("todos")

  const cargar = () => setLista(proyectos.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(p?: Proyecto) {
    if (p) { setEditando(p); const { id, creadoEn, ...r } = p; setForm(r) }
    else { setEditando(null); setForm(empty()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.nombre || !form.cliente || !form.responsable) return
    editando ? proyectos.update(editando.id, form) : proyectos.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    proyectos.delete(id); cargar()
  }

  const setS = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setN = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }))
  const filtrada = tabActivo === "todos" ? lista : lista.filter(p => p.estado === tabActivo)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Activos", value: lista.filter(p => p.estado !== "completado").length, color: "#7c3aed" },
    { label: "Completados", value: lista.filter(p => p.estado === "completado").length, color: "#0891b2" },
  ]

  return (
    <PageShell
      icon={Factory}
      title="Fabricación"
      subtitle="Gestión de proyectos y producción"
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
          <button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Proyecto</button>
        </div>
      }
    >

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Proyecto" : "Nuevo Proyecto"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Nombre del proyecto *</Label>
              <Input value={form.nombre} onChange={e => setS("nombre", e.target.value)} placeholder="Ej: Supresor polvo minera X" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cliente *</Label><Input value={form.cliente} onChange={e => setS("cliente", e.target.value)} /></div>
              <div className="space-y-1"><Label>Responsable *</Label><Input value={form.responsable} onChange={e => setS("responsable", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Descripción</Label><Textarea value={form.descripcion} onChange={e => setS("descripcion", e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "planificacion")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{estados.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Progreso (%)</Label>
                <Input type="number" min={0} max={100} value={form.progreso} onChange={e => setN("progreso", Number(e.target.value))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha inicio</Label><Input type="date" value={form.fechaInicio} onChange={e => setS("fechaInicio", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha entrega</Label><Input type="date" value={form.fechaEntrega} onChange={e => setS("fechaEntrega", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={form.notas ?? ""} onChange={e => setS("notas", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear proyecto"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {vista === "kanban" && (
        <div className="kanban-scroll flex gap-4 overflow-x-auto pb-3 flex-1" style={{ alignItems: "flex-start" }}>
          {estados.map(est => {
            const cols = lista.filter(p => p.estado === est.value)
            return (
              <div key={est.value} className="shrink-0 flex flex-col rounded-xl overflow-hidden"
                style={{ width: "280px", border: `1px solid ${est.border}`, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
                {/* Column header */}
                <div className="px-3 pt-3 pb-2.5" style={{ background: "#ffffff", borderBottom: `1px solid ${est.border}` }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: est.color }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider text-gray-700">{est.label}</span>
                    </div>
                    <span className="text-[11px] font-bold min-w-[22px] h-[22px] rounded-full flex items-center justify-center"
                      style={{ background: est.color + "20", color: est.color }}>
                      {cols.length}
                    </span>
                  </div>
                  {cols.length > 0 && (
                    <div className="mt-2 h-1 rounded-full overflow-hidden bg-gray-100">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(cols.reduce((s, p) => s + p.progreso, 0) / cols.length)}%`, background: est.color }} />
                    </div>
                  )}
                </div>
                {/* Cards */}
                <div className="flex-1 p-2 space-y-2 min-h-48" style={{ background: est.bg }}>
                  {cols.length === 0 && (
                    <div className="py-10 text-center text-xs text-gray-400 rounded-lg border border-dashed border-gray-200">
                      Sin proyectos
                    </div>
                  )}
                  {cols.map(p => (
                    <ProyectoCard key={p.id} p={p} onEdit={() => abrir(p)} onDelete={() => eliminar(p.id)} />
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
            <button className={`filter-pill${tabActivo === "todos" ? " active" : ""}`} onClick={() => setTabActivo("todos")}>Todos ({lista.length})</button>
            {estados.map(e => (
              <button key={e.value} className={`filter-pill${tabActivo === e.value ? " active" : ""}`} onClick={() => setTabActivo(e.value)}>
                {e.label} ({lista.filter(p => p.estado === e.value).length})
              </button>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtrada.length === 0 && (
              <div className="col-span-2 empty-state glass-section"><Factory size={40} /><p>No hay proyectos en esta categoría.</p></div>
            )}
            {filtrada.map(p => <ProyectoCard key={p.id} p={p} onEdit={() => abrir(p)} onDelete={() => eliminar(p.id)} />)}
          </div>
        </div>
      )}
    </PageShell>
  )
}
