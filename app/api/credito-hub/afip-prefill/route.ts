import { NextRequest } from "next/server"
import {
  verifyRequestSession,
  requireActiveOrg,
  requireAnyRole,
  getAuthErrorResponse,
} from "@/lib/auth/server-session"
import { extractAfipPrefill } from "@/lib/ai/extraction/afip-prefill"

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
])
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

/**
 * Lee una constancia de inscripcion AFIP con la capa IA y devuelve una PROPUESTA
 * de campos para prellenar el alta de productor. NO persiste el documento ni crea
 * nada: el humano revisa y confirma al guardar el productor.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    // Solo quienes crean carpetas pueden usar el prellenado.
    requireAnyRole(session, ["accountant", "accounting_firm_admin", "admin_platform"])

    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return Response.json({ error: "Documento requerido" }, { status: 400 })
    }
    const mimeType = file.type || "application/pdf"
    if (!ALLOWED_MIME.has(mimeType)) {
      return Response.json({ error: "Formato no permitido. Subi un PDF o imagen de la constancia." }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return Response.json({ error: "El archivo supera los 10 MB." }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await extractAfipPrefill(buffer, mimeType, { fileName: file.name })
    return Response.json(result)
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}
