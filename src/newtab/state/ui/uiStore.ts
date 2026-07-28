import { useStore } from "zustand";
import { createStore, type StateCreator, type StoreApi } from "zustand/vanilla";
import type { ColorTheme } from "@/newtab/helpers/types";
import type { SearchFilter, SearchFilterMode } from "@/newtab/helpers/utils";

export type NotificationState = {
  visible: boolean;
  message: string;
  isError?: boolean;
  isLoading?: boolean;
  button?: { onClick?: () => void; text: string };
};

export type NotificationInput = Omit<NotificationState, "visible">;

// Поля, которые сохраняются вместе с dashboard в chrome.storage.local
export type UiPreferences = {
  sidebarCollapsed: boolean;
  openBookmarksInNewTab: boolean;
  colorTheme: ColorTheme;
  showRecent: boolean;
  showArchived: boolean;
  showNotUsed: boolean;
  hiddenFeatureIsEnabled: boolean;
};

export type UiState = UiPreferences & {
  search: string;
  searchFilters: SearchFilter[];
  searchFilterMode: SearchFilterMode;
  selectedItemIds: number[];
  itemInEdit: number | undefined;
  notification: NotificationState;
  page: "default" | "import";
  sidebarHovered: boolean;
};

export type UiActions = {
  setSearch(search: string): void;
  setSearchFilters(searchFilters: SearchFilter[]): void;
  setSearchFilterMode(searchFilterMode: SearchFilterMode): void;
  setSelectedItemIds(itemIds: number[]): void;
  clearSelectedItemIds(): void;
  setItemInEdit(itemInEdit: number | undefined): void;
  showNotification(notification: NotificationInput): void;
  hideNotification(): void;
  setPage(page: UiState["page"]): void;
  setSidebarHovered(sidebarHovered: boolean): void;
  setSidebarCollapsed(sidebarCollapsed: boolean): void;
  setOpenBookmarksInNewTab(openBookmarksInNewTab: boolean): void;
  setColorTheme(colorTheme: ColorTheme): void;
  toggleColorTheme(): void;
  setShowRecent(showRecent: boolean): void;
  setShowArchived(showArchived: boolean): void;
  setShowNotUsed(showNotUsed: boolean): void;
  setHiddenFeatureIsEnabled(hiddenFeatureIsEnabled: boolean): void;
  hydratePreferences(preferences: UiPreferences): void;
};

export type UiStore = UiState & UiActions;

export const defaultUiPreferences: UiPreferences = {
  sidebarCollapsed: false,
  openBookmarksInNewTab: false,
  colorTheme: "system",
  showRecent: false,
  showArchived: false,
  showNotUsed: false,
  hiddenFeatureIsEnabled: false,
};

const defaultUiState: UiState = {
  ...defaultUiPreferences,
  search: "",
  searchFilters: [],
  searchFilterMode: "or",
  selectedItemIds: [],
  itemInEdit: undefined,
  notification: { visible: false, message: "" },
  page: "default",
  sidebarHovered: false,
};

function createUiSlice(initialState: Partial<UiState>): StateCreator<UiStore> {
  return (set) => ({
    ...defaultUiState,
    ...initialState,
    
    setSearch: (search) => set({ search }),
    setSearchFilters: (searchFilters) => set({ searchFilters }),
    setSearchFilterMode: (searchFilterMode) => set({ searchFilterMode }),
    setSelectedItemIds: (itemIds) =>
      set({ selectedItemIds: [...new Set(itemIds)] }),
    clearSelectedItemIds: () => set({ selectedItemIds: [] }),
    setItemInEdit: (itemInEdit) => set({ itemInEdit }),
    showNotification: (notification) =>
      set({ notification: { visible: true, ...notification } }),
    hideNotification: () =>
      set((state) => ({
        notification: { ...state.notification, visible: false },
      })),
    setPage: (page) => set({ page }),
    setSidebarHovered: (sidebarHovered) => set({ sidebarHovered }),
    setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    setOpenBookmarksInNewTab: (openBookmarksInNewTab) =>
      set({ openBookmarksInNewTab }),
    setColorTheme: (colorTheme) => set({ colorTheme }),
    toggleColorTheme: () =>
      set((state) => ({ colorTheme: getNextColorTheme(state.colorTheme) })),
    setShowRecent: (showRecent) => set({ showRecent }),
    setShowArchived: (showArchived) => set({ showArchived }),
    setShowNotUsed: (showNotUsed) => set({ showNotUsed }),
    setHiddenFeatureIsEnabled: (hiddenFeatureIsEnabled) =>
      set({ hiddenFeatureIsEnabled }),

    hydratePreferences: (preferences) => set(preferences),
  });
}

// createStore единообразно для всех трёх store
export function createUiStore(
  initialState: Partial<UiState> = {},
): StoreApi<UiStore> {
  return createStore<UiStore>()(createUiSlice(initialState));
}

function getNextColorTheme(theme: ColorTheme): ColorTheme {
  const themes: ColorTheme[] = ["light", "system", "dark"];
  return themes[(themes.indexOf(theme) + 1) % themes.length];
}

export const uiStore = createUiStore();

export function useUiStore<T>(selector: (state: UiStore) => T): T {
  return useStore(uiStore, selector);
}
