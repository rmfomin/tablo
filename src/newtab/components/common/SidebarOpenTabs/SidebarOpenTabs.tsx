import React, { memo } from "react";
import cn from "clsx";
import {
  filterTabsBySearch,
  hasSearch,
  SearchFilter,
  SearchFilterMode,
} from "@/newtab/helpers/utils";
import { SpaceV3 } from "@/newtab/helpers/types";
import { useChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import { TabOrRecentItem } from "@/newtab/components/common/SidebarItem/SidebarItem";
import styles from "./SidebarOpenTabs.module.scss";
import Tab = chrome.tabs.Tab;

export const SidebarOpenTabs = memo(
  (p: {
    search: string;
    searchFilters: SearchFilter[];
    searchFilterMode: SearchFilterMode;
    tabs: Tab[];
    spaces: SpaceV3[];
    lastActiveTabIds: number[];
    currentWindowId: number | undefined;
    sidebarCollapsed: boolean;
  }) => {
    const closeTabs = useChromeRuntimeStore((state) => state.closeTabs);
    const showNotification = useUiStore((state) => state.showNotification);

    function onCloseTab(tabId: number) {
      chrome.tabs.remove(tabId);
      closeTabs([tabId]);
      showNotification({ message: "Tab has been closed" });
    }

    const tabsByWindows: Map<number, Tab[]> = new Map();
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
  map: Map<number, Tab[]>,
  currentWindowId: number | undefined,
): { windowId: number; tabs: Tab[] }[] {
  const res = Array.from(map.entries());
  let allWindows: { windowId: number; tabs: Tab[] }[] = [];

  res.forEach(([windowId, tabs]) => {
    if (windowId === currentWindowId) {
      allWindows.splice(0, 0, { windowId, tabs });
    } else {
      allWindows.push({ windowId, tabs });
    }
  });

  return allWindows;
}
