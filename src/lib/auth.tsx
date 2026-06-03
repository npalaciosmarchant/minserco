"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { Usuario } from "./types"
<parameter name="content">"use client"

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

async function fetchPerfil(uid: string): Promise<Usuario | null> {
  const { data } = await getSupabase()
    .from("usuarios")
    .select("*")
    .eq("id", uid)
    .maybeSingle()
  if (!data) return null
  return {
    id:       data.id,
    nombre:   data.nombre,
    email:    data.email,
    password: "",
    rol:      data.rol,
    activo:   data.activo,
    creadoEn: data.creado_en,
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
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) return { ok: false, error: error.message }
    return { ok: true }
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

export const TECNICO_ROUTES = [
  "/mantencion", "/reparacion", "/clientes", "/ordenes",
  "/gastos", "/informes-entrega",
]

export function canAccess(user: Usuario | null, pathname: string): boolean {
  if (!user) return false
  if (user.rol === "admin") return true
  return TECNICO_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"))
}
