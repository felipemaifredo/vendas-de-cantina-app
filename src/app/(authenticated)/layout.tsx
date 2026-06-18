"use client"

//Libs
import React, { useEffect } from "react"
import { useRouter } from "next/navigation"

//Imports
import { AuthProvider, useAuth } from "../auth"
import { CashProvider } from "../cash"
import { CartProvider } from "../cart"
import Navigation from "../../ui/Components/Navigation/Navigation"

//Types
type LayoutProps = {
  children: React.ReactNode
}

//Main
const AuthenticatedGuard = ({ children }: LayoutProps) => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        backgroundColor: "var(--color-bg)",
        color: "var(--color-text-secondary)",
        fontSize: 16
      }}>
        Verificando autenticação...
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <CashProvider>
      <CartProvider>
        <Navigation>
          {children}
        </Navigation>
      </CartProvider>
    </CashProvider>
  )
}

const AuthenticatedLayout = ({ children }: LayoutProps) => {
  return (
    <AuthProvider>
      <AuthenticatedGuard>
        {children}
      </AuthenticatedGuard>
    </AuthProvider>
  )
}

export default AuthenticatedLayout
