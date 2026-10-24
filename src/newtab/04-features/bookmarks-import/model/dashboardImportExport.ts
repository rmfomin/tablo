import {
  BackupBrandMarker,
  SpaceV3,
  SpaceV3Input,
} from "@/newtab/05-entities/dashboard/model/types";
import { generateLocalId } from "@/newtab/05-entities/dashboard/model/itemUtils";
import { insertBetween } from "@/newtab/05-entities/dashboard/model/fractionalIndexes";
import type { UiPreferences } from "@/newtab/05-entities/preferences/model/preferences";
import {
  isDataBackupV3Input,
  isSpaceV3Input,
  normalizeBackupV3,
} from "./adapters";

type FileInputChangeEvent = {
  target: {
    files?: { [index: number]: Blob | undefined } | null;
    value: string;
  };
};

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
  if (!data || typeof data !== "object" || Array.isArray(data)) return false;
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
  | { ok: true; spaces: SpaceV3[]; settings?: Partial<UiPreferences> }
  | { ok: false; message: string };

export function parseDashboardImportJson(text: string): DashboardImportResult {
  try {
    const parsed = JSON.parse(text);
    if (isDataBackupV3Input(parsed)) {
      const backup = normalizeBackupV3(parsed);
      const result: DashboardImportResult = { ok: true, spaces: backup.spaces };
      if (backup.settings) result.settings = backup.settings.values;
      return result;
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
  event: FileInputChangeEvent,
  onImported: (spaces: SpaceV3[], settings?: Partial<UiPreferences>) => void,
  onMessage: (message: string, isError?: boolean) => void,
): void {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const result = parseDashboardImportJson(String(loadEvent.target?.result ?? ""));
    if (result.ok) {
      if (result.settings) onImported(result.spaces, result.settings);
      else onImported(result.spaces);
      onMessage("Backup has been imported");
    } else {
      onMessage(result.message, true);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function cloneSpaceForImport(space: SpaceV3, existingSpaces: SpaceV3[]): SpaceV3 {
  const lastSpace = existingSpaces.at(-1);
  const normalized = normalizeBackupV3({ isTablo: true, version: 3, spaces: [space] }).spaces[0];

  return {
    ...normalized,
    id: generateLocalId(),
    position: insertBetween(lastSpace?.position ?? "", ""),
    folders: normalized.folders.map((folder) => ({
      ...folder,
      id: generateLocalId(),
      items: folder.items.map((item) => item.type === "bookmark"
        ? { ...item, id: generateLocalId() }
        : {
          ...item,
          id: generateLocalId(),
          groupItems: item.groupItems.map((groupItem) => ({
            ...groupItem,
            id: generateLocalId(),
          })),
        }),
    })),
  };
}

export type SpaceImportResult =
  | { ok: true; space: SpaceV3 }
  | { ok: false; message: "Unsupported space JSON format" };

export function parseSpaceImportJson(text: string, existingSpaces: SpaceV3[]): SpaceImportResult {
  try {
    const space = getImportableSpaceV3(JSON.parse(text));
    return space
      ? { ok: true, space: cloneSpaceForImport(space, existingSpaces) }
      : { ok: false, message: "Unsupported space JSON format" };
  } catch {
    return { ok: false, message: "Unsupported space JSON format" };
  }
}

export function importSpaceFromJsonWithCallback(
  event: FileInputChangeEvent,
  existingSpaces: SpaceV3[],
  onImported: (space: SpaceV3) => void,
  onError: (message: string) => void,
): void {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    const result = parseSpaceImportJson(String(loadEvent.target?.result ?? ""), existingSpaces);
    if (result.ok) onImported(result.space);
    else onError(result.message);
  };
  reader.readAsText(file);
  event.target.value = "";
}
