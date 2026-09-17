import React from "react";
import { handleSearchKeyDown } from "@/newtab/04-features/bookmarks/model/handleBookmarksKeyDown";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import styles from "./SearchInput.module.scss";

export function SearchInput({
  inputRef,
  onEscape,
}: {
  inputRef: React.Ref<HTMLInputElement>;
  onEscape: () => void;
}) {
  const search = useUiStore((state) => state.search);
  const setSearch = useUiStore((state) => state.setSearch);

  function onSearchChange(event: React.ChangeEvent<HTMLInputElement>) {
    setSearch(event.target.value);
  }

  function onClearSearch() {
    setSearch("");
  }

  return (
    <div className={styles.searchBlock}>
      <div className={styles.searchWrapper}>
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
    </div>
  );
}
