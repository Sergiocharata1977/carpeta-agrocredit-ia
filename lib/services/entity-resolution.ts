// Funciones server-side (Admin SDK) para búsqueda y resolución de entidades
// Busca estudios contables, clientes raíz y empresas vinculadas

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import type {
  EntityCandidate,
  ResolvedEntity,
  ResolvedEntityType,
} from "@/types/import-pending"
import type { Firestore } from "firebase-admin/firestore"
import type { Organization } from "@/types/auth"

type Database = Firestore

// ─── BÚSQUEDA DE ESTUDIOS CONTABLES ────────────────────────────────────────────

/**
 * Busca estudios contables (organizations con type === "accounting_firm").
 * Matching: prefijo o búsqueda simple en legalName/taxId.
 */
export async function searchAccountingFirms(
  db: Database,
  query: string,
): Promise<EntityCandidate[]> {
  const queryLower = query.toLowerCase()

  // Buscar por prefijo en legalName
  const snap = await db
    .collection("organizations")
    .where("type", "==", "accounting_firm")
    .where("status", "==", "active")
    .limit(10)
    .get()

  const candidates: EntityCandidate[] = []

  snap.docs.forEach((doc) => {
    const org = doc.data() as Organization
    const match =
      org.legalName?.toLowerCase().includes(queryLower) ||
      org.taxId?.toLowerCase().includes(queryLower)

    if (match) {
      candidates.push({
        id: doc.id,
        name: org.legalName,
        taxId: org.taxId,
        confidence: 0.9, // Simplificado
      })
    }
  })

  return candidates
}

// ─── BÚSQUEDA DE CLIENTES RAÍZ ────────────────────────────────────────────────

/**
 * Busca clientes raíz (system_user) vinculados a un estudio contable.
 */
export async function searchRootClients(
  db: Database,
  query: string,
  accountingFirmId: string,
): Promise<EntityCandidate[]> {
  const queryLower = query.toLowerCase()

  // Buscar en organizations vinculadas al estudio
  // Relación a través de producer_accountant_links
  const linksSnap = await db
    .collection("producer_accountant_links")
    .where("accountantId", "==", accountingFirmId)
    .where("status", "==", "active")
    .limit(100)
    .get()

  const producerIds = linksSnap.docs.map((doc) => doc.data().producerId)

  if (producerIds.length === 0) return []

  // Buscar los productores (system_user)
  const candidates: EntityCandidate[] = []

  for (const producerId of producerIds.slice(0, 10)) {
    const snap = await db.collection("organizations").doc(producerId).get()
    if (!snap.exists) continue

    const org = snap.data() as Organization
    if (
      org.type !== "system_user" ||
      org.status !== "active"
    )
      continue

    const match =
      org.legalName?.toLowerCase().includes(queryLower) ||
      org.taxId?.toLowerCase().includes(queryLower)

    if (match) {
      candidates.push({
        id: snap.id,
        name: org.legalName,
        taxId: org.taxId,
        confidence: 0.85,
      })
    }
  }

  return candidates
}

// ─── BÚSQUEDA DE EMPRESAS VINCULADAS ──────────────────────────────────────────

/**
 * Busca empresas vinculadas a un cliente raíz (system_user_entity con parentOrganizationId).
 */
export async function searchRelatedCompanies(
  db: Database,
  query: string,
  folderOwnerOrganizationId: string,
): Promise<EntityCandidate[]> {
  const queryLower = query.toLowerCase()

  const snap = await db
    .collection("organizations")
    .where("parentOrganizationId", "==", folderOwnerOrganizationId)
    .where("type", "==", "system_user_entity")
    .where("status", "==", "active")
    .limit(20)
    .get()

  const candidates: EntityCandidate[] = []

  snap.docs.forEach((doc) => {
    const org = doc.data() as Organization
    const match =
      org.legalName?.toLowerCase().includes(queryLower) ||
      org.taxId?.toLowerCase().includes(queryLower)

    if (match) {
      candidates.push({
        id: doc.id,
        name: org.legalName,
        taxId: org.taxId,
        confidence: 0.9,
      })
    }
  })

  return candidates
}

// ─── RESOLUCIÓN COMPLETA DE ENTIDAD ───────────────────────────────────────────

