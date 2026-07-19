import {
  Button,
  ContentUnavailableView,
  HStack,
  List,
  ProgressView,
  Section,
  Text,
  useEffect,
  useObservable,
  VStack,
} from "scripting"
import { itunes, regionLabel, type CountryItem } from "../class/itunes"
import { rates } from "../class/rate"
import { toCNYLabel } from "../util/format"
import {
  type AppInfo,
  extractAppInfo,
  pickBestFields,
  translateAppInfo,
} from "../util/appInfo"
import type { RegionPriceInfo } from "../types"
import { PriceTable } from "./components/PriceTable"

export type { RegionPriceInfo }

export function View({ id }: { id: string }) {
  const res = useObservable<RegionPriceInfo[] | string>()
  const appInfo = useObservable<AppInfo | null>(null)

  async function load() {
    try {
      const countries = itunes.enabledCountries()
      if (!countries.length) {
        res.setValue("请先在设置中启用至少一个地区")
        return
      }

      await rates.init()

      const lookupResults = await Promise.all(
        countries.map(async (c: CountryItem) => {
          const region = c.region.toUpperCase()
          const rate = c.rate.toUpperCase()
          try {
            const data = await itunes.lookup(id, region)
            const r = data?.results?.[0]
            if (!r) {
              return {
                region,
                rate,
                result: null,
                row: { region, rate, price: "" } as RegionPriceInfo,
              }
            }
            return {
              region,
              rate,
              result: r,
              row: {
                region,
                rate,
                price: String(r.formattedPrice ?? ""),
                currency: r.currency ? String(r.currency) : undefined,
              } as RegionPriceInfo,
            }
          } catch (e: any) {
            return {
              region,
              rate,
              result: null,
              row: {
                region,
                rate,
                price: "",
                error: e?.message ? String(e.message) : String(e),
              } as RegionPriceInfo,
            }
          }
        })
      )

      const priceList = lookupResults.map((i: { row: RegionPriceInfo }) => i.row)
      res.setValue(priceList)

      // 分别选取最佳描述源和更新说明源，避免 CN 区描述中文但 releaseNotes 为空时丢失翻译
      const fields = pickBestFields(
        lookupResults.map((i: { region: string; result: any }) => ({
          region: i.region,
          result: i.result,
        }))
      )
      if (fields.version) {
        // 用版本源作骨架，描述和更新说明各自覆写
        const raw = extractAppInfo(fields.version)
        if (fields.desc?.description) raw.description = String(fields.desc.description)
        if (fields.notes?.releaseNotes) raw.releaseNotes = String(fields.notes.releaseNotes)
        appInfo.setValue(raw)
        translateAppInfo(raw).then((translated: AppInfo) => {
          appInfo.setValue(translated)
        })
      }
    } catch (e: any) {
      res.setValue(e?.message ? String(e.message) : String(e))
    }
  }

  useEffect(() => {
    load()
  }, [])

  if (!res.value) return <ProgressView padding={true} title="正在查询多区价格" />

  return (
    <ContentView
      info={res.value}
      appInfo={appInfo.value}
      refreshable={async () => {
        appInfo.setValue(null)
        await Promise.all([load(), new Promise((r: any) => setTimeout(r, 400))])
      }}
    />
  )
}

function ContentView({
  info,
  appInfo,
  refreshable,
}: {
  info: RegionPriceInfo[] | string
  appInfo?: AppInfo | null
  refreshable?: () => Promise<void>
}) {
  if (typeof info === "string") {
    return (
      <ContentUnavailableView
        title={"错误"}
        systemImage={"exclamationmark.triangle"}
        description={info}
      />
    )
  }

  if (!info.length) {
    return (
      <ContentUnavailableView
        title={"无地区"}
        systemImage={"globe"}
        description={"请在设置中启用要对比的 App Store 地区"}
      />
    )
  }

  const tableText = info
    .map((i) => {
      const label = regionLabel(i.region)
      if (i.error) return `${label}\t失败\t—`
      if (!i.price) return `${label}\t不可用\t—`
      return `${label}\t${i.price}\t${toCNYLabel(i.price, i.currency || i.rate)}`
    })
    .join("\n")

  return (
    <List refreshable={refreshable}>
      <Section
        header={<Text>多区价格对比</Text>}
        footer={
          <Text font="footnote" foregroundStyle="secondaryLabel">
            {"列：地区 / 当地价格 / 约合人民币。单区失败不影响其它区。"}
          </Text>
        }
      >
        <VStack
          alignment="leading"
          padding={{ vertical: 8 }}
          contextMenu={{
            menuItems: (
              <Button
                title="拷贝表格"
                systemImage="doc.on.doc"
                action={() =>
                  Pasteboard.setString("地区\t当地价格\t约合人民币\n" + tableText)
                }
              />
            ),
          }}
        >
          <PriceTable rows={info} />
        </VStack>
      </Section>

      {appInfo && <AppInfoSection info={appInfo} />}
    </List>
  )
}

function AppInfoSection({ info }: { info: AppInfo }) {
  return (
    <>
      <Section header={<Text>版本信息</Text>}>
        {info.version ? (
          <HStack>
            <Text
              foregroundStyle="secondaryLabel"
              frame={{ width: 80, alignment: "leading" }}
            >
              {"版本"}
            </Text>
            <Text>{info.version}</Text>
          </HStack>
        ) : null}
        {info.releaseDate ? (
          <HStack>
            <Text
              foregroundStyle="secondaryLabel"
              frame={{ width: 80, alignment: "leading" }}
            >
              {"发布日期"}
            </Text>
            <Text>{info.releaseDate}</Text>
          </HStack>
        ) : null}
      </Section>

      {info.releaseNotes ? (
        <Section
          header={
            <Text>
              {info.notesTranslated ? "更新说明（已翻译）" : "更新说明"}
            </Text>
          }
        >
          <Text
            font="subheadline"
            foregroundStyle="secondaryLabel"
            padding={{ vertical: 4 }}
          >
            {info.releaseNotes}
          </Text>
        </Section>
      ) : null}

      {info.description ? (
        <Section
          header={
            <Text>
              {info.descTranslated ? "应用简介（已翻译）" : "应用简介"}
            </Text>
          }
        >
          <Text
            font="subheadline"
            foregroundStyle="secondaryLabel"
            padding={{ vertical: 4 }}
          >
            {info.description}
          </Text>
        </Section>
      ) : null}
    </>
  )
}