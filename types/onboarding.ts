import type { AgroActivity, RequestingEntitySubtype } from "./auth"

// Paso 1 — datos de cuenta (común a todos los wizards)
export interface RegistrationStep {
  email: string
  password: string
  displayName: string
}

// Paso 2 — organización raíz del system_user
export interface SystemUserOrgStep {
  legalName: string
  taxId: string           // CUIT: 11 dígitos sin guiones
  personType: "physical" | "legal"
  activity: AgroActivity
  province: string
  city: string
  address?: string
  phone?: string
  email?: string
}

// Paso 3 — empresa(s) hija(s) del system_user (system_user_entity)
export interface SystemUserEntityStep {
  legalName: string
  taxId: string
  activity: AgroActivity
  province: string
  city: string
}

// Paso 4 — selección de contador
export interface AccountantSelectionStep {
  accountingFirmId: string  // ID de organizations donde type === "accounting_firm"
  accountantUid?: string    // persona específica dentro del estudio (opcional)
}

// Wizard completo del system_user
export interface SystemUserOnboardingData {
  registration: RegistrationStep
  organization: SystemUserOrgStep
  entities: SystemUserEntityStep[]          // puede estar vacío; se pueden agregar después
  accountant?: AccountantSelectionStep      // opcional; el vínculo queda "pending" hasta que el contador acepte
}

// Wizard del contador / estudio contable
export interface AccountingFirmOnboardingData {
  registration: RegistrationStep
  firm: {
    legalName: string
    taxId: string
    contactName: string
    contactPhone?: string
  }
}

// Wizard de entidad solicitante
export interface RequestingEntityOnboardingData {
  registration: RegistrationStep
  entity: {
    legalName: string
    taxId: string
    subtype: RequestingEntitySubtype
    contactName: string
    contactEmail: string
    contactPhone?: string
    sector?: string   // campo libre; aplica a agro_company, maquinaria_agricola, insumos_agricolas
  }
}
