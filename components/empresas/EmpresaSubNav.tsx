"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FolderOpen, Landmark, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmpresaSubNavProps {
  empresaId: string
}

const NAV_ITEMS = [
  { label: "Carpeta contable", href: "/carpeta", icon: FolderOpen },
  { label: "Impuestos",        href: "/impuestos", icon: Receipt },
  { label: "Bienes y Pasivos", href: "/bienes",    icon: Landmark },
] as const

export function EmpresaSubNav({ empresaId }: EmpresaSubNavProps) {
  const pathname = usePathname()
  const baseHref = `/app/contador/empresas/${empresaId}`

  return (
    <nav className="overflow-x-auto border-b" aria-label="Secciones de la empresa">
      <div className="flex min-w-max gap-1">
        {NAV_ITEMS.map((item) => {
          const href = `${baseHref}${item.href}`
          const active = pathname.startsWith(href)
          const Icon = item.icon

          return (
            <Link
              key={item.href}
              href={href}
              className={cn(
                "inline-flex h-10 items-center gap-2 border-b-2 px-3 text-sm font-medium transition-colors",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
