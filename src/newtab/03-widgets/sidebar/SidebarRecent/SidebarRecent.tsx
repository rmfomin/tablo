import React, { useCallback, useEffect, useRef, useState } from "react";
import cn from "clsx";
import {
  filterRecentItemsBySearch,
  SearchFilter,
  SearchFilterMode,
} from "@/newtab/04-features/bookmark-search/model/filters";
import {
  RecentItem,
  getBaseFilteredRecentItems,
  tryLoadMoreHistory,
} from "@/newtab/06-shared/api/chrome/history";
import { useChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import { TabOrRecentItem } from "@/newtab/03-widgets/sidebar/SidebarItem/SidebarItem";
import { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import styles from "./SidebarRecent.module.scss";

const PAGE_SIZE = 100;

const RecentList = React.memo(
  (p: {
    items: RecentItem[];
    spaces: SpaceV3[];
    search: string;
    scrollContainerRef: React.RefObject<HTMLDivElement>;
  }) => {
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
      const scrollContainer = p.scrollContainerRef.current;
      if (scrollContainer) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer;
        if (scrollTop + clientHeight >= scrollHeight - 200) {
          loadMore();
        }
      }
    }, [loadMore, p.scrollContainerRef]);

    useEffect(() => {
      const scrollContainer = p.scrollContainerRef.current;
      if (scrollContainer) {
        scrollContainer.addEventListener("scroll", handleScroll);
      }
      return () => {
        if (scrollContainer) {
          scrollContainer.removeEventListener("scroll", handleScroll);
        }
      };
    }, [handleScroll, p.scrollContainerRef]);

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
    const scrollContainerRef = useRef<HTMLDivElement>(null);
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
      <div ref={scrollContainerRef} className={styles.recentList}>
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
          scrollContainerRef={scrollContainerRef}
        />
        <div className="sidebar-message">
          <span>History is limited by 2 month</span>
        </div>
      </div>
    );
  },
);
