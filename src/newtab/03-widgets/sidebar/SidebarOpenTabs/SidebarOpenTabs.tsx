import { createTab, updateTab, removeTabs, getCurrentTab, queryTabs, getCurrentWindow, focusWindow, type BrowserTab } from "@/newtab/06-shared/api/chrome/tabs";
import React, { memo } from "react";
import cn from "clsx";
import {
  filterTabsBySearch,
  hasSearch,
  SearchFilter,
  SearchFilterMode,
} from "@/newtab/04-features/bookmark-search/model/filters";
import { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { useChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { TabOrRecentItem } from "@/newtab/03-widgets/sidebar/SidebarItem/SidebarItem";
import styles from "./SidebarOpenTabs.module.scss";


export const SidebarOpenTabs = memo(
  (p: {
    search: string;
    searchFilters: SearchFilter[];
    searchFilterMode: SearchFilterMode;
    tabs: BrowserTab[];
    spaces: SpaceV3[];
    lastActiveTabIds: number[];
    currentWindowId: number | undefined;
    sidebarCollapsed: boolean;
  }) => {
    const closeTabs = useChromeRuntimeStore((state) => state.closeTabs);
    const showNotification = useUiStore((state) => state.showNotification);

    function onCloseTab(tabId: number) {
      removeTabs(tabId);
      closeTabs([tabId]);
      showNotification({ message: "BrowserTab has been closed" });
    }

    const tabsByWindows: Map<number, BrowserTab[]> = new Map();
    let tabsCount = 0;
    filterTabsBySearch(
      p.tabs,
      p.search,
      p.searchFilters,
      p.searchFilterMode,
    ).forEach((t) => {
      let tabsInWindow = tabsByWindows.get(t.windowId);
      if (!tabsInWindow) {
        tabsInWindow = [];
        tabsByWindows.set(t.windowId, tabsInWindow);
      }
      tabsInWindow.push(t);
      tabsCount++;
    });

    const sortedWindowsWithTabs = getSortedWindowsWithTabs(
      tabsByWindows,
      p.currentWindowId,
    );

    return (
      <div
        className={cn(styles.inboxBox, {
          [styles.collapsed]: p.sidebarCollapsed,
        })}
      >
        {sortedWindowsWithTabs.length === 1
          ? sortedWindowsWithTabs[0].tabs.map((t) => (
              <TabOrRecentItem
                key={t.id}
                data={t}
                lastActiveTabId={p.lastActiveTabIds[1]}
                spaces={p.spaces}
                search={p.search}
                onCloseTab={onCloseTab}
              />
            ))
          : sortedWindowsWithTabs.map((window, index) => {
              return (
                <div key={window.windowId}>
                  <div
                    className={cn(styles.windowName, {
                      [styles.collapsedText]: p.sidebarCollapsed,
                    })}
                  >
                    {index === 0 ? "current window" : "window"}
                  </div>
                  {window.tabs.map((t) => (
                    <TabOrRecentItem
                      key={t.id}
                      data={t}
                      lastActiveTabId={p.lastActiveTabIds[1]}
                      spaces={p.spaces}
                      search={p.search}
                      onCloseTab={onCloseTab}
                    />
                  ))}
                </div>
              );
            })}
        {tabsCount === 0 && !hasSearch(p.search, p.searchFilters) ? (
          <p className="sidebar-message">
            No open tabs.
            <br /> Pinned tabs are filtered out.
          </p>
        ) : null}
      </div>
    );
  },
);

function getSortedWindowsWithTabs(
  map: Map<number, BrowserTab[]>,
  currentWindowId: number | undefined,
): { windowId: number; tabs: BrowserTab[] }[] {
  const res = Array.from(map.entries());
  let allWindows: { windowId: number; tabs: BrowserTab[] }[] = [];

  res.forEach(([windowId, tabs]) => {
    if (windowId === currentWindowId) {
      allWindows.splice(0, 0, { windowId, tabs });
    } else {
      allWindows.push({ windowId, tabs });
    }
  });

  return allWindows;
}
