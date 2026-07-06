"use client"

import { useEffect, useState } from "react"
import { nodos } from "@/lib/store"
import { Nodo, EstadoNodo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Radio, User, Calendar } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { SelectEquipo } from "@/components/ui/SelectEquipo"
import { SelectUsuario } from "@/components/ui/SelectUsuario"

const estadoCfg: Record<EstadoNodo, { label: string; color: string }> = {
  activo:     { label: "Activo",     color: "#059669" },
  suspendido: { label: "Suspendido", color: "#d97706" },
  vencido:    { label: "Vencido",    color: "#dc2626" },
}

function emptyForm(): Omit<Nodo, "id" | "creadoEn"> {
  return { equipo: "", numeroSerie: "", numeroSim: "", cliente: "", fechaInicio: new Date().toISOString().slice(0, 10), fechaTermino: "", responsable: "", estado: "activo", observaciones: "" }
}

const diasRestantes = (fecha?: string) => fecha ? Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000) : null

export default function NodosPage() {
  const [lista, setLista] = useState<Nodo[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Nodo | null>(null)
  const [form, setForm] = useState(emptyForm())
  const cargar = () => setLista(nodos.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])
  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function abrir(n?: Nodo) {
    if (n) { setEditando(n); const { id, creadoEn, ...r } = n; void id; void creadoEn; setForm({ ...emptyForm(), ...r }) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }
  function guardar() {
    if (!form.equipo.trim()) { alert("Selecciona un equipo."); return }
    if (editando) nodos.update(editando.id, form); else nodos.add(form)
    cargar(); setOpen(false)
  }
  function eliminar(id: string) { if (confirm("¿Eliminar este nodo?")) { nodos.delete(id); cargar() } }

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Activos", value: lista.filter(n => n.estado === "activo").length, color: "#059669" },
    { label: "Por vencer (7d)", value: lista.filter(n => { const d = diasRestantes(n.fechaTermino); return n.estado === "activo" && d !== null && d <= 7 }).length, color: "#d97706" },
  ]

  return (
    <PageShell icon={Radio} title="Nodos" subtitle="Servicio SIM de equipos: inicio, término y alertas" color="#0369A1" stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Nodo</button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {lista.length === 0 && <div className="col-span-3 empty-state glass-section"><Radio size={40} /><p>No hay nodos registrados</p></div>}
        {lista.map(n => {
          const est = estadoCfg[n.estado]
          const d = diasRestantes(n.fechaTermino)
          const alerta = n.estado === "activo" && d !== null && d <= 7
          return (
            <div key={n.id} className="glass-card p-4 group" style={alerta ? { borderColor: d! < 0 ? "#dc2626" : "#d97706" } : undefined}>
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{n.equipo}</div>
                  {n.cliente && <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{n.cliente}</div>}
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>{est.label}</span>
              </div>
              <div className="text-xs space-y-1" style={{ color: "var(--muted-foreground)" }}>
                {n.numeroSim && <div>SIM: {n.numeroSim}</div>}
                {n.numeroSerie && <div>N° Serie: {n.numeroSerie}</div>}
                <div className="flex items-center gap-1"><Calendar size={11} />{n.fechaInicio || "—"} → {n.fechaTermino || "—"}</div>
                {d !== null && n.estado === "activo" && (
                  <div style={{ color: d < 0 ? "#dc2626" : d <= 7 ? "#d97706" : "var(--muted-foreground)", fontWeight: alerta ? 600 : 400 }}>
                    {d < 0 ? `Servicio vencido hace ${Math.abs(d)} día(s)` : d === 0 ? "Vence HOY" : `Faltan ${d} día(s)`}
                  </div>
                )}
                {n.responsable && <div className="flex items-center gap-1"><User size={11} />{n.responsable}</div>}
              </div>
              <div className="flex gap-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(n)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(n.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Nodo" : "Nuevo Nodo"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Equipo *</Label>
              <SelectEquipo value={form.equipo} onChange={v => setS("equipo", v)} onSelectEquipo={eq => setS("numeroSerie", eq?.numeroSerie ?? "")} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>N° Serie</Label><Input value={form.numeroSerie ?? ""} onChange={e => setS("numeroSerie", e.target.value)} placeholder="Se completa al elegir el equipo" /></div>
              <div className="space-y-1"><Label>N° SIM</Label><Input value={form.numeroSim ?? ""} onChange={e => setS("numeroSim", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Cliente</Label><Input value={form.cliente ?? ""} onChange={e => setS("cliente", e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Inicio de servicio</Label><Input type="date" value={form.fechaInicio ?? ""} onChange={e => setS("fechaInicio", e.target.value)} /></div>
              <div className="space-y-1"><Label>Término de servicio</Label><Input type="date" value={form.fechaTermino ?? ""} onChange={e => setS("fechaTermino", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Responsable (recibe alertas)</Label><SelectUsuario value={form.responsable ?? ""} onChange={v => setS("responsable", v)} /></div>
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setS("estado", v ?? "activo")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(estadoCfg) as EstadoNodo[]).map(k => <SelectItem key={k} value={k}>{estadoCfg[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear nodo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
