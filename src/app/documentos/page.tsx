"use client"

import { useEffect, useState } from "react"
import { documentosAdmin } from "@/lib/store"
import { DocumentoAdmin, EstadoDocumento } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, FolderOpen, FileText, ExternalLink } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { ArchivosField } from "@/components/ui/ArchivosField"

const estadoCfg: Record<EstadoDocumento, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "#d97706" },
  presentado: { label: "Presentado", color: "#2563eb" },
  aprobado:   { label: "Aprobado",   color: "#059669" },
  rechazado:  { label: "Rechazado",  color: "#dc2626" },
}

function emptyForm(): Omit<DocumentoAdmin, "id" | "creadoEn"> {
  return { nombre: "", tipo: "", entidad: "", fecha: new Date().toISOString().slice(0, 10), estado: "pendiente", responsable: "", archivos: [], enlace: "", observaciones: "" }
}

export default function DocumentosPage() {
  const [lista, setLista] = useState<DocumentoAdmin[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<DocumentoAdmin | null>(null)
  const [form, setForm] = useState(emptyForm())
  const cargar = () => setLista(documentosAdmin.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])
  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function abrir(d?: DocumentoAdmin) {
    if (d) { setEditando(d); const { id, creadoEn, ...r } = d; void id; void creadoEn; setForm({ ...emptyForm(), ...r }) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }
  function guardar() {
    if (!form.nombre.trim()) { alert("El nombre es obligatorio."); return }
    if (editando) documentosAdmin.update(editando.id, form); else documentosAdmin.add(form)
    cargar(); setOpen(false)
  }
  function eliminar(id: string) { if (confirm("¿Eliminar este documento?")) { documentosAdmin.delete(id); cargar() } }

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Pendientes", value: lista.filter(d => d.estado === "pendiente").length, color: "#d97706" },
    { label: "Presentados", value: lista.filter(d => d.estado === "presentado").length, color: "#2563eb" },
  ]

  return (
    <PageShell icon={FolderOpen} title="Presentación de Documentos" subtitle="Documentos administrativos y su estado" color="#4F46E5" stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Documento</button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {lista.length === 0 && <div className="col-span-3 empty-state glass-section"><FolderOpen size={40} /><p>No hay documentos registrados</p></div>}
        {lista.map(d => {
          const est = estadoCfg[d.estado]
          return (
            <div key={d.id} className="glass-card p-4 group">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{d.nombre}</div>
                  {d.entidad && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{d.entidad}</div>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>{est.label}</span>
              </div>
              <div className="text-xs space-y-1" style={{ color: "var(--muted-foreground)" }}>
                {d.fecha && <div>Fecha: {d.fecha}</div>}
                {d.responsable && <div>Responsable: {d.responsable}</div>}
              </div>
              {d.archivos && d.archivos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {d.archivos.map((a, i) => <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs hover:underline truncate" style={{ color: "#4F46E5" }}><FileText size={11} className="shrink-0" />{a.nombre}</a>)}
                </div>
              )}
              {d.enlace && <a href={d.enlace} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-1 text-xs hover:underline" style={{ color: "#4F46E5" }}><ExternalLink size={11} />Enlace</a>}
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(d)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(d.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Documento" : "Nuevo Documento"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Nombre del documento *</Label><Input value={form.nombre} onChange={e => setS("nombre", e.target.value)} placeholder="Ej. Certificado de vigencia" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Tipo</Label><Input value={form.tipo ?? ""} onChange={e => setS("tipo", e.target.value)} placeholder="Certificado, carta…" /></div>
              <div className="space-y-1"><Label>Entidad / Destinatario</Label><Input value={form.entidad ?? ""} onChange={e => setS("entidad", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.fecha ?? ""} onChange={e => setS("fecha", e.target.value)} /></div>
              <div className="space-y-1"><Label>Responsable</Label><Input value={form.responsable ?? ""} onChange={e => setS("responsable", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setS("estado", v ?? "pendiente")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(estadoCfg) as EstadoDocumento[]).map(k => <SelectItem key={k} value={k}>{estadoCfg[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Archivos adjuntos</Label><ArchivosField archivos={form.archivos ?? []} onChange={a => setS("archivos", a)} /></div>
            <div className="space-y-1"><Label>Enlace (opcional)</Label><Input value={form.enlace ?? ""} onChange={e => setS("enlace", e.target.value)} placeholder="https://…" /></div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear documento"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
