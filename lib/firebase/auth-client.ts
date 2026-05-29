import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { getApp, getApps } from "firebase/app"
import { hasFirebaseClientConfig } from "@/lib/firebase/config"

// Reusar la app ya inicializada por config.ts
function getFirebaseApp() {
  if (!hasFirebaseClientConfig) return null
  return getApps().length ? getApp() : null
}

export function getFirebaseAuth() {
  const app = getFirebaseApp()
  if (!app) return null
  return getAuth(app)
}

export async function loginAdmin(email: string, password: string): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) throw new Error("Firebase Auth no está configurado")
  await signInWithEmailAndPassword(auth, email, password)
}

export async function logoutAdmin(): Promise<void> {
  const auth = getFirebaseAuth()
  if (!auth) return
  await signOut(auth)
}

export function subscribeAuthState(callback: (user: User | null) => void): () => void {
  const auth = getFirebaseAuth()
  if (!auth) {
    callback(null)
    return () => {}
  }
  return onAuthStateChanged(auth, callback)
}

export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth()
  if (!auth?.currentUser) return null
  return auth.currentUser.getIdToken()
}

export async function getFreshIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth()
  if (!auth?.currentUser) return null
  return auth.currentUser.getIdToken(true)
}

export type { User }
