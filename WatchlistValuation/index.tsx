import {
  Button,
  List,
  Navigation,
  NavigationStack,
  Picker,
  Script,
  Section,
  Text,
  Widget,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "scripting"
import { FundSection } from "./components/FundSection"
import { PreviewSection } from "./components/PreviewSection"
import { SettingsSection } from "./components/SettingsSection"
import { StockSection } from "./components/StockSection"
import { clearPrevNavCache } from "./lib/cache/prevnav"
import { loadPortfolioSmart } from "./lib/portfolio"
import {
  getFunds,
  getStocks,
  getWidgetConfig,
  setFunds,
  setStocks,
  setWidgetConfig,
  setWidgetPage,
} from "./lib/storage"
import type {
  FundItem,
  FundSearchHit,
  PortfolioSnapshot,
  StockItem,
  StockSearchHit,
  WidgetConfig,
} from "./lib/types"
import { debounce } from "./lib/util/debounce"

type TabKey = "fund" | "stock" | "preview" | "settings"

function parseAmount(s: string): number {
  const n = Number.parseFloat(String(s).replace(/,/g, "").trim())
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function App() {
  const [tab, setTab] = useState<TabKey>("fund")
  const [funds, setFundsState] = useState<FundItem[]>(() => getFunds())
  const [stocks, setStocksState] = useState<StockItem[]>(() => getStocks())
  const [widgetConfig, setWidgetConfigState] = useState<WidgetConfig>(() => getWidgetConfig())

  // 基金添加：只填买入金额
  const [fundQuery, setFundQuery] = useState("")
  const [fundHits, setFundHits] = useState<FundSearchHit[]>([])
  const [fundSearching, setFundSearching] = useState(false)
  const [fundCost, setFundCost] = useState("")
  const [pendingFund, setPendingFund] = useState<FundSearchHit | null>(null)
  const [addingFund, setAddingFund] = useState(false)

  // 股票添加：只填买入金额
  const [stockQuery, setStockQuery] = useState("")
  const [stockHits, setStockHits] = useState<StockSearchHit[]>([])
  const [stockSearching, setStockSearching] = useState(false)
  const [stockCost, setStockCost] = useState("")
  const [pendingStock, setPendingStock] = useState<StockSearchHit | null>(null)
  const [addingStock, setAddingStock] = useState(false)

  // 预览
  const [snap, setSnap] = useState<PortfolioSnapshot | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [status, setStatus] = useState("")

  // 列表过滤（基金/股票 Tab 各自独立）
  const [fundFilter, setFundFilter] = useState("")
  const [stockFilter, setStockFilter] = useState("")

  // 始终指向最新 funds/stocks，供防抖包装器读取（避免 useMemo 依赖导致重创建）
  const fundsRef = useRef<FundItem[]>(funds)
  const stocksRef = useRef<StockItem[]>(stocks)
  fundsRef.current = funds
  stocksRef.current = stocks

  function persistFunds(next: FundItem[]) {
    setFundsState(next)
    setFunds(next)
    Widget.reloadAll()
  }

  function persistStocks(next: StockItem[]) {
    setStocksState(next)
    setStocks(next)
    Widget.reloadAll()
  }

  function persistWidgetConfig(next: WidgetConfig) {
    setWidgetConfigState(next)
    setWidgetConfig(next)
    Widget.reloadAll()
  }

  async function doSearchFund() {
    setFundSearching(true)
    setStatus("")
    try {
      const hits = await import("./lib/api/fund").then((m) => m.searchFund(fundQuery))
      setFundHits(hits)
      if (hits.length === 0) setStatus("未找到基金")
    } catch {
      setStatus("基金搜索失败")
    } finally {
      setFundSearching(false)
    }
  }

  async function doSearchStock() {
    setStockSearching(true)
    setStatus("")
    try {
      const hits = await import("./lib/api/stock").then((m) => m.searchStock(stockQuery))
      setStockHits(hits)
      if (hits.length === 0) setStatus("请输入 6 位 A 股代码，或中文/拼音名称")
    } catch {
      setStatus("股票搜索失败")
    } finally {
      setStockSearching(false)
    }
  }

  /** 只填买入金额：拉最新净值作 buyNav，份额 = 金额 / 净值 */
  async function addFund() {
    if (!pendingFund) {
      setStatus("请先选择搜索结果中的基金")
      return
    }
    if (funds.some((f) => f.code === pendingFund.code)) {
      setStatus("已在自选中")
      return
    }
    const costAmount = parseAmount(fundCost)
    if (costAmount < 0) {
      setStatus("买入金额不能为负数")
      return
    }

    setAddingFund(true)
    setStatus("正在获取净值并折算份额…")
    try {
      const { fetchFundNavs } = await import("./lib/api/fund")
      const navs = await fetchFundNavs([pendingFund.code])
      const snap = navs[0]
      const buyNav = snap?.nav ?? null
      if (buyNav == null || buyNav <= 0) {
        setStatus("无法获取净值，请稍后重试")
        return
      }
      const shares = costAmount / buyNav
      const item: FundItem = {
        code: pendingFund.code,
        name: snap?.name || pendingFund.name,
        costAmount,
        buyNav,
        shares,
      }
      persistFunds([...funds, item])
      setPendingFund(null)
      setFundCost("")
      setFundHits([])
      setFundQuery("")
      setStatus(
        `已添加 ${item.name}：买入 ¥${costAmount.toFixed(2)} @${buyNav.toFixed(4)} → 约 ${shares.toFixed(2)} 份`,
      )
    } catch {
      setStatus("添加失败：净值请求异常")
    } finally {
      setAddingFund(false)
    }
  }

  /** 只填买入金额：拉现价作 buyPrice，股数 = 金额 / 现价 */
  async function addStock() {
    if (!pendingStock) {
      setStatus("请先选择股票（中文/拼音/6 位代码）")
      return
    }
    if (stocks.some((s) => s.secid === pendingStock.secid)) {
      setStatus("已在自选中")
      return
    }
    const costAmount = parseAmount(stockCost)
    if (costAmount < 0) {
      setStatus("买入金额不能为负数")
      return
    }

    setAddingStock(true)
    setStatus("正在获取现价并折算股数…")
    try {
      const { fetchStockQuotes } = await import("./lib/api/stock")
      const quotes = await fetchStockQuotes([pendingStock.secid])
      const q = quotes[0]
      const buyPrice = q?.price ?? null
      if (buyPrice == null || buyPrice <= 0) {
        setStatus("无法获取现价，请稍后重试")
        return
      }
      const quantity = costAmount / buyPrice
      const item: StockItem = {
        code: pendingStock.code,
        name: q?.name || pendingStock.name,
        market: pendingStock.market,
        secid: pendingStock.secid,
        costAmount,
        buyPrice,
        quantity,
      }
      persistStocks([...stocks, item])
      setPendingStock(null)
      setStockCost("")
      setStockHits([])
      setStockQuery("")
      setStatus(
        `已添加 ${item.name}：买入 ¥${costAmount.toFixed(2)} @${buyPrice.toFixed(2)} → 约 ${quantity.toFixed(2)} 股`,
      )
    } catch {
      setStatus("添加失败：行情请求异常")
    } finally {
      setAddingStock(false)
    }
  }

  // holdings 缓存的 Storage 键前缀（与 lib/storage.ts 一致；删除时同步清理孤立缓存）
  const KEY_HOLDINGS_PREFIX = "watchlist.holdings."

  function removeFund(code: string) {
    // 同步清理孤立重仓缓存，避免长年堆积
    Storage.remove(KEY_HOLDINGS_PREFIX + code)
    persistFunds(funds.filter((f) => f.code !== code))
  }

  function removeStock(secid: string) {
    persistStocks(stocks.filter((s) => s.secid !== secid))
  }

  /** 改买入金额时按原 buyNav 重算份额；无 buyNav 则保留原逻辑 */
  function updateFundCost(code: string, raw: string) {
    const costAmount = parseAmount(raw)
    const next = fundsRef.current.map((f) => {
      if (f.code !== code) return f
      const buyNav = f.buyNav > 0 ? f.buyNav : 0
      const shares = buyNav > 0 && costAmount > 0 ? costAmount / buyNav : f.shares
      return { ...f, costAmount, shares }
    })
    persistFunds(next)
  }

  /** 可选：修正买入净值（真实成交净值），并重算份额 */
  function updateFundBuyNav(code: string, raw: string) {
    const buyNav = parseAmount(raw)
    const next = fundsRef.current.map((f) => {
      if (f.code !== code) return f
      if (buyNav <= 0) return f
      const shares = f.costAmount > 0 ? f.costAmount / buyNav : f.shares
      return { ...f, buyNav, shares }
    })
    persistFunds(next)
  }

  /** 更新基金别名（写入是即时的，不需要防抖） */
  function updateFundAlias(code: string, alias: string) {
    const next = fundsRef.current.map((f) => {
      if (f.code !== code) return f
      return { ...f, alias: alias.trim() || undefined }
    })
    persistFunds(next)
  }

  function updateStockCost(secid: string, raw: string) {
    const costAmount = parseAmount(raw)
    const next = stocksRef.current.map((s) => {
      if (s.secid !== secid) return s
      const buyPrice = s.buyPrice > 0 ? s.buyPrice : 0
      const quantity = buyPrice > 0 && costAmount > 0 ? costAmount / buyPrice : s.quantity
      return { ...s, costAmount, quantity }
    })
    persistStocks(next)
  }

  function updateStockBuyPrice(secid: string, raw: string) {
    const buyPrice = parseAmount(raw)
    const next = stocksRef.current.map((s) => {
      if (s.secid !== secid) return s
      if (buyPrice <= 0) return s
      const quantity = s.costAmount > 0 ? s.costAmount / buyPrice : s.quantity
      return { ...s, buyPrice, quantity }
    })
    persistStocks(next)
  }

  /** 更新股票别名（写入是即时的，不需要防抖） */
  function updateStockAlias(secid: string, alias: string) {
    const next = stocksRef.current.map((s) => {
      if (s.secid !== secid) return s
      return { ...s, alias: alias.trim() || undefined }
    })
    persistStocks(next)
  }

  // 防抖包装：连续输入 300ms 内只触发一次 persistFunds/persistStocks
  const debouncedFundCost = useMemo(() => debounce(updateFundCost, 300), [])
  const debouncedFundBuyNav = useMemo(() => debounce(updateFundBuyNav, 300), [])
  const debouncedStockCost = useMemo(() => debounce(updateStockCost, 300), [])
  const debouncedStockBuyPrice = useMemo(() => debounce(updateStockBuyPrice, 300), [])

  // 卸载时冲刷未触发任务，避免最后一次输入丢失
  useEffect(() => {
    return () => {
      debouncedFundCost.flush()
      debouncedFundBuyNav.flush()
      debouncedStockCost.flush()
      debouncedStockBuyPrice.flush()
    }
  }, [])

  async function refreshPreview() {
    setLoadingPreview(true)
    setStatus("刷新中…")
    try {
      // force=true：用户明确点“刷新预览”，总是实时拉取
      const s = await loadPortfolioSmart({ funds, stocks, force: true })
      setSnap(s)
      setStatus(
        s.warnings.length
          ? `完成（${s.warnings.join("；")}）`
          : `已更新 ${new Date(s.updatedAt).toLocaleTimeString()}`,
      )
    } catch {
      setStatus("预览刷新失败")
    } finally {
      setLoadingPreview(false)
    }
  }

  useEffect(() => {
    if (tab === "preview" && !snap && !loadingPreview) {
      refreshPreview()
    }
  }, [tab])

  async function confirmRemoveFund(code: string, name: string) {
    const ok = await Dialog.confirm({
      title: "确认删除",
      message: `确定删除基金「${name}」吗？`,
      cancelLabel: "取消",
      confirmLabel: "删除",
    })
    if (ok) removeFund(code)
  }

  async function confirmRemoveStock(secid: string, name: string) {
    const ok = await Dialog.confirm({
      title: "确认删除",
      message: `确定删除股票「${name}」吗？`,
      cancelLabel: "取消",
      confirmLabel: "删除",
    })
    if (ok) removeStock(secid)
  }

  return (
    <NavigationStack>
      <List
        navigationTitle="自选估值"
        navigationBarTitleDisplayMode="inline"
        toolbar={{
          topBarTrailing: (
            <Button
              title="刷小组件"
              action={() => {
                Widget.reloadAll()
                setStatus("已请求刷新小组件")
              }}
            />
          ),
        }}
      >
        <Section>
          <Picker
            title="页面"
            value={tab}
            onChanged={(v: string) => setTab(v as TabKey)}
            pickerStyle="segmented"
          >
            <Text tag="fund">基金</Text>
            <Text tag="stock">股票</Text>
            <Text tag="preview">预览</Text>
            <Text tag="settings">设置</Text>
          </Picker>
        </Section>

        {status ? (
          <Section>
            <Text font="caption" foregroundStyle="secondaryLabel">
              {status}
            </Text>
          </Section>
        ) : null}

        {tab === "fund" ? (
          <FundSection
            fundQuery={fundQuery}
            fundHits={fundHits}
            fundSearching={fundSearching}
            fundCost={fundCost}
            pendingFund={pendingFund}
            addingFund={addingFund}
            setFundQuery={setFundQuery}
            setFundHits={setFundHits}
            doSearchFund={doSearchFund}
            setPendingFund={setPendingFund}
            setFundCost={setFundCost}
            addFund={addFund}
            funds={funds}
            updateFundAlias={updateFundAlias}
            debouncedFundCost={debouncedFundCost}
            debouncedFundBuyNav={debouncedFundBuyNav}
            confirmRemoveFund={confirmRemoveFund}
            filter={fundFilter}
            setFilter={setFundFilter}
          />
        ) : null}

        {tab === "stock" ? (
          <StockSection
            stockQuery={stockQuery}
            stockHits={stockHits}
            stockSearching={stockSearching}
            stockCost={stockCost}
            pendingStock={pendingStock}
            addingStock={addingStock}
            setStockQuery={setStockQuery}
            setStockHits={setStockHits}
            doSearchStock={doSearchStock}
            setPendingStock={setPendingStock}
            setStockCost={setStockCost}
            addStock={addStock}
            stocks={stocks}
            updateStockAlias={updateStockAlias}
            debouncedStockCost={debouncedStockCost}
            debouncedStockBuyPrice={debouncedStockBuyPrice}
            confirmRemoveStock={confirmRemoveStock}
            filter={stockFilter}
            setFilter={setStockFilter}
          />
        ) : null}

        {tab === "preview" ? (
          <PreviewSection
            loadingPreview={loadingPreview}
            snap={snap}
            refreshPreview={refreshPreview}
            clearPrevNavCache={clearPrevNavCache}
            setStatus={setStatus}
            setWidgetPage={setWidgetPage}
            redUp={widgetConfig.redUp}
          />
        ) : null}

        {tab === "settings" ? (
          <SettingsSection
            widgetConfig={widgetConfig}
            persistWidgetConfig={persistWidgetConfig}
            setStatus={setStatus}
          />
        ) : null}
      </List>
    </NavigationStack>
  )
}

async function run() {
  try {
    await Navigation.present({ element: <App /> })
  } finally {
    Script.exit()
  }
}

run()
