import {
  createTab,
  createTabGroup,
  updateTab,
  removeTabs,
  getCurrentTab,
  queryTabs,
  getCurrentWindow,
  focusWindow,
  type BrowserTab,
  type TabGroupColor,
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
import {
  DropdownMenu,
  getPointerPosition,
} from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { DropdownMenuIcon } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon";
import type { Point } from "@/newtab/06-shared/lib/math";
import type { QuickGroupV3 } from "@/newtab/05-entities/dashboard/model/types";
import WrenchIcon from "./wrench.svg";
import FolderKanbanIcon from "./folder-kanban.svg";
import { startQuickGroupUrlDrag } from "./startQuickGroupUrlDrag";

const TAB_GROUP_COLORS: Array<{
  value: TabGroupColor;
  label: string;
  preview: string;
}> = [
  { value: "grey", label: "Grey", preview: "#5f6368" },
  { value: "blue", label: "Blue", preview: "#1a73e8" },
  { value: "red", label: "Red", preview: "#d93025" },
  { value: "yellow", label: "Yellow", preview: "#f9ab00" },
  { value: "green", label: "Green", preview: "#188038" },
  { value: "pink", label: "Pink", preview: "#d01884" },
  { value: "purple", label: "Purple", preview: "#a142f4" },
  { value: "cyan", label: "Cyan", preview: "#007b83" },
  { value: "orange", label: "Orange", preview: "#fa903e" },
];

type TabGroupConfig = QuickGroupV3;

function createTabGroupConfig(): QuickGroupV3 {
  return { title: "", color: "blue", urls: [""] };
}

function getTabGroupTitle(config: TabGroupConfig): string {
  const title = config.title.trim();
  if (title) return title;

  const domains = config.urls
    .map((url) => {
      const value = url.trim();
      if (!value) return "";

      try {
        const urlWithProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value)
          ? value
          : `https://${value}`;
        return new URL(urlWithProtocol).hostname.replace(/^www\./i, "");
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return domains.join(" | ") || "New group";
}

function moveTabGroupUrl(
  urls: string[],
  fromIndex: number,
  toIndex: number,
): string[] {
  if (fromIndex === toIndex || !urls[fromIndex]?.trim()) {
    return urls;
  }

  const nextUrls = [...urls];
  const [movedUrl] = nextUrls.splice(fromIndex, 1);
  const lastIndex = nextUrls.length - 1;
  const targetIndex =
    lastIndex >= 0 && !nextUrls[lastIndex].trim()
      ? Math.min(toIndex, lastIndex)
      : toIndex;
  nextUrls.splice(targetIndex, 0, movedUrl);
  return nextUrls;
}

let __prevCurrentSpaceId: number | undefined = undefined;
let __prevSearch: string | undefined = undefined;

function updateMasonryLayout(grid: HTMLDivElement) {
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
  const [openTabGroupMenuIndex, setOpenTabGroupMenuIndex] = useState<number>();
  const [tabGroupMenuPosition, setTabGroupMenuPosition] = useState<Point>();
  const urlDragCleanupRef = useRef<() => void>();
  const persistedTabGroupConfigs = spaces.find(
    (space) => space.id === currentSpaceId,
  )?.quickGroups;
  const tabGroupConfigs =
    persistedTabGroupConfigs ?? [];

  async function openTabGroup(config: TabGroupConfig) {
    const urls = config.urls.map((url) => url.trim()).filter(Boolean);
    if (urls.length === 0) {
      showNotification({
        message: "Add at least one URL to the tab group",
        isError: true,
      });
      return;
    }

    try {
      await createTabGroup(urls, config.title, config.color);
      setOpenTabGroupMenuIndex(undefined);
    } catch (error) {
      console.error("Failed to open the tab group", error);
      showNotification({
        message:
          error instanceof Error
            ? `Could not open the tab group: ${error.message}`
            : "Could not open the tab group",
        isError: true,
      });
    }
  }

  function toggleTabGroupMenu(
    index: number,
    event: React.MouseEvent<HTMLButtonElement>,
  ) {
    setTabGroupMenuPosition(getPointerPosition(event));
    setOpenTabGroupMenuIndex((openIndex) =>
      openIndex === index ? undefined : index,
    );
  }

  function openTabGroupMenuFromContext(
    index: number,
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setTabGroupMenuPosition(getPointerPosition(event));
    setOpenTabGroupMenuIndex(index);
  }

  function updateTabGroupConfig(
    index: number,
    update: (config: TabGroupConfig) => TabGroupConfig,
  ) {
    updateSpace(currentSpaceId, {
      quickGroups: tabGroupConfigs.map((config, configIndex) =>
        configIndex === index ? update(config) : config,
      ),
    });
  }

  function addTabGroup() {
    updateSpace(currentSpaceId, {
      quickGroups: [...tabGroupConfigs, createTabGroupConfig()],
    });
  }

  function removeTabGroup(index: number) {
    updateSpace(currentSpaceId, {
      quickGroups: tabGroupConfigs.filter(
        (_, configIndex) => configIndex !== index,
      ),
    });
    setOpenTabGroupMenuIndex(undefined);
  }

  function updateTabGroupUrl(groupIndex: number, urlIndex: number, value: string) {
    updateTabGroupConfig(groupIndex, (config) => ({
      ...config,
      urls: (() => {
        const urls = config.urls.map((url, index) =>
          index === urlIndex ? value : url,
        );
        if (urlIndex === urls.length - 1 && value.trim()) {
          urls.push("");
        }
        return urls;
      })(),
    }));
  }

  function moveTabGroupUrlInConfig(
    groupIndex: number,
    fromIndex: number,
    toIndex: number,
  ) {
    updateTabGroupConfig(groupIndex, (config) => ({
      ...config,
      urls: moveTabGroupUrl(config.urls, fromIndex, toIndex),
    }));
  }

  function startUrlDrag(
    event: React.MouseEvent<HTMLButtonElement>,
    groupIndex: number,
    urlIndex: number,
  ) {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    urlDragCleanupRef.current?.();
    urlDragCleanupRef.current = startQuickGroupUrlDrag(event, (toIndex) => {
      moveTabGroupUrlInConfig(groupIndex, urlIndex, toIndex);
    });
  }

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

  useEffect(() => {
    return () => urlDragCleanupRef.current?.();
  }, [currentSpaceId, openTabGroupMenuIndex]);

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
        updateMasonryLayout(grid);
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
          <button
            type="button"
            className={styles.addGroupButton}
            title="Add group"
            aria-label="Add group"
            onClick={addTabGroup}
          >
            <FolderKanbanIcon />
          </button>
          {tabGroupConfigs.map((config, groupIndex) => {
            const buttonTitle = getTabGroupTitle(config);
            const isMenuOpen = openTabGroupMenuIndex === groupIndex;

            return (
              <div className={styles.groupActions} key={groupIndex}>
                <div
                  className={cn(styles.groupButton, {
                    [styles.groupButtonActive]: isMenuOpen,
                  })}
                  onContextMenu={(event) =>
                    openTabGroupMenuFromContext(groupIndex, event)
                  }
                >
                  <button
                    type="button"
                    className={styles.groupTitleButton}
                    onClick={() => openTabGroup(config)}
                  >
                    {buttonTitle}
                  </button>
                  <button
                    type="button"
                    className={styles.groupSettingsButton}
                    aria-haspopup="menu"
                    aria-expanded={isMenuOpen}
                    title={`${buttonTitle} settings`}
                    aria-label={`${buttonTitle} settings`}
                    onClick={(event) => toggleTabGroupMenu(groupIndex, event)}
                  >
                    <WrenchIcon />
                  </button>
                </div>
                {isMenuOpen ? (
                  <DropdownMenu
                    width={300}
                    absPosition={tabGroupMenuPosition}
                    className={cn("dropdown-menu--context", styles.groupOptionsMenu)}
                    onClose={() => setOpenTabGroupMenuIndex(undefined)}
                  >
                    <div className={styles.groupColorOptions}>
                      {TAB_GROUP_COLORS.map((color) => {
                        const isSelected = color.value === config.color;
                        return (
                          <button
                            key={color.value}
                            type="button"
                            className={cn(styles.groupColorOption, {
                              [styles.groupColorOptionSelected]: isSelected,
                            })}
                            title={color.label}
                            aria-label={color.label}
                            aria-pressed={isSelected}
                            onClick={() =>
                              updateTabGroupConfig(groupIndex, (current) => ({
                                ...current,
                                color: color.value,
                              }))
                            }
                          >
                            <span style={{ backgroundColor: color.preview }} />
                          </button>
                        );
                      })}
                    </div>
                    <label className="input-label">
                      <span className="input-label__text">Title</span>
                      <textarea
                        className="focusable"
                        autoFocus
                        rows={1}
                        aria-label="Title"
                        value={config.title}
                        onChange={(event) =>
                          updateTabGroupConfig(groupIndex, (current) => ({
                            ...current,
                            title: event.target.value,
                          }))
                        }
                      />
                    </label>
                    <div className={styles.groupUrls}>
                      {config.urls.map((url, urlIndex) => (
                        <div
                          className={styles.groupUrlRow}
                          key={urlIndex}
                        >
                          <button
                            type="button"
                            className={styles.groupUrlDragHandle}
                            disabled={!url.trim()}
                            aria-label={`Move URL ${urlIndex + 1}`}
                            title="Drag to reorder"
                            onMouseDown={(event) =>
                              startUrlDrag(event, groupIndex, urlIndex)
                            }
                          >
                            ⋮⋮
                          </button>
                          <label className="input-label">
                            <span className="input-label__text">URL</span>
                            <textarea
                              className="focusable"
                              rows={1}
                              aria-label={`URL ${urlIndex + 1}`}
                              value={url}
                              onChange={(event) =>
                                updateTabGroupUrl(
                                  groupIndex,
                                  urlIndex,
                                  event.target.value,
                                )
                              }
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="dropdown-menu__separator" />
                    <button
                      type="button"
                      className="dropdown-menu__button dropdown-menu__button--dander focusable"
                      onClick={() => removeTabGroup(groupIndex)}
                    >
                      <DropdownMenuIcon name="remove" />
                      Delete group
                    </button>
                  </DropdownMenu>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className={styles.folderGrid} ref={folderGridRef}>
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
