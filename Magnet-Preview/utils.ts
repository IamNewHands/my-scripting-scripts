import { FavoriteItem, HistoryItem, WhatsLinkResponse } from "./types";

const FAVORITES_KEY = "magnet-preview-favorites-v1";

export function loadFavorites(): FavoriteItem[] {
  return Storage.get<FavoriteItem[]>(FAVORITES_KEY) ?? [];
}

export function persistFavorites(items: FavoriteItem[]) {
  Storage.set(FAVORITES_KEY, items);
}

export function normalizeInput(input: string) {
  return input.trim().replace(/^\s+|\s+$/g, "");
}

export function extractSupportedLink(input: string) {
  const text = normalizeInput(input);
  if (!text) return "";

  const magnet = text.match(/magnet:\?[^\s\u4e00-\u9fff，。；、！？）)】\]]+/i)?.[0];
  if (magnet) return magnet;

  const ed2k = text.match(/ed2k:\/\/[^\s\u4e00-\u9fff，。；、！？）)】\]]+/i)?.[0];
  if (ed2k) return ed2k;

  const http = text.match(/https?:\/\/[^\s\u4e00-\u9fff，。；、！？）)】\]]+/i)?.[0];
  if (http) return http;

  return text;
}

export function isSupportedLink(input: string) {
  const text = extractSupportedLink(input).toLowerCase();
  return text.startsWith("magnet:?") || text.startsWith("ed2k://") || text.startsWith("http://") || text.startsWith("https://");
}

export function formatBytes(bytes?: number) {
  if (!bytes || bytes <= 0) return "未知";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 2)} ${units[index]}`;
}

export function shortLink(url: string) {
  if (url.length <= 72) return url;
  return `${url.slice(0, 44)}…${url.slice(-24)}`;
}

export function displayFileType(result?: WhatsLinkResponse | null) {
  if (!result) return "-";
  return (result.file_type || result.type || "unknown").toUpperCase();
}

export function extractFanhao(input: string) {
  const text = decodeHtml(input).trim().toUpperCase();
  if (!text) return "";

  const normalized = text.replace(/[\s_]+/g, "-");
  const patterns = [
    /(?:FC2-PPV-\d{5,8})/i,
    /(?:[A-Z]{2,6}-?\d{2,5}[A-Z]?)/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern)?.[0] ?? "";
    if (match) return match.replace(/^(?:FC2-PPV|[A-Z]{2,6})-?/, (prefix) => prefix.replace(/-?$/, "-"));
  }

  return "";
}

export function buildMissavSearchUrl(fanhao: string) {
  return `https://missav123.com/search/${encodeURIComponent(fanhao)}`;
}

export function getCover(result?: WhatsLinkResponse | null, index = 0) {
  const shots = result?.screenshots ?? [];
  return shots[index]?.screenshot || shots[0]?.screenshot || "";
}

export function decodeHtml(input: string) {
  return input
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function stripHtml(input: string) {
  return decodeHtml(input.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

export function absoluteXciliUrl(href: string) {
  if (/^https?:\/\//i.test(href)) return href;
  const base = "https://xcili.net";
  return `${base}${href.startsWith("/") ? href : `/${href}`}`;
}

export function extractPureMagnetLink(input: string) {
  const text = decodeHtml(input).trim();
  const candidates = [text];
  try {
    candidates.push(decodeURIComponent(text));
  } catch {
    // Ignore malformed percent-encoding.
  }

  for (const candidate of candidates) {
    const btih = candidate.match(/magnet:\?xt=urn:btih:[0-9A-Za-z]{32,40}/i)?.[0] ?? "";
    if (btih) return btih;
  }
  return "";
}

export function isPlayableUrl(url: string): boolean {
  return url.length > 0;
}

export const HISTORY_KEY = "magnet-preview-history-v1";

export function loadHistory(): HistoryItem[] {
  return Storage.get<HistoryItem[]>(HISTORY_KEY) ?? [];
}

export function saveHistory(items: HistoryItem[]) {
  // 只保留最近 20 条
  Storage.set(HISTORY_KEY, items.slice(0, 20));
}

export function addHistory(url: string, name: string) {
  const items = loadHistory();
  // 去重：如果已存在相同 URL，移到最前面
  const filtered = items.filter((item) => item.url !== url);
  const newItem: HistoryItem = { url, name: name || url, timestamp: Date.now() };
  saveHistory([newItem, ...filtered]);
}
