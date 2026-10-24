import { demoBookmarkTree, demoHistory, demoSettings, demoSpaces, demoTabs } from "./fixture";

export const demoStorageKey = "tablo-demo-state";
const storageDataKey = "tablo-demo-chrome-storage";
const currentWindowId = 1;
const demoFixtureVersion = 3;

type Listener<Args extends unknown[]> = (...args: Args) => void;

function event<Args extends unknown[]>() {
  const listeners = new Set<Listener<Args>>();
  return {
    addListener(listener: Listener<Args>) { listeners.add(listener); },
    removeListener(listener: Listener<Args>) { listeners.delete(listener); },
    emit(...args: Args) { listeners.forEach((listener) => listener(...args)); },
  };
}

function initialState() {
  return {
    ...demoSettings,
    demoFixtureVersion,
    version: 3,
    spaces: demoSpaces,
    currentSpaceId: demoSpaces[0].id,
  };
}

function ensureDemoState() {
  if (readStorage().demoFixtureVersion === demoFixtureVersion) return;
  const state = initialState();
  localStorage.setItem(storageDataKey, JSON.stringify(state));
  localStorage.setItem(demoStorageKey, JSON.stringify(state));
}

function readStorage(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem(storageDataKey) ?? "{}");
  } catch {
    return {};
  }
}

