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
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
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
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import { useAreaSelection } from "@/newtab/04-features/area-selection/ui/useAreaSelection";
import { useBookmarksScreen } from "@/newtab/04-features/bookmarks/model/useBookmarksScreen";

import { QuickGroups } from "./QuickGroups";

let __prevCurrentSpaceId: number | undefined = undefined;
let __prevSearch: string | undefined = undefined;

function updateMasonryLayout(grid: HTMLDivElement, alignFolderRows: boolean) {
  if (alignFolderRows) {
    Array.from(grid.children).forEach((child) => {
      (child as HTMLElement).style.gridRowEnd = "";
    });
    return;
  }

  const gridStyles = getComputedStyle(grid);
  const rowHeight = Number.parseFloat(gridStyles.gridAutoRows);
  const itemGap = Number.parseFloat(gridStyles.columnGap);

  if (!rowHeight) return;

  Array.from(grid.children).forEach((child) => {
    const item = child as HTMLElement;
    const itemHeight = item.getBoundingClientRect().height;
    const rowSpan = Math.ceil((itemHeight + itemGap) / rowHeight);
    item.style.gridRowEnd = `span ${rowSpan}`;
  });
}

export function Bookmarks() {
  const {
    screen,
    alignFolderRows,
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
    showNotUsed,
    openBookmarksInNewTab,
    tabs,
  } = useBookmarksScreen();
  const dragCleanupRef = useRef<() => void>();
  const bookmarksRef = useRef<HTMLDivElement>(null);
  const folderGridRef = useRef<HTMLDivElement>(null);
  const [availableColumns, setAvailableColumns] = useState(3);
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
    showNotUsed,
  ]);

  useEffect(() => {
    return () => dragCleanupRef.current?.();
  }, []);

  useLayoutEffect(() => {
    const grid = folderGridRef.current;
    if (!grid) return;

    const initialColumns = Number(getComputedStyle(grid).getPropertyValue("--folder-grid-columns"));
    if (initialColumns > 0) setAvailableColumns(initialColumns);

    let animationFrame: number | undefined;
    const scheduleLayout = () => {
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
      }
      animationFrame = requestAnimationFrame(() => {
        if (document.body.classList.contains("dragging")) return;
        const columns = Number(getComputedStyle(grid).getPropertyValue("--folder-grid-columns"));
        if (columns > 0) setAvailableColumns(columns);
        updateMasonryLayout(grid, alignFolderRows);
      });
    };
    const resizeObserver = new ResizeObserver(scheduleLayout);
    const observeItems = () => {
      resizeObserver.disconnect();
      resizeObserver.observe(grid);
      Array.from(grid.children).forEach((child) => {
        resizeObserver.observe(child);
      });
      scheduleLayout();
    };
    const mutationObserver = new MutationObserver(observeItems);

    observeItems();
    mutationObserver.observe(grid, { childList: true });
    const onDragState = (event: Event) => {
      if (!(event as CustomEvent<boolean>).detail) scheduleLayout();
    };
    document.addEventListener("tablo-drag-state", onDragState);

    return () => {
      if (animationFrame !== undefined) {
        cancelAnimationFrame(animationFrame);
      }
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("tablo-drag-state", onDragState);
    };
  }, [alignFolderRows]);

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

  return (
    <div
      className={cn(styles.bookmarksBox, {
        [styles.withCollapsedSidebar]: screen.sidebarCollapsed,
      })}
      onMouseDown={onMouseDown}
    >
      <div
        className={styles.bookmarks}
        data-role={DOM_ROLE.bookmarks}
        ref={bookmarksRef}
        onKeyDown={(event) =>
          handleBookmarksKeyDown(event, { spaces }, openFolderItem)
        }
      >
        <div
          className={styles.actions}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {screen.showNewFolderPlaceholder ? (
            <NewFolderPlaceholder onCreate={onCreateFolder} />
          ) : null}
          <QuickGroups
            configs={spaces.find(space => space.id === currentSpaceId)?.quickGroups ?? []}
            currentSpaceId={currentSpaceId}
            onChange={(quickGroups) => updateSpace(currentSpaceId, { quickGroups })}
            showNotification={showNotification}
          />
        </div>
        <div
          className={cn(styles.folderGrid, {
            [styles.folderGridAlignedRows]: alignFolderRows,
          })}
          ref={folderGridRef}
        >
          {folders.map((folder) => (
            <Folder key={folder.id} folder={folder} availableColumns={availableColumns} {...folderProps} />
          ))}
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
