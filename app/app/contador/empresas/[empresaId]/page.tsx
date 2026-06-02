"use client"

import { use, useEffect } from "react"
import { useRouter } from "next/navigation"

interface PageProps {
  params: Promise<{ empresaId: string }>
}

export default function EmpresaPage({ params }: PageProps) {
  const { empresaId } = use(params)
  const router = useRouter()

  useEffect(() => {
    router.replace(`/app/contador/empresas/${empresaId}/carpeta`)
  }, [empresaId, router])

  return null
}
