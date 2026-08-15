import { useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  useDashboardStore,
  type DashboardStore,
} from "@/newtab/state/dashboard/dashboardStore";
import { useUiStore, type UiStore } from "@/newtab/state/ui/uiStore";
import {
  useChromeRuntimeStore,
  type ChromeRuntimeStore,
} from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import {
  buildBookmarksScreenModel,
  type BookmarksScreenModel,
} from "./bookmarksScreenModel";

function bookmarksDashboardSelector(state: DashboardStore) {
  return {
    spaces: state.spaces,
    currentSpaceId: state.currentSpaceId,
    createFolder: state.createFolder,
    moveFolderItems: state.moveFolderItems,
    moveFolder: state.moveFolder,
    setCurrentSpace: state.selectSpace,
    updateSpace: state.updateSpace,
  };
}

function bookmarksUiSelector(state: UiStore) {
  return {
    setItemInEdit: state.setItemInEdit,
    setPage: state.setPage,
    setSelectedItemIds: state.setSelectedItemIds,
    selectedItemIds: state.selectedItemIds,
    clearSelectedItemIds: state.clearSelectedItemIds,
    showNotification: state.showNotification,
    search: state.search,
    searchFilters: state.searchFilters,
    searchFilterMode: state.searchFilterMode,
    showArchived: state.showArchived,
    showNotUsed: state.showNotUsed,
    itemInEdit: state.itemInEdit,
    sidebarCollapsed: state.sidebarCollapsed,
    openBookmarksInNewTab: state.openBookmarksInNewTab,
    hiddenFeatureIsEnabled: state.hiddenFeatureIsEnabled,
  };
}

function bookmarksRuntimeSelector(state: ChromeRuntimeStore) {
  return {
    tabs: state.tabs,
    recentItems: state.recentItems,
  };
}

export function useBookmarksScreen(): {
  screen: BookmarksScreenModel;
  spaces: ReturnType<typeof bookmarksDashboardSelector>["spaces"];
  currentSpaceId: number;
  createFolder: ReturnType<typeof bookmarksDashboardSelector>["createFolder"];
  moveFolderItems: ReturnType<typeof bookmarksDashboardSelector>["moveFolderItems"];
  moveFolder: ReturnType<typeof bookmarksDashboardSelector>["moveFolder"];
  setCurrentSpace: ReturnType<typeof bookmarksDashboardSelector>["setCurrentSpace"];
  updateSpace: ReturnType<typeof bookmarksDashboardSelector>["updateSpace"];
  setItemInEdit: ReturnType<typeof bookmarksUiSelector>["setItemInEdit"];
  setPage: ReturnType<typeof bookmarksUiSelector>["setPage"];
  setSelectedItemIds: ReturnType<typeof bookmarksUiSelector>["setSelectedItemIds"];
  selectedItemIds: number[];
  clearSelectedItemIds: ReturnType<typeof bookmarksUiSelector>["clearSelectedItemIds"];
  showNotification: ReturnType<typeof bookmarksUiSelector>["showNotification"];
  search: string;
  searchFilters: ReturnType<typeof bookmarksUiSelector>["searchFilters"];
  searchFilterMode: ReturnType<typeof bookmarksUiSelector>["searchFilterMode"];
  showArchived: boolean;
  showNotUsed: boolean;
  openBookmarksInNewTab: boolean;
  tabs: ReturnType<typeof bookmarksRuntimeSelector>["tabs"];
} {
  const dashboard = useDashboardStore(useShallow(bookmarksDashboardSelector));
  const ui = useUiStore(useShallow(bookmarksUiSelector));
  const runtime = useChromeRuntimeStore(useShallow(bookmarksRuntimeSelector));
  const onCreateFolder = useCallback(() => {
    const folderId = Date.now() + Math.round(Math.random() * 10_000_000);
    dashboard.createFolder({ id: folderId });
    ui.setItemInEdit(folderId);
  }, [dashboard.createFolder, ui.setItemInEdit]);
  const screen = buildBookmarksScreenModel(
    {
      dashboard: {
        spaces: dashboard.spaces,
        currentSpaceId: dashboard.currentSpaceId,
      },
      ui: {
        search: ui.search,
        searchFilters: ui.searchFilters,
        searchFilterMode: ui.searchFilterMode,
        showArchived: ui.showArchived,
        showNotUsed: ui.showNotUsed,
        itemInEdit: ui.itemInEdit,
        sidebarCollapsed: ui.sidebarCollapsed,
        hiddenFeatureIsEnabled: ui.hiddenFeatureIsEnabled,
      },
      runtime,
    },
    { onCreateFolder },
  );

  return {
    screen,
    spaces: dashboard.spaces,
    currentSpaceId: dashboard.currentSpaceId,
    createFolder: dashboard.createFolder,
    moveFolderItems: dashboard.moveFolderItems,
    moveFolder: dashboard.moveFolder,
    setCurrentSpace: dashboard.setCurrentSpace,
    updateSpace: dashboard.updateSpace,
    setItemInEdit: ui.setItemInEdit,
    setPage: ui.setPage,
    setSelectedItemIds: ui.setSelectedItemIds,
    selectedItemIds: ui.selectedItemIds,
    clearSelectedItemIds: ui.clearSelectedItemIds,
    showNotification: ui.showNotification,
    search: ui.search,
    searchFilters: ui.searchFilters,
    searchFilterMode: ui.searchFilterMode,
    showArchived: ui.showArchived,
    showNotUsed: ui.showNotUsed,
    openBookmarksInNewTab: ui.openBookmarksInNewTab,
    tabs: runtime.tabs,
  };
}
