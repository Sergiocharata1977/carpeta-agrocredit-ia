"use client"

import { Sparkles } from "lucide-react"
import { MassUploadDropzone } from "@/components/credito-hub/MassUploadDropzone"
import { JobProgressList } from "@/components/credito-hub/JobProgressList"

interface CarpetaUploadSectionProps {
  targetOrganizationId: string
  onUploaded?: () => void
}

export function CarpetaUploadSection({ targetOrganizationId, onUploaded }: CarpetaUploadSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-[#0369a1]" />
        <div>
          <h2 className="text-base font-semibold">Carga de documentos (IA)</h2>
          <p className="text-sm text-muted-foreground">
            Subí PDF, imágenes, Excel o ZIP. La IA clasifica cada documento y prellena el legajo
            automáticamente.
          </p>
        </div>
      </div>
      <MassUploadDropzone targetOrganizationId={targetOrganizationId} onUploaded={onUploaded} />
      <JobProgressList targetOrganizationId={targetOrganizationId} />
    </section>
  )
}
