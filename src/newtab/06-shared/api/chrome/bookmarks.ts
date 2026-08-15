import type { RecentItem } from "./history";
import { getTopVisitedFromHistory } from "./history";
import type { FolderItemToCreate } from "@/newtab/05-entities/dashboard/model/types";
import {
  createNewFolderItem,
  generateLocalId,
  getTemporaryFaviconUrl,
} from "@/newtab/05-entities/dashboard/model/itemUtils";

export type CustomBookmarkTreeNode = {
  checked?: boolean;
  mostVisited?: boolean;
  index?: number;
  dateAdded?: number;
  title: string;
  url?: string;
  dateGroupModified?: number;
  id: string;
  parentId?: string;
  children?: CustomBookmarkTreeNode[];
  unmodifiable?: any;
};

export type PlainListRecord = {
  breadcrumbs: CustomBookmarkTreeNode[];
  folder: CustomBookmarkTreeNode;
};

export type BookmarksAsPlainList = PlainListRecord[];

export function getBrowserBookmarksForImport(
  onReady: (items: BookmarksAsPlainList) => void,
  recentItems: RecentItem[],
  onEmpty: () => void,
): void {
  const history = getTopVisitedFromHistory(recentItems, 1000);
  chrome.bookmarks.getTree((bookmarks) => {
    const root = bookmarks[0];
    if (!root?.children) {
      onEmpty();
      return;
    }
    const records: BookmarksAsPlainList = [];
    traverseTree(root.children, records, [], history);
    onReady(records);
  });
}

function traverseTree(
  nodes: CustomBookmarkTreeNode[],
  records: BookmarksAsPlainList,
  breadcrumbs: CustomBookmarkTreeNode[],
  history: RecentItem[],
): void {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      records.push({ breadcrumbs, folder: node });
      traverseTree(node.children, records, [...breadcrumbs, node], history);
    } else {
      node.mostVisited = history.some(
        (historyItem) => node.url && historyItem.url?.includes(node.url),
      );
    }
  });
}

export type BrowserBookmarksFolderInput = {
  id: number;
  title: string;
  items: FolderItemToCreate[];
};

export function createBrowserBookmarksFolderInputs(
  records: BookmarksAsPlainList,
  skipChecked: boolean,
): BrowserBookmarksFolderInput[] {
  return records.flatMap((record) => {
    if (!skipChecked && !record.folder.checked) return [];
    const items = record.folder.children
      ?.filter((item) => (skipChecked || item.checked) && item.url)
      .map((item) => createNewFolderItem(
        item.url!,
        item.title,
        getTemporaryFaviconUrl(item.url!),
      )) ?? [];
    return [{ id: generateLocalId(), title: record.folder.title, items }];
  });
}

export function importBrowserBookmarksWithCallback(
  records: BookmarksAsPlainList,
  skipChecked: boolean,
  onCreateFolder: (input: BrowserBookmarksFolderInput) => void,
): void {
  createBrowserBookmarksFolderInputs(records, skipChecked).forEach(onCreateFolder);
}
