import { createChromeRuntimeStore } from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import {
  createChromeRuntimeController,
  type ChromeRuntimeAdapter,
} from "@/newtab/01-app/model/chrome-runtime/controller";
import type { RecentItem } from "@/newtab/06-shared/api/chrome/history";

function createTab(id: number): chrome.tabs.Tab {
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
    title: `Вкладка ${id}`,
    url: `https://example.com/${id}`,
  };
}

function createAdapter(): {
  adapter: ChromeRuntimeAdapter;
  emitTabUpdated(tab: chrome.tabs.Tab): void;
} {
  let onTabUpdated: ((tabId: number, info: Partial<chrome.tabs.Tab>, tab: chrome.tabs.Tab) => void) | undefined;
  return {
    adapter: {
      getTabs: vi.fn().mockResolvedValue([createTab(1)]),
      getHistory: vi.fn<() => Promise<RecentItem[]>>().mockResolvedValue([]),
      getLastActiveTabIds: vi.fn().mockResolvedValue([1]),
      getCurrentWindowId: vi.fn().mockResolvedValue(1),
      closeTabs: vi.fn(),
      onTabCreated: vi.fn().mockReturnValue(() => undefined),
      onTabRemoved: vi.fn().mockReturnValue(() => undefined),
      onTabUpdated: vi.fn().mockImplementation((listener) => {
        onTabUpdated = listener;
        return () => undefined;
      }),
      onWindowFocused: vi.fn().mockReturnValue(() => undefined),
    },
    emitTabUpdated(tab) {
      onTabUpdated?.(tab.id!, {}, tab);
    },
  };
}

test("controller загружает runtime data, применяет tab listener и очищает store после close command", async () => {
  const store = createChromeRuntimeStore();
  const { adapter, emitTabUpdated } = createAdapter();
  const controller = createChromeRuntimeController(store, adapter);

  await controller.start();
  emitTabUpdated({ ...createTab(1), title: "Обновлённая" });
  controller.closeTabs([1]);

  expect(store.getState()).toMatchObject({
    tabs: [],
    currentWindowId: 1,
    lastActiveTabIds: [1],
    loaded: true,
  });
  expect(adapter.closeTabs).toHaveBeenCalledWith([1]);
  controller.stop();
});
