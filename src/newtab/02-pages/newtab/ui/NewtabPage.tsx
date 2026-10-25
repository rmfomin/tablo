import React, { useCallback, useEffect, useRef, useState } from "react";
import cn from "clsx";
import { Bookmarks } from "@/newtab/03-widgets/dashboard/Bookmarks/Bookmarks";
import { Sidebar } from "@/newtab/03-widgets/sidebar/Sidebar/Sidebar";
import { Notification } from "@/newtab/03-widgets/ui/Notification/Notification";
import { ImportBookmarksFromSettings } from "@/newtab/04-features/bookmarks-import/ui/ImportBookmarksFromSettings";
import { KeyboardAndMouseManager } from "@/newtab/01-app/ui/KeyboardAndMouseManager";
import { SearchInput } from "@/newtab/04-features/bookmark-search/ui/SearchInput";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import styles from "./NewtabPage.module.scss";
import type { SpaceSearchResult } from "@/newtab/04-features/bookmark-search/model/searchResults";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { BackupReminder } from "@/newtab/03-widgets/ui/BackupReminder/BackupReminder";
import { CanvasPrototype } from "@/newtab/02-pages/canvas/ui/CanvasPrototype";

type NewtabPageProps = {
  page: "default" | "import" | "canvas";
  sidebarCollapsed: boolean;
};

/** Композиция newtab-страницы; lifecycle и инициализация остаются в app. */
export function NewtabPage({
  page,
  sidebarCollapsed,
}: NewtabPageProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchPanelRef = useRef<HTMLDivElement>(null);
  const setSearch = useUiStore((state) => state.setSearch);
  const setSearchNavigationTargetId = useUiStore((state) => state.setSearchNavigationTargetId);
  const selectSpace = useDashboardStore((state) => state.selectSpace);
  const spaces = useDashboardStore((state) => state.spaces);
  const updateFolder = useDashboardStore((state) => state.updateFolder);
  const updateFolderItem = useDashboardStore((state) => state.updateFolderItem);
  const highlightTimeoutRef = useRef<number>();

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

  const navigateToBookmark = useCallback((result: SpaceSearchResult) => {
    selectSpace(result.spaceId);
    const folder = spaces
      .find((space) => space.id === result.spaceId)
      ?.folders.find((candidate) => candidate.id === result.folderId);
    if (folder?.collapsed) {
      updateFolder(result.folderId, { collapsed: false });
    }
    if (result.groupId !== undefined) {
      const group = folder?.items.find((item) => item.id === result.groupId);
      if (group?.type === "group" && group.collapsed) {
        updateFolderItem(result.groupId, { collapsed: false });
      }
    }
    setSearch("");
    setSearchOpen(false);
    setSearchNavigationTargetId(result.bookmarkId);
    if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = window.setTimeout(
      () => setSearchNavigationTargetId(undefined),
      1800,
    );
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(`[data-id="${result.bookmarkId}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }, [selectSpace, spaces, updateFolder, updateFolderItem, setSearch, setSearchNavigationTargetId]);

  useEffect(() => () => {
    if (highlightTimeoutRef.current) window.clearTimeout(highlightTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (!searchOpen) {
      return undefined;
    }

    function onOutsideClick(event: MouseEvent) {
      if (!searchPanelRef.current?.contains(event.target as Node)) {
        closeSearch();
      }
    }

    const listenerTimerId = window.setTimeout(() => {
      document.addEventListener("click", onOutsideClick);
    }, 0);

    return () => {
      window.clearTimeout(listenerTimerId);
      document.removeEventListener("click", onOutsideClick);
    };
  }, [closeSearch, searchOpen]);

  return (
    <div className={cn("app", { "collapsible-sidebar": sidebarCollapsed })}>
      <Notification />
      {page === "default" ? <BackupReminder /> : null}
      {page === "import" ? <ImportBookmarksFromSettings /> : null}
      {page === "canvas" ? <CanvasPrototype /> : null}
      {page === "default" ? (
        <>
          {searchOpen ? (
            <div ref={searchPanelRef} className={styles.searchPanel}>
              <SearchInput
                inputRef={searchInputRef}
                onEscape={closeSearch}
                onResultOpen={closeSearch}
                onBookmarkReveal={navigateToBookmark}
              />
            </div>
          ) : null}
          <div className={styles.workspace}>
            <div className={styles.mainColumn}>
              <Bookmarks />
            </div>
            <Sidebar />
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
