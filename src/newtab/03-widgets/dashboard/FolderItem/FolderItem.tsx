import {
  extractHostname,
  findTabsByURL,
  removeTabs,
  type BrowserTab,
} from "@/newtab/06-shared/api/chrome/tabs";
import React, { useEffect, useState } from "react";
import { BookmarkItemV3, SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { isFolderItemNotUsed } from "@/newtab/04-features/bookmarks/model/bookmarkUsage";
import { EditableTitle } from "@/newtab/03-widgets/ui/EditableTitle/EditableTitle";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import cn from "clsx";
import IconClose from "./icons/close.svg";
import IconMore from "./icons/more.svg";
import { FolderItemMenu } from "@/newtab/03-widgets/dashboard/FolderItemMenu/FolderItemMenu";
import { getBrokenImgSVG, loadFaviconUrl } from "@/newtab/06-shared/api/chrome/favicons";
import { RecentItem } from "@/newtab/06-shared/api/chrome/history";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
import styles from "./FolderItem.module.scss";


export const FolderItem = React.memo(
  (p: {
    spaces: SpaceV3[];
    item: BookmarkItemV3;
    inEdit: boolean;
    tabs: BrowserTab[];
    recentItems: RecentItem[];
    showNotUsed: boolean;
    search: string;
    hiddenFeatureIsEnabled: boolean;
  }) => {
    const updateFolderItem = useDashboardStore((state) => state.updateFolderItem);
    const setItemInEdit = useUiStore((state) => state.setItemInEdit);
    const isSelected = useUiStore((state) =>
      state.selectedItemIds.includes(p.item.id),
    );
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const [localTitle, setLocalTitle] = useState<string>(p.item.title);

    useEffect(() => {
      setLocalTitle(p.item.title);
    }, [p.item.title]);

    function trySaveTitleAndURL(newTitle: string, newUrl?: string) {
      const titleChanged = p.item.title !== newTitle;
      const urlChanged = newUrl && p.item.url !== newUrl;
      if (titleChanged || urlChanged) {
        updateFolderItem(p.item.id, { title: newTitle, url: newUrl ?? p.item.url });

        if (urlChanged) {
          loadFaviconUrl(newUrl).then((faviconUrl) => {
            updateFolderItem(p.item.id, { favIconUrl: faviconUrl });
          });
        }
      }
    }

    function setEditing(val: boolean) {
      setItemInEdit(val ? p.item.id : undefined);
    }

    function onContextMenu(e: React.MouseEvent) {
      setShowMenu(true);
      e.preventDefault();
    }

    function onMenuClick(e: React.MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      setShowMenu((value) => !value);
    }

    function onCloseTab(e: React.MouseEvent) {
      e.preventDefault();
      e.stopPropagation();
      const tabs = findTabsByURL(p.item.url, p.tabs);
      const tabIds = tabs.filter((t) => t.id).map((t) => t.id!);
      removeTabs(tabIds);
    }

    function handleImageError(e: React.SyntheticEvent) {
      const imgElement = e.target as HTMLImageElement;
      imgElement.src = getBrokenImgSVG();
    }

    const folderItemOpened = findTabsByURL(p.item.url, p.tabs).length !== 0;
    const domain = extractHostname(p.item.url);

    return (
      <div
        className={cn(styles.root, {
          [styles.section]: p.item.isSection,
          [styles.selected]: showMenu,
          [styles.archived]: p.item.archived,
        })}
      >
        {showMenu ? (
          <FolderItemMenu
            spaces={p.spaces}
            item={p.item}
            hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
            localTitle={localTitle}
            setLocalTitle={setLocalTitle}
            onSave={trySaveTitleAndURL}
            onClose={() => setShowMenu(false)}
          />
        ) : null}
        <a
          className={cn("draggable-item", styles.inner, {
            [styles.section]: p.item.isSection,
            [styles.opened]: folderItemOpened,
            [styles.withCloseButton]: folderItemOpened,
          })}
          onDragStart={(e) => {
            e.preventDefault();
          }}
          tabIndex={2}
          data-role={DOM_ROLE.folderItem}
          data-id={p.item.id}
          data-selected={isSelected || undefined}
          onClick={(e) => e.preventDefault()}
          title={p.item.url}
          href={p.item.url}
          onContextMenu={onContextMenu}
        >
          <img src={p.item.favIconUrl} alt="" onError={handleImageError} />
          <span className={styles.text}>
            <EditableTitle
              className={cn(styles.title, {
                [styles.notUsed]:
                  p.showNotUsed && isFolderItemNotUsed(p.item, p.recentItems),
              })}
              inEdit={p.inEdit}
              setEditing={setEditing}
              localTitle={localTitle}
              setLocalTitle={setLocalTitle}
              onSaveTitle={trySaveTitleAndURL}
              search={p.search}
            />
            {!p.item.isSection ? (
              <span className={styles.domain}>{domain}</span>
            ) : null}
          </span>
        </a>
        <span className={styles.actions}>
          {folderItemOpened ? (
            <button
              className={cn(styles.closeButton, "stop-dad-propagation")}
              tabIndex={2}
              title="Close tab"
              onClick={onCloseTab}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <IconClose></IconClose>
            </button>
          ) : null}
          <button
            type="button"
            className={cn(styles.menuButton, "stop-dad-propagation")}
            tabIndex={2}
            data-role={DOM_ROLE.folderItemMenu}
            title="Bookmark actions"
            aria-label="Bookmark actions"
            onClick={onMenuClick}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <IconMore />
          </button>
        </span>
      </div>
    );
  },
);
