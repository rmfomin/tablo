import { createDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import {
  createStorageSyncController,
  preparePersistedState,
} from "@/newtab/01-app/model/storage-sync/controller";
import type { StorageSyncAdapter } from "@/newtab/01-app/model/storage-sync/types";
import { createUiStore } from "@/newtab/01-app/model/ui/uiStore";

function createAdapter(): jest.Mocked<StorageSyncAdapter> {
  return {
    load: jest.fn().mockResolvedValue({
      version: 3,
      spaces: [{ id: 1, position: "a0", objectType: "space", title: "Работа", folders: [] }],
      currentSpaceId: 1,
      sidebarCollapsed: false,
      openBookmarksInNewTab: false,
      colorTheme: "system",
      showRecent: false,
      showArchived: false,
      showNotUsed: false,
      hiddenFeatureIsEnabled: false,
    }),
    save: jest.fn().mockResolvedValue(undefined),
    broadcastUpdated: jest.fn(),
    onUpdated: jest.fn().mockReturnValue(() => undefined),
  };
}

afterEach(() => jest.useRealTimers());

test("controller гидрирует stores и сохраняет изменение dashboard с задержкой", async () => {
  jest.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const controller = createStorageSyncController(dashboard, ui, adapter, 300);

  await controller.hydrate();
  controller.start();
  dashboard.getState().selectSpace(1);
  ui.getState().setSidebarCollapsed(true);
  jest.advanceTimersByTime(300);
  await Promise.resolve();

  expect(dashboard.getState().spaces).toHaveLength(1);
  expect(adapter.save).toHaveBeenCalledWith(expect.objectContaining({
    currentSpaceId: 1,
    sidebarCollapsed: true,
  }));
  expect(adapter.broadcastUpdated).toHaveBeenCalledTimes(1);
  controller.stop();
});

test("hydration создаёт default space и выбирает первый space по position", () => {
  const empty = preparePersistedState({
    version: 3,
    spaces: [],
    currentSpaceId: undefined,
    sidebarCollapsed: false,
    openBookmarksInNewTab: false,
    colorTheme: "system",
    showRecent: false,
    showArchived: false,
    showNotUsed: false,
    hiddenFeatureIsEnabled: false,
  });
  const withInvalidSelection = preparePersistedState({
    ...empty,
    spaces: [
      { id: 2, position: "b0", objectType: "space", title: "Later", folders: [] },
      { id: 1, position: "a0", objectType: "space", title: "First", folders: [] },
    ],
    currentSpaceId: 100,
  });

  expect(empty).toMatchObject({
    currentSpaceId: 1,
    spaces: [{ id: 1, title: "Default bookmarks" }],
  });
  expect(withInvalidSelection.currentSpaceId).toBe(1);
});
