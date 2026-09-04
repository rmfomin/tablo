import React, { useRef, useState } from "react";
import cn from "clsx";
import { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { SimpleEditableTitle } from "@/newtab/03-widgets/ui/EditableTitle/EditableTitle";
import { DropdownMenu } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";
import { importSpaceFromJsonWithCallback } from "@/newtab/04-features/bookmarks-import/model/dashboardImportExport";
import { onExportSpaceJson } from "@/newtab/04-features/bookmarks-export/model/dashboardExport";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import IconNewSpace from "./icons/new-space.svg";
import IconImportSpace from "./icons/import-space.svg";
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

  const setEditingSpaceId = (spaceId: number | undefined) => {
    setItemInEdit(spaceId);
  };

  const onSaveNewSpaceTitle = (spaceId: number, title: string) => {
    updateSpace(spaceId, { title });
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
    const confirmed =
      bookmarksCount === 0 || confirm(`Delete the space '${space.title}'?`);

    if (confirmed) {
      deleteDashboardSpace(space.id);
    }
  };

  const onAddSpace = () => {
    const spaceId = Date.now() + Math.round(Math.random() * 10_000_000);
    createSpace({ id: spaceId, title: "New space" });
    setCurrentSpace(spaceId);
    setEditingSpaceId(spaceId);
  };

  const onImportSpaceClick = () => {
    importSpaceInputRef.current?.click();
  };

  return (
    <section className={styles.root} aria-label="Spaces">
      <div className={styles.sectionHeader}>Spaces</div>

      <div className={styles.actions}>
        <input
          ref={importSpaceInputRef}
          type="file"
          accept=".json,application/json"
          className={styles.importInput}
          onChange={(event) =>
            importSpaceFromJsonWithCallback(
              event,
              spaces,
              (space) => {
                createSpace({
                  id: space.id,
                  title: space.title,
                  position: space.position,
                });
                // createSpace создаёт пустой space; импортированное дерево нужно
                // положить целиком через hydrate-подобное обновление ниже
                updateSpace(space.id, { folders: space.folders });
                setCurrentSpace(space.id);
                showNotification({ message: "Space has been imported" });
              },
              (message) => showNotification({ message, isError: true })
            )
          }
        />
        <button
          type="button"
          className={styles.actionButton}
          onClick={onAddSpace}
          title="Create new space"
        >
          <IconNewSpace />
          <span>New space</span>
        </button>
        <button
          type="button"
          className={styles.actionButton}
          onClick={onImportSpaceClick}
          title="Import space"
        >
          <IconImportSpace />
          <span>Import</span>
        </button>
      </div>

      <div className={styles.spacesList} data-role={DOM_ROLE.spacesList}>
        {spaces.length === 0 ? (
          <span className={styles.empty}>No spaces</span>
        ) : null}
        {spaces.map((space) => (
          <div
            key={space.id}
            className={cn(styles.item, {
              [styles.active]: space.id === currentSpaceId,
            })}
            data-role={DOM_ROLE.spaceItem}
            data-position={space.position}
            data-space-id={space.id}
            onClick={() => setCurrentSpace(space.id)}
            onDoubleClick={() => setEditingSpaceId(space.id)}
            onContextMenu={(event) => {
              event.preventDefault();
              setMenuSpaceId(space.id);
            }}
          >
            <SimpleEditableTitle
              className={styles.itemTitle}
              inEdit={space.id === itemInEdit}
              value={space.title || "untitled"}
              onSave={(title) => onSaveNewSpaceTitle(space.id, title)}
              onUnmount={() => setEditingSpaceId(undefined)}
            />
            {space.id === itemInEdit && spaces.length > 1 ? (
              <button
                type="button"
                className={styles.deleteButton}
                data-role={DOM_ROLE.spaceDelete}
                title="Delete space"
                onMouseDown={() => deleteSpace(space)}
              >
                ×
              </button>
            ) : null}
            {menuSpaceId === space.id ? (
              <DropdownMenu
                onClose={() => setMenuSpaceId(-1)}
                className="dropdown-menu--folder"
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
                {spaces.length > 1 ? (
                  <button
                    className="dropdown-menu__button dropdown-menu__button--dander focusable"
                    onClick={() => deleteSpace(space)}
                  >
                    Delete space
                  </button>
                ) : null}
              </DropdownMenu>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
