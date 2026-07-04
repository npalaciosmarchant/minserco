"use client"

import { useEffect, useState } from "react"
import { equipos as equiposStore } from "@/lib/store"
import { Equipo } from "@/lib/types"
import { FRECUENCIAS } from "@/lib/mantencion-utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Package, CalendarDays, MapPin } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { ArchivosField } from "@/components/ui/ArchivosField"

const empty = (): Omit<Equipo, "id" | "creadoEn"> => ({
  nombre: "", numeroSerie: "", tipo: "preventivo", marca: "", modelo: "",
  ubicacion: "", frecuencia: "ninguna", activo: true, notas: "",
  planos: [], instructivos: [], fichasTecnicas: [], insumos: [], informes: [],
})

export default function EquiposPage() {
  const [lista, setLista] = useState<Equipo[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Equipo | null>(null)
  const [form, setForm] = useState(empty())

  const cargar = () => setLista(equiposStore.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(e?: Equipo) {
    if (e) { setEditando(e); const { id, creadoEn, ...r } = e; setForm({ ...empty(), ...r }) }
    else { setEditando(null); setForm(empty()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.nombre.trim()) { alert("El nombre del equipo es obligatorio."); return }
    if (editando) equiposStore.update(editando.id, form)
    else equiposStore.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar equipo?")) return
    equiposStore.delete(id); cargar()
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Activos", value: lista.filter(e => e.activo).length, color: "#059669" },
  ]

  return (
    <PageShell
      icon={Package}
      title="Equipos"
      subtitle="Registro de equipos para mantención"
      color="#0891b2"
      stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Equipo</button>}
    >
      <div className="glass-section overflow-hidden">
        {lista.length === 0 ? (
          <div className="empty-state"><Package size={40} /><p>No hay equipos. Agrega el primero para usarlo en Mantención.</p></div>
        ) : (
          lista.map((e, i) => (
            <div key={e.id} className="group"
              style={{ borderBottom: i < lista.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", padding: "14px 16px" }}
              onMouseEnter={ev => (ev.currentTarget.style.background = "rgba(0,0,0,0.025)")}
              onMouseLeave={ev => (ev.currentTarget.style.background = "transparent")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{e.nombre}</span>
                    {e.numeroSerie && <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>#{e.numeroSerie}</span>}
                    {!e.activo && <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#fef2f2", color: "#dc2626" }}>Inactivo</span>}
                  </div>
                  <div className="flex gap-4 text-xs flex-wrap" style={{ color: "var(--muted-foreground)" }}>
                    {(e.marca || e.modelo) && <span>{[e.marca, e.modelo].filter(Boolean).join(" ")}</span>}
                    {e.ubicacion && <span className="flex items-center gap-1"><MapPin size={11} />{e.ubicacion}</span>}
                    {e.proximaMantencion && <span className="flex items-center gap-1"><CalendarDays size={11} />Próxima: <strong style={{ color: "#f59e0b" }}>{e.proximaMantencion}</strong></span>}
                  </div>
                  {e.notas && <p className="text-xs mt-1.5 italic" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>{e.notas}</p>}
                </div>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(e)}><Pencil size={13} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(e.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Equipo" : "Nuevo Equipo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => set("nombre", e.target.value)} placeholder="Ej: Cañón nebulizador 01" /></div>
              <div className="space-y-1"><Label>N° Serie</Label><Input value={form.numeroSerie ?? ""} onChange={e => set("numeroSerie", e.target.value)} placeholder="SN-0001" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Marca</Label><Input value={form.marca ?? ""} onChange={e => set("marca", e.target.value)} /></div>
              <div className="space-y-1"><Label>Modelo</Label><Input value={form.modelo ?? ""} onChange={e => set("modelo", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Ubicación</Label><Input value={form.ubicacion ?? ""} onChange={e => set("ubicacion", e.target.value)} placeholder="Faena / sitio" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Frecuencia de mantención</Label>
                <Select value={form.frecuencia ?? "ninguna"} onValueChange={v => set("frecuencia", v ?? "ninguna")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FRECUENCIAS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.activo ? "si" : "no"} onValueChange={v => setForm(f => ({ ...f, activo: v === "si" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="si">Activo</SelectItem>
                    <SelectItem value="no">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={form.notas ?? ""} onChange={e => set("notas", e.target.value)} rows={2} /></div>
            <div className="pt-2 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="text-xs font-semibold mb-2" style={{ color: "var(--muted-foreground)" }}>ARCHIVOS DEL EQUIPO</div>
              <div className="space-y-3">
                <div className="space-y-1"><Label>Planos</Label><ArchivosField archivos={form.planos ?? []} onChange={a => setForm(f => ({ ...f, planos: a }))} /></div>
                <div className="space-y-1"><Label>Instructivos</Label><ArchivosField archivos={form.instructivos ?? []} onChange={a => setForm(f => ({ ...f, instructivos: a }))} /></div>
                <div className="space-y-1"><Label>Fichas técnicas</Label><ArchivosField archivos={form.fichasTecnicas ?? []} onChange={a => setForm(f => ({ ...f, fichasTecnicas: a }))} /></div>
                <div className="space-y-1"><Label>Insumos</Label><ArchivosField archivos={form.insumos ?? []} onChange={a => setForm(f => ({ ...f, insumos: a }))} /></div>
                <div className="space-y-1"><Label>Informes</Label><ArchivosField archivos={form.informes ?? []} onChange={a => setForm(f => ({ ...f, informes: a }))} /></div>
              </div>
            </div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Registrar equipo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
