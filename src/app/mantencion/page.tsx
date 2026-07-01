"use client"

import { useEffect, useState } from "react"
import { mantenciones, equipos as equiposStore, informesEntrega, usuarios } from "@/lib/store"
import { getSupabase } from "@/lib/supabase"
import { Mantencion, Equipo, InformeEntrega } from "@/lib/types"
import { FRECUENCIAS, calcularProxima, informeDesdeMantencion, generarInformePDF } from "@/lib/mantencion-utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Wrench, CalendarDays, User, Camera, Download, X } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import DateFilter, { filterByDate, DateRange } from "@/components/ui/DateFilter"
import Pagination from "@/components/ui/Pagination"
import { usePagination } from "@/lib/usePagination"
import { FotoGaleria } from "@/components/ui/FotoGaleria"

const estadoCfg: Record<string, { label: string; color: string; bg: string }> = {
  pendiente:  { label: "Pendiente",  color: "#ea580c", bg: "#fff7ed" },
  en_proceso: { label: "En proceso", color: "#7c3aed", bg: "#f5f3ff" },
  completado: { label: "Completado", color: "#059669", bg: "#f0fdf4" },
}

const empty = (): Omit<Mantencion, "id" | "creadoEn"> => ({
  equipo: "", numeroSerie: "", tipo: "preventivo", descripcion: "",
  tecnico: "", tecnicos: [], frecuencia: "ninguna",
  fecha: new Date().toISOString().slice(0, 10),
  estado: "pendiente", observaciones: "", proximaMantencion: "", fotos: [],
})

type UsuarioTecnico = { id: string; nombre: string }

