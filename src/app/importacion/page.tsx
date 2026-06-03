"use client"

import { useEffect, useState } from "react"
import { importaciones } from "@/lib/store"
import { Importacion, EstadoImportacion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Ship } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const estados: { value: EstadoImportacion; label: string; color: string; bg: string }[] = [
  { value: "solicitado",  label: "Solicitado",  color: "#94a3b8", bg: "rgba(148,163,184,0.1)" },
  { value: "en_transito", label: "En tránsito", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  { value: "en_aduana",   label: "En aduana",   color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  { value: "recibido",    label: "Recibido",    color: "#0891b2", bg: "rgba(45,212,191,0.1)" },
  { value: "distribuido", label: "Distribuido", color: "#16a34a", bg: "rgba(74,222,128,0.1)" },
]
const estadoMap = Object.fromEntries(estados.map(e => [e.value, e]))

const empty = (): Omit<Importacion, "id" | "creadoEn"> => ({
  proveedor: "", paisOrigen: "", descripcion: "", items: "", cantidad: 1,
  fechaSolicitud: new Date().toISOString().slice(0, 10),
  fechaEstimada: "", fechaRecepcion: "", estado: "solicitado",
  numeroTracking: "", documentos: "", costoTotal: undefined,
  responsable: "", notas: "",
})

export default function ImportacionPage() {
  const [lista, setLista] = useState<Importacion[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Importacion | null>(null)
  const [form, setForm] = useState(empty())
  const [filtro, setFiltro] = useState<EstadoImportacion | "todos">("todos")

  const cargar = () => setLista(importaciones.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(i?: Importacion) {
    if (i) { setEditando(i); const { id, creadoEn, ...r } = i; setForm(r) }
    else { setEditando(null); setForm(empty()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.proveedor || !form.descripcion || !form.responsable) return
    editando ? importaciones.update(editando.id, form) : importaciones.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    importaciones.delete(id); cargar()
  }

  const setS = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const setN = (k: string, v: number) => setForm(f => ({ ...f, [k]: v }))
  const filtrada = filtro === "todos" ? lista : lista.filter(i => i.estado === filtro)

  const importStats = [
    { label: "Total", value: lista.length },
    { label: "En tránsito", value: lista.filter(i => i.estado === "en_transito").length, color: "#22d3ee" },
    { label: "En aduana", value: lista.filter(i => i.estado === "en_aduana").length, color: "#fbbf24" },
    { label: "Recibidas", value: lista.filter(i => i.estado === "recibido").length, color: "#0891b2" },
  ]

  return (
    <PageShell
      icon={Ship}
      title="Importación"
      subtitle="Seguimiento de importaciones de equipos y accesorios"
      color="#22d3ee"
      stats={importStats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Importación</button>}
    >
      {/* Filtros */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        <button className={`filter-pill${filtro === "todos" ? " active" : ""}`} onClick={() => setFiltro("todos")}>
          Todos ({lista.length})
        </button>
        {estados.map(e => (
          <button key={e.value} className={`filter-pill${filtro === e.value ? " active" : ""}`} onClick={() => setFiltro(e.value)}>
            {e.label} ({lista.filter(i => i.estado === e.value).length})
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Importación" : "Nueva Importación"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Proveedor *</Label><Input value={form.proveedor} onChange={e => setS("proveedor", e.target.value)} /></div>
              <div className="space-y-1"><Label>País origen</Label><Input value={form.paisOrigen} onChange={e => setS("paisOrigen", e.target.value)} placeholder="China, USA..." /></div>
            </div>
            <div className="space-y-1"><Label>Descripción *</Label><Textarea value={form.descripcion} onChange={e => setS("descripcion", e.target.value)} rows={2} /></div>
            <div className="space-y-1"><Label>Items / Detalle</Label><Textarea value={form.items} onChange={e => setS("items", e.target.value)} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cantidad</Label><Input type="number" min={1} value={form.cantidad} onChange={e => setN("cantidad", Number(e.target.value))} /></div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "solicitado")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{estados.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1"><Label>N° Tracking</Label><Input value={form.numeroTracking ?? ""} onChange={e => setS("numeroTracking", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha solicitud</Label><Input type="date" value={form.fechaSolicitud} onChange={e => setS("fechaSolicitud", e.target.value)} /></div>
              <div className="space-y-1"><Label>Fecha estimada</Label><Input type="date" value={form.fechaEstimada ?? ""} onChange={e => setS("fechaEstimada", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha recepción</Label><Input type="date" value={form.fechaRecepcion ?? ""} onChange={e => setS("fechaRecepcion", e.target.value)} /></div>
              <div className="space-y-1"><Label>Costo total (USD)</Label><Input type="number" value={form.costoTotal ?? ""} onChange={e => setN("costoTotal", Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1"><Label>Documentos</Label><Input value={form.documentos ?? ""} onChange={e => setS("documentos", e.target.value)} placeholder="N° factura, guía despacho..." /></div>
            <div className="space-y-1"><Label>Responsable *</Label><Input value={form.responsable} onChange={e => setS("responsable", e.target.value)} /></div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={form.notas ?? ""} onChange={e => setS("notas", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Registrar importación"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-2">
        {filtrada.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No hay importaciones registradas.</div>
        )}
        {filtrada.map(imp => {
          const est = estadoMap[imp.estado]
          return (
            <div
              key={imp.id}
              className="rounded-xl p-4 transition-all hover:scale-[1.005]"
              style={{ background: "var(--card)", border: "1px solid var(--border)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold" style={{ color: "var(--foreground)" }}>{imp.proveedor}</span>
                    {imp.paisOrigen && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>{imp.paisOrigen}</span>
                    )}
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: est.bg, color: est.color }}>{est.label}</span>
                  </div>
                  <p className="text-sm mb-1" style={{ color: "var(--muted-foreground)" }}>{imp.descripcion}</p>
                  {imp.items && <p className="text-xs mb-1 whitespace-pre-line" style={{ color: "var(--muted-foreground)" }}>{imp.items}</p>}
                  {imp.numeroTracking && (
                    <p className="text-xs mb-1">
                      <span style={{ color: "var(--muted-foreground)" }}>Tracking: </span>
                      <strong className="font-mono" style={{ color: "#22d3ee" }}>{imp.numeroTracking}</strong>
                    </p>
                  )}
                  <div className="flex gap-4 text-xs flex-wrap" style={{ color: "var(--muted-foreground)" }}>
                    <span>Resp: <strong style={{ color: "var(--foreground)" }}>{imp.responsable}</strong></span>
                    <span>Solicitud: {imp.fechaSolicitud}</span>
                    {imp.fechaEstimada && <span>Estimada: {imp.fechaEstimada}</span>}
                    {imp.fechaRecepcion && <span>Recepción: {imp.fechaRecepcion}</span>}
                    {imp.costoTotal && <span style={{ color: "#fbbf24" }}>USD {imp.costoTotal.toLocaleString()}</span>}
                  </div>
                  {imp.documentos && <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>Docs: {imp.documentos}</p>}
                  {imp.notas && <p className="text-xs mt-1 italic" style={{ color: "var(--muted-foreground)" }}>{imp.notas}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100" onClick={() => abrir(imp)}><Pencil size={14} /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-50 hover:opacity-100 text-red-400" onClick={() => eliminar(imp.id)}><Trash2 size={14} /></Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </PageShell>
  )
}
