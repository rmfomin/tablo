import {
  createTab,
  updateTab,
  removeTabs,
  getCurrentTab,
  queryTabs,
  getCurrentWindow,
  focusWindow,
  type BrowserTab,
} from "@/newtab/06-shared/api/chrome/tabs";
import React, { useEffect, useRef, useState } from "react";
import cn from "clsx";
import styles from "./Bookmarks.module.scss";
import {
  blurSearch,
  isTargetSupportsDragAndDrop,
} from "@/newtab/06-shared/lib/dom/html";
import { bindDADItemEffect } from "@/newtab/04-features/dragging";
import { Folder } from "@/newtab/03-widgets/dashboard/Folder/Folder";
import { NewFolderPlaceholder } from "@/newtab/03-widgets/dashboard/Folder/NewFolderPlaceholder";
import { handleBookmarksKeyDown } from "@/newtab/04-features/bookmarks/model/handleBookmarksKeyDown";
import { findBookmarkItem } from "@/newtab/05-entities/dashboard/model/itemUtils";
import { hasSearch } from "@/newtab/04-features/bookmark-search/model/filters";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import { useAreaSelection } from "@/newtab/04-features/area-selection/ui/useAreaSelection";
import { useBookmarksScreen } from "@/newtab/04-features/bookmarks/model/useBookmarksScreen";

let __prevCurrentSpaceId: number | undefined = undefined;
let __prevSearch: string | undefined = undefined;

