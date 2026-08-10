"use client"

import { useEffect, useState } from "react"
import { tareas, usuarios } from "@/lib/store"
import { getSupabase } from "@/lib/supabase"
import { Tarea, EstadoTarea } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, ListTodo, User, Tag, X, Camera } from "lucide-react"
import PageShell from "@/components/layout/PageShell"
import { FiltroMes, mesActual, enMes } from "@/components/ui/FiltroMes"
import { AgendaVista } from "@/components/ui/AgendaVista"
import { FotoGaleria } from "@/components/ui/FotoGaleria"
import { useAuth } from "@/lib/auth"

const estadoCfg: Record<EstadoTarea, { label: string; color: string }> = {
  pendiente:  { label: "Pendiente",  color: "#d97706" },
  en_proceso: { label: "En proceso", color: "#4F46E5" },
  completada: { label: "Completada", color: "#059669" },
}

function fmtFecha(f?: string): string {
  if (!f) return ""
  const p = f.split("-")
  return (p.length === 3) ? `${p[2]}-${p[1]}-${p[0]}` : f
}

function emptyForm(): Omit<Tarea, "id" | "creadoEn"> {
  return { titulo: "", tipo: "", fecha: new Date().toISOString().slice(0, 10), hora: "", responsable: "", responsables: [], fechaLimite: "", fotos: [], estado: "pendiente", descripcion: "" }
}

