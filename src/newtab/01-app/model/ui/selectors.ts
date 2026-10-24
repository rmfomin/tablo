import type { UiPreferences, UiStore } from "@/newtab/01-app/model/ui/uiStore";
import { normalizeUiPreferences } from "@/newtab/05-entities/preferences/model/preferences";

/** Селекторы дают компонентам стабильный узкий контракт вместо полного store. */
export function searchStateSelector(state: UiStore) {
  return {
    search: state.search,
    searchFilters: state.searchFilters,
    searchFilterMode: state.searchFilterMode,
  };
}

/** Данные и команды, которыми управляет SearchInput. Использовать с useShallow. */
export function searchControllerSelector(state: UiStore) {
  return {
    ...searchStateSelector(state),
    setSearch: state.setSearch,
    setSearchFilters: state.setSearchFilters,
    setSearchFilterMode: state.setSearchFilterMode,
  };
}

export function persistedPreferencesSelector(state: UiStore): UiPreferences {
  return normalizeUiPreferences(state);
}
