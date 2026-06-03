"use client"

import React from "react"

interface Stat {
  label: string
  value: string | number
  color?: string
}

interface PageShellProps {
  icon: React.ElementType
  title: string
  subtitle?: string
  color?: string
  stats?: Stat[]
  actions?: React.ReactNode
  children: React.ReactNode
}

export default function PageShell({
  icon: Icon,
  title,
  subtitle,
  color = "var(--ds-accent)",
  stats,
  actions,
  children,
}: PageShellProps) {
  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Page header */}
      <div
        className="shrink-0 px-6 py-4"
        style={{
          background: "var(--ds-surface)",
          borderBottom: "1px solid var(--ds-border)",
        }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">

          {/* Left: icon + title + stats */}
          <div className="flex items-center gap-4 flex-wrap min-w-0">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: color + "12",
                border: "1px solid " + color + "25",
              }}
            >
              <Icon size={18} strokeWidth={1.8} style={{ color }} />
            </div>

            {/* Title */}
            <div className="min-w-0">
              <h1
                className="text-[16px] font-bold leading-tight"
                style={{ color: "var(--ds-fg)" }}
              >
                {title}
              </h1>
              {subtitle && (
                <p
                  className="text-[11px] mt-0.5 leading-tight"
                  style={{ color: "var(--ds-fg-subtle)", fontFamily: "Fira Code, monospace" }}
                >
                  {subtitle}
                </p>
              )}
            </div>

            {/* Stats pills */}
            {stats && stats.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className="h-5 w-px" style={{ background: "var(--ds-border)" }} />
                {stats.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg"
                    style={{
                      background: (s.color ?? color) + "0D",
                      border: "1px solid " + (s.color ?? color) + "20",
                    }}
                  >
                    <span
                      className="text-[15px] font-bold leading-none"
                      style={{ color: s.color ?? color, fontFamily: "Fira Code, monospace" }}
                    >
                      {s.value}
                    </span>
                    <span
                      className="text-[11px] font-medium"
                      style={{ color: "var(--ds-fg-muted)" }}
                    >
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          {actions && (
            <div className="flex items-center gap-2 shrink-0">{actions}</div>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        className="flex-1 overflow-auto p-6"
        style={{ background: "var(--ds-bg)" }}
      >
        {children}
      </div>
    </div>
  )
}
