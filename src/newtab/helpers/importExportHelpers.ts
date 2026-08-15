import {
  DataBackupV3,
  BackupBrandMarker,
  FolderItemToCreate,
  SpaceBackupV3,
  SpaceV3,
  SpaceV3Input,
} from "@/newtab/helpers/types";
import {
  createNewFolderItem,
  generateLocalId,
  getTemporaryFaviconUrl,
} from "@/newtab/state/dashboard/itemUtils";
import { getTopVisitedFromHistory } from "@/newtab/helpers/utils";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import {
  isDataBackupV3Input,
  isSpaceV3Input,
  normalizeBackupV3,
} from "@/newtab/helpers/dataFormatAdapters";
import { insertBetween } from "@/newtab/helpers/fractionalIndexes";

function hasSupportedBackupMarker(data: Record<string, unknown>) {
  const markers = [data.isTablo, data.isAppVersion1, data.isAppVersion3];
  return markers.filter((marker) => marker === true).length === 1;
}

type SpaceBackupV3Input = {
  version: 3;
  objectType: "space-backup";
  space: SpaceV3Input;
} & BackupBrandMarker;

function isSpaceBackupJsonV3(data: unknown): data is SpaceBackupV3Input {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  const backup = data as Record<string, unknown>;
  return (
    hasSupportedBackupMarker(backup) &&
    backup.version === 3 &&
    backup.objectType === "space-backup" &&
    isSpaceV3Input(backup.space)
  );
}

function getImportableSpaceV3(data: unknown): SpaceV3 | undefined {
  if (isSpaceBackupJsonV3(data)) {
    return normalizeBackupV3({ ...data, spaces: [data.space] }).spaces[0];
  }

  if (isDataBackupV3Input(data)) {
    return data.spaces.length === 1
      ? normalizeBackupV3(data).spaces[0]
      : undefined;
  }

  return undefined;
}

export type DashboardImportResult =
  | { ok: true; spaces: SpaceV3[] }
  | { ok: false; message: string };

/**
 * Чистая часть импорта dashboard backup.
 *
 * Она не знает ни о React event, ни о Zustand, ни о Chrome API. Поэтому UI
 * сам выбирает, какой store обновить, а этот helper легко проверять без DOM.
 */
export function parseDashboardImportJson(text: string): DashboardImportResult {
  try {
    const parsed = JSON.parse(text);
    if (isDataBackupV3Input(parsed)) {
      return { ok: true, spaces: normalizeBackupV3(parsed).spaces };
    }

    return {
      ok: false,
      message: isSpaceBackupJsonV3(parsed)
        ? "This is a space backup. Use Import space button to add it."
        : "Unsupported JSON format",
    };
  } catch {
    return { ok: false, message: "Unsupported JSON format" };
  }
}

