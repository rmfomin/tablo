import React from "react";
import cn from "clsx";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import styles from "./Folder.module.scss";
import FolderPlusIcon from "./icons/folder-plus.svg";

type NewFolderPlaceholderProps = {
  onCreate: () => void;
};

/** Кнопка создания папки и цель для перетаскивания */
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
        title="Add folder"
        aria-label="Add folder"
        onClick={onCreate}
      >
        <FolderPlusIcon className={styles.newFolderIcon} />
      </button>
      <div
        className={styles.newFolderDropTarget}
        data-role={DOM_ROLE.folderItems}
        data-folder-id="-1"
      />
    </div>
  );
}
