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
  debouncedFundCost: (code: string, raw: string) => void
  debouncedFundBuyNav: (code: string, raw: string) => void
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
    funds, updateFundAlias, debouncedFundCost, debouncedFundBuyNav, confirmRemoveFund,
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
            只需填写买入金额（填0表示纯监控）。系统用当前最新净值折算份额（份额=金额÷净值）。若实际确认净值不同，可在列表中改「买入净值」。
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
            title="买入金额"
            prompt="总买入金额（元，填0表示纯监控）"
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
            别名会显示在小组件中；历史净值请在小组件点基金名称查看。删除前会二次确认。
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
              <VStack key={f.code} alignment="leading" spacing={8}>
                <HStack>
                  <VStack alignment="leading" spacing={2}>
                    <Text fontWeight="semibold" lineLimit={2}>{f.name}</Text>
                    <Text font="caption" foregroundStyle="secondaryLabel">
                      {f.code} · 约 {shares.toFixed(2)} 份
                    </Text>
                  </VStack>
                  <Spacer />
                  <Button
                    title="删除"
                    role="destructive"
                    action={() => confirmRemoveFund(f.code, f.name)}
                  />
                </HStack>
                <TextField
                  title="别名"
                  prompt="小组件显示名，如 白酒"
                  value={f.alias || ""}
                  onChanged={(v) => updateFundAlias(f.code, v)}
                />
                <TextField
                  title="买入金额"
                  prompt="元，0=纯监控"
                  value={String(f.costAmount ?? "")}
                  onChanged={(v) => debouncedFundCost(f.code, v)}
                  keyboardType="decimalPad"
                />
                <TextField
                  title="买入净值"
                  prompt="成交确认净值"
                  value={f.buyNav > 0 ? String(f.buyNav) : ""}
                  onChanged={(v) => debouncedFundBuyNav(f.code, v)}
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
