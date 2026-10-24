import HistoryItem = chrome.history.HistoryItem;
import { faviconsStorage } from "./favicons";

export const miroHashRegExp = /\/board\/([^/?]+)/;
export const jiraHashRegExp = /\/browse\/([^/?]+)/;
export const confluenceHashRegExp = /\/pages\/([^/?]+)/;
export const googleDocHashRegExp = /\/document\/d\/([^/]+)/;
export const googlePresentationHashRegExp = /\/presentation\/d\/([^/]+)/;
export const googleFormsHashRegExp = /\/forms\/d\/([^/]+)/;
export const googleSpreadsheetsHashRegExp = /\/spreadsheets\/d\/([^/]+)/;
export const figmaDesignHashRegExp = /\/design\/([^/]+)/;
export const figmaSlidesRegExp = /\/slides\/([^/]+)/;
export const figmaBoardRegExp = /\/board\/([^/]+)/;
export const youtubeHashRegExp = /[?&]v=([^&]+)/;
export const githubPRHashRegExp = /\/pull\/(\d+)/;
export const loomHashRegExp = /\/share\/([^/?]+)/;

export function hashGetterFactory(regexes: RegExp[]): (url: string) => string {
  return (url) => {
    let res = "";
    regexes.some((regex) => {
      const match = url.match(regex);
      if (match?.[1]) {
        res = match[1];
        return true;
      }
      return false;
    });
    return res;
  };
}

export function getCleanMiroTitle(title: string): string {
  return title.endsWith("- Miro") ? title.slice(0, -7) : title;
}

export function getCleanTitle(title: string): string {
  return title;
}

export type RecentFilter = {
  title: string;
  icon?: string;
  pattern: string;
  getHash: (url: string) => string;
  cleanTitle: (title: string) => string;
  enabled?: boolean;
};

export type RecentItem = {
  id: number;
  isRecent: boolean;
  favIconUrl: string;
  title?: string;
  url?: string;
  lastVisitTime?: number;
  visitCount?: number;
};

export type WeeklyHistoryItem = RecentItem & {
  url: string;
  title: string;
  visitsLast7Days: number;
  lastVisitTime: number;
};

export async function getWeeklyHistoryUsage(signal?: AbortSignal): Promise<WeeklyHistoryItem[]> {
  const endTime = Date.now();
  const startTime = endTime - 7 * 24 * 60 * 60 * 1000;
  const history = await new Promise<HistoryItem[]>((resolve, reject) => {
    chrome.history.search({ text: "", startTime, endTime, maxResults: 10000 }, (items) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message ?? "Unable to load browsing history"));
        return;
      }
      resolve(items);
    });
  });
  const candidates = mapHistoryToRecentAndFilterIrrelevant(history).filter((item) => {
    try {
      const url = new URL(item.url!);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  });
  const result: WeeklyHistoryItem[] = [];
  let nextIndex = 0;
  let stopped = false;

  async function loadVisits() {
    while (!stopped && !signal?.aborted && nextIndex < candidates.length) {
      const item = candidates[nextIndex++];
      const visits = await new Promise<chrome.history.VisitItem[]>((resolve, reject) => {
        chrome.history.getVisits({ url: item.url! }, (items) => {
          const error = chrome.runtime.lastError;
          if (error) {
            reject(new Error(error.message ?? "Unable to load page visits"));
            return;
          }
          resolve(items);
        });
      });
      const visitTimes = visits
        .map((visit) => visit.visitTime)
        .filter((time): time is number => time !== undefined && time >= startTime && time <= endTime);
      if (visitTimes.length === 0) continue;

      result.push({
        ...item,
        url: item.url!,
        title: item.title!,
        visitsLast7Days: visitTimes.length,
        lastVisitTime: visitTimes.reduce((latest, time) => Math.max(latest, time), 0),
      });
    }
  }

  await Promise.all(Array.from({ length: Math.min(8, candidates.length) }, () => loadVisits()))
    .catch((error) => {
      stopped = true;
      throw error;
    });
  return result;
}

export function getFilteredRecentItems(
  historyItems: RecentItem[],
  filters: RecentFilter[],
): RecentItem[] {
  const res: RecentItem[] = [];
  const deduplicatedHashes = new Set<string>();
  historyItems.forEach((item) => {
    const filter = filters.find((candidate) => item.url?.includes(candidate.pattern));
    if (filter?.enabled && item.url && item.title) {
      const hash = filter.getHash(item.url);
      if (!deduplicatedHashes.has(hash)) {
        deduplicatedHashes.add(hash);
        item.title = filter.cleanTitle(item.title);
        res.push(item);
      }
    }
  });
  return res;
}

export function getBaseFilteredRecentItems(historyItems: RecentItem[]): RecentItem[] {
  const res: RecentItem[] = [];
  const hashesByTitle = new Map<string, Set<string>>();
  historyItems.forEach((item) => {
    if (item.url && item.title) {
      const url = new URL(item.url);
      const hashes = hashesByTitle.get(item.title);
      if (!hashes) {
        hashesByTitle.set(item.title, new Set(url.pathname));
        res.push(item);
      } else if (!hashes.has(url.pathname)) {
        hashes.add(url.pathname);
        res.push(item);
      }
    }
  });
  return res;
}

let moreHistoryAlreadyLoaded = false;

export function tryLoadMoreHistory(onLoaded: (recentItems: RecentItem[]) => void): void {
  if (moreHistoryAlreadyLoaded) return;
  moreHistoryAlreadyLoaded = true;
  getHistory(false).then(onLoaded);
}

export function getHistory(firstTime = true): Promise<RecentItem[]> {
  return new Promise((resolve) => {
    const offset = 1000 * 60 * 60 * 24 * 60;
    const startTime = Date.now() - offset;
    chrome.history.search(
      { text: "", maxResults: firstTime ? 100 : 10000, startTime },
      (data) => resolve(mapHistoryToRecentAndFilterIrrelevant(data)),
    );
  });
}

export function getTopVisitedFromHistory(history: RecentItem[], limit = 20): RecentItem[] {
  return Array.from(history)
    .sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0))
    .slice(0, limit);
}

function mapHistoryToRecentAndFilterIrrelevant(list: HistoryItem[]): RecentItem[] {
  const res: RecentItem[] = [];
  list.forEach((item) => {
    if (!item.url || !item.title || item.url.includes("translate.google.") || item.url.includes("www.deepl.com")) return;
    res.push({
      id: parseInt(item.id, 10),
      isRecent: true,
      favIconUrl: faviconsStorage.findInCache(item.url) ?? "",
      title: item.title,
      url: item.url,
      lastVisitTime: item.lastVisitTime,
      visitCount: item.visitCount,
    });
  });
  return res;
}
