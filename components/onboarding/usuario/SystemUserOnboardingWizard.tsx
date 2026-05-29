"use client"

import { useState } from "react"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent } from "@/components/ui/card"
import { loginAdmin, getFreshIdToken } from "@/lib/firebase/auth-client"
import type { AccountantSelectionStep as AccountantSelectionValues } from "@/types/onboarding"
import { postJson, StepIndicator } from "@/components/onboarding/shared"
import {
  RegistrationAccountStep,
  type AccountStepValues,
} from "@/components/onboarding/RegistrationAccountStep"
import {
  SystemUserOrganizationForm,
  type SystemUserOrgValues,
} from "@/components/onboarding/usuario/SystemUserOrganizationForm"
import {
  SystemUserEntitiesStep,
  type SystemUserEntityValues,
} from "@/components/onboarding/usuario/SystemUserEntitiesStep"
import { AccountantSelectionStep } from "@/components/onboarding/usuario/AccountantSelectionStep"
import { WizardSuccessUsuario } from "@/components/onboarding/usuario/WizardSuccessUsuario"

const STEPS = [
  { id: 1, label: "Cuenta" },
  { id: 2, label: "Empresa principal" },
  { id: 3, label: "Empresas hijas" },
  { id: 4, label: "Contador" },
]

interface OnboardingResponse {
  organizationId: string
  entityIds: string[]
  linkId: string | null
}

export function SystemUserOnboardingWizard() {
  const [step, setStep] = useState(1)
  const [registration, setRegistration] = useState<AccountStepValues | null>(null)
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [organization, setOrganization] = useState<SystemUserOrgValues | null>(null)
  const [entities, setEntities] = useState<SystemUserEntityValues[]>([])
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
          role: "system_user",
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

  async function finishOnboarding(accountant?: AccountantSelectionValues) {
    if (!organization || !registration) {
      setError("Faltan datos para finalizar el registro")
      return
    }

    setLoading(true)
    setError(null)
    try {
      const token = await getFreshIdToken()
      if (!token) throw new Error("No se encontro una sesion activa")

      const response = await postJson<OnboardingResponse>(
        "/api/onboarding/system-user",
        {
          organization,
          entities,
          accountant,
        },
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
    return <WizardSuccessUsuario organizationId={createdOrganizationId} entityCount={entities.length} />
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--brand-primary)]">Registro de Usuario</p>
        <h1 className="text-3xl font-semibold tracking-tight">Alta de productor o empresa agropecuaria</h1>
        <p className="text-muted-foreground">
          Crea la cuenta, registra la organizacion principal y deja preparado el vinculo contable.
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
          description="Usaremos estas credenciales para crear el usuario de acceso."
          defaultValues={registration ?? undefined}
          loading={loading}
          onSubmit={handleRegistration}
        />
      )}

      {step === 2 && (
        <SystemUserOrganizationForm
          defaultValues={organization ?? undefined}
          onBack={() => setStep(1)}
          onSubmit={(values) => {
            setOrganization(values)
            setStep(3)
          }}
        />
      )}

      {step === 3 && (
        <SystemUserEntitiesStep
          defaultEntities={entities}
          onBack={() => setStep(2)}
          onSubmit={(values) => {
            setEntities(values)
            setStep(4)
          }}
        />
      )}

      {step === 4 && (
        <AccountantSelectionStep
          loading={loading}
          onBack={() => setStep(3)}
          onFinish={finishOnboarding}
        />
      )}

      <Card className="border-dashed bg-muted/30">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          El alta crea datos solo en organizations y organization_members. Las empresas hijas quedan como
          system_user_entity del Usuario principal.
        </CardContent>
      </Card>
    </div>
  )
}
