"use client"
import { useState } from "react"

export type DateRange = { from: string; to: string }

const PRESETS = [
  { label: "Hoy",        days: 0 },
  { label: "7 días",     days: 7 },
  { label: "30 días",    days: 30 },
  { label: "Este mes",   days: -1 },
  { label: "Todo",       days: -2 },
]

function getRange(days: number): DateRange {
  const now = new Date()
  const to = now.toISOString().slice(0, 10)
  if (days === 0) return { from: to, to }
  if (days === -2) return { from: "", to: "" }
  if (days === -1) {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    return { from, to }
  }
  const from = new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10)
  return { from, to }
}

export function filterByDate<T extends { creadoEn: string }>(items: T[], range: DateRange): T[] {
  if (!range.from && !range.to) return items
  return items.filter(i => {
    const d = i.creadoEn.slice(0, 10)
    if (range.from && d < range.from) return false
    if (range.to && d > range.to) return false
    return true
  })
}

interface Props {
  onChange: (range: DateRange) => void
}

export default function DateFilter({ onChange }: Props) {
  const [active, setActive] = useState(4) // "Todo" by default

  function select(idx: number) {
    setActive(idx)
    onChange(getRange(PRESETS[idx].days))
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {PRESETS.map((p, i) => (
        <button key={p.label} onClick={() => select(i)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border"
          style={active === i
            ? { background: "#1a3673", color: "#fff", borderColor: "#1a3673" }
            : { background: "#fff", color: "#6b7280", borderColor: "#e5e7eb" }}>
          {p.label}
        </button>
      ))}
    </div>
  )
}
