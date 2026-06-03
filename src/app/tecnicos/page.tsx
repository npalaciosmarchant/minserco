"use client"

import { useEffect, useState } from "react"
import { tecnicos, asignaciones } from "@/lib/store"
import { Tecnico, AsignacionTecnico, CiudadOficina, TipoOT, EstadoAsignacion } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Users, Calendar, ChevronLeft, ChevronRight, Clock, Play, CheckCircle2, XCircle } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const ciudades: CiudadOficina[] = ["Copiapó", "La Serena", "Viña del Mar", "Otra"]
const tiposOT: { value: TipoOT; label: string }[] = [
  { value: "instalacion", label: "Instalación" },
  { value: "mantencion_terreno", label: "Mantención en Terreno" },
  { value: "reparacion_terreno", label: "Reparación en Terreno" },
  { value: "inspeccion", label: "Inspección" },
]
const estadosAsig: { value: EstadoAsignacion; label: string; color: string; icon: React.ElementType }[] = [
  { value: "programado", label: "Programado", color: "#7c3aed", icon: Clock },
  { value: "en_curso",   label: "En Curso",   color: "#fbbf24", icon: Play },
  { value: "completado", label: "Completado", color: "#0891b2", icon: CheckCircle2 },
  { value: "cancelado",  label: "Cancelado",  color: "#ef4444", icon: XCircle },
]
const estadoAsigMap = Object.fromEntries(estadosAsig.map(e => [e.value, e]))

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const emptyTecnico = (): Omit<Tecnico, "id" | "creadoEn"> => ({
  nombre: "", especialidad: "", telefono: "", email: "", oficina: "Copiapó", activo: true,
})

const emptyAsig = (): Omit<AsignacionTecnico, "id" | "creadoEn"> => ({
  tecnicoId: "", tipo: "instalacion", cliente: "", descripcion: "",
  ciudad: "Copiapó", fecha: new Date().toISOString().slice(0, 10),
  horaInicio: "09:00", horaFin: "17:00", estado: "programado",
})

