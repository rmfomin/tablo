import React, { useEffect, useRef, useState } from "react";
import cn from "clsx";
import styles from "./Bookmarks.module.scss";
import {
  blurSearch,
  isTargetSupportsDragAndDrop,
} from "@/newtab/helpers/utils";
import { bindDADItemEffect } from "@/newtab/feature/dragging";
import { Folder } from "@/newtab/components/common/Folder/Folder";
import { NewFolderPlaceholder } from "@/newtab/components/common/Folder/NewFolderPlaceholder";
import { handleBookmarksKeyDown } from "@/newtab/helpers/handleBookmarksKeyDown";
import { findBookmarkItem } from "@/newtab/state/dashboard/itemUtils";
import { TopBar } from "@/newtab/components/common/TopBar/TopBar";
import { DOM_ROLE } from "@/newtab/helpers/domRoles";
import { useAreaSelection } from "./useAreaSelection";
import { useBookmarksScreen } from "@/newtab/feature/bookmarks/useBookmarksScreen";

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
  const [mouseDownEvent, setMouseDownEvent] = useState<
    React.MouseEvent | undefined
  >(undefined);
  const [isScrolled, setIsScrolled] = useState(false);

  const bookmarksRef = useRef<HTMLDivElement>(null);
  const {
    onMouseDown: onAreaSelectionMouseDown,
    selectionRect,
  } = useAreaSelection({
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

  useEffect(() => {
    if (mouseDownEvent) {
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

        setMouseDownEvent(undefined);
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

        setMouseDownEvent(undefined);
      };
      const onCancel = () => {
        setMouseDownEvent(undefined);
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
      return bindDADItemEffect(
        mouseDownEvent,
        {
          isFolderItem: true,
          onDrop: onDropItems,
          onCancel,
          onClick,
          onDragStarted: canDrag,
        },
        {
          selectedItemIds,
          clearSelectedItemIds,
        },
        {
          onDrop: onDropFolder,
          onCancel,
          onChangeSpace,
          onDragStarted: canDrag,
        },
        {
          onChangeSpacePosition,
          canSortSpaces: () => spaces.length > 1,
        }
      );
    }
  }, [mouseDownEvent, selectedItemIds, clearSelectedItemIds]);

  function onMouseDown(e: React.MouseEvent) {
    blurSearch(e);
    if (onAreaSelectionMouseDown(e)) {
      return;
    }
    if (isTargetSupportsDragAndDrop(e)) {
      setMouseDownEvent(e);
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
      chrome.tabs.create({ url: item.url, active: false });
      return;
    }
    const openedTab = tabs.find((tab) => tab.url === item.url);
    if (openedTab?.id) {
      chrome.tabs.update(openedTab.id, { active: true });
      chrome.windows.update(openedTab.windowId, { focused: true });
      return;
    }
    chrome.tabs.getCurrent((tab) => {
      if (openBookmarksInNewTab) {
        chrome.tabs.create({ url: item.url, active: true });
      } else if (tab?.id) {
        chrome.tabs.update(tab.id, { url: item.url });
      }
    });
  }

  const { folders, folderProps } = screen;
  const { onCreateFolder } = screen.commands;

  return (
    <div
      className={cn(styles.bookmarksBox, {
        [styles.withCollapsedSidebar]: screen.sidebarCollapsed,
      })}
      onMouseDown={onMouseDown}
    >
      <TopBar isScrolled={isScrolled} />
      <div
        className={styles.bookmarks}
        data-role={DOM_ROLE.bookmarks}
        ref={bookmarksRef}
        onKeyDown={(event) =>
          handleBookmarksKeyDown(event, { spaces }, openFolderItem)
        }
      >
        {folders.map((folder) => (
          <Folder
            key={folder.id}
            folder={folder}
            {...folderProps}
          />
        ))}

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

        {screen.showNewFolderPlaceholder ? (
          <NewFolderPlaceholder onCreate={onCreateFolder} />
        ) : screen.showNoBookmarksFound ? (
          <div className={styles.noBookmarksFound}>No bookmarks found</div>
        ) : null}
      </div>
    </div>
  );
}
