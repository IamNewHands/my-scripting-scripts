import { fetchWithTimeout } from "../util/http"
import { parseHTML } from "../module/linkedom"

export type InAppItem = {
  membership: string
  price: string
}

class Web {
  private ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

  /**
   * 抓取 App Store 商品页内购列表。
   * 失败返回空数组，不向上抛（避免拖垮多区详情）。
   * host 固定为 apps.apple.com，无 SSRF 面。
   */
  async price(id: string, region: string): Promise<{ inapp: InAppItem[] }> {
    try {
      // 只允许 apps.apple.com
      const host = "apps.apple.com"
      const url = `https://${host}/${region.toLowerCase()}/app/id${id}`
      const res = await fetchWithTimeout(url, {
        headers: {
          "User-Agent": this.ua,
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        },
        // 网页体积大，适当延长内购抓取超时
        timeout: 12,
      })
      if (!res.ok) return { inapp: [] }
      const html = await res.text()
      if (!html || html.length < 200) return { inapp: [] }

      const { document } = parseHTML(html)
      const nodes = Array.from(document.querySelectorAll(".text-pair"))
      const inapp: InAppItem[] = []
      for (const e of nodes as any[]) {
        const spans = e.querySelectorAll?.("span")
        if (!spans || spans.length < 2) continue
        const membership = String(spans[0]?.textContent || "").trim()
        const price = String(spans[1]?.textContent || "").trim()
        if (!membership && !price) continue
        inapp.push({ membership, price })
      }
      return { inapp }
    } catch {
      return { inapp: [] }
    }
  }
}

export const web = new Web()
