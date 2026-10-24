import type { StoreApi } from "zustand/vanilla";
import { dashboardStore, type DashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { chromeRuntimeStore, type ChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";
import type { BookmarkFaviconUpdate } from "@/newtab/01-app/model/dashboard/types";
import type { BookmarkItemV3 } from "@/newtab/05-entities/dashboard/model/types";
import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";
import { createFaviconResolver, normalizeFaviconPageUrl, verifyFaviconUrl } from "@/newtab/06-shared/api/chrome/favicons";

async function loadBookmarkFavicons(
  bookmarks: BookmarkItemV3[],
  resolve: (url: string, storedIcon: string) => Promise<string | undefined>,
  onProgress?: (completed: number) => void,
): Promise<BookmarkFaviconUpdate[]> {
  const verified: BookmarkFaviconUpdate[] = [];
  let nextIndex = 0;
  let completed = 0;
  const worker = async () => {
    while (nextIndex < bookmarks.length) {
      const item = bookmarks[nextIndex++];
      const favicon = await resolve(item.url, item.favIconUrl);
      if (favicon) verified.push({
        itemId: item.id,
        bookmarkUrl: item.url,
        previousFavIconUrl: item.favIconUrl,
        favIconUrl: favicon,
      });
      onProgress?.(++completed);
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, bookmarks.length) }, worker));
  return verified;
}

export async function reloadCurrentSpaceFavicons(): Promise<void> {
  const ui = uiStore.getState();
  if (ui.faviconRefreshInProgress) return;
  const dashboard = dashboardStore.getState();
  const space = dashboard.spaces.find((item) => item.id === dashboard.currentSpaceId);
  const bookmarks = collectBookmarksV3(space ? [space] : [])
    .filter((item) => !item.isSection && normalizeFaviconPageUrl(item.url));
  if (!bookmarks.length) {
    ui.showNotification({ message: "No web bookmarks in this space" });
    return;
  }
  ui.setFaviconRefreshInProgress(true);
  const showProgress = (completed: number) => ui.showNotification({
    message: `Loading favicons: ${completed}/${bookmarks.length}`,
    isLoading: true,
  });
  showProgress(0);
  try {
    const verified = await loadBookmarkFavicons(
      bookmarks,
      createFaviconResolver(chromeRuntimeStore.getState().tabs),
      showProgress,
    );
    const updated = dashboardStore.getState().updateBookmarkFavicons(verified);
    const liveBookmarks = new Map(collectBookmarksV3(dashboardStore.getState().spaces).map((item) => [item.id, item]));
    ui.refreshFavicons(verified.filter((item) => {
      const live = liveBookmarks.get(item.itemId);
      return live?.url === item.bookmarkUrl && live.favIconUrl === item.favIconUrl;
    }).map((item) => item.itemId));
    const unavailable = bookmarks.length - verified.length;
    ui.showNotification({
      message: `Favicons: ${updated} updated, ${verified.length - updated} unchanged, ${unavailable} unavailable`,
    });
  } catch {
    ui.showNotification({ message: "Couldn't reload favicons. Previous icons kept.", isError: true });
  } finally {
    ui.setFaviconRefreshInProgress(false);
  }
}

export function createFaviconSyncController(
  dashboard: StoreApi<DashboardStore>,
  runtime: StoreApi<ChromeRuntimeStore>,
) {
  let stopListening: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = false;
  const pending = new Map<number, chrome.tabs.Tab>();

  async function flush() {
    timer = undefined;
    const tabs = [...pending.values()];
    pending.clear();
    const candidates = new Map(tabs.map((tab) => [normalizeFaviconPageUrl(tab.url), tab]));
    const bookmarks = collectBookmarksV3(dashboard.getState().spaces).filter((item) => {
      const tab = candidates.get(normalizeFaviconPageUrl(item.url));
      return !item.isSection && tab?.favIconUrl && tab.favIconUrl !== item.favIconUrl;
    });
    const checks = new Map<string, Promise<boolean>>();
    const verified = await loadBookmarkFavicons(bookmarks, async (url) => {
      const tab = candidates.get(normalizeFaviconPageUrl(url));
      const src = tab?.favIconUrl;
      if (!tab || !src) return undefined;
      if (!checks.has(src)) checks.set(src, verifyFaviconUrl(src));
      if (!await checks.get(src)) return undefined;
      const current = runtime.getState().tabs.find((item) => item.id === tab.id);
      return active && current && current.url === tab.url && current.favIconUrl === src ? src : undefined;
    });
    if (active) {
      const currentTabs = new Map(runtime.getState().tabs.map((tab) => [tab.id, tab]));
      dashboard.getState().updateBookmarkFavicons(verified.filter((item) => {
        const candidate = candidates.get(normalizeFaviconPageUrl(item.bookmarkUrl));
        const current = currentTabs.get(candidate?.id);
        return candidate && current && current.url === candidate.url && current.favIconUrl === item.favIconUrl;
      }));
    }
  }

  function queue(tabs: chrome.tabs.Tab[], previous: chrome.tabs.Tab[]) {
    const previousById = new Map(previous.map((tab) => [tab.id, tab]));
    for (const tab of tabs) {
      if (tab.id === undefined) continue;
      const before = previousById.get(tab.id);
      if (before?.url === tab.url && before?.favIconUrl === tab.favIconUrl) continue;
      pending.delete(tab.id);
      if (normalizeFaviconPageUrl(tab.url) && tab.favIconUrl) pending.set(tab.id, tab);
    }
    if (pending.size && timer === undefined) timer = setTimeout(() => { void flush(); }, 100);
  }

  return {
    start() {
      active = true;
      stopListening?.();
      stopListening = runtime.subscribe((state, previous) => {
        if (state.tabs !== previous.tabs) queue(state.tabs, previous.tabs);
      });
      queue(runtime.getState().tabs, []);
    },
    stop() {
      active = false;
      stopListening?.();
      stopListening = undefined;
      clearTimeout(timer);
      timer = undefined;
      pending.clear();
    },
  };
}