export default function MantencionPage() {
  const [lista, setLista] = useState<Mantencion[]>([])
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [tecnicosUsuarios, setTecnicosUsuarios] = useState<UsuarioTecnico[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Mantencion | null>(null)
  const [form, setForm] = useState(empty())
  const [filtro, setFiltro] = useState<string>("todos")
  const [dateRange, setDateRange] = useState<DateRange>({ from: "", to: "" })

  const cargar = () => {
    setLista(mantenciones.getAll().slice().reverse())
    setEquipos(equiposStore.getAll())
  }
  useEffect(() => { cargar() }, [])

  // Lista de técnicos = mismos usuarios que en Gestión de Usuarios
  useEffect(() => {
    const local = usuarios.getAll()
    if (local.length > 0) {
      setTecnicosUsuarios(local.map(u => ({ id: u.id, nombre: u.nombre })))
    } else {
      (async () => {
        try {
          const { data } = await getSupabase().from("usuarios").select("id,nombre")
          if (data) setTecnicosUsuarios(data.map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre })))
        } catch { /* offline: se permite texto libre */ }
      })()
    }
  }, [])

  function abrir(m?: Mantencion) {
    if (m) {
      setEditando(m)
      const { id, creadoEn, ...r } = m
      setForm({ ...empty(), ...r, tecnicos: m.tecnicos && m.tecnicos.length ? m.tecnicos : (m.tecnico ? [m.tecnico] : []) })
    } else {
      setEditando(null); setForm(empty())
    }
    setOpen(true)
  }

  function guardar() {
    const tecnicosSel = form.tecnicos ?? []
    if (!form.equipo || !form.descripcion || tecnicosSel.length === 0) {
      alert("Completa Equipo, Descripción y al menos un Técnico.")
      return
    }
    const tecnicoStr = tecnicosSel.join(", ")
    const proxima = form.proximaMantencion || calcularProxima(form.fecha, form.frecuencia)

    const datos: Omit<Mantencion, "id" | "creadoEn"> = {
      ...form, tecnico: tecnicoStr, tecnicos: tecnicosSel, proximaMantencion: proxima,
    }

    // Al completar: registrar fecha, actualizar equipo y generar informe emitido
    if (datos.estado === "completado") {
      datos.completadoEn = new Date().toISOString()
      // actualizar equipo asociado (última y próxima mantención)
      const eq = equiposStore.getAll().find(e => e.nombre === datos.equipo)
      if (eq) {
        equiposStore.update(eq.id, {
          ultimaMantencion: datos.fecha,
          proximaMantencion: calcularProxima(datos.fecha, datos.frecuencia || eq.frecuencia),
        })
      }
      // generar informe (solo si aún no tiene uno)
      if (!datos.informeId) {
        const tmp: Mantencion = { ...datos, id: "tmp", creadoEn: "" }
        const inf = informesEntrega.add(informeDesdeMantencion(tmp))
        datos.informeId = inf.id
      }
    }

    try {
      if (editando) mantenciones.update(editando.id, datos)
      else mantenciones.add(datos)
    } catch (err) {
      alert("Error al guardar: " + String(err))
      return
    }
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Confirmar eliminación?")) return
    mantenciones.delete(id); cargar()
  }

  function descargarPDF(m: Mantencion) {
    let inf: InformeEntrega | undefined
    if (m.informeId) inf = informesEntrega.getAll().find(i => i.id === m.informeId)
    if (!inf) inf = { ...informeDesdeMantencion(m), id: "tmp", creadoEn: "" }
    generarInformePDF(inf, m.fotos ?? [])
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  function toggleTecnico(nombre: string) {
    setForm(f => {
      const cur = f.tecnicos ?? []
      return { ...f, tecnicos: cur.includes(nombre) ? cur.filter(t => t !== nombre) : [...cur, nombre] }
    })
  }

  // Al elegir equipo, autocompletar n° serie y frecuencia
  function elegirEquipo(nombre: string) {
    const eq = equipos.find(e => e.nombre === nombre)
    setForm(f => {
      const fecha = f.fecha
      const frecuencia = eq?.frecuencia ?? f.frecuencia
      return {
        ...f, equipo: nombre,
        numeroSerie: eq?.numeroSerie ?? f.numeroSerie,
        frecuencia,
        proximaMantencion: calcularProxima(fecha, frecuencia),
      }
    })
  }

  function cambiarFrecuencia(frecuencia: string) {
    setForm(f => ({ ...f, frecuencia: frecuencia as Mantencion["frecuencia"], proximaMantencion: calcularProxima(f.fecha, frecuencia as Mantencion["frecuencia"]) }))
  }
  function cambiarFecha(fecha: string) {
    setForm(f => ({ ...f, fecha, proximaMantencion: calcularProxima(fecha, f.frecuencia) }))
  }

  const porEstado = filtro === "todos" ? lista
    : filtro === "historial" ? lista.filter(m => m.estado === "completado")
    : lista.filter(m => m.estado === filtro)
  const filtrada = filterByDate(porEstado, dateRange)
  const { paged, page, totalPages, goTo, reset, total } = usePagination(filtrada, 20)

  const stats = [
    { label: "Total", value: lista.length },
    { label: "Pendientes", value: lista.filter(m => m.estado === "pendiente").length, color: "#f97316" },
    { label: "En proceso", value: lista.filter(m => m.estado === "en_proceso").length, color: "#7c3aed" },
    { label: "Completadas", value: lista.filter(m => m.estado === "completado").length, color: "#0891b2" },
  ]

  const pills: { id: string; label: string }[] = [
    { id: "todos", label: `Todos (${lista.length})` },
    { id: "pendiente", label: `Pendiente (${lista.filter(m => m.estado === "pendiente").length})` },
    { id: "en_proceso", label: `En proceso (${lista.filter(m => m.estado === "en_proceso").length})` },
    { id: "historial", label: `Historial (${lista.filter(m => m.estado === "completado").length})` },
  ]

  return (
    <PageShell
      icon={Wrench}
      title="Mantención de Equipos"
      subtitle="Mantenciones preventivas y correctivas"
      color="#f97316"
      stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Mantención</button>}
    >
      <div className="mb-3"><DateFilter onChange={r => { setDateRange(r); reset() }} /></div>

      <div className="flex gap-1.5 flex-wrap mb-5">
        {pills.map(f => (
          <button key={f.id} className={`filter-pill${filtro === f.id ? " active" : ""}`} onClick={() => setFiltro(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="glass-section overflow-hidden">
        {filtrada.length === 0 ? (
          <div className="empty-state"><Wrench size={40} /><p>No hay mantenciones</p></div>
        ) : (
          paged.map((m, i) => {
            const cfg = estadoCfg[m.estado]
            const tecnicosLabel = m.tecnicos && m.tecnicos.length ? m.tecnicos.join(", ") : m.tecnico
            return (
              <div key={m.id} className="group"
                style={{ borderBottom: i < paged.length - 1 ? "1px solid rgba(0,0,0,0.04)" : "none", padding: "14px 16px" }}
                onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.025)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="w-0.5 self-stretch rounded-full shrink-0 mt-0.5" style={{ background: cfg.color, opacity: 0.7 }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{m.equipo}</span>
                      {m.numeroSerie && (
                        <span className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>#{m.numeroSerie}</span>
                      )}
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ background: "var(--accent)", color: "var(--muted-foreground)" }}>{m.tipo}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                    </div>
                    <p className="text-xs mb-2" style={{ color: "var(--muted-foreground)", lineHeight: 1.5 }}>{m.descripcion}</p>
                    <div className="flex gap-4 text-xs flex-wrap" style={{ color: "var(--muted-foreground)" }}>
                      <span className="flex items-center gap-1"><User size={11} /><strong style={{ color: "var(--foreground)" }}>{tecnicosLabel}</strong></span>
                      <span className="flex items-center gap-1"><CalendarDays size={11} /><strong style={{ color: "var(--foreground)" }}>{m.fecha}</strong></span>
                      {m.proximaMantencion && (
                        <span className="flex items-center gap-1"><CalendarDays size={11} />Próxima: <strong style={{ color: "#f59e0b" }}>{m.proximaMantencion}</strong></span>
                      )}
                    </div>
                    {m.observaciones && <p className="text-xs mt-1.5 italic" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>{m.observaciones}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0 items-center">
                    {m.estado === "completado" && (
                      <button onClick={() => descargarPDF(m)} title="Descargar informe PDF"
                        className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-lg"
                        style={{ color: "#1a3673", background: "#eef2ff" }}>
                        <Download size={12} /> PDF
                      </button>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(m)}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(m.id)}><Trash2 size={13} /></Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onPage={goTo} />}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Mantención" : "Nueva Mantención"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Equipo *</Label>
                {equipos.length > 0 ? (
                  <select value={form.equipo} onChange={e => elegirEquipo(e.target.value)}
                    className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none">
                    <option value="">Selecciona equipo</option>
                    {equipos.map(e => <option key={e.id} value={e.nombre}>{e.nombre}</option>)}
                  </select>
                ) : (
                  <Input value={form.equipo} onChange={e => set("equipo", e.target.value)} placeholder="Registra equipos en el menú Equipos" />
                )}
              </div>
              <div className="space-y-1"><Label>N° Serie</Label><Input value={form.numeroSerie} onChange={e => set("numeroSerie", e.target.value)} placeholder="SN-0001" /></div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={form.tipo} onValueChange={v => set("tipo", v ?? "preventivo")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventivo">Preventivo</SelectItem>
                    <SelectItem value="correctivo">Correctivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Estado</Label>
                <Select value={form.estado} onValueChange={v => set("estado", v ?? "pendiente")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="en_proceso">En proceso</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1"><Label>Descripción *</Label><Textarea value={form.descripcion} onChange={e => set("descripcion", e.target.value)} rows={3} /></div>

            {/* Técnicos múltiples */}
            <div className="space-y-1.5">
              <Label>Técnicos *</Label>
              {(form.tecnicos ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(form.tecnicos ?? []).map(t => (
                    <span key={t} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ background: "#eef2ff", color: "#1a3673" }}>
                      {t}<button type="button" onClick={() => toggleTecnico(t)}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
              {tecnicosUsuarios.length > 0 ? (
                <select value="" onChange={e => { if (e.target.value) toggleTecnico(e.target.value) }}
                  className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none">
                  <option value="">Agregar técnico…</option>
                  {tecnicosUsuarios.filter(u => !(form.tecnicos ?? []).includes(u.nombre)).map(u => (
                    <option key={u.id} value={u.nombre}>{u.nombre}</option>
                  ))}
                </select>
              ) : (
                <Input placeholder="Nombre del técnico y Enter" onKeyDown={e => {
                  if (e.key === "Enter") { e.preventDefault(); const v = (e.target as HTMLInputElement).value.trim(); if (v) { toggleTecnico(v); (e.target as HTMLInputElement).value = "" } }
                }} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.fecha} onChange={e => cambiarFecha(e.target.value)} /></div>
              <div className="space-y-1">
                <Label>Frecuencia</Label>
                <Select value={form.frecuencia ?? "ninguna"} onValueChange={v => cambiarFrecuencia(v ?? "ninguna")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FRECUENCIAS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Próxima mantención {form.frecuencia && form.frecuencia !== "ninguna" ? "(automática)" : ""}</Label>
              <Input type="date" value={form.proximaMantencion ?? ""} onChange={e => set("proximaMantencion", e.target.value)} />
            </div>

            <div className="space-y-1"><Label>Observaciones</Label><Textarea value={form.observaciones ?? ""} onChange={e => set("observaciones", e.target.value)} rows={2} /></div>

            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Camera size={13} />Fotos ({(form.fotos ?? []).length}/20)</Label>
              <FotoGaleria fotos={form.fotos ?? []} maxFotos={20} onChange={fotos => setForm(f => ({ ...f, fotos }))} />
            </div>

            {form.estado === "completado" && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#f0fdf4", color: "#059669" }}>
                Al guardar como completado se generará automáticamente un informe descargable y se actualizará la próxima mantención del equipo.
              </p>
            )}

            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Registrar mantención"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
