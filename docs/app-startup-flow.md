# Как запускается приложение

## 1. Точка входа расширения

Файл: [manifest-normal.json](../public/manifest-normal.json)

Что делает:

- регистрирует `service_worker`: `js/background.js`
- подменяет стандартную вкладку браузера на `newtab.html`
- задаёт permissions: `storage`, `history`, `tabs`, `bookmarks`

Итог:

- Chrome запускает background-слой
- при открытии новой вкладки грузится `newtab.html`

## 2. Фоновый слой

Файл: [background.ts](../src/background.ts)

## 3. HTML-оболочка новой вкладки

Файл: [newtab.html](../public/newtab.html)

- подключает стили, `vendor.js`, `js/newtab.js`, `#root`

## 4. Вход в React-приложение

Файл: [newtab.tsx](../src/newtab/newtab.tsx)

- решает, грузить данные локально или через сеть
- читает сохранённое состояние из `chrome.storage.local`
- подготавливает состояние перед рендером:
  - гарантирует наличие default space
  - проверяет `currentSpaceId`
  - прогревает favicon-cache
  - вычисляет `hiddenFeatureIsEnabled`
  - применяет тему
  - сохраняет нормализованное стартовое состояние обратно в storage
- кладёт стартовое состояние через `setInitAppState(...)`
- монтирует `<App />` в `#root`

Главные зависимости:

- [storage.ts](../src/newtab/state/storage.ts)
- [state.ts](../src/newtab/state/state.ts)
- `src/newtab/helpers/*`

## 5. Начальное состояние приложения

Файл: [state.ts](../src/newtab/state/state.ts)

Что делает:

- описывает тип `AppState`
- хранит `initState`
- даёт функции:
  - `setInitAppState(...)`
  - `getInitAppState()`
- объявляет enum `Action` и типы action-пейлоадов

Итог:

- это слой схемы состояния и контрактов между UI и reducer

## 6. Чтение и сохранение состояния

Файл: [storage.ts](../src/newtab/state/storage.ts)

Что делает:

- читает состояние из `chrome.storage.local`
- сохраняет состояние обратно
- троттлит сохранение через `saveStateThrottled`
- шлёт событие `folders-updated` через `BroadcastChannel`
- применяет светлую/тёмную тему

Итог:

- это слой persistence и синхронизации между вкладками/окнами

## 7. Главный React-компонент

Файл: [App.tsx](../src/newtab/components/App.tsx)

Что делает:

- поднимает `useReducer(stateReducer, getInitAppState())`
- создаёт `dispatch` и отдаёт его через `DispatchContext`
- после старта подтягивает:
  - открытые вкладки
  - историю
  - последние активные вкладки
  - текущий window id
- подписывается на:
  - `chrome.tabs.*`
  - `chrome.windows.onFocusChanged`
  - `BroadcastChannel`
- запускает очереди API-команд
- выбирает, какую страницу рендерить:
  - `welcome`
  - `import`
  - обычный `default`-экран

Итог:

- это корневой orchestration-слой UI

## 8. Reducer и бизнес-логика

Файл: [actions.ts](../src/newtab/state/actions.ts)

Что делает:

- содержит `stateReducer`
- принимает actions от UI
- меняет state
- при изменениях запускает `saveStateThrottled(...)`
- ставит API-команды в очередь
- обрабатывает CRUD для spaces, folders, items, widgets

Итог:

- это главный слой бизнес-логики

## 9. Helper-слой для операций над данными

Основные файлы:

- [actionHelpers.ts](../src/newtab/state/actionHelpers.ts)
- [dataFormatAdapters.ts](../src/newtab/helpers/dataFormatAdapters.ts)
- [legacyAppStateView.ts](../src/newtab/helpers/legacyAppStateView.ts)
- [fractionalIndexes.ts](../src/newtab/helpers/fractionalIndexes.ts)

Что делают:

- ищут space/folder/item по id
- обновляют структуры данных
- считают позиции элементов
- конвертируют `v3`-формат и legacy-формат
- дают legacy-view для старого UI

Итог:

- это слой служебных операций над состоянием

## 10. Экран и визуальные компоненты

Основные файлы:

- [Sidebar.tsx](../src/newtab/components/Sidebar.tsx)
- [Bookmarks.tsx](../src/newtab/components/Bookmarks.tsx)
- [TopBar.tsx](../src/newtab/components/TopBar.tsx)
- [Folder.tsx](../src/newtab/components/Folder.tsx)
- [components](../src/newtab/components)

Что делают:

- читают данные из `appState`
- вызывают `dispatch(...)`
- отображают папки, вкладки, поиск, меню, виджеты

Итог:

- это слой интерфейса

## 11. Сетевой слой

Основные файлы:

- [api.ts](../src/api/api.ts)
- [serverCommands.ts](../src/api/serverCommands.ts)

Что делают:

- решают, работать ли с сетью
- загружают dashboard
- исполняют queued API-команды из state

Итог:

- это слой синхронизации с сервером

## 12. Content script

Файл: [content_script.tsx](../src/content_script.tsx)

Что делает:

- сейчас фактически не используется
- содержит старый простой listener для смены цвета страницы

Итог:

- на текущий runtime-flow `newtab` почти не влияет

## Короткая цепочка запуска

1. [manifest-normal.json](../public/manifest-normal.json)
2. [background.ts](../src/background.ts)
3. [newtab.html](../public/newtab.html)
4. [newtab.tsx](../src/newtab/newtab.tsx)
5. [state.ts](../src/newtab/state/state.ts)
6. [storage.ts](../src/newtab/state/storage.ts)
7. [App.tsx](../src/newtab/components/App.tsx)
8. [actions.ts](../src/newtab/state/actions.ts)
9. [components](../src/newtab/components)
