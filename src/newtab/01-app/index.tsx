import React from "react";
import { App } from "@/newtab/01-app/ui/App";
import "@/styles/index.scss";
import { createRoot } from "react-dom/client";
import { faviconsStorage } from "@/newtab/06-shared/api/chrome/favicons";
import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";
import { dashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";
import { createBrowserStorageAdapter } from "@/newtab/01-app/model/storage-sync/chromeStorageAdapter";
import { createStorageSyncController } from "@/newtab/01-app/model/storage-sync/controller";
import { createBrowserThemeController } from "@/newtab/01-app/model/ui/themeController";
import { renderStartupError } from "@/newtab/01-app/ui/startupError";
import { bindStoragePageLifecycle } from "@/newtab/01-app/model/storage-sync/pageLifecycle";

async function startNewtab(): Promise<void> {
  const storageSync = createStorageSyncController(
    dashboardStore,
    uiStore,
    createBrowserStorageAdapter(),
    300,
    (error) => {
      console.error("Storage synchronization failed", error);
      uiStore.getState().showNotification({
        message: "Не удалось синхронизировать данные. Если ошибка повторится, экспортируйте JSON перед закрытием вкладки",
        isError: true,
      });
    },
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
  bindStoragePageLifecycle(storageSync);
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
void startNewtab().catch(renderStartupError);
