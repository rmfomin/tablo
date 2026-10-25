Object.defineProperty(global, "__OVERRIDE_NEWTAB", {
  value: false,
  configurable: true,
});

import { createChromeStorageAdapter, normalizePersistedState } from "@/newtab/01-app/model/storage-sync/chromeStorageAdapter";

test("normalizePersistedState сохраняет default openBookmarksInNewTab для пустого storage", () => {
  const state = normalizePersistedState({});

  expect(state).toMatchObject({
    version: 3,
    spaces: [],
    currentSpaceId: undefined,
    openBookmarksInNewTab: true,
    colorTheme: "system",
  });
});

function storageFixture() {
  const storage = {
    get: vi.fn((_keys: readonly string[], callback: (value: {}) => void) => callback({})),
    set: vi.fn((_value: unknown, callback?: () => void) => callback?.()),
    remove: vi.fn((_keys: string | string[], callback?: () => void) => callback?.()),
  };
  const broadcast = { postMessage: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() };
  let lastError: { message: string } | undefined;
  const adapter = createChromeStorageAdapter(storage, broadcast, () => lastError);
  return { storage, broadcast, adapter, fail: (message: string) => { lastError = { message }; } };
}

test("storage read errors reject instead of returning an empty dashboard", async () => {
  const { adapter, storage, fail } = storageFixture();
  fail("Read denied");
  await expect(adapter.load()).rejects.toThrow("Read denied");
  expect(storage.set).not.toHaveBeenCalled();
  expect(storage.remove).not.toHaveBeenCalled();
});

test("failed legacy cleanup prevents a misleading successful save", async () => {
  const { adapter, storage, fail } = storageFixture();
  fail("Remove denied");
  await expect(adapter.save(normalizePersistedState({}))).rejects.toThrow("Remove denied");
  expect(storage.set).not.toHaveBeenCalled();
});

test("write errors are checked inside the Chrome callback", async () => {
  const { adapter, storage, fail } = storageFixture();
  storage.set.mockImplementation((_value, callback) => { fail("QUOTA_BYTES exceeded"); callback?.(); });
  await expect(adapter.save(normalizePersistedState({}))).rejects.toThrow("QUOTA_BYTES exceeded");
});