export function importFromJsonWithCallbacks(
  event: React.ChangeEvent<HTMLInputElement>,
  onImported: (spaces: SpaceV3[]) => void,
  onMessage: (message: string, isError?: boolean) => void,
): void {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const result = parseDashboardImportJson(
      String(loadEvent.target?.result ?? ""),
    );
    if (result.ok) {
      onImported(result.spaces);
      onMessage("Backup has been imported");
    } else {
      onMessage(result.message, true);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

export function createExportBackupV3(spaces: SpaceV3[]): DataBackupV3 {
  return normalizeBackupV3({
    isTablo: true,
    version: 3,
    spaces,
  });
}

export function createExportSpaceBackupV3(space: SpaceV3): SpaceBackupV3 {
  return {
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: normalizeBackupV3({
      isTablo: true,
      version: 3,
      spaces: [space],
    }).spaces[0],
  };
}

function downloadObjectAsJson(exportObj: unknown, exportName: string) {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode); // required for firefox
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}

export function onExportJson(spaces: SpaceV3[]) {
  const backup = createExportBackupV3(spaces);
  const currentDate = new Date().toISOString().slice(0, 10);
  downloadObjectAsJson(backup, `backup_tablo_${currentDate}`);
}

export function onExportSpaceJson(space: SpaceV3) {
  const backup = createExportSpaceBackupV3(space);
  const safeTitle =
    space.title.trim().replace(/[^a-z0-9_-]+/gi, "_") || "space";
  downloadObjectAsJson(backup, `tablo_space_${safeTitle}`);
}

function cloneSpaceForImport(
  space: SpaceV3,
  existingSpaces: SpaceV3[]
): SpaceV3 {
  const lastSpace = existingSpaces.at(-1);
  const normalized = normalizeBackupV3({
    isTablo: true,
    version: 3,
    spaces: [space],
  }).spaces[0];

  return {
    ...normalized,
    id: generateLocalId(),
    position: insertBetween(lastSpace?.position ?? "", ""),
    folders: normalized.folders.map((folder) => ({
      ...folder,
      id: generateLocalId(),
      items: folder.items.map((item) => {
        if (item.type === "bookmark") {
          return {
            ...item,
            id: generateLocalId(),
          };
        }

        return {
          ...item,
          id: generateLocalId(),
          groupItems: item.groupItems.map((groupItem) => ({
            ...groupItem,
            id: generateLocalId(),
          })),
        };
      }),
    })),
  };
}

export type SpaceImportResult =
  | { ok: true; space: SpaceV3 }
  | { ok: false; message: "Unsupported space JSON format" };

/** Чистая часть single-space импорта с remap локальных id. */
export function parseSpaceImportJson(
  text: string,
  existingSpaces: SpaceV3[],
): SpaceImportResult {
  try {
    const space = getImportableSpaceV3(JSON.parse(text));
    return space
      ? { ok: true, space: cloneSpaceForImport(space, existingSpaces) }
      : { ok: false, message: "Unsupported space JSON format" };
  } catch {
    return { ok: false, message: "Unsupported space JSON format" };
  }
}

/** Новый API импорта: helper парсит файл, а caller сам решает, в какой store
 * положить space и как показать ошибку. */
export function importSpaceFromJsonWithCallback(
  event: React.ChangeEvent<HTMLInputElement>,
  existingSpaces: SpaceV3[],
  onImported: (space: SpaceV3) => void,
  onError: (message: string) => void,
): void {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const result = parseSpaceImportJson(
      String(loadEvent.target?.result ?? ""),
      existingSpaces,
    );
    if (result.ok) {
      onImported(result.space);
    } else {
      onError(result.message);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

//////////////////////////////////////////////////////////////////////
// IMPORT BROWSER BOOKMARKS HELPERS
//////////////////////////////////////////////////////////////////////

// copy-paste Chrome types
export type CustomBookmarkTreeNode = {
  checked?: boolean;
  mostVisited?: boolean;

  /** Optional. The 0-based position of this node within its parent folder.  */
  index?: number;
  /** Optional. When this node was created, in milliseconds since the epoch (new Date(dateAdded)).  */
  dateAdded?: number;
  /** The text displayed for the node. */
  title: string;
  /** Optional. The URL navigated to when a user clicks the bookmark. Omitted for folders.   */
  url?: string;
  /** Optional. When the contents of this folder last changed, in milliseconds since the epoch.   */
  dateGroupModified?: number;
  /** The unique identifier for the node. IDs are unique within the current profile, and they remain valid even after the browser is restarted.  */
  id: string;
  /** Optional. The id of the parent folder. Omitted for the root node.   */
  parentId?: string;
  /** Optional. An ordered list of children of this node.  */
  children?: CustomBookmarkTreeNode[];
  /**
   * Optional.
   * Since Chrome 37.
   * Indicates the reason why this node is unmodifiable. The managed value indicates that this node was configured by the system administrator or by the custodian of a supervised
   * user. Omitted if the node can be modified by the user and the extension (default).
   */
  unmodifiable?: any;
};

export type PlainListRecord = {
  breadcrumbs: CustomBookmarkTreeNode[];
  folder: CustomBookmarkTreeNode;
};
export type BookmarksAsPlainList = PlainListRecord[];

/** Browser API adapter без state-зависимостей: ошибки и данные отдаёт caller. */
export function getBrowserBookmarksForImport(
  onReady: (res: BookmarksAsPlainList) => void,
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
    const plain: BookmarksAsPlainList = [];
    traverseTree(root.children, plain, [], history);
    onReady(plain);
  });
}

function traverseTree(
  nodes: CustomBookmarkTreeNode[],
  plainList: BookmarksAsPlainList,
  breadcrumbs: CustomBookmarkTreeNode[],
  history: RecentItem[]
) {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      plainList.push({
        breadcrumbs,
        folder: node,
      });
      traverseTree(node.children, plainList, [...breadcrumbs, node], history);
    } else {
      node.mostVisited = history.some(
        (hItem) => node.url && hItem.url?.includes(node.url)
      );
    }
  });
}

export type BrowserBookmarksFolderInput = {
  id: number;
  title: string;
  items: FolderItemToCreate[];
};

/**
 * Преобразует дерево Chrome bookmarks в входы dashboard-команд.
 *
 * Здесь нет dispatch: UI может передать результат в Zustand, в тестовый store
 * или показать preview без изменения dashboard.
 */
export function createBrowserBookmarksFolderInputs(
  records: BookmarksAsPlainList,
  skipChecked: boolean,
): BrowserBookmarksFolderInput[] {
  return records.flatMap((record) => {
    if (!skipChecked && !record.folder.checked) return [];

    const items = record.folder.children
      ?.filter((item) => (skipChecked || item.checked) && item.url)
      .map((item) =>
        createNewFolderItem(item.url, item.title, getTemporaryFaviconUrl(item.url)),
      ) ?? [];

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
