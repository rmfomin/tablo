import React, { useRef, useState } from "react";
import MenuIcon from "./icons/menu.svg";
import { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import cn from "clsx";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { SimpleEditableTitle } from "@/newtab/03-widgets/ui/EditableTitle/EditableTitle";
import { DropdownMenu } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";
import { importSpaceFromJsonWithCallback } from "@/newtab/04-features/bookmarks-import/model/dashboardImportExport";
import { onExportSpaceJson } from "@/newtab/04-features/bookmarks-export/model/dashboardExport";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import styles from "./SpacesList.module.scss";

export function SpacesList() {
  const spaces = useDashboardStore((state) => state.spaces);
  const currentSpaceId = useDashboardStore((state) => state.currentSpaceId);
  const setCurrentSpace = useDashboardStore((state) => state.selectSpace);
  const createSpace = useDashboardStore((state) => state.createSpace);
  const updateSpace = useDashboardStore((state) => state.updateSpace);
  const deleteDashboardSpace = useDashboardStore((state) => state.deleteSpace);
  const itemInEdit = useUiStore((state) => state.itemInEdit);
  const setItemInEdit = useUiStore((state) => state.setItemInEdit);
  const showNotification = useUiStore((state) => state.showNotification);
  const importSpaceInputRef = useRef<HTMLInputElement>(null);

  const [menuSpaceId, setMenuSpaceId] = useState(-1);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const setEditingSpaceId = (spaceId: number | undefined) => {
    setItemInEdit(spaceId);
  };

  const onSpaceClick = (spaceId: number) => {
    setCurrentSpace(spaceId);
  };

  const onSaveNewSpaceTitle = (spaceId: number, title: string) => {
    updateSpace(spaceId, { title });
    setEditingSpaceId(undefined);
  };

  const onSpaceTitleElementUnmount = () => {
    setEditingSpaceId(undefined);
  };

  const onRenameSpace = (spaceId: number) => {
    setMenuSpaceId(-1);
    setEditingSpaceId(spaceId);
  };

  const onExportSpace = (space: SpaceV3) => {
    setMenuSpaceId(-1);
    onExportSpaceJson(space);
  };

  const deleteSpace = (space: SpaceV3) => {
    const bookmarksCount = collectBookmarksV3([space]).length;
    let res = true;
    if (bookmarksCount > 0) {
      res = confirm(`Delete the space '${space.title}'?`);
    }
    if (res) {
      deleteDashboardSpace(space.id);
    }
  };

  const onAddSpace = () => {
    setShowActionsMenu(false);
    const spaceId = Date.now() + Math.round(Math.random() * 10_000_000);
    createSpace({ id: spaceId, title: "New space" });
    setCurrentSpace(spaceId);

    setEditingSpaceId(spaceId);
  };

  const onImportSpaceClick = () => {
    setShowActionsMenu(false);
    importSpaceInputRef.current?.click();
  };

  return (
    <div className={styles.root}>
      {!itemInEdit && (
        <div className={styles.actions}>
          <input
            ref={importSpaceInputRef}
            type="file"
            accept=".json,application/json"
            className={styles.importInput}
            onChange={(event) => importSpaceFromJsonWithCallback(
              event,
              spaces,
              (space) => {
                createSpace({ id: space.id, title: space.title, position: space.position });
                // createSpace создаёт пустой space; импортированное дерево нужно
                // положить целиком через hydrate-подобное обновление ниже.
                updateSpace(space.id, { folders: space.folders });
                setCurrentSpace(space.id);
                showNotification({ message: "Space has been imported" });
              },
              (message) => showNotification({ message, isError: true }),
            )}
          />
          {showActionsMenu && (
            <DropdownMenu
              onClose={() => setShowActionsMenu(false)}
              className={"dropdown-menu--folder"}
              offset={{ top: 40 }}
            >
              <button
                className="dropdown-menu__button focusable"
                onClick={onAddSpace}
              >
                Create new space
              </button>
              <button
                className="dropdown-menu__button focusable"
                onClick={onImportSpaceClick}
              >
                Import space
              </button>
            </DropdownMenu>
          )}
          <button
            type="button"
            className={styles.menuButton}
            onClick={() => setShowActionsMenu(!showActionsMenu)}
            title="Spaces menu"
          >
            <MenuIcon />
          </button>
        </div>
      )}
      <div className={styles.spacesList} data-role={DOM_ROLE.spacesList}>
        {spaces.length === 0 && (
          <span style={{ padding: "8px" }}>no spaces</span>
        )}
        {spaces.map((space) => {
          return (
            <span
              key={space.id}
              className={cn(styles.item, {
                [styles.active]: space.id === currentSpaceId,
              })}
              data-role={DOM_ROLE.spaceItem}
              onClick={() => onSpaceClick(space.id)}
              onDoubleClick={() => setEditingSpaceId(space.id)}
              data-position={space.position}
              data-space-id={space.id}
            >
              <SimpleEditableTitle
                inEdit={space.id === itemInEdit}
                onContextMenu={() => setMenuSpaceId(space.id)}
                value={space.title || "untitled"}
                onSave={(title) => onSaveNewSpaceTitle(space.id, title)}
                onUnmount={onSpaceTitleElementUnmount}
              />
              {space.id === itemInEdit && spaces.length > 1 && (
                <button
                  className={styles.deleteButton}
                  data-role={DOM_ROLE.spaceDelete}
                  title="Delete space"
                  onMouseDown={() => deleteSpace(space)}
                ></button>
              )}
              {menuSpaceId === space.id && (
                <DropdownMenu
                  onClose={() => {
                    setMenuSpaceId(-1);
                  }}
                  className={"dropdown-menu--folder"}
                  offset={{ top: 2, left: -16 }}
                >
                  <button
                    className="dropdown-menu__button focusable"
                    onClick={() => onRenameSpace(space.id)}
                  >
                    Rename space
                  </button>
                  <button
                    className="dropdown-menu__button focusable"
                    onClick={() => onExportSpace(space)}
                  >
                    Export space
                  </button>
                  {spaces.length > 1 && (
                    <button
                      className="dropdown-menu__button dropdown-menu__button--dander focusable"
                      onClick={() => deleteSpace(space)}
                    >
                      <span>Delete space</span>
                    </button>
                  )}
                </DropdownMenu>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
