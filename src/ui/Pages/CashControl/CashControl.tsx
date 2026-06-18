//Libs
import React, { useState, useEffect } from "react"
import { Calendar, DollarSign, Calculator, Lock, Unlock, X, Eye } from "lucide-react"
import { toast } from "react-toastify"

//Imports
import { getCashSessions, getOrders } from "../../../lib/Utils/dataService"
import { useCash } from "../../../app/cash"
import styles from "./CashControl.module.css"

//Types
import type { CashSession, Order } from "../../../lib/Utils/types"

//Funcs
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function formatDateTime(isoString: string | null): string {
  if (!isoString) return "-"
  const date = new Date(isoString)
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })
}

//Main
const CashControl = () => {
  const { currentSession, openSession, closeSession, refreshSession } = useCash()
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [allOrders, setAllOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  
  // Form values
  const [openVal, setOpenVal] = useState<string>("100.00")
  const [closeVal, setCloseVal] = useState<string>("")

  // Detail modal state
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null)
  const [sessionOrders, setSessionOrders] = useState<Order[]>([])

  useEffect(() => {
    loadData()
  }, [currentSession])

  useEffect(() => {
    if (selectedSession) {
      const filtered = allOrders.filter(o => o.cashSessionId === selectedSession.id)
      setSessionOrders(filtered)
    } else {
      setSessionOrders([])
    }
  }, [selectedSession, allOrders])

  // Handlers (using function keyword as they do not return JSX)
  async function loadData() {
    setLoading(true)
    try {
      const sessionsData = await getCashSessions()
      const ordersData = await getOrders()
      setSessions(sessionsData)
      setAllOrders(ordersData)
      await refreshSession()
    } catch (e) {
      console.error("Erro ao carregar dados do caixa: ", e)
    } finally {
      setLoading(false)
    }
  }

  async function handleOpen(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(openVal.replace(",", "."))
    if (isNaN(val) || val < 0) {
      toast.warning("Valor inicial inválido.")
      return
    }
    try {
      await openSession(val)
      setOpenVal("100.00")
      toast.success("Caixa aberto com sucesso!")
    } catch (err) {
      toast.error("Erro ao abrir caixa.")
    }
  }

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    if (!closeVal) return
    const val = parseFloat(closeVal.replace(",", "."))
    if (isNaN(val) || val < 0) {
      toast.warning("Valor final inválido.")
      return
    }
    try {
      await closeSession(val)
      setCloseVal("")
      toast.success("Caixa fechado com sucesso!")
    } catch (err) {
      toast.error("Erro ao fechar caixa.")
    }
  }

  // Calculate current session stats, EXCLUDING CANCELLED orders
  const activeOrders = currentSession
    ? allOrders.filter(o => o.cashSessionId === currentSession.id && o.status !== "cancelled")
    : []

  const activeMoneySales = activeOrders
    .filter(o => o.paymentMethod === "money")
    .reduce((sum, o) => sum + o.total, 0)

  const activePixSales = activeOrders
    .filter(o => o.paymentMethod === "pix")
    .reduce((sum, o) => sum + o.total, 0)

  const activeUnspecifiedSales = activeOrders
    .filter(o => o.paymentMethod !== "money" && o.paymentMethod !== "pix")
    .reduce((sum, o) => sum + o.total, 0)

  const activeTotalSold = activeOrders.reduce((sum, o) => sum + o.total, 0)
  
  // expected cash in drawer (initial cash + money sales)
  const activeExpectedCash = currentSession ? currentSession.initialValue + activeMoneySales : 0
  // expected Pix sales (direct to bank account)
  const activeExpectedPix = activePixSales

  // Session report calculations (for detail modal)
  const activeSessOrders = sessionOrders.filter(o => o.status !== "cancelled")
  const sessMoneySales = activeSessOrders
    .filter(o => o.paymentMethod === "money")
    .reduce((sum, o) => sum + o.total, 0)
  const sessPixSales = activeSessOrders
    .filter(o => o.paymentMethod === "pix")
    .reduce((sum, o) => sum + o.total, 0)
  const sessUnspecifiedSales = activeSessOrders
    .filter(o => o.paymentMethod !== "money" && o.paymentMethod !== "pix")
    .reduce((sum, o) => sum + o.total, 0)

  const sessTotalSold = activeSessOrders.reduce((sum, o) => sum + o.total, 0)
  const sessExpectedCash = selectedSession ? selectedSession.initialValue + sessMoneySales : 0
  const sessExpectedPix = sessPixSales
  const sessTotalExpectedAll = sessExpectedCash + sessExpectedPix + sessUnspecifiedSales

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Controle de Caixa</h1>
      </div>

      {/* ACTIVE CASH SESSION CARD */}
      <div className={styles.activeCard}>
        <div className={styles.activeHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {currentSession ? (
              <Unlock size={24} style={{ color: "var(--color-success)" }} />
            ) : (
              <Lock size={24} style={{ color: "var(--color-text-muted)" }} />
            )}
            <h2 className={styles.cardTitle}>Status do Caixa Atual</h2>
          </div>
          <span
            className={`${styles.statusBadge} ${
              currentSession ? styles.statusOpen : styles.statusClosed
            }`}
          >
            {currentSession ? "Caixa Aberto" : "Caixa Fechado"}
          </span>
        </div>

        {currentSession ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className={styles.statsGrid}>
              <div className={styles.statItem} style={{ gridColumn: "span 2" }}>
                <span className={styles.statLabel}>Aberto Em</span>
                <span className={styles.statValue} style={{ fontSize: 15 }}>
                  {formatDateTime(currentSession.openedAt)}
                </span>
              </div>
              <div className={styles.statItem} style={{ gridColumn: "span 2" }}>
                <span className={styles.statLabel}>Fundo Inicial (Dinheiro)</span>
                <span className={styles.statValue}>{formatCurrency(currentSession.initialValue)}</span>
              </div>
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Vendas em Dinheiro (+)</span>
                <span className={styles.statValue} style={{ color: "var(--color-primary)" }}>
                  {formatCurrency(activeMoneySales)}
                </span>
              </div>
              <div className={styles.statItem} style={{ border: "1px solid var(--color-success)" }}>
                <span className={styles.statLabel} style={{ color: "var(--color-success)" }}>Esperado em Dinheiro (Físico)</span>
                <span className={styles.statValue} style={{ color: "var(--color-success)" }}>
                  {formatCurrency(activeExpectedCash)}
                </span>
              </div>
              <div className={styles.statItem} style={{ gridColumn: "span 2", border: "1px solid var(--color-primary)" }}>
                <span className={styles.statLabel} style={{ color: "var(--color-primary)" }}>Vendas em Pix (+)</span>
                <span className={styles.statValue} style={{ color: "var(--color-primary)" }}>{formatCurrency(activeExpectedPix)}</span>
              </div>
              {activeUnspecifiedSales > 0 && (
                <div className={styles.statItem} style={{ gridColumn: "span 2" }}>
                  <span className={styles.statLabel}>Não Informado (+)</span>
                  <span className={styles.statValue}>{formatCurrency(activeUnspecifiedSales)}</span>
                </div>
              )}
              <div className={styles.statItem} style={{ gridColumn: "span 2", backgroundColor: "var(--color-primary-light)" }}>
                <span className={styles.statLabel}>Total Geral Esperado</span>
                <span className={styles.statValue} style={{ color: "var(--color-primary)" }}>
                  {formatCurrency(activeExpectedCash + activeExpectedPix + activeUnspecifiedSales)}
                </span>
              </div>
            </div>

            <form className={styles.closeForm} onSubmit={handleClose}>
              <h3 className={styles.formTitle}>Fechamento do Caixa</h3>
              <div className={styles.formInline}>
                <div className={styles.formGroup}>
                  <label htmlFor="close-val" className={styles.label}>Valor Contado em Caixa (Dinheiro Físico) (R$)</label>
                  <input
                    id="close-val"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={styles.input}
                    placeholder="0.00"
                    value={closeVal}
                    onChange={(e) => setCloseVal(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" className={styles.closeBtn}>
                  Fechar Caixa
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 15, color: "var(--color-text-secondary)", marginBottom: 16 }}>
              O caixa está fechado no momento. Abra uma nova sessão de caixa para poder registrar vendas.
            </p>
            <form onSubmit={handleOpen} className={styles.formInline}>
              <div className={styles.formGroup}>
                <label htmlFor="open-val" className={styles.label}>Fundo Inicial (Troco) (R$)</label>
                <input
                  id="open-val"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={styles.input}
                  value={openVal}
                  onChange={(e) => setOpenVal(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={styles.submitBtn}>
                Abrir Caixa
              </button>
            </form>
          </div>
        )}
      </div>

      {/* SESSIONS HISTORY */}
      <h2 className={styles.historyTitle}>Sessões de Caixa Anteriores</h2>
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
            Carregando histórico de caixas...
          </div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
            Nenhuma sessão de caixa registrada.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Abertura</th>
                <th className={styles.th}>Fechamento</th>
                <th className={styles.th}>Inicial</th>
                <th className={styles.th}>Vendas</th>
                <th className={styles.th}>Final Contado</th>
                <th className={styles.th}>Diferença (Físico)</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((sess) => {
                // Ignore cancelled orders for session calculation
                const sessOrders = allOrders.filter(o => o.cashSessionId === sess.id && o.status !== "cancelled")
                const moneySold = sessOrders.filter(o => o.paymentMethod === "money").reduce((sum, o) => sum + o.total, 0)
                const totalSold = sessOrders.reduce((sum, o) => sum + o.total, 0)
                
                // expected cash in drawer = initialValue + moneySold
                const expectedCash = sess.initialValue + moneySold
                const diff = sess.finalValue !== null ? sess.finalValue - expectedCash : null
                
                return (
                  <tr key={sess.id}>
                    <td className={styles.td}>{formatDateTime(sess.openedAt)}</td>
                    <td className={styles.td}>{formatDateTime(sess.closedAt)}</td>
                    <td className={styles.td}>{formatCurrency(sess.initialValue)}</td>
                    <td className={styles.td}>{formatCurrency(totalSold)}</td>
                    <td className={styles.td}>
                      {sess.finalValue !== null ? formatCurrency(sess.finalValue) : "-"}
                    </td>
                    <td className={styles.td}>
                      {diff === null ? (
                        <span style={{ color: "var(--color-text-muted)" }}>Aberto</span>
                      ) : diff === 0 ? (
                        <span>R$ 0,00</span>
                      ) : diff > 0 ? (
                        <span className={styles.diffSurplus}>+{formatCurrency(diff)}</span>
                      ) : (
                        <span className={styles.diffDeficit}>{formatCurrency(diff)}</span>
                      )}
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => setSelectedSession(sess)}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Eye size={14} /> Relatório
                        </span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* SESSION REPORT MODAL */}
      {selectedSession && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Relatório de Caixa</h2>
              <button className={styles.modalCloseBtn} onClick={() => setSelectedSession(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                  <strong>Aberto em:</strong> {formatDateTime(selectedSession.openedAt)} <br />
                  <strong>Fechado em:</strong> {formatDateTime(selectedSession.closedAt)}
                </p>

                <div className={styles.statsGrid} style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
                  <div className={styles.statItem} style={{ gridColumn: "span 2" }}>
                    <span className={styles.statLabel}>Fundo Inicial</span>
                    <span className={styles.statValue}>{formatCurrency(selectedSession.initialValue)}</span>
                  </div>
                  <div className={styles.statItem}>
                    <span className={styles.statLabel}>Vendas Dinheiro (+)</span>
                    <span className={styles.statValue}>{formatCurrency(sessMoneySales)}</span>
                  </div>
                  <div className={styles.statItem} style={{ border: "1px solid var(--color-success)" }}>
                    <span className={styles.statLabel} style={{ color: "var(--color-success)" }}>Esperado em Dinheiro (Físico)</span>
                    <span className={styles.statValue} style={{ color: "var(--color-success)" }}>
                      {formatCurrency(sessExpectedCash)}
                    </span>
                  </div>
                  <div className={styles.statItem} style={{ gridColumn: "span 2", border: "1px solid var(--color-primary)" }}>
                    <span className={styles.statLabel} style={{ color: "var(--color-primary)" }}>Vendas Pix (+)</span>
                    <span className={styles.statValue} style={{ color: "var(--color-primary)" }}>
                      {formatCurrency(sessExpectedPix)}
                    </span>
                  </div>
                  {sessUnspecifiedSales > 0 && (
                    <div className={styles.statItem} style={{ gridColumn: "span 2" }}>
                      <span className={styles.statLabel}>Não Informado (+)</span>
                      <span className={styles.statValue}>{formatCurrency(sessUnspecifiedSales)}</span>
                    </div>
                  )}
                  <div className={styles.statItem} style={{ gridColumn: "span 2", backgroundColor: "var(--color-bg)", border: "1px solid var(--color-border)" }}>
                    <span className={styles.statLabel}>Valor Contado em Caixa (Físico)</span>
                    <span className={styles.statValue}>
                      {selectedSession.finalValue !== null
                        ? formatCurrency(selectedSession.finalValue)
                        : "Não fechado"}
                    </span>
                  </div>
                  {selectedSession.finalValue !== null ? (
                    <>
                      <div className={styles.statItem}>
                        <span className={styles.statLabel}>Total Geral Esperado</span>
                        <span className={styles.statValue}>
                          {formatCurrency(sessTotalExpectedAll)}
                        </span>
                      </div>
                      <div className={styles.statItem} style={{ backgroundColor: "var(--color-primary-light)", border: "1px solid var(--color-primary)" }}>
                        <span className={styles.statLabel} style={{ color: "var(--color-primary-hover)" }}>Total Obtido (Físico + Pix)</span>
                        <span className={styles.statValue} style={{ color: "var(--color-primary-hover)" }}>
                          {formatCurrency(selectedSession.finalValue + sessExpectedPix)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className={styles.statItem} style={{ gridColumn: "span 2" }}>
                      <span className={styles.statLabel}>Total Geral Esperado</span>
                      <span className={styles.statValue}>
                        {formatCurrency(sessTotalExpectedAll)}
                      </span>
                    </div>
                  )}
                </div>

                {selectedSession.finalValue !== null && (
                  <div
                    className={styles.statItem}
                    style={{
                      backgroundColor:
                        selectedSession.finalValue - sessExpectedCash >= 0
                          ? "var(--color-success-light)"
                          : "var(--color-danger-light)",
                      border: "1px solid var(--color-border)",
                      marginTop: 8
                    }}
                  >
                    <span className={styles.statLabel}>Diferença Reconciliada (Caixa Físico)</span>
                    <span
                      className={styles.statValue}
                      style={{
                        color:
                          selectedSession.finalValue - sessExpectedCash >= 0
                            ? "var(--color-success)"
                            : "var(--color-danger)"
                      }}
                    >
                      {formatCurrency(selectedSession.finalValue - sessExpectedCash)}
                    </span>
                  </div>
                )}

                <h3 className={styles.formTitle} style={{ marginTop: 12 }}>
                  Pedidos nesta sessão ({sessionOrders.length})
                </h3>
                <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                  {sessionOrders.length === 0 ? (
                    <div style={{ padding: 12, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>
                      Nenhuma venda registrada neste caixa.
                    </div>
                  ) : (
                    sessionOrders.map(o => {
                      const isCancelled = o.status === "cancelled"
                      return (
                        <div
                          key={o.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 12px",
                            borderBottom: "1px solid var(--color-border)",
                            fontSize: 13,
                            backgroundColor: isCancelled ? "var(--color-danger-light)" : "transparent",
                            opacity: isCancelled ? 0.65 : 1
                          }}
                        >
                          <span style={{ display: "flex", flexDirection: "column" }}>
                            <span>
                              {new Date(o.createdAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                              {isCancelled && <strong style={{ color: "var(--color-danger)", marginLeft: 6 }}>(Cancelado)</strong>}
                            </span>
                            <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                              {o.paymentMethod === "money" ? "Dinheiro" : o.paymentMethod === "pix" ? "Pix" : "Não Informado"}
                            </span>
                          </span>
                          <span style={{ color: "var(--color-text-secondary)" }}>{o.id.substring(6, 12)}...</span>
                          <strong style={{ color: isCancelled ? "var(--color-text-secondary)" : "var(--color-primary)", textDecoration: isCancelled ? "line-through" : "none" }}>
                            {formatCurrency(o.total)}
                          </strong>
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeBtnAction} onClick={() => setSelectedSession(null)}>
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CashControl
