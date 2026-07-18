import { build } from "./plist-complete.js"
import { parseBinary, parseXML } from "../../../utils/plist-parser"

export type PlistValue =
  | string
  | number
  | boolean
  | Date
  | Uint8Array
  | ArrayBuffer
  | PlistValue[]
  | { [key: string]: PlistValue | undefined }
  | null

const parse = (input: string | Uint8Array | ArrayBuffer) => {
  if (typeof input === "string") return parseXML(input)
  const data = input instanceof Uint8Array ? input : new Uint8Array(input)
  const header = String.fromCharCode(...data.slice(0, 8))
  return header.startsWith("bplist") ? parseBinary(data) : parseXML(new TextDecoder().decode(data))
}

export const plist = {
  build: build as (obj: unknown, options?: { format?: "xml" | "binary"; pretty?: boolean; indent?: string }) => string | Uint8Array,
  parse,
}
