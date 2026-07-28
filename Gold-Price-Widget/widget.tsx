import { VStack, HStack, Text, Image, Widget, Spacer, Button, Divider, Rectangle, ZStack } from "scripting"
import { fetchGoldPrice, GoldPriceResult, isValidGoldPriceResult } from "./utils/fetchGold"
import { RefreshGoldIntent, SwitchBankIntent } from "./app_intents"

const STORAGE_PREFIX = "goldPrice_"

type BankSource = "cmb" | "zs" | "icbc" | "ms" | "cgb" | "cib" | "jd" | "gj"

const BANK_CONFIG: Record<BankSource, { shortName: string }> = {
  cmb: { shortName: "招行金价" },
  zs: { shortName: "浙商金价" },
  icbc: { shortName: "工行金价" },
  ms: { shortName: "民生金价" },
  cgb: { shortName: "广发金价" },
  cib: { shortName: "兴业金价" },
  jd: { shortName: "京东黄金" },
  gj: { shortName: "伦敦金" },
}

type PricePoint = {
  time: string
  price: number
}

// === 公共组件 ===

// 银行图标（始终使用 SF Symbol，避免 .ico 兼容问题）
function BankIcon({ size }: { size: number }) {
  return (
    <Image
      systemName="building.columns.fill"
      font={size - 4}
      foregroundStyle="systemOrange"
      frame={{ width: size, height: size }}
    />
  )
}

// 银行头部信息（图标 + 名称 + 切换按钮 + 刷新按钮）
function WidgetHeader({
  shortName,
  iconSize = 22,
  titleSize = 18,
  switchIconSize = 12,
  refreshIconSize = 16,
  showRefresh = true,
}: {
  shortName: string
  iconSize?: number
  titleSize?: number
  switchIconSize?: number
  refreshIconSize?: number
  showRefresh?: boolean
}) {
  return (
    <HStack alignment="center" spacing={6}>
      <Button intent={SwitchBankIntent(undefined)} buttonStyle="plain">
        <HStack alignment="center" spacing={6}>
          <BankIcon size={iconSize} />
          <Text font={titleSize} fontWeight="bold">{shortName}</Text>
          <Image systemName="arrow.triangle.2.circlepath" font={switchIconSize} foregroundStyle="secondaryLabel" />
        </HStack>
      </Button>
      <Spacer />
      {showRefresh ? (
        <Button intent={RefreshGoldIntent(undefined)} buttonStyle="plain">
          <Image systemName="arrow.clockwise" font={refreshIconSize} foregroundStyle="systemBlue" />
        </Button>
      ) : null}
    </HStack>
  )
}

// === 工具函数 ===

function splitDateTime(updateTime: string): { datePart: string; timePart: string } {
  const [datePart = "--/--/--", timePart = "--:--:--"] = (updateTime || "").split(" ")
  return { datePart, timePart }
}

function formatChange(
  changeValue: string,
  changePercent: string,
): { display: string; color: string; full: string } {
  const number = Number.parseFloat(changeValue)
  if (!Number.isFinite(number)) {
    return { display: changeValue || "--", color: "secondaryLabel", full: changeValue || "--" }
  }

  const sign = number > 0 ? "+" : ""
  const display = `${sign}${number.toFixed(2)}`
  const color = number > 0 ? "red" : number < 0 ? "green" : "secondaryLabel"
  const pct = changePercent ? ` (${changePercent.startsWith("-") || changePercent.startsWith("+") ? "" : number > 0 ? "+" : ""}${changePercent}%)` : ""
  const full = display + pct

  return { display, color, full }
}

function loadHistory(source: string): PricePoint[] {
  const history = Storage.get<PricePoint[]>(`${STORAGE_PREFIX}history_${source}`) ?? []
  return history.filter((point) => Number.isFinite(point?.price) && typeof point?.time === "string")
}

function saveHistory(source: string, history: PricePoint[]): void {
  Storage.set(`${STORAGE_PREFIX}history_${source}`, history.slice(-15))
}

// 价格范围存储（用于趋势图固定归一化基准）
function loadPriceRange(source: string): { min: number; max: number } | null {
  return Storage.get<{ min: number; max: number }>(`${STORAGE_PREFIX}range_${source}`) ?? null
}

function savePriceRange(source: string, range: { min: number; max: number }): void {
  Storage.set(`${STORAGE_PREFIX}range_${source}`, range)
}

