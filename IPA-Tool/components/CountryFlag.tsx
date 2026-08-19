import { Image, Text } from "scripting"

// 台湾地区旗帜：iOS 不绘制台湾地区旗帜 emoji（显示空白），这里用真实旗帜图 base64 内嵌，离线可用
const TAIWAN_FLAG_B64 = "iVBORw0KGgoAAAANSUhEUgAAAFAAAAA1CAMAAADh9px2AAAAP1BMVEX+AAAAAJT///9+AEpcXLsVFZ2IiM2/v+SYmNTd3fGmptoGBpZGRrFtbcLy8vo2NqsnJ6S0tODNzep6eseAAUuSmwktAAAA40lEQVRYw+2Vy47DIAxFE9fGmGdI+v/fWtKhI7WrqPZmNBzJgrA4iq8sWNaLLFf5k0IiQ2HshTg2FkLXRd53n7MSclxF1shWwgq8tUYM1UC45W2Nko8Qjizx+an8QwRxuUCnZCeA+pYREH4o+O77NsPUhhBassiwuf0l3F3TZphCgZ7cQByUkLQtV+TflrEaZEjBv4Q+kF5IO/hh7OtOWiFxQHJeShHvCQOTVngWcEJMDDQOlHMYEVKEEtPHWH9/OZyTwnzOkNVt0+s4xsbqCaj13716OuH9do1lMplMJpPJxJwHsl0KN0b9RbUAAAAASUVORK5CYII="

export default function CountryFlag({
  value,
  size = 22,
  fallbackFont = 14,
}: {
  value?: string
  size?: number
  fallbackFont?: number
}) {
  // value === "TW"（台湾）时显示旗帜图片，其余地区仍为 emoji/文本
  if (value === "TW") {
    const data = Data.fromBase64String(TAIWAN_FLAG_B64)
    const image = data ? UIImage.fromData(data) : null
    if (image) {
      return (
        <Image
          image={image}
          resizable
          frame={{ width: size, height: Math.round(size * 0.6) }}
          clipShape={{ type: "rect", cornerRadius: 3, style: "continuous" }}
        />
      )
    }
    return <Text font={fallbackFont}>TW</Text>
  }
  if (!value) return <Text font={fallbackFont}>🌐</Text>
  return <Text font={fallbackFont}>{value}</Text>
}
