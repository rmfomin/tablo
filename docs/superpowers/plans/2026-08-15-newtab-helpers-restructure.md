# Реструктуризация newtab helpers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Удалить `src/newtab/helpers`, распределив его функции по архитектурным слоям без изменения поведения расширения.

**Architecture:** Чистая модель dashboard и поиск живут в `domain`; Chrome API — только в `browser`; DOM и цвет — в `ui`; сериализация dashboard — в `import-export`; общие чистые утилиты — в `shared`. Все импорты и Jest-моки обновляются сразу, без compatibility re-export.

**Tech Stack:** TypeScript, React, Zustand, Chrome Extensions API, Jest, Webpack.

## Global Constraints

- Не изменять наблюдаемое поведение и публичные сигнатуры переносимых функций.
- Не оставлять `src/newtab/helpers`, импортов `@/newtab/helpers/*` или нового файла `utils.ts`.
- `domain` и `shared` не зависят от React, DOM или `chrome.*`.
- Прямой Chrome API допускается только в `src/newtab/browser`.
- JSX допускается только в UI-компонентах и `feature`.
- Не выполнять `git add` и не создавать коммиты без отдельного разрешения пользователя.

## Целевая карта файлов

- Create: `src/newtab/domain/dashboard/{types,traversal,fractionalIndexes,itemUtils,ensureDefaultSpace}.ts`
- Create: `src/newtab/domain/search/filters.ts`
- Create: `src/newtab/browser/{tabs,history,favicons,bookmarks}.ts`
- Create: `src/newtab/ui/dom/{roles,selection,scroll,html}.ts`
- Create: `src/newtab/ui/color/{Color,palette}.ts`
- Create: `src/newtab/import-export/{adapters,dashboardImportExport}.ts`
- Create: `src/newtab/shared/{math,timing}.ts`
- Create: `src/newtab/feature/bookmarks/handleBookmarksKeyDown.ts`
- Create: `src/newtab/feature/move-to/moveToMenu.tsx`
- Create: `src/newtab/components/common/TopBar/settingsOptions.tsx`
- Delete: every file under `src/newtab/helpers/`
- Modify: all production and test import sites returned by `rg -l '@/newtab/helpers' src`

### Task 1: Перенести чистую dashboard-модель

**Files:**
- Create: `src/newtab/domain/dashboard/types.ts`
- Create: `src/newtab/domain/dashboard/traversal.ts`
- Create: `src/newtab/domain/dashboard/fractionalIndexes.ts`
- Create: `src/newtab/domain/dashboard/itemUtils.ts`
- Create: `src/newtab/domain/dashboard/ensureDefaultSpace.ts`
- Modify: `src/newtab/state/dashboard/{domain,types,selectors,dashboardStore}.ts`
- Modify: `src/newtab/state/storage-sync/{controller,types,chromeStorageAdapter}.ts`
- Test: `src/__tests__/{v3Traversal,dashboardItemUtils,ensureDefaultSpace,dashboardDomain.operations}.test.ts`

**Interfaces:**
- Consumes: существующие `SpaceV3`, `FolderV3`, `ItemV3`, `insertBetween`, `createNewFolderItem`, `ensureDefaultSpace`.
- Produces: те же именованные экспорты из новых путей `@/newtab/domain/dashboard/*`.

- [ ] **Step 1: Добавить failing-проверку новых путей в существующие unit-тесты**

```ts
import { collectBookmarksV3 } from "@/newtab/domain/dashboard/traversal";
import type { SpaceV3 } from "@/newtab/domain/dashboard/types";
```

- [ ] **Step 2: Запустить тесты до переноса**

Run: `npm test -- --runInBand src/__tests__/v3Traversal.test.ts src/__tests__/dashboardItemUtils.test.ts src/__tests__/ensureDefaultSpace.test.ts`

Expected: FAIL с ошибкой отсутствующего нового модуля.

