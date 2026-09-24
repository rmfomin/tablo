import React from "react";
import cn from "clsx";
import { handleSearchKeyDown } from "@/newtab/04-features/bookmarks/model/handleBookmarksKeyDown";
import { hasSearch } from "@/newtab/04-features/bookmark-search/model/filters";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { SearchResults } from "./SearchResults";
import styles from "./SearchInput.module.scss";

export function SearchInput({
  inputRef,
  onEscape,
  onResultOpen,
}: {
  inputRef: React.Ref<HTMLInputElement>;
  onEscape: () => void;
  onResultOpen: () => void;
}) {
  const search = useUiStore((state) => state.search);
  const searchFilters = useUiStore((state) => state.searchFilters);
  const useSearchResultsPopup = useUiStore(
    (state) => state.useSearchResultsPopup,
  );
  const setSearch = useUiStore((state) => state.setSearch);
  const searchResultsVisible =
    useSearchResultsPopup && hasSearch(search, searchFilters);

  function onSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function onClearSearch() {
    setSearch("");
  }

  function navigateSearchResults(offset: number) {
    const results = Array.from(
      document.querySelectorAll<HTMLButtonElement>("[data-search-result]"),
    );
    if (results.length === 0) {
      return;
    }

    const currentIndex = results.indexOf(document.activeElement as HTMLButtonElement);
    if (currentIndex === 0 && offset < 0) {
      document.querySelector<HTMLInputElement>("input.search")?.focus();
      return;
    }
    const nextIndex =
      currentIndex === -1
        ? offset > 0
          ? 0
          : results.length - 1
        : (currentIndex + offset + results.length) % results.length;
    results[nextIndex].focus();
  }

  return (
    <div className={styles.searchBlock}>
      <div
        className={cn(styles.searchWrapper, {
          [styles.searchWrapperWithResults]: searchResultsVisible,
        })}
      >
        <input
          ref={inputRef}
          autoFocus
          tabIndex={1}
          className="search"
          type="text"
          placeholder="Search in Tablo"
          value={search}
          onChange={onSearchChange}
          onKeyDown={(event) => {
            if (event.code === "Escape") {
              event.preventDefault();
              event.stopPropagation();
              onEscape();
              return;
            }
            if (searchResultsVisible && event.code === "ArrowDown") {
              event.preventDefault();
              navigateSearchResults(1);
              return;
            }
            if (searchResultsVisible && event.code === "ArrowUp") {
              event.preventDefault();
              navigateSearchResults(-1);
              return;
            }
            handleSearchKeyDown(event, onClearSearch);
          }}
        />
        {search ? (
          <button
            type="button"
            className={styles.clearSearchButton}
            title="Clear search"
            aria-label="Clear search"
            onClick={onClearSearch}
          >
            ×
          </button>
        ) : (
          <span className={styles.shortcutHint}>⌘F</span>
        )}
      </div>
      <SearchResults onOpen={onResultOpen} onNavigate={navigateSearchResults} />
    </div>
  );
}
