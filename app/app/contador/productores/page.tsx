"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function ProductoresRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace("/app/contador/clientes")
  }, [router])
  return null
}
