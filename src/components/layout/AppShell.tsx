"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AuthProvider, useAuth, canAccess } from "@/lib/auth"
import Topbar from "./Topbar"
import { ToastProvider } from "@/components/ui/ToastProvider"
import NavDrawer from "./NavDrawer"

function Guard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [drawerOpen, setDrawerOpen] = useState(false)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])
  const toggleDrawer = useCallback(() => setDrawerOpen(v => !v), [])

  useEffect(() => {
    if (loading) return
    if (!user) {
      if (pathname !== "/login") router.push("/login")
      return
    }
    if (pathname === "/login") { router.push("/"); return }
    if (!canAccess(user, pathname)) router.push("/mantencion")
  }, [user, loading, pathname])

  // Cierra drawer al cambiar de ruta
  useEffect(() => { setDrawerOpen(false) }, [pathname])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-[#0e1a35]">
        <div className="flex gap-1.5">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-amber-400"
              style={{ animation: "pulse 1.4s cubic-bezier(0.16,1,0.3,1) infinite", animationDelay: i * 0.18 + "s" }} />
          ))}
        </div>
        <p className="text-[13px] text-white/40 tracking-wider uppercase">Cargando sistema</p>
      </div>
    )
  }

  if (!user || pathname === "/login") return <>{children}</>

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f4f8]">
      {/* Topbar fijo */}
      <Topbar onMenuToggle={toggleDrawer} menuOpen={drawerOpen} />

      {/* Nav drawer overlay */}
      <NavDrawer open={drawerOpen} onClose={closeDrawer} />

      {/* Contenido principal */}
      <main className="flex-1 overflow-auto" style={{ paddingTop: "60px" }}>
        <div key={pathname} className="page-enter min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ToastProvider>
        <Guard>{children}</Guard>
      </ToastProvider>
    </AuthProvider>
  )
}
