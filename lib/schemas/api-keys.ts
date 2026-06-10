import { z } from "zod"
import { API_KEY_SCOPES } from "@/types/api-keys"

export const createApiKeySchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(80, "Máximo 80 caracteres"),
  scopes: z
    .array(z.enum(API_KEY_SCOPES))
    .min(1, "Se requiere al menos un scope"),
  expiresAt: z.string().datetime().optional(),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>
