import {
  BackupBrandMarker,
  BookmarkItemV3,
  DataBackupV3,
  FolderV3,
  GroupV3,
  ItemV3,
  SpaceV3,
} from "@/newtab/helpers/types";

type UnknownRecord = Record<string, unknown>;

function sortByPosition<T extends { position: string }>(records: T[]): T[] {
  return Array.from(records).sort((left, right) => {
    if (left.position < right.position) {
      return -1;
    }
    if (left.position > right.position) {
      return 1;
    }
    return 0;
  });
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOptionalBoolean(value: UnknownRecord, key: string): boolean {
  return value[key] === undefined || typeof value[key] === "boolean";
}

function isOptionalString(value: UnknownRecord, key: string): boolean {
  return value[key] === undefined || typeof value[key] === "string";
}

function hasLocalBase(value: UnknownRecord): boolean {
  return (
    typeof value.id === "number" &&
    typeof value.position === "string" &&
    typeof value.title === "string" &&
    isOptionalBoolean(value, "archived") &&
    isOptionalBoolean(value, "inEdit")
  );
}

function isBookmarkItemV3(value: unknown): value is BookmarkItemV3 {
  if (!isRecord(value) || !hasLocalBase(value)) {
    return false;
  }

  return (
    value.type === "bookmark" &&
    (value.objectType === undefined || value.objectType === "bookmark") &&
    typeof value.url === "string" &&
    typeof value.favIconUrl === "string" &&
    isOptionalBoolean(value, "isSection")
  );
}

function isGroupV3(value: unknown): value is GroupV3 {
  if (!isRecord(value) || !hasLocalBase(value)) {
    return false;
  }

  return (
    value.type === "group" &&
    (value.objectType === undefined || value.objectType === "group") &&
    isOptionalBoolean(value, "collapsed") &&
    Array.isArray(value.groupItems) &&
    value.groupItems.every(isBookmarkItemV3)
  );
}

export function isItemV3(value: unknown): value is ItemV3 {
  return isBookmarkItemV3(value) || isGroupV3(value);
}

export function isFolderV3(value: unknown): value is FolderV3 {
  if (!isRecord(value) || !hasLocalBase(value)) {
    return false;
  }

  return (
    value.objectType === "folder" &&
    Array.isArray(value.items) &&
    value.items.every(isItemV3) &&
    isOptionalString(value, "color") &&
    isOptionalBoolean(value, "collapsed") &&
    isOptionalBoolean(value, "twoColumn")
  );
}

export function isSpaceV3(value: unknown): value is SpaceV3 {
  return (
    isRecord(value) &&
    hasLocalBase(value) &&
    value.objectType === "space" &&
    Array.isArray(value.folders) &&
    value.folders.every(isFolderV3)
  );
}

export function areSpacesV3(value: unknown): value is SpaceV3[] {
  return Array.isArray(value) && value.every(isSpaceV3);
}

function isBackupBrandMarker(value: UnknownRecord): boolean {
  return (
    [value.isTablo, value.isAppVersion1, value.isAppVersion3].filter(
      (marker) => marker === true
    ).length === 1
  );
}

export function isDataBackupV3(value: unknown): value is DataBackupV3 {
  return (
    isRecord(value) &&
    value.version === 3 &&
    isBackupBrandMarker(value) &&
    areSpacesV3(value.spaces)
  );
}

function normalizeBookmarkItemV3(item: BookmarkItemV3): BookmarkItemV3 {
  const source = item as unknown as UnknownRecord;
  const normalized: BookmarkItemV3 = {
    id: item.id,
    position: item.position,
    title: item.title,
    type: "bookmark",
    objectType: "bookmark",
    url: item.url,
    favIconUrl: item.favIconUrl,
  };
  if (typeof source.archived === "boolean") {
    normalized.archived = source.archived;
  }
  if (typeof source.inEdit === "boolean") {
    normalized.inEdit = source.inEdit;
  }
  if (typeof source.isSection === "boolean") {
    normalized.isSection = source.isSection;
  }
  return normalized;
}

function normalizeGroupV3(item: GroupV3): GroupV3 {
  const source = item as unknown as UnknownRecord;
  const normalized: GroupV3 = {
    id: item.id,
    position: item.position,
    title: item.title,
    type: "group",
    objectType: "group",
    groupItems: sortByPosition(item.groupItems.map(normalizeBookmarkItemV3)),
  };
  if (typeof source.archived === "boolean") {
    normalized.archived = source.archived;
  }
  if (typeof source.inEdit === "boolean") {
    normalized.inEdit = source.inEdit;
  }
  if (typeof source.collapsed === "boolean") {
    normalized.collapsed = source.collapsed;
  }
  return normalized;
}

function normalizeItemV3(item: ItemV3): ItemV3 {
  return item.type === "group"
    ? normalizeGroupV3(item)
    : normalizeBookmarkItemV3(item);
}

function normalizeFolderV3(folder: FolderV3): FolderV3 {
  const source = folder as unknown as UnknownRecord;
  const normalized: FolderV3 = {
    id: folder.id,
    position: folder.position,
    objectType: "folder",
    title: folder.title,
    items: sortByPosition(folder.items.map(normalizeItemV3)),
  };
  if (typeof source.color === "string") {
    normalized.color = source.color;
  }
  if (typeof source.collapsed === "boolean") {
    normalized.collapsed = source.collapsed;
  }
  if (typeof source.twoColumn === "boolean") {
    normalized.twoColumn = source.twoColumn;
  }
  if (typeof source.archived === "boolean") {
    normalized.archived = source.archived;
  }
  return normalized;
}

function normalizeSpaceV3(space: SpaceV3): SpaceV3 {
  return {
    id: space.id,
    position: space.position,
    objectType: "space",
    title: space.title,
    folders: sortByPosition(space.folders.map(normalizeFolderV3)),
  };
}

function normalizeBackupBrandMarker(data: DataBackupV3): BackupBrandMarker {
  if (data.isTablo) {
    return { isTablo: true };
  }
  if (data.isAppVersion3) {
    return { isAppVersion3: true };
  }
  return { isAppVersion1: true };
}

export function normalizeBackupV3(data: DataBackupV3): DataBackupV3 {
  const spaces = sortByPosition(data.spaces.map(normalizeSpaceV3));
  const marker = normalizeBackupBrandMarker(data);

  if (marker.isTablo) {
    return { isTablo: true, version: 3, spaces };
  }
  if (marker.isAppVersion3) {
    return { isAppVersion3: true, version: 3, spaces };
  }
  return { isAppVersion1: true, version: 3, spaces };
}
