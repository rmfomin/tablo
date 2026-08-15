Object.defineProperty(global, "__OVERRIDE_NEWTAB", {
  value: false,
  configurable: true,
});

import { normalizePersistedState } from "@/newtab/01-app/model/storage-sync/chromeStorageAdapter";

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