export default function TareasPage() {
  const [lista, setLista] = useState<Tarea[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Tarea | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [mes, setMes] = useState(mesActual())
  const { user } = useAuth()
  const [usuariosLista, setUsuariosLista] = useState<{ id: string; nombre: string }[]>([])
  const cargar = () => setLista(tareas.getAll())
  useEffect(() => { cargar() }, [])
  useEffect(() => {
    const local = usuarios.getAll()
    if (local.length) setUsuariosLista(local.map(u => ({ id: u.id, nombre: u.nombre })))
    else (async () => { try { const { data } = await getSupabase().from("usuarios").select("id,nombre"); if (data) setUsuariosLista(data.map((u: { id: string; nombre: string }) => ({ id: u.id, nombre: u.nombre }))) } catch { /* offline */ } })()
  }, [])
  function toggleResponsable(nombre: string) {
    setForm(f => { const cur = f.responsables ?? []; return { ...f, responsables: cur.includes(nombre) ? cur.filter(x => x !== nombre) : [...cur, nombre] } })
  }
  const setS = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }) as unknown as typeof f)

  function abrir(t?: Tarea) {
    if (t) { setEditando(t); const { id, creadoEn, color, ...r } = t as Tarea & { color?: string }; void id; void creadoEn; void color; setForm({ ...emptyForm(), ...r, responsables: t.responsables && t.responsables.length ? t.responsables : (t.responsable ? [t.responsable] : []) }) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }
  function guardar() {
    if (!form.titulo.trim()) { alert("El título es obligatorio."); return }
    const resp = form.responsables ?? []
    const payload = { ...form, responsable: resp.join(", "), responsables: resp }
    if (editando) tareas.update(editando.id, payload); else tareas.add(payload)
    const mF = (payload.fecha || "").slice(0, 7)
    if (mF && mes !== "todos" && mF !== mes) setMes(mF)
    cargar(); setOpen(false)
  }
  function eliminar(id: string) { if (confirm("¿Eliminar esta tarea?")) { tareas.delete(id); cargar() } }

  const visibles = user?.rol === "tecnico"
    ? lista.filter(t => {
        const rs = t.responsables && t.responsables.length ? t.responsables : (t.responsable ? t.responsable.split(",").map(x => x.trim()) : [])
        return rs.includes(user.nombre)
      })
    : lista
  const items = visibles.filter(t => enMes(t.fecha, mes)).map(t => ({ ...t, color: estadoCfg[t.estado].color }))

  const stats = [
    { label: "Total", value: visibles.length },
    { label: "Pendientes", value: visibles.filter(t => t.estado === "pendiente").length, color: "#d97706" },
    { label: "Completadas", value: visibles.filter(t => t.estado === "completada").length, color: "#059669" },
  ]

  return (
    <PageShell icon={ListTodo} title="Tareas" subtitle="Tareas administrativas por tipo, con calendario" color="#4F46E5" stats={stats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nueva Tarea</button>}>
      <FiltroMes value={mes} onChange={setMes} />
      <AgendaVista
        items={items}
        mesRef={mes === "todos" ? undefined : mes}
        onMesRefChange={setMes}
        onItemClick={t => abrir(t)}
        onDayClick={f => { setEditando(null); setForm({ ...emptyForm(), fecha: f }); setOpen(true) }}
        renderCard={t => {
          const est = estadoCfg[t.estado]
          return (
            <div className="glass-card p-4 group">
              <div className="flex items-start justify-between mb-1">
                <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{t.titulo}</div>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ background: est.color + "20", color: est.color }}>{est.label}</span>
              </div>
              <div className="text-xs space-y-0.5" style={{ color: "var(--muted-foreground)" }}>
                <div>{fmtFecha(t.fecha)}{t.hora ? ` · ${t.hora}` : ""}</div>
                {t.fechaLimite && <div style={{ color: "#dc2626" }}>Plazo: {fmtFecha(t.fechaLimite)}</div>}
                {t.fotos && t.fotos.length > 0 && <div className="flex items-center gap-1"><Camera size={11} />{t.fotos.length} foto(s)</div>}
                {t.tipo && <div className="flex items-center gap-1"><Tag size={11} />{t.tipo}</div>}
                {(t.responsables && t.responsables.length ? t.responsables.join(", ") : t.responsable) && <div className="flex items-center gap-1"><User size={11} />{t.responsables && t.responsables.length ? t.responsables.join(", ") : t.responsable}</div>}
                {t.descripcion && <div className="line-clamp-2">{t.descripcion}</div>}
              </div>
              <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => abrir(t)}><Pencil size={13} /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => eliminar(t.id)}><Trash2 size={13} /></Button>
              </div>
            </div>
          )
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editando ? "Editar Tarea" : "Nueva Tarea"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto">
            <div className="space-y-1"><Label>Título *</Label><Input value={form.titulo} onChange={e => setS("titulo", e.target.value)} /></div>
            <div className="space-y-1"><Label>Tipo de tarea</Label><Input value={form.tipo ?? ""} onChange={e => setS("tipo", e.target.value)} placeholder="Ej. Trámite, cobranza, llamada…" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Fecha</Label><Input type="date" value={form.fecha ?? ""} onChange={e => setS("fecha", e.target.value)} /></div>
              <div className="space-y-1"><Label>Hora</Label><Input type="time" value={form.hora ?? ""} onChange={e => setS("hora", e.target.value)} /></div>
            </div>
            <div className="space-y-1"><Label>Fecha límite (plazo para realizarla)</Label><Input type="date" value={form.fechaLimite ?? ""} onChange={e => setS("fechaLimite", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Responsables</Label>
              {(form.responsables ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {(form.responsables ?? []).map(r => (
                    <span key={r} className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full" style={{ background: "#eef2ff", color: "#1a3673" }}>
                      {r}<button type="button" onClick={() => toggleResponsable(r)}><X size={11} /></button>
                    </span>
                  ))}
                </div>
              )}
              <select value="" onChange={e => { if (e.target.value) toggleResponsable(e.target.value) }} className="w-full h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none">
                <option value="">Agregar responsable…</option>
                {usuariosLista.filter(u => !(form.responsables ?? []).includes(u.nombre)).map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1"><Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setS("estado", v ?? "pendiente")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(estadoCfg) as EstadoTarea[]).map(k => <SelectItem key={k} value={k}>{estadoCfg[k].label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>Descripción</Label><Textarea value={form.descripcion ?? ""} onChange={e => setS("descripcion", e.target.value)} rows={3} /></div>
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Camera size={13} />Fotos ({(form.fotos ?? []).length})</Label>
              <FotoGaleria fotos={form.fotos ?? []} onChange={fotos => setForm(f => ({ ...f, fotos }))} />
            </div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear tarea"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
