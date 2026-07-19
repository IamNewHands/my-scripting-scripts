import { fetchWithTimeout } from "../util/http"

class Rate {
  private KEY = "RATE_TYPE"
  type: string = String(Storage.get(this.KEY) || "CNY")
  private rates: Record<string, number> | undefined = undefined
  private ready = false
  private inflight: Promise<void> | null = null

  private async fetchRates(type: string) {
    const res = await fetchWithTimeout(`https://api.exchangerate-api.com/v4/latest/${type}`)
    if (!res.ok) throw new Error(`汇率接口 HTTP ${res.status}`)
    return await res.json()
  }

  async init(type = this.type) {
    if (this.inflight) return this.inflight
    this.inflight = (async () => {
      try {
        const data = await this.fetchRates(type)
        this.rates = data?.rates || {}
        this.ready = true
      } catch {
        this.rates = {}
        this.ready = false
      } finally {
        this.inflight = null
      }
    })()
    return this.inflight
  }

  /** 取相对基准货币的汇率；不可用时返回 null */
  async getRate(type: string): Promise<number | null> {
    if (!this.ready) await this.init()
    return this.getRateSync(type)
  }

  getRateSync(type: string): number | null {
    if (!this.ready || !this.rates) return null
    const v = this.rates[String(type || "").toUpperCase()]
    if (typeof v !== "number" || !isFinite(v) || v <= 0) return null
    return v
  }

  setType(type: string) {
    this.type = type
    Storage.set(this.KEY, type)
    this.ready = false
    this.rates = undefined
  }
}

export const rates = new Rate()
