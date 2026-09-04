import React from "react";
import cn from "clsx";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import styles from "./Folder.module.scss";

type NewFolderPlaceholderProps = {
  onCreate: () => void;
};

/** Пустая папка — визуальная кнопка создания и drag-and-drop цель. */
export function NewFolderPlaceholder({
  onCreate,
}: NewFolderPlaceholderProps) {
  return (
    <div
      className={cn(styles.root, styles.newFolder)}
      data-role={DOM_ROLE.folder}
      data-folder-id="-1"
      data-folder-new="true"
    >
      <button
        type="button"
        className={styles.newFolderButton}
        onClick={onCreate}
      >
        <span className={styles.newFolderPlus}>+</span>
        New folder
      </button>
      <div
        className={styles.newFolderDropTarget}
        data-role={DOM_ROLE.folderItems}
        data-folder-id="-1"
      />
    </div>
  );
}
