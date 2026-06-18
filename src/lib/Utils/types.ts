//Types
export type UserProfile = {
  uid: string
  name: string
  email: string
  createdAt: string
}

export type Product = {
  id: string
  name: string
  category: string
  price: number
  active: boolean
}

export type Combo = {
  id: string
  name: string
  items: string[] // List of product IDs
  active: boolean
}

export type OrderItem = {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  total: number
}

export type Order = {
  id: string
  createdAt: string // ISO date string or Firebase timestamp equivalent
  total: number
  items: OrderItem[]
  cashSessionId?: string // Link to the cash session it was sold in
}

export type CashSession = {
  id: string
  openedAt: string
  closedAt: string | null
  initialValue: number
  finalValue: number | null
  status: "open" | "closed"
  userId: string
}
