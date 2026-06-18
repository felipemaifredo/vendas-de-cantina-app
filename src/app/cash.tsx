//Libs
import React, { createContext, useContext, useState, useEffect } from "react"

//Imports
import { getCurrentOpenSession, saveCashSession } from "../lib/Utils/dataService"
import { useAuth } from "./auth"

//Types
import type { CashSession } from "../lib/Utils/types"

type CashContextType = {
  currentSession: CashSession | null
  loading: boolean
  openSession: (initialValue: number) => Promise<void>
  closeSession: (finalValue: number) => Promise<void>
  refreshSession: () => Promise<void>
}

type CashProviderProps = {
  children: React.ReactNode
}

//Consts
const CashContext = createContext<CashContextType | undefined>(undefined)

//Main
export const CashProvider = ({ children }: CashProviderProps) => {
  const [currentSession, setCurrentSession] = useState<CashSession | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      refreshSession()
    } else {
      setCurrentSession(null)
      setLoading(false)
    }
  }, [user])

  // Helpers
  async function refreshSession(): Promise<void> {
    setLoading(true)
    try {
      const active = await getCurrentOpenSession()
      setCurrentSession(active)
    } catch (e) {
      console.error("Erro ao verificar sessão do caixa: ", e)
    } finally {
      setLoading(false)
    }
  }

  async function openSession(initialValue: number): Promise<void> {
    if (!user) throw new Error("Usuário não autenticado")
    setLoading(true)
    try {
      const newSession: CashSession = {
        id: "cash_" + Date.now(),
        openedAt: new Date().toISOString(),
        closedAt: null,
        initialValue,
        finalValue: null,
        status: "open",
        userId: user.uid
      }
      await saveCashSession(newSession)
      setCurrentSession(newSession)
    } catch (e) {
      console.error("Erro ao abrir caixa: ", e)
      throw e
    } finally {
      setLoading(false)
    }
  }

  async function closeSession(finalValue: number): Promise<void> {
    if (!currentSession) throw new Error("Nenhum caixa aberto encontrado")
    setLoading(true)
    try {
      const updatedSession: CashSession = {
        ...currentSession,
        closedAt: new Date().toISOString(),
        finalValue,
        status: "closed"
      }
      await saveCashSession(updatedSession)
      setCurrentSession(null)
    } catch (e) {
      console.error("Erro ao fechar caixa: ", e)
      throw e
    } finally {
      setLoading(false)
    }
  }

  return (
    <CashContext.Provider value={{ currentSession, loading, openSession, closeSession, refreshSession }}>
      {children}
    </CashContext.Provider>
  )
}

//Funcs
export function useCash() {
  const context = useContext(CashContext)
  if (context === undefined) {
    throw new Error("useCash deve ser usado dentro de um CashProvider")
  }
  return context
}
