import { getTemporaryFaviconUrl, toUrl } from "@/newtab/05-entities/dashboard/model/itemUtils";

type FaviconInfo = { faviconUrl: string; pathParts: string[] };

let cache = new Map<string, FaviconInfo[]>();
const MAX_SCORE = 2;

function compareParts(infoParts: string[], siteParts: string[]): number {
  const len = Math.min(infoParts.length, siteParts.length, MAX_SCORE);
  let i;
  for (i = 0; i < len; i++) {
    if (infoParts[i] !== siteParts[i]) return i;
  }
  return i;
}

function findInCache(siteUrl: string | URL, useFallback = true): string | undefined {
  const url = toUrl(siteUrl);
  if (!url?.host) return undefined;
  const infos = cache.get(url.host);
  if (!infos?.length) return useFallback ? getTemporaryFaviconUrl(url) : undefined;
  if (infos.length === 1) return infos[0].faviconUrl;

  const siteParts = url.pathname.split("/").filter((part) => part !== "");
  let bestMatchedInfo: FaviconInfo | undefined;
  let bestMatchedScore = 0;
  for (const info of infos) {
    const score = compareParts(info.pathParts, siteParts);
    if (score > bestMatchedScore) {
      bestMatchedScore = score;
      bestMatchedInfo = info;
      if (score === MAX_SCORE) break;
    }
  }
  return bestMatchedInfo?.faviconUrl ?? (useFallback ? getTemporaryFaviconUrl(url) : undefined);
}

function registerInCache(faviconUrl: string, siteUrl?: string | URL): void {
  const itemUrl = toUrl(siteUrl);
  if (!itemUrl?.host) return;
  const infos = cache.get(itemUrl.host) ?? [];
  if (!infos.some((info) => info.faviconUrl === faviconUrl)) {
    infos.push({
      faviconUrl,
      pathParts: itemUrl.pathname.split("/").filter((part) => part !== ""),
    });
    cache.set(itemUrl.host, infos);
  }
}

registerInCache("https://calendar.google.com/googlecalendar/images/favicons_2020q4/calendar_2.ico", "https://calendar.google.com/calendar/");
registerInCache("https://ssl.gstatic.com/ui/v1/icons/mail/rfr/gmail.ico", "https://mail.google.com/mail/");
registerInCache("https://ssl.gstatic.com/docs/spreadsheets/forms/favicon_qp2.png", "https://docs.google.com/forms/");
registerInCache("https://ssl.gstatic.com/docs/presentations/images/favicon-2023q4.ico", "https://docs.google.com/presentation/");
registerInCache("https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico", "https://docs.google.com/document/");

export const faviconsStorage = { findInCache, registerInCache };

export async function loadFaviconUrl(bookmarkUrl: string): Promise<string> {
  return findInCache(bookmarkUrl, true) ?? "";
}

let brokenImgSVG: string | undefined;

export function getBrokenImgSVG(): string {
  if (!brokenImgSVG) {
    const svg = document.querySelector("#non-loaded-icon")!;
    brokenImgSVG = `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))}`;
  }
  return brokenImgSVG;
}
