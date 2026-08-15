import type { FolderV3, SpaceV3 } from "@/newtab/helpers/types";
import type { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import type { SearchFilter, SearchFilterMode } from "@/newtab/helpers/utils";
import { getBookmarksViewState } from "./getBookmarksViewState";
import Tab = chrome.tabs.Tab;

export type BookmarksScreenSnapshot = {
  dashboard: {
    spaces: SpaceV3[];
    currentSpaceId: number;
  };
  ui: {
    search: string;
    searchFilters: SearchFilter[];
    searchFilterMode: SearchFilterMode;
    showArchived: boolean;
    showNotUsed: boolean;
    itemInEdit: number | undefined;
    sidebarCollapsed: boolean;
    hiddenFeatureIsEnabled: boolean;
  };
  runtime: {
    tabs: Tab[];
    recentItems: RecentItem[];
  };
};

export type BookmarksScreenCommands = {
  onCreateFolder: () => void;
};

export type BookmarksFolderProps = {
  spaces: SpaceV3[];
  tabs: Tab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  showArchived: boolean;
  search: string;
  searchFilters: SearchFilter[];
  searchFilterMode: SearchFilterMode;
  itemInEdit: number | undefined;
  hiddenFeatureIsEnabled: boolean;
};

export type BookmarksScreenModel = {
  folders: FolderV3[];
  folderProps: BookmarksFolderProps;
  sidebarCollapsed: boolean;
  showNewFolderPlaceholder: boolean;
  showNoBookmarksFound: boolean;
  commands: BookmarksScreenCommands;
};

export function buildBookmarksScreenModel(
  snapshot: BookmarksScreenSnapshot,
  commands: BookmarksScreenCommands,
): BookmarksScreenModel {
  const { dashboard, ui, runtime } = snapshot;
  const { folders } = getBookmarksViewState({
    spaces: dashboard.spaces,
    currentSpaceId: dashboard.currentSpaceId,
    search: ui.search,
    searchFilters: ui.searchFilters,
    searchFilterMode: ui.searchFilterMode,
    showArchived: ui.showArchived,
  });
  const showNewFolderPlaceholder =
    ui.search === "" && !ui.searchFilters.some((filter) => filter.enabled);

  return {
    folders,
    folderProps: {
      spaces: dashboard.spaces,
      tabs: runtime.tabs,
      recentItems: runtime.recentItems,
      showNotUsed: ui.showNotUsed,
      showArchived: ui.showArchived,
      search: ui.search,
      searchFilters: ui.searchFilters,
      searchFilterMode: ui.searchFilterMode,
      itemInEdit: ui.itemInEdit,
      hiddenFeatureIsEnabled: ui.hiddenFeatureIsEnabled,
    },
    sidebarCollapsed: ui.sidebarCollapsed,
    showNewFolderPlaceholder,
    showNoBookmarksFound: !showNewFolderPlaceholder && folders.length === 0,
    commands,
  };
}
