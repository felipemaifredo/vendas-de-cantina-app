//Libs
import React, { createContext, useContext, useState } from "react"

//Imports
import { saveOrder } from "../lib/Utils/dataService"
import { useCash } from "./cash"

//Types
import type { OrderItem, Order, Product } from "../lib/Utils/types"

type CartContextType = {
  items: OrderItem[]
  cartTotal: number
  addToCart: (product: Product) => void
  addComboToCart: (comboName: string, productsInCombo: Product[]) => void
  removeItem: (productId: string) => void
  decrementItem: (productId: string) => void
  clearCart: () => void
  checkout: () => Promise<void>
}

type CartProviderProps = {
  children: React.ReactNode
}

//Consts
const CartContext = createContext<CartContextType | undefined>(undefined)

//Main
export const CartProvider = ({ children }: CartProviderProps) => {
  const [items, setItems] = useState<OrderItem[]>([])
  const { currentSession } = useCash()

  // Calculate cart total
  const cartTotal = items.reduce((acc, item) => acc + item.total, 0)

  // Helpers
  function addToCart(product: Product) {
    setItems((prev) => {
      const idx = prev.findIndex(item => item.productId === product.id)
      if (idx > -1) {
        const updated = [...prev]
        const quantity = updated[idx].quantity + 1
        updated[idx] = {
          ...updated[idx],
          quantity,
          total: quantity * updated[idx].unitPrice
        }
        return updated
      } else {
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            quantity: 1,
            unitPrice: product.price,
            total: product.price
          }
        ]
      }
    })
  }

  function addComboToCart(comboName: string, productsInCombo: Product[]) {
    // According to business rules: "Ao selecionar um combo, os produtos são adicionados individualmente ao pedido"
    productsInCombo.forEach(product => {
      addToCart(product)
    })
  }

  function removeItem(productId: string) {
    setItems((prev) => prev.filter(item => item.productId !== productId))
  }

  function decrementItem(productId: string) {
    setItems((prev) => {
      const idx = prev.findIndex(item => item.productId === productId)
      if (idx === -1) return prev

      const updated = [...prev]
      const quantity = updated[idx].quantity - 1

      if (quantity <= 0) {
        return prev.filter(item => item.productId !== productId)
      } else {
        updated[idx] = {
          ...updated[idx],
          quantity,
          total: quantity * updated[idx].unitPrice
        }
        return updated
      }
    })
  }

  function clearCart() {
    setItems([])
  }

  async function checkout(): Promise<void> {
    if (items.length === 0) throw new Error("Carrinho está vazio")
    
    const newOrder: Order = {
      id: "order_" + Date.now(),
      createdAt: new Date().toISOString(),
      total: cartTotal,
      items: [...items],
      cashSessionId: currentSession?.id || undefined
    }

    try {
      await saveOrder(newOrder)
      clearCart()
    } catch (e) {
      console.error("Erro ao finalizar pedido: ", e)
      throw e
    }
  }

  return (
    <CartContext.Provider
      value={{
        items,
        cartTotal,
        addToCart,
        addComboToCart,
        removeItem,
        decrementItem,
        clearCart,
        checkout
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

//Funcs
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error("useCart deve ser usado dentro de um CartProvider")
  }
  return context
}
