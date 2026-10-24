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
  if (!itemUrl?.host || !faviconUrl) return;
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

export function getChromeFaviconUrl(
  pageUrl: string,
  size = 32,
): string {
  const url = toUrl(pageUrl);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return "";
  const faviconUrl = new URL(chrome.runtime.getURL("/_favicon/"));
  faviconUrl.searchParams.set("pageUrl", url.toString());
  faviconUrl.searchParams.set("size", String(size));
  return faviconUrl.toString();
}

const faviconTimeoutMs = 5000;
type FaviconTab = { url?: string; favIconUrl?: string };

export function normalizeFaviconPageUrl(value?: string): string | undefined {
  const url = toUrl(value);
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) return undefined;
  return url.href;
}

export function verifyFaviconUrl(src: string): Promise<boolean> {
  if (!src || !/^(https?:|data:image\/|chrome-extension:)/i.test(src)) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    const finish = (loaded: boolean) => {
      clearTimeout(timeout);
      img.onload = null;
      img.onerror = null;
      if (!loaded) img.removeAttribute("src");
      resolve(loaded);
    };
    const timeout = setTimeout(() => finish(false), faviconTimeoutMs);
    img.referrerPolicy = "no-referrer";
    img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0);
    img.onerror = () => finish(false);
    img.src = src;
  });
}

async function readChromeFavicon(pageUrl: string): Promise<Uint8Array | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), faviconTimeoutMs);
  try {
    // Перечитываем локальный endpoint, не запрашивая доступ ко всем сайтам
    const response = await fetch(getChromeFaviconUrl(pageUrl), {
      cache: "reload",
      signal: controller.signal,
    });
    if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) return undefined;
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes.length > 0 && bytes.length <= 256 * 1024 ? bytes : undefined;
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

export function createFaviconResolver(tabs: FaviconTab[] = []) {
  const checks = new Map<string, Promise<boolean>>();
  const chromeIcons = new Map<string, Promise<string | undefined>>();
  const tabIcons = new Map<string, string[]>();
  let defaultIcon: Promise<Uint8Array | undefined> | undefined;
  for (const tab of tabs) {
    const pageUrl = normalizeFaviconPageUrl(tab.url);
    if (pageUrl && tab.favIconUrl) {
      tabIcons.set(pageUrl, [...(tabIcons.get(pageUrl) ?? []), tab.favIconUrl]);
    }
  }

  function verify(src: string) {
    if (!checks.has(src)) checks.set(src, verifyFaviconUrl(src));
    return checks.get(src)!;
  }

  async function loadChromeIcon(pageUrl: string): Promise<string | undefined> {
    // Chrome возвращает стандартный значок даже при отсутствии favicon
    defaultIcon ??= readChromeFavicon("https://tablo-favicon-unavailable.invalid/");
    const [bytes, placeholder] = await Promise.all([readChromeFavicon(pageUrl), defaultIcon]);
    if (!bytes || !placeholder) return undefined;
    if (bytes.length === placeholder.length && bytes.every((value, index) => value === placeholder[index])) return undefined;
    const dataUrl = `data:image/png;base64,${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""))}`;
    return await verify(dataUrl) ? dataUrl : undefined;
  }

  return async (bookmarkUrl: string, storedIcon = ""): Promise<string | undefined> => {
    const pageUrl = normalizeFaviconPageUrl(bookmarkUrl);
    if (!pageUrl) return undefined;
    for (const src of tabIcons.get(pageUrl) ?? []) {
      if (await verify(src)) return src;
    }
    if (!chromeIcons.has(pageUrl)) chromeIcons.set(pageUrl, loadChromeIcon(pageUrl));
    const chromeIcon = await chromeIcons.get(pageUrl);
    if (chromeIcon) return chromeIcon;
    const candidates = [storedIcon, getTemporaryFaviconUrl(pageUrl)];
    for (const src of candidates) {
      // Старый endpoint может содержать ID другой установки или стандартный значок
      if (src && !src.includes("/_favicon/") && await verify(src)) return src;
    }
    return undefined;
  };
}

export function loadFaviconUrl(bookmarkUrl: string, tabs: FaviconTab[] = []): Promise<string | undefined> {
  return createFaviconResolver(tabs)(bookmarkUrl);
}

let brokenImgSVG: string | undefined;

export function getBrokenImgSVG(): string {
  if (!brokenImgSVG) {
    const svg = document.querySelector("#non-loaded-icon")!;
    brokenImgSVG = `data:image/svg+xml;base64,${btoa(new XMLSerializer().serializeToString(svg))}`;
  }
  return brokenImgSVG;
}