- [ ] **Step 3: Перенести исходники без изменений логики**

```ts
// traversal.ts
import type { BookmarkItemV3, SpaceV3 } from "./types";

export function collectBookmarksV3(spaces: SpaceV3[]): BookmarkItemV3[] {
  return spaces.flatMap((space) =>
    space.folders.flatMap((folder) =>
      folder.items.flatMap((item) =>
        item.type === "bookmark" ? [item] : item.groupItems,
      ),
    ),
  );
}
```

Перенести все экспорты старых `types.ts`, `v3Traversal.ts`, `fractionalIndexes.ts`, `ensureDefaultSpace.ts` и только чистые exports `state/dashboard/itemUtils.ts`; изменить их относительные импорты. `TabOrRecentData`, `isTabData`, `convertTabToItem` и `convertTabOrRecentToItem` не остаются в domain: они переносятся в `browser/tabs.ts` в Task 2. Обновить production- и test-импорты на новые пути.

- [ ] **Step 4: Запустить тесты после переноса**

Run: `npm test -- --runInBand src/__tests__/v3Traversal.test.ts src/__tests__/dashboardItemUtils.test.ts src/__tests__/ensureDefaultSpace.test.ts src/__tests__/dashboardDomain.operations.test.ts`

Expected: PASS.

### Task 2: Выделить поиск, вкладки, историю и favicon-адаптеры

**Files:**
- Create: `src/newtab/domain/search/filters.ts`
- Create: `src/newtab/browser/tabs.ts`
- Create: `src/newtab/browser/history.ts`
- Create: `src/newtab/browser/favicons.ts`
- Modify: `src/newtab/state/chrome-runtime/{controller,chromeRuntimeStore}.ts`
- Modify: `src/newtab/feature/bookmarks/*`
- Modify: компоненты Sidebar, Folder, FolderItem, SearchInput и root App
- Test: `src/__tests__/utils.searchFilters.test.ts`, `src/__tests__/chromeRuntimeController.test.ts`

**Interfaces:**
- Consumes: `RecentItem`, `SearchFilter`, `SearchFilterMode`, `chrome.tabs.Tab`, `chrome.history.HistoryItem`.
- Produces: `filters.ts` экспортирует `SearchFilter`, `SearchFilterMode`, `filterItemsBySearch`, `filterTabsBySearch`, `filterRecentItemsBySearch`, `hasSearch`, `isContainsSearch`, `getSearchFilterRegex`, `getSearchFilterRegexError`, `updateSearchFilter`; `tabs.ts` экспортирует tab-специфичные предикаты, `findTabsByURL`, `TabOrRecentData`, `isTabData`, `convertTabToItem`, `convertTabOrRecentToItem`; `history.ts` экспортирует весь контракт recent history; `favicons.ts` экспортирует `faviconsStorage`, `loadFaviconUrl`, `getBrokenImgSVG`.

- [ ] **Step 1: Изменить search-тест на новый импорт**

```ts
import {
  getSearchFilterRegexError,
  isContainsSearch,
  updateSearchFilter,
} from "@/newtab/domain/search/filters";
```

- [ ] **Step 2: Запустить тест до реализации**

Run: `npm test -- --runInBand src/__tests__/utils.searchFilters.test.ts src/__tests__/chromeRuntimeController.test.ts`

Expected: FAIL с ошибкой module not found.

- [ ] **Step 3: Разнести функции из `utils.ts` и browser helpers**

```ts
// browser/tabs.ts
export function findTabsByURL(url: string | undefined, tabs: chrome.tabs.Tab[]) {
  return !url ? [] : tabs.filter((tab) => tab.url === url || tab.pendingUrl === url);
}

// domain/search/filters.ts
export function hasSearch(value: string, filters: SearchFilter[] = []) {
  return value !== "" || filters.some((filter) => filter.enabled);
}
```

