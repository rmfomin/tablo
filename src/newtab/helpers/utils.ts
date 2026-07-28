import Tab = chrome.tabs.Tab;
import HistoryItem = chrome.history.HistoryItem;
import {
  BookmarkItemV3,
  SpaceV3,
} from "@/newtab/helpers/types";
import type React from "react";
import { isTabloTab } from "@/newtab/helpers/isTabloTab";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import {
  collectBookmarksV3,
  hasArchivedItemsV3,
} from "@/newtab/helpers/v3Traversal";

export type SearchFilter = {
  id: string;
  title: string;
  pattern: string;
  enabled?: boolean;
};

export type SearchFilterMode = "or" | "and";

export const SECTION_ICON_BASE64 = `data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAiIGhlaWdodD0iMTAwIj4KICA8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmZiIgLz4KPC9zdmc+Cg==`;

export const DEFAULT_FOLDER_COLOR = "#f0f0f0";
export const EMPTY_FOLDER_COLOR = "transparent";

export const MAX_LAST_ACTIVE_TABS_COUNT = 3;

const uselessWords = [
  "| Greenhouse",
  " - Google Sheets",
  " - Google Docs",
  ", Online Whiteboard for Visual Collaboration",
  " - Stash",
  " - Confluence",
  " - YouTube",
  ", Visual Workspace for Innovation",
];

export function removeUselessProductName(str: string | undefined): string {
  if (str === undefined) {
    return "";
  } else {
    uselessWords.forEach((uw) => {
      str = str!.replace(uw, "");
    });
    return str;
  }
}

export function extractHostname(url: string | undefined): string {
  if (url === undefined) {
    return "";
  } else {
    try {
      return new URL(url).host;
    } catch (e) {
      return "";
    }
  }
}

const important_urls = [
  "miro.com",
  "miro.atlassian.net",
  "code.devrtb.com",
  "docs.google.com",
  "app2.greenhouse.io",
  "miro.latticehq.com",
  "notion.so",
];

export function filterNonImportant(tab: Tab): boolean {
  return important_urls.some(
    (importantUrl) => tab.url && tab.url.includes(importantUrl)
  );
}

export function filterTabsBySearch(
  list: Tab[],
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or"
): Tab[] {
  const searchValueLC = searchValue.toLowerCase();
  return list.filter((item) => {
    if (!hasSearch(searchValue, filters)) {
      return canDisplayTabInSidebar(item);
    } else {
      return (
        canDisplayTabInSidebar(item) &&
        isContainsSearch(item, searchValueLC, filters, filterMode)
      );
    }
  });
}

export function filterRecentItemsBySearch(
  list: RecentItem[],
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or"
): RecentItem[] {
  if (!hasSearch(searchValue, filters)) {
    return list;
  }
  const searchValueLC = searchValue.toLowerCase();
  return list.filter((item) => {
    return isContainsSearch(item, searchValueLC, filters, filterMode);
  });
}

export function hasArchivedItems(spaces: SpaceV3[]): boolean {
  return hasArchivedItemsV3(spaces);
}

export function hasItemsToHighlight(
  spaces: SpaceV3[],
  recentItems: RecentItem[]
): boolean {
  return collectBookmarksV3(spaces).some((item) =>
    isFolderItemNotUsed(item, recentItems)
  );
}

export function filterItemsBySearch<T extends { title?: string; url?: string }>(
  list: T[],
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or"
): T[] {
  if (!hasSearch(searchValue, filters)) {
    return list;
  } else {
    const searchValueLC = searchValue.toLowerCase();
    return list.filter((item) =>
      isContainsSearch(item, searchValueLC, filters, filterMode)
    );
  }
}

