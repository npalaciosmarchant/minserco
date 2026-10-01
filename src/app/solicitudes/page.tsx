"use client"

import { useEffect, useState } from "react"
import { solicitudes, bodega } from "@/lib/store"
import { Solicitud, CategoriaSolicitud, UrgenciaSolicitud, EstadoSolicitud, ItemBodega } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ClipboardList, CheckCircle2, Clock, XCircle, AlertTriangle, Package, User, CalendarDays } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { SelectUsuario } from "@/components/ui/SelectUsuario"

const CATEGORIAS: { value: CategoriaSolicitud; label: string }[] = [
  { value: "material", label: "Material" },
  { value: "insumo", label: "Insumo" },
  { value: "epp", label: "EPP" },
  { value: "herramienta", label: "Herramienta" },
  { value: "otro", label: "Otro" },
]

const URGENCIAS: { value: UrgenciaSolicitud; label: string; color: string }[] = [
  { value: "baja", label: "Baja", color: "#64748b" },
  { value: "media", label: "Media", color: "#d97706" },
  { value: "alta", label: "Alta", color: "#dc2626" },
]

const ESTADOS: { value: EstadoSolicitud; label: string; color: string; icon: React.ElementType }[] = [
  { value: "pendiente", label: "Pendiente", color: "#d97706", icon: Clock },
  { value: "atendida", label: "Atendida", color: "#059669", icon: CheckCircle2 },
  { value: "rechazada", label: "Rechazada", color: "#dc2626", icon: XCircle },
]
const estadoCfg = Object.fromEntries(ESTADOS.map(e => [e.value, e]))
const categoriaLabel = Object.fromEntries(CATEGORIAS.map(c => [c.value, c.label]))
const urgenciaCfg = Object.fromEntries(URGENCIAS.map(u => [u.value, u]))

function empty(nombre: string): Omit<Solicitud, "id" | "creadoEn"> {
  return {
    fecha: new Date().toISOString().slice(0, 10),
    solicitante: nombre, categoria: "material", item: "", itemBodegaId: "",
    cantidad: 1, unidad: "", urgencia: "media", motivo: "", estado: "pendiente", observaciones: "",
  }
}

