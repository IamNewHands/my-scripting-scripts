import {
  Button,
  HStack,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
} from "scripting"
import { resolveStockQuantity } from "../lib/calc/profit"
import type { StockItem, StockSearchHit } from "../lib/types"
import { ListFilter, matchesFilter } from "./ListFilter"

export type StockSectionProps = {
  // 搜索 / 录入
  stockQuery: string
  stockHits: StockSearchHit[]
  stockSearching: boolean
  stockCost: string
  pendingStock: StockSearchHit | null
  addingStock: boolean
  setStockQuery: (v: string) => void
  setStockHits: (v: StockSearchHit[]) => void
  doSearchStock: () => void
  setPendingStock: (h: StockSearchHit | null) => void
  setStockCost: (v: string) => void
  addStock: () => void
  // 列表
  stocks: StockItem[]
  updateStockAlias: (secid: string, alias: string) => void
  debouncedStockBuyPrice: (secid: string, raw: string) => void
  debouncedStockQuantity: (secid: string, raw: string) => void
  confirmRemoveStock: (secid: string, name: string) => void
  // 过滤
  filter: string
  setFilter: (v: string) => void
}

/** 控制台「股票」Tab：添加 + 搜索 + 列表 */
export function StockSection(props: StockSectionProps) {
  const {
    stockQuery, stockHits, stockSearching, stockCost, pendingStock, addingStock,
    setStockQuery, setStockHits, doSearchStock, setPendingStock, setStockCost, addStock,
    stocks, updateStockAlias, debouncedStockBuyPrice, debouncedStockQuantity, confirmRemoveStock,
    filter, setFilter,
  } = props
  const filteredStocks = stocks.filter(
    (s) => matchesFilter(s.name, filter) || matchesFilter(s.code, filter) || matchesFilter(s.alias || "", filter),
  )

  return (
    <>
      <Section
        header={<Text>添加 A 股</Text>}
        footer={
          <Text>
            持仓股数：你持有的股票数量。添加时系统会自动拉现价作为成本价，总持有金额=股数×成本价自动计算。可在列表改成本价对齐真实成交。
          </Text>
        }
      >
        <TextField
          title="代码"
          prompt="如 600519（或中文/拼音名称）"
          value={stockQuery}
          onChanged={setStockQuery}
          onSubmit={doSearchStock}
          keyboardType="numberPad"
        />
        <Button
          title={stockSearching ? "查询中…" : "查询股票"}
          action={doSearchStock}
          disabled={stockSearching}
        />
        {/* 搜索结果：点选后收折，金额框独占下方 Section */}
        {stockHits.map((h) => (
          <HStack
            key={h.secid}
            onTapGesture={() => {
              setPendingStock(h)
              setStockHits([])
              setStockQuery(h.name)
            }}
          >
            <VStack alignment="leading" spacing={2}>
              <Text fontWeight="semibold">{h.name}</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                {h.code} · {h.market}
              </Text>
            </VStack>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">选择</Text>
          </HStack>
        ))}
      </Section>

      {pendingStock ? (
        <Section
          header={
            <HStack>
              <Text>已选：{pendingStock.name} ({pendingStock.code})</Text>
              <Spacer />
              <Button
                title="重新搜索"
                action={() => {
                  setPendingStock(null)
                  setStockQuery("")
                  setStockCost("")
                }}
              />
            </HStack>
          }
        >
          <TextField
            title="持仓股数"
            prompt="你持有的股票数量"
            value={stockCost}
            onChanged={setStockCost}
            keyboardType="decimalPad"
          />
          <Button
            title={addingStock ? "添加中…" : "加入自选"}
            action={addStock}
            disabled={addingStock}
          />
        </Section>
      ) : null}

      <Section
        header={<Text>自选股票 ({stocks.length})</Text>}
        footer={<Text>三行数字含义：①成本价(买入价)=你买入时的成交均价(元/股)；②持仓股数=你实际持有的股票数量；③总持有金额=股数×成本价自动计算，用于算收益。删除前会二次确认。</Text>}
      >
        {stocks.length > 0 ? (
          <ListFilter
            value={filter}
            onChanged={setFilter}
            placeholder="名称/代码/别名"
            count={filteredStocks.length}
          />
        ) : null}
        {stocks.length === 0 ? (
          <Text foregroundStyle="secondaryLabel">暂无自选股票</Text>
        ) : filteredStocks.length === 0 ? (
          <Text foregroundStyle="secondaryLabel">无匹配项</Text>
        ) : (
          filteredStocks.map((s) => {
            const qty = resolveStockQuantity(s, s.buyPrice || null)
            return (
              // 整行吞掉 List 默认 tap，避免点名称/输入区误触发删除
              <VStack
                key={s.secid}
                alignment="leading"
                spacing={8}
                onTapGesture={() => {}}
              >
                <HStack>
                  <VStack alignment="leading" spacing={2}>
                    <Text fontWeight="semibold" lineLimit={2}>{s.name}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      {s.code}
                    </Text>
                  </VStack>
                  <Spacer />
                  {/* 不用 Button：List 会把整行 tap 路由到最后一个 Button */}
                  <Text
                    foregroundStyle="red"
                    onTapGesture={() => confirmRemoveStock(s.secid, s.name)}
                  >
                    删除
                  </Text>
                </HStack>
                <TextField
                  title="别名"
                  prompt="小组件显示名，如 茅台"
                  value={s.alias || ""}
                  onChanged={(v) => updateStockAlias(s.secid, v)}
                />
                <TextField
                  title="① 成本价(买入价·元/股)"
                  prompt="成交均价，如 1580.50"
                  value={s.buyPrice > 0 ? String(s.buyPrice) : ""}
                  onChanged={(v) => debouncedStockBuyPrice(s.secid, v)}
                  keyboardType="decimalPad"
                />
                <TextField
                  title="② 持仓股数(股)"
                  prompt="实际持有的股票数量"
                  value={s.quantity != null && s.quantity > 0 ? String(s.quantity) : ""}
                  onChanged={(v) => debouncedStockQuantity(s.secid, v)}
                  keyboardType="decimalPad"
                />
                <VStack alignment="leading" spacing={4}>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    ③ 总持有金额 = 成本价 × 股数（自动）
                  </Text>
                  <Text foregroundStyle="secondaryLabel">
                    ¥{s.costAmount.toFixed(2)}
                  </Text>
                </VStack>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  修改成本价或股数后，总持有金额自动重算
                </Text>
              </VStack>
            )
          })
        )}
      </Section>
    </>
  )
}
