import { createDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import {
  createStorageSyncController,
  preparePersistedState,
} from "@/newtab/01-app/model/storage-sync/controller";
import type { StorageSyncAdapter } from "@/newtab/01-app/model/storage-sync/types";
import { createUiStore } from "@/newtab/01-app/model/ui/uiStore";

function createAdapter(): VitestMocked<StorageSyncAdapter> {
  return {
    load: vi.fn().mockResolvedValue({
      version: 3,
      spaces: [{ id: 1, position: "a0", objectType: "space", title: "Работа", folders: [] }],
      currentSpaceId: 1,
      sidebarCollapsed: false,
      openBookmarksInNewTab: false,
      colorTheme: "system",
      showRecent: false,
      showNotUsed: false,
    }),
    save: vi.fn().mockResolvedValue(undefined),
    broadcastUpdated: vi.fn(),
    onUpdated: vi.fn().mockReturnValue(() => undefined),
  };
}

afterEach(() => vi.useRealTimers());

test("controller гидрирует stores и сохраняет изменение dashboard с задержкой", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const controller = createStorageSyncController(dashboard, ui, adapter, 300);

  await controller.hydrate();
  controller.start();
  dashboard.getState().selectSpace(1);
  ui.getState().setSidebarCollapsed(true);
  vi.advanceTimersByTime(300);
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
    showNotUsed: false,
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

test("failed hydration preserves the in-memory dashboard and never writes defaults", async () => {
  const dashboard = createDashboardStore({
    spaces: [{ id: 7, position: "a0", objectType: "space", title: "Keep me", folders: [] }],
    currentSpaceId: 7,
  });
  const ui = createUiStore();
  const adapter = createAdapter();
  adapter.load.mockRejectedValue(new Error("Read failed"));
  const controller = createStorageSyncController(dashboard, ui, adapter);

  await expect(controller.hydrate()).rejects.toThrow("Read failed");

  expect(dashboard.getState().spaces[0].title).toBe("Keep me");
  expect(dashboard.getState().currentSpaceId).toBe(7);
  expect(adapter.save).not.toHaveBeenCalled();
  expect(adapter.broadcastUpdated).not.toHaveBeenCalled();
});

test("stop cancels a pending save and unsubscribes stores and broadcast updates", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const unsubscribeBroadcast = vi.fn();
  adapter.onUpdated.mockReturnValue(unsubscribeBroadcast);
  const controller = createStorageSyncController(dashboard, ui, adapter);
  await controller.hydrate();
  controller.start();
  ui.getState().setSidebarCollapsed(true);

  controller.stop();
  ui.getState().setSidebarCollapsed(false);
  await vi.runAllTimersAsync();

  expect(unsubscribeBroadcast).toHaveBeenCalledOnce();
  expect(adapter.save).not.toHaveBeenCalled();
  expect(adapter.load).toHaveBeenCalledOnce();
});

test("restarting the controller does not duplicate persistence subscriptions", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const controller = createStorageSyncController(dashboard, ui, adapter);
  await controller.hydrate();
  controller.start();
  controller.start();
  ui.getState().setSidebarCollapsed(true);
  await vi.runAllTimersAsync();

  expect(adapter.save).toHaveBeenCalledOnce();
  expect(adapter.broadcastUpdated).toHaveBeenCalledOnce();
  controller.stop();
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail; });
  return { promise, resolve, reject };
}

test("writes are serialized and coalesce newer changes into the latest snapshot", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const firstWrite = deferred<void>();
  adapter.save.mockReturnValueOnce(firstWrite.promise);
  const controller = createStorageSyncController(dashboard, ui, adapter);
  await controller.hydrate();
  controller.start();
  ui.getState().setSidebarCollapsed(true);
  await vi.advanceTimersByTimeAsync(300);
  ui.getState().setColorTheme("dark");
  await vi.advanceTimersByTimeAsync(300);
  ui.getState().setColorTheme("light");
  await vi.advanceTimersByTimeAsync(300);
  expect(adapter.save).toHaveBeenCalledOnce();
  firstWrite.resolve();
  await vi.runAllTimersAsync();
  expect(adapter.save).toHaveBeenCalledTimes(2);
  expect(adapter.save).toHaveBeenLastCalledWith(expect.objectContaining({ colorTheme: "light", sidebarCollapsed: true }));
  controller.stop();
});

test("retries a failed write once and broadcasts only the successful result", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const onError = vi.fn();
  adapter.save.mockRejectedValueOnce(new Error("Temporary failure"));
  const controller = createStorageSyncController(dashboard, ui, adapter, 300, onError);
  await controller.hydrate();
  controller.start();
  ui.getState().setSidebarCollapsed(true);
  await vi.runAllTimersAsync();
  expect(adapter.save).toHaveBeenCalledTimes(2);
  expect(adapter.broadcastUpdated).toHaveBeenCalledOnce();
  expect(onError).not.toHaveBeenCalled();
  controller.stop();
});

