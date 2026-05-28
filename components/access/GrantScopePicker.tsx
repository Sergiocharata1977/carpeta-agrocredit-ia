"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import type { AccessScope } from "@/types/access"

export const ACCESS_SCOPE_OPTIONS: Array<{ value: AccessScope; label: string }> = [
  { value: "profile_basic", label: "Perfil basico" },
  { value: "accounting_summary", label: "Resumen contable" },
  { value: "balance_sheets", label: "Balances" },
  { value: "income_statements", label: "Estados de resultados" },
  { value: "tax_documents", label: "Documentacion fiscal" },
  { value: "assets", label: "Bienes" },
  { value: "liabilities", label: "Deudas" },
  { value: "documents", label: "Documentos" },
  { value: "full_credit_folder", label: "Carpeta completa" },
]

interface GrantScopePickerProps {
  value: AccessScope[]
  onChange: (value: AccessScope[]) => void
  allowedScopes?: AccessScope[]
  disabled?: boolean
}

export function GrantScopePicker({
  value,
  onChange,
  allowedScopes,
  disabled = false,
}: GrantScopePickerProps) {
  function toggleScope(scope: AccessScope, checked: boolean) {
    if (checked) {
      onChange([...new Set([...value, scope])])
      return
    }

    onChange(value.filter((item) => item !== scope))
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {ACCESS_SCOPE_OPTIONS.map((scope) => {
        const isAllowed = !allowedScopes || allowedScopes.includes(scope.value)
        return (
          <Label
            key={scope.value}
            className="flex items-center gap-2 rounded-md border p-3 text-sm"
          >
            <Checkbox
              checked={value.includes(scope.value)}
              disabled={disabled || !isAllowed}
              onCheckedChange={(checked) => toggleScope(scope.value, checked === true)}
            />
            <span className={!isAllowed ? "text-muted-foreground" : undefined}>
              {scope.label}
            </span>
          </Label>
        )
      })}
    </div>
  )
}
