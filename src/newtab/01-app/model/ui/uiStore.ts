import { useStore } from "zustand";
import { createStore, type StateCreator, type StoreApi } from "zustand/vanilla";
import type { ColorTheme } from "@/newtab/05-entities/dashboard/model/types";
import type { SearchFilter, SearchFilterMode } from "@/newtab/04-features/bookmark-search/model/filters";
import { defaultBackupReminderIntervalDays, normalizeBackupReminderIntervalDays } from "@/newtab/04-features/backup-reminder/model/settings";

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
  showNotUsed: boolean;
  useSearchResultsPopup?: boolean;
  showGroupBackground?: boolean;
  backupReminderEnabled?: boolean;
  backupReminderIntervalDays?: number;
  lastBackupExportAt?: number;
  backupReminderEnabledAt?: number;
  backupReminderSnoozedUntil?: number;
};

export type UiState = Omit<
  UiPreferences,
  | "useSearchResultsPopup"
  | "showGroupBackground"
  | "backupReminderEnabled"
  | "backupReminderIntervalDays"
> & {
  useSearchResultsPopup: boolean;
  showGroupBackground: boolean;
  search: string;
  searchFilters: SearchFilter[];
  searchFilterMode: SearchFilterMode;
  selectedItemIds: number[];
  itemInEdit: number | undefined;
  notification: NotificationState;
  page: "default" | "import";
  sidebarHovered: boolean;
  faviconRefreshId: number;
  searchNavigationTargetId: number | undefined;
  backupReminderEnabled: boolean;
  backupReminderIntervalDays: number;
  backupReminderVisible: boolean;
  backupReminderEnabledAt?: number;
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
  setShowNotUsed(showNotUsed: boolean): void;
  setUseSearchResultsPopup(useSearchResultsPopup: boolean): void;
  setShowGroupBackground(showGroupBackground: boolean): void;
  refreshFavicons(): void;
  setSearchNavigationTargetId(itemId: number | undefined): void;
  setBackupReminderEnabled(enabled: boolean): void;
  setBackupReminderIntervalDays(days: number): void;
  setBackupReminderVisible(visible: boolean): void;
  setLastBackupExportAt(timestamp: number): void;
  setBackupReminderSnoozedUntil(timestamp: number | undefined): void;
  hydratePreferences(preferences: UiPreferences): void;
};

export type UiStore = UiState & UiActions;

export const defaultUiPreferences: UiPreferences = {
  sidebarCollapsed: false,
  openBookmarksInNewTab: false,
  colorTheme: "system",
  showRecent: false,
  showNotUsed: false,
  useSearchResultsPopup: true,
  showGroupBackground: true,
  backupReminderEnabled: false,
  backupReminderIntervalDays: defaultBackupReminderIntervalDays,
};

const defaultUiState: UiState = {
  ...defaultUiPreferences,
  useSearchResultsPopup: true,
  showGroupBackground: true,
  backupReminderEnabled: false,
  backupReminderIntervalDays: defaultBackupReminderIntervalDays,
  backupReminderVisible: false,
  search: "",
  searchFilters: [],
  searchFilterMode: "or",
  selectedItemIds: [],
  itemInEdit: undefined,
  notification: { visible: false, message: "" },
  page: "default",
  sidebarHovered: false,
  faviconRefreshId: 0,
  searchNavigationTargetId: undefined,
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
    setShowNotUsed: (showNotUsed) => set({ showNotUsed }),
    setUseSearchResultsPopup: (useSearchResultsPopup) =>
      set({ useSearchResultsPopup }),
    setShowGroupBackground: (showGroupBackground) =>
      set({ showGroupBackground }),
    refreshFavicons: () => set((state) => ({ faviconRefreshId: state.faviconRefreshId + 1 })),
    setSearchNavigationTargetId: (searchNavigationTargetId) =>
      set({ searchNavigationTargetId }),
    setBackupReminderEnabled: (backupReminderEnabled) => set((state) => {
      let backupReminderEnabledAt = state.backupReminderEnabledAt;
      if (!backupReminderEnabled) {
        backupReminderEnabledAt = undefined;
      } else if (!state.backupReminderEnabled && !state.lastBackupExportAt) {
        backupReminderEnabledAt = Date.now();
      }
      return { backupReminderEnabled, backupReminderEnabledAt };
    }),
    setBackupReminderIntervalDays: (backupReminderIntervalDays) =>
      set({ backupReminderIntervalDays: normalizeBackupReminderIntervalDays(backupReminderIntervalDays) }),
    setBackupReminderVisible: (backupReminderVisible) => set({ backupReminderVisible }),
    setLastBackupExportAt: (lastBackupExportAt) => set({
      lastBackupExportAt,
      backupReminderEnabledAt: undefined,
    }),
    setBackupReminderSnoozedUntil: (backupReminderSnoozedUntil) =>
      set({ backupReminderSnoozedUntil }),

    hydratePreferences: (preferences) => set({
      ...preferences,
      showGroupBackground: preferences.showGroupBackground !== false,
      backupReminderEnabled: preferences.backupReminderEnabled === true,
      backupReminderIntervalDays: normalizeBackupReminderIntervalDays(preferences.backupReminderIntervalDays),
      lastBackupExportAt: preferences.lastBackupExportAt,
      backupReminderEnabledAt: preferences.backupReminderEnabledAt,
      backupReminderSnoozedUntil: preferences.backupReminderSnoozedUntil,
    }),
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
