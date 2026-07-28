import React, { useEffect } from "react";
import cn from "clsx";
import { Bookmarks } from "@/newtab/components/common/Bookmarks/Bookmarks";
import { ImportBookmarksFromSettings } from "@/newtab/components/common/ImportBookmarksFromSettings/ImportBookmarksFromSettings";
import { Notification } from "@/newtab/components/common/Notification/Notification";
import { Sidebar } from "@/newtab/components/common/Sidebar/Sidebar";
import { KeyboardAndMouseManager } from "./useKeyboardAndMouseManager";
import {
  chromeRuntimeStore,
  useChromeRuntimeStore,
} from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import {
  createBrowserChromeRuntimeAdapter,
  createChromeRuntimeController,
} from "@/newtab/state/chrome-runtime/controller";
import { tryLoadMoreHistory } from "@/newtab/helpers/recentHistoryUtils";
import { useUiStore } from "@/newtab/state/ui/uiStore";

let notificationTimeout: number | undefined;

/**
 * Верхний React-слой не хранит данные и не маршрутизирует actions. Его задача
 * ограничена lifecycle controllers и компоновкой UI; state читается напрямую
 * из трёх Zustand stores соответствующими компонентами.
 */
export function App() {
  const loaded = useChromeRuntimeStore((state) => state.loaded);
  const search = useUiStore((state) => state.search);
  const page = useUiStore((state) => state.page);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);
  const notification = useUiStore((state) => state.notification);
  const hideNotification = useUiStore((state) => state.hideNotification);

  useEffect(() => {
    const controller = createChromeRuntimeController(
      chromeRuntimeStore,
      createBrowserChromeRuntimeAdapter(),
    );
    void controller.start();

    const preloadTimer = window.setTimeout(() => {
      tryLoadMoreHistory((recentItems) => {
        chromeRuntimeStore.getState().setRecentItems(recentItems);
      });
    }, 2000);

    const broadcast = new BroadcastChannel("sync-state-channel");
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === "last-active-tabs-updated") {
        chromeRuntimeStore.getState().setLastActiveTabIds(event.data.tabs ?? []);
      }
    };
    broadcast.addEventListener("message", onMessage);

    return () => {
      controller.stop();
      window.clearTimeout(preloadTimer);
      broadcast.removeEventListener("message", onMessage);
      broadcast.close();
    };
  }, []);

  useEffect(() => {
    if (loaded) {
      requestAnimationFrame(() => document.body.classList.add("app-loaded"));
    }
  }, [loaded]);

  useEffect(() => {
    if (notificationTimeout) window.clearTimeout(notificationTimeout);
    notificationTimeout = undefined;
    if (notification.visible && !notification.isLoading) {
      notificationTimeout = window.setTimeout(hideNotification, 3500);
    }
  }, [notification, hideNotification]);

  if (!loaded) return null;

  return (
    <div className={cn("app", { "collapsible-sidebar": sidebarCollapsed })}>
      <Notification />
      {page === "import" ? <ImportBookmarksFromSettings /> : null}
      {page === "default" ? (
        <>
          <Sidebar />
          <Bookmarks />
          <KeyboardAndMouseManager search={search} />
        </>
      ) : null}
    </div>
  );
}
