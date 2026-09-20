import {
  createTab,
  updateTab,
  removeTabs,
  queryTabs,
  focusWindow,
  type BrowserTab,
} from "@/newtab/06-shared/api/chrome/tabs";
import React, { useEffect, useRef, useState } from "react";
import cn from "clsx";
import styles from "./Sidebar.module.scss";
import { SidebarOpenTabs } from "@/newtab/03-widgets/sidebar/SidebarOpenTabs/SidebarOpenTabs";
import { isTabloTab } from "@/newtab/06-shared/api/chrome/tabs";
import { getCurrentData } from "@/newtab/06-shared/lib/date";
import {
  blurSearch,
  isTargetSupportsDragAndDrop,
} from "@/newtab/06-shared/lib/dom/html";
import { scrollElementIntoView } from "@/newtab/06-shared/lib/dom/scroll";
import { DropdownMenu, getPointerPosition } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import type { Point } from "@/newtab/06-shared/lib/math";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { useChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import IconSave from "./icons/save.svg";
import ToggleLeftIcon from "@/newtab/06-shared/ui/DropdownMenu/img/toggle-left.svg";
import ToggleRightIcon from "@/newtab/06-shared/ui/DropdownMenu/img/toggle-right.svg";
import IconPanelRightClose from "./icons/panel-right-close.svg";
import IconPanelRightOpen from "./icons/panel-right-open.svg";
import { SpacesList } from "@/newtab/03-widgets/spaces-list/SpacesList/SpacesList";
import { TopBar } from "@/newtab/03-widgets/top-bar/TopBar/TopBar";

import {
  convertTabOrRecentToItem,
  convertTabToItem,
} from "@/newtab/06-shared/api/chrome/tabs";
import { SidebarRecent } from "@/newtab/03-widgets/sidebar/SidebarRecent/SidebarRecent";
import { bindDADItemEffect } from "@/newtab/04-features/dragging";
import { RecentItem } from "@/newtab/06-shared/api/chrome/history";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";

export function Sidebar() {
  const spaces = useDashboardStore((state) => state.spaces);
  const createFolder = useDashboardStore((state) => state.createFolder);
  const createFolderItem = useDashboardStore((state) => state.createFolderItem);
  const search = useUiStore((state) => state.search);
  const searchFilters = useUiStore((state) => state.searchFilters);
  const searchFilterMode = useUiStore((state) => state.searchFilterMode);
  const sidebarCollapsedValue = useUiStore((state) => state.sidebarCollapsed);
  const setSidebarCollapsed = useUiStore((state) => state.setSidebarCollapsed);
  const setItemInEdit = useUiStore((state) => state.setItemInEdit);
  const selectedItemIds = useUiStore((state) => state.selectedItemIds);
  const clearSelectedItemIds = useUiStore(
    (state) => state.clearSelectedItemIds
  );
  const tabs = useChromeRuntimeStore((state) => state.tabs);
  const closeTabs = useChromeRuntimeStore((state) => state.closeTabs);
  const recentItems = useChromeRuntimeStore((state) => state.recentItems);
  const lastActiveTabIds = useChromeRuntimeStore(
    (state) => state.lastActiveTabIds
  );
  const currentWindowId = useChromeRuntimeStore(
    (state) => state.currentWindowId
  );
  const sidebarCollapsed = sidebarCollapsedValue;

  const dragCleanupRef = useRef<() => void>();

  useEffect(() => {
    return () => dragCleanupRef.current?.();
  }, []);

  function startDragAndDrop(mouseDownEvent: React.MouseEvent) {
    dragCleanupRef.current?.();

    // todo technically TabsIds and RecentIds can have collisions
    const onDrop = (
      folderId: number,
      insertBeforeItemId: number | undefined,
      targetTabsOrRecentIds: number[],
      targetGroupId?: number
    ) => {
      const targetTabId = targetTabsOrRecentIds[0]; // we support D&D only single element from sidebar
      let tabOrRecentItem: BrowserTab | RecentItem | undefined = tabs.find(
        (t) => t.id === targetTabId
      );

      if (!tabOrRecentItem) {
        tabOrRecentItem = recentItems.find((hi) => hi.id === targetTabId);
      }

      if (folderId === -1) {
        // we need to create new folder first
        folderId = Date.now() + Math.round(Math.random() * 10_000_000);
        createFolder({ id: folderId });
      }

      if (tabOrRecentItem && tabOrRecentItem.id) {
        // Add existing BrowserTab
        const item = convertTabOrRecentToItem(tabOrRecentItem);
        createFolderItem({
          folderId,
          targetGroupId,
          insertBeforeItemId,
          item,
        });
        setItemInEdit(item.id);
      } else {
        console.error("ERROR: tab not found");
      }
    };
    const onClick = (tabOrRecentId: number) => {
      const tab = tabs.find((t) => t.id === tabOrRecentId);
      if (tab) {
        updateTab(tabOrRecentId, { active: true });
        focusWindow(tab.windowId);
      } else {
        const recent = recentItems.find((ri) => ri.id === tabOrRecentId);
        if (recent && recent.url) {
          createTab({ url: recent.url, active: true });
        }
      }
    };

    dragCleanupRef.current = bindDADItemEffect(
      mouseDownEvent,
      {
        isFolderItem: false,
        onDrop,
        onCancel: () => {},
        onClick,
        onDragStarted: () => true,
      },
      {
        selectedItemIds,
        clearSelectedItemIds,
      }
    );
  }

  function onMouseDown(e: React.MouseEvent) {
    if (e.button === 1 && toggleTabFromSidebar(e)) {
      return;
    }
    if (isTargetSupportsDragAndDrop(e)) {
      blurSearch(e);
      startDragAndDrop(e);
    }
  }

  function toggleTabFromSidebar(e: React.MouseEvent): boolean {
    const target = e.target as HTMLElement;
    const item = target.closest<HTMLElement>(".draggable-item");
    const itemType = item?.dataset.tabOrRecent;
    if (!item || !itemType) {
      return false;
    }

    e.preventDefault();
    e.stopPropagation();

    const itemId = Number(item.dataset.id);
    if (!Number.isFinite(itemId)) {
      return true;
    }

    if (itemType === "tab") {
      const tab = tabs.find((candidate) => candidate.id === itemId);
      if (tab?.id !== undefined) {
        removeTabs(tab.id);
        closeTabs([tab.id]);
      }
      return true;
    }

    const recent = recentItems.find((candidate) => candidate.id === itemId);
    if (!recent?.url) {
      return true;
    }

    const openedTabIds = tabs
      .filter(
        (tab) => tab.url === recent.url || tab.pendingUrl === recent.url,
      )
      .map((tab) => tab.id)
      .filter((tabId): tabId is number => tabId !== undefined);

    if (openedTabIds.length > 0) {
      removeTabs(openedTabIds);
      closeTabs(openedTabIds);
    } else {
      createTab({ url: recent.url, active: false });
    }
    return true;
  }

  function onToggleSidebar() {
    setSidebarCollapsed(!sidebarCollapsedValue);
  }

  const openTabsCount = tabs.filter(
    (tab) => !tab.pinned && !isTabloTab(tab)
  ).length;

  return (
    <div
      className={cn(styles.root, {
        [styles.collapsed]: sidebarCollapsed,
      })}
      data-role={DOM_ROLE.sidebar}
      onMouseDown={onMouseDown}
    >
      {sidebarCollapsed ? (
        <>
          <div className={styles.collapsedHeader}>
            <button
              id="toggle-sidebar-btn"
              className={styles.collapseButton}
              onClick={onToggleSidebar}
              title="Expand panel"
              aria-label="Expand panel"
            >
              <IconPanelRightOpen />
            </button>
          </div>
          <div className={styles.collapsedSettings}>
            <TopBar />
          </div>
        </>
      ) : (
        <>
          <div className={styles.toolbarRow}>
            <button
              id="toggle-sidebar-btn"
              className={styles.collapseButton}
              onClick={onToggleSidebar}
              title="Collapse panel"
              aria-label="Collapse panel"
            >
              <IconPanelRightClose />
            </button>
            <TopBar />
          </div>
          <section className={styles.spacesSection}>
            <SpacesList />
          </section>

          <section className={styles.tabsSection} aria-label="Open tabs">
            <div className={styles.header}>
              <div className={styles.headerActions}>
                <StashButton tabs={tabs} />
              </div>
              <span className={styles.headerText}>Opened</span>
              <span className={styles.tabsCount}>{openTabsCount}</span>
            </div>

            <div className={styles.content}>
              <SidebarOpenTabs
                tabs={tabs}
                spaces={spaces}
                search={search}
                searchFilters={searchFilters}
                searchFilterMode={searchFilterMode}
                lastActiveTabIds={lastActiveTabIds}
                currentWindowId={currentWindowId}
                sidebarCollapsed={false}
              />
            </div>
          </section>
          <SidebarRecent
            search={search}
            searchFilters={searchFilters}
            searchFilterMode={searchFilterMode}
            recentItems={recentItems}
            spaces={spaces}
            sidebarCollapsed={false}
          />
        </>
      )}
    </div>
  );
}

const StashButton = React.memo((props: { tabs: BrowserTab[] }) => {
  const [confirmationOpened, setConfirmationOpened] = useState(false);
  const [menuPosition, setMenuPosition] = useState<Point>();
  const [shouldCloseTabs, setShouldCloseTabs] = useState(true);
  const createFolder = useDashboardStore((state) => state.createFolder);
  const showNotification = useUiStore((state) => state.showNotification);

  const onStashClick = (event: React.MouseEvent) => {
    setMenuPosition(getPointerPosition(event));
    setConfirmationOpened(!confirmationOpened);
  };

  const shelveTabs = () => {
    setConfirmationOpened(false);
    queryTabs({ currentWindow: true }, (tabs) => {
      const tabsToShelve: BrowserTab[] = [];
      tabs.forEach((t) => {
        if (t.id && !t.pinned) {
          if (!isTabloTab(t)) {
            tabsToShelve.push(t);
          }
          if (!t.active && shouldCloseTabs) {
            removeTabs(t.id);
          }
        }
      });

      if (tabsToShelve.length === 0) {
        // probably all the tabs where pinned
        return;
      }

      const items = tabsToShelve.map(convertTabToItem);
      const title = `Saved ${getCurrentData()}`;
      const folderId = Date.now() + Math.round(Math.random() * 10_000_000);
      createFolder({ id: folderId, title, items });
      showNotification({ message: "All Tabs has been saved" });
      scrollElementIntoView(`[data-folder-id="${folderId}"]`);
    });
  };

  const filteredTabs = props.tabs.filter((t) => !t.pinned && !isTabloTab(t));

  return (
    <div className={styles.actionWrap}>
      <button
        className={cn(styles.actionButton, {
          [styles.activeControl]: confirmationOpened,
        })}
        disabled={filteredTabs.length < 1}
        title="Stash open Tabs in the new Folder"
        onClick={onStashClick}
      >
        <IconSave />
      </button>
      {confirmationOpened ? (
        <DropdownMenu
          onClose={() => setConfirmationOpened(false)}
          className="dropdown-menu--context"
          absPosition={menuPosition}
        >
          <div className={styles.stashTitle}>Save all open Tabs to a new Folder</div>
          <button
            type="button"
            className={cn(
              "dropdown-menu__button dropdown-menu__button--with-icon focusable",
              { "dropdown-menu__toggle-button--active": shouldCloseTabs },
            )}
            aria-pressed={shouldCloseTabs}
            onClick={() => setShouldCloseTabs((value) => !value)}
          >
            <span className="dropdown-menu__toggle-icon" aria-hidden="true">
              <ToggleLeftIcon focusable="false" />
              <ToggleRightIcon focusable="false" />
            </span>
            <span>and close all the tabs</span>
          </button>
          <div className="dropdown-menu__separator" />
          <button className="dropdown-menu__button focusable" onClick={shelveTabs}>
            <IconSave className="dropdown-menu__icon" aria-hidden="true" focusable="false" />
            Stash tabs
          </button>
          <button
            className="dropdown-menu__button dropdown-menu__button--dander focusable"
            onClick={() => setConfirmationOpened(false)}
          >
            Cancel
          </button>
        </DropdownMenu>
      ) : null}
    </div>
  );
});
