"use client"

import { useEffect, useState } from "react"
import { licitaciones } from "@/lib/store"
import { Licitacion, EstadoLicitacion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Gavel, FileText, ExternalLink } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { ArchivosField } from "@/components/ui/ArchivosField"

const estadoCfg: Record<EstadoLicitacion, { label: string; color: string }> = {
  en_estudio:     { label: "En estudio",     color: "#64748b" },
  en_preparacion: { label: "En preparación", color: "#d97706" },
  presentada:     { label: "Presentada",     color: "#2563eb" },
  adjudicada:     { label: "Adjudicada",     color: "#059669" },
  no_adjudicada:  { label: "No adjudicada",  color: "#dc2626" },
  desierta:       { label: "Desierta",       color: "#94a3b8" },
}

function emptyForm(): Omit<Licitacion, "id" | "creadoEn"> {
  return { nombre: "", organismo: "", numero: "", fechaPublicacion: "", fechaCierre: "", monto: undefined, estado: "en_estudio", archivos: [], enlace: "", observaciones: "" }
}

const fmtMonto = (n?: number) => n == null ? "" : "$" + n.toLocaleString("es-CL")

export default function LicitacionesPage() {
  const [lista, setLista] = useState<Licitacion[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Licitacion | null>(null)
  const [form, setForm] = useState(emptyForm())
  const cargar = () => setLista(licitaciones.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])
  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function abrir(l?: Licitacion) {
    if (l) { setEditando(l); const { id, creadoEn, ...r } = l; void id; void creadoEn; setForm({ ...emptyForm(), ...r }) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }
  function guardar() {
    if (!form.nombre.trim()) { alert("El nombre de la licitación es obligatorio."); return }
    if (editando) licitaciones.update(editando.id, form); else licitaciones.add(form)
    cargar(); setOpen(false)
  }
  function eliminar(id: string) { if (confirm("¿Eliminar esta licitación?")) { licitaciones.delete(id); cargar() } }

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Presentadas", value: lista.filter(l => l.estado === "presentada").length, color: "#2563eb" },
    { label: "Adjudicadas", value: lista.filter(l => l.estado === "adjudicada").length, color: "#059669" },
  ]

  return (
    <PageShell icon={Gavel} title="Licitaciones" subtitle="Propuestas, plazos y adjudicaciones" color="#4F46E5" stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Licitación</button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {lista.length === 0 && <div className="col-span-3 empty-state glass-section"><Gavel size={40} /><p>No hay licitaciones registradas</p></div>}
        {lista.map(l => {
          const est = estadoCfg[l.estado]
          return (
            <div key={l.id} className="glass-card p-4 group">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{l.nombre}</div>
                  {l.organismo && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{l.organismo}</div>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>{est.label}</span>
              </div>
              <div className="text-xs space-y-1" style={{ color: "var(--muted-foreground)" }}>
                {l.numero && <div>N°: {l.numero}</div>}
                {l.fechaCierre && <div>Cierre: {l.fechaCierre}</div>}
                {l.monto != null && <div>Monto: {fmtMonto(l.monto)}</div>}
              </div>
              {l.archivos && l.archivos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {l.archivos.map((a, i) => <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:underline truncate" style={{ color: "#4F46E5" }}><FileText size={11} className="shrink-0" />{a.nombre}</a>)}
                </div>
              )}
              {l.enlace && <a href={l.enlace} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs hover:underline" style={{ color: "#4F46E5" }}><ExternalLink size={11} />Enlace</a>}
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(l)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(l.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Licitación" : "Nueva Licitación"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Nombre de la licitación *</Label><Input value={form.nombre} onChange={e => setS("nombre", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Organismo</Label><Input value={form.organismo ?? ""} onChange={e => setS("organismo", e.target.value)} /></div>
              <div className="space-y-1"><Label>N° / ID</Label><Input value={form.numero ?? ""} onChange={e => setS("numero", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha publicación</Label><Input type="date" value={form.fechaPublicacion ?? ""} onChange={e => setS("fechaPublicacion", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha cierre</Label><Input type="date" value={form.fechaCierre ?? ""} onChange={e => setS("fechaCierre", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Monto estimado</Label><Input type="number" value={form.monto ?? ""} onChange={e => setS("monto", e.target.value ? Number(e.target.value) : undefined)} /></div>
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "en_estudio")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{(Object.keys(estadoCfg) as EstadoLicitacion[]).map(k => <SelectItem key={k} value={k}>{estadoCfg[k].label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>Archivos adjuntos</Label><ArchivosField archivos={form.archivos ?? []} onChange={a => setS("archivos", a)} /></div>
            <div className="space-y-1"><Label>Enlace (Mercado Público, etc.)</Label><Input value={form.enlace ?? ""} onChange={e => setS("enlace", e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear licitación"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
