"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { FileText, FolderOpen, Landmark, UserRound } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProducerSubNavProps {
  producerId: string
}

const NAV_ITEMS = [
  { label: "Perfil", href: "", icon: UserRound },
  { label: "Carpeta contable", href: "/carpeta", icon: FolderOpen },
  { label: "Patrimonio", href: "/bienes", icon: Landmark },
  { label: "Documentos", href: "/documentos", icon: FileText },
] as const

export function ProducerSubNav({ producerId }: ProducerSubNavProps) {
  const pathname = usePathname()
  const baseHref = `/app/contador/productores/${producerId}`

  return (
    <nav className="overflow-x-auto border-b" aria-label="Secciones del productor">
      <div className="flex min-w-max gap-1">
        {NAV_ITEMS.map((item) => {
          const href = `${baseHref}${item.href}`
          const isRoot = item.href === ""
          const active = isRoot ? pathname === baseHref : pathname.startsWith(href)
          const Icon = item.icon

          return (
            <Link
              key={item.href || "perfil"}
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
