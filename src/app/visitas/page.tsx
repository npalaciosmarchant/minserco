"use client"

import { useEffect, useState } from "react"
import { visitasTecnicas } from "@/lib/store"
import { VisitaTecnica, EstadoAgenda } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, MapPin, User } from "lucide-react"
import { SelectTecnico } from "@/components/ui/SelectTecnico"
import PageShell from "@/components/layout/PageShell"
import { AgendaVista } from "@/components/ui/AgendaVista"

const estadoCfg: Record<EstadoAgenda, { label: string; color: string }> = {
  programada: { label: "Programada", color: "#4F46E5" },
  realizada:  { label: "Realizada",  color: "#059669" },
  cancelada:  { label: "Cancelada",  color: "#dc2626" },
}

function emptyForm(): Omit<VisitaTecnica, "id" | "creadoEn"> {
  return { cliente: "", fecha: new Date().toISOString().slice(0, 10), hora: "", direccion: "", tecnico: "", motivo: "", estado: "programada", observaciones: "" }
}

export default function VisitasPage() {
  const [lista, setLista] = useState<VisitaTecnica[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<VisitaTecnica | null>(null)
  const [form, setForm] = useState(emptyForm())
  const cargar = () => setLista(visitasTecnicas.getAll())
  useEffect(() => { cargar() }, [])
  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function abrir(v?: VisitaTecnica) {
    if (v) { setEditando(v); const { id, creadoEn, ...rest } = v; void id; void creadoEn; setForm({ ...emptyForm(), ...rest }) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }
  function guardar() {
    if (!form.cliente.trim()) { alert("El cliente es obligatorio."); return }
    if (editando) visitasTecnicas.update(editando.id, form); else visitasTecnicas.add(form)
    cargar(); setOpen(false)
  }
  function eliminar(id: string) { if (confirm("¿Eliminar esta visita?")) { visitasTecnicas.delete(id); cargar() } }

  const items = lista.map(v => ({ ...v, titulo: v.cliente, color: estadoCfg[v.estado].color }))

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Programadas", value: lista.filter(v => v.estado === "programada").length, color: "#4F46E5" },
    { label: "Realizadas", value: lista.filter(v => v.estado === "realizada").length, color: "#059669" },
  ]

  return (
    <PageShell icon={MapPin} title="Agenda de Visitas Técnicas" subtitle="Visitas a terreno programadas y realizadas" color="#4F46E5" stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Visita</button>}>
      <AgendaVista
        items={items}
        onItemClick={v => abrir(v)}
        onDayClick={f => { setEditando(null); setForm({ ...emptyForm(), fecha: f }); setOpen(true) }}
        renderCard={v => {
          const est = estadoCfg[v.estado]
          return (
            <div className="glass-card p-4 group">
              <div className="flex items-start justify-between mb-1">
                <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{v.cliente}</div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>{est.label}</span>
              </div>
              <div className="text-xs space-y-0.5" style={{ color: "var(--muted-foreground)" }}>
                <div>{v.fecha}{v.hora ? ` · ${v.hora}` : ""}</div>
                {v.direccion && <div className="flex items-center gap-1"><MapPin size={11} />{v.direccion}</div>}
                {v.tecnico && <div className="flex items-center gap-1"><User size={11} />{v.tecnico}</div>}
                {v.motivo && <div>Motivo: {v.motivo}</div>}
              </div>
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(v)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(v.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
          )
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Visita" : "Nueva Visita Técnica"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Cliente *</Label><Input value={form.cliente} onChange={e => setS("cliente", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.fecha ?? ""} onChange={e => setS("fecha", e.target.value)} /></div>
              <div className="space-y-1"><Label>Hora</Label><Input type="time" value={form.hora ?? ""} onChange={e => setS("hora", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Dirección</Label><Input value={form.direccion ?? ""} onChange={e => setS("direccion", e.target.value)} /></div>
            <div className="space-y-1"><Label>Técnico a cargo</Label><SelectTecnico value={form.tecnico ?? ""} onChange={v => setS("tecnico", v)} /></div>
            <div className="space-y-1"><Label>Motivo</Label><Input value={form.motivo ?? ""} onChange={e => setS("motivo", e.target.value)} /></div>
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setS("estado", v ?? "programada")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(estadoCfg) as EstadoAgenda[]).map(k => <SelectItem key={k} value={k}>{estadoCfg[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear visita"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
