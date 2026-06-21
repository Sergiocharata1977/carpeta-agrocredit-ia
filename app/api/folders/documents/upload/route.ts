import { NextRequest } from "next/server"
import { verifyRequestSession, requireActiveOrg, getAuthErrorResponse } from "@/lib/auth/server-session"
import { uploadPrivateFolderFile } from "@/lib/services/server-folder-writes"

export async function POST(request: NextRequest) {
  try {
    const session = await verifyRequestSession(request)
    requireActiveOrg(session)
    const formData = await request.formData()
    const file = formData.get("file")
    if (!(file instanceof File)) {
      return Response.json({ error: "Archivo requerido" }, { status: 400 })
    }
    const metadata = {
      producerId: String(formData.get("producerId") ?? ""),
      organizationId: String(formData.get("organizationId") ?? ""),
      periodId: String(formData.get("periodId") ?? ""),
      documentType: String(formData.get("documentType") ?? ""),
      fileName: String(formData.get("fileName") ?? file.name),
      mimeType: String(formData.get("mimeType") ?? file.type),
    }
    const document = await uploadPrivateFolderFile({ session, file, metadata })
    return Response.json({ document }, { status: 201 })
  } catch (error) {
    return getAuthErrorResponse(error)
  }
}

export const dynamic = "force-dynamic"
