"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Usuario, RolUsuario } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2, ShieldCheck, HardHat, Eye, UserCheck, UserX, KeyRound, Settings2, RefreshCw } from "lucide-react"
import { getSupabase } from "@/lib/supabase"
import { PermisosForm } from "@/components/PermisosForm"

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
    acceso: "Acceso según permisos asignados",
  },
  {
    value: "supervisor",
    label: "Supervisor",
    color: "#22c55e",
    icon: Eye,
    acceso: "Supervisa actividades y recibe alertas",
  },
]
const rolMap = Object.fromEntries(roles.map(r => [r.value, r]))

function emptyForm(): Omit<Usuario, "id" | "creadoEn"> & { forzarCambio: boolean } {
  return { nombre: "", email: "", telefono: "", password: "", rol: "tecnico", activo: true, forzarCambio: true }
}

export default function AdminUsuariosPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [lista, setLista] = useState<Usuario[]>([])
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Usuario | null>(null)
  const [form, setForm] = useState<ReturnType<typeof emptyForm>>(emptyForm())
  const [showPass, setShowPass] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")
  const [permisosUsuario, setPermisosUsuario] = useState<Usuario | null>(null)

  useEffect(() => {
    if (user && user.rol !== "admin") { router.push("/"); return }
    cargar()
  }, [user])

  const cargar = async () => {
    const { data } = await getSupabase().from("usuarios").select("*").order("creado_en", { ascending: true })
    if (data) {
      setLista((data as Record<string, unknown>[]).map(u => ({
        id: u.id as string,
        nombre: (u.nombre as string) ?? "",
        email: (u.email as string) ?? "",
        telefono: (u.telefono as string) ?? "",
        password: "",
        rol: (u.rol as RolUsuario) ?? "tecnico",
        activo: (u.activo as boolean) ?? true,
        creadoEn: (u.creado_en as string) ?? "",
        debeChangiarPassword: (u.debe_cambiar_password as boolean) ?? false,
      })))
    }
  }

  function abrir(u?: Usuario) {
    setErrorMsg("")
    if (u) {
      setEditando(u)
      const { id, creadoEn, ...r } = u
      setForm({ ...r, password: "", forzarCambio: false })
    } else {
      setEditando(null)
      setForm(emptyForm())
    }
    setOpen(true)
  }

  async function guardar() {
    setErrorMsg("")
    if (!form.nombre.trim() || !form.email.trim()) {
      setErrorMsg("Nombre y email son obligatorios.")
      return
    }
    if (!editando && !form.password.trim()) {
      setErrorMsg("La contraseña es obligatoria para nuevos usuarios.")
      return
    }
    const existing = lista.find(u => u.email.toLowerCase() === form.email.trim().toLowerCase())
    if (existing && existing.id !== editando?.id) {
      setErrorMsg("Ya existe un usuario con ese email.")
      return
    }
    try {
      const sb = getSupabase()
      const payload = editando
        ? { action: "update", id: editando.id, nombre: form.nombre, email: form.email, telefono: form.telefono, rol: form.rol, activo: form.activo, password: form.password.trim() || undefined }
        : { action: "create", nombre: form.nombre.trim(), email: form.email.trim(), telefono: (form.telefono ?? "").trim(), password: form.password.trim(), rol: form.rol, activo: form.activo, debeChangiar: form.forzarCambio }
      const { data, error } = await sb.functions.invoke("admin-usuarios", { body: payload })
      const err = (data && (data as { error?: string }).error) || error?.message
      if (err) { setErrorMsg(err); return }
      await cargar()
      setOpen(false)
    } catch (e) {
      setErrorMsg("Error de conexión: " + String(e))
    }
  }

  async function toggleActivo(u: Usuario) {
    if (u.id === user?.id) return
    const admins = lista.filter(x => x.rol === "admin" && x.activo)
    if (u.rol === "admin" && admins.length === 1 && u.activo) return
    await getSupabase().functions.invoke("admin-usuarios", { body: { action: "update", id: u.id, activo: !u.activo } })
    await cargar()
  }

  async function eliminar(u: Usuario) {
    if (u.id === user?.id) return
    if (!confirm(`Eliminar usuario "${u.nombre}"?`)) return
    await getSupabase().functions.invoke("admin-usuarios", { body: { action: "delete", id: u.id } })
    await cargar()
  }

  const setS = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

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

                {/* Botón permisos — solo para técnicos */}
                {u.rol === "tecnico" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Gestionar permisos"
                    onClick={() => setPermisosUsuario(u)}
                  >
                    <Settings2 size={13} />
                  </Button>
                )}

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

      {/* Dialog crear/editar usuario */}
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
              <Label>Teléfono (WhatsApp)</Label>
              <Input type="tel" value={form.telefono ?? ""} onChange={e => setS("telefono", e.target.value)} placeholder="+56912345678" />
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
              <div className="grid grid-cols-3 gap-2 mt-1">
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

            {/* Forzar cambio contraseña — solo para nuevos usuarios */}
            {!editando && (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)" }}>
                <div className="flex items-center gap-2">
                  <RefreshCw size={13} style={{ color: "#a78bfa" }} />
                  <div>
                    <div className="text-sm font-medium" style={{ color: "var(--foreground)" }}>Forzar cambio de contraseña</div>
                    <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>El usuario deberá cambiarla en su primer acceso</div>
                  </div>
                </div>
                <button type="button"
                  onClick={() => setForm(f => ({ ...f, forzarCambio: !f.forzarCambio }))}
                  className="w-11 h-6 rounded-full transition-colors relative shrink-0"
                  style={{ background: form.forzarCambio ? "#a78bfa" : "var(--border)" }}>
                  <span className="absolute top-0.5 transition-all w-5 h-5 rounded-full"
                    style={{ background: "white", left: form.forzarCambio ? "calc(100% - 22px)" : "2px" }} />
                </button>
              </div>
            )}

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

      {/* Dialog permisos */}
      <Dialog open={!!permisosUsuario} onOpenChange={v => { if (!v) setPermisosUsuario(null) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 size={16} style={{ color: "#a78bfa" }} />
              Permisos — {permisosUsuario?.nombre}
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs mb-3" style={{ color: "var(--muted-foreground)" }}>
            Activa o desactiva el acceso a cada módulo. Los cambios se guardan automáticamente en Supabase.
          </p>
          {permisosUsuario && <PermisosForm tecnicoId={permisosUsuario.id} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
