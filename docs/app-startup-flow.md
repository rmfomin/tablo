# Запуск приложения

## Последовательность запуска

1. [manifest-normal.json](../public/manifest-normal.json) регистрирует service worker `js/background.js` и назначает `newtab.html` страницей новой вкладки.
2. [background.ts](../src/background.ts) обслуживает клик по иконке расширения, хранит последние активные вкладки и отвечает на запросы новой вкладки.
3. [newtab.html](../public/newtab.html) создаёт `#root` и подключает собранный `js/newtab.js`.
4. Webpack собирает entrypoint [newtab/index.tsx](../src/newtab/index.tsx). Импорт модуля создаёт singleton stores: dashboard, UI и Chrome runtime.
5. `startNewtab()` создаёт browser-адаптер storage, controller синхронизации и controller темы.
6. [state/storage-sync/controller.ts](../src/newtab/state/storage-sync/controller.ts) вызывает `await storageSync.hydrate()` для dashboard и сохраняемых UI-настроек из `chrome.storage.local`. Hydration завершается до запуска persistence, поэтому пустое стартовое состояние не может перезаписать сохранённые данные.
7. После hydration entrypoint регистрирует сохранённые favicon, применяет тему и подписывается на её изменение.
8. `storageSync.start()` включает подписки на stores, отложенное сохранение и BroadcastChannel-синхронизацию.
9. `mountApp()` монтирует React-приложение в `#root`.
10. Только после монтирования `App` в `App.useEffect` создаётся controller Chrome runtime и вызывается `controller.start()`. [state/chrome-runtime/controller.ts](../src/newtab/state/chrome-runtime/controller.ts) загружает вкладки, историю, последние активные вкладки и ID окна, затем подписывается на Chrome events.
11. В том же effect `App` запускает delayed history preload через две секунды и слушает `BroadcastChannel` для обновлений `last-active-tabs-updated` от background-слоя. При размонтировании `App` останавливает controller, очищает timer, снимает listener и закрывает этот channel.

## Владение состоянием

| Слой | Владеет | Не владеет |
| --- | --- | --- |
| [state/dashboard/dashboardStore.ts](../src/newtab/state/dashboard/dashboardStore.ts) | Пространствами, папками, элементами, выбранным пространством и undo-стеком текущей вкладки | UI-предпочтениями, данными Chrome runtime, persistence-эффектами |
| [state/ui/uiStore.ts](../src/newtab/state/ui/uiStore.ts) | UI-состоянием, поиском, выделением, уведомлениями и сохраняемыми предпочтениями | Dashboard-данными и Chrome runtime-данными |
| [state/chrome-runtime/chromeRuntimeStore.ts](../src/newtab/state/chrome-runtime/chromeRuntimeStore.ts) | Открытыми вкладками, историей, последними активными вкладками, ID окна и флагом загрузки | Постоянными данными dashboard и UI |
| [state/storage-sync/controller.ts](../src/newtab/state/storage-sync/controller.ts) | Загрузкой, подготовкой и сохранением persistent state; подписками на stores и BroadcastChannel | Данными stores, React-рендерингом и созданием/закрытием BroadcastChannel |
| [state/chrome-runtime/controller.ts](../src/newtab/state/chrome-runtime/controller.ts) | Вызовами Chrome API и lifecycle Chrome listeners | Бизнес-операциями dashboard, persistent state, delayed preload и BroadcastChannel `last-active-tabs-updated` |

## Границы модулей

- Stores синхронны и детерминированы: хранят данные и команды изменения данных.
- Storage adapter создаёт BroadcastChannel; controller управляет только его subscription. Текущий `stop()` снимает listener, но не закрывает channel.
- Controllers содержат внешние эффекты и lifecycle: Chrome API, storage и подписки.
- Browser-адаптеры изолируют большую часть Chrome API от controllers. Chrome runtime controller всё ещё использует `chrome.windows.WINDOW_ID_NONE`, поэтому adapter не полностью изолирует Chrome API.
- React-компоненты читают состояние через hooks stores. Корневой `App` управляет lifecycle Chrome runtime, delayed history preload, BroadcastChannel `last-active-tabs-updated` и компоновкой UI.
