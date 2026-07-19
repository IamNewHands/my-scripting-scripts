import { fetch } from "scripting";

export async function getAppInfo(appid: string, region: string) {
  const { results } = await fetch(`https://itunes.apple.com/${region}/lookup?id=${appid}`).then(
    (res) => res.json()
  );
  return results[0];
}
