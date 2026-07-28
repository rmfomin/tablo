import React, { useEffect, useState } from "react";
import { BookmarkItemV3, SpaceV3 } from "@/newtab/helpers/types";
import {
  DropdownMenu,
  DropdownSubMenu,
} from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import { getSelectedItems } from "@/newtab/helpers/selectionUtils";
import { useDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import { getSpacesWithNestedFoldersList } from "@/newtab/helpers/moveToHelpers";
import { scrollElementIntoView } from "@/newtab/helpers/utils";

export const FolderItemMenu = React.memo(
  (p: {
    spaces: SpaceV3[];
    localTitle: string;
    setLocalTitle: (val: string) => void;
    onSave: (title: string, url: string) => void;
    onClose: () => void;
    item: BookmarkItemV3;
    hiddenFeatureIsEnabled: boolean;
  }) => {
    const deleteFolderItems = useDashboardStore((state) => state.deleteFolderItems);
    const updateFolderItem = useDashboardStore((state) => state.updateFolderItem);
    const moveFolderItems = useDashboardStore((state) => state.moveFolderItems);
    const createFolder = useDashboardStore((state) => state.createFolder);
    const showNotification = useUiStore((state) => state.showNotification);
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
    function onOpenNewTab() {
      selectedItems.forEach((item) => {
        if (item.url) {
          chrome.tabs.create({ url: item.url });
        }
      });
      p.onClose();
    }

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

    return (
      <>
        {selectedItems.length > 1 ? (
          <DropdownMenu
            onClose={p.onClose}
            className={"dropdown-menu--folder-item"}
            offset={{ top: 29, bottom: 32 }}
          >
            <button
              className="dropdown-menu__button focusable"
              onClick={onOpenNewTab}
            >
              Open in New Tab
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
              submenuContent={getSpacesWithNestedFoldersList(
                p.spaces,
                moveToFolder,
                moveToNewFolder,
                p.spaces.flatMap((space) => space.folders).find((folder) => (
                  folder.items.some((item) => item.id === p.item.id || (
                    item.type === "group" && item.groupItems.some((child) => child.id === p.item.id)
                  ))
                ))?.id,
              )}
            />
            <button
              className="dropdown-menu__button dropdown-menu__button--dander focusable"
              onClick={onDeleteItem}
            >
              Delete
            </button>
          </DropdownMenu>
        ) : (
          <>
            {p.item.isSection ? (
              <DropdownMenu
                onClose={onSaveAndClose}
                className={
                  "dropdown-menu--folder-item dropdown-menu--folder-section"
                }
                offset={{ top: 35, bottom: 32 }}
              >
                <label className="input-label">
                  <span>Title</span>
                  <input
                    type="text"
                    className="focusable"
                    autoFocus={true}
                    value={p.localTitle}
                    onChange={(e) => p.setLocalTitle(e.target.value)}
                  />
                </label>
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
                <button
                  className="dropdown-menu__button dropdown-menu__button--dander focusable"
                  onClick={onDeleteItem}
                >
                  Delete
                </button>
              </DropdownMenu>
            ) : (
              <DropdownMenu
                onClose={onSaveAndClose}
                className={"dropdown-menu--folder-item"}
                offset={{ top: 29, bottom: 32 }}
                width={334}
              >
                <label className="input-label">
                  <span>Title</span>
                  <input
                    type="text"
                    className="focusable"
                    autoFocus={true}
                    value={p.localTitle}
                    onChange={(e) => p.setLocalTitle(e.target.value)}
                  />
                </label>
                <label className="input-label">
                  <span>URL</span>
                  <input
                    type="text"
                    className="focusable"
                    value={localURL}
                    onChange={(e) => setLocalURL(e.target.value)}
                  />
                </label>
                <button
                  className="dropdown-menu__button focusable"
                  onClick={onOpenNewTab}
                >
                  Open in New Tab
                </button>
                <button
                  className="dropdown-menu__button focusable"
                  onClick={onCopyUrl}
                >
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
                  submenuContent={getSpacesWithNestedFoldersList(
                    p.spaces,
                    moveToFolder,
                    moveToNewFolder,
                    p.spaces.flatMap((space) => space.folders).find((folder) => (
                      folder.items.some((item) => item.id === p.item.id || (
                        item.type === "group" && item.groupItems.some((child) => child.id === p.item.id)
                      ))
                    ))?.id,
                  )}
                />
                <button
                  className="dropdown-menu__button dropdown-menu__button--dander focusable"
                  onClick={onDeleteItem}
                >
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
