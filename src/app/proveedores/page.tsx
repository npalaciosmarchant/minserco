"use client"

import { useEffect, useState } from "react"
import { proveedores } from "@/lib/store"
import { Proveedor, CategoriaProveedor } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Building2, Globe, Phone, Mail, Star } from "lucide-react"
import PageShell from "@/components/layout/PageShell"

const categorias: { value: CategoriaProveedor; label: string; color: string }[] = [
  { value: "equipos",      label: "Equipos",      color: "#7c3aed" },
  { value: "repuestos",    label: "Repuestos",    color: "#f59e0b" },
  { value: "consumibles",  label: "Consumibles",  color: "#0891b2" },
  { value: "servicios",    label: "Servicios",    color: "#60a5fa" },
  { value: "otro",         label: "Otro",         color: "#94a3b8" },
]
const catMap = Object.fromEntries(categorias.map(c => [c.value, c]))

function emptyForm(): Omit<Proveedor, "id" | "creadoEn"> {
  return {
    nombre: "", pais: "", ciudad: "", contacto: "", telefono: "", email: "",
    sitioWeb: "", categorias: [], productos: "", tiempoEntrega: "",
    calificacion: 0, notas: "", activo: true,
  }
}

function Stars({ value, onChange }: { value: number; onChange?: (v: number) => void }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)}
          style={{ color: i <= value ? "#f59e0b" : "var(--border)", fontSize: 18, lineHeight: 1 }}>
          ★
        </button>
      ))}
    </div>
  )
}

function ProveedorCard({ p, onEdit, onDelete }: { p: Proveedor; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="rounded-xl overflow-hidden group transition-all duration-150 hover:translate-y-[-1px] hover:shadow-lg"
      style={{ background: "var(--card)", border: "1px solid var(--border)", opacity: p.activo ? 1 : 0.55 }}>
      <div className="h-0.5" style={{ background: p.activo ? "#2dd4bf" : "#94a3b8" }} />
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: "rgba(45,212,191,0.15)", color: "#0891b2" }}>
              {p.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{p.nombre}</div>
              <div className="text-xs flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                <Globe size={10} />{p.pais}{p.ciudad ? ` · ${p.ciudad}` : ""}
              </div>
            </div>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}><Pencil size={11} /></Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-red-400" onClick={onDelete}><Trash2 size={11} /></Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {p.categorias.map(c => {
            const cat = catMap[c]
            return (
              <span key={c} className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: cat.color + "20", color: cat.color }}>{cat.label}</span>
            )
          })}
        </div>

        {p.productos && (
          <p className="text-xs line-clamp-2 mb-3" style={{ color: "var(--muted-foreground)" }}>{p.productos}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5 text-xs" style={{ color: "var(--muted-foreground)" }}>
            {p.telefono && <span className="flex items-center gap-1"><Phone size={9} />{p.telefono}</span>}
            {p.email && <span className="flex items-center gap-1"><Mail size={9} />{p.email}</span>}
            {p.tiempoEntrega && <span>Entrega: {p.tiempoEntrega}</span>}
          </div>
          {(p.calificacion ?? 0) > 0 && <Stars value={p.calificacion ?? 0} />}
        </div>
      </div>
    </div>
  )
}

