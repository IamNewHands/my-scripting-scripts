declare const fetch: any;

import { WhatsLinkResponse, XciliSearchItem, XciliDetailInfo } from "./types";
import { decodeHtml, stripHtml, absoluteXciliUrl, extractPureMagnetLink } from "./utils";

const API_ENDPOINT = "https://whatslink.info/api/v1/link";
const XCILI_BASE = "https://xcili.net";

export async function queryWhatsLink(url: string): Promise<WhatsLinkResponse> {
  const res = await fetch(`${API_ENDPOINT}?url=${encodeURIComponent(url)}`, { timeout: 10 });
  if (!res.ok) throw new Error(`接口请求失败：HTTP ${res.status}`);
  const json = (await res.json()) as WhatsLinkResponse;
  if (json.error) throw new Error(json.error);
  return json;
}

export function parseXciliSearchResults(html: string): XciliSearchItem[] {
  const rows = [...html.matchAll(/<tr>[\s\S]*?<a\s+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>[\s\S]*?<td[^>]*class=["'][^"']*td-size[^"']*["'][^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)];
  return rows.map((match, index) => {
    const body = match[2] ?? "";
    const sampleMatch = body.match(/<p[^>]*class=["'][^"']*sample[^"']*["'][^>]*>([\s\S]*?)<\/p>/i);
    const titleHtml = sampleMatch ? body.replace(sampleMatch[0], "") : body;
    const detailUrl = absoluteXciliUrl(match[1] ?? "");
    return {
      id: `${index}-${detailUrl}`,
      title: stripHtml(titleHtml) || "未命名资源",
      sample: stripHtml(sampleMatch?.[1] ?? ""),
      size: stripHtml(match[3] ?? "未知"),
      detailUrl,
    };
  });
}

export async function searchXcili(keyword: string): Promise<XciliSearchItem[]> {
  const q = keyword.trim();
  if (!q) return [];
  const res = await fetch(`${XCILI_BASE}/search?q=${encodeURIComponent(q)}`, { timeout: 12 });
  if (!res.ok) throw new Error(`搜索失败：HTTP ${res.status}`);
  return parseXciliSearchResults(await res.text());
}

export async function fetchXciliMagnet(detailUrl: string) {
  const detail = await fetchXciliDetail(detailUrl);
  if (!detail.magnet) throw new Error("详情页未找到磁力链接");
  return detail.magnet;
}

export function parseXciliDetail(html: string): XciliDetailInfo {
  const title = stripHtml(html.match(/<h2[^>]*>([\s\S]*?)<\/h2>/i)?.[1] ?? "资源详情") || "资源详情";
  const magnet = extractPureMagnetLink(html);
  const fileSection = html.split(/<h4[^>]*>\s*相关资源\s*:/i)[0] ?? html;
  const files = [...fileSection.matchAll(/<tr>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<td[^>]*>([\s\S]*?)<\/td>[\s\S]*?<\/tr>/gi)]
    .map((match) => ({ name: stripHtml(match[1] ?? ""), size: stripHtml(match[2] ?? "") }))
    .filter((file) => file.name && file.size);
  return { title, magnet, files };
}

export async function fetchXciliDetail(detailUrl: string): Promise<XciliDetailInfo> {
  const res = await fetch(detailUrl, { timeout: 12 });
  if (!res.ok) throw new Error(`获取详情失败：HTTP ${res.status}`);
  return parseXciliDetail(await res.text());
}