Перенести `recentHistoryUtils.ts` в `browser/history.ts` целиком, заменив импорт favicon на `./favicons`. В `browser/tabs.ts` поместить `filterNonImportant`, `filterOpenedTabsFromHistory`, `canDisplayTabInSidebar`, `findTabsByURL`, `removeUselessProductName`, `extractHostname`, `MAX_LAST_ACTIVE_TABS_COUNT`. Оставить browser-адаптеры без React.

- [ ] **Step 4: Обновить все потребители и Jest-моки**

```ts
jest.mock("@/newtab/ui/dom/selection", () => ({
  getSelectedItemsIds: jest.fn(() => []),
}));
```

Заменить импорты `recentHistoryUtils`, `faviconUtils` и соответствующих функций `utils.ts` на новые модули; обновить типы в store и компонентах.

- [ ] **Step 5: Запустить тесты после переноса**

Run: `npm test -- --runInBand src/__tests__/utils.searchFilters.test.ts src/__tests__/chromeRuntimeController.test.ts src/__tests__/chromeRuntimeStore.test.ts`

Expected: PASS.

### Task 3: Разделить import/export и Chrome bookmarks

**Files:**
- Create: `src/newtab/import-export/adapters.ts`
- Create: `src/newtab/import-export/dashboardImportExport.ts`
- Create: `src/newtab/browser/bookmarks.ts`
- Modify: `src/newtab/components/common/{BookmarksImporter,ImportBookmarksFromSettings,SpacesList}/**/*.tsx`
- Modify: `src/newtab/components/common/TopBar/settingsOptions.tsx`
- Test: `src/__tests__/{dataFormatAdapters,importExportHelpers.v3,chromeStorageAdapter}.test.ts`

**Interfaces:**
- Consumes: `SpaceV3`, `SpaceV3Input`, dashboard factories from `domain/dashboard/itemUtils`, position functions and `RecentItem`.
- Produces: `adapters.ts` экспортирует validators и `normalizeBackupV3`; `dashboardImportExport.ts` экспортирует parse/create/export/callback contracts; `bookmarks.ts` экспортирует `CustomBookmarkTreeNode`, `BookmarksAsPlainList`, `getBrowserBookmarksForImport`, `createBrowserBookmarksFolderInputs`, `importBrowserBookmarksWithCallback`.

- [ ] **Step 1: Перенаправить существующие тесты на новые import/export-пути**

```ts
const { parseDashboardImportJson } = require("../newtab/import-export/dashboardImportExport");
const { normalizeBackupV3 } = require("../newtab/import-export/adapters");
```

- [ ] **Step 2: Запустить тесты до переноса**

Run: `npm test -- --runInBand src/__tests__/dataFormatAdapters.test.ts src/__tests__/importExportHelpers.v3.test.ts src/__tests__/chromeStorageAdapter.test.ts`

Expected: FAIL с отсутствующими модулями.

- [ ] **Step 3: Перенести сериализацию и отделить Chrome API**

```ts
// browser/bookmarks.ts
export function getBrowserBookmarksForImport(
  onReady: (items: BookmarksAsPlainList) => void,
  recentItems: RecentItem[],
  onEmpty: () => void,
): void {
  chrome.bookmarks.getTree((bookmarks) => {
    const root = bookmarks[0];
    if (!root?.children) {
      onEmpty();
      return;
    }
    const records: BookmarksAsPlainList = [];
    traverseTree(root.children, records, [], getTopVisitedFromHistory(recentItems, 1000));
    onReady(records);
  });
}
```

`getBrowserBookmarksForImport` и bookmark tree types размещаются в `browser/bookmarks.ts`. JSON parsing/export и callbacks dashboard — в `dashboardImportExport.ts`; adapters формата — в `adapters.ts`. Заменить `helpers`-импорты зависимостями новых слоёв.

- [ ] **Step 4: Запустить тесты после переноса**

Run: `npm test -- --runInBand src/__tests__/dataFormatAdapters.test.ts src/__tests__/importExportHelpers.v3.test.ts src/__tests__/chromeStorageAdapter.test.ts`

