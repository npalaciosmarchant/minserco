"use client"

import React from "react"
import { LucideIcon } from "lucide-react"

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  /** "page" = ocupa toda el área, "inline" = más compacto para dentro de cards */
  variant?: "page" | "inline"
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  variant = "page",
}: EmptyStateProps) {
  const isPad = variant === "page"

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{ padding: isPad ? "64px 24px" : "40px 24px" }}
    >
      {/* Ícono con fondo */}
      <div
        className="flex items-center justify-center rounded-2xl mb-4"
        style={{
          width: isPad ? "64px" : "52px",
          height: isPad ? "64px" : "52px",
          background: "var(--ds-muted)",
          border: "1px solid var(--ds-border)",
        }}
      >
        <Icon
          size={isPad ? 28 : 22}
          strokeWidth={1.5}
          style={{ color: "var(--ds-fg-subtle)" }}
        />
      </div>

      {/* Texto */}
      <h3
        className="font-semibold mb-1"
        style={{
          fontSize: isPad ? "15px" : "13px",
          color: "var(--ds-fg)",
        }}
      >
        {title}
      </h3>

      {description && (
        <p
          className="mb-5 max-w-xs leading-relaxed"
          style={{
            fontSize: isPad ? "13px" : "12px",
            color: "var(--ds-fg-subtle)",
          }}
        >
          {description}
        </p>
      )}

      {action && (
        <div>{action}</div>
      )}
    </div>
  )
}
