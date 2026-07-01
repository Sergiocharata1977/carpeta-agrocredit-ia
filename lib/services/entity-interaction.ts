// Resolución interactiva de entidades: búsqueda, candidatos múltiples y nueva creación
// Prepara mensajes humanizados y propone opciones al usuario

import type { Firestore } from "firebase-admin/firestore"
import type { AIProvider } from "@/lib/ai/AIProvider"
import type {
  ResolvedEntity,
  EntityCandidate,
  ResolvedEntityType,
} from "@/types/import-pending"
import {
  searchAccountingFirms,
  searchRootClients,
  searchRelatedCompanies,
} from "./entity-resolution"

type Database = Firestore

/**
 * Resuelve una búsqueda de entidad interactivamente.
 * Maneja coincidencias exactas, múltiples candidatos y nuevas entidades.
 */
export async function interactiveEntityResolution(
  query: string,
  organizationId: string,
  entityType: ResolvedEntityType,
  db: Database,
  ai?: AIProvider,
): Promise<{
  resolved: ResolvedEntity
  userMessage: string
  requiresUserSelection: boolean
  candidates?: EntityCandidate[]
}> {
  let candidates: EntityCandidate[] = []
  let userMessage = ""
  let requiresUserSelection = false
  let resolved: ResolvedEntity

  try {
    // Buscar según el tipo de entidad
    if (entityType === "accounting_firm") {
      candidates = await searchAccountingFirms(db, query)
    } else if (entityType === "root_client") {
      candidates = await searchRootClients(db, query, organizationId)
    } else if (entityType === "related_company") {
      candidates = await searchRelatedCompanies(db, query, organizationId)
    }

    // Procesar resultados
    if (candidates.length === 0) {
      // No encontrada
      resolved = {
        type: entityType,
        name: query,
        status: "not_found",
      }
      userMessage = `No encontré "${query}". ¿Querés crearla nueva o buscar otro nombre?`
      requiresUserSelection = true
    } else if (candidates.length === 1) {
      // Coincidencia exacta
      resolved = {
        type: entityType,
        id: candidates[0].id,
        name: candidates[0].name,
        taxId: candidates[0].taxId,
        status: "found_exact",
      }
      const article = entityType === "accounting_firm" ? "el" : "la"
      userMessage = `Encontré ${article} ${entityType === "accounting_firm" ? "estudio" : "empresa"}: ${candidates[0].name}`
      requiresUserSelection = false
    } else {
      // Múltiples candidatos
      resolved = {
        type: entityType,
        name: query,
        status: "found_multiple",
        candidates,
      }

      // Ordenar candidatos por confianza
      const sorted = [...candidates].sort((a, b) => b.confidence - a.confidence)

      const list = sorted
        .map(
          (c, i) =>
            `${i + 1}) ${c.name} (CUIT: ${c.taxId}, confianza: ${Math.round(c.confidence * 100)}%)`,
        )
        .join("\n")

      const article =
        entityType === "accounting_firm" ? "el estudio" : "la empresa"
      userMessage = `Encontré varios candidatos. ¿Cuál es ${article} correcto?\n${list}`
      requiresUserSelection = true
    }

    return {
      resolved,
      userMessage,
      requiresUserSelection,
      candidates: requiresUserSelection ? candidates : undefined,
    }
  } catch (error) {
    resolved = {
      type: entityType,
      name: query,
      status: "not_found",
    }
    userMessage = error instanceof Error ? error.message : "Error al buscar entidad"
    requiresUserSelection = true

    return {
      resolved,
      userMessage,
      requiresUserSelection,
    }
  }
}

/**
 * Marca una entidad como "nueva a crear".
 * Solo válido para system_user_entity (related_company) con confirmación explícita.
 */
export async function markEntityAsNewToCreate(
  name: string,
  cuit: string,
  organizationId: string,
): Promise<ResolvedEntity> {
  if (!name || name.length < 3) {
    throw new Error("Nombre debe tener al menos 3 caracteres")
  }

  if (!/^\d{11}$/.test(cuit)) {
    throw new Error("CUIT debe tener 11 dígitos")
  }

  return {
    type: "related_company",
    name,
    taxId: cuit,
    parentOrganizationId: organizationId,
    status: "new_to_create",
  }
}
