import React, { useState } from "react";
import {
  extractHostname,
  hlSearch,
  removeUselessProductName,
  scrollElementIntoView,
} from "@/newtab/helpers/utils";
import {
  DropdownMenu,
  DropdownSubMenu,
} from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import cn from "clsx";
import { useDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import {
  convertTabOrRecentToItem,
  isTabData,
  TabOrRecentData,
} from "@/newtab/state/dashboard/itemUtils";
import { SpaceV3 } from "@/newtab/helpers/types";
import IconSaved from "./icons/saved.svg";
import { getFoldersList } from "@/newtab/helpers/moveToHelpers";
import { getBrokenImgSVG } from "@/newtab/helpers/faviconUtils";
import { collectBookmarksV3 } from "@/newtab/helpers/v3Traversal";
import { DOM_ROLE } from "@/newtab/helpers/domRoles";
import styles from "./SidebarItem.module.scss";

export const TabOrRecentItem = (p: {
  data: TabOrRecentData;
  lastActiveTabId: number;
  spaces: SpaceV3[];
  search: string;
  onCloseTab?: (tabId: number) => void;
}) => {
  const createFolderItem = useDashboardStore((state) => state.createFolderItem);
  const createFolder = useDashboardStore((state) => state.createFolder);
  const setCurrentSpace = useDashboardStore((state) => state.selectSpace);
  const setItemInEdit = useUiStore((state) => state.setItemInEdit);
  const showNotification = useUiStore((state) => state.showNotification);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const isTab = isTabData(p.data);

  function getBgColor(tabId?: number): string {
    if (tabId && p.lastActiveTabId === tabId) {
      return "rgba(181, 192, 235, 0.6)";
    } else {
      return "";
    }
  }

  const hideMenu = () => {
    setShowMenu(false);
  };

  const onTabContextMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setShowMenu(true);
  };

  const onMenuCloseClicked = () => {
    if (p.onCloseTab) {
      p.onCloseTab(p.data.id!);
    }
    hideMenu();
  };

  const onMenuCopyClicked = () => {
    navigator.clipboard.writeText(p.data.url ?? "");
    showNotification({ message: "URL has been copied" });
    hideMenu();
  };

  const moveToFolder = (folderId: number, spaceId: number) => {
    const item = convertTabOrRecentToItem(p.data);

    createFolderItem({ folderId, item });
    setItemInEdit(item.id);
    setCurrentSpace(spaceId);

    scrollElementIntoView(`a[data-id="${item.id}"]`);

    hideMenu();
  };

  function handleImageError(e: React.SyntheticEvent) {
    const imgElement = e.target as HTMLImageElement;
    imgElement.src = getBrokenImgSVG();
  }

  const moveToNewFolder = (spaceId: number) => {
    const folderId = Date.now() + Math.round(Math.random() * 10_000_000);
    createFolder({ id: folderId, spaceId });
    moveToFolder(folderId, spaceId);
  };

  const shortenedTitle = removeUselessProductName(p.data.title);
  const domain = isTabData(p.data)
    ? extractHostname(p.data.url)
    : `${extractHostname(p.data.url)}, ${formatDate(
        new Date(p.data.lastVisitTime || 0),
      )}`;
  const savedInFolders = findFoldersTitlesWhereTabSaved(p.data, p.spaces);

  return (
    <div
      key={p.data.id}
      style={{ backgroundColor: getBgColor(p.data.id) }}
      className={cn(styles.item, {
        [styles.active]: showMenu,
        [styles.recentItem]: !isTab,
        "draggable-item": true,
      })}
      data-id={p.data.id}
      onContextMenu={onTabContextMenu}
    >
      <img
        className={styles.icon}
        src={p.data.favIconUrl}
        alt=""
        onError={handleImageError}
      />
      <div className={styles.text}>
        <div
          className={styles.title}
          title={p.data.title}
          dangerouslySetInnerHTML={hlSearch(shortenedTitle, p.search)}
        />
        <div
          className={styles.url}
          title={p.data.url}
          dangerouslySetInnerHTML={hlSearch(domain, p.search)}
        />
        {savedInFolders ? (
          <div
            className={styles.alreadySaved}
            data-role={DOM_ROLE.alreadySaved}
          >
            Already saved in {savedInFolders}
          </div>
        ) : null}
      </div>
      {p.onCloseTab && (
        <div
          onClick={() => p.onCloseTab!(p.data.id!)}
          className={cn(styles.close, {
            "stop-click-propagation2": true,
            "stop-dad-propagation": true,
          })}
          title="Close tab"
        >
          ⨉
        </div>
      )}

      {savedInFolders ? <IconSaved className={styles.savedTabIcon} /> : null}

      {showMenu ? (
        <DropdownMenu
          onClose={hideMenu}
          className="stop-dad-propagation"
          offset={{ top: 8, left: -8 }}
        >
          <button
            className="dropdown-menu__button focusable"
            onClick={onMenuCopyClicked}
          >
            Copy url
          </button>
          {p.spaces.length === 1 ? (
            <DropdownSubMenu
              menuId={1}
              title={"Save to"}
              submenuContent={getFoldersList(
                p.spaces[0],
                moveToFolder,
                moveToNewFolder,
              )}
            />
          ) : (
            p.spaces.map((s) => {
              return (
                <DropdownSubMenu
                  key={s.id}
                  menuId={s.id}
                  title={`Save to "${s.title}"`}
                  submenuContent={getFoldersList(
                    s,
                    moveToFolder,
                    moveToNewFolder,
                  )}
                />
              );
            })
          )}

          {isTab && (
            <button
              className="dropdown-menu__button dropdown-menu__button--dander focusable"
              onClick={onMenuCloseClicked}
            >
              Close tab
            </button>
          )}
        </DropdownMenu>
      ) : null}
    </div>
  );
};

function findFoldersTitlesWhereTabSaved(
  curTab: { url?: string },
  spaces: SpaceV3[],
): string {
  let res: string[] = [];
  spaces.forEach((space) => {
    const titles = space.folders
      .filter((folder) =>
        collectBookmarksV3([{ ...space, folders: [folder] }]).some(
          (item) => item.url === curTab.url,
        ),
      )
      .map((folder) => `«${folder.title}»`);
    res.push(...titles);
  });
  return res.join(", ");
}

function formatDate(d: Date): string {
  const today = new Date();
  const inputDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const todayDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  const diffTime = todayDate.getTime() - inputDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;

  return d.toLocaleDateString();
}