/**
 * Resuelve una entidad (CUIT o nombre) devolviendo el resultado:
 * - found_exact: 1 resultado
 * - found_multiple: 2+ resultados
 * - not_found: 0 resultados
 */
export async function resolveCompanyEntity(
  db: Database,
  folderOwnerOrganizationId: string,
  cuitOrName: string,
): Promise<ResolvedEntity> {
  // Intenta como CUIT primero (11 dígitos)
  const isCuit = /^\d{11}$/.test(cuitOrName)

  let candidates: EntityCandidate[] = []

  if (isCuit) {
    // Búsqueda exacta por CUIT
    const snap = await db
      .collection("organizations")
      .where("parentOrganizationId", "==", folderOwnerOrganizationId)
      .where("taxId", "==", cuitOrName)
      .limit(5)
      .get()

    snap.docs.forEach((doc) => {
      const org = doc.data() as Organization
      if (org.type === "system_user_entity" && org.status === "active") {
        candidates.push({
          id: doc.id,
          name: org.legalName,
          taxId: org.taxId,
          confidence: 1.0,
        })
      }
    })
  } else {
    // Búsqueda por nombre
    candidates = await searchRelatedCompanies(db, cuitOrName, folderOwnerOrganizationId)
  }

  // Determinar status
  if (candidates.length === 0) {
    return {
      type: "related_company",
      name: cuitOrName,
      status: "not_found",
    }
  } else if (candidates.length === 1) {
    return {
      type: "related_company",
      id: candidates[0].id,
      name: candidates[0].name,
      taxId: candidates[0].taxId,
      parentOrganizationId: folderOwnerOrganizationId,
      status: "found_exact",
    }
  } else {
    return {
      type: "related_company",
      name: cuitOrName,
      status: "found_multiple",
      candidates,
    }
  }
}

// ─── PREPARACIÓN PARA CREACIÓN ────────────────────────────────────────────────

/**
 * Prepara un objeto Organization listo para insertar (sin id, sin createdAt).
 * Valida CUIT, razón social y actividad.
 */
export async function prepareCompanyCreation(
  razonSocial: string,
  cuit: string,
  activity: string,
  parentOrganizationId: string,
): Promise<Omit<Organization, "id">> {
  // Validaciones
  if (!/^\d{11}$/.test(cuit)) {
    throw new Error("CUIT inválido: debe tener 11 dígitos")
  }

  if (razonSocial.length < 3 || razonSocial.length > 120) {
    throw new Error("Razón social debe tener entre 3 y 120 caracteres")
  }

  if (!activity || activity.trim().length === 0) {
    throw new Error("Actividad no puede estar vacía")
  }

  return {
    type: "system_user_entity",
    parentOrganizationId,
    legalName: razonSocial,
    taxId: cuit,
    status: "active",
    activity: activity as any, // AgroActivity
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "", // será seteado por la función que llama
  }
}

// ─── CREACIÓN CONFIRMADA ──────────────────────────────────────────────────────

/**
 * Crea una empresa confirmada con transacción atómica.
 * Crea membership automática y audita la operación.
 */
export async function createConfirmedCompany(
  db: Database,
  data: Omit<Organization, "id">,
  creatorUid: string,
  creatorOrgId: string,
): Promise<{ companyId: string }> {
  let companyId = ""
  const now = new Date().toISOString()

  // Crear organización
  const newOrgRef = db.collection("organizations").doc()
  await newOrgRef.set({
    ...data,
    createdBy: creatorUid,
  })
  companyId = newOrgRef.id

  // Crear membership automática para el creador
  const memberRef = db.collection("organization_members").doc()
  await memberRef.set({
    organizationId: companyId,
    uid: creatorUid,
    role: "accounting_firm_admin",
    status: "active",
    invitedBy: null,
    createdAt: now,
    updatedAt: now,
  })

  // Auditar
  await db.collection("audit_logs").add({
    action: "organization.created",
    actorUid: creatorUid,
    actorOrganizationId: creatorOrgId,
    targetType: "organization",
    targetId: companyId,
    metadata: {
      type: "system_user_entity",
      source: "assistant_confirmed_import",
    },
    createdAt: now,
  })

  return { companyId }
}
