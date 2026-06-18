//Libs
import React, { useState, useEffect } from "react"
import { Calendar, DollarSign, Calculator, Lock, Unlock, X, Eye, AlertTriangle } from "lucide-react"
import { toast } from "react-toastify"

//Imports
import { getCashSessions, getOrders, saveOrder } from "../../../lib/Utils/dataService"
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

  async function handleAllocateUnspecified(targetMethod: "money" | "pix", sessionId: string) {
    try {
      const ordersToUpdate = allOrders.filter(
        o => o.cashSessionId === sessionId && o.paymentMethod !== "money" && o.paymentMethod !== "pix"
      )

      if (ordersToUpdate.length === 0) return

      for (const order of ordersToUpdate) {
        const updatedOrder = {
          ...order,
          paymentMethod: targetMethod
        }
        await saveOrder(updatedOrder)
      }

      await loadData()
      toast.success(`Vendas alocadas em ${targetMethod === "money" ? "Dinheiro" : "Pix"} com sucesso!`)
    } catch (err) {
      console.error("Erro ao alocar vendas não informadas: ", err)
      toast.error("Erro ao alocar vendas.")
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
            {/* Session Metadata Info */}
            <div className={styles.sessionMeta}>
              <span><strong>Aberto em:</strong> {formatDateTime(currentSession.openedAt)}</span>
              <span><strong>Fundo de Entrada (Troco):</strong> {formatCurrency(currentSession.initialValue)}</span>
            </div>

            {/* Dashboard grid sections */}
            <div className={styles.dashboardSections}>
              
              {/* 1. Caixa Físico (Dinheiro) */}
              <div className={`${styles.cardSection} ${styles.cardPhysical}`}>
                <div className={styles.cardTitleSection}>
                  <DollarSign size={18} style={{ color: "var(--color-success)" }} />
                  <span style={{ fontWeight: 700 }}>Dinheiro (Físico)</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Fundo Inicial</span>
                  <span>{formatCurrency(currentSession.initialValue)}</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Vendas em Dinheiro (+)</span>
                  <span>{formatCurrency(activeMoneySales)}</span>
                </div>
                <div className={styles.metricRowHighlight} style={{ color: "var(--color-success)" }}>
                  <span>Esperado na Gaveta</span>
                  <span>{formatCurrency(activeExpectedCash)}</span>
                </div>
              </div>

              {/* 2. Caixa Digital (Pix) */}
              <div className={`${styles.cardSection} ${styles.cardDigital}`}>
                <div className={styles.cardTitleSection}>
                  <Calculator size={18} style={{ color: "var(--color-primary)" }} />
                  <span style={{ fontWeight: 700 }}>PIX (Banco)</span>
                </div>
                <div className={styles.metricRow} style={{ flexGrow: 1, alignItems: "flex-start" }}>
                  <span>Vendas por Pix (+)</span>
                  <span style={{ fontWeight: 500 }}>{formatCurrency(activeExpectedPix)}</span>
                </div>
                <div className={styles.metricRowHighlight} style={{ color: "var(--color-primary)" }}>
                  <span>Total Pix Recebido</span>
                  <span>{formatCurrency(activeExpectedPix)}</span>
                </div>
              </div>

              {/* 3. Reconciliação de Não Informados (Se houver saldo pendente) */}
              {activeUnspecifiedSales > 0 && (
                <div className={`${styles.cardSection} ${styles.cardWarning} ${styles.fullWidth}`}>
                  <div className={styles.cardTitleSection}>
                    <AlertTriangle size={18} style={{ color: "var(--color-warning)" }} />
                    <span style={{ color: "var(--color-warning)", fontWeight: 700 }}>Conciliação Necessária</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                    Há <strong>{formatCurrency(activeUnspecifiedSales)}</strong> em vendas sem forma de pagamento informada nesta sessão. Escolha para onde destinar esse valor para que o caixa feche corretamente:
                  </p>
                  <div className={styles.allocationButtons}>
                    <button
                      type="button"
                      className={`${styles.btnAllocation} ${styles.btnAllocationMoney}`}
                      onClick={() => handleAllocateUnspecified("money", currentSession.id)}
                    >
                      Enviar para Dinheiro (Gaveta)
                    </button>
                    <button
                      type="button"
                      className={`${styles.btnAllocation} ${styles.btnAllocationPix}`}
                      onClick={() => handleAllocateUnspecified("pix", currentSession.id)}
                    >
                      Enviar para Pix (Banco)
                    </button>
                  </div>
                </div>
              )}

              {/* 4. Resumo Financeiro Total */}
              <div className={`${styles.cardSection} ${styles.cardTotal} ${styles.fullWidth}`}>
                <div className={styles.cardTitleSection}>
                  <Unlock size={18} style={{ color: "var(--color-primary)" }} />
                  <span style={{ fontWeight: 700 }}>Resumo do Turno</span>
                </div>
                <div className={styles.metricRow}>
                  <span>Total Geral Vendido (Dinheiro + Pix + Não Informado)</span>
                  <span style={{ fontWeight: 500 }}>{formatCurrency(activeTotalSold)}</span>
                </div>
                <div className={styles.metricRowHighlight} style={{ color: "var(--color-primary)" }}>
                  <span>Total Geral Esperado (Com Fundo Inicial)</span>
                  <span>{formatCurrency(activeExpectedCash + activeExpectedPix + activeUnspecifiedSales)}</span>
                </div>
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

                {/* Reconciliação Retroativa no Relatório */}
                {sessUnspecifiedSales > 0 && (
                  <div className={`${styles.cardSection} ${styles.cardWarning}`} style={{ marginTop: 8 }}>
                    <div className={styles.cardTitleSection}>
                      <AlertTriangle size={18} style={{ color: "var(--color-warning)" }} />
                      <span style={{ color: "var(--color-warning)", fontWeight: 700 }}>Conciliação Pendente</span>
                    </div>
                    <p style={{ fontSize: 13, color: "var(--color-text-secondary)", margin: 0 }}>
                      Este caixa possui <strong>{formatCurrency(sessUnspecifiedSales)}</strong> em vendas não alocadas. Selecione o destino para recalcular o relatório:
                    </p>
                    <div className={styles.allocationButtons}>
                      <button
                        type="button"
                        className={`${styles.btnAllocation} ${styles.btnAllocationMoney}`}
                        onClick={() => handleAllocateUnspecified("money", selectedSession.id)}
                      >
                        Enviar para Dinheiro
                      </button>
                      <button
                        type="button"
                        className={`${styles.btnAllocation} ${styles.btnAllocationPix}`}
                        onClick={() => handleAllocateUnspecified("pix", selectedSession.id)}
                      >
                        Enviar para Pix
                      </button>
                    </div>
                  </div>
                )}

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
