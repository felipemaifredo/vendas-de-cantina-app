//Libs
import React, { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, Mail, ChevronLeft } from "lucide-react"

//Imports
import { useAuth } from "../../../app/auth"
import styles from "./Login.module.css"

//Main
const Login = () => {
  const { login, resetPassword, isLocalMode } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // Handlers (using function keyword as they do not return JSX)
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password)
      router.push("/sales")
    } catch (err: any) {
      setError(err.message || "Credenciais inválidas")
    } finally {
      setLoading(false)
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)
    try {
      await resetPassword(email)
      setSuccess("E-mail de recuperação enviado com sucesso!")
    } catch (err: any) {
      setError(err.message || "Erro ao solicitar recuperação de senha")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1 className={styles.title}>Cantina & Eventos</h1>
          <p className={styles.subtitle}>
            {isForgotPassword ? "Recupere o acesso à sua conta" : "Entre para registrar vendas"}
          </p>
          {isLocalMode && (
            <span className={styles.badgeLocal}>Modo Demonstração</span>
          )}
        </div>

        {error && <div className={styles.errorAlert}>{error}</div>}
        {success && <div className={styles.infoText}>{success}</div>}

        {!isForgotPassword ? (
          <form className={styles.form} onSubmit={handleLogin}>
            <div className={styles.inputGroup}>
              <label htmlFor="email" className={styles.label}>E-mail</label>
              <input
                id="email"
                type="email"
                className={styles.input}
                placeholder="felipe@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor="password" className={styles.label}>Senha</label>
              <input
                id="password"
                type="password"
                className={styles.input}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {isLocalMode && (
              <div className={styles.infoText}>
                <strong>Dica:</strong> Acesse com o e-mail <code>felipe@email.com</code> e senha <code>123456</code>.
              </div>
            )}

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>

            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setError(null)
                setIsForgotPassword(true)
              }}
            >
              Esqueci minha senha
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleResetPassword}>
            <div className={styles.inputGroup}>
              <label htmlFor="recovery-email" className={styles.label}>E-mail da Conta</label>
              <input
                id="recovery-email"
                type="email"
                className={styles.input}
                placeholder="felipe@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <button type="submit" className={styles.button} disabled={loading}>
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </button>

            <button
              type="button"
              className={styles.linkButton}
              onClick={() => {
                setError(null)
                setSuccess(null)
                setIsForgotPassword(false)
              }}
              style={{ display: "flex", alignItems: "center", gap: "4px" }}
            >
              <ChevronLeft size={16} /> Voltar para o login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default Login
