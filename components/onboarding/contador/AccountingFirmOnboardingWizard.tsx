"use client"

import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { loginAdmin, getFreshIdToken } from "@/lib/firebase/auth-client"
import { postJson, StepIndicator } from "@/components/onboarding/shared"
import {
  RegistrationAccountStep,
  type AccountStepValues,
} from "@/components/onboarding/RegistrationAccountStep"
import {
  AccountingFirmForm,
  type AccountingFirmValues,
} from "@/components/onboarding/contador/AccountingFirmForm"
import { WizardSuccessContador } from "@/components/onboarding/contador/WizardSuccessContador"

const STEPS = [
  { id: 1, label: "Cuenta" },
  { id: 2, label: "Estudio" },
]

interface OnboardingResponse {
  organizationId: string
}

export function AccountingFirmOnboardingWizard() {
  const [step, setStep] = useState(1)
  const [registration, setRegistration] = useState<AccountStepValues | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [firm, setFirm] = useState<AccountingFirmValues | null>(null)
  const [createdOrganizationId, setCreatedOrganizationId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleRegistration(values: AccountStepValues) {
    setLoading(true)
    setError(null)
    try {
      if (registeredEmail !== values.email) {
        await postJson<{ uid: string; email: string }>("/api/auth/register", {
          ...values,
          role: "accountant",
        })
      }

      await loginAdmin(values.email, values.password)
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se pudo iniciar sesion con la cuenta creada")

      setRegistration(values)
      setRegisteredEmail(values.email)
      setStep(2)
    } catch (registrationError) {
      setError(registrationError instanceof Error ? registrationError.message : "No se pudo crear la cuenta")
    } finally {
      setLoading(false)
    }
  }

  async function finishOnboarding(values: AccountingFirmValues) {
    setFirm(values)
    setLoading(true)
    setError(null)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se encontro una sesion activa")

      const response = await postJson<OnboardingResponse>(
        "/api/onboarding/accounting-firm",
        { firm: values },
        token,
      )

      await getFreshIdToken()
      setCreatedOrganizationId(response.organizationId)
    } catch (onboardingError) {
      setError(onboardingError instanceof Error ? onboardingError.message : "No se pudo finalizar el registro")
    } finally {
      setLoading(false)
    }
  }

  if (createdOrganizationId) {
    return <WizardSuccessContador organizationId={createdOrganizationId} />
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--brand-primary)]">Registro de contador</p>
        <h1 className="text-3xl font-semibold tracking-tight">Alta de estudio contable</h1>
        <p className="text-muted-foreground">
          Crea tu usuario y registra el estudio que va a administrar carpetas y vinculos.
        </p>
      </div>

      <StepIndicator steps={STEPS} currentStep={step} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <RegistrationAccountStep
          title="Datos personales"
          description="Esta cuenta queda asociada al estudio contable."
          defaultValues={registration ?? undefined}
          loading={loading}
          onSubmit={handleRegistration}
        />
      )}

      {step === 2 && (
        <AccountingFirmForm
          defaultValues={firm ?? undefined}
          loading={loading}
          onBack={() => setStep(1)}
          onSubmit={finishOnboarding}
        />
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Los clientes nuevos se vinculan por producer_accountant_links, pero sus datos viven en organizations como
          system_user.
        </CardContent>
      </Card>
    </div>
  )
}