test("stale broadcast hydration never overwrites changes made while loading", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const controller = createStorageSyncController(dashboard, ui, adapter);
  await controller.hydrate();
  controller.start();
  const snapshot = await adapter.load();
  const staleRead = deferred<typeof snapshot>();
  adapter.load.mockReturnValueOnce(staleRead.promise);
  adapter.onUpdated.mock.calls[0][0]();
  ui.getState().setColorTheme("dark");
  staleRead.resolve(snapshot);
  await vi.runAllTimersAsync();
  expect(ui.getState().colorTheme).toBe("dark");
  expect(adapter.save).toHaveBeenLastCalledWith(expect.objectContaining({ colorTheme: "dark" }));
  controller.stop();
});

test("permanent write failures report once, do not broadcast and can recover on the next change", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const onError = vi.fn();
  const failure = new Error("Quota exceeded");
  adapter.save.mockRejectedValue(failure);
  const controller = createStorageSyncController(dashboard, ui, adapter, 300, onError);
  await controller.hydrate();
  controller.start();
  ui.getState().setSidebarCollapsed(true);
  await vi.runAllTimersAsync();
  expect(adapter.save).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenCalledExactlyOnceWith(failure);
  expect(adapter.broadcastUpdated).not.toHaveBeenCalled();

  adapter.save.mockResolvedValue(undefined);
  ui.getState().setColorTheme("dark");
  await vi.runAllTimersAsync();
  expect(adapter.save).toHaveBeenLastCalledWith(expect.objectContaining({ colorTheme: "dark", sidebarCollapsed: true }));
  expect(adapter.broadcastUpdated).toHaveBeenCalledOnce();
  controller.stop();
});

test("flush writes a pending edit immediately and retains it after stop", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const controller = createStorageSyncController(dashboard, ui, adapter);
  await controller.hydrate();
  controller.start();
  ui.getState().setColorTheme("dark");
  controller.stop();
  expect(adapter.save).not.toHaveBeenCalled();
  await expect(controller.flush()).resolves.toBe(true);
  expect(adapter.save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ colorTheme: "dark" }));
  await vi.runAllTimersAsync();
  expect(adapter.save).toHaveBeenCalledOnce();
});

test("a delayed broadcast read is ignored after stop and restart", async () => {
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const controller = createStorageSyncController(dashboard, ui, adapter);
  await controller.hydrate();
  const snapshot = await adapter.load();
  controller.start();
  const staleRead = deferred<typeof snapshot>();
  adapter.load.mockReturnValueOnce(staleRead.promise);
  adapter.onUpdated.mock.calls[0][0]();
  controller.stop();
  controller.start();
  ui.getState().hydratePreferences({ ...snapshot, colorTheme: "light" });
  staleRead.resolve(snapshot);
  await Promise.resolve();
  expect(ui.getState().colorTheme).toBe("light");
  controller.stop();
});

test("broadcast read errors are reported without changing the current dashboard", async () => {
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const onError = vi.fn();
  const controller = createStorageSyncController(dashboard, ui, adapter, 300, onError);
  await controller.hydrate();
  controller.start();
  adapter.load.mockRejectedValueOnce(new Error("Read failed"));
  adapter.onUpdated.mock.calls[0][0]();
  await Promise.resolve();
  await Promise.resolve();
  expect(onError).toHaveBeenCalledOnce();
  expect(dashboard.getState().spaces[0].title).toBe("Работа");
  expect(adapter.save).not.toHaveBeenCalled();
  controller.stop();
});

test("flush can retry a failed snapshot without another user edit", async () => {
  vi.useFakeTimers();
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const onError = vi.fn();
  const controller = createStorageSyncController(dashboard, ui, adapter, 300, onError);
  await controller.hydrate();
  controller.start();
  adapter.save.mockRejectedValue(new Error("Disk unavailable"));
  ui.getState().setColorTheme("dark");
  await expect(controller.flush()).resolves.toBe(false);
  expect(adapter.save).toHaveBeenCalledTimes(2);
  expect(onError).toHaveBeenCalledOnce();
  adapter.save.mockResolvedValue(undefined);
  await expect(controller.flush()).resolves.toBe(true);
  expect(adapter.save).toHaveBeenLastCalledWith(expect.objectContaining({ colorTheme: "dark" }));
  expect(adapter.broadcastUpdated).toHaveBeenCalledOnce();
  controller.stop();
});

test("overlapping reads apply only the newest requested hydration", async () => {
  const dashboard = createDashboardStore();
  const ui = createUiStore();
  const adapter = createAdapter();
  const snapshot = await adapter.load();
  const first = deferred<typeof snapshot>();
  const second = deferred<typeof snapshot>();
  adapter.load.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const controller = createStorageSyncController(dashboard, ui, adapter);
  const firstLoad = controller.hydrate();
  const secondLoad = controller.hydrate();
  second.resolve({ ...snapshot, colorTheme: "dark" });
  await secondLoad;
  first.resolve({ ...snapshot, colorTheme: "light" });
  await firstLoad;
  expect(ui.getState().colorTheme).toBe("dark");
  expect(adapter.save).not.toHaveBeenCalled();
});
