import "server-only"
import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { getFolderDataStatus } from "@/lib/firebase/folder-data"

/**
 * Arma el contexto de UN legajo para el Asistente IA (solo lectura).
 * Lee identidad de la organización, perfil extendido, totales contables y el
 * estado de completitud. Devuelve un bloque de texto "evidencias del legajo"
 * que va como system prompt — nunca se confía nada del cliente.
 */

function fmtMoney(value: unknown, currency?: unknown): string | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null
  const cur = typeof currency === "string" ? currency : "ARS"
  return `${cur} ${value.toLocaleString("es-AR")}`
}

export interface LegajoContext {
  legalName: string
  taxId: string
  text: string
}

export async function buildLegajoContext(folderOwnerOrganizationId: string): Promise<LegajoContext> {
  const db = getAdminDb()
  const orgId = folderOwnerOrganizationId

  const [orgSnap, profileSnap, balanceSnap, incomeSnap, status] = await Promise.all([
    db.collection(COLLECTIONS.ORGANIZATIONS).doc(orgId).get(),
    db.collection(COLLECTIONS.ORGANIZATION_PROFILES).where("organizationId", "==", orgId).limit(1).get(),
    db.collection(COLLECTIONS.BALANCE_SHEETS).where("producerId", "==", orgId).limit(1).get(),
    db.collection(COLLECTIONS.INCOME_STATEMENTS).where("producerId", "==", orgId).limit(1).get(),
    getFolderDataStatus(db, orgId),
  ])

  const org = orgSnap.data() ?? {}
  const legalName = (org.legalName as string) ?? "Cliente"
  const taxId = (org.taxId as string) ?? "—"
  const profile = profileSnap.empty ? null : profileSnap.docs[0].data()
  const balance = balanceSnap.empty ? null : balanceSnap.docs[0].data()
  const income = incomeSnap.empty ? null : incomeSnap.docs[0].data()

  const lines: string[] = []
  lines.push(`Cliente: ${legalName} (CUIT ${taxId}).`)
  if (org.activity) lines.push(`Actividad: ${org.activity}.`)
  if (org.province || org.city) {
    lines.push(`Ubicación: ${[org.city, org.province].filter(Boolean).join(", ")}.`)
  }

  if (profile) {
    const p = profile as Record<string, unknown>
    const bits: string[] = []
    if (p.taxCondition) bits.push(`condición fiscal ${p.taxCondition}`)
    if (typeof p.hasEmployees === "boolean") bits.push(p.hasEmployees ? `con empleados (${p.employeesCount ?? "?"})` : "sin empleados")
    if (p.ownHectares != null) bits.push(`${p.ownHectares} ha propias`)
    if (p.rentedHectares != null) bits.push(`${p.rentedHectares} ha alquiladas`)
    if (Array.isArray(p.mainCrops) && p.mainCrops.length) bits.push(`cultivos: ${(p.mainCrops as string[]).join(", ")}`)
    const ventas = fmtMoney(p.estimatedAnnualSales, p.estimatedAnnualSalesCurrency)
    if (ventas) bits.push(`ventas estimadas ${ventas}`)
    const deudas = fmtMoney(p.bankDebts, p.bankDebtsCurrency)
    if (deudas) bits.push(`deudas bancarias ${deudas}`)
    if (p.rejectedChecks != null) bits.push(`cheques rechazados: ${p.rejectedChecks}`)
    if (bits.length) lines.push(`Perfil: ${bits.join("; ")}.`)
  }

  if (balance) {
    const parts = [
      fmtMoney(balance.assetsTotal, balance.currency) && `activo ${fmtMoney(balance.assetsTotal, balance.currency)}`,
      fmtMoney(balance.liabilitiesTotal, balance.currency) && `pasivo ${fmtMoney(balance.liabilitiesTotal, balance.currency)}`,
      fmtMoney(balance.equityTotal, balance.currency) && `patrimonio neto ${fmtMoney(balance.equityTotal, balance.currency)}`,
    ].filter(Boolean)
    if (parts.length) lines.push(`Balance (un período cargado): ${parts.join(", ")}.`)
  }

  if (income) {
    const parts = [
      fmtMoney(income.sales, income.currency) && `ventas ${fmtMoney(income.sales, income.currency)}`,
      fmtMoney(income.netResult, income.currency) && `resultado neto ${fmtMoney(income.netResult, income.currency)}`,
    ].filter(Boolean)
    if (parts.length) lines.push(`Estado de resultados (un período cargado): ${parts.join(", ")}.`)
  }

  // Qué secciones tienen datos y cuáles faltan.
  const sectionLabels: Record<string, string> = {
    balance: "balance",
    income: "estado de resultados",
    taxDocuments: "impuestos",
    assets: "bienes",
    liabilities: "deudas",
    documents: "documentos",
  }
  const presentes = Object.entries(status.sections).filter(([, v]) => v).map(([k]) => sectionLabels[k])
  const faltantes = Object.entries(status.sections).filter(([, v]) => !v).map(([k]) => sectionLabels[k])
  lines.push(`Secciones con datos: ${presentes.length ? presentes.join(", ") : "ninguna"}.`)
  lines.push(`Secciones sin datos: ${faltantes.length ? faltantes.join(", ") : "ninguna"}.`)

  return { legalName, taxId, text: lines.join("\n") }
}
