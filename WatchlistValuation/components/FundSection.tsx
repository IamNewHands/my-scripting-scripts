import {
  Button,
  HStack,
  Section,
  Spacer,
  Text,
  TextField,
  VStack,
} from "scripting"
import { resolveFundShares } from "../lib/calc/profit"
import type { FundItem, FundSearchHit } from "../lib/types"
import { ListFilter, matchesFilter } from "./ListFilter"

export type FundSectionProps = {
  // 搜索 / 录入
  fundQuery: string
  fundHits: FundSearchHit[]
  fundSearching: boolean
  fundCost: string
  pendingFund: FundSearchHit | null
  addingFund: boolean
  setFundQuery: (v: string) => void
  setFundHits: (v: FundSearchHit[]) => void
  doSearchFund: () => void
  setPendingFund: (h: FundSearchHit | null) => void
  setFundCost: (v: string) => void
  addFund: () => void
  // 列表
  funds: FundItem[]
  updateFundAlias: (code: string, alias: string) => void
  debouncedFundBuyNav: (code: string, raw: string) => void
  debouncedFundShares: (code: string, raw: string) => void
  confirmRemoveFund: (code: string, name: string) => void
  // 过滤
  filter: string
  setFilter: (v: string) => void
}

/** 控制台「基金」Tab：添加 + 搜索 + 列表 */
export function FundSection(props: FundSectionProps) {
  const {
    fundQuery, fundHits, fundSearching, fundCost, pendingFund, addingFund,
    setFundQuery, setFundHits, doSearchFund, setPendingFund, setFundCost, addFund,
    funds, updateFundAlias, debouncedFundBuyNav, debouncedFundShares, confirmRemoveFund,
    filter, setFilter,
  } = props
  const filteredFunds = funds.filter(
    (f) => matchesFilter(f.name, filter) || matchesFilter(f.code, filter) || matchesFilter(f.alias || "", filter),
  )

  return (
    <>
      <Section
        header={<Text>添加基金</Text>}
        footer={
          <Text>
            持有份额：你持有的基金份额数。添加时系统会自动拉最新净值作为成本价，总持有金额=份额×成本价自动计算。
          </Text>
        }
      >
        <TextField
          title="搜索"
          prompt="基金代码或名称"
          value={fundQuery}
          onChanged={setFundQuery}
          onSubmit={doSearchFund}
        />
        <Button
          title={fundSearching ? "搜索中…" : "搜索基金"}
          action={doSearchFund}
          disabled={fundSearching}
        />
        {/* 搜索结果：点选后收折，金额输入框显现 */}
        {fundHits.map((h) => (
          <HStack
            key={h.code}
            onTapGesture={() => {
              setPendingFund(h)
              setFundHits([])
              setFundQuery(h.name)
            }}
          >
            <VStack alignment="leading" spacing={2}>
              <Text fontWeight="semibold">{h.name}</Text>
              <Text font="caption" foregroundStyle="secondaryLabel">
                {h.code}
              </Text>
            </VStack>
            <Spacer />
            <Text foregroundStyle="secondaryLabel">选择</Text>
          </HStack>
        ))}
      </Section>

      {/* 已选基金 + 买入金额：搜索结果收折后独占一个 Section，避免被遮 */}
      {pendingFund ? (
        <Section
          header={
            <HStack>
              <Text>已选：{pendingFund.name} ({pendingFund.code})</Text>
              <Spacer />
              <Button
                title="重新搜索"
                action={() => {
                  setPendingFund(null)
                  setFundQuery("")
                  setFundCost("")
                }}
              />
            </HStack>
          }
        >
          <TextField
            title="持有份额"
            prompt="你持有的基金份额数"
            value={fundCost}
            onChanged={setFundCost}
            keyboardType="decimalPad"
          />
          <Button
            title={addingFund ? "添加中…" : "加入自选"}
            action={addFund}
            disabled={addingFund}
          />
        </Section>
      ) : null}

      <Section
        header={<Text>自选基金 ({funds.length})</Text>}
        footer={
          <Text>
            三行数字含义：①成本价(买入净值)=你买入时确认的净值(元/份)；②持有份额=你实际持有的基金份额；③总持有金额=份额×成本价自动计算，用于算收益。删除前会二次确认。
          </Text>
        }
      >
        {funds.length > 0 ? (
          <ListFilter
            value={filter}
            onChanged={setFilter}
            placeholder="名称/代码/别名"
            count={filteredFunds.length}
          />
        ) : null}
        {funds.length === 0 ? (
          <Text foregroundStyle="secondaryLabel">暂无自选基金</Text>
        ) : filteredFunds.length === 0 ? (
          <Text foregroundStyle="secondaryLabel">无匹配项</Text>
        ) : (
          filteredFunds.map((f) => {
            const shares = resolveFundShares(f, f.buyNav || null)
            return (
              // 整行吞掉 List 默认 tap，避免点名称/输入区误触发删除
              <VStack
                key={f.code}
                alignment="leading"
                spacing={8}
                onTapGesture={() => {}}
              >
                <HStack>
                  <VStack alignment="leading" spacing={2}>
                    <Text fontWeight="semibold" lineLimit={2}>{f.name}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      {f.code}
                    </Text>
                  </VStack>
                  <Spacer />
                  {/* 不用 Button：List 会把整行 tap 路由到最后一个 Button */}
                  <Text
                    foregroundStyle="red"
                    onTapGesture={() => confirmRemoveFund(f.code, f.name)}
                  >
                    删除
                  </Text>
                </HStack>
                <TextField
                  title="别名"
                  prompt="小组件显示名，如 白酒"
                  value={f.alias || ""}
                  onChanged={(v) => updateFundAlias(f.code, v)}
                />
                {/* 用 title 强制显示中文，避免 label 在 List 里不渲染 */}
                <TextField
                  title="① 成本价(买入净值·元/份)"
                  prompt="买入时确认的净值，如 3.2824"
                  value={f.buyNav > 0 ? String(f.buyNav) : ""}
                  onChanged={(v) => debouncedFundBuyNav(f.code, v)}
                  keyboardType="decimalPad"
                />
                <TextField
                  title="② 持有份额(份)"
                  prompt="实际持有的基金份额"
                  value={shares > 0 ? String(shares) : ""}
                  onChanged={(v) => debouncedFundShares(f.code, v)}
                  keyboardType="decimalPad"
                />
                <VStack alignment="leading" spacing={4}>
                  <Text font="caption" foregroundStyle="secondaryLabel">
                    ③ 总持有金额 = 成本价 × 份额（自动）
                  </Text>
                  <Text foregroundStyle="secondaryLabel">
                    ¥{f.costAmount.toFixed(2)}
                  </Text>
                </VStack>
                <Text font="caption" foregroundStyle="secondaryLabel">
                  例：成本价 3.2824 × 份额 304.66 ≈ ¥1000
                </Text>
              </VStack>
            )
          })
        )}
      </Section>
    </>
  )
}
