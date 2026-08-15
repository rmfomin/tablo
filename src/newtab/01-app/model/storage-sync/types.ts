import type { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import type { UiPreferences } from "@/newtab/01-app/model/ui/uiStore";

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
