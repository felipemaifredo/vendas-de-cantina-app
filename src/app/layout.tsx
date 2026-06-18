//Libs
import type { Metadata } from "next"
import { Roboto } from "next/font/google"
import { ToastContainer } from "react-toastify"

//Imports
import "react-toastify/dist/ReactToastify.css"
import "./globals.css"

//Types
type RootLayoutProps = {
  children: React.ReactNode
}

//Consts
const roboto = Roboto({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap"
})

export const metadata: Metadata = {
  title: "Controle de Vendas — Cantina & Eventos",
  description: "Sistema rápido e responsivo de registro de vendas para cantina e eventos"
}

//Main
const RootLayout = ({ children }: RootLayoutProps) => {
  return (
    <html lang="pt-BR" className={roboto.className}>
      <body>
        {children}
        <ToastContainer position="top-center" autoClose={3000} />
      </body>
    </html>
  )
}

export default RootLayout
