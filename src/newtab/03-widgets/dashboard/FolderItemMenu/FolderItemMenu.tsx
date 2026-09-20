import React, { useEffect, useState } from "react";
import { BookmarkItemV3, SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import {
  DropdownMenu,
  DropdownSubMenu,
} from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { getSelectedItems } from "@/newtab/01-app/model/selection";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { getSpacesWithNestedFoldersList } from "@/newtab/04-features/move-to-folder/ui/moveToHelpers";
import { scrollElementIntoView } from "@/newtab/06-shared/lib/dom/scroll";
import type { Point } from "@/newtab/06-shared/lib/math";
import { DropdownMenuIcon } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon";
import { createTab } from "@/newtab/06-shared/api/chrome/tabs";

export const FolderItemMenu = React.memo(
  (p: {
    spaces: SpaceV3[];
    localTitle: string;
    setLocalTitle: (val: string) => void;
    onSave: (title: string, url: string) => void;
    onClose: () => void;
    item: BookmarkItemV3;
    hiddenFeatureIsEnabled: boolean;
    position?: Point;
  }) => {
    const deleteFolderItems = useDashboardStore((state) => state.deleteFolderItems);
    const updateFolderItem = useDashboardStore((state) => state.updateFolderItem);
    const moveFolderItems = useDashboardStore((state) => state.moveFolderItems);
    const createFolder = useDashboardStore((state) => state.createFolder);
    const createSpace = useDashboardStore((state) => state.createSpace);
    const setCurrentSpace = useDashboardStore((state) => state.selectSpace);
    const showNotification = useUiStore((state) => state.showNotification);
    const setItemInEdit = useUiStore((state) => state.setItemInEdit);
    const [selectedItems, setSelectedItems] = useState<BookmarkItemV3[]>([]);
    const [localURL, setLocalURL] = useState<string>(p.item.url);

    useEffect(() => {
      const items = getSelectedItems();
      if (items.length > 0) {
        setSelectedItems(items);
      } else {
        setSelectedItems([p.item]);
      }
    }, []);

    // support multiple
    function onDeleteItem() {
      deleteFolderItems(selectedItems.map((item) => item.id));
      showNotification({ message: "Bookmark has been deleted" });
    }

    function onCopyUrl() {
      navigator.clipboard.writeText(p.item.url);
      p.onClose();
      showNotification({ message: "URL has been copied" });
    }

    function onOpenAll() {
      selectedItems.forEach((item) => {
        if (!item.isSection && item.url) {
          createTab({ url: item.url, active: false });
        }
      });
      p.onClose();
    }

    // support multiple
    function onArchive() {
      alert(
        "The “Hiding” feature will be deprecated soon due to very low usage.\n" +
          "All previously hidden bookmarks will became visible again.\n" +
          "Sorry for the inconvenience, and thank you for understanding!",
      );
      selectedItems.forEach((item) => updateFolderItem(item.id, { archived: true }));
      showNotification({ message: "Bookmark has been hidden" });
    }

    function onRestore() {
      selectedItems.forEach((item) => updateFolderItem(item.id, { archived: false }));
      showNotification({ message: "Bookmark has been restored" });
    }

    function onSaveAndClose() {
      p.onSave(p.localTitle, localURL);
      p.onClose();
    }

    function onTextAreaKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        onSaveAndClose();
      } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.stopPropagation();
      }
    }

    const moveToFolder = (folderId: number) => {
      moveFolderItems({
        itemIds: selectedItems.map((item) => item.id),
        targetFolderId: folderId,
        insertBeforeItemId: undefined,
      });

      showNotification({ message: "Bookmarks has been moved" });

      scrollElementIntoView(`a[data-id="${p.item.id}"]`);

      p.onClose();
    };

    const moveToNewFolder = (spaceId: number) => {
      const folderId = Date.now() + Math.round(Math.random() * 10_000_000);
      createFolder({ id: folderId, spaceId });
      moveFolderItems({
        itemIds: selectedItems.map((item) => item.id),
        targetFolderId: folderId,
        insertBeforeItemId: undefined,
      });
      showNotification({ message: "Bookmarks has been moved" });

      p.onClose();
    };

    const onCreateSpace = () => {
      const spaceId = Date.now() + Math.round(Math.random() * 10_000_000);
      createSpace({ id: spaceId, title: "New space" });
      setCurrentSpace(spaceId);
      setItemInEdit(spaceId);
      p.onClose();
    };

    return (
      <>
        {selectedItems.length > 1 ? (
          <DropdownMenu
            onClose={p.onClose}
            absPosition={p.position}
            className="dropdown-menu--context"
          >
            <button
              className="dropdown-menu__button focusable"
              onClick={onOpenAll}
            >
              <DropdownMenuIcon name="openAll" />
              Open all
            </button>
            {p.hiddenFeatureIsEnabled ? (
              selectedItems.some((item) => item.archived) ? (
                <button
                  className="dropdown-menu__button focusable"
                  onClick={onRestore}
                >
                  Unhide
                </button>
              ) : (
                <button
                  className="dropdown-menu__button focusable"
                  onClick={onArchive}
                >
                  Hide
                </button>
              )
            ) : null}
            <DropdownSubMenu
              menuId={1}
              title={"Move to"}
              icon="move"
              submenuContent={getSpacesWithNestedFoldersList(
                p.spaces,
                moveToFolder,
                moveToNewFolder,
                p.spaces.flatMap((space) => space.folders).find((folder) => (
                  folder.items.some((item) => item.id === p.item.id || (
                    item.type === "group" && item.groupItems.some((child) => child.id === p.item.id)
                  ))
                ))?.id,
                onCreateSpace,
              )}
            />
            <div className="dropdown-menu__separator" />
            <button
              className="dropdown-menu__button dropdown-menu__button--dander focusable"
              onClick={onDeleteItem}
            >
              <DropdownMenuIcon name="remove" />
              Delete
            </button>
          </DropdownMenu>
        ) : (
          <>
            {p.item.isSection ? (
              <DropdownMenu
                onClose={onSaveAndClose}
                absPosition={p.position}
                className="dropdown-menu--context"
              >
                <label className="input-label">
                  <span className="input-label__text">Title</span>
                  <textarea
                    className="focusable"
                    autoFocus={true}
                    rows={1}
                    aria-label="Title"
                    value={p.localTitle}
                    onChange={(e) => p.setLocalTitle(e.target.value)}
                    onKeyDown={onTextAreaKeyDown}
                  />
                </label>
                <div className="dropdown-menu__separator" />
                {p.hiddenFeatureIsEnabled ? (
                  p.item.archived ? (
                    <button
                      className="dropdown-menu__button focusable"
                      onClick={onRestore}
                    >
                      Unhide
                    </button>
                  ) : (
                    <button
                      className="dropdown-menu__button focusable"
                      onClick={onArchive}
                    >
                      Hide
                    </button>
                  )
                ) : null}
                {p.hiddenFeatureIsEnabled ? (
                  <div className="dropdown-menu__separator" />
                ) : null}
                <button
                  className="dropdown-menu__button dropdown-menu__button--dander focusable"
                  onClick={onDeleteItem}
                >
                  <DropdownMenuIcon name="remove" />
                  Delete
                </button>
              </DropdownMenu>
            ) : (
              <DropdownMenu
                onClose={onSaveAndClose}
                absPosition={p.position}
                width={300}
                className="dropdown-menu--context"
              >
                <label className="input-label">
                  <span className="input-label__text">Title</span>
                  <textarea
                    className="focusable"
                    autoFocus={true}
                    rows={1}
                    aria-label="Title"
                    value={p.localTitle}
                    onChange={(e) => p.setLocalTitle(e.target.value)}
                    onKeyDown={onTextAreaKeyDown}
                  />
                </label>
                <label className="input-label">
                  <span className="input-label__text">URL</span>
                  <textarea
                    className="focusable"
                    rows={1}
                    aria-label="URL"
                    value={localURL}
                    onChange={(e) => setLocalURL(e.target.value)}
                    onKeyDown={onTextAreaKeyDown}
                  />
                </label>
                <div className="dropdown-menu__separator" />
                <button
                  className="dropdown-menu__button focusable"
                  onClick={onCopyUrl}
                >
                  <DropdownMenuIcon name="bookmarkCopy" />
                  Copy URL
                </button>
                {p.hiddenFeatureIsEnabled ? (
                  p.item.archived ? (
                    <button
                      className="dropdown-menu__button focusable"
                      onClick={onRestore}
                    >
                      Unhide
                    </button>
                  ) : (
                    <button
                      className="dropdown-menu__button focusable"
                      onClick={onArchive}
                    >
                      Hide
                    </button>
                  )
                ) : null}
                <DropdownSubMenu
                  menuId={1}
                  title={"Move to"}
                  icon="move"
                  submenuContent={getSpacesWithNestedFoldersList(
                    p.spaces,
                    moveToFolder,
                    moveToNewFolder,
                    p.spaces.flatMap((space) => space.folders).find((folder) => (
                      folder.items.some((item) => item.id === p.item.id || (
                        item.type === "group" && item.groupItems.some((child) => child.id === p.item.id)
                      ))
                    ))?.id,
                    onCreateSpace,
                  )}
                />
                <div className="dropdown-menu__separator" />
                <button
                  className="dropdown-menu__button dropdown-menu__button--dander focusable"
                  onClick={onDeleteItem}
                >
                  <DropdownMenuIcon name="remove" />
                  Delete
                </button>
              </DropdownMenu>
            )}
          </>
        )}
      </>
    );
  },
);
