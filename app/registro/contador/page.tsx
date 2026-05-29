import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AccountingFirmOnboardingWizard } from "@/components/onboarding/contador/AccountingFirmOnboardingWizard"

export default function RegistroContadorPage() {
  return (
    <main className="min-h-screen bg-[var(--brand-surface)] px-4 py-8">
      <div className="mx-auto mb-6 w-full max-w-3xl">
        <Button asChild variant="ghost" size="sm">
          <Link href="/registro">
            <ArrowLeft className="mr-2 size-4" />
            Volver
          </Link>
        </Button>
      </div>
      <AccountingFirmOnboardingWizard />
    </main>
  )
}
