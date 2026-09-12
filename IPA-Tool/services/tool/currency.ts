// 货币代码到货币符号的映射对象
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", JPY: "¥", CNY: "¥", KRW: "₩",
  CAD: "C$", AUD: "A$", CHF: "CHF", SEK: "kr", NOK: "kr", DKK: "kr",
  PLN: "zł", CZK: "Kč", HUF: "Ft", RUB: "₽", TRY: "₺", ILS: "₪",
  AED: "د.إ", SAR: "﷼", QAR: "﷼", KWD: "د.ك", OMR: "﷼", BHD: ".د.ب",
  EGP: "£", MAD: "د.م.", TND: "د.ت", ZAR: "R", NGN: "₦", MXN: "$",
  BRL: "R$", ARS: "$", CLP: "$", COP: "$", PEN: "S/", UYU: "$U",
  PAB: "B/.", CRC: "₡", DOP: "RD$", PYG: "₲", BOB: "Bs.", VES: "Bs.S",
  ISK: "kr", INR: "₹", IDR: "Rp", THB: "฿", MYR: "RM", SGD: "S$",
  VND: "₫", PHP: "₱", HKD: "HK$", TWD: "NT$", MOP: "MOP$", NZD: "NZ$",
}

/** 将货币代码转换为货币符号。 */
export const currencyCodeToSymbol = (currencyCode: string): string => {
  if (!currencyCode) return ""
  const code = currencyCode.trim().toUpperCase()
  return CURRENCY_SYMBOLS[code] || code
}
