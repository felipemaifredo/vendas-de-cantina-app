//Libs
import React, { useState, useEffect } from "react"
import { Plus, Edit2, Trash2, X, ToggleLeft, ToggleRight } from "lucide-react"
import { toast } from "react-toastify"

//Imports
import { getCombos, saveCombo, deleteCombo, getProducts } from "../../../lib/Utils/dataService"
import styles from "./Combos.module.css"

//Types
import type { Combo, Product } from "../../../lib/Utils/types"

//Funcs
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

//Main
const Combos = () => {
  const [combos, setCombos] = useState<Combo[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null)

  // Form states
  const [formName, setFormName] = useState<string>("")
  const [formItems, setFormItems] = useState<string[]>([])
  const [formActive, setFormActive] = useState<boolean>(true)

  useEffect(() => {
    loadData()
  }, [])

  // Handlers (using function keyword as they do not return JSX)
  async function loadData() {
    setLoading(true)
    try {
      const combosData = await getCombos()
      const productsData = await getProducts()
      setCombos(combosData)
      setProducts(productsData)
    } catch (e) {
      console.error("Erro ao carregar combos/produtos: ", e)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingCombo(null)
    setFormName("")
    setFormItems([])
    setFormActive(true)
    setIsModalOpen(true)
  }

  function openEditModal(combo: Combo) {
    setEditingCombo(combo)
    setFormName(combo.name)
    setFormItems(combo.items)
    setFormActive(combo.active)
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formName.trim()) return
    if (formItems.length === 0) {
      toast.warning("Por favor, selecione pelo menos um produto para o combo.")
      return
    }

    const comboId = editingCombo ? editingCombo.id : "combo_" + Date.now()
    const newCombo: Combo = {
      id: comboId,
      name: formName.trim(),
      items: formItems,
      active: formActive
    }

    try {
      await saveCombo(newCombo)
      setIsModalOpen(false)
      loadData()
      toast.success(editingCombo ? "Combo atualizado com sucesso!" : "Combo criado com sucesso!")
    } catch (err) {
      console.error("Erro ao salvar combo: ", err)
      toast.error("Erro ao salvar combo.")
    }
  }

  async function handleToggleActive(combo: Combo) {
    const updated: Combo = {
      ...combo,
      active: !combo.active
    }
    try {
      await saveCombo(updated)
      loadData()
    } catch (err) {
      console.error("Erro ao alterar status do combo: ", err)
    }
  }

  async function handleDelete(id: string) {
    if (confirm("Deseja realmente excluir este combo?")) {
      try {
        await deleteCombo(id)
        loadData()
      } catch (err) {
        console.error("Erro ao excluir combo: ", err)
      }
    }
  }

  function handleProductCheckboxChange(prodId: string) {
    setFormItems((prev) => {
      if (prev.includes(prodId)) {
        return prev.filter(id => id !== prodId)
      } else {
        return [...prev, prodId]
      }
    })
  }

  // Helper to map products inside a combo
  function getComboProducts(combo: Combo): Product[] {
    return combo.items
      .map(id => products.find(p => p.id === id))
      .filter((p): p is Product => !!p)
  }

  // Helper to calculate total combo price
  function getComboPrice(combo: Combo): number {
    const comboProds = getComboProducts(combo)
    return comboProds.reduce((sum, p) => sum + p.price, 0)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Combos</h1>
        <button className={styles.addButton} onClick={openAddModal}>
          <Plus size={20} />
          <span>Novo Combo</span>
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
          Carregando combos...
        </div>
      ) : combos.length === 0 ? (
        <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
          Nenhum combo cadastrado. Crie um combo para registrar vendas rápidas.
        </div>
      ) : (
        <div className={styles.grid}>
          {combos.map((combo) => {
            const comboProds = getComboProducts(combo)
            const totalPrice = getComboPrice(combo)
            return (
              <div key={combo.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.cardTitle}>{combo.name}</h2>
                  <span
                    className={`${styles.statusBadge} ${
                      combo.active ? styles.activeBadge : styles.inactiveBadge
                    }`}
                  >
                    {combo.active ? "Ativo" : "Inativo"}
                  </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span className={styles.sectionTitle}>Itens inclusos</span>
                  <div className={styles.productsList}>
                    {comboProds.length === 0 ? (
                      <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
                        Nenhum produto cadastrado neste combo.
                      </span>
                    ) : (
                      comboProds.map((prod) => (
                        <div key={prod.id} className={styles.productItem}>
                          <span>{prod.name}</span>
                          <span className={styles.productPrice}>{formatCurrency(prod.price)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                  <span className={styles.sectionTitle}>Total do Combo</span>
                  <strong style={{ fontSize: 16, color: "var(--color-primary)" }}>
                    {formatCurrency(totalPrice)}
                  </strong>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    className={`${styles.iconBtn} ${styles.editBtn}`}
                    onClick={() => openEditModal(combo)}
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={() => handleToggleActive(combo)}
                    title={combo.active ? "Desativar" : "Ativar"}
                  >
                    {combo.active ? (
                      <ToggleRight size={22} style={{ color: "var(--color-success)" }} />
                    ) : (
                      <ToggleLeft size={22} />
                    )}
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.deleteBtn}`}
                    onClick={() => handleDelete(combo.id)}
                    title="Excluir"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Combo Form Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingCombo ? "Editar Combo" : "Novo Combo"}
              </h2>
              <button className={styles.modalCloseBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="combo-name">Nome do Combo</label>
                <input
                  id="combo-name"
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Combo Lanche Feliz"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Selecione os Produtos</label>
                <div className={styles.productsSelector}>
                  {products.length === 0 ? (
                    <div style={{ padding: 12, textAlign: "center", fontSize: 14 }}>
                      Nenhum produto cadastrado. Cadastre produtos primeiro.
                    </div>
                  ) : (
                    products.filter(p => p.active).map(prod => (
                      <label key={prod.id} className={styles.productCheckItem}>
                        <input
                          type="checkbox"
                          className={styles.checkbox}
                          checked={formItems.includes(prod.id)}
                          onChange={() => handleProductCheckboxChange(prod.id)}
                        />
                        <span style={{ flexGrow: 1 }}>{prod.name}</span>
                        <span style={{ fontWeight: 500 }}>{formatCurrency(prod.price)}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  id="combo-active"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                <label className={styles.label} htmlFor="combo-active" style={{ cursor: "pointer" }}>
                  Combo Ativo (visível no PDV)
                </label>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn}>
                  {editingCombo ? "Salvar Alterações" : "Adicionar Combo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Combos
