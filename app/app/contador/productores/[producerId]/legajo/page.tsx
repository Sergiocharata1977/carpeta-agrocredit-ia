"use client"

import { useParams } from "next/navigation"
import { MassUploadDropzone } from "@/components/credito-hub/MassUploadDropzone"
import { JobProgressList } from "@/components/credito-hub/JobProgressList"

export default function CreditoHubLegajoPage() {
  const { producerId } = useParams<{ producerId: string }>()
  return (
    <div className="space-y-4">
      <MassUploadDropzone targetOrganizationId={producerId} />
      <JobProgressList targetOrganizationId={producerId} />
    </div>
  )
}
