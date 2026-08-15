import { createChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";

function createTab(id: number, title: string): chrome.tabs.Tab {
  return {
    id,
    windowId: 1,
    index: 0,
    active: false,
    pinned: false,
    highlighted: false,
    incognito: false,
    selected: false,
    discarded: false,
    autoDiscardable: true,
    title,
    url: `https://example.com/${id}`,
  };
}

test("runtime store обновляет tab и удаляет закрытые tabs", () => {
  const store = createChromeRuntimeStore();
  const firstTab = createTab(1, "Первая вкладка");
  const secondTab = createTab(2, "Вторая вкладка");

  store.getState().setTabs([firstTab, secondTab]);
  store.getState().updateTab(1, { ...firstTab, title: "Новое название" });
  store.getState().closeTabs([2]);

  expect(store.getState().tabs).toEqual([
    expect.objectContaining({ id: 1, title: "Новое название" }),
  ]);
});

test("runtime store хранит историю и данные текущего Chrome окна", () => {
  const store = createChromeRuntimeStore();
  const historyItem = {
    id: 101,
    url: "https://example.com/history",
    title: "История",
    lastVisitTime: 1,
    favIconUrl: "https://example.com/favicon.ico",
    isRecent: true,
  };

  store.getState().setRecentItems([historyItem]);
  store.getState().setCurrentWindowId(10);
  store.getState().setLastActiveTabIds([3, 2]);
  store.getState().setLoaded(true);

  expect(store.getState()).toMatchObject({
    recentItems: [historyItem],
    currentWindowId: 10,
    lastActiveTabIds: [3, 2],
    loaded: true,
  });
});
