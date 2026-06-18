//Libs
import React, { useState, useEffect } from "react"
import { Calendar, Eye, X, Clock, DollarSign, ListCollapse } from "lucide-react"

//Imports
import { getOrders } from "../../../lib/Utils/dataService"
import styles from "./History.module.css"

//Types
import type { Order } from "../../../lib/Utils/types"

type FilterType = "today" | "yesterday" | "7days" | "30days" | "custom"

//Funcs
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

function formatDateTime(isoString: string): string {
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
const History = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 10
  
  // Filter states
  const [filterType, setFilterType] = useState<FilterType>("today")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Modal state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [orders, filterType, startDate, endDate])

  // Handlers (using function keyword as they do not return JSX)
  async function loadData() {
    setLoading(true)
    try {
      const data = await getOrders()
      setOrders(data)
    } catch (e) {
      console.error("Erro ao buscar histórico de pedidos: ", e)
    } finally {
      setLoading(false)
    }
  }

  function applyFilters() {
    if (orders.length === 0) {
      setFilteredOrders([])
      return
    }

    const now = new Date()
    
    // Helper function to set time to start of day (00:00:00.000)
    function getStartOfDay(d: Date): Date {
      const nd = new Date(d)
      nd.setHours(0, 0, 0, 0)
      return nd
    }

    // Helper function to set time to end of day (23:59:59.999)
    function getEndOfDay(d: Date): Date {
      const nd = new Date(d)
      nd.setHours(23, 59, 59, 999)
      return nd
    }

    const startOfToday = getStartOfDay(now)
    const endOfToday = getEndOfDay(now)

    let filtered = orders.filter((order) => {
      const orderDate = new Date(order.createdAt)
      
      switch (filterType) {
        case "today":
          return orderDate >= startOfToday && orderDate <= endOfToday
          
        case "yesterday": {
          const yesterday = new Date(now)
          yesterday.setDate(now.getDate() - 1)
          const startOfYesterday = getStartOfDay(yesterday)
          const endOfYesterday = getEndOfDay(yesterday)
          return orderDate >= startOfYesterday && orderDate <= endOfYesterday
        }
        
        case "7days": {
          const sevenDaysAgo = new Date(now)
          sevenDaysAgo.setDate(now.getDate() - 7)
          const startOfSevenDays = getStartOfDay(sevenDaysAgo)
          return orderDate >= startOfSevenDays
        }
        
        case "30days": {
          const thirtyDaysAgo = new Date(now)
          thirtyDaysAgo.setDate(now.getDate() - 30)
          const startOfThirtyDays = getStartOfDay(thirtyDaysAgo)
          return orderDate >= startOfThirtyDays
        }
        
        case "custom": {
          if (!startDate) return true
          const customStart = getStartOfDay(new Date(startDate + "T00:00:00"))
          const customEnd = endDate
            ? getEndOfDay(new Date(endDate + "T23:59:59"))
            : getEndOfDay(new Date(startDate + "T23:59:59"))
          return orderDate >= customStart && orderDate <= customEnd
        }
        
        default:
          return true
      }
    })

    setFilteredOrders(filtered)
    setCurrentPage(1)
  }

  function handleFilterClick(type: FilterType) {
    setFilterType(type)
    if (type !== "custom") {
      setStartDate("")
      setEndDate("")
    } else {
      // Set defaults for custom range (today)
      const todayStr = new Date().toISOString().split("T")[0]
      setStartDate(todayStr)
      setEndDate(todayStr)
    }
  }

  // Paginated orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  // Calculate stats for the filtered period
  const totalPeriodAmount = filteredOrders.reduce((sum, o) => sum + o.total, 0)
  const totalPeriodOrders = filteredOrders.length

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Histórico de Pedidos</h1>
      </div>

      {/* Period Filters */}
      <div className={styles.filtersBar}>
        <div className={styles.filterButtons}>
          <button
            onClick={() => handleFilterClick("today")}
            className={`${styles.filterBtn} ${filterType === "today" ? styles.filterBtnActive : ""}`}
          >
            Hoje
          </button>
          <button
            onClick={() => handleFilterClick("yesterday")}
            className={`${styles.filterBtn} ${filterType === "yesterday" ? styles.filterBtnActive : ""}`}
          >
            Ontem
          </button>
          <button
            onClick={() => handleFilterClick("7days")}
            className={`${styles.filterBtn} ${filterType === "7days" ? styles.filterBtnActive : ""}`}
          >
            Últimos 7 dias
          </button>
          <button
            onClick={() => handleFilterClick("30days")}
            className={`${styles.filterBtn} ${filterType === "30days" ? styles.filterBtnActive : ""}`}
          >
            Últimos 30 dias
          </button>
          <button
            onClick={() => handleFilterClick("custom")}
            className={`${styles.filterBtn} ${filterType === "custom" ? styles.filterBtnActive : ""}`}
          >
            Período Personalizado
          </button>
        </div>

        {filterType === "custom" && (
          <div className={styles.customDateRange}>
            <div className={styles.dateGroup}>
              <label className={styles.label} htmlFor="start-date">De:</label>
              <input
                id="start-date"
                type="date"
                className={styles.inputDate}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className={styles.dateGroup}>
              <label className={styles.label} htmlFor="end-date">Até:</label>
              <input
                id="end-date"
                type="date"
                className={styles.inputDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "14px", borderTop: "1px solid var(--color-border)", paddingTop: "12px" }}>
          <div>
            <span style={{ color: "var(--color-text-secondary)" }}>Total do período: </span>
            <strong style={{ color: "var(--color-primary)" }}>{formatCurrency(totalPeriodAmount)}</strong>
          </div>
          <div>
            <span style={{ color: "var(--color-text-secondary)" }}>Pedidos: </span>
            <strong>{totalPeriodOrders}</strong>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
            Carregando histórico...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
            Nenhum pedido realizado neste período.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Data/Hora</th>
                <th className={styles.th}>ID do Pedido</th>
                <th className={styles.th}>Quantidade de Itens</th>
                <th className={styles.th}>Valor Total</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
                return (
                  <tr key={order.id}>
                    <td className={styles.td}>{formatDateTime(order.createdAt)}</td>
                    <td className={styles.td} style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      {order.id}
                    </td>
                    <td className={styles.td}>{totalItems} itens</td>
                    <td className={styles.td} style={{ fontWeight: 700, color: "var(--color-success)" }}>
                      {formatCurrency(order.total)}
                    </td>
                    <td className={styles.td} style={{ textAlign: "right" }}>
                      <button
                        className={styles.viewBtn}
                        onClick={() => setSelectedOrder(order)}
                      >
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Eye size={14} /> Detalhes
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

      {/* Pagination Controls */}
      {filteredOrders.length > itemsPerPage && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <span className={styles.paginationInfo}>
            Página {currentPage} de {totalPages || 1}
          </span>
          <button
            className={styles.paginationBtn}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Próxima
          </button>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Detalhes do Pedido</h2>
              <button className={styles.modalCloseBtn} onClick={() => setSelectedOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.metaGrid}>
                <div>
                  <span className={styles.metaLabel}>Data e Hora</span>
                  <span className={styles.metaVal}>{formatDateTime(selectedOrder.createdAt)}</span>
                </div>
                <div>
                  <span className={styles.metaLabel}>ID do Pedido</span>
                  <span className={styles.metaVal} style={{ fontSize: 12, wordBreak: "break-all" }}>
                    {selectedOrder.id}
                  </span>
                </div>
                {selectedOrder.cashSessionId && (
                  <div style={{ gridColumn: "span 2" }}>
                    <span className={styles.metaLabel}>Sessão de Caixa</span>
                    <span className={styles.metaVal}>{selectedOrder.cashSessionId}</span>
                  </div>
                )}
              </div>

              <span className={styles.sectionTitle}>Produtos Vendidos</span>
              <div className={styles.detailsList}>
                {selectedOrder.items.map((item) => (
                  <div key={item.productId} className={styles.detailRow}>
                    <div>
                      <div className={styles.detailItemTitle}>{item.name}</div>
                      <div className={styles.detailItemSub}>
                        {item.quantity}x de {formatCurrency(item.unitPrice)}
                      </div>
                    </div>
                    <span className={styles.detailRowTotal}>{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className={styles.summaryTotalRow}>
                <span className={styles.totalLabel}>Valor Pago</span>
                <strong className={styles.totalValue}>{formatCurrency(selectedOrder.total)}</strong>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button className={styles.closeBtn} onClick={() => setSelectedOrder(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default History
