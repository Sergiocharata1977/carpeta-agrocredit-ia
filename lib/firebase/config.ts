import { getApp, getApps, initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"
import { getStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const missingFirebaseClientConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key)

export const hasFirebaseClientConfig = missingFirebaseClientConfig.length === 0

let firebaseApp = hasFirebaseClientConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null

export function getFirebaseDb() {
  if (!firebaseApp) {
    if (!hasFirebaseClientConfig) return null
    firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig)
  }
  return getFirestore(firebaseApp)
}

export function getFirebaseAuth() {
  if (!firebaseApp) return null
  return getAuth(firebaseApp)
}

export function getFirebaseStorage() {
  if (!firebaseApp) return null
  return getStorage(firebaseApp)
}
