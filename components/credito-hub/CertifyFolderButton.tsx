"use client"

import { useState } from "react"
import { ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { getFreshIdToken } from "@/lib/firebase/auth-client"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CertifyFolderButtonProps {
  targetOrganizationId: string
  onCertified?: () => void
}

export function CertifyFolderButton({ targetOrganizationId, onCertified }: CertifyFolderButtonProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    if (loading) return
    setLoading(true)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo validar la sesión")
      const res = await fetch(
        `/api/credito-hub/certification/${encodeURIComponent(targetOrganizationId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ scope: "full_folder" }),
        },
      )
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) throw new Error(data.error ?? "No se pudo certificar la carpeta")
      toast.success("Carpeta certificada correctamente")
      setOpen(false)
      onCertified?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo certificar la carpeta")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button className="gap-2" onClick={() => setOpen(true)}>
        <ShieldCheck className="h-4 w-4" />
        Validar y certificar
      </Button>

      <Dialog open={open} onOpenChange={(next) => !loading && setOpen(next)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              Certificar carpeta
            </DialogTitle>
            <DialogDescription>
              Estás certificando profesionalmente esta carpeta. Quedará un sello visible para el
              financista.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={loading} className="gap-2">
              <ShieldCheck className="h-4 w-4" />
              {loading ? "Certificando…" : "Confirmar certificación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
