import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SystemUserOnboardingWizard } from "@/components/onboarding/usuario/SystemUserOnboardingWizard"

export default function RegistroUsuarioPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-surface)] px-4 py-8">
      <div className="mx-auto mb-6 w-full max-w-4xl">
        <Button asChild variant="ghost" size="sm">
          <Link href="/registro">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </div>
      <SystemUserOnboardingWizard />
    </main>
  )
}
