"use client"

import { useEffect, useState } from "react"
import { reuniones } from "@/lib/store"
import { Reunion, EstadoAgenda } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, CalendarClock, MapPin } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { AgendaVista } from "@/components/ui/AgendaVista"

const estadoCfg: Record<EstadoAgenda, { label: string; color: string }> = {
  programada: { label: "Programada", color: "#4F46E5" },
  realizada:  { label: "Realizada",  color: "#059669" },
  cancelada:  { label: "Cancelada",  color: "#dc2626" },
}

function emptyForm(): Omit<Reunion, "id" | "creadoEn"> {
  return { titulo: "", fecha: new Date().toISOString().slice(0, 10), hora: "", lugar: "", participantes: "", tema: "", notas: "", estado: "programada" }
}

export default function ReunionesPage() {
  const [lista, setLista] = useState<Reunion[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Reunion | null>(null)
  const [form, setForm] = useState(emptyForm())
  const cargar = () => setLista(reuniones.getAll())
  useEffect(() => { cargar() }, [])
  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function abrir(r?: Reunion) {
    if (r) { setEditando(r); const { id, creadoEn, ...rest } = r; void id; void creadoEn; setForm({ ...emptyForm(), ...rest }) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }
  function guardar() {
    if (!form.titulo.trim()) { alert("El título es obligatorio."); return }
    if (editando) reuniones.update(editando.id, form); else reuniones.add(form)
    cargar(); setOpen(false)
  }
  function eliminar(id: string) { if (confirm("¿Eliminar esta reunión?")) { reuniones.delete(id); cargar() } }

  const items = lista.map(r => ({ ...r, color: estadoCfg[r.estado].color }))

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Programadas", value: lista.filter(r => r.estado === "programada").length, color: "#4F46E5" },
    { label: "Realizadas", value: lista.filter(r => r.estado === "realizada").length, color: "#059669" },
  ]

  return (
    <PageShell icon={CalendarClock} title="Agenda de Reuniones" subtitle="Reuniones, participantes y actas" color="#4F46E5" stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Reunión</button>}>
      <AgendaVista
        items={items}
        onItemClick={r => abrir(r)}
        onDayClick={f => { setEditando(null); setForm({ ...emptyForm(), fecha: f }); setOpen(true) }}
        renderCard={r => {
          const est = estadoCfg[r.estado]
          return (
            <div className="glass-card p-4 group">
              <div className="flex items-start justify-between mb-1">
                <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{r.titulo}</div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>{est.label}</span>
              </div>
              <div className="text-xs space-y-0.5" style={{ color: "var(--muted-foreground)" }}>
                <div>{r.fecha}{r.hora ? ` · ${r.hora}` : ""}</div>
                {r.lugar && <div className="flex items-center gap-1"><MapPin size={11} />{r.lugar}</div>}
                {r.participantes && <div>Participantes: {r.participantes}</div>}
                {r.tema && <div>Tema: {r.tema}</div>}
              </div>
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(r)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(r.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
          )
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Reunión" : "Nueva Reunión"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Título *</Label><Input value={form.titulo} onChange={e => setS("titulo", e.target.value)} placeholder="Ej. Reunión de coordinación" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.fecha ?? ""} onChange={e => setS("fecha", e.target.value)} /></div>
              <div className="space-y-1"><Label>Hora</Label><Input type="time" value={form.hora ?? ""} onChange={e => setS("hora", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Lugar</Label><Input value={form.lugar ?? ""} onChange={e => setS("lugar", e.target.value)} placeholder="Oficina, videollamada…" /></div>
            <div className="space-y-1"><Label>Participantes</Label><Input value={form.participantes ?? ""} onChange={e => setS("participantes", e.target.value)} placeholder="Nombres separados por coma" /></div>
            <div className="space-y-1"><Label>Tema</Label><Input value={form.tema ?? ""} onChange={e => setS("tema", e.target.value)} /></div>
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setS("estado", v ?? "programada")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(estadoCfg) as EstadoAgenda[]).map(k => <SelectItem key={k} value={k}>{estadoCfg[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Notas / Acta</Label><Textarea value={form.notas ?? ""} onChange={e => setS("notas", e.target.value)} rows={3} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear reunión"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
