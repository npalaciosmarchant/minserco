"use client"

import { useEffect, useState, type ElementType } from "react"
import { getSupabase } from "@/lib/supabase"
import { HardDrive, Image as ImageIcon, Database } from "lucide-react"

const MB = 1048576
const GB = 1073741824
const LIMITE_FOTOS = 1 * GB    // 1 GB (plan gratis)
const LIMITE_DB = 500 * MB     // 500 MB (plan gratis)

type Uso = { fotos_bytes: number; fotos_count: number; db_bytes: number }

function fmt(bytes: number): string {
  if (bytes < MB) return (bytes / 1024).toFixed(0) + " KB"
  if (bytes < GB) return (bytes / MB).toFixed(1) + " MB"
  return (bytes / GB).toFixed(2) + " GB"
}
function colorPct(pct: number): string {
  if (pct >= 90) return "#dc2626"
  if (pct >= 70) return "#d97706"
  return "#059669"
}

function Barra({ label, Icon, used, limit, extra }: { label: string; Icon: ElementType; used: number; limit: number; extra?: string }) {
  const pct = Math.min(100, (used / limit) * 100)
  const c = colorPct(pct)
  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon size={13} style={{ color: c }} />
          <span className="text-[12px] font-semibold" style={{ color: "var(--ds-fg)" }}>{label}</span>
        </div>
        <span className="text-[11px]" style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}>
          {fmt(used)} / {fmt(limit)}{extra ? " · " + extra : ""}
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--ds-muted)" }}>
        <div className="h-full rounded-full" style={{ width: pct + "%", background: c, transition: "width 500ms cubic-bezier(0.16,1,0.3,1)" }} />
      </div>
      <div className="text-[10px] mt-1 font-medium" style={{ color: c }}>{pct.toFixed(pct < 1 ? 1 : 0)}% usado</div>
    </div>
  )
}

export function StorageMeter() {
  const [uso, setUso] = useState<Uso | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getSupabase().rpc("uso_almacenamiento")
        if (data) setUso(data as Uso)
      } catch { /* silencioso: no bloquear el panel */ }
    })()
  }, [])

  if (!uso) return null

  return (
    <div className="ds-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "#eef2ff" }}>
          <HardDrive size={13} style={{ color: "#1a3673" }} />
        </div>
        <span className="text-[13px] font-semibold" style={{ color: "var(--ds-fg)" }}>Almacenamiento</span>
      </div>
      <div className="flex flex-col sm:flex-row gap-6">
        <Barra label="Fotos" Icon={ImageIcon} used={uso.fotos_bytes} limit={LIMITE_FOTOS} extra={uso.fotos_count + " fotos"} />
        <Barra label="Base de datos" Icon={Database} used={uso.db_bytes} limit={LIMITE_DB} />
      </div>
    </div>
  )
}
