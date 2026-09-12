import type { PlistValue } from "../../utils/plist"

export type AppleAppInfoSong = {
  songId: string | number
  URL: string
  "artwork-urls": {
    default: {
      url: string
    }
  }
  sinfs: Array<{
    sinf: PlistValue
  }>
  "asset-info": {
    "file-size": number
  }
  metadata: AppleAppMetadata
}

export type AppleAppMetadata = {
  bundleDisplayName: string
  softwareVersionBundleId: string
  bundleShortVersionString: string
  bundleVersion: string
  softwareVersionExternalIdentifier: string | number
  softwareVersionExternalIdentifiers?: Array<string | number>
  "software-platform"?: string
  rating: {
    label: string
  }
  [key: string]: PlistValue | undefined
}

export type AppleAppInfoResponse = {
  metrics?: {
    currency?: string
  }
  failureType?: string
  customerMessage?: string
  songList?: AppleAppInfoSong[]
  [key: string]: PlistValue | undefined
}

export type AppleAppInfoResponseWithData = AppleAppInfoResponse & {
  metrics: { currency: string }
  songList: NonNullable<AppleAppInfoResponse["songList"]>
}

export type ApplePurchaseResponse = {
  failureType?: string
  jingleDocType?: string
}

export type ThirdPartyVersionItem = {
  external_identifier: string | number
  bundle_version: string | number
}

export type BilinVersionResponse = {
  data: ThirdPartyVersionItem[]
}
