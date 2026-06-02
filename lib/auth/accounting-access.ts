import { getAdminDb } from "@/lib/firebase/admin-sdk"
import { COLLECTIONS } from "@/lib/firebase/collections"
import { AuthError } from "@/lib/auth/server-session"
import type { ServerSession } from "@/lib/auth/server-session"

interface AccountingFolderAccess {
  folderOwnerOrganizationId: string
  accountingFirmId: string | null
}

export async function assertCanManageAccountingFolder(
  session: ServerSession,
  targetOrgId: string,
): Promise<AccountingFolderAccess> {
  // Admin siempre puede
  if (session.roles.includes("admin_platform")) {
    return { folderOwnerOrganizationId: targetOrgId, accountingFirmId: null }
  }

  const db = getAdminDb()

  // Productor puede acceder a su propia carpeta
  if (session.roles.includes("producer")) {
    if (!session.defaultOrganizationId) {
      throw new AuthError("Sin organización por defecto", 403)
    }
    // Verificar que el targetOrgId pertenece a su grupo (raíz o hija)
    if (
      targetOrgId !== session.defaultOrganizationId
    ) {
      // Puede ser una empresa hija
      const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(targetOrgId).get()
      if (
        !orgSnap.exists ||
        orgSnap.data()?.parentOrganizationId !== session.defaultOrganizationId
      ) {
        throw new AuthError("No tenés acceso a esta carpeta", 403)
      }
    }
    return { folderOwnerOrganizationId: targetOrgId, accountingFirmId: null }
  }

  // Contador: verificar membership + link activo al cliente
  if (
    session.roles.includes("accountant") ||
    session.roles.includes("accounting_firm_admin")
  ) {
    const firmId = session.defaultOrganizationId
    if (!firmId) throw new AuthError("Sin organización contable en la sesión", 403)

    // Verificar link activo en producer_accountant_links
    const linksSnap = await db
      .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
      .where("accountingFirmId", "==", firmId)
      .where("systemUserOrganizationId", "==", targetOrgId)
      .where("status", "==", "active")
      .limit(1)
      .get()

    if (linksSnap.empty) {
      // Puede ser empresa hija — buscar por el org raíz del cliente
      const orgSnap = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(targetOrgId).get()
      if (orgSnap.exists && orgSnap.data()?.parentOrganizationId) {
        const parentId = orgSnap.data()!.parentOrganizationId as string
        const parentLinksSnap = await db
          .collection(COLLECTIONS.PRODUCER_ACCOUNTANT_LINKS)
          .where("accountingFirmId", "==", firmId)
          .where("systemUserOrganizationId", "==", parentId)
          .where("status", "==", "active")
          .limit(1)
          .get()

        if (parentLinksSnap.empty) {
          throw new AuthError("No tenés vínculo activo con este cliente", 403)
        }
        return { folderOwnerOrganizationId: targetOrgId, accountingFirmId: firmId }
      }
      throw new AuthError("No tenés vínculo activo con este cliente", 403)
    }

    return { folderOwnerOrganizationId: targetOrgId, accountingFirmId: firmId }
  }

  throw new AuthError("Rol no autorizado para gestionar carpetas contables", 403)
}
