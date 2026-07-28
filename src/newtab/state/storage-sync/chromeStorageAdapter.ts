import { areSpacesV3, normalizeBackupV3 } from "@/newtab/helpers/dataFormatAdapters";
import type { ColorTheme, SpaceV3 } from "@/newtab/helpers/types";
import type { PersistedNewtabState, StorageSyncAdapter } from "@/newtab/state/storage-sync/types";

const storageKeys = [
  "spaces",
  "currentSpaceId",
  "sidebarCollapsed",
  "openBookmarksInNewTab",
  "colorTheme",
  "showRecent",
  "showArchived",
  "showNotUsed",
  "hiddenFeatureIsEnabled",
  "version",
] as const;

type StorageRecord = Partial<Record<(typeof storageKeys)[number], unknown>>;
type ChromeStorageArea = {
  get(keys: readonly string[], callback: (items: StorageRecord) => void): void;
  set(items: PersistedNewtabState, callback?: () => void): void;
};
type BroadcastPort = {
  postMessage(message: unknown): void;
  addEventListener(type: "message", listener: (event: Event) => void): void;
  removeEventListener(type: "message", listener: (event: Event) => void): void;
};

/**
 * Единственное место нового state-слоя, которое знает chrome.storage и
 * BroadcastChannel. Store получает уже нормализованные plain data.
 */
export function createChromeStorageAdapter(
  storage: ChromeStorageArea,
  broadcast: BroadcastPort,
): StorageSyncAdapter {
  return {
    async load() {
      const result = await new Promise<StorageRecord>((resolve) => storage.get(storageKeys, resolve));
      return normalizePersistedState(result);
    },
    async save(state) {
      await new Promise<void>((resolve) => storage.set(toCanonicalState(state), resolve));
    },
    broadcastUpdated() {
      broadcast.postMessage({ type: "folders-updated" });
    },
    onUpdated(listener) {
      const onMessage = (event: Event) => {
        const message = (event as MessageEvent).data;
        if (message?.type === "folders-updated") listener();
      };
      broadcast.addEventListener("message", onMessage);
      return () => broadcast.removeEventListener("message", onMessage);
    },
  };
}

export function createBrowserStorageAdapter(): StorageSyncAdapter {
  return createChromeStorageAdapter(
    chrome.storage.local,
    new BroadcastChannel("sync-state-channel") as unknown as BroadcastPort,
  );
}

export function normalizePersistedState(value: StorageRecord): PersistedNewtabState {
  const spaces = value.version === 3 && areSpacesV3(value.spaces)
    ? normalizeBackupV3({ isTablo: true, version: 3, spaces: value.spaces }).spaces
    : [];

  return {
    version: 3,
    spaces,
    currentSpaceId: spaces.length > 0 && typeof value.currentSpaceId === "number"
      ? value.currentSpaceId
      : undefined,
    sidebarCollapsed: value.sidebarCollapsed === true,
    // Сохраняем поведение legacy storage: в обычном new tab новая закладка
    // открывается в отдельной вкладке, а в override mode — в текущей.
    openBookmarksInNewTab: typeof value.openBookmarksInNewTab === "boolean"
      ? value.openBookmarksInNewTab
      : !__OVERRIDE_NEWTAB,
    colorTheme: normalizeColorTheme(value.colorTheme),
    showRecent: value.showRecent === true,
    showArchived: value.showArchived === true,
    showNotUsed: value.showNotUsed === true,
    hiddenFeatureIsEnabled: value.hiddenFeatureIsEnabled === true,
  };
}

function toCanonicalState(state: PersistedNewtabState): PersistedNewtabState {
  const spaces: SpaceV3[] = areSpacesV3(state.spaces)
    ? normalizeBackupV3({ isTablo: true, version: 3, spaces: state.spaces }).spaces
    : [];
  return { ...state, version: 3, spaces };
}

function normalizeColorTheme(value: unknown): ColorTheme {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}