export function installDemoChrome(): void {
  ensureDemoState();
  const tabs: Array<chrome.tabs.Tab & { groupId?: number }> = demoTabs.map(
    (tab) => ({ ...tab }) as chrome.tabs.Tab & { groupId?: number },
  );
  const onCreated = event<[chrome.tabs.Tab]>();
  const onRemoved = event<[number, chrome.tabs.TabRemoveInfo]>();
  const onUpdated = event<[number, chrome.tabs.TabChangeInfo, chrome.tabs.Tab]>();
  const onFocusChanged = event<[number]>();
  let nextTabId = Math.max(...tabs.map(({ id }) => id ?? 0)) + 1;
  let nextDownloadId = 1;

  const chromeMock = {
    runtime: {
      lastError: undefined as chrome.runtime.LastError | undefined,
      getURL(path: string) { return new URL(path.replace(/^\//, ""), location.href).href; },
      sendMessage(message: { type?: string }, callback?: (response: unknown) => void) {
        if (message?.type === "get-last-active-tabs") callback?.({ tabs: [3, 2, 1] });
        else callback?.(undefined);
      },
    },
    storage: {
      local: {
        get(keys: string[] | string, callback: (result: Record<string, unknown>) => void) {
          const saved = readStorage();
          const requested = Array.isArray(keys) ? keys : [keys];
          callback(Object.fromEntries(requested.filter((key) => key in saved).map((key) => [key, saved[key]])));
        },
        set(items: Record<string, unknown>, callback?: () => void) {
          localStorage.setItem(storageDataKey, JSON.stringify({ ...readStorage(), ...items }));
          if (items.version === 3 && Array.isArray(items.spaces)) {
            const demoState = { ...initialState(), ...readStorage() };
            localStorage.setItem(demoStorageKey, JSON.stringify(demoState));
          }
          callback?.();
        },
        remove(keys: string | string[], callback?: () => void) {
          const saved = readStorage();
          (Array.isArray(keys) ? keys : [keys]).forEach((key) => delete saved[key]);
          localStorage.setItem(storageDataKey, JSON.stringify(saved));
          callback?.();
        },
      },
    },
    tabs: {
      onCreated,
      onRemoved,
      onUpdated,
      query(queryInfo: chrome.tabs.QueryInfo, callback: (items: chrome.tabs.Tab[]) => void) {
        let result = tabs.filter((tab) => queryInfo.currentWindow ? tab.windowId === currentWindowId : true);
        if (queryInfo.active !== undefined) result = result.filter((tab) => tab.active === queryInfo.active);
        if (queryInfo.highlighted !== undefined) result = result.filter((tab) => tab.highlighted === queryInfo.highlighted);
        callback(result.map((tab) => ({ ...tab })) as chrome.tabs.Tab[]);
      },
      getCurrent(callback: (tab: chrome.tabs.Tab) => void) {
        callback({ ...tabs.find((tab) => tab.id === 17)! } as chrome.tabs.Tab);
      },
      create(properties: chrome.tabs.CreateProperties, callback?: (tab: chrome.tabs.Tab) => void) {
        const tab = {
          id: nextTabId++,
          index: tabs.length,
          windowId: properties.windowId ?? currentWindowId,
          active: properties.active ?? true,
          highlighted: properties.active ?? true,
          pinned: false,
          discarded: false,
          autoDiscardable: true,
          groupId: -1,
          status: "complete",
          incognito: false,
          selected: properties.active ?? true,
          url: properties.url ?? "about:blank",
          title: properties.url ?? "Новая вкладка",
        } as chrome.tabs.Tab;
        if (tab.active) tabs.forEach((item) => { item.active = false; item.highlighted = false; item.selected = false; });
        tabs.push(tab);
        callback?.({ ...tab });
        onCreated.emit({ ...tab });
      },
      update(tabId: number, properties: chrome.tabs.UpdateProperties, callback?: (tab: chrome.tabs.Tab) => void) {
        const tab = tabs.find((item) => item.id === tabId) ?? tabs.find((item) => item.active)!;
        if (properties.active) tabs.forEach((item) => { item.active = false; item.highlighted = false; item.selected = false; });
        Object.assign(tab, properties, properties.url ? { title: properties.url } : {});
        callback?.({ ...tab });
        onUpdated.emit(tab.id!, { ...properties }, { ...tab });
      },
      remove(tabIds: number | number[], callback?: () => void) {
        const ids = Array.isArray(tabIds) ? tabIds : [tabIds];
        ids.forEach((id) => {
          const index = tabs.findIndex((tab) => tab.id === id);
          if (index >= 0) {
            const [removed] = tabs.splice(index, 1);
            onRemoved.emit(id, { windowId: removed.windowId, isWindowClosing: false });
          }
        });
        callback?.();
      },
      group(options: { tabIds: number[] }, callback: (groupId: number) => void) {
        options.tabIds.forEach((id) => { const tab = tabs.find((item) => item.id === id); if (tab) tab.groupId = 1; });
        callback(1);
      },
    },
    tabGroups: {
      update(groupId: number, properties: { title?: string; color?: string }, callback: (group: unknown) => void) {
        callback({ groupId, ...properties });
      },
    },
    windows: {
      WINDOW_ID_NONE: -1,
      onFocusChanged,
      getCurrent(callback: (window: chrome.windows.Window) => void) {
        callback({ id: currentWindowId, focused: true, incognito: false, alwaysOnTop: false, state: "normal", type: "normal" } as chrome.windows.Window);
      },
      update(windowId: number, _properties: chrome.windows.UpdateInfo, callback?: (window: chrome.windows.Window) => void) {
        callback?.({ id: windowId, focused: true } as chrome.windows.Window);
        onFocusChanged.emit(windowId);
      },
    },
    history: {
      search(query: chrome.history.HistoryQuery, callback: (items: chrome.history.HistoryItem[]) => void) {
        const filtered = demoHistory.filter((item) => !query.text || `${item.title} ${item.url}`.toLowerCase().includes(query.text.toLowerCase()));
        callback(filtered.slice(0, query.maxResults ?? filtered.length) as chrome.history.HistoryItem[]);
      },
      getVisits(details: { url: string }, callback: (visits: chrome.history.VisitItem[]) => void) {
        const record = demoHistory.find((item) => item.url === details.url);
        const count = Math.min(record?.visitCount ?? 1, 12);
        callback(Array.from({ length: count }, (_, index) => ({ visitTime: Date.now() - index * 60 * 60 * 1000, transition: "link" } as chrome.history.VisitItem)));
      },
    },
    bookmarks: {
      getTree(callback: (nodes: chrome.bookmarks.BookmarkTreeNode[]) => void) {
        callback(demoBookmarkTree as chrome.bookmarks.BookmarkTreeNode[]);
      },
    },
    downloads: {
      onChanged: event<[chrome.downloads.DownloadDelta]>(),
      download(_options: chrome.downloads.DownloadOptions, callback: (downloadId: number) => void) { callback(nextDownloadId++); },
      search(query: chrome.downloads.DownloadQuery, callback: (items: chrome.downloads.DownloadItem[]) => void) {
        callback([{ id: query.id ?? nextDownloadId, state: "complete" } as chrome.downloads.DownloadItem]);
      },
    },
  };

  Object.defineProperty(globalThis, "chrome", { configurable: true, value: chromeMock });
  document.querySelector<HTMLButtonElement>(".demo-toolbar__reset")?.addEventListener("click", () => {
    localStorage.removeItem(demoStorageKey);
    localStorage.removeItem(storageDataKey);
    location.reload();
  });
}
