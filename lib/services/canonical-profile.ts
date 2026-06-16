/**
 * Servicio Admin SDK del perfil crediticio canónico (CreditoHub — Ola 2 / Agente C).
 *
 * upsertProfileFromFields construye/actualiza el CanonicalCreditProfile de un
 * legajo a partir de ExtractedField[]. Los bloques económico/financiero/fiscal/
 * patrimonial REFERENCIAN fieldIds (nunca valores sueltos): así se preserva la
 * procedencia. Versiona (incrementa version) y setea validationState.
 * Audita canonical_profile.updated.
 *
 * Partition key = folderOwnerOrganizationId (NUNCA producerId/clientId).
 */

import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { writeAuditLog } from "@/lib/firebase/audit"
import { FieldValue } from "firebase-admin/firestore"
import type {
  CanonicalCreditProfile,
  CanonicalProfileIdentity,
  CanonicalProfileValidationState,
  ExtractedField,
} from "@/types/credito-hub"

type ProfileBlock = "economic" | "financial" | "fiscal" | "patrimonial"

/**
 * Clasifica un fieldCode en uno de los 4 bloques canónicos.
 * - economic    → estado de resultados (rendimiento del período)
 * - financial   → liquidez / deuda financiera (préstamos, créditos)
 * - patrimonial → composición patrimonial (activos/pasivos del balance, PN)
 * - fiscal      → IVA / F931 / impuestos
 */
function classifyField(fieldCode: string): ProfileBlock {
  const code = fieldCode.toLowerCase()

  // Fiscal: IVA y seguridad social (F931) e impuesto a las ganancias.
  const fiscalCodes = new Set([
    "debitofiscal",
    "creditofiscal",
    "saldotecnico",
    "saldoapagar",
    "saldoafavor",
    "empleados",
    "remuneraciones",
    "contribuciones",
    "aportes",
    "totalapagar",
    "incometax",
    "periodo",
  ])
  if (fiscalCodes.has(code)) return "fiscal"

  // Economic: cuentas del estado de resultados.
  const economicCodes = new Set([
    "netsales",
    "costofgoodssold",
    "inventoryvaluationresult",
    "sellingexpenses",
    "administrativeexpenses",
    "otherexpenses",
    "relatedinvestmentresults",
    "otherinvestmentresults",
    "financialresultsgeneratedbyassets",
    "financialresultsgeneratedbyliabilities",
    "otherincomeandexpenses",
    "discontinuedoperationsresult",
    "discontinueddisposalresult",
    "extraordinaryresults",
    "netresult",
  ])
  if (economicCodes.has(code)) return "economic"

  // Financial: deuda financiera y disponibilidades.
  if (code.includes("loans") || code.includes("cashandbanks") || code.includes("temporaryinvestments")) {
    return "financial"
  }

  // Patrimonial: resto del balance (activos, pasivos, patrimonio neto).
  return "patrimonial"
}

interface BlockBuckets {
  economic: string[]
  financial: string[]
  fiscal: string[]
  patrimonial: string[]
}

function bucketFields(fields: ExtractedField[]): BlockBuckets {
  const buckets: BlockBuckets = {
    economic: [],
    financial: [],
    fiscal: [],
    patrimonial: [],
  }
  for (const field of fields) {
    if (!field.id) continue
    buckets[classifyField(field.fieldCode)].push(field.id)
  }
  return buckets
}

/**
 * Determina validationState a partir del estado de revisión de los campos.
 * - validated : todos los campos están CONFIRMED/CORRECTED.
 * - in_review : hay al menos un campo CONFIRMED/CORRECTED pero quedan PENDING.
 * - incomplete: no hay campos o todos siguen PENDING/REJECTED.
 */
