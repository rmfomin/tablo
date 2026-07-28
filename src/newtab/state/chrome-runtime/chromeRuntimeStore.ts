import { useStore } from "zustand";
import { createStore, type StateCreator, type StoreApi } from "zustand/vanilla";
import type { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import Tab = chrome.tabs.Tab;

export type ChromeRuntimeState = {
  tabs: Tab[];
  recentItems: RecentItem[];
  currentWindowId: number | undefined;
  lastActiveTabIds: number[];
  loaded: boolean;
};

export type ChromeRuntimeActions = {
  setTabs(tabs: Tab[]): void;
  setRecentItems(recentItems: RecentItem[]): void;
  updateTab(tabId: number, tab: Tab): void;
  closeTabs(tabIds: number[]): void;
  setCurrentWindowId(windowId: number | undefined): void;
  setLastActiveTabIds(tabIds: number[]): void;
  setLoaded(loaded: boolean): void;
};

export type ChromeRuntimeStore = ChromeRuntimeState & ChromeRuntimeActions;

const initialChromeRuntimeState: ChromeRuntimeState = {
  tabs: [],
  recentItems: [],
  currentWindowId: undefined,
  lastActiveTabIds: [],
  loaded: false,
};

export function createChromeRuntimeStore(
  initialState: Partial<ChromeRuntimeState> = {},
): StoreApi<ChromeRuntimeStore> {
  return createStore<ChromeRuntimeStore>()(createChromeRuntimeSlice(initialState));
}

function createChromeRuntimeSlice(
  initialState: Partial<ChromeRuntimeState>,
): StateCreator<ChromeRuntimeStore> {
  return (set) => ({
    ...initialChromeRuntimeState,
    ...initialState,

    setTabs: (tabs) => set({ tabs }),
    setRecentItems: (recentItems) => set({ recentItems }),
    updateTab: (tabId, tab) => {
      set((state) => ({
        tabs: state.tabs.map((currentTab) =>
          currentTab.id === tabId ? tab : currentTab,
        ),
      }));
    },
    closeTabs: (tabIds) => {
      set((state) => ({
        tabs: state.tabs.filter((tab) => !tabIds.includes(tab.id ?? -1)),
      }));
    },
    setCurrentWindowId: (currentWindowId) => set({ currentWindowId }),
    setLastActiveTabIds: (lastActiveTabIds) => set({ lastActiveTabIds }),
    setLoaded: (loaded) => set({ loaded }),
  });
}

export const chromeRuntimeStore = createChromeRuntimeStore();

export function useChromeRuntimeStore<T>(
  selector: (state: ChromeRuntimeStore) => T,
): T {
  return useStore(chromeRuntimeStore, selector);
}
