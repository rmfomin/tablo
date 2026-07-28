import React, { useEffect, useState } from "react";
import { BookmarkItemV3, GroupV3, SpaceV3 } from "@/newtab/helpers/types";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import Tab = chrome.tabs.Tab;
import { FolderItem } from "@/newtab/components/common/FolderItem/FolderItem";
import { EditableTitle } from "@/newtab/components/common/EditableTitle/EditableTitle";
import { useDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import cn from "clsx";
import { DropdownMenu } from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import GroupChevronIcon from "./icons/group-chevron.svg";
import { DOM_ROLE } from "@/newtab/helpers/domRoles";
import styles from "./FolderGroup.module.scss";

export const FolderGroup = React.memo(function FolderGroup(p: {
  spaces: SpaceV3[];
  folderId: number;
  group: GroupV3;
  items: BookmarkItemV3[];
  tabs: Tab[];
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
  const [localTitle, setLocalTitle] = useState(p.group.title);

  useEffect(() => {
    setLocalTitle(p.group.title);
  }, [p.group.title]);

  function onToggleCollapsed(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    updateFolderItem(p.group.id, { collapsed: !p.group.collapsed });
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
        chrome.tabs.create({ url: item.url, active: false });
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
    setShowMenu(true);
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
        {showMenu ? (
          <DropdownMenu
            onClose={() => setShowMenu(false)}
            className="dropdown-menu--folder-group"
            offset={{ top: 4, left: 24, bottom: 20 }}
          >
            <button
              className="dropdown-menu__button focusable"
              onClick={onRename}
            >
              Rename
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onOpenAllTabs}
            >
              Open all tabs
            </button>
            <button
              className="dropdown-menu__button dropdown-menu__button--dander focusable"
              onClick={onDelete}
            >
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
