import {
  Button,
  ContentUnavailableView,
  HStack,
  Image,
  List,
  NavigationLink,
  ProgressView,
  RoundedRectangle,
  ScrollView,
  Section,
  Spacer,
  Text,
  useEffect,
  useObservable,
  VStack,
} from "scripting"
import { itunes, regionLabel } from "../class/itunes"
import { rates } from "../class/rate"
import { formatBytes, formatRating, toCNYLabel } from "../util/format"
import { View as DetailView } from "./detail"

export function View() {
  const presented = useObservable(true)
  const query = useObservable("")
  const res = useObservable<any[] | null | undefined>()
  const regionHint = useObservable(
    itunes
      .enabledCountries()
      .map((c) => c.region)
      .join(" · ") || "未启用地区"
  )

  async function search() {
    try {
      res.setValue(null)
      // 保证换算可用（结果卡上会显示约合人民币）
      await rates.init()

      const countries = itunes.enabledCountries()
      regionHint.setValue(countries.map((c) => c.region).join(" · ") || "未启用地区")
      if (!countries.length) {
        res.setValue([])
        return
      }

      const chunks = await Promise.all(
        countries.map(async (i) => {
          try {
            const data = await itunes.search(query.value || "", i.region)
            const list = Array.isArray(data?.results) ? data.results : []
            // 标记来源区，便于展示
            return list.map((item: any) => ({
              ...item,
              _fromRegion: i.region.toUpperCase(),
              _fromRate: i.rate.toUpperCase(),
            }))
          } catch {
            return [] as any[]
          }
        })
      )

      const all = chunks.flat()
      const m = new Map<any, any>()
      for (const item of all) {
        if (item?.trackId == null) continue
        if (!m.has(item.trackId)) {
          m.set(item.trackId, item)
        }
      }

      // 按名称与查询词的匹配度排序：精确匹配 > 前缀匹配 > 包含匹配 > 其余
      const q = (query.value || "").trim().toLowerCase()
      const ranked = [...m.values()].sort((a, b) => {
        const nameA = (a.trackName || "").toLowerCase()
        const nameB = (b.trackName || "").toLowerCase()
        const score = (name: string) => {
          if (!q) return 0
          if (name === q) return 3
          if (name.startsWith(q)) return 2
          if (name.includes(q)) return 1
          return 0
        }
        return score(nameB) - score(nameA)
      })

      res.setValue(ranked)
    } catch {
      res.setValue(undefined)
    }
  }

  useEffect(() => {
    if (!presented.value) res.setValue(undefined)
  }, [presented.value])

  return (
    <ContentView
      res={res.value}
      regionHint={regionHint.value || ""}
      searchable={{
        value: query,
        presented: presented,
        prompt: "应用名 / 开发者 / 关键词",
      }}
      onSubmit={{ triggers: "search", action: search }}
    />
  )
}

function ContentView({
  res,
  regionHint,
}: {
  res: any[] | null | undefined
  regionHint: string
}) {
  return (
    <>
      {res === undefined ? (
        <List>
          <Section
            header={<Text>使用说明</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                {"当前对比地区：" + (regionHint || "—") + "（可在右上角设置中修改）"}
              </Text>
            }
          >
            <HintRow icon="magnifyingglass" title="搜索" detail="输入应用名后回车/点搜索" />
            <HintRow icon="globe" title="多区对比" detail="进入详情查看各地区价格表" />
            <HintRow icon="yensign.circle" title="人民币" detail="表格第三列自动换算约合 CNY" />
            <HintRow icon="gearshape" title="设置" detail="启用/添加 App Store 地区" />
          </Section>
        </List>
      ) : res === null ? (
        <ProgressView padding={true} title="正在搜索" />
      ) : res.length === 0 ? (
        <ScrollView>
          <HStack padding={true}>
            <Spacer />
            <ContentUnavailableView title="暂无搜索结果" systemImage="magnifyingglass" />
            <Spacer />
          </HStack>
        </ScrollView>
      ) : (
        <List>
          <Section
            header={<Text>{`搜索结果（${res.length}）`}</Text>}
            footer={
              <Text font="footnote" foregroundStyle="secondaryLabel">
                {"点进应用查看多区价格表（地区 / 当地价 / 约合人民币）。对比区：" + regionHint}
              </Text>
            }
          >
            {res.map((info) => (
              <ItemView key={info.trackId} info={info} />
            ))}
          </Section>
        </List>
      )}
    </>
  )
}

function HintRow({ icon, title, detail }: { icon: string; title: string; detail: string }) {
  return (
    <HStack spacing={12}>
      <Image systemName={icon} foregroundStyle="accentColor" frame={{ width: 22 }} />
      <VStack alignment="leading" spacing={2}>
        <Text font="headline">{title}</Text>
        <Text font="subheadline" foregroundStyle="secondaryLabel">
          {detail}
        </Text>
      </VStack>
    </HStack>
  )
}

