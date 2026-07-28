import React from "react";
import { App } from "@/newtab/components/root/App";
import "@/styles/index.scss";
import { createRoot } from "react-dom/client";
import { faviconsStorage } from "@/newtab/helpers/faviconUtils";
import { collectBookmarksV3 } from "@/newtab/helpers/v3Traversal";
import { dashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { uiStore } from "@/newtab/state/ui/uiStore";
import { createBrowserStorageAdapter } from "@/newtab/state/storage-sync/chromeStorageAdapter";
import { createStorageSyncController } from "@/newtab/state/storage-sync/controller";
import { createBrowserThemeController } from "@/newtab/state/ui/themeController";

async function startNewtab(): Promise<void> {
  const storageSync = createStorageSyncController(
    dashboardStore,
    uiStore,
    createBrowserStorageAdapter(),
  );
  const themeController = createBrowserThemeController();

  // Сначала гидрируем stores. Только после этого подписываем persistence,
  // иначе стартовое пустое Zustand state могло бы перезаписать chrome.storage.
  await storageSync.hydrate();
  registerStoredFavicons();
  themeController.applyTheme(uiStore.getState().colorTheme);
  uiStore.subscribe((state, previous) => {
    if (state.colorTheme !== previous.colorTheme) {
      themeController.applyTheme(state.colorTheme);
    }
  });
  storageSync.start();
  mountApp();
}

function mountApp() {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <React.StrictMode>
      <App />,
    </React.StrictMode>,
  );
}

function registerStoredFavicons(): void {
  // Собирает все закладки из spaces, включая закладки внутри групп.
  collectBookmarksV3(dashboardStore.getState().spaces).forEach((item) => {
    faviconsStorage.registerInCache(item.favIconUrl, item.url);
  });
}

// Запуск
void startNewtab();
