import { useEffect, useObservable, type Color, type CommonViewProps } from "scripting";
import {
  getAppIconAsset,
  putAppIconAsset,
  updateAppIconAssetDominantColors,
} from "../modules/AppIconAssetDB";
import {
  AppIconAccentBackground,
  isUsableDominantColor,
  makeAppIconAccentColor,
} from "../components/AppIconStyle";

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
const pendingCache = new Map<string, Promise<CachedAppIconState>>();

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

  let dominantColors = parseCachedColors(cached.dominant_color);
  if (!dominantColors.length) {
    dominantColors = extractDominantColors(image);
    if (dominantColors.length) {
      await updateAppIconAssetDominantColors(iconUrl, dominantColors)
        .catch(() => {});
    }
  }

  return buildState(iconUrl, image, dominantColors);
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

const resolveCachedAppIcon = (iconUrl: string) => {
  const cached = memoryCache.get(iconUrl);
  if (cached) return Promise.resolve(cached);

  const pending = pendingCache.get(iconUrl);
  if (pending) return pending;

  const request = loadCachedAppIcon(iconUrl).then(state => {
    if (state.image && state.dominantColors.length) memoryCache.set(iconUrl, state);
    return state;
  }).finally(() => {
    if (pendingCache.get(iconUrl) === request) pendingCache.delete(iconUrl);
  });
  pendingCache.set(iconUrl, request);
  return request;
};

/** 清理已交给组件持有的图标内存；不影响 SQLite 缓存。 */
export const clearCachedAppIconMemory = (iconUrl?: string) => {
  if (iconUrl) {
    memoryCache.delete(iconUrl);
  } else {
    memoryCache.clear();
  }
};

/** 预先完成图标缓存和主色解析，供需要一次性展示完整卡片的页面使用。 */
export const preloadCachedAppIcon = (iconUrl: string) =>
  resolveCachedAppIcon(iconUrl).then(() => {
    clearCachedAppIconMemory(iconUrl);
  });

const initialState = (iconUrl?: string | null) => {
  const nextIconUrl = iconUrl ?? null;
  return nextIconUrl
    ? (memoryCache.get(nextIconUrl) ?? emptyState(nextIconUrl))
    : emptyState(null);
};

export const useCachedAppIcon = (iconUrl?: string | null): CachedAppIcon => {
  const state = useObservable<CachedAppIconState>(initialState(iconUrl));

  useEffect(() => {
    if (!iconUrl) return;

    let active = true;
    const cached = memoryCache.get(iconUrl);
    if (cached) {
      if (state.value !== cached) state.setValue(cached);
      clearCachedAppIconMemory(iconUrl);
      return () => {
        active = false;
        clearCachedAppIconMemory(iconUrl);
      };
    }

    resolveCachedAppIcon(iconUrl).then(nextState => {
      if (active) state.setValue(nextState);
      clearCachedAppIconMemory(iconUrl);
    });

    return () => {
      active = false;
      clearCachedAppIconMemory(iconUrl);
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
