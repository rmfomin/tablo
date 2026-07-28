import {
  filterRecentItemsBySearch,
  filterTabsBySearch,
  getSearchFilterRegexError,
  isContainsSearch,
  SearchFilter,
  updateSearchFilter,
} from "@/newtab/helpers/utils";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import Tab = chrome.tabs.Tab;

function createFilter(pattern: string): SearchFilter {
  return {
    id: pattern,
    title: pattern,
    pattern,
    enabled: true,
  };
}

function createRecentItem(id: number, url: string): RecentItem {
  return {
    id,
    isRecent: true,
    favIconUrl: "",
    title: `Item ${id}`,
    url,
  };
}

function createTab(id: number, url: string): Tab {
  return {
    id,
    title: `Tab ${id}`,
    url,
    pinned: false,
  } as Tab;
}

test("search regex filter matches bookmarks by URL case-insensitively", () => {
  expect(
    isContainsSearch(
      {
        title: "Payment",
        url: "https://payment.example.com/payment/rest/register.do?amount=1",
      },
      "",
      [createFilter("REGISTER\\.DO")]
    )
  ).toBe(true);
});

test("search regex filter applies to recent items without collapsing matches", () => {
  const items = [
    createRecentItem(
      1,
      "https://payment.example.com/payment/rest/register.do?amount=1"
    ),
    createRecentItem(
      2,
      "https://payment.example.com/payment/rest/register.do?amount=2"
    ),
  ];

  expect(
    filterRecentItemsBySearch(items, "", [createFilter("register\\.do")])
  ).toEqual(items);
});

test("search regex filter applies to open tabs", () => {
  const tabs = [
    createTab(1, "https://tracker.example.com/browse/ISSUE-185633"),
    createTab(2, "https://example.com/readme"),
  ];

  expect(
    filterTabsBySearch(tabs, "", [createFilter("tracker\\.example\\.com")])
  ).toEqual([tabs[0]]);
});

test("invalid search regex filter is reported", () => {
  expect(getSearchFilterRegexError("[")).toBe("Invalid regular expression");
});

test("search text and regex filter use OR mode by default", () => {
  const items = [
    createRecentItem(1, "https://tracker.example.com/browse/ISSUE-185633"),
    createRecentItem(2, "https://payment.example.com/payment/rest/register.do"),
    createRecentItem(3, "https://example.com/readme"),
  ];

  expect(
    filterRecentItemsBySearch(items, "tracker", [createFilter("register\\.do")])
  ).toEqual([items[0], items[1]]);
});

test("search text and regex filter use AND mode when requested", () => {
  const items = [
    createRecentItem(1, "https://payment.example.com/payment/rest/register.do"),
    {
      ...createRecentItem(
        2,
        "https://payment.example.com/payment/rest/register.do?description=jira"
      ),
      title: "Register Jira",
    },
    createRecentItem(3, "https://tracker.example.com/browse/ISSUE-185633"),
  ];

  expect(
    filterRecentItemsBySearch(
      items,
      "jira",
      [createFilter("register\\.do")],
      "and"
    )
  ).toEqual([items[1]]);
});

test("updates existing search filter without changing its enabled state", () => {
  const filters = [
    createFilter("register\\.do"),
    {
      ...createFilter("tracker\\.example\\.com"),
      id: "jira",
      title: "Jira",
      enabled: false,
    },
  ];

  expect(
    updateSearchFilter(filters, "jira", {
      title: "Example Tracker",
      pattern: "tracker\\.example\\.com\\/browse\\/ISSUE-\\d+",
    })
  ).toEqual([
    filters[0],
    {
      id: "jira",
      title: "Example Tracker",
      pattern: "tracker\\.example\\.com\\/browse\\/ISSUE-\\d+",
      enabled: false,
    },
  ]);
});
