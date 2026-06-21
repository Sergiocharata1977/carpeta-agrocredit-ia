import { getIdToken } from "@/lib/firebase/auth-client"

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken()
  if (!token) throw new Error("Sesion requerida")

  const headers = new Headers(init.headers)
  headers.set("Authorization", `Bearer ${token}`)

  return fetch(input, {
    ...init,
    headers,
  })
}

export async function parseApiResponse<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Error de API")
  }
  return payload as T
}
