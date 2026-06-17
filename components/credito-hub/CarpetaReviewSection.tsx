"use client"

import { ClipboardCheck } from "lucide-react"
import { ReviewWorkbench } from "@/components/credito-hub/ReviewWorkbench"

interface CarpetaReviewSectionProps {
  targetOrganizationId: string
}

export function CarpetaReviewSection({ targetOrganizationId }: CarpetaReviewSectionProps) {
  return (
    <section className="space-y-4">
      <header className="space-y-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="h-5 w-5 text-[#0369a1]" />
          Revisión de campos (IA)
        </h2>
        <p className="text-sm text-muted-foreground">
          El contador confirma o corrige lo que la IA extrajo de la documentación. Cada
          confirmación forma parte de la validación del legajo.
        </p>
      </header>
      <ReviewWorkbench targetOrganizationId={targetOrganizationId} />
    </section>
  )
}
