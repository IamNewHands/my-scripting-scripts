export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B"
  if (bytes < 1024) return `${Math.round(bytes)} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

export function formatSpeed(bytesPerSecond?: number): string {
  if (bytesPerSecond == null || !Number.isFinite(bytesPerSecond) || bytesPerSecond <= 0) return ""
  return `${formatBytes(bytesPerSecond)}/s`
}

export function formatEta(seconds?: number): string {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return ""
  const total = Math.round(seconds)
  if (total < 60) return `约 ${total}s`
  const m = Math.floor(total / 60)
  const s = total % 60
  if (m < 60) return `约 ${m}分${s.toString().padStart(2, "0")}秒`
  const h = Math.floor(m / 60)
  const mm = m % 60
  return `约 ${h}小时${mm}分`
}

export function formatProgressDetail(progress: {
  downloadedBytes?: number
  totalBytes?: number
  speed?: number
  eta?: number
}): string {
  const parts: string[] = []
  if (progress.downloadedBytes != null && progress.totalBytes != null && progress.totalBytes > 0) {
    parts.push(`${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)}`)
  } else if (progress.downloadedBytes != null && progress.downloadedBytes > 0) {
    parts.push(formatBytes(progress.downloadedBytes))
  }
  const speed = formatSpeed(progress.speed)
  if (speed) parts.push(speed)
  const eta = formatEta(progress.eta)
  if (eta) parts.push(eta)
  return parts.join(" · ")
}

