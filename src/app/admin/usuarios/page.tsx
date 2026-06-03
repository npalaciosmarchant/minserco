"use client"

import { useEffect, useState } from "react"
import { usuarios } from "@/lib/store"
import { useAuth } from "@/lib/auth"
import { Usuario, RolUsuario } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, ShieldCheck, HardHat, UserCheck, UserX, KeyRound } from "lucide-react"

const roles: { value: RolUsuario; label: string; color: string; icon: React.ElementType; acceso: string }[] = [
  {
    value: "admin",
    label: "Administrador",
    color: "#f59e0b",
    icon: ShieldCheck,
    acceso: "Acceso completo a todos los módulos",
  },
  {
    value: "tecnico",
    label: "Técnico",
    color: "#a78bfa",
    icon: HardHat,
    acceso: "Mantención, Reparación, Equipos en Terreno, Órdenes de Trabajo",
  },
]
const rolMap = Object.fromEntries(roles.map(r => [r.value, r]))

function emptyForm(): Omit<Usuario, "id" | "creadoEn"> {
  return { nombre: "", email: "", password: "", rol: "tecnico", activo: true }
}

export default function AdminUsuariosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [lista, setLista] = useState<Usuario[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState(emptyForm())
  const [showPass, setShowPass] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (user && user.rol !== "admin") { router.push("/"); return }
    cargar()
  }, [user])

  const cargar = () => setLista(usuarios.getAll())

  function abrir(u?: Usuario) {
    setErrorMsg("")
    if (u) {
      setEditando(u)
      const { id, creadoEn, ...r } = u
      setForm({ ...r, password: "" }) // don't pre-fill password
    } else {
      setEditando(null)
      setForm(emptyForm())
    }
    setOpen(true)
  }

  function guardar() {
    setErrorMsg("")
    if (!form.nombre.trim() || !form.email.trim()) {
      setErrorMsg("Nombre y email son obligatorios.")
      return
    }
    if (!editando && !form.password.trim()) {
      setErrorMsg("La contraseña es obligatoria para nuevos usuarios.")
      return
    }
    // Check email uniqueness
    const existing = usuarios.findByEmail(form.email.trim())
    if (existing && existing.id !== editando?.id) {
      setErrorMsg("Ya existe un usuario con ese email.")
      return
    }
    if (editando) {
      const changes: Partial<Usuario> = { nombre: form.nombre, email: form.email, rol: form.rol, activo: form.activo }
      if (form.password.trim()) changes.password = form.password.trim()
      usuarios.update(editando.id, changes)
    } else {
      usuarios.add({ ...form, email: form.email.trim(), password: form.password.trim() })
    }
    cargar()
    setOpen(false)
  }

  function toggleActivo(u: Usuario) {
    // Prevent deactivating self or last admin
    if (u.id === user?.id) return
    const admins = lista.filter(x => x.rol === "admin" && x.activo)
    if (u.rol === "admin" && admins.length === 1 && u.activo) return
    usuarios.update(u.id, { activo: !u.activo })
    cargar()
  }

  function eliminar(u: Usuario) {
    if (u.id === user?.id) return
    if (!confirm(`Eliminar usuario "${u.nombre}"?`)) return
    usuarios.delete(u.id)
    cargar()
  }

  const setS = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  const admins = lista.filter(u => u.rol === "admin")
  const tecnicosLista = lista.filter(u => u.rol === "tecnico")

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(245,158,11,0.15)" }}>
            <ShieldCheck size={18} style={{ color: "#f59e0b" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--foreground)" }}>
              Gestión de Usuarios
            </h1>
            <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {lista.length} usuario{lista.length !== 1 ? "s" : ""} · {lista.filter(u => u.activo).length} activo{lista.filter(u => u.activo).length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <Button onClick={() => abrir()}
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
          <Plus size={15} className="mr-1.5" /> Nuevo Usuario
        </Button>
      </div>

      {/* Role info cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {roles.map(r => {
          const Icon = r.icon
          const count = lista.filter(u => u.rol === r.value).length
          return (
            <div key={r.value} className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: "var(--card)", border: `1px solid ${r.color}30` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: r.color + "20" }}>
                <Icon size={20} style={{ color: r.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm" style={{ color: r.color }}>{r.label}</div>
                <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>{r.acceso}</div>
              </div>
              <div className="text-2xl font-bold shrink-0" style={{ color: r.color }}>{count}</div>
            </div>
          )
        })}
      </div>

      {/* Users list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {lista.length === 0 && (
          <div className="py-20 text-center text-sm" style={{ color: "var(--muted-foreground)" }}>
            No hay usuarios registrados.
          </div>
        )}
        {lista.map(u => {
          const r = rolMap[u.rol]
          const RolIcon = r.icon
          const esSelf = u.id === user?.id
          return (
            <div key={u.id} className="rounded-xl p-4 flex items-center gap-4"
              style={{ background: "var(--card)", border: "1px solid var(--border)", opacity: u.activo ? 1 : 0.55 }}>
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                style={{ background: r.color + "25", color: r.color }}>
                {u.nombre.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm" style={{ color: "var(--foreground)" }}>{u.nombre}</span>
                  {esSelf && <span className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "rgba(245,158,11,0.15)", color: "#f59e0b" }}>Tú</span>}
                </div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>{u.email}</div>
              </div>

              {/* Role badge */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium"
                  style={{ background: r.color + "20", color: r.color }}>
                  <RolIcon size={11} />{r.label}
                </span>
              </div>

              {/* Status + Actions */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => toggleActivo(u)}
                  disabled={esSelf}
                  title={u.activo ? "Desactivar" : "Activar"}
                  className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium transition-colors"
                  style={{
                    background: u.activo ? "rgba(45,212,191,0.15)" : "rgba(148,163,184,0.15)",
                    color: u.activo ? "#2dd4bf" : "#94a3b8",
                    cursor: esSelf ? "not-allowed" : "pointer",
                  }}>
                  {u.activo ? <UserCheck size={11} /> : <UserX size={11} />}
                  {u.activo ? "Activo" : "Inactivo"}
                </button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => abrir(u)}>
                  <Pencil size={13} />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400"
                  disabled={esSelf}
                  onClick={() => eliminar(u)}>
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editando ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nombre completo *</Label>
              <Input value={form.nombre} onChange={e => setS("nombre", e.target.value)} placeholder="Juan Pérez" />
            </div>
            <div className="space-y-1">
              <Label>Correo electrónico *</Label>
              <Input type="email" value={form.email} onChange={e => setS("email", e.target.value)} placeholder="usuario@minserco.cl" />
            </div>
            <div className="space-y-1">
              <Label>{editando ? "Nueva contraseña (dejar en blanco para no cambiar)" : "Contraseña *"}</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={e => setS("password", e.target.value)}
                  placeholder={editando ? "••••••••" : "Mínimo 6 caracteres"}
                  className="pr-10"
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted-foreground)" }}>
                  <KeyRound size={14} />
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {roles.map(r => {
                  const Icon = r.icon
                  const sel = form.rol === r.value
                  return (
                    <button key={r.value} type="button" onClick={() => setS("rol", r.value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all"
                      style={{
                        background: sel ? r.color + "20" : "var(--accent)",
                        border: `1px solid ${sel ? r.color : "var(--border)"}`,
                        color: sel ? r.color : "var(--muted-foreground)",
                      }}>
                      <Icon size={16} />
                      <div>
                        <div className="font-semibold text-xs">{r.label}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
              style={{ background: "var(--accent)", border: "1px solid var(--border)" }}>
              <div>
                <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Usuario activo</div>
                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Los usuarios inactivos no pueden ingresar</div>
              </div>
              <button type="button"
                onClick={() => setS("activo", !form.activo)}
                className="w-11 h-6 rounded-full transition-colors relative shrink-0"
                style={{ background: form.activo ? "var(--primary)" : "var(--border)" }}>
                <span className="absolute top-0.5 transition-all w-5 h-5 rounded-full"
                  style={{ background: "white", left: form.activo ? "calc(100% - 22px)" : "2px" }} />
              </button>
            </div>

            {errorMsg && (
              <div className="text-sm px-3 py-2 rounded-lg"
                style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)" }}>
                {errorMsg}
              </div>
            )}

            <Button className="w-full" onClick={guardar}>
              {editando ? "Guardar cambios" : "Crear usuario"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