function updatePriceRange(source: string, price: number): void {
  const current = loadPriceRange(source)
  if (!current) {
    savePriceRange(source, { min: price, max: price })
  } else {
    savePriceRange(source, {
      min: Math.min(current.min, price),
      max: Math.max(current.max, price),
    })
  }
}

function recordHistory(source: string, price: number, time: string): PricePoint[] {
  const history = loadHistory(source)
  const lastPoint = history[history.length - 1]
  if (!lastPoint || lastPoint.time !== time || lastPoint.price !== price) {
    history.push({ time, price })
    updatePriceRange(source, price)
  }
  saveHistory(source, history)
  return history.slice(-15)
}

// === 趋势图组件 ===

// 固定 10 个槽位，右对齐填充，不足的左侧显示空占位柱
// 柱高按存储的全量价格范围归一化，保证每次刷新后柱子形状不变
function TrendBars({ data, priceRange }: { data: PricePoint[]; priceRange: { min: number; max: number } | null }) {
  const SLOT_COUNT = 10

  // 右对齐填充 10 个槽位
  const slots: (PricePoint | null)[] = []
  const startIdx = Math.max(0, data.length - SLOT_COUNT)
  for (let i = 0; i < SLOT_COUNT; i++) {
    const idx = startIdx + i
    slots.push(idx < data.length ? data[idx] : null)
  }

  // 趋势方向（基于实际数据，非填充槽位）
  const validPrices = data.map((p) => p.price)
  const hasData = validPrices.length > 0
  const trendUp = validPrices.length >= 2
    ? validPrices[validPrices.length - 1] >= validPrices[0]
    : true
  const tint = trendUp ? "red" : "green"

  // 使用存储的全量范围归一化，若无则回退到当前数据范围
  const normMin = priceRange?.min ?? (hasData ? Math.min(...validPrices) : 0)
  const normMax = priceRange?.max ?? (hasData ? Math.max(...validPrices) : 0)
  const normRange = (normMax - normMin) || 1

  // 当前可见数据的最值（用于底部标签）
  const visibleMin = hasData ? Math.min(...validPrices) : 0
  const visibleMax = hasData ? Math.max(...validPrices) : 0

  return (
    <VStack spacing={6}>
      <HStack alignment="bottom" spacing={3} frame={{ maxWidth: "infinity", height: 72 }}>
        {slots.map((slot, index) => {
          if (!slot) {
            // 空槽位：极矮的灰色占位柱 + 灰色时间标签
            return (
              <VStack key={`empty_${index}`} spacing={2} frame={{ maxWidth: "infinity" }}>
                <ZStack alignment="bottom" frame={{ height: 56, maxWidth: "infinity" }}>
                  <Rectangle
                    foregroundStyle="secondarySystemBackground"
                    frame={{ maxWidth: "infinity", height: 56 }}
                    clipShape={{ type: "rect", cornerRadius: 5 }}
                  />
                  <Rectangle
                    foregroundStyle="tertiarySystemBackground"
                    frame={{ height: 6, maxWidth: "infinity" }}
                    clipShape={{ type: "rect", cornerRadius: 5 }}
                  />
                </ZStack>
                <Text font={9} foregroundStyle="tertiaryLabel">--:--</Text>
              </VStack>
            )
          }

          const normalized = ((slot.price - normMin) / normRange) * 0.8 + 0.2
          return (
            <VStack key={`${slot.time}_${index}`} spacing={2} frame={{ maxWidth: "infinity" }}>
              <ZStack alignment="bottom" frame={{ height: 56, maxWidth: "infinity" }}>
                <Rectangle
                  foregroundStyle="secondarySystemBackground"
                  frame={{ maxWidth: "infinity", height: 56 }}
                  clipShape={{ type: "rect", cornerRadius: 5 }}
                />
                <Rectangle
                  foregroundStyle={tint}
                  frame={{ height: Math.max(10, Math.round(normalized * 56)), maxWidth: "infinity" }}
                  clipShape={{ type: "rect", cornerRadius: 5 }}
                />
              </ZStack>
              <Text font={9} foregroundStyle="secondaryLabel">{slot.time}</Text>
            </VStack>
          )
        })}
      </HStack>
      <HStack>
        <Text font={10} foregroundStyle="secondaryLabel">最低 {visibleMin.toFixed(2)}</Text>
        <Spacer />
        <Text font={10} foregroundStyle={tint}>{trendUp ? "走势上行" : "走势下行"}</Text>
        <Spacer />
        <Text font={10} foregroundStyle="secondaryLabel">最高 {visibleMax.toFixed(2)}</Text>
      </HStack>
    </VStack>
  )
}

