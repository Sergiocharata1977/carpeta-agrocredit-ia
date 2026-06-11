// In-memory rate limiter — per-instance, no external dependency.
// Good enough for serverless cold starts; critical endpoints use Firestore backing.

interface RateLimitEntry {
  count: number
  windowStart: number
}

const store = new Map<string, RateLimitEntry>()

export interface RateLimitConfig {
  /** Number of requests allowed within windowMs */
  limit: number
  /** Window duration in milliseconds */
  windowMs: number
}

export function checkRateLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.windowStart > config.windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return { allowed: true, remaining: config.limit - 1 }
  }

  entry.count += 1
  const remaining = Math.max(0, config.limit - entry.count)
  return { allowed: entry.count <= config.limit, remaining }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  return "unknown"
}

export function rateLimitResponse(retryAfterSeconds = 60): Response {
  return Response.json(
    { error: "Demasiados intentos. Intentá de nuevo en un momento." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": "10",
      },
    },
  )
}