export function Bookmarks() {
  const {
    screen,
    spaces,
    currentSpaceId,
    createFolder,
    moveFolderItems,
    moveFolder,
    setCurrentSpace,
    updateSpace,
    setItemInEdit,
    setPage,
    setSelectedItemIds,
    selectedItemIds,
    clearSelectedItemIds,
    showNotification,
    search,
    searchFilters,
    searchFilterMode,
    showArchived,
    showNotUsed,
    openBookmarksInNewTab,
    tabs,
  } = useBookmarksScreen();
  const [isScrolled, setIsScrolled] = useState(false);
  const dragCleanupRef = useRef<() => void>();

  const bookmarksRef = useRef<HTMLDivElement>(null);
  const { onMouseDown: onAreaSelectionMouseDown, selectionRect } =
    useAreaSelection({
      containerRef: bookmarksRef,
      setSelectedItemIds,
      clearSelectedItemIds,
    });

  useEffect(() => {
    if (__prevCurrentSpaceId !== currentSpaceId || __prevSearch !== search) {
      __prevCurrentSpaceId = currentSpaceId;
      __prevSearch = search;
    }
  }, [currentSpaceId, search]);

  useEffect(() => {
    clearSelectedItemIds();
  }, [
    clearSelectedItemIds,
    currentSpaceId,
    search,
    searchFilters,
    searchFilterMode,
    showArchived,
    showNotUsed,
  ]);

  useEffect(() => {
    return () => dragCleanupRef.current?.();
  }, []);

  function startDragAndDrop(mouseDownEvent: React.MouseEvent) {
    dragCleanupRef.current?.();

    const onDropItems = (
      folderId: number,
      insertBeforeItemId: number | undefined,
      targetsIds: number[],
      targetGroupId?: number
    ) => {
      if (folderId === -1) {
        folderId = Date.now() + Math.round(Math.random() * 10_000_000);
        createFolder({ id: folderId });
      }
      moveFolderItems({
        itemIds: targetsIds,
        targetFolderId: folderId,
        targetGroupId,
        insertBeforeItemId,
      });
    };
    const onDropFolder = (
      folderId: number,
      targetSpaceId: number | undefined,
      insertBeforeFolderId: number | undefined
    ) => {
      moveFolder({
        folderId,
        targetSpaceId: targetSpaceId ?? currentSpaceId,
        insertBeforeFolderId,
      });
    };
    const onClick = (targetId: number) => {
      const meta =
        mouseDownEvent.metaKey ||
        mouseDownEvent.ctrlKey ||
        mouseDownEvent.button === 1;
      openFolderItem(targetId, meta);
    };

    const onChangeSpace = (spaceId: number) => {
      setCurrentSpace(spaceId);
    };

    const onChangeSpacePosition = (spaceId: number, newPosition: string) => {
      updateSpace(spaceId, { position: newPosition });
    };

    const canDrag = () => {
      if (!search) return true;
      showNotification({ message: "Sorting is unavailable in search" });
      return false;
    };

    dragCleanupRef.current = bindDADItemEffect(
      mouseDownEvent,
      {
        isFolderItem: true,
        onDrop: onDropItems,
        onCancel: () => {},
        onClick,
        onDragStarted: canDrag,
      },
      {
        selectedItemIds,
        clearSelectedItemIds,
      },
      {
        onDrop: onDropFolder,
        onCancel: () => {},
        onChangeSpace,
        onDragStarted: canDrag,
      },
      {
        onChangeSpacePosition,
        canSortSpaces: () => spaces.length > 1,
      }
    );
  }

  useEffect(() => {
    const handleScroll = () => {
      if (bookmarksRef.current) {
        setIsScrolled(bookmarksRef.current.scrollTop > 0);
      }
    };

    const bookmarksElement = bookmarksRef.current;
    if (bookmarksElement) {
      bookmarksElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (bookmarksElement) {
        bookmarksElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  function onMouseDown(e: React.MouseEvent) {
    blurSearch(e);
    if (onAreaSelectionMouseDown(e)) {
      return;
    }
    if (isTargetSupportsDragAndDrop(e)) {
      startDragAndDrop(e);
    }
  }

  function openFolderItem(itemId: number, inNewTab: boolean) {
    const item = findBookmarkItem({ spaces }, itemId);
    if (!item) return;
    if (item.isSection) {
      setItemInEdit(item.id);
      return;
    }
    if (item.url === "tablo://import-bookmarks") {
      setPage("import");
      return;
    }
    if (!item.url) {
      showNotification({ message: "Bookmark URL is empty", isError: true });
      return;
    }
    if (inNewTab) {
      createTab({ url: item.url, active: false });
      return;
    }
    const openedTab = tabs.find((tab) => tab.url === item.url);
    if (openedTab?.id) {
      updateTab(openedTab.id, { active: true });
      focusWindow(openedTab.windowId);
      return;
    }
    getCurrentTab((tab) => {
      if (openBookmarksInNewTab) {
        createTab({ url: item.url, active: true });
      } else if (tab?.id) {
        updateTab(tab.id, { url: item.url });
      }
    });
  }

  const { folders, folderProps } = screen;
  const { onCreateFolder } = screen.commands;
  const searchActive = hasSearch(search, searchFilters);

  return (
    <div
      className={cn(styles.bookmarksBox, {
        [styles.withCollapsedSidebar]: screen.sidebarCollapsed,
      })}
      onMouseDown={onMouseDown}
    >
      {searchActive ? (
        <div
          className={cn(styles.workspaceHeader, {
            [styles.scrolled]: isScrolled,
          })}
        >
          <div className={styles.searchResultsHeader}>Search results:</div>
        </div>
      ) : null}
      <div
        className={styles.bookmarks}
        data-role={DOM_ROLE.bookmarks}
        ref={bookmarksRef}
        onKeyDown={(event) =>
          handleBookmarksKeyDown(event, { spaces }, openFolderItem)
        }
      >
        <div className={styles.folderGrid}>
          {folders.map((folder) => (
            <Folder key={folder.id} folder={folder} {...folderProps} />
          ))}
          {screen.showNewFolderPlaceholder ? (
            <NewFolderPlaceholder onCreate={onCreateFolder} />
          ) : null}
        </div>

        {selectionRect ? (
          <div
            data-role={DOM_ROLE.areaSelectionFrame}
            className={styles.areaSelectionFrame}
            style={{
              left: selectionRect.left,
              top: selectionRect.top,
              width: selectionRect.right - selectionRect.left,
              height: selectionRect.bottom - selectionRect.top,
            }}
          />
        ) : null}

        {screen.showNoBookmarksFound ? (
          <div className={styles.noBookmarksFound}>No bookmarks found</div>
        ) : null}
      </div>
    </div>
  );
}
