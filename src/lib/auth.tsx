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
    let mounted = true

    // Timeout de seguridad: máximo 4s de pantalla de carga
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false)
    }, 4000)

    // onAuthStateChange maneja INITIAL_SESSION (sesión al cargar),
    // SIGNED_IN, TOKEN_REFRESHED, SIGNED_OUT, etc.
    const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
      try {
        if (session?.user) {
          const perfil = await fetchPerfil(session.user.id)
          if (!mounted) return
          setUser(perfil)
          // Sincronizar datos en segundo plano solo al ingresar
          if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
            syncFromSupabase().catch(console.warn)
          }
        } else {
          if (mounted) setUser(null)
        }
      } catch (e) {
        console.error("[auth]", e)
        if (mounted) setUser(null)
      } finally {
        clearTimeout(timeout)
        if (mounted) setLoading(false)
      }
    })

    return () => {
      mounted = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    try {
      // Timeout de 12s — si Supabase no responde, mostrar error en vez de colgar
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 12000)
      )
      const request = getSupabase().auth.signInWithPassword({ email, password })
      const { error } = await Promise.race([request, timeout]) as Awaited<typeof request>
      if (error) return { ok: false, error: error.message }
      return { ok: true }
    } catch (e: unknown) {
      const isTimeout = e instanceof Error && e.message === "timeout"
      return { ok: false, error: isTimeout
        ? "El servidor no responde. Verifica tu conexión o desactiva extensiones del navegador."
        : "Error de conexión con el servidor." }
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
