"use client"

//Libs
import { useEffect } from "react"
import { useRouter } from "next/navigation"

//Imports
import { AuthProvider, useAuth } from "./auth"

//Main
const RedirectController = () => {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.replace("/sales")
      } else {
        router.replace("/login")
      }
    }
  }, [user, loading, router])

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "100vh",
      backgroundColor: "var(--color-bg)",
      color: "var(--color-text-secondary)",
      fontSize: 16
    }}>
      Direcionando...
    </div>
  )
}

const Home = () => {
  return (
    <AuthProvider>
      <RedirectController />
    </AuthProvider>
  )
}

export default Home
