import type { StoreApi } from "zustand/vanilla";
import type { DashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import type { DashboardState } from "@/newtab/state/dashboard/types";

/**
 * Адаптер отделяет persistence-правила от конкретного API хранения.
 */
export type DashboardPersistenceAdapter = {
  load(): Promise<DashboardState>;
  save(state: DashboardState): Promise<void>;
  broadcastUpdated(): void;
};

export type DashboardPersistence = {
  hydrate(store: StoreApi<DashboardStore>): Promise<void>;
  start(store: StoreApi<DashboardStore>): void;
  stop(): void;
};

/**
 * Это аналог RTK listener middleware, но без привязки к Redux: сервис
 * подписывается на vanilla store и исполняет внешний эффект после изменения
 * данных. Dashboard store при этом остаётся синхронным и чистым.
 */
export function createDashboardPersistence(
  adapter: DashboardPersistenceAdapter,
  delayMs: number,
): DashboardPersistence {
  let unsubscribe: (() => void) | undefined;
  let saveTimeout: ReturnType<typeof setTimeout> | undefined;

  function stop(): void {
    unsubscribe?.();
    unsubscribe = undefined;

    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = undefined;
    }
  }

  function scheduleSave(state: DashboardState): void {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
      saveTimeout = undefined;
      void persist(state);
    }, delayMs);
  }

  async function persist(state: DashboardState): Promise<void> {
    await adapter.save(state);
    adapter.broadcastUpdated();
  }

  return {
    async hydrate(store): Promise<void> {
      const state = await adapter.load();
      store.getState().hydrate(state);
    },

    start(store): void {
      // Запуск возможен только после hydrate(). Иначе пустой initial state
      // подписчика мог бы затереть реальные закладки в Chrome storage.
      stop();
      unsubscribe = store.subscribe((state, previousState) => {
        if (
          state.spaces === previousState.spaces &&
          state.currentSpaceId === previousState.currentSpaceId
        ) {
          return;
        }

        scheduleSave(toDashboardState(state));
      });
    },

    stop,
  };
}

function toDashboardState(state: DashboardStore): DashboardState {
  // Actions не попадают в storage: сериализуем только данные, а не methods.
  return {
    spaces: state.spaces,
    currentSpaceId: state.currentSpaceId,
  };
}
