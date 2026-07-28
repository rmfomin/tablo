import { createChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import {
  createChromeRuntimeController,
  type ChromeRuntimeAdapter,
} from "@/newtab/state/chrome-runtime/controller";

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
      getTabs: jest.fn().mockResolvedValue([createTab(1)]),
      getHistory: jest.fn().mockResolvedValue([]),
      getLastActiveTabIds: jest.fn().mockResolvedValue([1]),
      getCurrentWindowId: jest.fn().mockResolvedValue(1),
      closeTabs: jest.fn(),
      onTabCreated: jest.fn().mockReturnValue(() => undefined),
      onTabRemoved: jest.fn().mockReturnValue(() => undefined),
      onTabUpdated: jest.fn().mockImplementation((listener) => {
        onTabUpdated = listener;
        return () => undefined;
      }),
      onWindowFocused: jest.fn().mockReturnValue(() => undefined),
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
