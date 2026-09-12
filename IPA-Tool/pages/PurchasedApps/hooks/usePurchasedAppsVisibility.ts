import { AbortController, useEffect, useRef } from "scripting";
import { apiGetLookupApp } from "../../../services/api";
import type {
  PurchasedAppItem,
  PurchasedAppRegistryRef,
  PurchasedAppRequest,
  PurchasedAppSlot,
} from "../model/types";

const VISIBILITY_DEBOUNCE_MS = 300;
const PRELOAD_PADDING = 10;

const expandVisibleIndexes = (indexes: number[], itemCount: number) => {
  if (!indexes.length || itemCount === 0) return new Set<number>();

  const first = Math.max(0, Math.min(...indexes) - PRELOAD_PADDING);
  const last = Math.min(itemCount - 1, Math.max(...indexes) + PRELOAD_PADDING);
  const expanded = new Set<number>();
  for (let index = first; index <= last; index += 1) expanded.add(index);
  return expanded;
};

/** 管理扩展可视范围内的请求，并向已挂载卡片分发对应 Promise。 */
export function usePurchasedAppsVisibility(
  items: PurchasedAppItem[],
  country: string
) {
  const registryRef = useRef({}) as PurchasedAppRegistryRef;
  const visibleIndexesRef = useRef<number[]>([]);
  const activeIndexesRef = useRef<Set<number>>(new Set());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getSlot = (index: number, appId: string) => {
    const current = registryRef.current[index];
    if (current?.appId === appId && current.country === country) return current;

    current?.request?.cancel();
    const slot: PurchasedAppSlot = {
      appId,
      country,
      active: false,
      loaded: false,
    };
    registryRef.current[index] = slot;
    return slot;
  };

  const start = (index: number) => {
    const item = items[index];
    if (!item || !country) return;

    const appId = item.id;
    const slot = getSlot(index, appId);
    slot.active = true;
    if (!slot.start) slot.start = () => start(index);
    if (slot.loaded || slot.request) return;

    const controller = new AbortController();
    const request: PurchasedAppRequest = {
      appId,
      country,
      promise: Promise.resolve(null),
      cancelled: false,
      cancel: () => {},
    };
    request.promise = apiGetLookupApp(appId, country, controller.signal).then(
      data => {
        if (request.cancelled) return null;
        return data;
      }
    );
    request.cancel = () => {
      if (request.cancelled) return;
      request.cancelled = true;
      controller.abort();
    };
    slot.request = request;
    slot.accept?.(request);

    request.promise
      .then(() => {
        if (request.cancelled || slot.request !== request) return;
        slot.request = undefined;
      })
      .catch(() => {
        if (slot.request === request) slot.request = undefined;
      });
  };

  const stop = (index: number) => {
    const slot = registryRef.current[index];
    if (!slot) return;

    slot.active = false;
    slot.request?.cancel();
    slot.request = undefined;
    if (!slot.accept) delete registryRef.current[index];
  };

  const onVisibilityChange = (ids: string[] | number[]) => {
    // Tab 切走时系统会短暂报告空数组，不应因此清空已加载卡片。
    if (!ids.length) return;

    const indexes = ids.map(Number);
    visibleIndexesRef.current = indexes;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const next = expandVisibleIndexes(
        visibleIndexesRef.current,
        items.length
      );
      const previous = activeIndexesRef.current;

      previous.forEach(index => {
        if (!next.has(index)) stop(index);
      });
      next.forEach(start);
      activeIndexesRef.current = next;
    }, VISIBILITY_DEBOUNCE_MS);
  };

  useEffect(() => {
    if (items.length) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    visibleIndexesRef.current = [];
    Object.values(registryRef.current).forEach(slot => slot?.request?.cancel());
    registryRef.current = {};
    activeIndexesRef.current = new Set();
  }, [items.length]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      Object.values(registryRef.current).forEach(slot =>
        slot?.request?.cancel()
      );
      registryRef.current = {};
      activeIndexesRef.current = new Set();
    },
    []
  );

  return { registryRef, onVisibilityChange };
}
