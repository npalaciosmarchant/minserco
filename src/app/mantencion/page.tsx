"use client"

import { useEffect, useState } from "react"
import { mantenciones } from "@/lib/store"
import { Mantencion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Wrench, CalendarDays, User, Camera } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import DateFilter, { filterByDate, DateRange } from "@/components/ui/DateFilter"
import Pagination from "@/components/ui/Pagination"
import { usePagination } from "@/lib/usePagination"
import { FotoGaleria } from "@/components/ui/FotoGaleria"

const estadoCfg: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: "Pendiente",  color: "#ea580c", bg: "#fff7ed" },
  en_proceso: { label: "En proceso", color: "#7c3aed", bg: "#f5f3ff" },
  completado: { label: "Completado", color: "#059669", bg: "#f0fdf4" },
}

const empty = (): Omit<Mantencion, "id" | "creadoEn"> => ({
  equipo: "", numeroSerie: "", tipo: "preventivo", descripcion: "",
  tecnico: "", fecha: new Date().toISOString().slice(0, 10),
  estado: "pendiente", observaciones: "", proximaMantencion: "", fotos: [],
})

export default function MantencionPage() {
  const [lista, setLista] = useState<Mantencion[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Mantencion | null>(null)
  const [form, setForm] = useState(empty())
  const [filtro, setFiltro] = useState<string>("todos")
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" })

  const cargar = () => setLista(mantenciones.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(m?: Mantencion) {
    if (m) { setEditando(m); const { id, creadoEn, ...r } = m; setForm(r) }
    else { setEditando(null); setForm(empty()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.equipo || !form.descripcion || !form.tecnico) return
    editando ? mantenciones.update(editando.id, form) : mantenciones.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    mantenciones.delete(id); cargar()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const porEstado = filtro === "todos" ? lista : lista.filter(m => m.estado === filtro)
  const filtrada = filterByDate(porEstado, dateRange)
  const { paged, page, totalPages, goTo, reset, total } = usePagination(filtrada, 20)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Pendientes", value: lista.filter(m => m.estado === "pendiente").length, color: "#f97316" },
    { label: "En proceso", value: lista.filter(m => m.estado === "en_proceso").length, color: "#7c3aed" },
    { label: "Completadas", value: lista.filter(m => m.estado === "completado").length, color: "#0891b2" },
  ]

  return (
    <PageShell
      icon={Wrench}
      title="Mantención de Equipos"
      subtitle="Mantenciones preventivas y correctivas"
      color="#f97316"
      stats={stats}
      actions={
        <button className="btn-accent" onClick={() => abrir()}>
          <Plus size={14} /> Nueva Mantención
        </button>
      }
    >
      {/* Date filter */}
      <div className="mb-3"><DateFilter onChange={r => { setDateRange(r); reset() }} /></div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {(["todos", "pendiente", "en_proceso", "completado"] as const).map(f => (
          <button key={f} className={`filter-pill${filtro === f ? " active" : ""}`} onClick={() => setFiltro(f)}>
            {f === "todos" ? `Todos (${lista.length})` : `${estadoCfg[f]?.label} (${lista.filter(m => m.estado === f).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="glass-section overflow-hidden">
        {filtrada.length === 0 ? (
          <div className="empty-state">
            <Wrench size={40} />
            <p>No hay mantenciones{filtro !== "todos" ? ` con estado "${estadoCfg[filtro]?.label}"` : ""}</p>
          </div>
        ) : (
          paged.map((m, i) => {
            const cfg = estadoCfg[m.estado]
            return (
              <div key={m.id} className="group"
                style={{
                  borderBottom: i < paged.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none",
                  padding: "14px 16px",
                  transition: "background var(--duration-fast) var(--ease-out)",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.025)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left accent bar */}
                  <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5"
                    style={{ background: cfg.color, opacity: 0.7 }} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{m.equipo}</span>
                      {m.numeroSerie && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded"
                          style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                          #{m.numeroSerie}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                        {m.tipo}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", lineHeight: 1.5 }}>{m.descripcion}</p>
                    <div className="flex gap-4 text-xs flex-wrap" style={{ color: "var(--muted-foreground)" }}>
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        <strong style={{ color: "var(--foreground)" }}>{m.tecnico}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarDays size={11} />
                        <strong style={{ color: "var(--foreground)" }}>{m.fecha}</strong>
                      </span>
                      {m.proximaMantencion && (
                        <span className="flex items-center gap-1">
                          <CalendarDays size={11} />
                          Próxima: <strong style={{ color: "#f59e0b" }}>{m.proximaMantencion}</strong>
                        </span>
                      )}
                    </div>
                    {m.observaciones && (
                      <p className="text-xs mt-1.5 italic" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
                        {m.observaciones}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(m)}>
                      <Pencil size={13} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(m.id)}>
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Mantención" : "Nueva Mantención"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Equipo *</Label><Input value={form.equipo} onChange={e => set("equipo", e.target.value)} placeholder="Nombre del equipo" /></div>
              <div className="space-y-1"><Label>N° Serie</Label><Input value={form.numeroSerie} onChange={e => set("numeroSerie", e.target.value)} placeholder="SN-0001" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => set("tipo", v ?? "preventivo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventivo">Preventivo</SelectItem>
                    <SelectItem value="correctivo">Correctivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => set("estado", v ?? "pendiente")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                          </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Descripción *</Label><Textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Técnico *</Label><Input value={form.tecnico} onChange={e => set("tecnico", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => set("fecha", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Próxima mantención</Label><Input type="date" value={form.proximaMantencion ?? ""} onChange={e => set("proximaMantencion", e.target.value)} /></div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => set("observaciones", e.target.value)} rows={2} /></div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Camera size={13} />Fotos ({(form.fotos ?? []).length}/6)</Label>
              <FotoGaleria fotos={form.fotos ?? []} onChange={fotos => set("fotos", fotos as any)} />
            </div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Registrar mantención"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