export default function ProveedoresPage() {
  const [lista, setLista] = useState<Proveedor[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaProveedor | "todos">("todos")
  const [busqueda, setBusqueda] = useState("")

  const cargar = () => setLista(proveedores.getAll().slice().reverse())
  useEffect(() => { cargar() }, [])

  function abrir(p?: Proveedor) {
    if (p) { setEditando(p); const { id, creadoEn, ...r } = p; setForm(r) }
    else { setEditando(null); setForm(emptyForm()) }
    setOpen(true)
  }

  function guardar() {
    if (!form.nombre || !form.pais) return
    editando ? proveedores.update(editando.id, form) : proveedores.add(form)
    cargar(); setOpen(false)
  }

  function eliminar(id: string) {
    if (!confirm("Eliminar proveedor?")) return
    proveedores.delete(id); cargar()
  }

  function toggleCategoria(cat: CategoriaProveedor) {
    setForm(f => ({
      ...f,
      categorias: f.categorias.includes(cat)
        ? f.categorias.filter(c => c !== cat)
        : [...f.categorias, cat],
    }))
  }

  const setS = (k: string, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }))

  const filtrada = lista.filter(p => {
    if (filtroCategoria !== "todos" && !p.categorias.includes(filtroCategoria)) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return p.nombre.toLowerCase().includes(q) || p.pais.toLowerCase().includes(q) || p.productos.toLowerCase().includes(q)
    }
    return true
  })

  const provStats = [
    { label: "Total", value: lista.length },
    { label: "Activos", value: lista.filter(p => p.activo).length, color: "#0891b2" },
  ]

  return (
    <PageShell
      icon={Building2}
      title="Proveedores"
      subtitle="Registro de proveedores nacionales e internacionales"
      color="#2dd4bf"
      stats={provStats}
      actions={<button className="btn-accent" onClick={() => abrir()}><Plus size={14} /> Nuevo Proveedor</button>}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <Input placeholder="Buscar proveedor, pais, producto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} className="w-56 h-8 text-sm" />
        <button onClick={() => setFiltroCategoria("todos")} className={`filter-pill${filtroCategoria === "todos" ? " active" : ""}`}>Todos</button>
        {categorias.map(c => (
          <button key={c.value} onClick={() => setFiltroCategoria(c.value)} className={`filter-pill${filtroCategoria === c.value ? " active" : ""}`}>
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 overflow-y-auto flex-1">
        {filtrada.length === 0 && (
          <div className="col-span-3 py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            No hay proveedores registrados.
          </div>
        )}
        {filtrada.map(p => <ProveedorCard key={p.id} p={p} onEdit={() => abrir(p)} onDelete={() => eliminar(p.id)} />)}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editando ? "Editar Proveedor" : "Nuevo Proveedor"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1 col-span-2"><Label>Nombre *</Label><Input value={form.nombre} onChange={e => setS("nombre", e.target.value)} /></div>
              <div className="space-y-1"><Label>Pais *</Label><Input value={form.pais} onChange={e => setS("pais", e.target.value)} /></div>
              <div className="space-y-1"><Label>Ciudad</Label><Input value={form.ciudad ?? ""} onChange={e => setS("ciudad", e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Contacto</Label><Input value={form.contacto ?? ""} onChange={e => setS("contacto", e.target.value)} /></div>
              <div className="space-y-1"><Label>Telefono</Label><Input value={form.telefono ?? ""} onChange={e => setS("telefono", e.target.value)} /></div>
              <div className="space-y-1"><Label>Email</Label><Input value={form.email ?? ""} onChange={e => setS("email", e.target.value)} /></div>
              <div className="space-y-1"><Label>Sitio web</Label><Input value={form.sitioWeb ?? ""} onChange={e => setS("sitioWeb", e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Categorias</Label>
              <div className="flex flex-wrap gap-1.5">
                {categorias.map(c => {
                  const sel = form.categorias.includes(c.value)
                  return (
                    <button key={c.value} type="button" onClick={() => toggleCategoria(c.value)}
                      className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-all"
                      style={sel ? { background: c.color, color: "#111" } : { background: "var(--accent)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }}>
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1"><Label>Productos / servicios que provee</Label>
              <Textarea value={form.productos} onChange={e => setS("productos", e.target.value)} rows={2} placeholder="Ej: Bombas centrifugas, valvulas, filtros industriales" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Tiempo de entrega</Label>
                <Input value={form.tiempoEntrega ?? ""} onChange={e => setS("tiempoEntrega", e.target.value)} placeholder="Ej: 30-45 dias" /></div>
              <div className="space-y-1">
                <Label>Calificacion</Label>
                <div className="pt-1.5"><Stars value={form.calificacion ?? 0} onChange={v => setS("calificacion", v)} /></div>
              </div>
            </div>
            <div className="space-y-1"><Label>Notas</Label>
              <Textarea value={form.notas ?? ""} onChange={e => setS("notas", e.target.value)} rows={2} /></div>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
              <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Proveedor activo</span>
              <button type="button" onClick={() => setS("activo", !form.activo)}
                className="w-11 h-6 rounded-full transition-colors relative"
                style={{ background: form.activo ? "var(--primary)" : "var(--border)" }}>
                <span className="absolute top-0.5 transition-all w-5 h-5 rounded-full"
                  style={{ background: "white", left: form.activo ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>
            <Button className="w-full" onClick={guardar}>{editando ? "Guardar cambios" : "Crear proveedor"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageShell>
  )
}
