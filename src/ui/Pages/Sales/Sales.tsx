//Libs
import React, { useState, useEffect } from "react"
import { ShoppingCart, Trash2, Plus, Minus, AlertTriangle, Play, X, Check } from "lucide-react"
import { toast } from "react-toastify"

//Imports
import { getProducts, getCombos } from "../../../lib/Utils/dataService"
import { useCart } from "../../../app/cart"
import { useCash } from "../../../app/cash"
import styles from "./Sales.module.css"

//Types
import type { Product, Combo } from "../../../lib/Utils/types"

//Funcs
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

//Main
const Sales = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [combos, setCombos] = useState<Combo[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [mobileCartExpanded, setMobileCartExpanded] = useState<boolean>(false)
  
  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false)
  const [amountPaid, setAmountPaid] = useState<string>("")
  const [paymentMethod, setPaymentMethod] = useState<"money" | "pix" | undefined>(undefined)

  useEffect(() => {
    if (!isCheckoutOpen) {
      setAmountPaid("")
      setPaymentMethod(undefined)
    }
  }, [isCheckoutOpen])

  useEffect(() => {
    if (amountPaid && amountPaid.trim() !== "") {
      setPaymentMethod("money")
    }
  }, [amountPaid])

  // Open Cash Register State (Quick actions from sales page)
  const [isCashOpenModalOpen, setIsCashOpenModalOpen] = useState<boolean>(false)
  const [initialCashValue, setInitialCashValue] = useState<string>("100.00")

  // Cart & Cash Context Hooks
  const { items, cartTotal, addToCart, addComboToCart, removeItem, decrementItem, clearCart, checkout } = useCart()
  const { currentSession, openSession } = useCash()

  useEffect(() => {
    loadData()
  }, [])

  // Handlers (using function keyword as they do not return JSX)
  async function loadData() {
    setLoading(true)
    try {
      const prodsData = await getProducts()
      const combosData = await getCombos()
      setProducts(prodsData.filter(p => p.active))
      setCombos(combosData.filter(c => c.active))
    } catch (e) {
      console.error("Erro ao carregar dados do PDV: ", e)
    } finally {
      setLoading(false)
    }
  }

  function handleProductClick(product: Product) {
    if (!currentSession) {
      setIsCashOpenModalOpen(true)
      return
    }
    addToCart(product)
  }

  function handleComboClick(combo: Combo) {
    if (!currentSession) {
      setIsCashOpenModalOpen(true)
      return
    }
    // Business rule: Ao selecionar um combo, os produtos são adicionados individualmente ao pedido
    const productsInCombo = combo.items
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p)
    
    addComboToCart(combo.name, productsInCombo)
  }

  async function handleOpenCashSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(initialCashValue.replace(",", "."))
    if (isNaN(val) || val < 0) {
      toast.warning("Por favor, digite um valor inicial válido.")
      return
    }
    try {
      await openSession(val)
      setIsCashOpenModalOpen(false)
      toast.success("Caixa aberto com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao abrir o caixa.")
    }
  }

  async function handleConfirmCheckout() {
    try {
      await checkout(paymentMethod)
      setIsCheckoutOpen(false)
      setMobileCartExpanded(false)
      toast.success("Venda registrada com sucesso!")
    } catch (err) {
      console.error(err)
      toast.error("Erro ao registrar a venda.")
    }
  }

  function handleCancelSale() {
    if (confirm("Deseja realmente cancelar e esvaziar o pedido atual?")) {
      clearCart()
      setIsCheckoutOpen(false)
      setMobileCartExpanded(false)
    }
  }

  // Group products by category
  const categories = Array.from(new Set(products.map(p => p.category)))

  return (
    <div className={styles.wrapper}>
      {/* Closed Cash Warning */}
      {!currentSession && (
        <div className={styles.warningBanner}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <AlertTriangle size={24} style={{ flexShrink: 0 }} />
            <div>
              <div className={styles.warningTitle}>Caixa Fechado</div>
              <div className={styles.warningText}>É necessário abrir o caixa para iniciar o registro de vendas.</div>
            </div>
          </div>
          <button className={styles.openCashBtn} onClick={() => setIsCashOpenModalOpen(true)}>
            Abrir Caixa
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-secondary)" }}>
          Carregando catálogo...
        </div>
      ) : (
        <div className={styles.gridContainer}>
          {/* CATALOG SECTION (Left column) */}
          <div className={styles.catalogSection}>
            {/* Combos Category */}
            {combos.length > 0 && (
              <div className={styles.categoryBlock}>
                <h2 className={styles.categoryTitle}>Combos</h2>
                <div className={styles.combosGrid}>
                  {combos.map((combo) => {
                    const comboProds = combo.items
                      .map(id => products.find(p => p.id === id))
                      .filter((p): p is Product => !!p)
                    const comboPrice = comboProds.reduce((sum, p) => sum + p.price, 0)
                    return (
                      <button
                        key={combo.id}
                        className={styles.comboCard}
                        onClick={() => handleComboClick(combo)}
                      >
                        <div>
                          <div className={styles.comboCardTitle}>{combo.name}</div>
                          <div className={styles.comboCardItems}>
                            {comboProds.map(p => p.name).join(" + ")}
                          </div>
                        </div>
                        <div className={styles.comboCardPrice}>{formatCurrency(comboPrice)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Individual Product Categories */}
            {categories.map((category) => {
              const categoryProds = products.filter(p => p.category === category)
              return (
                <div key={category} className={styles.categoryBlock}>
                  <h2 className={styles.categoryTitle}>{category}</h2>
                  <div className={styles.productsGrid}>
                    {categoryProds.map((prod) => (
                      <button
                        key={prod.id}
                        className={styles.productCard}
                        onClick={() => handleProductClick(prod)}
                      >
                        <span className={styles.productCardName}>{prod.name}</span>
                        <span className={styles.productCardPrice}>{formatCurrency(prod.price)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CART COLUMN SECTION (Right column - Desktop only) */}
          <div className={styles.cartSection}>
            <div className={styles.cartHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <ShoppingCart size={20} />
                <span className={styles.cartTitle}>Pedido Atual</span>
              </div>
              {items.length > 0 && (
                <button className={styles.clearCartBtn} onClick={clearCart}>
                  Limpar
                </button>
              )}
            </div>

            <div className={styles.cartItemsList}>
              {items.length === 0 ? (
                <div className={styles.emptyCart}>
                  <ShoppingCart size={40} style={{ strokeWidth: 1.5 }} />
                  <span>Toque nos produtos ao lado para iniciar a venda.</span>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.productId} className={styles.cartItem}>
                    <div className={styles.cartItemInfo}>
                      <span className={styles.cartItemName}>{item.name}</span>
                      <span className={styles.cartItemPrice}>{formatCurrency(item.unitPrice)}</span>
                    </div>
                    <div className={styles.cartItemQtyControls}>
                      <button className={styles.qtyBtn} onClick={() => decrementItem(item.productId)}>
                        <Minus size={14} />
                      </button>
                      <span className={styles.qtyValue}>{item.quantity}</span>
                      <button
                        className={styles.qtyBtn}
                        onClick={() => {
                          const originalProd = products.find(p => p.id === item.productId)
                          if (originalProd) addToCart(originalProd)
                        }}
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    <span className={styles.cartItemTotal}>{formatCurrency(item.total)}</span>
                  </div>
                ))
              )}
            </div>

            <div className={styles.cartFooter}>
              <div className={styles.cartTotalRow}>
                <span className={styles.cartTotalLabel}>Total</span>
                <span className={styles.cartTotalValue}>{formatCurrency(cartTotal)}</span>
              </div>
              <button
                className={styles.checkoutBtn}
                disabled={items.length === 0}
                onClick={() => setIsCheckoutOpen(true)}
              >
                FINALIZAR PEDIDO
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE STICKY FOOTER CART */}
      {items.length > 0 && (
        <div className={styles.mobileFooterCart}>
          {/* Expanded summary checklist drawer */}
          {mobileCartExpanded && (
            <div className={styles.mobileCartDrawer}>
              {items.map(item => (
                <div
                  key={item.productId}
                  className={styles.cartItem}
                  style={{ marginBottom: 6, padding: "8px 10px" }}
                >
                  <div className={styles.cartItemInfo}>
                    <span className={styles.cartItemName}>{item.name}</span>
                    <span className={styles.cartItemPrice}>
                      {item.quantity}x de {formatCurrency(item.unitPrice)}
                    </span>
                  </div>
                  <div className={styles.cartItemQtyControls}>
                    <button className={styles.qtyBtn} onClick={() => decrementItem(item.productId)}>
                      <Minus size={12} />
                    </button>
                    <span className={styles.qtyValue} style={{ fontSize: 13 }}>{item.quantity}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => {
                        const originalProd = products.find(p => p.id === item.productId)
                        if (originalProd) addToCart(originalProd)
                      }}
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <span className={styles.cartItemTotal} style={{ fontSize: 13 }}>
                    {formatCurrency(item.total)}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className={styles.mobileFooterSummary}>
            <div className={styles.mobileFooterSummaryLeft} onClick={() => setMobileCartExpanded(!mobileCartExpanded)}>
              <span className={styles.mobileCartQtyBadge}>
                {items.reduce((s, i) => s + i.quantity, 0)} itens (tocar para {mobileCartExpanded ? "recolher" : "ver"})
              </span>
              <span className={styles.mobileCartTotal}>{formatCurrency(cartTotal)}</span>
            </div>
            <button className={styles.mobileCheckoutBtn} onClick={() => setIsCheckoutOpen(true)}>
              FINALIZAR
            </button>
          </div>
        </div>
      )}

      {/* CHECKOUT MODAL (Modal de Finalização - Módulo 5) */}
      {isCheckoutOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Confirmar Venda</h2>
              <button className={styles.iconBtn} onClick={() => setIsCheckoutOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.summaryList}>
                {items.map(item => (
                  <div key={item.productId} className={styles.summaryItem}>
                    <span>
                      <strong>{item.quantity}x</strong> {item.name}
                    </span>
                    <span style={{ color: "var(--color-text-secondary)" }}>
                      {formatCurrency(item.unitPrice)}/un ({formatCurrency(item.total)})
                    </span>
                  </div>
                ))}
              </div>

              <div className={styles.summaryTotalRow}>
                <span style={{ fontSize: 16, fontWeight: 500 }}>Total do Pedido</span>
                <strong style={{ fontSize: 24, color: "var(--color-success)" }}>
                  {formatCurrency(cartTotal)}
                </strong>
              </div>

              {/* FORMA DE PAGAMENTO */}
              <div className={styles.paymentMethodGroup}>
                <label className={styles.changeLabel}>Forma de Pagamento (Opcional)</label>
                <div className={styles.paymentMethodButtons}>
                  <button
                    type="button"
                    className={`${styles.paymentMethodBtn} ${paymentMethod === "money" ? styles.paymentMethodBtnActive : ""}`}
                    onClick={() => setPaymentMethod(paymentMethod === "money" ? undefined : "money")}
                  >
                    Dinheiro
                  </button>
                  <button
                    type="button"
                    className={`${styles.paymentMethodBtn} ${paymentMethod === "pix" ? styles.paymentMethodBtnActive : ""}`}
                    onClick={() => {
                      setPaymentMethod(paymentMethod === "pix" ? undefined : "pix")
                      if (paymentMethod !== "pix") {
                        setAmountPaid("")
                      }
                    }}
                  >
                    Pix
                  </button>
                </div>
              </div>

              {/* ASSISTÊNCIA DE TROCO */}
              <div className={styles.changeAssistance}>
                <div className={styles.formGroup}>
                  <label htmlFor="amount-paid" className={styles.changeLabel}>Assistência de Troco (Valor Pago)</label>
                  <input
                    id="amount-paid"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={styles.changeInput}
                    placeholder="0.00"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                  />
                </div>

                <div className={styles.suggestionsRow}>
                  <button
                    type="button"
                    className={styles.suggestionBtn}
                    onClick={() => {
                      setAmountPaid(cartTotal.toString())
                      setPaymentMethod("money")
                    }}
                  >
                    Dinheiro Exato
                  </button>
                  {[5, 10, 20, 50, 100]
                    .filter((val) => val > cartTotal)
                    .map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={styles.suggestionBtn}
                        onClick={() => {
                          setAmountPaid(val.toString())
                          setPaymentMethod("money")
                        }}
                      >
                        {formatCurrency(val)}
                      </button>
                    ))}
                </div>

                {amountPaid && !isNaN(parseFloat(amountPaid.replace(",", "."))) && (
                  <div className={styles.changeResult}>
                    {parseFloat(amountPaid.replace(",", ".")) >= cartTotal ? (
                      <div className={styles.changeSuccessRow}>
                        <span className={styles.changeResultLabel}>Troco a devolver</span>
                        <strong className={styles.changeResultValue}>
                          {formatCurrency(parseFloat(amountPaid.replace(",", ".")) - cartTotal)}
                        </strong>
                      </div>
                    ) : (
                      <span className={styles.changeInsufficient}>
                        Valor pago é menor que o total do pedido.
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <div className={styles.modalActions}>
                <button className={styles.modalEditBtn} onClick={() => setIsCheckoutOpen(false)}>
                  Editar Pedido
                </button>
                <button className={styles.modalConfirmBtn} onClick={handleConfirmCheckout}>
                  Confirmar Venda
                </button>
              </div>
              <button className={styles.modalCancelBtn} onClick={handleCancelSale}>
                Cancelar e Limpar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CASH OPEN MODAL */}
      {isCashOpenModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} style={{ maxWidth: 360 }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Abertura de Caixa</h2>
              <button className={styles.iconBtn} onClick={() => setIsCashOpenModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleOpenCashSubmit}>
              <div className={styles.modalBody}>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", marginBottom: 8 }}>
                  Defina o valor em dinheiro disponível em caixa no início do turno (troco inicial).
                </p>
                <div className={styles.formGroup}>
                  <label htmlFor="initial-cash" className={styles.label}>Valor Inicial (R$)</label>
                  <input
                    id="initial-cash"
                    type="number"
                    step="any"
                    inputMode="decimal"
                    className={styles.input}
                    value={initialCashValue}
                    onChange={(e) => setInitialCashValue(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={styles.modalFooter}>
                <div className={styles.modalActions} style={{ gridTemplateColumns: "120px 1fr" }}>
                  <button
                    type="button"
                    className={styles.modalEditBtn}
                    onClick={() => setIsCashOpenModalOpen(false)}
                  >
                    Voltar
                  </button>
                  <button type="submit" className={styles.modalConfirmBtn}>
                    Abrir Caixa
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sales
