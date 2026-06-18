//Libs
import React, { useState, useEffect } from "react"
import { DollarSign, ShoppingBag, TrendingUp, BarChart3, Star, Layers, Activity } from "lucide-react"

//Imports
import { getOrders, getProducts, getCashSessions } from "../../../lib/Utils/dataService"
import styles from "./Dashboard.module.css"

//Types
import type { Order, Product, CashSession } from "../../../lib/Utils/types"

//Types
type ProductRank = {
  name: string
  count: number
}

type CategoryRank = {
  category: string
  total: number
  percentage: number
}

type ComboRank = {
  pair: string
  count: number
}

type DayData = {
  dateStr: string
  label: string
  total: number
  count: number
}

type HourData = {
  hour: number
  count: number
}

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
const Dashboard = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [sessions, setSessions] = useState<CashSession[]>([])
  const [selectedSessionId, setSelectedSessionId] = useState<string>("all")
  const [loading, setLoading] = useState<boolean>(true)

  // Computed dashboard metrics
  const [stats, setStats] = useState({
    todayTotal: 0,
    monthTotal: 0,
    totalOrders: 0,
    averageTicket: 0,
    sessionTotal: 0,
    sessionInitialCash: 0
  })
  const [topProducts, setTopProducts] = useState<ProductRank[]>([])
  const [salesByCat, setSalesByCat] = useState<CategoryRank[]>([])
  const [topCombos, setTopCombos] = useState<ComboRank[]>([])
  const [chartDays, setChartDays] = useState<DayData[]>([])
  const [chartHours, setChartHours] = useState<HourData[]>([])

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    computeMetrics(orders, products, selectedSessionId, sessions)
  }, [selectedSessionId, orders, products, sessions])

  // Handlers (using function keyword as they do not return JSX)
  async function loadData() {
    setLoading(true)
    try {
      const ordersData = await getOrders()
      const productsData = await getProducts()
      const sessionsData = await getCashSessions()
      setOrders(ordersData)
      setProducts(productsData)
      setSessions(sessionsData)
    } catch (e) {
      console.error("Erro ao carregar dados do Dashboard: ", e)
    } finally {
      setLoading(false)
    }
  }

  function computeMetrics(allOrders: Order[], allProducts: Product[], sessionId: string, allSessions: CashSession[]) {
    // 1. Exclude cancelled orders from dashboard metrics
    const activeOrders = allOrders.filter(o => o.status !== "cancelled")

    // 2. Filter by session if requested
    let targetOrders = activeOrders
    let sessionInitialCash = 0

    if (sessionId !== "all") {
      targetOrders = activeOrders.filter(o => o.cashSessionId === sessionId)
      const currentSess = allSessions.find(s => s.id === sessionId)
      if (currentSess) {
        sessionInitialCash = currentSess.initialValue
      }
    }

    const now = new Date()
    const todayStr = now.toISOString().split("T")[0]
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    let todayTotal = 0
    let monthTotal = 0

    // Calculate Today and Month Totals globally from all active orders
    activeOrders.forEach((o) => {
      const orderDate = new Date(o.createdAt)
      const orderDateStr = o.createdAt.split("T")[0]

      if (orderDateStr === todayStr) {
        todayTotal += o.total
      }
      if (orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth) {
        monthTotal += o.total
      }
    })

    const totalOrders = targetOrders.length
    const totalRevenue = targetOrders.reduce((sum, o) => sum + o.total, 0)
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0

    setStats({
      todayTotal,
      monthTotal,
      totalOrders,
      averageTicket,
      sessionTotal: totalRevenue,
      sessionInitialCash
    })

    // Ranking: Top Products Sold based on targetOrders
    const productCounts: Record<string, number> = {}
    targetOrders.forEach((o) => {
      o.items.forEach((item) => {
        productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity
      })
    })

    const sortedProducts = Object.entries(productCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setTopProducts(sortedProducts)

    // Vendas por Categoria based on targetOrders
    const categoryTotals: Record<string, number> = {}
    targetOrders.forEach((o) => {
      o.items.forEach((item) => {
        const prod = allProducts.find(p => p.id === item.productId)
        const cat = prod ? prod.category : "Outros"
        categoryTotals[cat] = (categoryTotals[cat] || 0) + item.total
      })
    })

    const totalCatSales = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0)
    const sortedCategories = Object.entries(categoryTotals)
      .map(([category, total]) => ({
        category,
        total,
        percentage: totalCatSales > 0 ? Math.round((total / totalCatSales) * 100) : 0
      }))
      .sort((a, b) => b.total - a.total)

    setSalesByCat(sortedCategories)

    // Combinações Mais Frequentes based on targetOrders
    const combinationCounts: Record<string, number> = {}
    targetOrders.forEach((o) => {
      if (o.items.length > 1) {
        const names = Array.from(new Set(o.items.map(i => i.name))).sort()
        for (let i = 0; i < names.length; i++) {
          for (let j = i + 1; j < names.length; j++) {
            const pair = `${names[i]} + ${names[j]}`
            combinationCounts[pair] = (combinationCounts[pair] || 0) + 1
          }
        }
      }
    })

    const sortedCombos = Object.entries(combinationCounts)
      .map(([pair, count]) => ({ pair, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setTopCombos(sortedCombos)

    // Determine reference date for daily charts (dynamic to show selected session's days)
    let referenceDate = now
    if (sessionId !== "all") {
      const sess = allSessions.find(s => s.id === sessionId)
      if (sess) {
        referenceDate = new Date(sess.openedAt)
      }
    }

    const last7Days: DayData[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(referenceDate)
      d.setDate(referenceDate.getDate() - i)
      const dateStr = d.toISOString().split("T")[0]
      const label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
      last7Days.push({ dateStr, label, total: 0, count: 0 })
    }

    targetOrders.forEach((o) => {
      const orderDateStr = o.createdAt.split("T")[0]
      const dayMatch = last7Days.find(d => d.dateStr === orderDateStr)
      if (dayMatch) {
        dayMatch.total += o.total
        dayMatch.count += 1
      }
    })

    setChartDays(last7Days)

    // Horários de Pico baseados em targetOrders (intervalo dinâmico baseado em vendas reais)
    const orderHours = targetOrders.map(o => new Date(o.createdAt).getHours())
    let minHour = orderHours.length > 0 ? Math.min(...orderHours) : 8
    let maxHour = orderHours.length > 0 ? Math.max(...orderHours) : 22

    if (minHour < 0) minHour = 0
    if (maxHour > 23) maxHour = 23

    // Exibe pelo menos de 8h às 22h por padrão se o intervalo for estreito ou vazio
    if (minHour > 8 || orderHours.length === 0) minHour = 8
    if (maxHour < 22 || orderHours.length === 0) maxHour = 22

    const hourlyCounts: Record<number, number> = {}
    for (let h = minHour; h <= maxHour; h++) {
      hourlyCounts[h] = 0
    }

    targetOrders.forEach((o) => {
      const hour = new Date(o.createdAt).getHours()
      if (hour >= minHour && hour <= maxHour) {
        hourlyCounts[hour] = (hourlyCounts[hour] || 0) + 1
      }
    })

    const chartHoursList = Object.entries(hourlyCounts)
      .map(([hourStr, count]) => ({ hour: parseInt(hourStr), count }))
      .sort((a, b) => a.hour - b.hour)

    setChartHours(chartHoursList)
  }

  // Helpers to render custom SVG charts (using function keyword as per codebase style)
  function renderRevenueChart() {
    if (chartDays.length === 0) return null

    const maxVal = Math.max(...chartDays.map(d => d.total), 10)
    const height = 200
    const width = 500
    const padding = 40

    const graphWidth = width - padding * 2
    const graphHeight = height - padding * 2

    const points = chartDays.map((d, index) => {
      const x = padding + (index / (chartDays.length - 1)) * graphWidth
      const y = padding + graphHeight - (d.total / maxVal) * graphHeight
      return { x, y, label: d.label, val: d.total }
    })

    let pathD = ""
    let areaD = ""

    if (points.length > 0) {
      pathD = `M ${points[0].x} ${points[0].y} `
      areaD = `M ${points[0].x} ${padding + graphHeight} L ${points[0].x} ${points[0].y} `

      for (let i = 1; i < points.length; i++) {
        pathD += `L ${points[i].x} ${points[i].y} `
        areaD += `L ${points[i].x} ${points[i].y} `
      }

      areaD += `L ${points[points.length - 1].x} ${padding + graphHeight} Z`
    }

    return (
      <svg className={styles.svgChart} viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + graphHeight * r
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              className={styles.gridLine}
            />
          )
        })}

        {pathD && <path d={areaD} className={styles.chartArea} />}
        {pathD && <path d={pathD} className={styles.chartLine} />}

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} className={styles.chartPoint} />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--color-text-secondary)">
              {p.val > 0 ? Math.round(p.val) : ""}
            </text>
            <text x={p.x} y={height - 12} textAnchor="middle" className={styles.axisText}>
              {p.label}
            </text>
          </g>
        ))}
      </svg>
    )
  }

  function renderOrdersChart() {
    if (chartDays.length === 0) return null

    const maxVal = Math.max(...chartDays.map(d => d.count), 5)
    const height = 200
    const width = 500
    const padding = 40

    const graphWidth = width - padding * 2
    const graphHeight = height - padding * 2

    const barWidth = (graphWidth / chartDays.length) * 0.6
    const barSpacing = (graphWidth / chartDays.length) * 0.4

    return (
      <svg className={styles.svgChart} viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + graphHeight * r
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              className={styles.gridLine}
            />
          )
        })}

        {chartDays.map((d, index) => {
          const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
          const barHeight = (d.count / maxVal) * graphHeight
          const y = padding + graphHeight - barHeight

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={3}
                className={styles.chartBar}
              />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={10} fontWeight="bold" fill="var(--color-text-primary)">
                {d.count > 0 ? d.count : ""}
              </text>
              <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" className={styles.axisText}>
                {d.label}
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  function renderPeakHoursChart() {
    if (chartHours.length === 0) return null

    const maxVal = Math.max(...chartHours.map(d => d.count), 5)
    const height = 200
    const width = 500
    const padding = 40

    const graphWidth = width - padding * 2
    const graphHeight = height - padding * 2

    const barWidth = (graphWidth / chartHours.length) * 0.7
    const barSpacing = (graphWidth / chartHours.length) * 0.3

    return (
      <svg className={styles.svgChart} viewBox={`0 0 ${width} ${height}`} width="100%" height="100%">
        {[0, 0.5, 1].map((r, i) => {
          const y = padding + graphHeight * r
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              className={styles.gridLine}
            />
          )
        })}

        {chartHours.map((d, index) => {
          const x = padding + index * (barWidth + barSpacing) + barSpacing / 2
          const barHeight = (d.count / maxVal) * graphHeight
          const y = padding + graphHeight - barHeight

          const isPeak = d.count === maxVal && maxVal > 0

          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={2}
                className={styles.chartBar}
                style={{ fill: isPeak ? "var(--color-warning)" : "var(--color-primary)" }}
              />
              <text x={x + barWidth / 2} y={y - 6} textAnchor="middle" fontSize={9} fontWeight="bold" fill="var(--color-text-primary)">
                {d.count > 0 ? d.count : ""}
              </text>
              <text x={x + barWidth / 2} y={height - 12} textAnchor="middle" className={styles.axisText}>
                {d.hour}h
              </text>
            </g>
          )
        })}
      </svg>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard de Indicadores</h1>
        
        {/* CASH SESSION FILTER DROPDOWN */}
        {!loading && (orders.length > 0 || sessions.length > 0) && (
          <div className={styles.filterBar}>
            <label htmlFor="session-filter" className={styles.label}>Filtrar por Caixa:</label>
            <select
              id="session-filter"
              className={styles.selectInput}
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              <option value="all">Todos os Caixas (Geral)</option>
              {sessions.map((sess) => {
                const isOpen = sess.status === "open"
                const dateFormatted = formatDateTime(sess.openedAt)
                return (
                  <option key={sess.id} value={sess.id}>
                    {isOpen ? `Caixa Atual (Aberto - ${dateFormatted})` : `Caixa Fechado (${dateFormatted})`}
                  </option>
                )
              })}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-secondary)" }}>
          Carregando indicadores em tempo real...
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--color-text-secondary)", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)" }}>
          Nenhuma venda registrada até o momento. Realize vendas para ver as métricas no Dashboard.
        </div>
      ) : (
        <>
          {/* STATS INDICATORS CARDS */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={styles.statIcon}>
                <DollarSign size={24} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>
                  {selectedSessionId === "all" ? "Vendido Hoje" : "Total Vendido"}
                </span>
                <span className={styles.statVal} style={{ color: "var(--color-success)" }}>
                  {selectedSessionId === "all" ? formatCurrency(stats.todayTotal) : formatCurrency(stats.sessionTotal)}
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#eff6ff", color: "#1d4ed8" }}>
                {selectedSessionId === "all" ? <TrendingUp size={24} /> : <DollarSign size={24} />}
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>
                  {selectedSessionId === "all" ? "Vendido no Mês" : "Fundo Inicial"}
                </span>
                <span className={styles.statVal}>
                  {selectedSessionId === "all" ? formatCurrency(stats.monthTotal) : formatCurrency(stats.sessionInitialCash)}
                </span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#fef2f2", color: "#dc2626" }}>
                <ShoppingBag size={24} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Total Pedidos</span>
                <span className={styles.statVal}>{stats.totalOrders}</span>
              </div>
            </div>

            <div className={styles.statCard}>
              <div className={styles.statIcon} style={{ backgroundColor: "#fdf8e2", color: "#d97706" }}>
                <Activity size={24} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statLabel}>Ticket Médio</span>
                <span className={styles.statVal}>{formatCurrency(stats.averageTicket)}</span>
              </div>
            </div>
          </div>

          {/* CHARTS CONTAINER */}
          <div className={styles.chartsGrid}>
            {selectedSessionId === "all" && (
              <>
                <div className={styles.chartCard}>
                  <h2 className={styles.chartTitle}>Faturamento nos Últimos 7 Dias (R$)</h2>
                  <div className={styles.chartWrapper}>
                    {renderRevenueChart()}
                  </div>
                </div>

                <div className={styles.chartCard}>
                  <h2 className={styles.chartTitle}>Pedidos nos Últimos 7 Dias (Qtd)</h2>
                  <div className={styles.chartWrapper}>
                    {renderOrdersChart()}
                  </div>
                </div>
              </>
            )}

            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Horários de Pico (Pedidos / Hora)</h2>
              <div className={styles.chartWrapper}>
                {renderPeakHoursChart()}
              </div>
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle}>Vendas por Categoria</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 14, justifyContent: "center", height: "100%" }}>
                {salesByCat.length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Sem dados de categoria.</span>
                ) : (
                  salesByCat.map((item) => (
                    <div key={item.category} className={styles.categoryItem}>
                      <div className={styles.categoryLabelRow}>
                        <span style={{ fontWeight: 500 }}>{item.category}</span>
                        <span style={{ fontWeight: 700 }}>
                          {formatCurrency(item.total)} ({item.percentage}%)
                        </span>
                      </div>
                      <div className={styles.categoryProgressBar}>
                        <div
                          className={styles.categoryProgressFill}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


          {/* LISTS: TOP PRODUCTS & FREQUENT COMBINATIONS */}
          <div className={styles.listsGrid}>
            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Star size={18} style={{ color: "var(--color-warning)", fill: "var(--color-warning)" }} />
                Produtos Mais Vendidos
              </h2>
              <div className={styles.rankingList}>
                {topProducts.length === 0 ? (
                  <span style={{ fontSize: 13, color: "var(--color-text-muted)" }}>Sem registros.</span>
                ) : (
                  topProducts.map((p, idx) => (
                    <div key={p.name} className={styles.rankingItem}>
                      <div className={styles.rankNumber}>{idx + 1}</div>
                      <span className={styles.itemName}>{p.name}</span>
                      <span className={styles.itemCount}>{p.count} vendidos</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className={styles.chartCard}>
              <h2 className={styles.chartTitle} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Layers size={18} style={{ color: "var(--color-primary)" }} />
                Combinações Mais Frequentes (Vendidos Juntos)
              </h2>
              <div className={styles.rankingList}>
                {topCombos.length === 0 ? (
                  <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: "var(--color-text-muted)" }}>
                    Registre pedidos com mais de um produto para mapear combinações frequentes!
                  </div>
                ) : (
                  topCombos.map((c, idx) => (
                    <div key={c.pair} className={styles.rankingItem}>
                      <div className={styles.rankNumber} style={{ backgroundColor: "var(--color-success)" }}>
                        {idx + 1}
                      </div>
                      <span className={styles.itemName} style={{ fontSize: 13 }}>{c.pair}</span>
                      <span className={styles.itemCount}>{c.count} vezes</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Dashboard
