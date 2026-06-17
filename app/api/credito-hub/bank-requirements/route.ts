import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, requireAnyRole, isAdminPlatform, getAuthErrorResponse } from "@/lib/auth/server-session"
import { parseRequirementsFromDocument } from "@/lib/ai/bank-requirements/parser"
import { createRequirementTemplate, listRequirementTemplates, getRequirementTemplate } from "@/lib/services/bank-requirements"
import { publishRequirementTemplate } from "@/lib/services/bank-requirements"

/**
 * Resuelve la org de entidad sobre la que opera la sesion.
 * Para no-admin se fuerza la org de la sesion (se ignora cualquier id del query/form)
 * para evitar que una entidad lea/cree templates de otra.
 */
function resolveEntityOrg(session: { defaultOrganizationId: string | null }, requested: string | null, admin: boolean): string | null {
  if (admin) return requested ?? session.defaultOrganizationId
  return session.defaultOrganizationId
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    requireAnyRole(session, ["bank_user", "agro_company_user", "admin_platform"])
    const organizationId = resolveEntityOrg(
      session,
      request.nextUrl.searchParams.get("requestingEntityOrganizationId"),
      isAdminPlatform(session),
    )
    if (!organizationId) return Response.json({ error: "Organizacion requerida" }, { status: 400 })
    const templates = await listRequirementTemplates(organizationId)
    return Response.json({ templates })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    requireAnyRole(session, ["bank_user", "agro_company_user", "admin_platform"])
    const formData = await request.formData()
    const action = String(formData.get("action") ?? "parse")
    const admin = isAdminPlatform(session)
    const requestingEntityOrganizationId = resolveEntityOrg(
      session,
      String(formData.get("requestingEntityOrganizationId") ?? "") || null,
      admin,
    )
    if (!requestingEntityOrganizationId) return Response.json({ error: "Organizacion requerida" }, { status: 400 })

    if (action === "publish") {
      const templateId = String(formData.get("templateId") ?? "")
      if (!templateId) return Response.json({ error: "templateId requerido" }, { status: 400 })
      // Verificar pertenencia: solo la entidad dueña (o admin) puede publicar su template.
      const existing = await getRequirementTemplate(templateId)
      if (!existing) return Response.json({ error: "Template no encontrado" }, { status: 404 })
      if (!admin && existing.requestingEntityOrganizationId !== requestingEntityOrganizationId) {
        return Response.json({ error: "No tenes permisos sobre este template" }, { status: 403 })
      }
      const template = await publishRequirementTemplate({
        templateId,
        actorUid: session.uid,
        actorOrganizationId: session.defaultOrganizationId,
      })
      return Response.json({ template })
    }

    const file = formData.get("file")
    if (!(file instanceof File)) return Response.json({ error: "PDF requerido" }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseRequirementsFromDocument(buffer, file.type || "application/pdf", { fileName: file.name })
    const template = await createRequirementTemplate({
      requestingEntityOrganizationId,
      bankName: String(formData.get("bankName") ?? "Banco piloto"),
      productName: String(formData.get("productName") ?? "") || undefined,
      requirements: parsed.requirements,
      createdBy: session.uid,
      actorOrganizationId: session.defaultOrganizationId,
      status: "draft",
    })
    return Response.json({ template, warnings: parsed.warnings, overallConfidence: parsed.overallConfidence }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
