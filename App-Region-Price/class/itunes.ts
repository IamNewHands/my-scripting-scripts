import { fetchWithTimeout } from "../util/http"
// 区域中文名：regionLabel 见同文件中段

export type CountryItem = {
  region: string
  rate: string
  enabled: boolean
}

/** iTunes Lookup 原始结果中用到的字段 */
export type ItunesAppResult = {
  trackId: number
  trackName: string
  artistName: string
  formattedPrice: string
  price: number
  currency: string
  version: string
  fileSizeBytes: string
  averageUserRating: number
  userRatingCount: number
  genres: string[]
  artworkUrl512: string
  artworkUrl100: string
  description: string
  releaseNotes: string
  currentVersionReleaseDate: string
  releaseDate: string
  bundleId: string
  sellerName: string
  contentAdvisoryRating: string
  minimumOsVersion: string
}

/** 地区代码 → 中文名称 */
export const REGION_NAMES: Record<string, string> = {
  CN: "中国大陆",
  US: "美国",
  HK: "香港",
  TW: "台湾",
  JP: "日本",
  GB: "英国",
  SG: "新加坡",
  AU: "澳大利亚",
  CA: "加拿大",
  KR: "韩国",
  DE: "德国",
  FR: "法国",
  IT: "意大利",
  ES: "西班牙",
  BR: "巴西",
  IN: "印度",
  TH: "泰国",
  VN: "越南",
  PH: "菲律宾",
  MY: "马来西亚",
  ID: "印尼",
  NZ: "新西兰",
  RU: "俄罗斯",
  TR: "土耳其",
  MX: "墨西哥",
  SA: "沙特",
  AE: "阿联酋",
  CH: "瑞士",
  SE: "瑞典",
  NO: "挪威",
  DK: "丹麦",
  NL: "荷兰",
  BE: "比利时",
  AT: "奥地利",
}

/** 返回地区展示文案（代码 + 中文名），未知代码原样返回 */
export function regionLabel(code: string): string {
  const upper = String(code || "").trim().toUpperCase()
  const name = REGION_NAMES[upper]
  return name ? `${upper} ${name}` : upper
}

/** 常用区默认列表（可在设置里增删/开关） */
export const DEFAULT_COUNTRIES: CountryItem[] = [
  { region: "CN", rate: "CNY", enabled: true },
  { region: "US", rate: "USD", enabled: true },
  { region: "HK", rate: "HKD", enabled: true },
  { region: "TW", rate: "TWD", enabled: true },
  { region: "JP", rate: "JPY", enabled: true },
  { region: "GB", rate: "GBP", enabled: true },
  { region: "SG", rate: "SGD", enabled: true },
  { region: "AU", rate: "AUD", enabled: false },
  { region: "CA", rate: "CAD", enabled: false },
  { region: "KR", rate: "KRW", enabled: false },
  { region: "DE", rate: "EUR", enabled: false },
  { region: "FR", rate: "EUR", enabled: false },
]

const SETTINGS_VERSION = 2

class ITunes {
  private KEY = "itunes_setting"
  private base = "https://itunes.apple.com"

  countries: CountryItem[] = DEFAULT_COUNTRIES.map((c) => ({ ...c }))

  constructor() {
    this.readStorage()
  }

  readStorage() {
    const saved = Storage.get<any>(this.KEY)
    if (!saved) {
      // 首次：写入默认多区
      this.save()
      return
    }

    const ver = Number(saved.version || 0)
    // 旧版只有单 CN 默认：升级到多区默认（仅当仍是「仅 CN 一条」时自动扩展，避免覆盖用户自定义多区）
    if (ver < SETTINGS_VERSION) {
      const list = Array.isArray(saved.countries) ? saved.countries : []
      const onlyOldDefault =
        list.length === 1 &&
        String(list[0]?.region || "").toUpperCase() === "CN" &&
        String(list[0]?.rate || "").toUpperCase() === "CNY"
      if (!list.length || onlyOldDefault) {
        this.countries = DEFAULT_COUNTRIES.map((c) => ({ ...c }))
        this.save()
        return
      }
    }

    if (Array.isArray(saved.countries) && saved.countries.length > 0) {
      this.countries = saved.countries
        .map((c: any) => ({
          region: String(c?.region || "")
            .trim()
            .toUpperCase(),
          rate: String(c?.rate || "")
            .trim()
            .toUpperCase(),
          enabled: !!c?.enabled,
        }))
        .filter((c: CountryItem) => c.region && c.rate)
      // 补写版本号
      if (ver < SETTINGS_VERSION) this.save()
    }
  }

  save() {
    Storage.set(this.KEY, { version: SETTINGS_VERSION, countries: this.countries })
  }

  enabledCountries() {
    return this.countries.filter((i) => i.enabled)
  }

  async search(term: string, country = "cn", limit = 10, entity = "software") {
    const url =
      `${this.base}/search?term=${encodeURIComponent(term)}` +
      `&country=${country.toLowerCase()}&entity=${entity}&limit=${limit}&explicit=yes`
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new Error(`搜索失败 HTTP ${res.status} (${country})`)
    return await res.json()
  }

  /** Lookup；无结果时 results 为空数组，不抛错 */
  async lookup(appid: string, region: string) {
    const url = `${this.base}/${region.toLowerCase()}/lookup?id=${encodeURIComponent(appid)}`
    const res = await fetchWithTimeout(url)
    if (!res.ok) throw new Error(`Lookup 失败 HTTP ${res.status} (${region})`)
    const data = await res.json()
    if (!data || !Array.isArray(data.results)) {
      return { resultCount: 0, results: [] as ItunesAppResult[] }
    }
    return data as { resultCount: number; results: ItunesAppResult[] }
  }
}

export const itunes = new ITunes()
