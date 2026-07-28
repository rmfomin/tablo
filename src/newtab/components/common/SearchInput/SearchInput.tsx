import React, { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { handleSearchKeyDown } from "@/newtab/helpers/handleBookmarksKeyDown";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import { searchControllerSelector } from "@/newtab/state/ui/selectors";
import IconSearch from "./icons/search.svg";
import IconFilter from "./icons/filter.svg";
import IconClearFilter from "./icons/filter-clear.svg";
import { Modal } from "@/newtab/components/common/Modal/Modal";
import { DropdownMenu } from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import {
  getSearchFilterRegexError,
  SearchFilter,
  SearchFilterMode,
  updateSearchFilter,
} from "@/newtab/helpers/utils";
import cn from "clsx";
import styles from "./SearchInput.module.scss";

const SEARCH_FILTERS_STORAGE_KEY = "customSearchFilters";
const SEARCH_FILTER_MODE_STORAGE_KEY = "customSearchFilterMode";
const LEGACY_HISTORY_FILTERS_STORAGE_KEY = "customHistoryFilters";

function createFilterId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeStoredFilters(value: unknown): SearchFilter[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((filter) => {
      return (
        filter &&
        typeof filter === "object" &&
        typeof filter.title === "string" &&
        typeof filter.pattern === "string" &&
        !getSearchFilterRegexError(filter.pattern)
      );
    })
    .map((filter: SearchFilter) => ({
      id: typeof filter.id === "string" ? filter.id : createFilterId(),
      title: filter.title,
      pattern: filter.pattern,
      enabled: Boolean(filter.enabled),
    }));
}

function loadSearchFilters(callback: (filters: SearchFilter[]) => void) {
  chrome.storage.local.get(
    [SEARCH_FILTERS_STORAGE_KEY, LEGACY_HISTORY_FILTERS_STORAGE_KEY],
    (res) => {
      const storedFilters = res[SEARCH_FILTERS_STORAGE_KEY];
      const legacyFilters = res[LEGACY_HISTORY_FILTERS_STORAGE_KEY];
      callback(normalizeStoredFilters(storedFilters ?? legacyFilters));
    },
  );
}

function normalizeSearchFilterMode(value: unknown): SearchFilterMode {
  return value === "and" ? "and" : "or";
}

function loadSearchFilterMode(callback: (mode: SearchFilterMode) => void) {
  chrome.storage.local.get([SEARCH_FILTER_MODE_STORAGE_KEY], (res) => {
    callback(normalizeSearchFilterMode(res[SEARCH_FILTER_MODE_STORAGE_KEY]));
  });
}

function saveSearchFilters(filters: SearchFilter[]) {
  chrome.storage.local.set({
    [SEARCH_FILTERS_STORAGE_KEY]: filters.map((filter) => ({
      id: filter.id,
      title: filter.title,
      pattern: filter.pattern,
      enabled: Boolean(filter.enabled),
    })),
  });
}

function saveSearchFilterMode(mode: SearchFilterMode) {
  chrome.storage.local.set({
    [SEARCH_FILTER_MODE_STORAGE_KEY]: mode,
  });
}

export function SearchInput() {
  // useShallow предотвращает ререндеры при изменении других полей uiStore
  const {
    search,
    searchFilters,
    searchFilterMode,
    setSearch,
    setSearchFilters,
    setSearchFilterMode,
  } = useUiStore(useShallow(searchControllerSelector));
  const [filtersPanelOpened, setFiltersPanelOpened] = useState(false);
  const [newFilterTitle, setNewFilterTitle] = useState("");
  const [newFilterPattern, setNewFilterPattern] = useState("");
  const [newFilterError, setNewFilterError] = useState("");
  const [filterModalOpened, setFilterModalOpened] = useState(false);
  const [editingFilterId, setEditingFilterId] = useState<string | undefined>(
    undefined,
  );
  const [menuFilterId, setMenuFilterId] = useState<string | undefined>(
    undefined,
  );
  const enabledFiltersCount = searchFilters.reduce(
    (prevVal, filter) => prevVal + (filter.enabled ? 1 : 0),
    0,
  );

  useEffect(() => {
    loadSearchFilters((filters) => {
      setSearchFilters(filters);
    });
    loadSearchFilterMode((searchFilterMode) => {
      setSearchFilterMode(searchFilterMode);
    });
  }, [setSearchFilters, setSearchFilterMode]);

  function onSearchChange(event: React.ChangeEvent) {
    setSearch((event.target as HTMLInputElement).value);
  }

  function onClearSearch() {
    setSearch("");
  }

  function updateFilters(filters: SearchFilter[]) {
    setSearchFilters(filters);
    saveSearchFilters(filters);
  }

  function onFilterClick(filter: SearchFilter) {
    updateFilters(
      searchFilters.map((f) => {
        if (f.id === filter.id) {
          return {
            ...f,
            enabled: !f.enabled,
          };
        }

        return {
          ...f,
          enabled: false,
        };
      }),
    );
  }

  function onClearFilters() {
    updateFilters(
      searchFilters.map((filter) => ({
        ...filter,
        enabled: false,
      })),
    );
  }

  function onToggleFilterMode() {
    const nextSearchFilterMode = searchFilterMode === "or" ? "and" : "or";
    setSearchFilterMode(nextSearchFilterMode);
    saveSearchFilterMode(nextSearchFilterMode);
  }

  function onDeleteFilter(filter: SearchFilter) {
    setMenuFilterId(undefined);
    if (editingFilterId === filter.id) {
      clearFilterForm();
    }
    updateFilters(searchFilters.filter((f) => f.id !== filter.id));
  }

  function onAddFilterClick() {
    clearFilterForm();
    setFilterModalOpened(true);
  }

  function onEditFilter(filter: SearchFilter) {
    setMenuFilterId(undefined);
    setEditingFilterId(filter.id);
    setNewFilterTitle(filter.title);
    setNewFilterPattern(filter.pattern);
    setNewFilterError("");
    setFilterModalOpened(true);
  }

  function clearFilterForm() {
    setEditingFilterId(undefined);
    setNewFilterTitle("");
    setNewFilterPattern("");
    setNewFilterError("");
    setFilterModalOpened(false);
  }

  function onAddFilter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = newFilterTitle.trim();
    const pattern = newFilterPattern.trim();
    if (!title || !pattern) {
      setNewFilterError("Title and regex are required");
      return;
    }

    const regexError = getSearchFilterRegexError(pattern);
    if (regexError) {
      setNewFilterError(regexError);
      return;
    }

    if (editingFilterId) {
      updateFilters(
        updateSearchFilter(searchFilters, editingFilterId, {
          title,
          pattern,
        }),
      );
      clearFilterForm();
      return;
    }

    updateFilters([
      ...searchFilters.map((filter) => ({
        ...filter,
        enabled: false,
      })),
      {
        id: createFilterId(),
        title,
        pattern,
        enabled: true,
      },
    ]);
    clearFilterForm();
  }

  function getFilterLabel(filter: SearchFilter) {
    return filter.title.trim().slice(0, 2).toUpperCase();
  }

  function onFilterContextMenu(
    event: React.MouseEvent<HTMLButtonElement>,
    filter: SearchFilter,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setMenuFilterId(filter.id);
  }

  return (
    <div className={styles.searchBlock}>
      <div className={styles.searchWrapper}>
        <IconSearch className={styles.searchIcon} />

        <input
          tabIndex={1}
          className="search"
          type="text"
          placeholder="Search in Tablo"
          value={search}
          onChange={onSearchChange}
          onKeyDown={(e) => handleSearchKeyDown(e, onClearSearch)}
        />
        <button
          tabIndex={1}
          className={cn(styles.filterToggleButton, {
            [styles.panelOpened]: filtersPanelOpened,
            [styles.accentActive]: enabledFiltersCount > 0,
          })}
          title="Search filters"
          onClick={() => setFiltersPanelOpened(!filtersPanelOpened)}
        >
          <IconFilter />
        </button>
      </div>
      {filtersPanelOpened ? (
        <div className={styles.filterPanel}>
          <button
            className={cn(styles.filterButton, {
              [styles.active]: enabledFiltersCount === 0,
            })}
            title="Disable search filters"
            onClick={onClearFilters}
          >
            <IconClearFilter />
          </button>
          <button
            className={cn(styles.filterModeButton, {
              [styles.active]: searchFilterMode === "and",
            })}
            title="Toggle search/filter mode"
            onClick={onToggleFilterMode}
          >
            {searchFilterMode.toUpperCase()}
          </button>
          {searchFilters.map((filter) => {
            return (
              <div className={styles.filterButtonWrap} key={filter.id}>
                <button
                  className={cn(styles.filterButton, {
                    [styles.accentActive]: filter.enabled,
                    [styles.editingFilter]: editingFilterId === filter.id,
                  })}
                  title={`${filter.title}: /${filter.pattern}/i`}
                  onClick={() => onFilterClick(filter)}
                  onContextMenu={(event) => onFilterContextMenu(event, filter)}
                >
                  <span className={styles.filterLabel}>
                    {getFilterLabel(filter)}
                  </span>
                </button>
                {menuFilterId === filter.id ? (
                  <DropdownMenu
                    onClose={() => setMenuFilterId(undefined)}
                    className="dropdown-menu--folder"
                    offset={{ top: 2, left: -16 }}
                  >
                    <button
                      className="dropdown-menu__button focusable"
                      onClick={() => onEditFilter(filter)}
                    >
                      Edit filter
                    </button>
                    <button
                      className="dropdown-menu__button dropdown-menu__button--dander focusable"
                      onClick={() => onDeleteFilter(filter)}
                    >
                      Delete filter
                    </button>
                  </DropdownMenu>
                ) : null}
              </div>
            );
          })}
          <button
            className={styles.filterButton}
            title="Add search filter"
            onClick={onAddFilterClick}
          >
            <span className={styles.addFilterIcon}>+</span>
          </button>
          {filterModalOpened ? (
            <Modal onClose={clearFilterForm} className={styles.filterModal}>
              <form className={styles.addFilterForm} onSubmit={onAddFilter}>
                <h2 className={styles.filterModalTitle}>
                  {editingFilterId ? "Edit search filter" : "Add search filter"}
                </h2>
                <label className={styles.filterModalLabel}>
                  Name
                  <input
                    className={styles.addFilterInput}
                    placeholder="Register"
                    title="Filter name"
                    value={newFilterTitle}
                    onChange={(event) => {
                      setNewFilterTitle(event.target.value);
                      setNewFilterError("");
                    }}
                    autoFocus
                  />
                </label>
                <label className={styles.filterModalLabel}>
                  Regex
                  <textarea
                    className={styles.addFilterTextarea}
                    placeholder="register\\.do"
                    title="URL regex"
                    value={newFilterPattern}
                    onChange={(event) => {
                      setNewFilterPattern(event.target.value);
                      setNewFilterError("");
                    }}
                  />
                </label>
                {newFilterError ? (
                  <span className={styles.addFilterError}>
                    {newFilterError}
                  </span>
                ) : null}
                <div className={styles.filterModalActions}>
                  <button
                    className={styles.cancelEditBtn}
                    title="Cancel editing"
                    type="button"
                    onClick={clearFilterForm}
                  >
                    Cancel
                  </button>
                  <button
                    className={styles.addFilterBtn}
                    title={editingFilterId ? "Update filter" : "Add filter"}
                    type="submit"
                  >
                    {editingFilterId ? "Save" : "Add"}
                  </button>
                </div>
              </form>
            </Modal>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
