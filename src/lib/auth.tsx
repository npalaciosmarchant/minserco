"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { Usuario } from "./types"
import { getSupabase } from "./supabase"
import { syncFromSupabase } from "./store"

interface AuthContextType {
  user: Usuario | null
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => ({ ok: false }),
  logout: async () => {},
  loading: true,
})

// Mapeo módulo → ruta(s)
export const MODULO_A_RUTA: Record<string, string> = {
  mantenciones:  "/mantencion",
  reparaciones:  "/reparacion",
  clientes:      "/clientes",
  ordenes:       "/ordenes",
  gastos:        "/gastos",
  bodega:        "/bodega",
  importaciones: "/importacion",
  cotizaciones:  "/cotizaciones",
  arriendo:      "/arriendo",
  fabricacion:   "/fabricacion",
  proveedores:   "/proveedores",
  tecnicos:      "/tecnicos",
  reportes:      "/reportes",
  actividad:     "/actividad",
  calendario:    "/calendario",
  checklist:     "/checklist",
  mapa:          "/mapa",
  informes:      "/informes-entrega",
}

async function fetchPerfil(uid: string): Promise<Usuario | null> {
  const sb = getSupabase()
  const { data } = await sb
    .from("usuarios")
    .select("*")
    .eq("id", uid)
    .maybeSingle()
  if (!data) return null

  // Para técnicos, cargar permisos
  let permisos: string[] | undefined
  if (data.rol === "tecnico") {
    const { data: pData } = await sb
      .from("tecnico_permisos")
      .select("modulo_id, puede_ver")
      .eq("tecnico_id", uid)
    if (pData) {
      permisos = pData.filter(p => p.puede_ver).map(p => p.modulo_id)
    }
  }

  return {
    id:                   data.id,
    nombre:               data.nombre,
    email:                data.email,
    password:             "",
    rol:                  data.rol,
    activo:               data.activo,
    creadoEn:             data.creado_en,
    permisos,
    debeChangiarPassword: data.debe_cambiar_password ?? false,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const sb = getSupabase()

    // Timeout de seguridad: si en 6s no resuelve, desbloquear UI
    const timeout = setTimeout(() => setLoading(false), 6000)

    // Sesión activa al cargar
    sb.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const perfil = await fetchPerfil(session.user.id)
        setUser(perfil)
      }
    }).catch(console.error).finally(() => {
      clearTimeout(timeout)
      setLoading(false)
    })

    // Escuchar cambios de sesión (login/logout desde otra pestaña, expiración)
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const perfil = await fetchPerfil(session.user.id)
          setUser(perfil)
          syncFromSupabase().catch(console.warn)
        } else {
          setUser(null)
        }
      } catch (e) {
        console.error(e)
      } finally {
        clearTimeout(timeout)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password })
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    } catch (e) {
      return { ok: false, error: "Error de conexión con el servidor." }
    }
  }, [])

  const logout = useCallback(async () => {
    await getSupabase().auth.signOut()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

// Rutas accesibles por técnicos sin permisos asignados (fallback)
const TECNICO_RUTAS_DEFAULT = ["/mantencion", "/reparacion", "/clientes", "/ordenes", "/gastos", "/informes-entrega"]

export function canAccess(user: Usuario | null, pathname: string): boolean {
  if (!user) return false
  if (user.rol === "admin") return true

  const base = "/" + pathname.split("/")[1]

  // Si tiene permisos cargados, usarlos
  if (user.permisos !== undefined) {
    return user.permisos.some(modulo => {
      const ruta = MODULO_A_RUTA[modulo]
      return ruta && (base === ruta || pathname.startsWith(ruta + "/"))
    })
  }

  // Fallback: rutas por defecto
  return TECNICO_RUTAS_DEFAULT.some(r => pathname === r || pathname.startsWith(r + "/"))
}
