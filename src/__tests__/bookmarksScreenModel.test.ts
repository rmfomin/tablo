import {
  buildBookmarksScreenModel,
  type BookmarksScreenSnapshot,
} from "@/newtab/04-features/bookmarks/model/bookmarksScreenModel";

function createSnapshot(): BookmarksScreenSnapshot {
  return {
    dashboard: {
      currentSpaceId: 1,
      spaces: [
        {
          id: 1,
          position: "a0",
          objectType: "space",
          title: "Main",
          folders: [
            {
              id: 10,
              position: "a0",
              objectType: "folder",
              title: "Visible folder",
              items: [],
            },
          ],
        },
      ],
    },
    ui: {
      search: "",
      searchFilters: [],
      searchFilterMode: "or",
      showArchived: false,
      showNotUsed: true,
      itemInEdit: 10,
      sidebarCollapsed: true,
      hiddenFeatureIsEnabled: true,
    },
    runtime: {
      tabs: [],
      recentItems: [],
    },
  };
}

test("buildBookmarksScreenModel provides Folder props and empty-screen state from snapshots", () => {
  const onCreateFolder = vi.fn();
  const snapshot = createSnapshot();

  const model = buildBookmarksScreenModel(snapshot, { onCreateFolder });

  expect(model.folders).toEqual([snapshot.dashboard.spaces[0].folders[0]]);
  expect(model.folderProps).toEqual({
    spaces: snapshot.dashboard.spaces,
    tabs: snapshot.runtime.tabs,
    recentItems: snapshot.runtime.recentItems,
    showNotUsed: true,
    showArchived: false,
    search: "",
    searchFilters: [],
    searchFilterMode: "or",
    itemInEdit: 10,
    hiddenFeatureIsEnabled: true,
  });
  expect(model.sidebarCollapsed).toBe(true);
  expect(model.showNewFolderPlaceholder).toBe(true);
  expect(model.showNoBookmarksFound).toBe(false);
  expect(model.commands.onCreateFolder).toBe(onCreateFolder);
});

test("buildBookmarksScreenModel hides creation affordance for an active filter and shows no-results", () => {
  const snapshot = createSnapshot();
  snapshot.ui.searchFilters = [
    { id: "only-work", title: "Work", pattern: "work", enabled: true },
  ];
  snapshot.dashboard.spaces[0].folders = [];

  const model = buildBookmarksScreenModel(snapshot, {
    onCreateFolder: vi.fn(),
  });

  expect(model.showNewFolderPlaceholder).toBe(false);
  expect(model.showNoBookmarksFound).toBe(true);
});
