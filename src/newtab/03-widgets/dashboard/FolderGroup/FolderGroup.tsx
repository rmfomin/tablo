import { createTab, updateTab, removeTabs, getCurrentTab, queryTabs, getCurrentWindow, focusWindow, type BrowserTab } from "@/newtab/06-shared/api/chrome/tabs";
import React, { useEffect, useState } from "react";
import { BookmarkItemV3, GroupV3, SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { RecentItem } from "@/newtab/06-shared/api/chrome/history";

import { FolderItem } from "@/newtab/03-widgets/dashboard/FolderItem/FolderItem";
import { EditableTitle } from "@/newtab/03-widgets/ui/EditableTitle/EditableTitle";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import cn from "clsx";
import { DropdownMenu, getPointerPosition } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { DropdownMenuIcon } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon";
import type { Point } from "@/newtab/06-shared/lib/math";
import GroupChevronIcon from "./icons/group-chevron.svg";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import styles from "./FolderGroup.module.scss";

export const FolderGroup = React.memo(function FolderGroup(p: {
  spaces: SpaceV3[];
  folderId: number;
  group: GroupV3;
  items: BookmarkItemV3[];
  count: number;
  tabs: BrowserTab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  search: string;
  itemInEdit: number | undefined;
  hiddenFeatureIsEnabled: boolean;
}) {
  const updateFolderItem = useDashboardStore((state) => state.updateFolderItem);
  const deleteFolderGroup = useDashboardStore(
    (state) => state.deleteFolderGroup
  );
  const setItemInEdit = useUiStore((state) => state.setItemInEdit);
  const isSelected = useUiStore((state) =>
    state.selectedItemIds.includes(p.group.id),
  );
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<Point>();
  const [localTitle, setLocalTitle] = useState(p.group.title);

  useEffect(() => {
    setLocalTitle(p.group.title);
  }, [p.group.title]);

  function onToggleCollapsed(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    updateFolderItem(p.group.id, { collapsed: !p.group.collapsed });
  }

  function onHeaderClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, textarea, .dropdown-menu")) return;

    onToggleCollapsed(e);
  }

  function setEditing(value: boolean) {
    setItemInEdit(value ? p.group.id : undefined);
  }

  function saveGroupTitle(title: string) {
    if (title !== p.group.title) {
      updateFolderItem(p.group.id, { title });
    }
    setEditing(false);
  }

  function onRename() {
    setEditing(true);
    setShowMenu(false);
  }

  function onOpenAllTabs() {
    p.items.forEach((item) => {
      if (!item.archived) {
        createTab({ url: item.url, active: false });
      }
    });

    setShowMenu(false);
  }

  function onDelete() {
    if (confirm(`Delete group '${p.group.title}'?`)) {
      deleteFolderGroup(p.group.id);
    }
    setShowMenu(false);
  }

  function onHeaderContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setMenuPosition(getPointerPosition(e));
    setShowMenu((wasOpen) => !wasOpen);
  }

  return (
    <div
      className={styles.root}
      data-role={DOM_ROLE.folderGroup}
      data-group-id={p.group.id}
      data-selected={isSelected || undefined}
    >
      <div
        className={cn("draggable-item", styles.header)}
        data-role={DOM_ROLE.groupHeader}
        data-id={p.group.id}
        data-folder-id={p.folderId}
        data-group-id={p.group.id}
        data-drop-insert="end"
        onClick={onHeaderClick}
        onContextMenu={onHeaderContextMenu}
        onDragStart={(e) => {
          e.preventDefault();
        }}
      >
        <button
          className={cn(styles.toggle, {
            [styles.toggleCollapsed]: p.group.collapsed,
          })}
          onClick={onToggleCollapsed}
          title={p.group.collapsed ? "Expand group" : "Collapse group"}
        >
          <GroupChevronIcon />
        </button>
        <EditableTitle
          className={styles.title}
          singleLine
          inEdit={p.group.id === p.itemInEdit}
          setEditing={setEditing}
          localTitle={localTitle}
          setLocalTitle={setLocalTitle}
          onSaveTitle={saveGroupTitle}
          search={p.search}
          onDoubleClick={() => setEditing(true)}
        />
        <span className={styles.count}>{p.count}</span>
        {showMenu ? (
          <DropdownMenu
            onClose={() => setShowMenu(false)}
            className="dropdown-menu--folder-group dropdown-menu--context"
            absPosition={menuPosition}
          >
            <button
              className="dropdown-menu__button focusable"
              onClick={onRename}
            >
              <DropdownMenuIcon name="groupRename" />
              Rename
            </button>
            <div className="dropdown-menu__separator" />
            <button
              className="dropdown-menu__button focusable"
              onClick={onOpenAllTabs}
            >
              <DropdownMenuIcon name="openAll" />
              Open all tabs
            </button>
            <div className="dropdown-menu__separator" />
            <button
              className="dropdown-menu__button dropdown-menu__button--dander focusable"
              onClick={onDelete}
            >
              <DropdownMenuIcon name="remove" />
              Delete group
            </button>
          </DropdownMenu>
        ) : null}
      </div>
      <div
        className={styles.items}
        data-role={DOM_ROLE.groupItems}
        data-folder-id={p.folderId}
        data-group-id={p.group.id}
        style={p.group.collapsed ? { display: "none" } : undefined}
      >
        {p.items.map((item) => (
          <FolderItem
            key={item.id}
            spaces={p.spaces}
            item={item}
            inEdit={item.id === p.itemInEdit}
            tabs={p.tabs}
            recentItems={p.recentItems}
            showNotUsed={p.showNotUsed}
            search={p.search}
            hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
          />
        ))}
      </div>
    </div>
  );
});