function deriveValidationState(fields: ExtractedField[]): CanonicalProfileValidationState {
  const reviewable = fields.filter((f) => f.reviewStatus !== "REJECTED")
  if (reviewable.length === 0) return "incomplete"
  const reviewed = reviewable.filter(
    (f) => f.reviewStatus === "CONFIRMED" || f.reviewStatus === "CORRECTED",
  )
  if (reviewed.length === 0) return "incomplete"
  if (reviewed.length === reviewable.length) return "validated"
  return "in_review"
}

export interface UpsertProfileActor {
  actorUid: string
  actorOrganizationId: string | null
}

export interface UpsertProfileOptions {
  identity?: CanonicalProfileIdentity
}

/**
 * Crea o actualiza el perfil canónico del legajo a partir de los campos dados.
 * Incrementa version en cada actualización y recalcula validationState.
 */
export async function upsertProfileFromFields(
  folderOwnerOrganizationId: string,
  fields: ExtractedField[],
  actor: UpsertProfileActor,
  options: UpsertProfileOptions = {},
): Promise<CanonicalCreditProfile> {
  const db = getAdminDb()
  const col = db.collection(COLLECTIONS.CANONICAL_CREDIT_PROFILES)

  // Un perfil por legajo: buscamos por partition key.
  const existingSnap = await col
    .where("folderOwnerOrganizationId", "==", folderOwnerOrganizationId)
    .limit(1)
    .get()

  const buckets = bucketFields(fields)
  const validationState = deriveValidationState(fields)
  const nowIso = new Date().toISOString()

  if (existingSnap.empty) {
    const ref = col.doc()
    const identity: CanonicalProfileIdentity = options.identity ?? {
      cuit: "",
      legalName: "",
    }
    const profile: CanonicalCreditProfile = {
      id: ref.id,
      folderOwnerOrganizationId,
      identity,
      economic: { fieldIds: buckets.economic },
      financial: { fieldIds: buckets.financial },
      fiscal: { fieldIds: buckets.fiscal },
      patrimonial: { fieldIds: buckets.patrimonial },
      validationState,
      version: 1,
      createdBy: actor.actorUid,
      createdAt: nowIso,
      updatedAt: nowIso,
    }
    await ref.set({
      ...profile,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    await writeAuditLog({
      actorUid: actor.actorUid,
      actorOrganizationId: actor.actorOrganizationId,
      action: "canonical_profile.updated",
      targetType: "canonical_credit_profile",
      targetId: ref.id,
      metadata: {
        folderOwnerOrganizationId,
        version: 1,
        validationState,
        fieldCount: fields.length,
      },
    })

    return profile
  }

  const existingDoc = existingSnap.docs[0]
  const existingData = existingDoc.data() as Partial<CanonicalCreditProfile>
  const nextVersion = (existingData.version ?? 0) + 1
  const identity =
    options.identity ?? existingData.identity ?? { cuit: "", legalName: "" }

  const updated: CanonicalCreditProfile = {
    id: existingDoc.id,
    folderOwnerOrganizationId,
    identity,
    economic: { fieldIds: buckets.economic },
    financial: { fieldIds: buckets.financial },
    fiscal: { fieldIds: buckets.fiscal },
    patrimonial: { fieldIds: buckets.patrimonial },
    validationState,
    version: nextVersion,
    createdBy: existingData.createdBy ?? actor.actorUid,
    createdAt:
      (existingData.createdAt as unknown as string) ?? nowIso,
    updatedAt: nowIso,
  }

  await existingDoc.ref.update({
    identity: updated.identity,
    economic: updated.economic,
    financial: updated.financial,
    fiscal: updated.fiscal,
    patrimonial: updated.patrimonial,
    validationState: updated.validationState,
    version: updated.version,
    updatedAt: FieldValue.serverTimestamp(),
  })

  await writeAuditLog({
    actorUid: actor.actorUid,
    actorOrganizationId: actor.actorOrganizationId,
    action: "canonical_profile.updated",
    targetType: "canonical_credit_profile",
    targetId: existingDoc.id,
    metadata: {
      folderOwnerOrganizationId,
      version: nextVersion,
      validationState,
      fieldCount: fields.length,
    },
  })

  return updated
}
