//Libs
import React, { createContext, useContext, useState, useEffect } from "react"
import {
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User
} from "firebase/auth"

//Imports
import { auth, isFirebaseConfigured } from "../lib/Utils/firebase"

//Types
import type { UserProfile } from "../lib/Utils/types"

type AuthContextType = {
  user: UserProfile | null
  loading: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  isLocalMode: boolean
}

type AuthProviderProps = {
  children: React.ReactNode
}

//Consts
const AuthContext = createContext<AuthContextType | undefined>(undefined)

const MOCK_USER: UserProfile = {
  uid: "mock_user_1",
  name: "Felipe (Modo Local)",
  email: "felipe@email.com",
  createdAt: new Date().toISOString()
}

//Main
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const isLocalMode = !isFirebaseConfigured()

  useEffect(() => {
    if (isLocalMode || !auth) {
      // Local Mode Authentication Fallback
      const cached = localStorage.getItem("vendas_cantina_auth_user")
      if (cached) {
        setUser(JSON.parse(cached))
      }
      setLoading(false)
      return
    }

    // Firebase Auth State Listener
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser: User | null) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuário",
          email: firebaseUser.email || "",
          createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
        })
      } else {
        setUser(null)
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [isLocalMode])

  // Helper functions inside component (defined using function keyword)
  async function login(email: string, pass: string): Promise<void> {
    setLoading(true)
    if (isLocalMode || !auth) {
      // Local Mock Login
      if (email === "felipe@email.com" && pass === "123456") {
        localStorage.setItem("vendas_cantina_auth_user", JSON.stringify(MOCK_USER))
        setUser(MOCK_USER)
        setLoading(false)
      } else {
        setLoading(false)
        throw new Error("Usuário ou senha incorretos (Dica Modo Local: felipe@email.com / 123456)")
      }
      return
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass)
    } catch (error: any) {
      setLoading(false)
      throw new Error(error.message || "Erro ao fazer login")
    }
  }

  async function logout(): Promise<void> {
    setLoading(true)
    if (isLocalMode || !auth) {
      localStorage.removeItem("vendas_cantina_auth_user")
      setUser(null)
      setLoading(false)
      return
    }

    try {
      await signOut(auth)
      setUser(null)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Erro ao deslogar: ", error)
    }
  }

  async function resetPassword(email: string): Promise<void> {
    if (isLocalMode || !auth) {
      if (email === "felipe@email.com") {
        alert("Modo Local: Senha redefinida para '123456'!")
      } else {
        throw new Error("E-mail não encontrado no sistema local.")
      }
      return
    }

    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error: any) {
      throw new Error(error.message || "Erro ao enviar email de recuperação")
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, resetPassword, isLocalMode }}>
      {children}
    </AuthContext.Provider>
  )
}

//Funcs
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
