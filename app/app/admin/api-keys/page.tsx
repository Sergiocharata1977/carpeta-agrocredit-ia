"use client"

import { useEffect, useState } from "react"
import { getAuth } from "firebase/auth"
import { RoleGate } from "@/components/auth/RoleGate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Key, Plus, X, Copy, Check, AlertTriangle } from "lucide-react"
import type { ApiKeyPublic, ApiKeyScope } from "@/types/api-keys"
import { API_KEY_SCOPES } from "@/types/api-keys"

const SCOPE_LABELS: Record<ApiKeyScope, string> = {
  "producers:read": "Productores (lectura)",
  "producers:write": "Productores (escritura)",
  "credit_folders:read": "Carpetas (lectura)",
  "credit_folders:write": "Carpetas (escritura)",
  "documents:read": "Documentos (lectura)",
  "documents:write": "Documentos (escritura)",
  "financials:read": "Financieros (lectura)",
  "financials:write": "Financieros (escritura)",
}

async function getToken(): Promise<string> {
  const user = getAuth().currentUser
  if (!user) throw new Error("No autenticado")
  return user.getIdToken()
}

export default function AdminApiKeysPage() {
  return (
    <RoleGate allowedRoles={["admin_platform"]}>
      <ApiKeysPanel />
    </RoleGate>
  )
}

function ApiKeysPanel() {
  const [keys, setKeys] = useState<ApiKeyPublic[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newPlaintext, setNewPlaintext] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [revoking, setRevoking] = useState<string | null>(null)

  async function loadKeys() {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch("/api/api-keys", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadKeys()
  }, [])

  async function handleRevoke(keyId: string) {
    if (!confirm("¿Revocar esta API key? Esta acción no se puede deshacer.")) return
    setRevoking(keyId)
    try {
      const token = await getToken()
      await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
      await loadKeys()
    } finally {
      setRevoking(null)
    }
  }

  function handleCopy() {
    if (!newPlaintext) return
    navigator.clipboard.writeText(newPlaintext)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#f0ebff]">
            <Key className="h-5 w-5 text-[#6d28d9]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--brand-ink)]">API Keys</h1>
            <p className="text-sm text-[#59675f]">Gestión de claves para integración externa</p>
          </div>
        </div>
        <Button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
        >
          <Plus className="h-4 w-4" />
          Nueva API Key
        </Button>
      </div>

      {newPlaintext && (
        <div className="rounded-xl border border-[#fbbf24] bg-[#fffbeb] p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#d97706]" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[#92400e]">Guardá esta clave ahora</p>
              <p className="mt-1 text-sm text-[#78350f]">
                Esta es la única vez que se muestra. No se puede recuperar después.
              </p>
              <div className="mt-3 flex items-center gap-3">
                <code className="flex-1 overflow-auto rounded-lg bg-[#fef3c7] px-4 py-2 font-mono text-sm text-[#78350f]">
                  {newPlaintext}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="shrink-0 border-[#d97706] text-[#d97706]"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <button
              onClick={() => setNewPlaintext(null)}
              className="text-[#d97706] hover:text-[#92400e]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {showCreate && (
        <CreateKeyForm
          onClose={() => setShowCreate(false)}
          onCreated={(pt) => {
            setNewPlaintext(pt)
            setShowCreate(false)
            loadKeys()
          }}
        />
      )}

      <div className="ag-card overflow-hidden">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center text-[#8A93A0]">
            <Key className="mx-auto mb-3 h-8 w-8 opacity-40" />
            <p className="font-medium">No hay API keys configuradas</p>
            <p className="mt-1 text-sm">Creá una nueva key para habilitar integraciones externas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Scopes</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creada</TableHead>
                <TableHead>Último uso</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {key.scopes.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-[#f0ebff] px-2 py-0.5 text-[11px] font-semibold text-[#6d28d9]"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        key.status === "active"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {key.status === "active" ? "Activa" : "Revocada"}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-[#59675f]">
                    {key.createdAt ? new Date(key.createdAt).toLocaleDateString("es-AR") : "—"}
                  </TableCell>
                  <TableCell className="text-sm text-[#59675f]">
                    {key.lastUsedAt
                      ? new Date(key.lastUsedAt).toLocaleDateString("es-AR")
                      : "Nunca"}
                  </TableCell>
                  <TableCell>
                    {key.status === "active" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={revoking === key.id}
                        onClick={() => handleRevoke(key.id)}
                        className="text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        {revoking === key.id ? "Revocando…" : "Revocar"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}

function CreateKeyForm({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (plaintext: string) => void
}) {
  const [name, setName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<ApiKeyScope[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleScope(scope: ApiKeyScope) {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || selectedScopes.length === 0) return
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim(), scopes: selectedScopes }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear la API key")
        return
      }
      const data = await res.json()
      onCreated(data.plaintext)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ag-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-[var(--brand-ink)]">Nueva API Key</h2>
        <button onClick={onClose} className="text-[#8A93A0] hover:text-[#212529]">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-[#212529]">Nombre</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Portal Agro Biciuffa"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-[#212529]">Permisos (scopes)</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {API_KEY_SCOPES.map((scope) => (
              <button
                key={scope}
                type="button"
                onClick={() => toggleScope(scope)}
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition-colors ${
                  selectedScopes.includes(scope)
                    ? "border-[#6d28d9] bg-[#f0ebff] text-[#6d28d9]"
                    : "border-[#e4e8e3] bg-white text-[#5A6470] hover:border-[#a78bfa]"
                }`}
              >
                {SCOPE_LABELS[scope]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim() || selectedScopes.length === 0}
            className="bg-[#6d28d9] text-white hover:bg-[#5b21b6]"
          >
            {loading ? "Creando…" : "Crear API Key"}
          </Button>
        </div>
      </form>
    </div>
  )
}