export default function TecnicosPage() {
  const [listaTec, setListaTec] = useState<Tecnico[]>([])
  const [listaAsig, setListaAsig] = useState<AsignacionTecnico[]>([])
  const [tab, setTab] = useState<"tecnicos" | "agenda">("tecnicos")
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()))

  // Modals
  const [openTec, setOpenTec] = useState(false)
  const [editandoTec, setEditandoTec] = useState<Tecnico | null>(null)
  const [formTec, setFormTec] = useState(emptyTecnico())

  const [openAsig, setOpenAsig] = useState(false)
  const [editandoAsig, setEditandoAsig] = useState<AsignacionTecnico | null>(null)
  const [formAsig, setFormAsig] = useState(emptyAsig())
  const [fechaPreset, setFechaPreset] = useState<string | null>(null)

  const cargar = () => {
    setListaTec(tecnicos.getAll().slice().reverse())
    setListaAsig(asignaciones.getAll())
  }
  useEffect(() => { cargar() }, [])

  // Tecnico CRUD
  function abrirTec(t?: Tecnico) {
    if (t) { setEditandoTec(t); const { id, creadoEn, ...r } = t; setFormTec(r) }
    else { setEditandoTec(null); setFormTec(emptyTecnico()) }
    setOpenTec(true)
  }
  function guardarTec() {
    if (!formTec.nombre || !formTec.especialidad) return
    editandoTec ? tecnicos.update(editandoTec.id, formTec) : tecnicos.add(formTec)
    cargar(); setOpenTec(false)
  }
  function eliminarTec(id: string) {
    if (!confirm("Eliminar técnico?")) return
    tecnicos.delete(id); cargar()
  }
  const setST = (k: string, v: string | boolean) => setFormTec(f => ({ ...f, [k]: v }))

  // Asignacion CRUD
  function abrirAsig(a?: AsignacionTecnico, fecha?: string) {
    if (a) { setEditandoAsig(a); const { id, creadoEn, ...r } = a; setFormAsig(r) }
    else { setEditandoAsig(null); setFormAsig({ ...emptyAsig(), fecha: fecha ?? new Date().toISOString().slice(0, 10) }) }
    setFechaPreset(fecha ?? null)
    setOpenAsig(true)
  }
  function guardarAsig() {
    if (!formAsig.tecnicoId || !formAsig.cliente || !formAsig.descripcion) return
    editandoAsig ? asignaciones.update(editandoAsig.id, formAsig) : asignaciones.add(formAsig)
    cargar(); setOpenAsig(false)
  }
  function eliminarAsig(id: string) {
    asignaciones.delete(id); cargar()
  }
  const setSA = (k: string, v: string) => setFormAsig(f => ({ ...f, [k]: v }))

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const tecnicosActivos = listaTec.filter(t => t.activo)

  const stats = [
    { label: "Técnicos activos", value: tecnicosActivos.length, color: "#fbbf24" },
    { label: "Total técnicos", value: listaTec.length },
  ]

  return (
    <PageShell
      icon={Users}
      title="Técnicos y Agenda"
      subtitle="Gestión de personal y asignaciones semanales"
      color="#fbbf24"
      stats={stats}
      actions={
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            <button className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={tab === "tecnicos" ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "transparent", color: "var(--muted-foreground)" }}
              onClick={() => setTab("tecnicos")}>Técnicos</button>
            <button className="px-3 py-1.5 text-xs font-medium transition-colors"
              style={tab === "agenda" ? { background: "var(--primary)", color: "var(--primary-foreground)" } : { background: "transparent", color: "var(--muted-foreground)" }}
              onClick={() => setTab("agenda")}>Agenda</button>
          </div>
          {tab === "tecnicos" && (
            <button className="btn-accent" onClick={() => abrirTec()}><Plus size={14} /> Nuevo Técnico</button>
          )}
          {tab === "agenda" && (
            <button className="btn-accent" onClick={() => abrirAsig()}><Plus size={14} /> Nueva Asignación</button>
          )}
        </div>
      }
    >

      {tab === "tecnicos" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1">
          {listaTec.length === 0 && (
            <div className="col-span-3 py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>No hay técnicos registrados.</div>
          )}
          {listaTec.map(t => {
            const asigHoy = listaAsig.filter(a => a.tecnicoId === t.id && a.fecha === isoDate(new Date()) && a.estado !== "cancelado")
            const totalSemana = listaAsig.filter(a => a.tecnicoId === t.id && a.fecha >= isoDate(weekStart) && a.fecha <= isoDate(addDays(weekStart, 6)) && a.estado !== "cancelado").length
            return (
              <div key={t.id} className="rounded-xl overflow-hidden group transition-all duration-150 hover:translate-y-[-1px] hover:shadow-lg"
                style={{ background: "var(--card)", border: "1px solid var(--border)", opacity: t.activo ? 1 : 0.6 }}>
                <div className="h-0.5" style={{ background: t.activo ? "#fbbf24" : "#94a3b8" }} />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{t.nombre}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{t.especialidad}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: t.activo ? "rgba(45,212,191,0.15)" : "rgba(148,163,184,0.15)", color: t.activo ? "#2dd4bf" : "#94a3b8" }}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </span>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => abrirTec(t)}><Pencil size={11} /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={() => eliminarTec(t.id)}><Trash2 size={11} /></Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3 text-xs" style={{ color: "var(--muted-foreground)" }}>
                    <span className="px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)" }}>{t.oficina}</span>
                    {t.telefono && <span className="px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)" }}>{t.telefono}</span>}
                    {t.email && <span className="px-1.5 py-0.5 rounded-md" style={{ background: "var(--accent)" }}>{t.email}</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="rounded-lg py-2" style={{ background: "var(--accent)" }}>
                      <div className="font-bold text-lg" style={{ color: "#fbbf24" }}>{asigHoy.length}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Hoy</div>
                    </div>
                    <div className="rounded-lg py-2" style={{ background: "var(--accent)" }}>
                      <div className="font-bold text-lg" style={{ color: "var(--foreground)" }}>{totalSemana}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Esta semana</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === "agenda" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Week nav */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(d => addDays(d, -7))}>
              <ChevronLeft size={14} />
            </Button>
            <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              {weekStart.toLocaleDateString("es-CL", { day: "numeric", month: "long" })} – {addDays(weekStart, 6).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" })}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setWeekStart(d => addDays(d, 7))}>
              <ChevronRight size={14} />
            </Button>
            <button className="text-xs px-2.5 py-1.5 rounded-lg font-medium"
              style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}
              onClick={() => setWeekStart(startOfWeek(new Date()))}>Hoy</button>
          </div>

          {/* Calendar grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid min-w-max" style={{ gridTemplateColumns: `140px repeat(7, 1fr)`, gap: "2px" }}>
              {/* Header row */}
              <div className="h-10" />
              {weekDays.map(d => {
                const isToday = isoDate(d) === isoDate(new Date())
                return (
                  <div key={d.toISOString()} className="h-10 rounded-lg flex flex-col items-center justify-center text-xs font-medium"
                    style={{ background: isToday ? "rgba(245,158,11,0.15)" : "var(--card)", color: isToday ? "#f59e0b" : "var(--muted-foreground)" }}>
                    <span>{DIAS[d.getDay()]}</span>
                    <span className={`font-bold ${isToday ? "" : ""}`} style={{ color: isToday ? "#f59e0b" : "var(--foreground)" }}>{d.getDate()}</span>
                  </div>
                )
              })}

              {/* Technician rows */}
              {tecnicosActivos.map(tec => (
                <>
                  <div key={`tec-${tec.id}`} className="rounded-lg px-2 py-2 flex items-center"
                    style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div>
                      <div className="text-xs font-semibold leading-tight" style={{ color: "var(--foreground)" }}>{tec.nombre}</div>
                      <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{tec.especialidad}</div>
                    </div>
                  </div>
                  {weekDays.map(d => {
                    const fecha = isoDate(d)
                    const dayAsigs = listaAsig.filter(a => a.tecnicoId === tec.id && a.fecha === fecha)
                    const isToday = fecha === isoDate(new Date())
                    return (
                      <div key={`${tec.id}-${fecha}`} className="min-h-16 rounded-lg p-1 space-y-1 cursor-pointer transition-colors hover:opacity-90"
                        style={{ background: isToday ? "rgba(245,158,11,0.04)" : "var(--card)", border: `1px solid ${isToday ? "rgba(245,158,11,0.2)" : "var(--border)"}` }}
                        onClick={() => abrirAsig(undefined, fecha)}>
                        {dayAsigs.map(a => {
                          const est = estadoAsigMap[a.estado]
                          const Icon = est.icon
                          return (
                            <div key={a.id} className="text-xs px-1.5 py-1 rounded-md flex items-start gap-1 group/asig"
                              style={{ background: est.color + "20", border: `1px solid ${est.color}40` }}
                              onClick={e => { e.stopPropagation(); abrirAsig(a) }}>
                              <Icon size={9} style={{ color: est.color, marginTop: 1, flexShrink: 0 }} />
                              <span className="leading-tight line-clamp-2" style={{ color: est.color }}>{a.cliente}</span>
                            </div>
                          )
                        })}
                        {dayAsigs.length === 0 && (
                          <div className="h-full flex items-center justify-center opacity-0 hover:opacity-30 transition-opacity">
                            <Plus size={12} style={{ color: "var(--muted-foreground)" }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tecnico dialog */}
      <Dialog open={openTec} onOpenChange={setOpenTec}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editandoTec ? "Editar Técnico" : "Nuevo Técnico"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Nombre *</Label><Input value={formTec.nombre} onChange={e => setST("nombre", e.target.value)} /></div>
              <div className="space-y-1 col-span-2"><Label>Especialidad *</Label><Input value={formTec.especialidad} onChange={e => setST("especialidad", e.target.value)} placeholder="Ej: Sistemas supresores de polvo" /></div>
              <div className="space-y-1"><Label>Teléfono</Label><Input value={formTec.telefono ?? ""} onChange={e => setST("telefono", e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={formTec.email ?? ""} onChange={e => setST("email", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Oficina</Label>
                <select value={formTec.oficina} onChange={e => setST("oficina", e.target.value)}
                  className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                  {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Estado</Label>
                <select value={formTec.activo ? "activo" : "inactivo"} onChange={e => setST("activo", e.target.value === "activo")}
                  className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                </select>
              </div>
            </div>
            <Button className="w-full" onClick={guardarTec}>{editandoTec ? "Guardar cambios" : "Crear técnico"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Asignacion dialog */}
      <Dialog open={openAsig} onOpenChange={setOpenAsig}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editandoAsig ? "Editar Asignación" : "Nueva Asignación"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1"><Label>Técnico *</Label>
              <select value={formAsig.tecnicoId} onChange={e => setSA("tecnicoId", e.target.value)}
                className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                <option value="">Seleccionar técnico</option>
                {tecnicosActivos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Tipo</Label>
                <select value={formAsig.tipo} onChange={e => setSA("tipo", e.target.value)}
                  className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                  {tiposOT.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Estado</Label>
                <select value={formAsig.estado} onChange={e => setSA("estado", e.target.value)}
                  className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                  {estadosAsig.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1"><Label>Cliente *</Label><Input value={formAsig.cliente} onChange={e => setSA("cliente", e.target.value)} /></div>
            <div className="space-y-1"><Label>Descripción *</Label><Textarea value={formAsig.descripcion} onChange={e => setSA("descripcion", e.target.value)} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Ciudad</Label>
                <select value={formAsig.ciudad} onChange={e => setSA("ciudad", e.target.value)}
                  className="w-full h-10 rounded-md border px-3 text-sm" style={{ background: "var(--card)", borderColor: "var(--border)", color: "var(--foreground)" }}>
                  {ciudades.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={formAsig.fecha} onChange={e => setSA("fecha", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Hora inicio</Label><Input type="time" value={formAsig.horaInicio ?? ""} onChange={e => setSA("horaInicio", e.target.value)} /></div>
              <div className="space-y-1"><Label>Hora fin</Label><Input type="time" value={formAsig.horaFin ?? ""} onChange={e => setSA("horaFin", e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1" onClick={guardarAsig}>{editandoAsig ? "Guardar" : "Crear asignación"}</Button>
              {editandoAsig && (
                <Button variant="destructive" onClick={() => { eliminarAsig(editandoAsig.id); setOpenAsig(false) }}>
                  <Trash2 size={14} />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
