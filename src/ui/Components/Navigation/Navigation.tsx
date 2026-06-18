//Libs
import React, { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Menu,
  X,
  Zap,
  Package,
  Layers,
  History,
  Calculator,
  TrendingUp,
  LogOut,
  Store
} from "lucide-react"

//Imports
import { useAuth } from "../../../app/auth"
import styles from "./Navigation.module.css"

//Types
type NavigationProps = {
  children: React.ReactNode
}

type NavItem = {
  id: string
  label: string
  icon: React.ReactNode
  path: string
}

//Main
const Navigation = ({ children }: NavigationProps) => {
  const { user, logout } = useAuth()
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false)
  const pathname = usePathname()

  // Items for menu mapped to actual routes
  const menuItems: NavItem[] = [
    { id: "sales", label: "Venda Rápida", icon: <Zap size={20} />, path: "/sales" },
    { id: "products", label: "Produtos", icon: <Package size={20} />, path: "/products" },
    { id: "combos", label: "Combos", icon: <Layers size={20} />, path: "/combos" },
    { id: "history", label: "Histórico", icon: <History size={20} />, path: "/history" },
    { id: "cash", label: "Controle de Caixa", icon: <Calculator size={20} />, path: "/cash" },
    { id: "dashboard", label: "Dashboard", icon: <TrendingUp size={20} />, path: "/dashboard" }
  ]

  // Detect which tab is active based on path
  const activeTab = menuItems.find(item => pathname?.startsWith(item.path))?.id || "sales"

  // Handlers (using function keyword as they do not return JSX)
  function closeDrawer() {
    setIsDrawerOpen(false)
  }

  function toggleDrawer() {
    setIsDrawerOpen(!isDrawerOpen)
  }

  async function handleLogout() {
    if (confirm("Deseja realmente sair do sistema?")) {
      await logout()
    }
  }

  // Helper component to render menu content
  function renderMenuContent() {
    return (
      <>
        <div className={styles.logoArea}>
          <Store className={styles.logoIcon} size={28} />
          <span className={styles.logoText}>Cantina App</span>
        </div>

        <nav className={styles.navLinks}>
          {menuItems.map((item) => (
            <Link
              key={item.id}
              href={item.path}
              onClick={closeDrawer}
              className={`${styles.link} ${activeTab === item.id ? styles.activeLink : ""}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          {user && (
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userEmail}>{user.email}</span>
            </div>
          )}
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </>
    )
  }

  return (
    <div className={styles.wrapper}>
      {/* Mobile Header Bar */}
      <header className={styles.mobileHeader}>
        <button className={styles.menuButton} onClick={toggleDrawer}>
          <Menu size={24} />
        </button>
        <span className={styles.mobileTitle}>
          {menuItems.find(item => item.id === activeTab)?.label || "Cantina"}
        </span>
        <div style={{ width: 40 }} /> {/* balance center spacing */}
      </header>

      {/* Desktop Sidebar */}
      <aside className={styles.sidebar}>
        {renderMenuContent()}
      </aside>

      {/* Mobile Menu Drawer Overlay */}
      <div
        className={`${styles.drawerOverlay} ${isDrawerOpen ? styles.overlayOpen : ""}`}
        onClick={toggleDrawer}
      />

      {/* Mobile Menu Drawer */}
      <aside className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ""}`}>
        <button
          className={styles.menuButton}
          onClick={toggleDrawer}
          style={{ alignSelf: "flex-end", marginBottom: 16 }}
        >
          <X size={24} />
        </button>
        {renderMenuContent()}
      </aside>

      {/* Main Page Area */}
      <main className={styles.content}>
        {children}
      </main>
    </div>
  )
}

export default Navigation
