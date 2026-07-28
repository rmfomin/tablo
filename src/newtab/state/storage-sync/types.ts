import type { SpaceV3 } from "@/newtab/helpers/types";
import type { UiPreferences } from "@/newtab/state/ui/uiStore";

/** Точный v3-снимок, который хранится в chrome.storage.local. */
export type PersistedNewtabState = UiPreferences & {
  version: 3;
  spaces: SpaceV3[];
  currentSpaceId: number | undefined;
};

export type StorageSyncAdapter = {
  load(): Promise<PersistedNewtabState>;
  save(state: PersistedNewtabState): Promise<void>;
  broadcastUpdated(): void;
  onUpdated(listener: () => void): () => void;
};
