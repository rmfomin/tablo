import type { FolderItemToCreate } from "@/newtab/05-entities/dashboard/model/types";
import { getTemporaryFaviconUrl } from "@/newtab/05-entities/dashboard/model/itemUtils";
import type { RecentItem } from "./history";

export const MAX_LAST_ACTIVE_TABS_COUNT = 3;

export type BrowserTab = chrome.tabs.Tab;

export function createTab(properties: chrome.tabs.CreateProperties): void {
  chrome.tabs.create(properties);
}

export type TabGroupColor =
  | "grey"
  | "blue"
  | "red"
  | "yellow"
  | "green"
  | "pink"
  | "purple"
  | "cyan"
  | "orange";

type ChromeWithTabGroups = {
  tabs: {
    create(
      properties: chrome.tabs.CreateProperties,
      callback: (tab: chrome.tabs.Tab) => void,
    ): void;
    group(
      options: { tabIds: number[] },
      callback: (groupId: number) => void,
    ): void;
  };
  tabGroups: {
    update(
      groupId: number,
      properties: { title?: string; color?: TabGroupColor },
      callback: (group: unknown) => void,
    ): void;
  };
};

function getChromeRuntimeError(): Error | undefined {
  const message = chrome.runtime.lastError?.message;
  return message ? new Error(message) : undefined;
}

function createTabWithCallback(
  chromeWithTabGroups: ChromeWithTabGroups,
  url: string,
): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chromeWithTabGroups.tabs.create({ url, active: false }, (tab) => {
      const error = getChromeRuntimeError();
      if (error) {
        reject(error);
      } else {
        resolve(tab);
      }
    });
  });
}

function groupTabsWithCallback(
  chromeWithTabGroups: ChromeWithTabGroups,
  tabIds: number[],
): Promise<number> {
  return new Promise((resolve, reject) => {
    chromeWithTabGroups.tabs.group({ tabIds }, (groupId) => {
      const error = getChromeRuntimeError();
      if (error) {
        reject(error);
      } else {
        resolve(groupId);
      }
    });
  });
}

function updateTabGroupWithCallback(
  chromeWithTabGroups: ChromeWithTabGroups,
  groupId: number,
  title: string,
  color: TabGroupColor,
): Promise<void> {
  const updateProperties: { title?: string; color: TabGroupColor } = { color };
  const trimmedTitle = title.trim();
  if (trimmedTitle) {
    updateProperties.title = trimmedTitle;
  }

  return new Promise((resolve, reject) => {
    chromeWithTabGroups.tabGroups.update(
      groupId,
      updateProperties,
      () => {
        const error = getChromeRuntimeError();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      },
    );
  });
}

export async function createTabGroup(
  urls: string[],
  title: string,
  color: TabGroupColor = "blue",
): Promise<void> {
  const chromeWithTabGroups = chrome as unknown as ChromeWithTabGroups;
  const tabs = await Promise.all(
    urls.map((url) => createTabWithCallback(chromeWithTabGroups, url)),
  );
  const tabIds = tabs.flatMap((tab) =>
    tab.id === undefined ? [] : [tab.id],
  );

  if (tabIds.length === 0) {
    throw new Error("Chrome did not return IDs for the created tabs");
  }

  const groupId = await groupTabsWithCallback(chromeWithTabGroups, tabIds);
  await updateTabGroupWithCallback(chromeWithTabGroups, groupId, title, color);
}

export function updateTab(
  tabId: number,
  properties: chrome.tabs.UpdateProperties,
): void {
  chrome.tabs.update(tabId, properties);
}

export function removeTabs(tabIds: number | number[]): void {
  if (Array.isArray(tabIds)) {
    chrome.tabs.remove(tabIds);
  } else {
    chrome.tabs.remove(tabIds);
  }
}

export function getCurrentTab(
  callback: (tab: BrowserTab | undefined) => void,
): void {
  chrome.tabs.getCurrent(callback);
}

export function queryTabs(
  queryInfo: chrome.tabs.QueryInfo,
  callback: (tabs: BrowserTab[]) => void,
): void {
  chrome.tabs.query(queryInfo, callback);
}

export function getCurrentWindow(
  callback: (window: chrome.windows.Window) => void,
): void {
  chrome.windows.getCurrent(callback);
}

export function focusWindow(windowId: number | undefined): void {
  if (windowId !== undefined) {
    chrome.windows.update(windowId, { focused: true });
  }
}

const importantUrls = [
  "miro.com",
  "miro.atlassian.net",
  "code.devrtb.com",
  "docs.google.com",
  "app2.greenhouse.io",
  "miro.latticehq.com",
  "notion.so",
];

const uselessWords = [
  "| Greenhouse",
  " - Google Sheets",
  " - Google Docs",
  ", Online Whiteboard for Visual Collaboration",
  " - Stash",
  " - Confluence",
  " - YouTube",
  ", Visual Workspace for Innovation",
];

export function filterNonImportant(tab: chrome.tabs.Tab): boolean {
  return importantUrls.some((importantUrl) => tab.url?.includes(importantUrl));
}

export function filterOpenedTabsFromHistory(
  tabs: chrome.tabs.Tab[],
  historyItems: chrome.history.HistoryItem[],
): chrome.history.HistoryItem[] {
  return historyItems.filter((item) => !tabs.some((tab) => item.url === tab.url));
}

export function canDisplayTabInSidebar(tab: chrome.tabs.Tab): boolean {
  return !isTabloTab(tab) && !tab.pinned;
}

export function findTabsByURL(
  url: string | undefined,
  tabs: chrome.tabs.Tab[],
): chrome.tabs.Tab[] {
  return !url ? [] : tabs.filter((tab) => tab.url === url || tab.pendingUrl === url);
}

export function removeUselessProductName(value: string | undefined): string {
  if (value === undefined) return "";
  let result = value;
  uselessWords.forEach((word) => {
    result = result.replace(word, "");
  });
  return result;
}

export function extractHostname(url: string | undefined): string {
  if (url === undefined) return "";
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

export function isTabloTab(
  tab: Pick<chrome.tabs.Tab, "url" | "pendingUrl">,
): boolean {
  return Boolean(
    tab.url?.includes("://newtab/") ||
      tab.pendingUrl?.includes("://newtab/") ||
      tab.url?.includes("/newtab.html") ||
      tab.pendingUrl?.includes("/newtab.html"),
  );
}

export type TabOrRecentData = chrome.tabs.Tab | RecentItem;

export function isTabData(data: TabOrRecentData): data is chrome.tabs.Tab {
  return !(data as RecentItem).isRecent;
}

export function convertTabToItem(tab: chrome.tabs.Tab): FolderItemToCreate {
  return {
    id: generateLocalId(),
    favIconUrl: tab.favIconUrl || "",
    title: tab.title || "",
    url: tab.url || "",
  };
}

export function convertTabOrRecentToItem(
  data: TabOrRecentData,
): FolderItemToCreate {
  return isTabData(data)
    ? convertTabToItem(data)
    : {
        id: generateLocalId(),
        favIconUrl: data.favIconUrl || getTemporaryFaviconUrl(data.url),
        title: data.title || "",
        url: data.url || "",
      };
}

function generateLocalId(): number {
  return new Date().valueOf() + Math.round(Math.random() * 10000000);
}