// === 主入口 ===

async function GoldWidget() {
  const source = (Storage.get<string>(`${STORAGE_PREFIX}source`) ?? "cmb") as BankSource
  const config = BANK_CONFIG[source] ?? BANK_CONFIG.cmb

  const cacheKey = `${STORAGE_PREFIX}cache_${source}`
  const cachedResult = Storage.get<GoldPriceResult>(cacheKey)
  let result: GoldPriceResult = isValidGoldPriceResult(cachedResult)
    ? cachedResult
    : {
        buyPrice: "--",
        sellPrice: "--",
        changeValue: "--",
        changePercent: "",
        updateTime: "--:--",
      }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 4000)
  try {
    const freshResult = await fetchGoldPrice(source as any, controller.signal)
    if (isValidGoldPriceResult(freshResult)) {
      result = freshResult
      Storage.set(cacheKey, freshResult)
    }
  } catch (e) {
    console.error("GoldWidget fetch failed:", e)
  } finally {
    clearTimeout(timeout)
  }

  const { buyPrice, sellPrice, changeValue, changePercent, updateTime } = result
  const { datePart, timePart } = splitDateTime(updateTime)
  const { display: displayChange, color: changeColor, full: fullChange } = formatChange(changeValue, changePercent)
  const buyPriceNumber = Number.parseFloat(buyPrice)
  const sellPriceNumber = Number.parseFloat(sellPrice)
  const changeNumber = Number.parseFloat(changeValue)
  const timeLabel = timePart !== "--:--:--" ? timePart.slice(0, 5) : "--:--"
  const history = Number.isFinite(buyPriceNumber) ? recordHistory(source, buyPriceNumber, timeLabel) : loadHistory(source)
  const priceRange = loadPriceRange(source)

  // 统一格式化为 2 位小数，避免 API 返回不同小数位数导致折行
  const formattedBuyPrice = Number.isFinite(buyPriceNumber) ? buyPriceNumber.toFixed(2) : buyPrice
  const formattedSellPrice = Number.isFinite(sellPriceNumber) ? sellPriceNumber.toFixed(2) : sellPrice
  
  // === 锁屏：accessoryRectangular ===
  if (Widget.family === "accessoryRectangular") {
    Widget.present(
      <VStack alignment="leading" padding={4} frame={{ maxWidth: "infinity" }}>
        <HStack>
          <Button intent={SwitchBankIntent(undefined)} buttonStyle="plain">
            <Text font="caption" fontWeight="bold">{config.shortName}</Text>
          </Button>
          <Spacer />
          <VStack alignment="trailing">
            <Text font="caption2" opacity={0.6}>{datePart}</Text>
            <Text font="caption2" opacity={0.6}>{timePart}</Text>
          </VStack>
        </HStack>
        <HStack>
          <Text font="caption2" opacity={0.7}>买入</Text>
          <Text font="headline" fontWeight="bold">{formattedBuyPrice}</Text>
          <Spacer />
          <Text font="caption" foregroundStyle={changeColor}>{fullChange}</Text>
        </HStack>
        <HStack>
          <Text font="caption2" opacity={0.7}>卖出</Text>
          <Text font="caption" fontWeight="semibold">{formattedSellPrice}</Text>
        </HStack>
      </VStack>
    )
    return
  }

  // === 主屏中号：systemMedium ===
  if (Widget.family === "systemMedium") {
    Widget.present(
      <VStack safeAreaPadding padding={{ horizontal: 4, vertical: 2 }} alignment="leading" frame={{ maxWidth: "infinity" }}>
        <WidgetHeader shortName={config.shortName} />
        <VStack alignment="leading" spacing={0}>
          <Text font={12} foregroundStyle="secondaryLabel">{datePart}</Text>
          <Text font={12} foregroundStyle="secondaryLabel">{timePart}</Text>
        </VStack>
        <Spacer />
        <Divider />
        <Spacer />
        <HStack alignment="center" frame={{ maxWidth: "infinity" }}>
          <VStack alignment="leading" spacing={4}>
            <HStack alignment="firstTextBaseline" spacing={8}>
              <Text font={13} foregroundStyle="secondaryLabel">买入</Text>
              <Text font={22} fontWeight="bold">{formattedBuyPrice}</Text>
            </HStack>
            <HStack alignment="firstTextBaseline" spacing={8}>
              <Text font={13} foregroundStyle="secondaryLabel">卖出</Text>
              <Text font={22} fontWeight="semibold" foregroundStyle={changeColor}>{formattedSellPrice}</Text>
            </HStack>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            <Text font={18} fontWeight="semibold" foregroundStyle={changeColor}>{displayChange}</Text>
            {changePercent ? (
              <Text font={12} foregroundStyle={changeColor}>{changeNumber > 0 ? "+" : ""}{changePercent}%</Text>
            ) : null}
          </VStack>
        </HStack>
        <Spacer />
      </VStack>
    )
    return
  }

  // === 主屏大号：systemLarge ===
  if (Widget.family === "systemLarge") {
    Widget.present(
      <VStack safeAreaPadding padding={{ horizontal: 16, vertical: 12 }} alignment="leading" spacing={10} frame={{ maxWidth: "infinity" }}>
        <WidgetHeader shortName={config.shortName} iconSize={28} titleSize={22} switchIconSize={14} refreshIconSize={18} />
        <Text font={11} foregroundStyle="secondaryLabel">{datePart} {timePart}</Text>
        <HStack alignment="firstTextBaseline" spacing={12}>
          <VStack alignment="leading" spacing={2}>
            <Text font={11} foregroundStyle="secondaryLabel">买入价</Text>
            <Text font={26} fontWeight="bold">{formattedBuyPrice}</Text>
          </VStack>
          <VStack alignment="leading" spacing={2}>
            <Text font={11} foregroundStyle="secondaryLabel">卖出价</Text>
            <Text font={20} fontWeight="semibold">{formattedSellPrice}</Text>
          </VStack>
          <Spacer />
          <VStack alignment="trailing" spacing={2}>
            <Text font={11} foregroundStyle="secondaryLabel">涨跌</Text>
            <Text font={18} fontWeight="bold" foregroundStyle={changeColor}>{fullChange}</Text>
          </VStack>
        </HStack>
        <Divider />
        <VStack alignment="leading" spacing={6}>
          <Text font={12} fontWeight="semibold">最近走势</Text>
          <TrendBars data={history.slice(-10)} priceRange={priceRange} />
        </VStack>
      </VStack>
    )
    return
  }

  // === 默认（systemSmall 等） ===
  Widget.present(
    <VStack safeAreaPadding padding={5} alignment="leading" frame={{ maxWidth: "infinity" }}>
      <Button intent={SwitchBankIntent(undefined)} buttonStyle="plain">
        <HStack spacing={6}>
          <BankIcon size={16} />
          <Text font={14} fontWeight="bold">{config.shortName}</Text>
          <Image systemName="arrow.triangle.2.circlepath" font={10} foregroundStyle="secondaryLabel" />
        </HStack>
      </Button>
      <HStack spacing={4}>
        <VStack alignment="leading" spacing={0}>
          <Text font={10} foregroundStyle="secondaryLabel">{datePart}</Text>
          <Text font={10} foregroundStyle="secondaryLabel">{timePart}</Text>
        </VStack>
        <Spacer />
        <Button intent={RefreshGoldIntent(undefined)} buttonStyle="plain">
          <Image systemName="arrow.clockwise" font={12} foregroundStyle="systemBlue" />
        </Button>
      </HStack>
      <Spacer />
      <HStack alignment="firstTextBaseline" spacing={4}>
        <Text font={12} foregroundStyle="secondaryLabel">买入</Text>
        <Text font={20} fontWeight="bold">{formattedBuyPrice}</Text>
      </HStack>
      <Text font={10} fontWeight="semibold" foregroundStyle={changeColor}>{fullChange}</Text>
      <Spacer />
      <HStack alignment="firstTextBaseline">
        <Text font={12} foregroundStyle="secondaryLabel">卖出</Text>
        <Text font={20} fontWeight="medium">{formattedSellPrice}</Text>
      </HStack>
    </VStack>
  )
}

GoldWidget()