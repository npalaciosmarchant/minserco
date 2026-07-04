"use client"

import { useEffect, useState } from "react"
import { clientesEquipos, ordenesTrabajo } from "@/lib/store"
import { ClienteEquipo, CiudadOficina, TipoEquipoTerreno, EstadoEquipoTerreno, OrdenTrabajo } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, MapPin, Users, Wrench, AlertTriangle, CheckCircle2, Clock, ClipboardList, X, History } from "lucide-react"
import { SelectTecnico } from "@/components/ui/SelectTecnico"
import { SelectEquipo } from "@/components/ui/SelectEquipo"
import PageShell from "@/components/layout/PageShell"
import Link from "next/link"

const ciudades: CiudadOficina[] = ["Copiapó", "La Serena", "Viña del Mar", "Otra"]
const tiposEquipo: { value: TipoEquipoTerreno; label: string }[] = [
  { value: "supresor_polvo", label: "Supresor de Polvo" },
  { value: "nebulizador", label: "Nebulizador" },
  { value: "bomba", label: "Bomba" },
  { value: "compresor", label: "Compresor" },
  { value: "electrovalvula", label: "Electroválvula" },
  { value: "filtro", label: "Filtro" },
  { value: "otro", label: "Otro" },
]
const estados: { value: EstadoEquipoTerreno; label: string; color: string; icon: React.ElementType }[] = [
  { value: "activo", label: "Activo", color: "#0891b2", icon: CheckCircle2 },
  { value: "inactivo", label: "Inactivo", color: "#94a3b8", icon: Clock },
  { value: "en_servicio", label: "En Servicio", color: "#fbbf24", icon: Wrench },
]
const estadoMap = Object.fromEntries(estados.map(e => [e.value, e]))

const empty = (): Omit<ClienteEquipo, "id" | "creadoEn"> => ({
  cliente: "", empresa: "", rut: "", telefono: "", email: "",
  direccion: "", ciudad: "Copiapó",
  equipo: "", codigoEquipo: "", tipoEquipo: "supresor_polvo", numeroSerie: "",
  fechaInstalacion: new Date().toISOString().slice(0, 10),
  garantiaHasta: "", ultimaMantencion: "", proximaMantencion: "",
  tecnicoResponsable: "", estado: "activo", notas: "",
})

function diasHasta(fecha: string): number | null {
  if (!fecha) return null
  return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000)
}

function GarantiaChip({ fecha }: { fecha?: string }) {
  if (!fecha) return null
  const dias = diasHasta(fecha)!
  const vencida = dias < 0
  const proxima = dias >= 0 && dias <= 30
  return (
    <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
      style={{ background: vencida ? "rgba(239,68,68,0.15)" : proxima ? "rgba(251,191,36,0.15)" : "var(--accent)", color: vencida ? "#ef4444" : proxima ? "#fbbf24" : "var(--muted-foreground)" }}>
      {vencida ? `Garantía vencida` : `Garantía: ${dias}d`}
    </span>
  )
}

const OT_ESTADO_COLOR: Record<string, string> = {
  pendiente: "#f59e0b",
  en_progreso: "#60a5fa",
  completada: "#2dd4bf",
  cancelada: "#f87171",
}
const OT_TIPO_LABEL: Record<string, string> = {
  instalacion: "Instalación",
  mantencion_terreno: "Mantención",
  reparacion_terreno: "Reparación",
  inspeccion: "Inspección",
}

