import React, { useCallback, useEffect, useState } from "react";
import cn from "clsx";
import {
  filterRecentItemsBySearch,
  SearchFilter,
  SearchFilterMode,
} from "@/newtab/helpers/utils";
import {
  RecentItem,
  getBaseFilteredRecentItems,
  tryLoadMoreHistory,
} from "@/newtab/helpers/recentHistoryUtils";
import { useChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import { TabOrRecentItem } from "@/newtab/components/common/SidebarItem/SidebarItem";
import { SpaceV3 } from "@/newtab/helpers/types";
import styles from "./SidebarRecent.module.scss";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";

const PAGE_SIZE = 100;

const RecentList = React.memo(
  (p: { items: RecentItem[]; spaces: SpaceV3[]; search: string }) => {
    const setRecentItems = useChromeRuntimeStore((state) => state.setRecentItems);
    const [displayedItems, setDisplayedItems] = useState<RecentItem[]>([]);
    const [page, setPage] = useState<number>(1);

    useEffect(() => {
      setDisplayedItems(p.items.slice(0, PAGE_SIZE));
      setPage(1);
    }, [p.items]);

    const loadMore = useCallback(() => {
      const nextPage = page + 1;
      const nextItems = p.items.slice(0, nextPage * PAGE_SIZE);
      if (nextItems.length > displayedItems.length) {
        setDisplayedItems(nextItems);
        setPage(nextPage);
      }
      tryLoadMoreHistory(setRecentItems);
    }, [page, p.items, displayedItems, setRecentItems]);

    const handleScroll = useCallback(() => {
      const sidebar = document.querySelector(roleSelector(DOM_ROLE.sidebar))!;
      if (sidebar) {
        const { scrollTop, scrollHeight, clientHeight } = sidebar;
        if (scrollTop + clientHeight >= scrollHeight - 200) {
          loadMore();
        }
      }
    }, [loadMore]);

    useEffect(() => {
      const sidebar = document.querySelector(roleSelector(DOM_ROLE.sidebar))!;
      if (sidebar) {
        sidebar.addEventListener("scroll", handleScroll);
      }
      return () => {
        if (sidebar) {
          sidebar.removeEventListener("scroll", handleScroll);
        }
      };
    }, [handleScroll]);

    return (
      <div>
        {displayedItems.map((item) => {
          return (
            <TabOrRecentItem
              lastActiveTabId={0}
              key={item.id}
              data={item}
              spaces={p.spaces}
              search={p.search}
            />
          );
        })}
      </div>
    );
  },
);

export const SidebarRecent = React.memo(
  (p: {
    recentItems: RecentItem[];
    search: string;
    searchFilters: SearchFilter[];
    searchFilterMode: SearchFilterMode;
    spaces: SpaceV3[];
    sidebarCollapsed: boolean;
  }) => {
    const itemsFilteredBySearch = filterRecentItemsBySearch(
      p.recentItems,
      p.search,
      p.searchFilters,
      p.searchFilterMode,
    );

    const itemsFilteredBySearchAndFilter = getBaseFilteredRecentItems(
      itemsFilteredBySearch,
    );

    return (
      <div className={styles.recentList}>
        <div
          className={cn(styles.header, {
            [styles.collapsedHeader]: p.sidebarCollapsed,
          })}
        >
          <div className={styles.innerHeader}>
            <span className={styles.headerText}>Recent</span>
          </div>
        </div>

        <RecentList
          items={itemsFilteredBySearchAndFilter}
          search={p.search}
          spaces={p.spaces}
        />
        <div className="sidebar-message">
          <span>History is limited by 2 month</span>
        </div>
      </div>
    );
  },
);
