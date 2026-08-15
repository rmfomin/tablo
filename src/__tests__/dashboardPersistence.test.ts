import { createDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import type { DashboardState } from "@/newtab/01-app/model/dashboard/types";
import {
  createDashboardPersistence,
  type DashboardPersistenceAdapter,
} from "@/newtab/01-app/model/storage-sync/dashboardPersistence";

function createDashboardState(): DashboardState {
  return {
    currentSpaceId: 1,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Работа",
        folders: [],
      },
      {
        id: 2,
        position: "b0",
        objectType: "space",
        title: "Личное",
        folders: [],
      },
    ],
  };
}

function createAdapter(
  loadedState: DashboardState,
): jest.Mocked<DashboardPersistenceAdapter> {
  return {
    load: jest.fn().mockResolvedValue(loadedState),
    save: jest.fn().mockResolvedValue(undefined),
    broadcastUpdated: jest.fn(),
  };
}

afterEach(() => {
  jest.useRealTimers();
});

test("hydrate загружает dashboard data и не запускает сохранение", async () => {
  const initialState = createDashboardState();
  const loadedState: DashboardState = { ...initialState, currentSpaceId: 2 };
  const store = createDashboardStore(initialState);
  const adapter = createAdapter(loadedState);
  const persistence = createDashboardPersistence(adapter, 300);

  await persistence.hydrate(store);

  expect(store.getState().currentSpaceId).toBe(2);
  expect(adapter.save).not.toHaveBeenCalled();
  expect(adapter.broadcastUpdated).not.toHaveBeenCalled();
});

test("start сохраняет изменённый state с задержкой и stop отменяет подписку", async () => {
  jest.useFakeTimers();
  const state = createDashboardState();
  const store = createDashboardStore(state);
  const adapter = createAdapter(state);
  const persistence = createDashboardPersistence(adapter, 300);

  persistence.start(store);
  store.getState().selectSpace(2);
  jest.advanceTimersByTime(300);
  await Promise.resolve();

  expect(adapter.save).toHaveBeenCalledWith({
    spaces: state.spaces,
    currentSpaceId: 2,
  });
  expect(adapter.broadcastUpdated).toHaveBeenCalledTimes(1);

  persistence.stop();
  store.getState().selectSpace(1);
  jest.advanceTimersByTime(300);

  expect(adapter.save).toHaveBeenCalledTimes(1);
});
