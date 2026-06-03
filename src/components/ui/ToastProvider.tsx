"use client"

import { createContext, useContext, useState, useCallback, ReactNode } from "react"
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react"

type ToastType = "success" | "error" | "info" | "warning"

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (opts: { type?: ToastType; title: string; message?: string }) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const cfg: Record<ToastType, { icon: typeof CheckCircle2; color: string; bg: string; border: string }> = {
  success: { icon: CheckCircle2, color: "#059669", bg: "rgba(5,150,105,0.06)",   border: "rgba(5,150,105,0.20)" },
  error:   { icon: AlertCircle,  color: "#DC2626", bg: "rgba(220,38,38,0.06)",   border: "rgba(220,38,38,0.20)" },
  info:    { icon: Info,         color: "#0369A1", bg: "rgba(3,105,161,0.06)",   border: "rgba(3,105,161,0.20)" },
  warning: { icon: AlertTriangle,color: "#D97706", bg: "rgba(217,119,6,0.06)",   border: "rgba(217,119,6,0.20)" },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const toast = useCallback(({ type = "info", title, message }: { type?: ToastType; title: string; message?: string }) => {
    add(type, title, message)
  }, [add])

  return (
    <ToastContext.Provider value={{
      toast,
      success: (t, m) => add("success", t, m),
      error:   (t, m) => add("error",   t, m),
      info:    (t, m) => add("info",    t, m),
      warning: (t, m) => add("warning", t, m),
    }}>
      {children}

      {/* Toast container */}
      <div
        className="fixed z-[999] flex flex-col gap-2"
        style={{ bottom: "24px", right: "24px", width: "340px", pointerEvents: "none" }}
        aria-live="polite"
      >
        {toasts.map(t => {
          const { icon: Icon, color, bg, border } = cfg[t.type]
          return (
            <div
              key={t.id}
              className="flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{
                background: "#FFFFFF",
                border: "1px solid " + border,
                boxShadow: "0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
                animation: "fade-in-up 250ms var(--ease-out) both",
                pointerEvents: "all",
              }}
            >
              {/* Colored left bar */}
              <div
                className="shrink-0 mt-0.5"
                style={{
                  width: "3px", height: "100%", minHeight: "36px",
                  background: color,
                  position: "absolute", left: 0, top: 0, bottom: 0,
                  borderRadius: "12px 0 0 12px",
                }}
              />

              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: bg }}
              >
                <Icon size={14} style={{ color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold leading-tight" style={{ color: "var(--ds-fg)" }}>
                  {t.title}
                </p>
                {t.message && (
                  <p className="text-[11px] mt-0.5 leading-snug" style={{ color: "var(--ds-fg-subtle)" }}>
                    {t.message}
                  </p>
                )}
              </div>

              <button
                onClick={() => dismiss(t.id)}
                className="shrink-0 p-0.5 rounded"
                style={{ color: "var(--ds-fg-subtle)", transition: "color 150ms" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--ds-fg)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--ds-fg-subtle)"}
                aria-label="Cerrar"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used within ToastProvider")
  return ctx
}
