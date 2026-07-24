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
  debouncedStockCost: (secid: string, raw: string) => void
  debouncedStockBuyPrice: (secid: string, raw: string) => void
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
    stocks, updateStockAlias, debouncedStockCost, debouncedStockBuyPrice, confirmRemoveStock,
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
            只需填写买入金额（填0表示纯监控）。系统用当前现价折算股数（股数=金额÷现价）。可在列表改「买入价」对齐真实成交。
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
            title="买入金额"
            prompt="总买入金额（元，填0表示纯监控）"
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
        footer={<Text>别名用于小组件显示；删除前会二次确认。</Text>}
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
              <VStack key={s.secid} alignment="leading" spacing={8}>
                <HStack>
                  <VStack alignment="leading" spacing={2}>
                    <Text fontWeight="semibold" lineLimit={2}>{s.name}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      {s.code} · 约 {qty.toFixed(2)} 股
                    </Text>
                  </VStack>
                  <Spacer />
                  <Button
                    title="删除"
                    role="destructive"
                    action={() => confirmRemoveStock(s.secid, s.name)}
                  />
                </HStack>
                <TextField
                  title="别名"
                  prompt="小组件显示名"
                  value={s.alias || ""}
                  onChanged={(v) => updateStockAlias(s.secid, v)}
                />
                <TextField
                  title="买入金额"
                  prompt="元，0=纯监控"
                  value={String(s.costAmount ?? "")}
                  onChanged={(v) => debouncedStockCost(s.secid, v)}
                  keyboardType="decimalPad"
                />
                <TextField
                  title="买入价"
                  prompt="成交均价"
                  value={s.buyPrice > 0 ? String(s.buyPrice) : ""}
                  onChanged={(v) => debouncedStockBuyPrice(s.secid, v)}
                  keyboardType="decimalPad"
                />
              </VStack>
            )
          })
        )}
      </Section>
    </>
  )
}
