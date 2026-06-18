//Libs
import React, { useState, useEffect } from "react"
import { Calendar, Eye, X, Clock, DollarSign, ListCollapse, Trash2, Plus, Minus, Edit, AlertCircle } from "lucide-react"
import { toast } from "react-toastify"

//Imports
import { getOrders, getProducts, saveOrder } from "../../../lib/Utils/dataService"
import styles from "./History.module.css"

//Types
import type { Order, Product } from "../../../lib/Utils/types"

//Types
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
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const itemsPerPage = 10
  
  // Filter states
  const [filterType, setFilterType] = useState<FilterType>("today")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")

  // Modal states
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isEditing, setIsEditing] = useState<boolean>(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)

  useEffect(() => {
    loadData()
    loadProducts()
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

  async function loadProducts() {
    try {
      const prods = await getProducts()
      setAllProducts(prods.filter(p => p.active))
    } catch (e) {
      console.error("Erro ao buscar produtos para edição: ", e)
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

  async function handleCancelOrder(order: Order) {
    if (confirm("Deseja realmente cancelar este pedido? Esta ação reajustará as métricas do caixa.")) {
      const updated: Order = {
        ...order,
        status: "cancelled"
      }
      try {
        await saveOrder(updated)
        setSelectedOrder(updated)
        await loadData()
        toast.success("Pedido cancelado com sucesso!")
      } catch (err) {
        console.error(err)
        toast.error("Erro ao cancelar o pedido.")
      }
    }
  }

  async function handleReactivateOrder(order: Order) {
    if (confirm("Deseja realmente reativar este pedido? Isso voltará a somar seus valores nas métricas do caixa.")) {
      const updated: Order = {
        ...order,
        status: "completed"
      }
      try {
        await saveOrder(updated)
        setSelectedOrder(updated)
        await loadData()
        toast.success("Pedido reativado com sucesso!")
      } catch (err) {
        console.error(err)
        toast.error("Erro ao reativar o pedido.")
      }
    }
  }

  function handleStartEdit() {
    if (!selectedOrder) return
    setEditingOrder(JSON.parse(JSON.stringify(selectedOrder)))
    setIsEditing(true)
  }

  function handleUpdateItemQty(productId: string, delta: number) {
    if (!editingOrder) return
    const updatedItems = editingOrder.items.map((item) => {
      if (item.productId === productId) {
        const newQty = Math.max(0, item.quantity + delta)
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.unitPrice
        }
      }
      return item
    }).filter(item => item.quantity > 0)

    const newTotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      total: newTotal
    })
  }

  function handleRemoveItem(productId: string) {
    if (!editingOrder) return
    const updatedItems = editingOrder.items.filter(item => item.productId !== productId)
    const newTotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      total: newTotal
    })
  }

  function handleAddProductToOrder(productId: string) {
    if (!editingOrder) return
    const prod = allProducts.find(p => p.id === productId)
    if (!prod) return

    let exists = false
    const updatedItems = editingOrder.items.map(item => {
      if (item.productId === productId) {
        exists = true
        const newQty = item.quantity + 1
        return {
          ...item,
          quantity: newQty,
          total: newQty * item.unitPrice
        }
      }
      return item
    })

    if (!exists) {
      updatedItems.push({
        productId: prod.id,
        name: prod.name,
        quantity: 1,
        unitPrice: prod.price,
        total: prod.price
      })
    }

    const newTotal = updatedItems.reduce((sum, item) => sum + item.total, 0)
    setEditingOrder({
      ...editingOrder,
      items: updatedItems,
      total: newTotal
    })
  }

  function handleEditPaymentMethod(method: "money" | "pix" | undefined) {
    if (!editingOrder) return
    setEditingOrder({
      ...editingOrder,
      paymentMethod: method
    })
  }

  async function handleSaveEdits() {
    if (!editingOrder) return
    if (editingOrder.items.length === 0) {
      toast.warning("O pedido precisa conter pelo menos 1 item. Para cancelar este pedido, use a opção 'Cancelar Pedido'.")
      return
    }
    try {
      await saveOrder(editingOrder)
      setSelectedOrder(editingOrder)
      setIsEditing(false)
      setEditingOrder(null)
      await loadData()
      toast.success("Pedido atualizado com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao salvar alterações no pedido.")
    }
  }

  // Paginated orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + itemsPerPage)

  // Calculate stats for the filtered period, EXCLUDING CANCELLED orders
  const activeOrders = filteredOrders.filter(o => o.status !== "cancelled")
  const totalPeriodAmount = activeOrders.reduce((sum, o) => sum + o.total, 0)
  const totalPeriodOrders = activeOrders.length

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
            <span style={{ color: "var(--color-text-secondary)" }}>Pedidos (Ativos): </span>
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
                <th className={styles.th}>Itens</th>
                <th className={styles.th}>Pagamento</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th}>Valor Total</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {paginatedOrders.map((order) => {
                const totalItems = order.items.reduce((sum, item) => sum + item.quantity, 0)
                const isCancelled = order.status === "cancelled"
                return (
                  <tr key={order.id} className={isCancelled ? styles.cancelledRow : ""}>
                    <td className={styles.td}>{formatDateTime(order.createdAt)}</td>
                    <td className={styles.td} style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                      {order.id.substring(6, 14)}...
                    </td>
                    <td className={styles.td}>{totalItems} itens</td>
                    <td className={styles.td}>
                      {order.paymentMethod === "money" ? "Dinheiro 💵" : order.paymentMethod === "pix" ? "Pix ⚡" : "Não Informado ❓"}
                    </td>
                    <td className={styles.td}>
                      <span className={`${styles.statusBadge} ${isCancelled ? styles.statusCancelled : styles.statusCompleted}`}>
                        {isCancelled ? "Cancelado" : "Concluído"}
                      </span>
                    </td>
                    <td className={styles.td} style={{ fontWeight: 700, color: isCancelled ? "var(--color-text-muted)" : "var(--color-success)", textDecoration: isCancelled ? "line-through" : "none" }}>
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

      {/* Order Detail / Edit Modal */}
      {selectedOrder && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>{isEditing ? "Editar Pedido" : "Detalhes do Pedido"}</h2>
              <button className={styles.modalCloseBtn} onClick={() => { setSelectedOrder(null); setIsEditing(false); setEditingOrder(null) }}>
                <X size={20} />
              </button>
            </div>

            {isEditing && editingOrder ? (
              // EDIT MODE
              <>
                <div className={styles.modalBody}>
                  <div className={styles.metaGrid}>
                    <div>
                      <span className={styles.metaLabel}>ID do Pedido</span>
                      <span className={styles.metaVal} style={{ fontSize: 12, wordBreak: "break-all" }}>
                        {editingOrder.id}
                      </span>
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Data/Hora Original</span>
                      <span className={styles.metaVal}>{formatDateTime(editingOrder.createdAt)}</span>
                    </div>
                  </div>

                  <span className={styles.sectionTitle}>Editar Itens</span>
                  <div className={styles.detailsList}>
                    {editingOrder.items.map((item) => (
                      <div key={item.productId} className={styles.editRow}>
                        <div style={{ flexGrow: 1 }}>
                          <div className={styles.detailItemTitle}>{item.name}</div>
                          <div className={styles.detailItemSub}>
                            {formatCurrency(item.unitPrice)} / un
                          </div>
                        </div>
                        <div className={styles.editItemQtyControls}>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => handleUpdateItemQty(item.productId, -1)}
                          >
                            <Minus size={12} />
                          </button>
                          <span className={styles.qtyValue}>{item.quantity}</span>
                          <button
                            type="button"
                            className={styles.qtyBtn}
                            onClick={() => handleUpdateItemQty(item.productId, 1)}
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            type="button"
                            className={styles.deleteBtn}
                            onClick={() => handleRemoveItem(item.productId)}
                            style={{ marginLeft: 8, color: "var(--color-danger)" }}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Product Dropdown */}
                  <div className={styles.addProductGroup}>
                    <label htmlFor="add-product-select" className={styles.selectLabel}>Adicionar Produto ao Pedido</label>
                    <select
                      id="add-product-select"
                      className={styles.selectInput}
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleAddProductToOrder(e.target.value)
                          e.target.value = ""
                        }
                      }}
                    >
                      <option value="" disabled>Selecione um produto...</option>
                      {allProducts
                        .filter(prod => !editingOrder.items.some(item => item.productId === prod.id))
                        .map(prod => (
                          <option key={prod.id} value={prod.id}>
                            {prod.name} ({formatCurrency(prod.price)})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Payment Method Selector */}
                  <div className={styles.editPaymentGroup}>
                    <span className={styles.sectionTitle}>Forma de Pagamento</span>
                    <div className={styles.editPaymentButtons}>
                      <button
                        type="button"
                        className={`${styles.paymentBtn} ${editingOrder.paymentMethod === "money" ? styles.paymentBtnActive : ""}`}
                        onClick={() => handleEditPaymentMethod("money")}
                      >
                        Dinheiro
                      </button>
                      <button
                        type="button"
                        className={`${styles.paymentBtn} ${editingOrder.paymentMethod === "pix" ? styles.paymentBtnActive : ""}`}
                        onClick={() => handleEditPaymentMethod("pix")}
                      >
                        Pix
                      </button>
                      <button
                        type="button"
                        className={`${styles.paymentBtn} ${!editingOrder.paymentMethod ? styles.paymentBtnActive : ""}`}
                        onClick={() => handleEditPaymentMethod(undefined)}
                      >
                        Não Informado
                      </button>
                    </div>
                  </div>

                  <div className={styles.summaryTotalRow} style={{ borderTop: "1px solid var(--color-border)", paddingTop: 16 }}>
                    <span className={styles.totalLabel}>Novo Total</span>
                    <strong className={styles.totalValue}>{formatCurrency(editingOrder.total || 0)}</strong>
                  </div>
                </div>

                <div className={styles.modalFooter} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button
                    className={styles.cancelEditBtn}
                    onClick={() => {
                      setIsEditing(false)
                      setEditingOrder(null)
                    }}
                  >
                    Cancelar Edição
                  </button>
                  <button className={styles.saveEditBtn} onClick={handleSaveEdits}>
                    Salvar Alterações
                  </button>
                </div>
              </>
            ) : (
              // DETAIL MODE
              <>
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
                    <div>
                      <span className={styles.metaLabel}>Forma de Pagamento</span>
                      <span className={styles.metaVal}>
                        {selectedOrder.paymentMethod === "money" ? "Dinheiro 💵" : selectedOrder.paymentMethod === "pix" ? "Pix ⚡" : "Não Informado ❓"}
                      </span>
                    </div>
                    <div>
                      <span className={styles.metaLabel}>Status</span>
                      <span className={`${styles.statusBadge} ${selectedOrder.status === "cancelled" ? styles.statusCancelled : styles.statusCompleted}`}>
                        {selectedOrder.status === "cancelled" ? "Cancelado" : "Concluído"}
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
                    <strong className={styles.totalValue} style={{ textDecoration: selectedOrder.status === "cancelled" ? "line-through" : "none", color: selectedOrder.status === "cancelled" ? "var(--color-text-muted)" : "var(--color-success)" }}>
                      {formatCurrency(selectedOrder.total)}
                    </strong>
                  </div>
                </div>

                <div className={styles.modalFooter} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {selectedOrder.status !== "cancelled" ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
                      <button className={styles.editBtnAction} onClick={handleStartEdit}>
                        <Edit size={14} style={{ marginRight: 6 }} /> Editar Pedido
                      </button>
                      <button className={styles.cancelBtnAction} onClick={() => handleCancelOrder(selectedOrder)}>
                        <Trash2 size={14} style={{ marginRight: 6 }} /> Cancelar Pedido
                      </button>
                    </div>
                  ) : (
                    <button className={styles.reactivateBtnAction} onClick={() => handleReactivateOrder(selectedOrder)}>
                      <AlertCircle size={14} style={{ marginRight: 6 }} /> Reativar Pedido
                    </button>
                  )}
                  <button className={styles.closeBtn} onClick={() => setSelectedOrder(null)} style={{ width: "100%" }}>
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default History
