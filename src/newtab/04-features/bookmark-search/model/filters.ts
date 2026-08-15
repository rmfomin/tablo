export type SearchFilter = {
  id: string;
  title: string;
  pattern: string;
  enabled?: boolean;
};

export type SearchFilterMode = "or" | "and";

type SearchableItem = { title?: string; url?: string };
type SearchableTab = SearchableItem & { pendingUrl?: string; pinned?: boolean };

export function filterTabsBySearch<T extends SearchableTab>(
  list: T[],
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or",
): T[] {
  const searchValueLC = searchValue.toLowerCase();
  return list.filter((item) => {
    if (!hasSearch(searchValue, filters)) {
      return canDisplayTabInSidebar(item);
    }

    return (
      canDisplayTabInSidebar(item) &&
      isContainsSearch(item, searchValueLC, filters, filterMode)
    );
  });
}

export function filterRecentItemsBySearch<T extends SearchableItem>(
  list: T[],
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or",
): T[] {
  return filterItemsBySearch(list, searchValue, filters, filterMode);
}

export function filterItemsBySearch<T extends SearchableItem>(
  list: T[],
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or",
): T[] {
  if (!hasSearch(searchValue, filters)) {
    return list;
  }

  const searchValueLC = searchValue.toLowerCase();
  return list.filter((item) =>
    isContainsSearch(item, searchValueLC, filters, filterMode),
  );
}

export function isContainsSearch<T extends SearchableItem>(
  item: T,
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or",
): boolean {
  const enabledFilters = enabledSearchFilterRegexes(filters);
  const textSearchActive = searchValue !== "";
  const filterSearchActive = enabledFilters.length > 0;
  const textMatches = Boolean(
    textSearchActive &&
      (item.title?.toLowerCase().includes(searchValue) ||
        item.url?.toLowerCase().includes(searchValue)),
  );
  const filterMatches = enabledFilters.some((regex) => {
    regex.lastIndex = 0;
    return Boolean(
      (item.title && regex.test(item.title)) ||
        (item.url && regex.test(item.url)),
    );
  });

  if (textSearchActive && filterSearchActive) {
    return filterMode === "and"
      ? textMatches && filterMatches
      : textMatches || filterMatches;
  }

  return textMatches || filterMatches;
}

export function hasSearch(
  searchValue: string,
  filters: SearchFilter[] = [],
): boolean {
  return searchValue !== "" || filters.some((filter) => filter.enabled);
}

export function getSearchFilterRegex(pattern: string): RegExp | undefined {
  try {
    return new RegExp(pattern, "i");
  } catch {
    return undefined;
  }
}

export function getSearchFilterRegexError(pattern: string): string | undefined {
  return getSearchFilterRegex(pattern)
    ? undefined
    : "Invalid regular expression";
}

export function updateSearchFilter(
  filters: SearchFilter[],
  filterId: string,
  patch: Pick<SearchFilter, "title" | "pattern">,
): SearchFilter[] {
  return filters.map((filter) =>
    filter.id === filterId ? { ...filter, ...patch } : filter,
  );
}

function canDisplayTabInSidebar(tab: SearchableTab): boolean {
  return !isTabloTab(tab) && !tab.pinned;
}

function isTabloTab(tab: Pick<SearchableTab, "url" | "pendingUrl">): boolean {
  return Boolean(
    tab.url?.includes("://newtab/") ||
      tab.pendingUrl?.includes("://newtab/") ||
      tab.url?.includes("/newtab.html") ||
      tab.pendingUrl?.includes("/newtab.html"),
  );
}

function enabledSearchFilterRegexes(filters: SearchFilter[]): RegExp[] {
  return filters
    .filter((filter) => filter.enabled)
    .map((filter) => getSearchFilterRegex(filter.pattern))
    .filter((regex): regex is RegExp => regex !== undefined);
}
