import { useEffect, useObservable, type Color, type CommonViewProps } from "scripting";
import { getAppIconAsset, putAppIconAsset } from "../modules/AppIconAssetDB";
import {
  AppIconAccentBackground,
  isUsableDominantColor,
  makeAppIconAccentColor,
} from "./appIconStyle";

export type CachedAppIconState = {
  iconUrl: string | null;
  image: UIImage | null;
  dominantColors: RGBAColor[];
  accentColor?: Color;
  background?: CommonViewProps["background"];
};

export type CachedAppIcon = Omit<CachedAppIconState, "iconUrl">;

const emptyState = (iconUrl: string | null = null): CachedAppIconState => ({
  iconUrl,
  image: null,
  dominantColors: [],
  accentColor: undefined,
  background: undefined,
});

const memoryCache = new Map<string, CachedAppIconState>();
const pendingTasks = new Map<string, Promise<CachedAppIconState>>();
// 内存里缓存 UIImage，限制条目避免列表滑动时无限涨
const MAX_MEMORY_ICON_CACHE = 40;

const putMemoryCache = (iconUrl: string, state: CachedAppIconState) => {
  if (memoryCache.has(iconUrl)) memoryCache.delete(iconUrl);
  memoryCache.set(iconUrl, state);
  while (memoryCache.size > MAX_MEMORY_ICON_CACHE) {
    const oldest = memoryCache.keys().next().value;
    if (oldest == null) break;
    memoryCache.delete(oldest);
  }
};

const parseCachedColors = (raw?: string | null) => {
  if (!raw) return [] as RGBAColor[];
  try {
    const parsed = JSON.parse(raw) as RGBAColor | RGBAColor[];
    return (Array.isArray(parsed) ? parsed : [parsed]).filter(
      color => typeof color?.hex === "string"
    );
  } catch {
    return [] as RGBAColor[];
  }
};

const extractDominantColors = (image: UIImage) => {
  try {
    const dominantColors = (
      image as UIImage & {
        dominantColors?: (count?: number) => DominantColor[];
      }
    ).dominantColors;
    if (typeof dominantColors !== "function") return [];

    return dominantColors
      .call(image, 8)
      .filter(isUsableDominantColor)
      .map(item => item.color);
  } catch {
    return [];
  }
};

const buildState = (
  iconUrl: string,
  image: UIImage | null,
  dominantColors: RGBAColor[] = []
): CachedAppIconState => ({
  iconUrl,
  image,
  dominantColors,
  accentColor: dominantColors.length
    ? makeAppIconAccentColor(dominantColors)
    : undefined,
  background: dominantColors.length ? (
    <AppIconAccentBackground colors={dominantColors} />
  ) : undefined,
});

const readCachedState = async (iconUrl: string) => {
  const cached = await getAppIconAsset(iconUrl);
  if (!cached?.image) return null;

  const image = UIImage.fromData(cached.image);
  if (!image) return null;

  return buildState(iconUrl, image, parseCachedColors(cached.dominant_color));
};

const loadCachedAppIcon = async (
  iconUrl: string
): Promise<CachedAppIconState> => {
  const cached = await readCachedState(iconUrl);
  if (cached) return cached;

  try {
    const image = await UIImage.fromURL(iconUrl);
    if (!image) return buildState(iconUrl, null);

    const dominantColors = extractDominantColors(image);
    await putAppIconAsset({
      iconUrl,
      image: image.toPNGData(),
      dominantColors,
    }).catch(() => {});

    return buildState(iconUrl, image, dominantColors);
  } catch {
    return buildState(iconUrl, null);
  }
};

const resolveCachedAppIcon = (iconUrl: string): Promise<CachedAppIconState> => {
  const cached = memoryCache.get(iconUrl);
  if (cached) return Promise.resolve(cached);

  const pending = pendingTasks.get(iconUrl);
  if (pending) return pending;

  const task = loadCachedAppIcon(iconUrl)
    .then(state => {
      if (state.image && state.dominantColors.length) {
        putMemoryCache(iconUrl, state);
      }
      return state;
    })
    .finally(() => {
      pendingTasks.delete(iconUrl);
    });

  pendingTasks.set(iconUrl, task);
  return task;
};

const initialState = (iconUrl?: string | null) => {
  const nextIconUrl = iconUrl ?? null;
  return nextIconUrl
    ? (memoryCache.get(nextIconUrl) ?? emptyState(nextIconUrl))
    : emptyState(null);
};

export const useCachedAppIcon = (iconUrl?: string | null): CachedAppIcon => {
  const state = useObservable<CachedAppIconState>(initialState(iconUrl));

  useEffect(() => {
    const nextIconUrl = iconUrl ?? null;
    if (!nextIconUrl) {
      state.setValue(emptyState(null));
      return;
    }

    if (state.value.iconUrl === nextIconUrl && state.value.image) return;

    let cancelled = false;
    state.setValue(emptyState(nextIconUrl));

    resolveCachedAppIcon(nextIconUrl).then(nextState => {
      if (!cancelled) state.setValue(nextState);
    });

    return () => {
      cancelled = true;
    };
  }, [iconUrl]);

  const current = state.value;
  const isCurrentIcon = current.iconUrl === (iconUrl ?? null);
  return isCurrentIcon
    ? {
      image: current.image,
      dominantColors: current.dominantColors,
      accentColor: current.accentColor,
      background: current.background,
    }
    : emptyState();
};
