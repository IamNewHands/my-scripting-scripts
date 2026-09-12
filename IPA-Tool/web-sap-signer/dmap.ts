/** DMAP 标签及其原始负载。 */
export type DMapTag = {
  name: string
  payload: Uint8Array
}

export type DMapVisitor = (tag: DMapTag) => void

const MAX_DMAP_DEPTH = 16

const assertTagName = (name: string) => {
  if (name.length !== 4) throw new Error("DMAP tag must contain 4 characters")

  for (const character of name) {
    const code = character.charCodeAt(0)
    if (code < 0x20 || code > 0x7e) {
      throw new Error(`DMAP tag contains an invalid character: ${name}`)
    }
  }
}

const assertUint32 = (value: number) => {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) {
    throw new RangeError(`DMAP integer is outside uint32: ${value}`)
  }
}

const copyBytes = (value: Uint8Array) => new Uint8Array(value)

/** 编码一个 DMAP tag。长度和整数均使用大端序。 */
export const dmapTag = (name: string, payload?: Uint8Array): Uint8Array => {
  assertTagName(name)

  const content = payload ?? new Uint8Array()
  const result = new Uint8Array(8 + content.length)
  for (let index = 0; index < 4; index += 1) {
    result[index] = name.charCodeAt(index)
  }

  const length = content.length
  result[4] = (length >>> 24) & 0xff
  result[5] = (length >>> 16) & 0xff
  result[6] = (length >>> 8) & 0xff
  result[7] = length & 0xff
  result.set(content, 8)
  return result
}

export const dmapUint8 = (name: string, value: number): Uint8Array => {
  if (!Number.isInteger(value) || value < 0 || value > 0xff) {
    throw new RangeError(`DMAP integer is outside uint8: ${value}`)
  }
  return dmapTag(name, new Uint8Array([value]))
}

export const dmapUint32 = (name: string, value: number): Uint8Array => {
  assertUint32(value)
  return dmapTag(name, new Uint8Array([
    (value >>> 24) & 0xff,
    (value >>> 16) & 0xff,
    (value >>> 8) & 0xff,
    value & 0xff,
  ]))
}

export const dmapString = (name: string, value: string): Uint8Array => {
  const data = Data.fromRawString(value)
  if (!data) throw new Error("DMAP string cannot be converted to Data")

  const bytes = data.toUint8Array()
  if (!bytes) throw new Error("DMAP string cannot be converted to bytes")
  return dmapTag(name, bytes)
}

export const dmapConcat = (...parts: Uint8Array[]): Uint8Array => {
  const length = parts.reduce((total, part) => total + part.length, 0)
  const result = new Uint8Array(length)
  let offset = 0

  for (const part of parts) {
    result.set(part, offset)
    offset += part.length
  }

  return result
}

export const dmapText = (payload: Uint8Array): string => {
  const data = Data.fromArrayBuffer(payload.slice().buffer as ArrayBuffer)
  if (!data) throw new Error("DMAP payload cannot be converted to Data")
  return data.toRawString() ?? ""
}

export const dmapUintValue = (payload: Uint8Array, name: string) => {
  if (payload.length === 4) {
    return (
      payload[0] * 0x1000000 +
      payload[1] * 0x10000 +
      payload[2] * 0x100 +
      payload[3]
    )
  }
  if (payload.length === 8) return readUint64(payload, name)
  throw new Error(`DMAP tag ${name} has invalid integer length ${payload.length}`)
}

const readUint64 = (payload: Uint8Array, name: string) => {
  if (payload.length !== 8) {
    throw new Error(`DMAP tag ${name} has invalid uint64 length ${payload.length}`)
  }

  let value = 0
  for (const byte of payload) {
    value = value * 256 + byte
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new Error(`DMAP tag ${name} exceeds JavaScript safe integer range`)
    }
  }
  return value
}

/** 遍历 DMAP，容器 tag 和普通 tag 都会传给 visitor。 */
export const walkDMap = (
  data: Uint8Array,
  visitor: DMapVisitor,
  depth = 0,
): void => {
  if (depth > MAX_DMAP_DEPTH) throw new Error("DMAP nesting is too deep")

  for (let offset = 0; offset < data.length;) {
    if (data.length - offset < 8) {
      throw new Error(`truncated DMAP tag header at byte ${offset}`)
    }

    const name = String.fromCharCode(
      data[offset],
      data[offset + 1],
      data[offset + 2],
      data[offset + 3],
    )
    try {
      assertTagName(name)
    } catch {
      throw new Error(`invalid DMAP tag at byte ${offset}`)
    }
    const length = (
      data[offset + 4] * 0x1000000 +
      data[offset + 5] * 0x10000 +
      data[offset + 6] * 0x100 +
      data[offset + 7]
    )
    const start = offset + 8
    const end = start + length

    if (end > data.length) {
      throw new Error(`DMAP tag ${name} exceeds remaining response length`)
    }

    const tag: DMapTag = {
      name,
      payload: copyBytes(data.slice(start, end)),
    }
    visitor(tag)

    if (DMapContainers.has(name)) {
      walkDMap(tag.payload, visitor, depth + 1)
    }

    offset = end
  }
}

export const firstDMapUint = (
  data: Uint8Array,
  target: string,
): number | undefined => {
  let result: number | undefined

  walkDMap(data, tag => {
    if (result !== undefined || tag.name !== target) return

    result = dmapUintValue(tag.payload, target)
  })

  return result
}

export const DMapContainers = new Set([
  "adbs", "adsr", "aply", "avdb", "mbcl", "mccr", "mcty", "mdcl",
  "mlcl", "mlit", "mlog", "msrv", "mupd",
])
