import { AbortController } from "scripting";
import { debounce } from "../../utils";
import type { AppinfoResponse } from "../../types/appStore";
import { localApi } from "../appleStore";

interface ApiGetAppInfoOptions {
  signal?: AbortController["signal"]
}

const fetchAppInfo = async (
  id: string,
  appVerId?: string,
  options?: ApiGetAppInfoOptions
) => {
  if (options?.signal?.aborted) throw new Error("请求已取消");
  const { success, data, error } = await localApi<AppinfoResponse>(`/apps/${id}`, {
    method: "GET",
    query: { appVerId },
  });

  if (!success || !data || error) {
    throw new Error(error || "获取应用下载信息失败, 官方数据源");
  }

  return data;
}

const debouncedGetAppInfo = debounce(fetchAppInfo, 300)

export function apiGetAppInfo(id: string, appVerId?: string): ReturnType<typeof debouncedGetAppInfo>
export function apiGetAppInfo(id: string, appVerId: string | undefined, options: ApiGetAppInfoOptions): ReturnType<typeof fetchAppInfo>
export function apiGetAppInfo(
  id: string,
  appVerId?: string,
  options?: ApiGetAppInfoOptions
) {
  return options ? fetchAppInfo(id, appVerId, options) : debouncedGetAppInfo(id, appVerId)
}
