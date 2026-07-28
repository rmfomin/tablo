import type { StoreApi } from "zustand/vanilla";
import { getHistory, type RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import type { ChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import Tab = chrome.tabs.Tab;

type StopListening = () => void;

export type ChromeRuntimeAdapter = {
  getTabs(): Promise<Tab[]>;
  getHistory(): Promise<RecentItem[]>;
  getLastActiveTabIds(): Promise<number[]>;
  getCurrentWindowId(): Promise<number | undefined>;
  closeTabs(tabIds: number[]): void;
  onTabCreated(listener: () => void): StopListening;
  onTabRemoved(listener: () => void): StopListening;
  onTabUpdated(listener: (tabId: number, info: Partial<Tab>, tab: Tab) => void): StopListening;
  onWindowFocused(listener: (windowId: number) => void): StopListening;
};

export type ChromeRuntimeController = {
  start(): Promise<void>;
  closeTabs(tabIds: number[]): void;
  stop(): void;
};

/**
 * Controller владеет Chrome API и listener lifecycle. Runtime store хранит
 * только данные: благодаря этому он остаётся синхронным и детерминированным.
 */
export function createChromeRuntimeController(
  store: StoreApi<ChromeRuntimeStore>,
  adapter: ChromeRuntimeAdapter,
): ChromeRuntimeController {
  let cleanups: StopListening[] = [];

  const refreshTabs = () => {
    void adapter.getTabs().then((tabs) => store.getState().setTabs(tabs));
  };

  return {
    async start() {
      this.stop();
      const [tabs, recentItems, lastActiveTabIds, currentWindowId] = await Promise.all([
        adapter.getTabs(),
        adapter.getHistory(),
        adapter.getLastActiveTabIds(),
        adapter.getCurrentWindowId(),
      ]);
      const runtime = store.getState();
      runtime.setTabs(tabs);
      runtime.setRecentItems(recentItems);
      runtime.setLastActiveTabIds(lastActiveTabIds);
      runtime.setCurrentWindowId(currentWindowId);
      runtime.setLoaded(true);

      cleanups = [
        adapter.onTabCreated(refreshTabs),
        adapter.onTabRemoved(refreshTabs),
        adapter.onTabUpdated((tabId, _info, tab) => store.getState().updateTab(tabId, tab)),
        adapter.onWindowFocused((windowId) => {
          if (windowId !== chrome.windows.WINDOW_ID_NONE) {
            store.getState().setCurrentWindowId(windowId);
          }
        }),
      ];
    },
    closeTabs(tabIds) {
      adapter.closeTabs(tabIds);
      store.getState().closeTabs(tabIds);
    },
    stop() {
      cleanups.forEach((cleanup) => cleanup());
      cleanups = [];
    },
  };
}

export function createBrowserChromeRuntimeAdapter(): ChromeRuntimeAdapter {
  return {
    getTabs: () => new Promise((resolve) => chrome.tabs.query({}, (tabs) => resolve(tabs.reverse()))),
    getHistory: () => getHistory(),
    getLastActiveTabIds: () => new Promise((resolve) => {
      chrome.runtime.sendMessage({ type: "get-last-active-tabs" }, (response) => resolve(response?.tabs ?? []));
    }),
    getCurrentWindowId: () => new Promise((resolve) => chrome.windows.getCurrent((window) => resolve(window.id))),
    closeTabs: (tabIds) => chrome.tabs.remove(tabIds),
    onTabCreated: (listener) => addChromeListener(chrome.tabs.onCreated, listener),
    onTabRemoved: (listener) => addChromeListener(chrome.tabs.onRemoved, listener),
    onTabUpdated: (listener) => addChromeListener(chrome.tabs.onUpdated, listener),
    onWindowFocused: (listener) => addChromeListener(chrome.windows.onFocusChanged, listener),
  };
}

function addChromeListener<Arguments extends unknown[]>(
  event: {
    addListener(listener: (...args: Arguments) => void): void;
    removeListener(listener: (...args: Arguments) => void): void;
  },
  listener: (...args: Arguments) => void,
): StopListening {
  event.addListener(listener);
  return () => event.removeListener(listener);
}
