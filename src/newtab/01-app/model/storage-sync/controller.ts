import type { StoreApi } from "zustand/vanilla";
import { getFirstSortedByPosition } from "@/newtab/05-entities/dashboard/model/fractionalIndexes";
import type { DashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import type { DashboardState } from "@/newtab/01-app/model/dashboard/types";
import type { StorageSyncAdapter, PersistedNewtabState } from "@/newtab/01-app/model/storage-sync/types";
import type { UiStore } from "@/newtab/01-app/model/ui/uiStore";
import { normalizeUiPreferences, uiPreferenceKeys } from "@/newtab/05-entities/preferences/model/preferences";
import { createLatestWriteQueue } from "./writeQueue";

export type StorageSyncController = {
  hydrate(): Promise<void>;
  start(): void;
  stop(): void;
  flush(): Promise<boolean>;
};

/**
 * Zustand-аналог RTK listener middleware: подписывается на два vanilla store,
 * а внешний storage/BroadcastChannel эффект остаётся здесь, а не в actions.
 */
export function createStorageSyncController(
  dashboardStore: StoreApi<DashboardStore>,
  uiStore: StoreApi<UiStore>,
  adapter: StorageSyncAdapter,
  delayMs = 300,
  onError: (error: unknown) => void = (error) => console.error("Storage synchronization failed", error),
): StorageSyncController {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let stopDashboard: (() => void) | undefined;
  let stopUi: (() => void) | undefined;
  let stopBroadcast: (() => void) | undefined;
  let applyingStoredState = false;
  let localRevision = 0;
  let savedRevision = 0;
  let enqueuedRevision = -1;
  let loadRevision = 0;
  let lifecycle = 0;

  const writes = createLatestWriteQueue<{ state: PersistedNewtabState; revision: number }>({
    write: ({ state }) => adapter.save(state),
    onSaved: ({ revision }) => {
      savedRevision = Math.max(savedRevision, revision);
      try { adapter.broadcastUpdated(); }
      catch (error) { onError(error); }
    },
    onError: (error) => {
      enqueuedRevision = -1;
      onError(error);
    },
  });

  async function hydrate(): Promise<void> {
    if (localRevision > savedRevision) return;
    const expectedLocalRevision = localRevision;
    const expectedLoadRevision = ++loadRevision;
    const expectedLifecycle = lifecycle;
    const state = await adapter.load();
    if (
      expectedLocalRevision !== localRevision || expectedLoadRevision !== loadRevision ||
      expectedLifecycle !== lifecycle || localRevision > savedRevision
    ) return;
    applyingStoredState = true;
    try {
      applyPersistedState(state);
    } finally {
      applyingStoredState = false;
    }
  }

  function applyPersistedState(state: PersistedNewtabState): void {
    const preparedState = preparePersistedState(state);
    dashboardStore.getState().hydrate({
      spaces: preparedState.spaces,
      currentSpaceId: preparedState.currentSpaceId,
    });
    uiStore.getState().hydratePreferences(preparedState);
  }

  function scheduleSave(): void {
    if (applyingStoredState) return;
    localRevision++;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      void persistLatest();
    }, delayMs);
  }

  function persistLatest(): Promise<boolean> {
    if (localRevision <= savedRevision || enqueuedRevision === localRevision) return writes.wait();
    enqueuedRevision = localRevision;
    return writes.enqueue({
      state: toPersistedState(dashboardStore.getState(), uiStore.getState()),
      revision: localRevision,
    });
  }

  return {
    hydrate,
    start() {
      this.stop();
      stopDashboard = dashboardStore.subscribe((state, previous) => {
        if (state.spaces !== previous.spaces || state.currentSpaceId !== previous.currentSpaceId) scheduleSave();
      });
      stopUi = uiStore.subscribe((state, previous) => {
        if (hasPersistedPreferencesChanged(state, previous)) scheduleSave();
      });
      stopBroadcast = adapter.onUpdated(() => { void hydrate().catch(onError); });
    },
    stop() {
      stopDashboard?.();
      stopUi?.();
      stopBroadcast?.();
      stopDashboard = undefined;
      stopUi = undefined;
      stopBroadcast = undefined;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = undefined;
      lifecycle++;
    },
    flush() {
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = undefined;
      return persistLatest();
    },
  };
}

/**
 * Инвариант нового tab: после hydration всегда существует выбранный space.
 *
 * Раньше это выполнялось в index.tsx над legacy SavingState. Теперь правило
 * находится рядом с загрузкой Zustand stores и не зависит от reducer state.
 */
export function preparePersistedState(
  state: PersistedNewtabState,
): PersistedNewtabState & { currentSpaceId: number } {
  const spaces = state.spaces.length > 0
    ? state.spaces
    : [{
        id: 1,
        position: "a0",
        objectType: "space" as const,
        title: "Default bookmarks",
        folders: [],
      }];
  const currentSpaceId = spaces.some((space) => space.id === state.currentSpaceId)
    ? state.currentSpaceId!
    : getFirstSortedByPosition(spaces)?.id ?? -1;

  return { ...state, spaces, currentSpaceId };
}

function toPersistedState(dashboard: DashboardState, ui: UiStore): PersistedNewtabState {
  return {
    version: 3,
    spaces: dashboard.spaces,
    currentSpaceId: dashboard.currentSpaceId === -1 ? undefined : dashboard.currentSpaceId,
    ...normalizeUiPreferences(ui),
  };
}

function hasPersistedPreferencesChanged(current: UiStore, previous: UiStore): boolean {
  return uiPreferenceKeys.some((key) => current[key] !== previous[key]);
}
