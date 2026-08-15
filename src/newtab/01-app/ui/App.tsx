import React, { useEffect } from "react";
import { NewtabPage } from "@/newtab/02-pages/newtab/ui/NewtabPage";
import {
  chromeRuntimeStore,
  useChromeRuntimeStore,
} from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore";
import {
  createBrowserChromeRuntimeAdapter,
  createChromeRuntimeController,
} from "@/newtab/01-app/model/chrome-runtime/controller";
import { tryLoadMoreHistory } from "@/newtab/06-shared/api/chrome/history";
import { useUiStore } from "@/newtab/01-app/model/ui/uiStore";

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
    <NewtabPage
      page={page}
      search={search}
      sidebarCollapsed={sidebarCollapsed}
    />
  );
}