Expected: PASS.

### Task 4: Выделить UI DOM, цвет, timing и математику

**Files:**
- Create: `src/newtab/ui/dom/{roles,selection,scroll,html}.ts`
- Create: `src/newtab/ui/color/{Color,palette}.ts`
- Create: `src/newtab/shared/{math,timing}.ts`
- Modify: все imports `domRoles`, `selectionUtils`, `color`, `mathTypes`, `mathUtils` и соответствующих функций `utils.ts`
- Test: `src/__tests__/{uiStore.selection,dragAndDrop.areaSelection,useAreaSelection,actionsHelpersWithDOM}.test.ts`

**Interfaces:**
- Consumes: DOM `Element`/`HTMLElement`, `BookmarkItemV3`, `SpaceV3`, React event type только в `ui/dom/html.ts`.
- Produces: `roles.ts` — `DOM_ROLE`, `roleSelector`; `selection.ts` — selection API; `scroll.ts` — `scrollElementIntoView`; `html.ts` — `hlSearch`, `sanitizeHTML`, `blurSearch`, drag/input/parent predicates; `palette.ts` — `colors`, folder constants, `getRandomHEXColor`; `timing.ts` — `debounce`, `throttle`; `math.ts` — geometry interfaces and functions.

- [ ] **Step 1: Обновить DOM-ориентированные тесты на новые пути**

```ts
import { DOM_ROLE } from "@/newtab/ui/dom/roles";
import { getSelectedItemsIds } from "@/newtab/ui/dom/selection";
```

- [ ] **Step 2: Запустить тесты до переноса**

Run: `npm test -- --runInBand src/__tests__/uiStore.selection.test.ts src/__tests__/dragAndDrop.areaSelection.test.ts src/__tests__/useAreaSelection.test.ts`

Expected: FAIL с отсутствующими модулями.

- [ ] **Step 3: Перенести функции согласно ответственностям**

```ts
// ui/color/palette.ts
export const DEFAULT_FOLDER_COLOR = "#f0f0f0";
export const EMPTY_FOLDER_COLOR = "transparent";
export function getRandomHEXColor(): string {
  return colors[Math.round(Math.random() * (colors.length - 1))];
}
```

Перенести класс `Color` в отдельный `Color.ts`; не импортировать палитру в него. Объединить `mathTypes.ts` и `mathUtils.ts` в `shared/math.ts`. Удалить DOM- и timing-функции из `utils.ts`, заменить импорты всех consumers и mocks.

- [ ] **Step 4: Запустить тесты после переноса**

Run: `npm test -- --runInBand src/__tests__/uiStore.selection.test.ts src/__tests__/dragAndDrop.areaSelection.test.ts src/__tests__/useAreaSelection.test.ts src/__tests__/actionsHelpersWithDOM.test.ts`

Expected: PASS.

### Task 5: Переместить UI-feature helpers и закрыть оставшиеся функции

**Files:**
- Create: `src/newtab/feature/bookmarks/handleBookmarksKeyDown.ts`
- Create: `src/newtab/feature/move-to/moveToMenu.tsx`
- Create: `src/newtab/components/common/TopBar/settingsOptions.tsx`
- Modify: `src/newtab/components/common/{TopBar,Folder,SidebarItem,FolderItemMenu}/**/*.tsx`
- Modify: `src/newtab/components/root/useKeyboardAndMouseManager.tsx`
- Modify: `src/newtab/feature/dragging/{dragAndDrop,dragAndDropUtils,process*}.ts`
- Test: `src/__tests__/{styleBuildConfig,bookmarksScreenModel,getBookmarksViewState,processFolderDragAndDrop}.test.ts`

