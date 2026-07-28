import React, { useEffect, useState } from "react";
import { FolderV3, SpaceV3 } from "@/newtab/helpers/types";
import {
  colors,
  DEFAULT_FOLDER_COLOR,
  SearchFilter,
  SearchFilterMode,
  scrollElementIntoView,
} from "@/newtab/helpers/utils";
import {
  DropdownMenu,
  DropdownSubMenu,
} from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import { FolderItem } from "@/newtab/components/common/FolderItem/FolderItem";
import { FolderGroup } from "@/newtab/components/common/FolderGroup/FolderGroup";
import { EditableTitle } from "@/newtab/components/common/EditableTitle/EditableTitle";
import cn from "clsx";
import { useDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import { Color } from "@/newtab/helpers/color";
import MenuIcon from "./icons/menu.svg";
import FolderChevronIcon from "./icons/folder-chevron.svg";
import { getSpacesList } from "@/newtab/helpers/moveToHelpers";
import Tab = chrome.tabs.Tab;
import {
  createNewFolderItem,
  createNewSection,
} from "@/newtab/state/dashboard/itemUtils";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import { getVisibleFolderDisplayItems } from "./getFolderDisplayItems";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";
import styles from "./Folder.module.scss";

export const Folder = React.memo(function Folder(p: {
  spaces: SpaceV3[];
  folder: FolderV3;
  tabs: Tab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  showArchived: boolean;
  search: string;
  searchFilters: SearchFilter[];
  searchFilterMode: SearchFilterMode;
  itemInEdit: undefined | number;
  hiddenFeatureIsEnabled: boolean;
}) {
  const deleteFolder = useDashboardStore((state) => state.deleteFolder);
  const updateFolder = useDashboardStore((state) => state.updateFolder);
  const createFolderItem = useDashboardStore((state) => state.createFolderItem);
  const updateFolderItem = useDashboardStore((state) => state.updateFolderItem);
  const moveFolder = useDashboardStore((state) => state.moveFolder);
  const setCurrentSpace = useDashboardStore((state) => state.selectSpace);
  const setItemInEdit = useUiStore((state) => state.setItemInEdit);
  const showNotification = useUiStore((state) => state.showNotification);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [localColor, setLocalColor] = useState<string | undefined>(undefined);
  const [localTitle, setLocalTitle] = useState<string>(p.folder.title);

  useEffect(() => {
    setLocalTitle(p.folder.title);
  }, [p.folder.title]);

  function onDelete() {
    const archivedItemsCount = p.folder.items.filter((item) => item.archived)
      .length;
    if (archivedItemsCount > 0) {
      const itemsText = archivedItemsCount > 1 ? "items" : "item";
      const res = confirm(
        `Folder contains ${archivedItemsCount} hidden ${itemsText}. Do you still want to delete it?`,
      );
      if (!res) {
        return;
      }
    }

    deleteFolder(p.folder.id);
    showNotification({ message: "Folder has been deleted" });
  }

  function saveFolderTitle(newTitle: string) {
    if (p.folder.title !== newTitle) {
      updateFolder(p.folder.id, { title: newTitle });
    }
    setEditing(false);
  }

  function onArchiveOrRestore() {
    alert(
      "The “Hiding” feature will be deprecated soon due to very low usage.\n" +
        "All previously hidden folders will became visible again.\n" +
        "Sorry for the inconvenience, and thank you for understanding!",
    );

    const newArchiveState = !p.folder.archived;
    updateFolder(p.folder.id, { archived: newArchiveState });

    const message = `Folder has been ${
      newArchiveState ? "hidden" : "restored"
    }`;
    showNotification({ message });
    setShowMenu(false);
  }

  function onAddSection() {
    const newSection = createNewSection();
    createFolderItem({ folderId: p.folder.id, item: newSection });
    setItemInEdit(newSection.id);

    setShowMenu(false);

    scrollElementIntoView(`[data-id="${newSection.id}"]`);
  }

  function onAddBookmark() {
    const newBookmark = createNewFolderItem(undefined, "New bookmark");
    createFolderItem({ folderId: p.folder.id, item: newBookmark });

    requestAnimationFrame(() => {
      const bookmarkElement = document.querySelector(
        `[data-id="${newBookmark.id}"]`,
      );
      const menuButton = bookmarkElement?.parentElement?.querySelector(
        roleSelector(DOM_ROLE.folderItemMenu),
      ) as HTMLButtonElement;
      if (menuButton) {
        menuButton.click();
      }
    });

    setShowMenu(false);

    scrollElementIntoView(`[data-id="${newBookmark.id}"]`);
  }

  function setColorLocally(color: string) {
    setLocalColor(color);
  }

  function setColorConfirmed(color: string) {
    setLocalColor(undefined);
    updateFolder(p.folder.id, { color });
  }

  function onOpenAll() {
    flatFolderDisplayItems.forEach((item) => {
      if (!item.archived && !item.isSection) {
        chrome.tabs.create({ url: item.url, active: false });
      }
    });

    setShowMenu(false);
  }

  function setAllGroupsCollapsed(collapsed: boolean) {
    p.folder.items.forEach((item) => {
      if (item.type === "group" && item.collapsed !== collapsed) {
        updateFolderItem(item.id, { collapsed });
      }
    });

    setShowMenu(false);
  }

  function onCollapseAllGroups() {
    setAllGroupsCollapsed(true);
  }

  function onExpandAllGroups() {
    setAllGroupsCollapsed(false);
  }

  function onRename() {
    setEditing(true);
    setShowMenu(false);
  }

  function onToggleCollapsed(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    updateFolder(p.folder.id, { collapsed: !p.folder.collapsed });
  }

  function setEditing(val: boolean) {
    if (val) {
      setShowMenu(false);
    }
    setItemInEdit(val ? p.folder.id : undefined);
  }

  const visibleFolderDisplayItems = getVisibleFolderDisplayItems(
    p.folder,
    p.search,
    p.searchFilters,
    p.searchFilterMode,
  );
  const flatFolderDisplayItems = visibleFolderDisplayItems.flatMap((item) => {
    if (item.type === "bookmark") {
      return [item.item];
    }

    return item.items;
  });

  const folderItems = flatFolderDisplayItems.filter(
    (item) => p.showArchived || p.search.length > 0 || !item.archived,
  );

  const folderIsEmptyDuringSearch =
    (p.search !== "" || p.searchFilters.some((filter) => filter.enabled)) &&
    folderItems.length === 0;

  const folderClassName = cn(styles.root, {
    [styles.twoColumn]: p.folder.twoColumn,
    [styles.empty]: folderIsEmptyDuringSearch,
  });
  const folderColor = localColor ?? p.folder.color;
  const color = new Color();
  const color2 = new Color();
  color.setColor(localColor ?? p.folder.color ?? DEFAULT_FOLDER_COLOR);
  color.setAlpha(p.folder.archived ? 0.2 : 1);
  color2.value = { ...color.value };
  color2.setSaturation(color2.value.s + 0.1);
  color2.value.h = color2.value.h + 0.05;
  const folderGradientColor = `linear-gradient(45deg, ${color.getRGBA()}, ${color2.getRGBA()})`;

  const onHeaderContextMenu = (e: React.MouseEvent) => {
    setShowMenu(!showMenu);
    e.preventDefault();
  };

  const moveFolderToSpace = (spaceId: number) => {
    moveFolder({ folderId: p.folder.id, targetSpaceId: spaceId });
    setCurrentSpace(spaceId);
    showNotification({ message: "Folder has been moved" });

    scrollElementIntoView(`[data-folder-id="${p.folder.id}"]`);

    setShowMenu(false);
  };

  return (
    <div
      className={folderClassName}
      data-role={DOM_ROLE.folder}
      data-folder-id={p.folder.id}
    >
      <h2
        style={{
          background: folderIsEmptyDuringSearch
            ? "transparent"
            : folderGradientColor,
          outline: p.folder.archived ? "1px solid rgba(0, 0, 0, 0.3)" : "none",
        }}
        className={cn("draggable-folder", styles.header, styles.dragHandle)}
        onContextMenu={onHeaderContextMenu}
      >
        <button
          className={cn(styles.collapseToggle, {
            [styles.collapseToggleCollapsed]: p.folder.collapsed,
          })}
          onClick={onToggleCollapsed}
          title={p.folder.collapsed ? "Expand folder" : "Collapse folder"}
        >
          <FolderChevronIcon />
        </button>
        <EditableTitle
          className={styles.titleText}
          inEdit={p.folder.id === p.itemInEdit}
          localTitle={localTitle}
          setLocalTitle={setLocalTitle}
          onSaveTitle={saveFolderTitle}
          search={p.search}
          onDoubleClick={() => setEditing(true)}
        />
        {p.folder.archived ? <span> [hidden]</span> : ""}
        {p.folder.id !== p.itemInEdit ? (
          <span
            className={cn(styles.menuButton, {
              [styles.menuButtonVisible]: showMenu,
            })}
            onClick={() => setShowMenu(!showMenu)}
          >
            <MenuIcon />
          </span>
        ) : null}

        {showMenu ? (
          <DropdownMenu
            onClose={() => setShowMenu(false)}
            className={"dropdown-menu--folder"}
            offset={{ top: 5, left: 150, bottom: 38 }}
          >
            <div
              className="dropdown-menu__colors-row"
              style={{ marginTop: "4px" }}
            >
              <PresetColor
                color={PRESET_COLORS[0]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[1]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[2]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[3]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
            </div>
            <div
              className="dropdown-menu__colors-row"
              style={{ marginBottom: "4px" }}
            >
              <PresetColor
                color={PRESET_COLORS[4]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[5]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[6]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <CustomColorInput
                onChange={setColorLocally}
                onBlur={setColorConfirmed}
                currentColor={folderColor}
              />
            </div>
            <button
              className="dropdown-menu__button focusable"
              onClick={onAddBookmark}
            >
              + Add Bookmark
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onAddSection}
            >
              + Add Group
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onOpenAll}
            >
              Open All
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onCollapseAllGroups}
            >
              Collapse all
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onExpandAllGroups}
            >
              Expand All
            </button>
            {p.hiddenFeatureIsEnabled && (
              <button
                className="dropdown-menu__button focusable"
                onClick={onArchiveOrRestore}
              >
                {p.folder.archived ? "Unhide" : "Hide"}
              </button>
            )}
            {p.spaces.length > 1 ? (
              <DropdownSubMenu
                menuId={1}
                title={"Move to space"}
                submenuContent={getSpacesList(
                  p.spaces,
                  moveFolderToSpace,
                  p.spaces.find((space) => (
                    space.folders.some((folder) => folder.id === p.folder.id)
                  ))?.id,
                )}
              />
            ) : null}

            <button
              className="dropdown-menu__button focusable"
              onClick={onRename}
            >
              Rename
            </button>
            <button
              className="dropdown-menu__button dropdown-menu__button--dander focusable"
              onClick={onDelete}
            >
              Delete
            </button>
          </DropdownMenu>
        ) : null}
      </h2>

      {folderItems.length === 0 &&
      !folderIsEmptyDuringSearch &&
      !p.folder.collapsed ? (
        <div className={styles.emptyTip}>
          To add bookmark, drop an item form the sidebar
        </div>
      ) : null}

      <div
        className={styles.items}
        data-role={DOM_ROLE.folderItems}
        data-folder-id={p.folder.id}
        style={p.folder.collapsed ? { display: "none" } : undefined}
      >
        {visibleFolderDisplayItems.map((item) => {
          if (item.type === "bookmark") {
            if (!p.showArchived && p.search.length === 0 && item.item.archived) {
              return null;
            }

            return (
              <FolderItem
                key={item.item.id}
                spaces={p.spaces}
                item={item.item}
                inEdit={item.item.id === p.itemInEdit}
                tabs={p.tabs}
                recentItems={p.recentItems}
                showNotUsed={p.showNotUsed}
                search={p.search}
                hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
              />
            );
          }

          const visibleGroupItems = item.items.filter(
            (groupItem) => p.showArchived || p.search.length > 0 || !groupItem.archived,
          );

          if (p.search !== "" && visibleGroupItems.length === 0) {
            return null;
          }

          return (
            <FolderGroup
              key={item.group.id}
              spaces={p.spaces}
              folderId={p.folder.id}
              group={item.group}
              items={visibleGroupItems}
              tabs={p.tabs}
              recentItems={p.recentItems}
              showNotUsed={p.showNotUsed}
              search={p.search}
              itemInEdit={p.itemInEdit}
              hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
            />
          );
        })}
      </div>
    </div>
  );
});

const PRESET_COLORS = [...colors];
PRESET_COLORS.length = 7;

function PresetColor(p: {
  onClick: (color: string) => void;
  color: string;
  currentColor?: string;
}) {
  const borderColor = window.pSBC(-0.5, p.color);
  const onClick = () => {
    p.onClick(p.color);
  };
  const active = p.color === p.currentColor;
  return (
    <button
      className={"dropdown-menu__preset_color " + (active ? "selected" : "")}
      tabIndex={0}
      onClick={onClick}
    >
      <span style={{ backgroundColor: p.color, borderColor }}></span>
    </button>
  );
}

function CustomColorInput(p: {
  onChange: (color: string) => void;
  onBlur: (color: string) => void;
  currentColor?: string;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onChange(e.target.value);
  };
  const onBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onBlur(e.target.value);
  };

  const active = !PRESET_COLORS.includes(p.currentColor!);
  return (
    <div className={"color-picker-container " + (active ? "selected" : "")}>
      <input
        type="color"
        id="colorInput"
        value={p.currentColor}
        onChange={(e) => onChange(e)}
        onBlur={(e) => onBlur(e)}
      />
      <label htmlFor="colorInput" className="custom-color-picker"></label>
    </div>
  );
}
