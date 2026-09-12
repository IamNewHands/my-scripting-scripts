export const PLATFORM = {
  IOS: "itunes",
  TV: "atv9",
} as const;

export type Platform = (typeof PLATFORM)[keyof typeof PLATFORM];

export const DEFAULT_STORE_REGION = "CN";

export type Store = {
  platform: Platform;
  country: string;
};
