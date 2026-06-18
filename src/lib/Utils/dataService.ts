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

// Ensure mock data is initialized in local mode and register sync listeners
if (typeof window !== "undefined") {
  initMockData()
  
  window.addEventListener("online", () => {
    syncPendingOrders()
  })
  
  syncPendingOrders()
}

// Memory caches
let productsCache: Product[] | null = null
let combosCache: Combo[] | null = null
let cashSessionsCache: CashSession[] | null = null

function updateProductInCache(product: Product) {
  if (productsCache !== null) {
    const idx = productsCache.findIndex((p) => p.id === product.id)
    if (idx > -1) {
      productsCache[idx] = product
    } else {
      productsCache.push(product)
    }
  }
}

function updateComboInCache(combo: Combo) {
  if (combosCache !== null) {
    const idx = combosCache.findIndex((c) => c.id === combo.id)
    if (idx > -1) {
      combosCache[idx] = combo
    } else {
      combosCache.push(combo)
    }
  }
}

function removeComboFromCache(id: string) {
  if (combosCache !== null) {
    combosCache = combosCache.filter((c) => c.id !== id)
  }
}

function updateCashSessionInCache(session: CashSession) {
  if (cashSessionsCache !== null) {
    const idx = cashSessionsCache.findIndex((s) => s.id === session.id)
    if (idx > -1) {
      cashSessionsCache[idx] = session
    } else {
      cashSessionsCache = [session, ...cashSessionsCache]
    }
  }
}

function addPendingOrder(order: Order) {
  const pending = getLocal<Order>("pending_orders")
  if (!pending.some((o) => o.id === order.id)) {
    pending.push(order)
    setLocal("pending_orders", pending)
  }
}

export async function syncPendingOrders(): Promise<void> {
  if (typeof window === "undefined") return
  if (!isFirebaseConfigured() || !db) return
  if (!navigator.onLine) return

  const pending = getLocal<Order>("pending_orders")
  if (pending.length === 0) return

  console.log(`Sincronizando ${pending.length} pedido(s) pendente(s)...`)
  const remaining: Order[] = []

  for (const order of pending) {
    try {
      const docRef = doc(db, "orders", order.id)
      await setDoc(docRef, {
        createdAt: order.createdAt,
        total: order.total,
        items: order.items,
        cashSessionId: order.cashSessionId || ""
      })
    } catch (e) {
      console.error(`Erro ao sincronizar pedido ${order.id}: `, e)
      remaining.push(order)
    }
  }

  setLocal("pending_orders", remaining)
}

// --- PRODUCTS ---
export async function getProducts(forceRefresh = false): Promise<Product[]> {
  if (!forceRefresh && productsCache !== null) {
    return productsCache
  }

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      setLocal("products", list)
      productsCache = list
      return list
    } catch (e) {
      console.error("Erro ao carregar produtos do Firebase, usando local: ", e)
    }
  }
  const localList = getLocal<Product>("products")
  productsCache = localList
  return localList
}

export async function saveProduct(product: Product): Promise<void> {
  updateProductInCache(product)

  const list = getLocal<Product>("products")
  const idx = list.findIndex(p => p.id === product.id)
  if (idx > -1) {
    list[idx] = product
  } else {
    list.push(product)
  }
  setLocal("products", list)

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      throw e
    }
  }
}

// --- COMBOS ---
export async function getCombos(forceRefresh = false): Promise<Combo[]> {
  if (!forceRefresh && combosCache !== null) {
    return combosCache
  }

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      setLocal("combos", list)
      combosCache = list
      return list
    } catch (e) {
      console.error("Erro ao carregar combos do Firebase: ", e)
    }
  }
  const localList = getLocal<Combo>("combos")
  combosCache = localList
  return localList
}

export async function saveCombo(combo: Combo): Promise<void> {
  updateComboInCache(combo)

  const list = getLocal<Combo>("combos")
  const idx = list.findIndex(c => c.id === combo.id)
  if (idx > -1) {
    list[idx] = combo
  } else {
    list.push(combo)
  }
  setLocal("combos", list)

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      throw e
    }
  }
}

export async function deleteCombo(id: string): Promise<void> {
  removeComboFromCache(id)

  const list = getLocal<Combo>("combos")
  const filtered = list.filter(c => c.id !== id)
  setLocal("combos", filtered)

  if (isFirebaseConfigured() && db && navigator.onLine) {
    try {
      const docRef = doc(db, "combos", id)
      await deleteDoc(docRef)
      return
    } catch (e) {
      console.error("Erro ao excluir combo no Firebase: ", e)
      throw e
    }
  }
}

// --- ORDERS ---
export async function getOrders(): Promise<Order[]> {
  let ordersList: Order[] = []

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      setLocal("orders", list)
      ordersList = list
    } catch (e) {
      console.error("Erro ao carregar pedidos do Firebase: ", e)
      ordersList = getLocal<Order>("orders")
    }
  } else {
    ordersList = getLocal<Order>("orders")
  }

  const pending = getLocal<Order>("pending_orders")
  const merged = [...ordersList]
  pending.forEach((p) => {
    if (!merged.some((o) => o.id === p.id)) {
      merged.push(p)
    }
  })

  return merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function saveOrder(order: Order): Promise<void> {
  const list = getLocal<Order>("orders")
  list.push(order)
  setLocal("orders", list)

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      console.error("Erro ao salvar pedido no Firebase (enfileirando offline): ", e)
      addPendingOrder(order)
    }
  } else {
    addPendingOrder(order)
  }
}

// --- CASH SESSIONS ---
export async function getCashSessions(forceRefresh = false): Promise<CashSession[]> {
  if (!forceRefresh && cashSessionsCache !== null) {
    return cashSessionsCache
  }

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      setLocal("cashSessions", list)
      cashSessionsCache = list
      return list
    } catch (e) {
      console.error("Erro ao carregar caixas do Firebase: ", e)
    }
  }
  const localList = getLocal<CashSession>("cashSessions").sort((a, b) => new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime())
  cashSessionsCache = localList
  return localList
}

export async function saveCashSession(session: CashSession): Promise<void> {
  updateCashSessionInCache(session)

  const list = getLocal<CashSession>("cashSessions")
  const idx = list.findIndex(s => s.id === session.id)
  if (idx > -1) {
    list[idx] = session
  } else {
    list.push(session)
  }
  setLocal("cashSessions", list)

  if (isFirebaseConfigured() && db && navigator.onLine) {
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
      throw e
    }
  }
}

export async function getCurrentOpenSession(): Promise<CashSession | null> {
  const sessions = await getCashSessions()
  const openSession = sessions.find(s => s.status === "open")
  return openSession || null
}
