//Libs
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit
} from "firebase/firestore"

//Imports
import { db, isFirebaseConfigured } from "./firebase"

//Types
import type { Product, Combo, Order, CashSession } from "./types"

//Consts
const STORAGE_PREFIX = "vendas_cantina_"

const DEFAULT_PRODUCTS: Product[] = [
  { id: "prod_1", name: "Coxinha", category: "Salgados", price: 6, active: true },
  { id: "prod_2", name: "Pastel", category: "Salgados", price: 8, active: true },
  { id: "prod_3", name: "Empada", category: "Salgados", price: 7, active: true },
  { id: "prod_4", name: "Brigadeiro", category: "Doces", price: 4, active: true },
  { id: "prod_5", name: "Beijinho", category: "Doces", price: 4, active: true },
  { id: "prod_6", name: "Coca-Cola", category: "Bebidas", price: 5, active: true },
  { id: "prod_7", name: "Guaraná", category: "Bebidas", price: 5, active: true },
  { id: "prod_8", name: "Água", category: "Bebidas", price: 3, active: true },
  { id: "prod_9", name: "Caldo Verde", category: "Caldos", price: 12, active: true },
  { id: "prod_10", name: "Caldo de Feijão", category: "Caldos", price: 10, active: true }
]

const DEFAULT_COMBOS: Combo[] = [
  { id: "combo_1", name: "Coxinha + Coca-Cola", items: ["prod_1", "prod_6"], active: true },
  { id: "combo_2", name: "Pastel + Coca-Cola", items: ["prod_2", "prod_6"], active: true },
  { id: "combo_3", name: "Caldo + Água", items: ["prod_9", "prod_8"], active: true }
]

// LocalStorage Helpers
function getLocal<T>(key: string): T[] {
  if (typeof window === "undefined") return []
  const data = localStorage.getItem(STORAGE_PREFIX + key)
  return data ? JSON.parse(data) : []
}

function setLocal<T>(key: string, data: T[]) {
  if (typeof window === "undefined") return
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data))
}

function initMockData() {
  if (typeof window === "undefined") return
  if (!localStorage.getItem(STORAGE_PREFIX + "products")) {
    setLocal("products", DEFAULT_PRODUCTS)
  }
  if (!localStorage.getItem(STORAGE_PREFIX + "combos")) {
    setLocal("combos", DEFAULT_COMBOS)
  }
}

// Ensure mock data is initialized in local mode
if (typeof window !== "undefined") {
  initMockData()
}

// --- PRODUCTS ---
export async function getProducts(): Promise<Product[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, "products"))
      const querySnapshot = await getDocs(q)
      const list: Product[] = []
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
          name: data.name,
          category: data.category,
          price: data.price,
          active: data.active
        })
      })
      return list
    } catch (e) {
      console.error("Erro ao carregar produtos do Firebase, usando local: ", e)
    }
  }
  return getLocal<Product>("products")
}

export async function saveProduct(product: Product): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "products", product.id)
      await setDoc(docRef, {
        name: product.name,
        category: product.category,
        price: product.price,
        active: product.active
      })
      return
    } catch (e) {
      console.error("Erro ao salvar produto no Firebase: ", e)
    }
  }
  
  const list = getLocal<Product>("products")
  const idx = list.findIndex(p => p.id === product.id)
  if (idx > -1) {
    list[idx] = product
  } else {
    list.push(product)
  }
  setLocal("products", list)
}

// --- COMBOS ---
export async function getCombos(): Promise<Combo[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, "combos"))
      const querySnapshot = await getDocs(q)
      const list: Combo[] = []
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
          name: data.name,
          items: data.items || [],
          active: data.active
        })
      })
      return list
    } catch (e) {
      console.error("Erro ao carregar combos do Firebase: ", e)
    }
  }
  return getLocal<Combo>("combos")
}

export async function saveCombo(combo: Combo): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "combos", combo.id)
      await setDoc(docRef, {
        name: combo.name,
        items: combo.items,
        active: combo.active
      })
      return
    } catch (e) {
      console.error("Erro ao salvar combo no Firebase: ", e)
    }
  }
  
  const list = getLocal<Combo>("combos")
  const idx = list.findIndex(c => c.id === combo.id)
  if (idx > -1) {
    list[idx] = combo
  } else {
    list.push(combo)
  }
  setLocal("combos", list)
}

export async function deleteCombo(id: string): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "combos", id)
      await deleteDoc(docRef)
      return
    } catch (e) {
      console.error("Erro ao excluir combo no Firebase: ", e)
    }
  }
  
  const list = getLocal<Combo>("combos")
  const filtered = list.filter(c => c.id !== id)
  setLocal("combos", filtered)
}

// --- ORDERS ---
export async function getOrders(): Promise<Order[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, "orders"), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      const list: Order[] = []
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
          createdAt: data.createdAt,
          total: data.total,
          items: data.items || [],
          cashSessionId: data.cashSessionId
        })
      })
      return list
    } catch (e) {
      console.error("Erro ao carregar pedidos do Firebase: ", e)
    }
  }
  return getLocal<Order>("orders").sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function saveOrder(order: Order): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "orders", order.id)
      await setDoc(docRef, {
        createdAt: order.createdAt,
        total: order.total,
        items: order.items,
        cashSessionId: order.cashSessionId || ""
      })
      return
    } catch (e) {
      console.error("Erro ao salvar pedido no Firebase: ", e)
    }
  }
  
  const list = getLocal<Order>("orders")
  list.push(order)
  setLocal("orders", list)
}

// --- CASH SESSIONS ---
export async function getCashSessions(): Promise<CashSession[]> {
  if (isFirebaseConfigured() && db) {
    try {
      const q = query(collection(db, "cashSessions"), orderBy("openedAt", "desc"))
      const querySnapshot = await getDocs(q)
      const list: CashSession[] = []
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data()
        list.push({
          id: docSnap.id,
          openedAt: data.openedAt,
          closedAt: data.closedAt || null,
          initialValue: data.initialValue,
          finalValue: data.finalValue !== undefined ? data.finalValue : null,
          status: data.status,
          userId: data.userId
        })
      })
      return list
    } catch (e) {
      console.error("Erro ao carregar caixas do Firebase: ", e)
    }
  }
  return getLocal<CashSession>("cashSessions").sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
}

export async function saveCashSession(session: CashSession): Promise<void> {
  if (isFirebaseConfigured() && db) {
    try {
      const docRef = doc(db, "cashSessions", session.id)
      await setDoc(docRef, {
        openedAt: session.openedAt,
        closedAt: session.closedAt,
        initialValue: session.initialValue,
        finalValue: session.finalValue,
        status: session.status,
        userId: session.userId
      })
      return
    } catch (e) {
      console.error("Erro ao salvar sessão de caixa no Firebase: ", e)
    }
  }
  
  const list = getLocal<CashSession>("cashSessions")
  const idx = list.findIndex(s => s.id === session.id)
  if (idx > -1) {
    list[idx] = session
  } else {
    list.push(session)
  }
  setLocal("cashSessions", list)
}

export async function getCurrentOpenSession(): Promise<CashSession | null> {
  const sessions = await getCashSessions()
  const openSession = sessions.find(s => s.status === "open")
  return openSession || null
}