function HistorialModal({ equipo, onClose }: { equipo: ClienteEquipo; onClose: () => void }) {
  const ots = ordenesTrabajo.getAll().filter(o =>
    o.cliente.toLowerCase() === equipo.cliente.toLowerCase() ||
    o.empresa?.toLowerCase() === equipo.empresa.toLowerCase()
  ).sort((a, b) => b.creadoEn.localeCompare(a.creadoEn))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[80vh]"
        style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: "var(--foreground)" }}>
              Historial de OTs
            </h2>
            <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>
              {equipo.empresa} — {equipo.equipo}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", background: "var(--accent)" }}>
            <X size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {ots.length === 0 ? (
            <div className="py-12 text-center">
              <ClipboardList size={32} className="mx-auto mb-3 opacity-30" style={{ color: "var(--muted-foreground)" }} />
              <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                No hay órdenes de trabajo asociadas a este cliente
              </p>
            </div>
          ) : ots.map(o => {
            const color = OT_ESTADO_COLOR[o.estado] ?? "#94a3b8"
            return (
              <div key={o.id} className="rounded-xl p-3" style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono font-bold" style={{ color: "var(--foreground)" }}>{o.numero}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: color + "20", color }}>
                        {o.estado.replace("_", " ")}
                      </span>
                    </div>
                    <p className="text-xs font-medium" style={{ color: "var(--foreground)" }}>
                      {OT_TIPO_LABEL[o.tipo] ?? o.tipo}
                    </p>
                    {o.descripcion && (
                      <p className="text-xs mt-0.5 line-clamp-2" style={{ color: "var(--muted-foreground)" }}>
                        {o.descripcion}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                      {new Date(o.creadoEn).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                    </div>
                    {o.tecnico && (
                      <div className="text-xs mt-0.5" style={{ color: "oklch(0.5 0 0)" }}>
                        {o.tecnico}
                      </div>
                    )}
                  </div>
                </div>
                {(o.fechaInicio || o.fechaTermino) && (
                  <div className="flex gap-3 mt-2 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                    {o.fechaInicio && <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Inicio: {o.fechaInicio}</span>}
                    {o.fechaTermino && <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>Término: {o.fechaTermino}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="p-4 border-t text-xs" style={{ borderColor: "var(--border)", color: "var(--muted-foreground)" }}>
          {ots.length} orden{ots.length !== 1 ? "es" : ""} de trabajo encontrada{ots.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  )
}

function EquipoCard({ c, onEdit, onDelete, onHistorial }: { c: ClienteEquipo; onEdit: () => void; onDelete: () => void; onHistorial: () => void }) {
  const est = estadoMap[c.estado]
  const Icon = est.icon
  const proxDias = diasHasta(c.proximaMantencion ?? "")
  const mantencionUrgente = proxDias !== null && proxDias <= 14

  return (
    <div className="rounded-xl overflow-hidden group transition-all duration-150 hover:translate-y-[-1px] hover:shadow-lg"
      style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
      <div className="h-0.5" style={{ background: est.color }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{c.empresa}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{c.cliente}</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: est.color + "20", color: est.color }}>
              <Icon size={10} />{est.label}
            </span>
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-6 w-6" title="Historial OTs" onClick={onHistorial}><ClipboardList size={11} /></Button>
              <Link href={`/equipos/${encodeURIComponent(c.equipo)}`} title="Ver historial completo">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-indigo-500"><History size={11} /></Button>
              </Link>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil size={11} /></Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={onDelete}><Trash2 size={11} /></Button>
            </div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg mb-3" style={{ background: "var(--accent)" }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold" style={{ color: "var(--foreground)" }}>{c.equipo}</span>
            {c.codigoEquipo && <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--card)", color: "var(--muted-foreground)" }}>{c.codigoEquipo}</span>}
          </div>
          <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
            {tiposEquipo.find(t => t.value === c.tipoEquipo)?.label}
            {c.numeroSerie && ` · S/N: ${c.numeroSerie}`}
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
            <MapPin size={10} />{c.ciudad}
          </span>
          {c.tecnicoResponsable && (
            <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>
              <Wrench size={10} />{c.tecnicoResponsable}
            </span>
          )}
          <GarantiaChip fecha={c.garantiaHasta} />
        </div>

        {c.proximaMantencion && (
          <div className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg"
            style={{ background: mantencionUrgente ? "rgba(249,115,22,0.1)" : "var(--accent)", color: mantencionUrgente ? "#f97316" : "var(--muted-foreground)" }}>
            {mantencionUrgente && <AlertTriangle size={11} />}
            <span>Próx. mantención: {c.proximaMantencion}{proxDias !== null && ` (${proxDias >= 0 ? proxDias + "d" : "vencida"})`}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const [lista, setLista] = useState<ClienteEquipo[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<ClienteEquipo | null>(null)
  const [historialEquipo, setHistorialEquipo] = useState<ClienteEquipo | null>(null)
  const [form, setForm] = useState(empty())
  const [filtroCiudad, setFiltroCiudad] = useState<CiudadOficina | "todas">("todas")
  const [filtroEstado, setFiltroEstado] = useState<EstadoEquipoTerreno | "todos">("todos")
  const [busqueda, setBusqueda] = useState("")

  const cargar = () => setLista(clientesEquipos.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(c?: ClienteEquipo) {
    if (c) { setEditando(c); const { id, creadoEn, ...r } = c; setForm(r) }
    else { setEditando(null); setForm(empty()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.cliente || !form.empresa || !form.equipo) return
    editando ? clientesEquipos.update(editando.id, form) : clientesEquipos.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    clientesEquipos.delete(id); cargar()
  }

  const setS = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const filtrada = lista.filter(c => {
    if (filtroCiudad !== "todas" && c.ciudad !== filtroCiudad) return false
    if (filtroEstado !== "todos" && c.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return c.cliente.toLowerCase().includes(q) || c.empresa.toLowerCase().includes(q) || c.equipo.toLowerCase().includes(q)
    }
    return true
  })

  const porVencer = lista.filter(c => {
    const dias = diasHasta(c.proximaMantencion ?? "")
    return dias !== null && dias >= 0 && dias <= 14
  }).length
  const garantiasVencidas = lista.filter(c => c.garantiaHasta && diasHasta(c.garantiaHasta)! < 0).length

  const stats = [
    { label: "Equipos", value: lista.length },
    { label: "Activos", value: lista.filter(c => c.estado === "activo").length, color: "#0891b2" },
    { label: "Mant. próxima", value: porVencer, color: "#f97316" },
    { label: "Garantías venc.", value: garantiasVencidas, color: "#f87171" },
  ]

  return (
    <PageShell
      icon={Users}
      title="Clientes y Equipos en Terreno"
      subtitle="Equipos instalados y seguimiento de mantención"
      color="#2dd4bf"
      stats={stats}
      actions={
        <button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Equipo</button>
      }
    >

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Buscar cliente, empresa, equipo…" value={busqueda} onChange={e => setBusqueda(e.target.value)}
          className="w-64 h-8 text-sm" />
        <div className="flex gap-1 flex-wrap">
          {(["todas", ...ciudades] as const).map(c => (
            <button key={c} onClick={() => setFiltroCiudad(c as typeof filtroCiudad)}
              className={`filter-pill${filtroCiudad === c ? " active" : ""}`}>
              {c === "todas" ? "Todas las ciudades" : c}
            </button>
          ))}
        </div>
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFiltroEstado("todos")} className={`filter-pill${filtroEstado === "todos" ? " active" : ""}`}>Todos</button>
          {estados.map(e => (
            <button key={e.value} onClick={() => setFiltroEstado(e.value)} className={`filter-pill${filtroEstado === e.value ? " active" : ""}`}>
              {e.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1">
        {filtrada.length === 0 && (
          <div className="col-span-3 py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            No hay equipos registrados.
          </div>
        )}
        {filtrada.map(c => (
          <EquipoCard key={c.id} c={c} onEdit={() => abrir(c)} onDelete={() => eliminar(c.id)} onHistorial={() => setHistorialEquipo(c)} />
        ))}
      </div>

      {historialEquipo && <HistorialModal equipo={historialEquipo} onClose={() => setHistorialEquipo(null)} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Equipo" : "Nuevo Equipo en Terreno"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-xs font-semibold uppercase tracking-wider pb-1" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Datos del cliente</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Empresa *</Label><Input value={form.empresa} onChange={e => setS("empresa", e.target.value)} placeholder="Minera X S.A." /></div>
              <div className="space-y-1"><Label>Contacto *</Label><Input value={form.cliente} onChange={e => setS("cliente", e.target.value)} placeholder="Nombre contacto" /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>RUT</Label><Input value={form.rut ?? ""} onChange={e => setS("rut", e.target.value)} /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={form.telefono ?? ""} onChange={e => setS("telefono", e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email ?? ""} onChange={e => setS("email", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Dirección</Label><Input value={form.direccion} onChange={e => setS("direccion", e.target.value)} /></div>
              <div className="space-y-1"><Label>Ciudad</Label>
                <Select value={form.ciudad} onValueChange={v => setS("ciudad", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ciudades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="text-xs font-semibold uppercase tracking-wider pb-1 pt-2" style={{ color: "var(--muted-foreground)", borderBottom: "1px solid var(--border)" }}>Datos del equipo</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Nombre del equipo *</Label><SelectEquipo value={form.equipo} onChange={v => setS("equipo", v)} onSelectEquipo={eq => setS("numeroSerie", eq?.numeroSerie ?? "")} /></div>
              <div className="space-y-1"><Label>Tipo</Label>
                <Select value={form.tipoEquipo} onValueChange={v => setS("tipoEquipo", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposEquipo.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Código equipo</Label><Input value={form.codigoEquipo ?? ""} onChange={e => setS("codigoEquipo", e.target.value)} /></div>
              <div className="space-y-1"><Label>N° Serie</Label><Input value={form.numeroSerie ?? ""} onChange={e => setS("numeroSerie", e.target.value)} placeholder="Se completa al elegir el equipo" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => setS("estado", v ?? "")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{estados.map(e => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>Técnico responsable</Label><SelectTecnico value={form.tecnicoResponsable ?? ""} onChange={v => setS("tecnicoResponsable", v)} /></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1"><Label>Fecha instalación</Label><Input type="date" value={form.fechaInstalacion} onChange={e => setS("fechaInstalacion", e.target.value)} /></div>
              <div className="space-y-1"><Label>Garantía hasta</Label><Input type="date" value={form.garantiaHasta ?? ""} onChange={e => setS("garantiaHasta", e.target.value)} /></div>
              <div className="space-y-1"><Label>Próx. mantención</Label><Input type="date" value={form.proximaMantencion ?? ""} onChange={e => setS("proximaMantencion", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Notas</Label><Textarea value={form.notas ?? ""} onChange={e => setS("notas", e.target.value)} rows={2} /></div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Registrar equipo"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}