export default function SolicitudesPage() {
  const { user } = useAuth()
  const esAdmin = user?.rol === "admin"
  const [lista, setLista] = useState<Solicitud[]>([])
  const [itemsBodega, setItemsBodega] = useState<ItemBodega[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Solicitud | null>(null)
  const [form, setForm] = useState(empty(user?.nombre ?? ""))
  const [filtro, setFiltro] = useState<"todos" | EstadoSolicitud>("todos")

  const cargar = () => {
    setLista(solicitudes.getAll().slice().reverse())
    setItemsBodega(bodega.getAll())
  }
  useEffect(() => { cargar() }, [])

  function abrir(s?: Solicitud) {
    if (s) { setEditando(s); const { id, creadoEn, ...r } = s; void id; void creadoEn; setForm(r) }
    else { setEditando(null); setForm(empty(user?.nombre ?? "")) }
    setOpen(true)
  }

  function guardar() {
    if (!form.solicitante.trim() || !form.item.trim()) { alert("Completa el solicitante y el ítem solicitado."); return }
    if (editando) solicitudes.update(editando.id, form); else solicitudes.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("¿Eliminar esta solicitud?")) return
    solicitudes.delete(id); cargar()
  }

  function marcarEstado(s: Solicitud, estado: EstadoSolicitud) {
    solicitudes.update(s.id, { estado, atendidoPor: user?.nombre, atendidoEn: new Date().toISOString() })
    cargar()
  }

  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function elegirDeBodega(itemId: string) {
    const it = itemsBodega.find(i => i.id === itemId)
    setForm(f => ({ ...f, itemBodegaId: itemId, item: it ? it.nombre : f.item, unidad: it?.unidad ?? f.unidad }))
  }

  const filtradas = filtro === "todos" ? lista : lista.filter(s => s.estado === filtro)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Pendientes", value: lista.filter(s => s.estado === "pendiente").length, color: "#d97706" },
    { label: "Atendidas", value: lista.filter(s => s.estado === "atendida").length, color: "#059669" },
    { label: "Urgentes (pend.)", value: lista.filter(s => s.estado === "pendiente" && s.urgencia === "alta").length, color: "#dc2626" },
  ]

  const pills: { id: "todos" | EstadoSolicitud; label: string }[] = [
    { id: "todos", label: `Todas (${lista.length})` },
    { id: "pendiente", label: `Pendientes (${lista.filter(s => s.estado === "pendiente").length})` },
    { id: "atendida", label: `Atendidas (${lista.filter(s => s.estado === "atendida").length})` },
    { id: "rechazada", label: `Rechazadas (${lista.filter(s => s.estado === "rechazada").length})` },
  ]

  return (
    <PageShell
      icon={ClipboardList}
      title="Solicitudes"
      subtitle="Materiales, insumos y EPP solicitados por los trabajadores"
      color="#7c3aed"
      stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Solicitud</button>}
    >
      <div className="flex gap-1.5 flex-wrap mb-5">
        {pills.map(f => (
          <button key={f.id} className={`filter-pill${filtro === f.id ? " active" : ""}`} onClick={() => setFiltro(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtradas.length === 0 && (
          <div className="col-span-3 empty-state glass-section"><ClipboardList size={40} /><p>No hay solicitudes</p></div>
        )}
        {filtradas.map(s => {
          const est = estadoCfg[s.estado]
          const urg = urgenciaCfg[s.urgencia]
          const Icon = est.icon
          return (
            <div key={s.id} className="glass-card p-4 group" style={s.estado === "pendiente" && s.urgencia === "alta" ? { borderColor: "#dc2626" } : undefined}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="font-semibold text-sm truncate" style={{ color: "var(--foreground)" }}>{s.item}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{categoriaLabel[s.categoria]} · {s.cantidad}{s.unidad ? ` ${s.unidad}` : ""}</div>
                </div>
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>
                  <Icon size={10} />{est.label}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                  <User size={10} />{s.solicitante}
                </span>
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                  <CalendarDays size={10} />{s.fecha}
                </span>
                <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium" style={{ background: urg.color + "15", color: urg.color }}>
                  <AlertTriangle size={10} />{urg.label}
                </span>
                {s.itemBodegaId && (
                  <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
                    <Package size={10} />En bodega
                  </span>
                )}
              </div>
              {s.motivo && <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", lineHeight: 1.5 }}>{s.motivo}</p>}
              {s.estado === "atendida" && s.atendidoPor && (
                <p className="text-xs" style={{ color: "#059669" }}>Atendida por {s.atendidoPor}{s.atendidoEn ? ` · ${new Date(s.atendidoEn).toLocaleDateString("es-CL")}` : ""}</p>
              )}
              <div className="flex items-center justify-between mt-3">
                <div className="flex gap-1.5">
                  {esAdmin && s.estado === "pendiente" && (
                    <>
                      <button className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: "#059669", background: "#f0fdf4" }} onClick={() => marcarEstado(s, "atendida")}>
                        Marcar atendida
                      </button>
                      <button className="text-xs font-semibold px-2 py-1 rounded-lg" style={{ color: "#dc2626", background: "#fef2f2" }} onClick={() => marcarEstado(s, "rechazada")}>
                        Rechazar
                      </button>
                    </>
                  )}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(s)}><Pencil size={13} /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(s.id)}><Trash2 size={13} /></Button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Solicitud" : "Nueva Solicitud"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Solicitante *</Label><SelectUsuario value={form.solicitante} onChange={v => setS("solicitante", v)} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Categoría</Label>
                <Select value={form.categoria} onValueChange={v => setS("categoria", v ?? "material")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Urgencia</Label>
                <Select value={form.urgencia} onValueChange={v => setS("urgencia", v ?? "media")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{URGENCIAS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {itemsBodega.length > 0 && (
              <div className="space-y-1"><Label>Elegir desde Bodega (opcional)</Label>
                <select value={form.itemBodegaId ?? ""} onChange={e => elegirDeBodega(e.target.value)} className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none">
                  <option value="">Sin vincular a bodega — ítem nuevo/externo</option>
                  {itemsBodega.map(i => <option key={i.id} value={i.id}>{i.nombre} ({i.cantidad} {i.unidad} disp.)</option>)}
                </select>
              </div>
            )}
            <div className="space-y-1"><Label>Ítem solicitado *</Label><Input value={form.item} onChange={e => setS("item", e.target.value)} placeholder="Ej. Guantes de cuero, filtro de aire…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Cantidad</Label><Input type="number" min={1} value={form.cantidad} onChange={e => setS("cantidad", Number(e.target.value))} /></div>
              <div className="space-y-1"><Label>Unidad</Label><Input value={form.unidad ?? ""} onChange={e => setS("unidad", e.target.value)} placeholder="un., par, caja…" /></div>
            </div>
            <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => setS("fecha", e.target.value)} /></div>
            <div className="space-y-1"><Label>Motivo / para qué se necesita</Label><Textarea value={form.motivo ?? ""} onChange={e => setS("motivo", e.target.value)} rows={2} /></div>
            {editando && (
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "pendiente")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ESTADOS.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => setS("observaciones", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Enviar solicitud"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
