import {
  createTab,
  updateTab,
  removeTabs,
  getCurrentTab,
  queryTabs,
  getCurrentWindow,
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
import { DropdownMenu } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { useChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import IconDelDuplicates from "./icons/delete-duplicates.svg";
import IconSave from "./icons/save.svg";
import IconChevron from "./icons/chevron.svg";
import IconTabs from "./icons/tabs.svg";
import IconSpaces from "./icons/spaces.svg";
import { SpacesList } from "@/newtab/03-widgets/spaces-list/SpacesList/SpacesList";

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
  const recentItems = useChromeRuntimeStore((state) => state.recentItems);
  const lastActiveTabIds = useChromeRuntimeStore(
    (state) => state.lastActiveTabIds
  );
  const currentWindowId = useChromeRuntimeStore(
    (state) => state.currentWindowId
  );
  const showRecent = useUiStore((state) => state.showRecent);
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
    if (isTargetSupportsDragAndDrop(e)) {
      blurSearch(e);
      startDragAndDrop(e);
    }
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
      {!sidebarCollapsed ? <SpacesList /> : null}

      <div className={styles.header}>
        {!sidebarCollapsed ? (
          <>
            <span className={styles.headerText}>Open tabs</span>
            <span className={styles.tabsCount}>{openTabsCount}</span>
            <div className={styles.headerActions}>
              <CleanupButton tabs={tabs} />
              <StashButton tabs={tabs} />
            </div>
          </>
        ) : null}
        <button
          id="toggle-sidebar-btn"
          className={cn(styles.collapseButton, {
            [styles.expandedCollapseButton]: !sidebarCollapsed,
          })}
          onClick={onToggleSidebar}
          title={sidebarCollapsed ? "Expand panel" : "Collapse panel"}
          aria-label={sidebarCollapsed ? "Expand panel" : "Collapse panel"}
        >
          <IconChevron />
        </button>
      </div>

      {sidebarCollapsed ? (
        <div className={styles.collapsedNavigation}>
          <button
            type="button"
            className={styles.collapsedSpacesButton}
            title="Spaces"
            aria-label="Spaces"
            onClick={onToggleSidebar}
          >
            <IconSpaces />
          </button>
          <button
            type="button"
            className={styles.collapsedTabsButton}
            title="Open tabs"
            aria-label={`${openTabsCount} open tabs`}
            onClick={onToggleSidebar}
          >
            <IconTabs />
            {openTabsCount > 0 ? (
              <span className={styles.collapsedTabsCount}>{openTabsCount}</span>
            ) : null}
          </button>
        </div>
      ) : (
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
          {(showRecent ||
            search ||
            searchFilters.some((filter) => filter.enabled)) && (
            <SidebarRecent
              search={search}
              searchFilters={searchFilters}
              searchFilterMode={searchFilterMode}
              recentItems={recentItems}
              spaces={spaces}
              sidebarCollapsed={false}
            />
          )}
        </div>
      )}
    </div>
  );
}

const StashButton = React.memo((props: { tabs: BrowserTab[] }) => {
  const [confirmationOpened, setConfirmationOpened] = useState(false);
  const [shouldCloseTabs, setShouldCloseTabs] = useState(true);
  const createFolder = useDashboardStore((state) => state.createFolder);
  const showNotification = useUiStore((state) => state.showNotification);

  const onStashClick = () => {
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
        className={cn("btn__icon", styles.actionButton, {
          active: confirmationOpened,
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
          className={styles.stashPopup}
          width={240}
          offset={{ top: 12, left: 4 }}
          skipTabIndexes={true}
        >
          <div style={{ width: "100%" }}>
            <p>Save all open Tabs to a new Folder</p>
            <p>
              <label>
                <input
                  type="checkbox"
                  checked={shouldCloseTabs}
                  onChange={(e) => setShouldCloseTabs(e.target.checked)}
                />
                and close all the tabs
              </label>
            </p>
          </div>
          <div style={{ width: "100%", display: "flex" }}>
            <button
              className="focusable btn__setting primary"
              style={{ marginRight: "8px" }}
              onClick={shelveTabs}
            >
              Stash tabs
            </button>
            <button
              className="focusable btn__setting"
              onClick={() => setConfirmationOpened(false)}
            >
              Cancel
            </button>
          </div>
        </DropdownMenu>
      ) : null}
    </div>
  );
});

const CleanupButton = React.memo((props: { tabs: BrowserTab[] }) => {
  const [duplicateTabsCount, setDuplicateTabsCount] = useState(0);
  const showNotification = useUiStore((state) => state.showNotification);

  function onCleanupTabs() {
    getDuplicatedTabs((duplicatedTabs) => {
      duplicatedTabs.forEach((t) => {
        if (t.id) {
          removeTabs(t.id);
        }
      });
      const message =
        duplicatedTabs.length > 0
          ? `${duplicatedTabs.length} duplicate tabs was closed`
          : "There are no duplicate tabs";
      showNotification({ message });
    });
  }

  useEffect(() => {
    getDuplicatedTabs((dt) => {
      setDuplicateTabsCount(dt.length);
    });
  }, [props.tabs]);
  return (
    <button
      className={cn("btn__icon", styles.actionButton)}
      style={{ position: "relative" }}
      title="Close duplicate tabs"
      disabled={duplicateTabsCount === 0}
      onClick={onCleanupTabs}
    >
      <IconDelDuplicates />
      {duplicateTabsCount > 0 ? (
        <div className={styles.duplicateCount}>{duplicateTabsCount}</div>
      ) : null}
    </button>
  );
});

function getDuplicatedTabs(cb: (value: BrowserTab[]) => void): void {
  const tabsByUrl = new Map<string, BrowserTab[]>();
  getCurrentWindow((chromeWindow) => {
    queryTabs({ windowId: chromeWindow.id }, (tabs) => {
      tabs.reverse().forEach((t) => {
        if (!t.url) {
          return;
        }
        if (!tabsByUrl.has(t.url)) {
          tabsByUrl.set(t.url, []);
        }
        const groupedTabsByUrl = tabsByUrl.get(t.url)!;

        //special condition to now close current tab with Tablo but close all others
        if (isTabloTab(t) && t.active) {
          groupedTabsByUrl.unshift(t);
        } else {
          groupedTabsByUrl.push(t);
        }
      });
      const duplicatedTabs: BrowserTab[] = [];
      tabsByUrl.forEach((groupedTabs) => {
        for (let i = 1; i < groupedTabs.length; i++) {
          const duplicatedTab = groupedTabs[i];
          if (duplicatedTab.id) {
            duplicatedTabs.push(duplicatedTab);
          }
        }
      });
      cb(duplicatedTabs);
    });
  });
}
