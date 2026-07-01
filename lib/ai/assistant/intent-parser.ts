// Parser de intención natural del usuario para asistente conversacional
// Usa IA para reconocer intenciones y extraer parámetros de búsqueda

import type { AIProvider } from "@/lib/ai/AIProvider"
import type { AssistantContext, ParsedUserIntent } from "@/types/assistant-states"

/**
 * Parsea un mensaje de usuario en lenguaje natural a una ParsedUserIntent estructurada.
 * Usa IA para reconocer patrones como:
 * - "Ingresá ese balance en Gramajo" → attach_to_account, targetAccountSearch: "Gramajo"
 * - "Cargalo como Los Señores del Agro" → attach_to_related_company, targetCompanySearch: "Los Señores..."
 * - "Confirmá" → confirm
 */
export async function parseUserIntent(
  userMessage: string,
  context: AssistantContext,
  ai: AIProvider,
): Promise<ParsedUserIntent> {
  const systemPrompt = `Eres un asistente que entiende intenciones de usuarios en una aplicación de gestión de documentos contables.

Analiza el siguiente mensaje del usuario y devuelve un JSON estructurado.

El usuario está en el contexto:
- Estado actual: ${context.state}
- Documento detectado: ${context.detectedType || "sin detectar"}
- Empresa detectada: ${context.detectedCompany?.name || "sin detectar"}

Devuelve SOLO un JSON válido (sin explicación) con la siguiente estructura:
{
  "intent": "valor del intent",
  "targetAccountSearch": "búsqueda de estudio/contador si menciona",
  "targetCompanySearch": "búsqueda de empresa si menciona",
  "action": "prepare" | "confirm" | "execute" | "show",
  "modifiers": {}
}

Intenciones posibles:
- "attach_to_account": cargar documento en una cuenta/estudio contador
- "attach_to_related_company": cargar documento en una empresa vinculada
- "create_related_company": crear empresa nueva
- "review_extraction": revisar extracción de datos
- "modify_field": modificar un campo
- "cancel": cancelar operación
- "confirm": confirmar una operación

NO hagas análisis financiero. NO crees entidades. Solo extrae búsquedas y valida intenciones.`

  const response = await ai.complete(systemPrompt, userMessage)

  // Parsear respuesta JSON
  const text = response

  // Intentar extraer JSON del texto
  let parsed: ParsedUserIntent
  try {
    // Buscar primer { y último }
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error("No JSON encontrado en respuesta")
    }
    parsed = JSON.parse(jsonMatch[0]) as ParsedUserIntent
  } catch (error) {
    // Si falla el parseo, asignar intent por defecto
    console.warn("[intent-parser] No se pudo parsear respuesta IA:", text)
    parsed = {
      intent: "review_extraction",
      action: "show",
    }
  }

  // Validar campos obligatorios
  if (!parsed.intent) {
    parsed.intent = "review_extraction"
  }
  if (!parsed.action) {
    parsed.action = "show"
  }

  return parsed
}
