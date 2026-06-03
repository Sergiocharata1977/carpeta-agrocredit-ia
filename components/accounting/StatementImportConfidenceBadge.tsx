"use client"

import type { FieldConfidence } from "@/types/statement-imports"

interface StatementImportConfidenceBadgeProps {
  confidence?: number
  source?: FieldConfidence["source"]
}

export function StatementImportConfidenceBadge({
  confidence,
  source,
}: StatementImportConfidenceBadgeProps) {
  const value = confidence ?? 0
  const pct = Math.round(value * 100)

  if (source === "manual") {
    return (
      <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
        Manual
      </span>
    )
  }

  const className =
    value >= 0.85
      ? "bg-emerald-50 text-emerald-700"
      : value >= 0.5
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700"

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>
      {source ?? "ia"} {pct}%
    </span>
  )
}
