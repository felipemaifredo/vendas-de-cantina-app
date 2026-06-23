//Libs
import React, { useState, useEffect } from "react"
import { Search, Plus, Edit2, ToggleLeft, ToggleRight, X } from "lucide-react"
import { toast } from "react-toastify"

//Imports
import { getProducts, saveProduct } from "../../../lib/Utils/dataService"
import styles from "./Products.module.css"

//Types
import type { Product } from "../../../lib/Utils/types"

//Consts
const CATEGORIES = ["Salgados", "Doces", "Refrigerantes", "Sucos", "Caldos", "Outros"]

//Funcs
function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  })
}

//Main
const Products = () => {
  const [products, setProducts] = useState<Product[]>([])
  const [searchTerm, setSearchTerm] = useState<string>("")
  const [loading, setLoading] = useState<boolean>(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  
  // Form states
  const [formName, setFormName] = useState<string>("")
  const [formCategory, setFormCategory] = useState<string>(CATEGORIES[0])
  const [formPrice, setFormPrice] = useState<string>("")
  const [formActive, setFormActive] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)

  useEffect(() => {
    loadData()
  }, [])

  // Handlers (using function keyword as they do not return JSX)
  async function loadData() {
    setLoading(true)
    try {
      const data = await getProducts()
      setProducts(data)
    } catch (e) {
      console.error("Erro ao carregar produtos: ", e)
    } finally {
      setLoading(false)
    }
  }

  function openAddModal() {
    setEditingProduct(null)
    setFormName("")
    setFormCategory(CATEGORIES[0])
    setFormPrice("")
    setFormActive(true)
    setIsSubmitting(false)
    setIsModalOpen(true)
  }

  function openEditModal(prod: Product) {
    setEditingProduct(prod)
    setFormName(prod.name)
    setFormCategory(prod.category)
    setFormPrice(prod.price.toString())
    setFormActive(prod.active)
    setIsSubmitting(false)
    setIsModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (isSubmitting) return
    if (!formName.trim() || !formPrice) return

    const priceNum = parseFloat(formPrice.replace(",", "."))
    if (isNaN(priceNum) || priceNum < 0) {
      toast.warning("Por favor, insira um preço válido.")
      return
    }

    setIsSubmitting(true)
    const prodId = editingProduct ? editingProduct.id : "prod_" + Date.now()
    const newProduct: Product = {
      id: prodId,
      name: formName.trim(),
      category: formCategory,
      price: priceNum,
      active: formActive
    }

    try {
      await saveProduct(newProduct)
      setIsModalOpen(false)
      loadData()
      toast.success(editingProduct ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!")
    } catch (err) {
      console.error("Erro ao salvar produto: ", err)
      toast.error("Ocorreu um erro ao salvar o produto.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleToggleActive(prod: Product) {
    const updated: Product = {
      ...prod,
      active: !prod.active
    }
    try {
      await saveProduct(updated)
      loadData()
    } catch (err) {
      console.error("Erro ao alterar status do produto: ", err)
    }
  }

  // Filter products based on search term
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Produtos</h1>
        <div className={styles.actionsHeader}>
          <div className={styles.searchWrapper}>
            <Search className={styles.searchIcon} size={18} />
            <input
              type="text"
              placeholder="Buscar por nome ou categoria..."
              className={styles.searchInput}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button className={styles.addButton} onClick={openAddModal}>
            <Plus size={20} />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      <div className={styles.tableContainer}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
            Carregando produtos...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-secondary)" }}>
            Nenhum produto cadastrado ou encontrado.
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>Nome</th>
                <th className={styles.th}>Categoria</th>
                <th className={styles.th}>Preço</th>
                <th className={styles.th}>Status</th>
                <th className={styles.th} style={{ textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((prod) => (
                <tr key={prod.id}>
                  <td className={styles.td} style={{ fontWeight: 500 }}>{prod.name}</td>
                  <td className={styles.td}>{prod.category}</td>
                  <td className={styles.td}>{formatCurrency(prod.price)}</td>
                  <td className={styles.td}>
                    <span
                      className={`${styles.statusBadge} ${
                        prod.active ? styles.activeBadge : styles.inactiveBadge
                      }`}
                    >
                      {prod.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className={styles.td}>
                    <div className={styles.btnActions} style={{ justifyContent: "flex-end" }}>
                      <button
                        className={`${styles.iconBtn} ${styles.editBtn}`}
                        onClick={() => openEditModal(prod)}
                        title="Editar"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        className={`${styles.iconBtn} ${
                          prod.active ? styles.toggleBtnActive : styles.toggleBtnInactive
                        }`}
                        onClick={() => handleToggleActive(prod)}
                        title={prod.active ? "Desativar" : "Ativar"}
                      >
                        {prod.active ? <ToggleRight size={22} style={{ color: "var(--color-success)" }} /> : <ToggleLeft size={22} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Product Form Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {editingProduct ? "Editar Produto" : "Novo Produto"}
              </h2>
              <button className={styles.modalCloseBtn} onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            
            <form className={styles.modalForm} onSubmit={handleSubmit}>
              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="prod-name">Nome do Produto</label>
                <input
                  id="prod-name"
                  type="text"
                  className={styles.input}
                  placeholder="Ex: Coxinha de Frango"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="prod-category">Categoria</label>
                <select
                  id="prod-category"
                  className={styles.select}
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label} htmlFor="prod-price">Preço (R$)</label>
                <input
                  id="prod-price"
                  type="number"
                  step="any"
                  inputMode="decimal"
                  className={styles.input}
                  placeholder="0.00"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  required
                />
              </div>

              <div className={styles.checkboxGroup}>
                <input
                  id="prod-active"
                  type="checkbox"
                  className={styles.checkbox}
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                <label className={styles.label} htmlFor="prod-active" style={{ cursor: "pointer" }}>
                  Produto Ativo (visível no PDV)
                </label>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                  {isSubmitting ? "Carregando..." : (editingProduct ? "Salvar Alterações" : "Adicionar")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Products
