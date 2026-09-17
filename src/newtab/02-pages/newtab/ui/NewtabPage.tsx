import React, { useCallback, useRef, useState } from "react";
import cn from "clsx";
import { Bookmarks } from "@/newtab/03-widgets/dashboard/Bookmarks/Bookmarks";
import { Sidebar } from "@/newtab/03-widgets/sidebar/Sidebar/Sidebar";
import { Notification } from "@/newtab/03-widgets/ui/Notification/Notification";
import { ImportBookmarksFromSettings } from "@/newtab/04-features/bookmarks-import/ui/ImportBookmarksFromSettings";
import { KeyboardAndMouseManager } from "@/newtab/01-app/ui/KeyboardAndMouseManager";
import { SearchInput } from "@/newtab/04-features/bookmark-search/ui/SearchInput";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import styles from "./NewtabPage.module.scss";

type NewtabPageProps = {
  page: "default" | "import";
  sidebarCollapsed: boolean;
};

/** Композиция newtab-страницы; lifecycle и инициализация остаются в app. */
export function NewtabPage({
  page,
  sidebarCollapsed,
}: NewtabPageProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const setSearch = useUiStore((state) => state.setSearch);

  const openSearch = useCallback(() => {
    if (searchOpen) {
      searchInputRef.current?.focus();
    } else {
      setSearchOpen(true);
    }
  }, [searchOpen]);
  const closeSearch = useCallback(() => {
    searchInputRef.current?.blur();
    setSearchOpen(false);
    setSearch("");
  }, [setSearch]);

  return (
    <div className={cn("app", { "collapsible-sidebar": sidebarCollapsed })}>
      <Notification />
      {page === "import" ? <ImportBookmarksFromSettings /> : null}
      {page === "default" ? (
        <>
          {searchOpen ? (
            <div className={styles.searchPanel}>
              <SearchInput inputRef={searchInputRef} onEscape={closeSearch} />
            </div>
          ) : null}
          <div className={styles.workspace}>
            <Sidebar />
            <div className={styles.mainColumn}>
              <Bookmarks />
            </div>
          </div>
          <KeyboardAndMouseManager
            searchOpen={searchOpen}
            onOpenSearch={openSearch}
            onCloseSearch={closeSearch}
          />
        </>
      ) : null}
    </div>
  );
}
