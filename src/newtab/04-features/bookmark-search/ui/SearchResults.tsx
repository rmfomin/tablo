import React from "react";
import { useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { useChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { createTab } from "@/newtab/06-shared/api/chrome/tabs";
import {
  filterRecentItemsBySearch,
  hasSearch,
} from "@/newtab/04-features/bookmark-search/model/filters";
import { hlSearch } from "@/newtab/06-shared/lib/dom/html";
import { getBaseFilteredRecentItems } from "@/newtab/06-shared/api/chrome/history";
import { getSpaceSearchResultGroups } from "../model/searchResults";
import FolderIcon from "@/newtab/03-widgets/dashboard/Folder/icons/folder.svg";
import BookIcon from "@/newtab/06-shared/ui/icons/book.svg";
import styles from "./SearchResults.module.scss";

export function SearchResults({
  onOpen,
  onNavigate,
}: {
  onOpen: () => void;
  onNavigate: (offset: number) => void;
}) {
  const spaces = useDashboardStore((state) => state.spaces);
  const recentItems = useChromeRuntimeStore((state) => state.recentItems);
  const search = useUiStore((state) => state.search);
  const searchFilters = useUiStore((state) => state.searchFilters);
  const searchFilterMode = useUiStore((state) => state.searchFilterMode);
  const useSearchResultsPopup = useUiStore(
    (state) => state.useSearchResultsPopup,
  );

  if (!useSearchResultsPopup || !hasSearch(search, searchFilters)) {
    return null;
  }

  const spaceResultGroups = getSpaceSearchResultGroups(
    spaces,
    search,
    searchFilters,
    searchFilterMode,
  );
  const recentResults = getBaseFilteredRecentItems(
    filterRecentItemsBySearch(
      recentItems,
      search,
      searchFilters,
      searchFilterMode,
    ),
  );

  function openResult(url: string) {
    createTab({ url, active: true });
    onOpen();
  }

  return (
    <div
      className={styles.root}
      data-search-results
      aria-label="Search results"
    >
      {spaceResultGroups.map((group) => (
        <SearchSection
          key={group.id}
          title={group.title || "Untitled space"}
          isSpace
        >
          {group.results.map((result) => (
            <button
              key={result.id}
              type="button"
              className={styles.result}
              data-search-result
              onClick={() => openResult(result.url)}
              onKeyDown={(event) => handleResultKeyDown(event, onNavigate)}
            >
              <ResultFavicon src={result.favIconUrl} />
              <span className={styles.resultText}>
                <span
                  className={styles.resultTitle}
                  dangerouslySetInnerHTML={hlSearch(result.title, search)}
                />
                <span className={styles.resultMeta}>
                  <FolderIcon className={styles.folderIcon} aria-hidden="true" />
                  <span>
                    {[result.folderTitle, result.groupTitle]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </SearchSection>
      ))}

      {recentResults.length > 0 ? (
        <SearchSection title="Recent" prominent recent>
          {recentResults.map((result) => (
            <button
              key={result.id}
              type="button"
              className={styles.result}
              data-search-result
              onClick={() => {
                if (result.url) {
                  openResult(result.url);
                }
              }}
              onKeyDown={(event) => handleResultKeyDown(event, onNavigate)}
            >
              <ResultFavicon src={result.favIconUrl} />
              <span className={styles.resultText}>
                <span
                  className={styles.resultTitle}
                  dangerouslySetInnerHTML={hlSearch(
                    result.title ?? result.url ?? "",
                    search,
                  )}
                />
                {result.url ? (
                  <span className={styles.resultMeta}>{result.url}</span>
                ) : null}
              </span>
            </button>
          ))}
        </SearchSection>
      ) : null}

      {spaceResultGroups.length === 0 && recentResults.length === 0 ? (
        <p className={styles.empty}>No results found</p>
      ) : null}
    </div>
  );
}

function handleResultKeyDown(
  event: React.KeyboardEvent<HTMLButtonElement>,
  onNavigate: (offset: number) => void,
): void {
  if (event.code === "ArrowDown" || event.code === "ArrowUp") {
    event.preventDefault();
    onNavigate(event.code === "ArrowDown" ? 1 : -1);
  }
}

function SearchSection({
  title,
  isSpace = false,
  prominent = false,
  recent = false,
  children,
}: {
  title: string;
  isSpace?: boolean;
  prominent?: boolean;
  recent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={recent ? styles.recentSection : undefined}>
      <h2
        className={
          isSpace || prominent ? styles.spaceTitle : styles.sectionTitle
        }
      >
        {isSpace ? (
          <BookIcon className={styles.spaceTitleIcon} aria-hidden="true" />
        ) : null}
        {title}
      </h2>
      {children}
    </section>
  );
}

function ResultFavicon({ src }: { src: string }) {
  return src ? (
    <img className={styles.favicon} src={src} alt="" />
  ) : (
    <span className={styles.faviconPlaceholder} aria-hidden="true" />
  );
}
