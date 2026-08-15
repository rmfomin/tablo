import type {
  BookmarkItemV3,
  FolderItemToCreate,
  GroupV3,
  SpaceV3,
} from "@/newtab/05-entities/dashboard/model/types";
import type { RecentItem } from "@/newtab/06-shared/api/chrome/history";
import Tab = chrome.tabs.Tab;

export type TabOrRecentData = Tab | RecentItem;

export function isTabData(data: TabOrRecentData): data is Tab {
  return !(data as RecentItem).isRecent;
}

export function convertTabToItem(tab: Tab): FolderItemToCreate {
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

export function createNewFolderItem(
  url?: string,
  title?: string,
  favIconUrl?: string,
): FolderItemToCreate {
  return {
    id: generateLocalId(),
    favIconUrl: favIconUrl ?? getTemporaryFaviconUrl(url),
    title: title ?? "",
    url: url ?? "",
  };
}

export function createNewSection(title = "Title"): GroupV3 {
  return {
    id: generateLocalId(),
    position: "",
    type: "group",
    objectType: "group",
    title,
    collapsed: false,
    groupItems: [],
  };
}

export function generateLocalId(): number {
  return new Date().valueOf() + Math.round(Math.random() * 10000000);
}

export function findBookmarkItem(
  state: { spaces: SpaceV3[] },
  itemId: number,
): BookmarkItemV3 | undefined {
  for (const space of state.spaces) {
    for (const folder of space.folders) {
      for (const item of folder.items) {
        if (item.type === "bookmark" && item.id === itemId) return item;
        if (item.type !== "group") continue;

        const groupItem = item.groupItems.find((child) => child.id === itemId);
        if (groupItem) return groupItem;
      }
    }
  }
}

export function toUrl(value?: string | URL): URL | undefined {
  if (value instanceof URL) return value;
  if (typeof value === "undefined" || !URL.canParse(value)) return undefined;
  return new URL(value);
}

export function getTemporaryFaviconUrl(value?: string | URL): string {
  const url = toUrl(value);
  return url ? `${url.origin}/favicon.ico#by-tablo` : "";
}

export function isCustomActionBookmark(
  item: BookmarkItemV3 | undefined,
): boolean {
  return item?.url.includes("tablo://") ?? false;
}