export function isContainsSearch<T extends { title?: string; url?: string }>(
  item: T,
  searchValue: string,
  filters: SearchFilter[] = [],
  filterMode: SearchFilterMode = "or"
): boolean {
  const enabledFilters = enabledSearchFilterRegexes(filters);
  const textSearchActive = searchValue !== "";
  const filterSearchActive = enabledFilters.length > 0;
  const textMatches = Boolean(
    textSearchActive &&
      (item.title?.toLowerCase().includes(searchValue) ||
        item.url?.toLowerCase().includes(searchValue))
  );
  const filterMatches = enabledFilters.some((regex) => {
    regex.lastIndex = 0;
    return Boolean(
      (item.title && regex.test(item.title)) ||
        (item.url && regex.test(item.url))
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
  filters: SearchFilter[] = []
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
  if (getSearchFilterRegex(pattern)) {
    return undefined;
  }

  return "Invalid regular expression";
}

export function updateSearchFilter(
  filters: SearchFilter[],
  filterId: string,
  patch: Pick<SearchFilter, "title" | "pattern">
): SearchFilter[] {
  return filters.map((filter) => {
    if (filter.id !== filterId) {
      return filter;
    }

    return {
      ...filter,
      ...patch,
    };
  });
}

function enabledSearchFilterRegexes(filters: SearchFilter[]): RegExp[] {
  return filters
    .filter((filter) => filter.enabled)
    .map((filter) => getSearchFilterRegex(filter.pattern))
    .filter((regex): regex is RegExp => regex !== undefined);
}

// const irrelecantHosts = [
//   "translate.google.ru",
//   "zoom.us",
//   "miro.zoom.us",
//   "9gag.com",
//   "calendar.google.com",
//   "www.facebook.com",
//   "www.google.com",
//   "accounts.google.com",
//   "vk.com",
//   "coub.com",
//   "mail.google.com",
//   "twitter.com",
//   "code.devrtb.com",
//   "www.youtube.com",
//   "yandex.ru",
//   "www.instagram.com",
//   "2gis.ru"
// ]
//
// const hostWithIgnoredSearchAndHash = [
//   "miro.com",
//   "docs.google.com",
//   "www.figma.com"
// ]
// function isRelevantURL(url: URL): boolean {
//   return !irrelecantHosts.some(h => h === url.host)
// }
//
// function isDistinctURL(url: URL): boolean {
//   return hostWithIgnoredSearchAndHash.some(h => h === url.host)
// }

export const colors = [
  "#82E9DE",
  "#A0F3A2",
  "#D3A8FF",
  "#A4D7FF",
  "#F55666",
  "#FFE066",
  "#FFB347",

  "#FFC4A3",
  "#FADC43",
  "#85ECA1",
  "#95CFFF",
  "#C7B0FF",
  "#CCE7CD",
  "#F1DFAA",
  "#F7A8E3",
  "#FF8695",
  "#FFBFC2",

  // old colors

  "#f8bbd0",
  "#d1c4e9",
  "#bbdefb",
  "#b2ebf2",
  "#b2dfdb",
  "#dcedc8",
  "#f0f4c3",
  "#ffecb3",
  "#ffccbc",
  "#d7ccc8",

  // "#ffcdd2",
  // "#f8bbd0",
  // "#e1bee7",
  // "#d1c4e9",
  // "#c5cae9",
  // "#bbdefb",
  // "#b3e5fc",
  // "#b2ebf2",
  // "#b2dfdb",
  // "#c8e6c9",
  // "#dcedc8",
  // "#f0f4c3",
  // "#fff9c4",
  // "#ffecb3",
  // "#ffe0b2",
  // "#ffccbc",
  // "#d7ccc8",
  // "#cfd8dc"
];

export function getRandomHEXColor(): string {
  return colors[Math.round(Math.random() * (colors.length - 1))];
}

let runtimeIdCounter = 10000;

/**
 * NOTE: Can be used only within single app instance
 */
export function genNextRuntimeId(): number {
  return ++runtimeIdCounter;
}

export function filterOpenedTabsFromHistory(
  tabs: Tab[],
  historyItems: HistoryItem[]
): HistoryItem[] {
  return historyItems.filter((hi) => !tabs.some((tab) => hi.url === tab.url));
}

export function canDisplayTabInSidebar(t: Tab): boolean {
  return !isTabloTab(t) && !t.pinned;
}

export function findTabsByURL(url: string | undefined, tabs: Tab[]): Tab[] {
  if (!url || url === "") {
    return [];
  }
  return tabs.filter((t) => t.url === url || t.pendingUrl === url);
}

export function isFolderItemNotUsed(
  item: BookmarkItemV3,
  historyItems: RecentItem[]
): boolean {
  if (item.isSection) {
    return false;
  }
  const historyItem = historyItems.find((hi) => hi.url === item.url);
  return !historyItem;
}

export function hlSearch(str: string, search: string): { __html: string } {
  if (search) {
    const searchRE = new RegExp(escapeRegex(search), "i");
    return {
      __html: sanitizeHTML(
        str.replace(
          searchRE,
          (match) => `<span class="searched">${match}</span>`
        )
      ),
    };
  } else {
    return { __html: sanitizeHTML(str) };
  }
}

export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/on\w+=".*?"/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\n/g, "<br>");
}

function escapeRegex(s: string): string {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function blurSearch(_e: React.MouseEvent) {
  if (
    document.activeElement &&
    document.activeElement === document.querySelector("input.search")
  ) {
    (document.activeElement as HTMLElement).blur();
    // e.preventDefault() // commented it and it seems like everything works
  }
}

export function isTargetSupportsDragAndDrop(
  e: React.MouseEvent,
  ignoreElementWithClass?: string
): boolean {
  const target = e.target as HTMLElement;
  if (
    ignoreElementWithClass &&
    target.classList.contains(ignoreElementWithClass)
  ) {
    return false;
  }
  return !isTargetInputOrTextArea(target);
}

export function isTargetInputOrTextArea(target: Element): boolean {
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function debounce(f: any, ms: number): (...attrs: any[]) => void {
  let isCooldown = false;

  return function () {
    if (isCooldown) {
      return;
    }

    //[!]does not save context
    // should be 'this' instead of 'null'
    f.apply(null, arguments);

    isCooldown = true;

    setTimeout(() => (isCooldown = false), ms);
  };
}

//[!]does not save context
// should be 'this' instead of 'null'
export function throttle(func: any, ms: number): (...attrs: any[]) => void {
  let isThrottled = false,
    savedArgs: any,
    savedThis: any;

  function wrapper() {
    savedArgs = arguments;
    savedThis = null;
    if (isThrottled) {
      // (2)
      return;
    }

    //func.apply(null, arguments); // (1)

    isThrottled = true;

    setTimeout(function () {
      isThrottled = false; // (3)
      if (savedArgs) {
        func.apply(savedThis, savedArgs);
        savedArgs = savedThis = null;
      }
    }, ms);
  }

  return wrapper;
}

export function getTopVisitedFromHistory(history: RecentItem[], limit = 20) {
  const sortedHistory = Array.from(history);
  sortedHistory.sort((a, b) => (b.visitCount || 0) - (a.visitCount || 0));
  return sortedHistory.slice(0, limit);
}

export function scrollElementIntoView(selector: string) {
  requestAnimationFrame(() => {
    const element = document.querySelector(selector);
    if (element) {
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.document.body.clientHeight;
      if (rect.bottom > viewportHeight) {
        element.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }
  });
}

export function isSomeParentHaveClass(
  targetElement: Element | null,
  classOnParent: string | string[]
): boolean {
  let el = targetElement;
  classOnParent = Array.isArray(classOnParent)
    ? classOnParent
    : [classOnParent];
  while (el) {
    if (classOnParent.some((className) => el!.classList.contains(className))) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function findParentWithClass(
  targetElement: any | null,
  classOnParent: string
): HTMLElement | undefined {
  let el = targetElement;
  while (el) {
    if (el.classList.contains(classOnParent)) {
      return el as HTMLElement;
    }
    el = el.parentElement;
  }
  return undefined;
}

export function getCurrentData() {
  const today = new Date();
  const dd = String(today.getDate()).padStart(2, "0");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const mm = months[today.getMonth()];
  const min = String(today.getMinutes()).padStart(2, "0");
  const hours = String(today.getHours()).padStart(2, "0");
  return `${dd} ${mm}, ${hours}:${min}`;
}

/**
 * o1: original object
 * o2: object to merge with — undefined values as ignored
 * Return new objects
 */
export function mergeObjects<T>(o1: T, o2: Partial<T>): T {
  const merged = { ...o1 } as T;
  for (let key in o2) {
    if (o2[key] !== undefined) {
      // @ts-ignore
      merged[key] = o2[key];
    }
  }

  return merged;
}

export function isArraysEqual(arr1: number[], arr2: number[]): boolean {
  if (arr1.length !== arr2.length) {
    return false;
  }

  return arr1.every((value, index) => value === arr2[index]);
}

export const IS_MAC_DEVICE: boolean = false; // navigator.userAgent.indexOf("Mac OS X") != -1
