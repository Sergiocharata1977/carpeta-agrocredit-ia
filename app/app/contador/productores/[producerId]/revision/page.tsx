"use client"

import { useParams } from "next/navigation"
import { ReviewWorkbench } from "@/components/credito-hub/ReviewWorkbench"

export default function CreditoHubRevisionPage() {
  const { producerId } = useParams<{ producerId: string }>()
  return <ReviewWorkbench targetOrganizationId={producerId} />
}