function ItemView({ info }: { info: any }) {
  const priceText = String(info.formattedPrice ?? info.price ?? "—")
  const currency = info.currency ? String(info.currency) : undefined
  const cny = priceText && priceText !== "—" ? toCNYLabel(priceText, currency) : "—"
  const rating = formatRating(info.averageUserRating, info.userRatingCount)
  const size = formatBytes(info.fileSizeBytes)
  const genres = Array.isArray(info.genres) ? info.genres.slice(0, 2).join(" · ") : ""
  const region = info._fromRegion ? regionLabel(String(info._fromRegion)) : ""

  return (
    <NavigationLink
      destination={
        <DetailView
          id={String(info.trackId)}
          navigationTitle={info.trackName}
          navigationBarTitleDisplayMode={"inline"}
          toolbar={{
            topBarTrailing: [
              <Button
                title={"App Store"}
                systemImage={"arrow.up.right.app"}
                action={async () => {
                  const sid = String(info.trackId)
                  try {
                    // presentApp 要求字符串类型；已有 modal 打开时会 throw
                    await AppStore.presentApp(sid)
                  } catch {
                    // 失败时展开 App Store 网页作为兑底
                    await Safari.present(
                      `https://apps.apple.com/app/id${sid}`,
                      false
                    )
                  }
                }}
              />,
            ],
          }}
        />
      }
    >
      <HStack alignment="top" spacing={12}>
        <IconView info={info} />
        <VStack alignment={"leading"} spacing={4} frame={{ maxWidth: "infinity", alignment: "leading" }}>
          <Text font={"headline"} lineLimit={2}>
            {info.trackName || "—"}
          </Text>
          <Text font={"subheadline"} foregroundStyle={"secondaryLabel"} lineLimit={1}>
            {info.artistName || "未知开发者"}
          </Text>

          {/* 字段行：版本 / 评分 / 大小 */}
          <HStack spacing={8}>
            <MetaChip label="版本" value={info.version ? `v${info.version}` : "—"} />
            <MetaChip label="评分" value={rating} />
            <MetaChip label="大小" value={size} />
          </HStack>

          {/* 价格行：搜索命中区原价 + 人民币 */}
          <HStack>
            <Text font="caption" foregroundStyle="tertiaryLabel">
              {region ? `${region}价` : "价格"}
            </Text>
            <Spacer />
            <Text font="subheadline" fontWeight="semibold">
              {priceText}
            </Text>
            <Text font="subheadline" foregroundStyle="secondaryLabel">
              {cny !== "—" && cny !== priceText ? ` · ${cny}` : cny === "¥0.00" ? " · 免费" : ""}
            </Text>
          </HStack>

          {genres ? (
            <Text font="caption" foregroundStyle="tertiaryLabel" lineLimit={1}>
              {genres}
            </Text>
          ) : null}
        </VStack>
      </HStack>
    </NavigationLink>
  )
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <HStack spacing={2}>
      <Text font="caption2" foregroundStyle="tertiaryLabel">
        {label}
      </Text>
      <Text font="caption" foregroundStyle="secondaryLabel">
        {value}
      </Text>
    </HStack>
  )
}

function IconView({ info }: { info: any }) {
  const icon = useObservable<UIImage | null>()

  async function init() {
    try {
      const url = info.artworkUrl512 || info.artworkUrl100 || info.artworkUrl60
      if (url) {
        icon.setValue(await UIImage.fromURL(url))
      } else {
        icon.setValue(null)
      }
    } catch {
      icon.setValue(null)
    }
  }
  useEffect(() => {
    init()
  }, [])

  if (icon.value === undefined) return <ProgressView frame={{ height: 64, width: 64 }} />
  if (icon.value === null)
    return (
      <RoundedRectangle
        fill={"secondarySystemBackground"}
        cornerRadius={14}
        frame={{ height: 64, width: 64 }}
      />
    )
  return (
    <Image
      image={icon.value}
      resizable={true}
      frame={{ height: 64, width: 64 }}
      clipShape={{
        type: "rect",
        cornerRadius: 14,
        style: "continuous",
      }}
      contextMenu={{
        menuItems: (
          <>
            <Section title={"共享"}>
              <Button title={"插图"} action={() => ShareSheet.present([icon.value!])} />
            </Section>
            <Section title={"拷贝"}>
              <CopyButton contents={[info.artistName]} title={"开发者"} />
              <CopyButton contents={[info.formattedPrice]} title={"价格"} />
              <CopyButton contents={[info.currency]} title={"货币"} />
              <CopyButton contents={[info.trackId]} title={"商店ID"} />
              <CopyButton contents={[info.bundleId]} title={"Bundle ID"} />
              <CopyButton contents={[info.trackViewUrl]} title={"商店URL"} />
              <CopyButton contents={[info.version]} title={"版本"} />
              <CopyButton contents={[info.averageUserRating]} title={"评分"} />
            </Section>
          </>
        ),
      }}
    />
  )
}

function CopyButton({ contents, title }: { contents: any[]; title: string }) {
  return (
    <Button
      title={title}
      action={() => {
        Pasteboard.setString(contents.filter((x) => x != null).map(String).join("\n"))
      }}
    />
  )
}
