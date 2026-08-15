import {
  convertTabOrRecentToItem,
  convertTabToItem,
  isTabData,
} from "@/newtab/06-shared/api/chrome/tabs";

test("converts a browser tab to a bookmark item", () => {
  const tab = {
    title: "Tab title",
    url: "https://tab.example/path",
    favIconUrl: "https://tab.example/icon.png",
  } as chrome.tabs.Tab;

  expect(isTabData(tab)).toBe(true);
  expect(convertTabToItem(tab)).toEqual(expect.objectContaining({
    id: expect.any(Number),
    title: "Tab title",
    url: "https://tab.example/path",
    favIconUrl: "https://tab.example/icon.png",
  }));
});

test("converts a recent record to a bookmark item with a temporary favicon", () => {
  const recentItem = {
    id: 1,
    isRecent: true,
    favIconUrl: "",
    title: "Recent title",
    url: "https://recent.example/path",
  };

  expect(isTabData(recentItem)).toBe(false);
  expect(convertTabOrRecentToItem(recentItem)).toEqual(expect.objectContaining({
    id: expect.any(Number),
    title: "Recent title",
    url: "https://recent.example/path",
    favIconUrl: "https://recent.example/favicon.ico#by-tablo",
  }));
});
