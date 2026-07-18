const get = (key: string) => Storage.get(key) as string | null ?? null

function getJson<T>(key: string, alt?: T) {
  try {
    const raw = get(key)
    return raw == null ? alt : JSON.parse(raw) as T
  } catch {
    return alt
  }
}

const set = (key: string, value: string | null) => {
  if (value == null) {
    Storage.remove(key)
    return
  }
  Storage.set(key, value)
}

export const $cache = {
  get,
  getJson,
  set,
  setJson: (key: string, obj: unknown) => set(key, JSON.stringify(obj)),
  remove: (key: string) => Storage.remove(key),
}