**Interfaces:**
- Consumes: новые `domain`, `browser`, `ui`, `import-export` imports.
- Produces: `handleBookmarksKeyDown` как feature API; `getFoldersList`, `getSpacesList`, `getSpacesWithNestedFoldersList` из `feature/move-to/moveToMenu`; `HelpOptions`, `SettingsOptions`, `OptionsConfig`, `Options` рядом с `TopBar`.

- [ ] **Step 1: Обновить style/build contract-тест путей `.tsx` helpers**

```ts
expect(source).not.toContain("src/newtab/helpers/settingsOptions.tsx");
expect(source).not.toContain("src/newtab/helpers/moveToHelpers.tsx");
```

- [ ] **Step 2: Запустить целевые тесты до переноса**

Run: `npm test -- --runInBand src/__tests__/styleBuildConfig.test.ts src/__tests__/processFolderDragAndDrop.test.ts`

Expected: FAIL, пока новые пути не существуют.

- [ ] **Step 3: Перенести JSX-файлы и оставшиеся функции `utils.ts`**

```ts
// components/common/TopBar/TopBar.tsx
import { HelpOptions, SettingsOptions } from "./settingsOptions";

// FolderItemMenu.tsx
import { getSpacesWithNestedFoldersList } from "@/newtab/feature/move-to/moveToMenu";
```

Поместить `actionsHelpersWithDOM.ts` в feature, которому принадлежит его вызов; если он обслуживает несколько bookmarks-компонентов — в `feature/bookmarks/actions.ts`. `getCurrentData`, `mergeObjects`, `isArraysEqual`, `genNextRuntimeId`, `SECTION_ICON_BASE64`, `IS_MAC_DEVICE` переместить к единственному consumer или тематическому модулю, не создавая общий `utils`.

- [ ] **Step 4: Запустить целевые тесты после переноса**

Run: `npm test -- --runInBand src/__tests__/styleBuildConfig.test.ts src/__tests__/processFolderDragAndDrop.test.ts src/__tests__/bookmarksScreenModel.test.ts src/__tests__/getBookmarksViewState.test.ts`

Expected: PASS.

### Task 6: Удалить legacy-каталог и выполнить полную проверку

**Files:**
- Delete: `src/newtab/helpers/**`
- Modify: все оставшиеся production и test imports
- Test: полный набор `src/__tests__`

**Interfaces:**
- Consumes: завершённые новые модули Tasks 1–5.
- Produces: проект без legacy helpers.

- [ ] **Step 1: Найти остатки legacy-путей**

Run: `rg -n '@/newtab/helpers|newtab/helpers' src`

Expected: список мест, которые необходимо перепривязать; после исправления команда не печатает строк.

- [ ] **Step 2: Удалить только проверенный каталог**

Run: `find src/newtab/helpers -type f -print`

Expected: выведены только legacy-файлы, перенесённые в Tasks 1–5.

Удалить перечисленные файлы через patch после того, как все imports заменены.

- [ ] **Step 3: Проверить архитектурные ограничения**

Run: `rg -n 'chrome\.' src/newtab/domain src/newtab/shared src/newtab/import-export || true`

Expected: пустой вывод.

Run: `rg --files src/newtab/domain src/newtab/browser src/newtab/import-export src/newtab/shared | rg '\.tsx$' || true`

Expected: пустой вывод.

- [ ] **Step 4: Выполнить полную проверку**

Run: `npm run typecheck && npm test -- --runInBand && npm run build`

Expected: все команды завершаются с кодом 0.

- [ ] **Step 5: Зафиксировать результат проверки в handoff**

Указать изменённые слои, выполненные команды и их результат. Не выполнять staging или commit без отдельного разрешения пользователя.

## Self-review

- Спецификация покрыта Tasks 1–6: dashboard/domain, search, browser API, UI DOM/color, import/export, JSX helpers и удаление legacy-каталога.
- В плане нет compatibility-модулей или новой общей папки `helpers`/`utils`.
- Имена экспортов совпадают с текущими контрактами, поэтому migration ограничена путями импортов.
