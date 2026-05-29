"use client"

import { ArrowLeft, CheckCircle2, Loader2, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { accountantSelectionSchema } from "@/lib/schemas/onboarding"
import { getIdToken } from "@/lib/firebase/auth-client"
import { cn } from "@/lib/utils"

interface AccountingFirmOption {
  id: string
  legalName: string
  taxId: string
  contactName?: string | null
  province?: string | null
  city?: string | null
}

interface AccountantSelectionStepProps {
  selectedFirmId?: string
  loading?: boolean
  onBack: () => void
  onFinish: (accountant?: { accountingFirmId: string }) => void
}

export function AccountantSelectionStep({
  selectedFirmId,
  loading,
  onBack,
  onFinish,
}: AccountantSelectionStepProps) {
  const [query, setQuery] = useState("")
  const [selected, setSelected] = useState<string | undefined>(selectedFirmId)
  const [results, setResults] = useState<AccountingFirmOption[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function searchFirms(search: string) {
    setIsSearching(true)
    setError(null)
    try {
      const token = await getIdToken()
      const params = new URLSearchParams({
        type: "accounting_firm",
        limit: "12",
      })
      if (search.trim()) params.set("search", search.trim())

      const response = await fetch(`/api/organizations?${params.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "No se pudo buscar estudios contables")
      }

      const payload = (await response.json()) as { organizations: AccountingFirmOption[] }
      setResults(payload.organizations)
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "Error al buscar estudios")
    } finally {
      setIsSearching(false)
    }
  }

  useEffect(() => {
    void searchFirms("")
  }, [])

  function finishWithSelection() {
    if (!selected) return
    const accountant = accountantSelectionSchema.parse({ accountingFirmId: selected })
    onFinish({ accountingFirmId: accountant.accountingFirmId })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contador asociado</CardTitle>
        <p className="text-sm text-muted-foreground">
          Selecciona el estudio contable que va a recibir el pedido de vinculo. Tambien podes terminar sin contador.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="accountingFirmSearch">Buscar por nombre o CUIT</Label>
          <div className="flex gap-2">
            <Input
              id="accountingFirmSearch"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ej: Estudio Perez o 307..."
            />
            <Button type="button" variant="outline" onClick={() => searchFirms(query)} disabled={isSearching}>
              {isSearching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              <span className="sr-only">Buscar</span>
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="grid gap-3">
          {results.map((firm) => {
            const isSelected = selected === firm.id
            return (
              <button
                key={firm.id}
                type="button"
                className={cn(
                  "flex min-h-20 items-center justify-between gap-4 rounded-md border p-4 text-left transition-colors",
                  isSelected
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                    : "border-border hover:bg-muted/60",
                )}
                onClick={() => setSelected(firm.id)}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{firm.legalName}</span>
                  <span className="block text-xs text-muted-foreground">
                    CUIT {firm.taxId}
                    {firm.city || firm.province ? ` - ${[firm.city, firm.province].filter(Boolean).join(", ")}` : ""}
                  </span>
                  {firm.contactName && (
                    <span className="block text-xs text-muted-foreground">Contacto: {firm.contactName}</span>
                  )}
                </span>
                {isSelected && <CheckCircle2 className="size-5 shrink-0 text-[var(--brand-primary)]" />}
              </button>
            )
          })}
          {!isSearching && results.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
              No hay estudios contables para mostrar con ese criterio.
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button type="button" variant="outline" onClick={onBack} disabled={loading}>
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" disabled={loading} onClick={() => onFinish(undefined)}>
              Terminar sin contador
            </Button>
            <Button type="button" disabled={!selected || loading} onClick={finishWithSelection}>
              {loading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Finalizar registro
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
