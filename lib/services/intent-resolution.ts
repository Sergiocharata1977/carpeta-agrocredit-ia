// Servicio para resolver una intención parseada a operaciones concretas
// Busca entidades en la base de datos y propone próximos pasos

import type { Firestore } from "firebase-admin/firestore"
import type {
  ParsedUserIntent,
  ResolvedEntity,
  ExtractedDocumentData,
} from "@/types/import-pending"
import {
  searchAccountingFirms,
  searchRootClients,
  resolveCompanyEntity,
} from "./entity-resolution"

type Database = Firestore

/**
 * Resuelve una intención parseada buscando entidades y determinando próximos pasos.
 */
export async function resolveIntentToOperations(
  intent: ParsedUserIntent,
  extractedData: ExtractedDocumentData,
  folderOwnerOrganizationId: string,
  accountantOrgId: string,
  db: Database,
): Promise<{
  resolvedCompany?: ResolvedEntity
  resolvedAccount?: ResolvedEntity
  nextStep: "prepare_import" | "ask_for_clarification" | "confirm" | "error"
  message: string
}> {
  let resolvedCompany: ResolvedEntity | undefined
  let resolvedAccount: ResolvedEntity | undefined
  let nextStep: "prepare_import" | "ask_for_clarification" | "confirm" | "error" = "error"
  let message = ""

  try {
    // Si intent tiene targetAccountSearch, buscar estudio/contador
    if (intent.targetAccountSearch) {
      const candidates = await searchAccountingFirms(db, intent.targetAccountSearch)

      if (candidates.length === 0) {
        resolvedAccount = {
          type: "accounting_firm",
          name: intent.targetAccountSearch,
          status: "not_found",
        }
        message = `No encontré estudio contable "${intent.targetAccountSearch}". ¿Es el nombre correcto?`
        nextStep = "ask_for_clarification"
      } else if (candidates.length === 1) {
        resolvedAccount = {
          type: "accounting_firm",
          id: candidates[0].id,
          name: candidates[0].name,
          taxId: candidates[0].taxId,
          status: "found_exact",
        }
        message = `Encontré el estudio: ${candidates[0].name}`
      } else {
        resolvedAccount = {
          type: "accounting_firm",
          name: intent.targetAccountSearch,
          status: "found_multiple",
          candidates,
        }
        const list = candidates
          .map((c, i) => `${i + 1}) ${c.name} (${c.taxId})`)
          .join(", ")
        message = `Encontré múltiples estudios. ¿Cuál es? ${list}`
        nextStep = "ask_for_clarification"
      }
    }

    // Si intent tiene targetCompanySearch, buscar empresa
    if (intent.targetCompanySearch) {
      resolvedCompany = await resolveCompanyEntity(
        db,
        folderOwnerOrganizationId,
        intent.targetCompanySearch,
      )

      if (resolvedCompany.status === "not_found") {
        message = `No encontré la empresa "${intent.targetCompanySearch}". ¿Querés crearla nueva?`
        nextStep = "ask_for_clarification"
      } else if (resolvedCompany.status === "found_exact") {
        message = `Encontré la empresa: ${resolvedCompany.name}`
      } else if (resolvedCompany.status === "found_multiple") {
        const list = (resolvedCompany.candidates || [])
          .map((c, i) => `${i + 1}) ${c.name} (${c.taxId})`)
          .join(", ")
        message = `Encontré múltiples empresas. ¿Cuál es? ${list}`
        nextStep = "ask_for_clarification"
      }
    }

    // Determinar próximo paso
    if (intent.action === "confirm") {
      nextStep = "confirm"
      message = "Listo para confirmar la carga de documentos"
    } else if (
      resolvedAccount?.status === "found_exact" &&
      resolvedCompany?.status === "found_exact"
    ) {
      nextStep = "prepare_import"
      message = `Listo para preparar la carga en ${resolvedCompany.name}`
    } else if (resolvedAccount?.status === "found_exact" && !intent.targetCompanySearch) {
      nextStep = "prepare_import"
      message = `Listo para preparar la carga en ${resolvedAccount.name}`
    }

    return {
      resolvedCompany,
      resolvedAccount,
      nextStep,
      message,
    }
  } catch (error) {
    return {
      resolvedCompany,
      resolvedAccount,
      nextStep: "error",
      message: error instanceof Error ? error.message : "Error al resolver intención",
    }
  }
}
