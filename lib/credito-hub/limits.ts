// Costos y límites por job — CreditoHub Ola 2 / Agente A
// Fuente: docs/credito-hub/000-ola0-decisiones.md (sección 4).
// NO cambiar valores sin actualizar esa decisión de Ola 0.

const MB = 1024 * 1024

/** Tamaño máximo para PDF e imágenes (igual que extract/route.ts). */
export const MAX_FILE_SIZE_PDF_IMG = 10 * MB // 10 MB

/** Tamaño máximo para archivos Excel (igual que extract/route.ts). */
export const MAX_FILE_SIZE_EXCEL = 5 * MB // 5 MB

/** Tamaño máximo total de una carga masiva ZIP. */
export const MAX_ZIP_SIZE = 50 * MB // 50 MB

/** Páginas máximas a procesar por PDF (controla costo de IA/visión). */
export const MAX_PDF_PAGES = 8

/** Jobs máximos por invocación del worker (evita timeouts de Vercel). */
export const MAX_JOBS_PER_RUN = 5

/** Reintentos máximos antes de marcar un job como `failed`. */
export const MAX_ATTEMPTS = 3

/** Duración del lease del worker sobre un job (2 minutos). */
export const LEASE_MS = 120_000

/** Corte de procesamiento por job. */
export const JOB_TIMEOUT_MS = 90_000
