//Libs
import { initializeApp, getApps, getApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

//Types
type FirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

//Consts
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
}

// Check if we have valid Firebase keys
export function isFirebaseConfigured(): boolean {
  return (
    typeof window !== "undefined" &&
    !!firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "YOUR_API_KEY"
  )
}

// Initialize Firebase
function getFirebaseServices() {
  const hasConfig = isFirebaseConfigured()
  
  if (!hasConfig) {
    return {
      app: null,
      auth: null,
      db: null
    }
  }

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()
    const auth = getAuth(app)
    const db = getFirestore(app)
    return { app, auth, db }
  } catch (error) {
    console.error("Erro ao inicializar o Firebase: ", error)
    return {
      app: null,
      auth: null,
      db: null
    }
  }
}

export const { app, auth, db } = getFirebaseServices()
