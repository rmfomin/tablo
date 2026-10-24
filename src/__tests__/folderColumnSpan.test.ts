import { createDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import type { DashboardState } from "@/newtab/01-app/model/dashboard/types";
import {
  createChromeStorageAdapter,
  normalizePersistedState,
} from "@/newtab/01-app/model/storage-sync/chromeStorageAdapter";
import {
  createExportBackupV3,
  createExportSpaceBackupV3,
} from "@/newtab/04-features/bookmarks-export/model/dashboardExport";
import {
  parseDashboardImportJson,
  parseSpaceImportJson,
} from "@/newtab/04-features/bookmarks-import/model/dashboardImportExport";

function createState(): DashboardState {
  return {
    currentSpaceId: 1,
    spaces: [{
      id: 1,
      objectType: "space",
      title: "Main",
      position: "a0",
      folders: [{
        id: 10,
        objectType: "folder",
        title: "Work",
        position: "a0",
        items: [{
          id: 100,
          type: "bookmark",
          objectType: "bookmark",
          title: "Docs",
          position: "a0",
          url: "https://docs.example",
          favIconUrl: "",
        }],
      }],
    }],
  };
}

beforeEach(() => vi.stubGlobal("__OVERRIDE_NEWTAB", false));
afterEach(() => vi.unstubAllGlobals());

test.each([1, 3, Number.MAX_SAFE_INTEGER])("column span %s survives dashboard and single-space JSON round trips", (columnSpan) => {
  const state = createState();
  state.spaces[0].folders[0].columnSpan = columnSpan;

  const dashboard = parseDashboardImportJson(JSON.stringify(createExportBackupV3(state.spaces)));
  expect(dashboard).toEqual({ ok: true, spaces: state.spaces });

  const singleSpace = parseSpaceImportJson(JSON.stringify(createExportSpaceBackupV3(state.spaces[0])), []);
  expect(singleSpace.ok).toBe(true);
  if (!singleSpace.ok) throw new Error(singleSpace.message);
  expect(singleSpace.space.folders[0].columnSpan).toBe(columnSpan);
  expect(singleSpace.space.folders[0].items).toMatchObject([{ url: "https://docs.example" }]);
});

test("old JSON keeps the absent width field after export and storage normalization", () => {
  const state = createState();
  const backup = createExportBackupV3(state.spaces);
  const imported = parseDashboardImportJson(JSON.stringify(backup));
  expect(imported).toEqual({ ok: true, spaces: state.spaces });
  expect(backup.spaces[0].folders[0]).not.toHaveProperty("columnSpan");
  expect(normalizePersistedState({ version: 3, spaces: state.spaces }).spaces[0].folders[0]).not.toHaveProperty("columnSpan");
});

test.each([0, -1, 1.5, "3", null, {}, Number.MAX_SAFE_INTEGER + 1])("malformed imported width %j falls back to one column without losing bookmarks", (columnSpan) => {
  const state = createState();
  Object.assign(state.spaces[0].folders[0], { columnSpan });

  const imported = parseDashboardImportJson(JSON.stringify({ isTablo: true, version: 3, spaces: state.spaces }));
  expect(imported.ok).toBe(true);
  if (!imported.ok) throw new Error(imported.message);
  expect(imported.spaces[0].folders[0]).not.toHaveProperty("columnSpan");
  expect(imported.spaces[0].folders[0].items).toEqual(createState().spaces[0].folders[0].items);
  const loaded = normalizePersistedState({ version: 3, spaces: state.spaces });
  expect(loaded.spaces).toEqual(imported.spaces);
});

test("width persists through store updates, collapse, undo and Chrome storage reload", async () => {
  const store = createDashboardStore(createState());
  store.getState().createFolder({ id: 20, columnSpan: 2 });
  expect(store.getState().spaces[0].folders[1].columnSpan).toBe(2);

  store.getState().updateFolder(10, { columnSpan: 3 });
  store.getState().updateFolder(10, { collapsed: true });
  expect(store.getState().spaces[0].folders[0]).toMatchObject({ columnSpan: 3, collapsed: true });
  store.getState().updateFolder(10, { collapsed: false });
  store.getState().updateFolder(10, { columnSpan: 4 });
  store.getState().undo();
  expect(store.getState().spaces[0].folders[0]).toMatchObject({ columnSpan: 3, collapsed: false });

  let stored = normalizePersistedState({});
  const adapter = createChromeStorageAdapter({
    get: (_keys, callback) => callback(stored),
    set: (value, callback) => {
      stored = JSON.parse(JSON.stringify(value));
      callback?.();
    },
  }, { postMessage() {}, addEventListener() {}, removeEventListener() {} });
  await adapter.save({ ...stored, spaces: store.getState().spaces, currentSpaceId: 1 });
  const reloaded = await adapter.load();
  expect(reloaded.spaces).toEqual(store.getState().spaces);
});

test.each([0, -1, 1.5, Number.NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("invalid action width %s resets to default without affecting contents", (columnSpan) => {
  const store = createDashboardStore(createState());
  store.getState().createFolder({ id: 20, columnSpan });
  expect(store.getState().spaces[0].folders[1]).not.toHaveProperty("columnSpan");
  store.getState().updateFolder(10, { columnSpan: 3 });
  store.getState().updateFolder(10, { columnSpan });
  expect(store.getState().spaces[0].folders[0]).not.toHaveProperty("columnSpan");
  expect(store.getState().spaces[0].folders[0].items).toEqual(createState().spaces[0].folders[0].items);
});

test("an explicit undefined width resets the saved size and undo restores it", () => {
  const store = createDashboardStore(createState());
  store.getState().updateFolder(10, { columnSpan: 3 });
  store.getState().updateFolder(10, { columnSpan: undefined });
  expect(store.getState().spaces[0].folders[0]).not.toHaveProperty("columnSpan");
  store.getState().undo();
  expect(store.getState().spaces[0].folders[0].columnSpan).toBe(3);
});
