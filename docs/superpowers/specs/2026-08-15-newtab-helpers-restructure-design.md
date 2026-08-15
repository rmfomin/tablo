# Реструктуризация newtab helpers

## Цель

Удалить `src/newtab/helpers` и разнести его содержимое по слоям `domain`, `browser`, `ui`, `import-export` и `shared`, не меняя пользовательское поведение.

## Границы этапа

В этап входят переносы модулей, замена всех production- и test-импортов, а также удаление каталога `helpers`.

Не входит декомпозиция `Folder.tsx`, `Sidebar.tsx` и `SearchInput.tsx`, кроме корректировки их импортов.

## Целевая структура

```text
src/newtab/
  domain/
    dashboard/
      types.ts
      traversal.ts
      fractionalIndexes.ts
      itemUtils.ts
      ensureDefaultSpace.ts
    search/
      filters.ts
  browser/
    bookmarks.ts
    history.ts
    tabs.ts
    favicons.ts
  ui/
    dom/
      roles.ts
      selection.ts
      scroll.ts
      html.ts
    color/
      Color.ts
      palette.ts
  import-export/
    adapters.ts
    dashboardImportExport.ts
  feature/
    bookmarks/
      handleBookmarksKeyDown.ts
    move-to/
      moveToMenu.tsx
  components/common/TopBar/
    settingsOptions.tsx
  shared/
    math.ts
    timing.ts
```

## Распределение ответственности

- `domain/dashboard` содержит модель dashboard и чистые операции над ней. Он не зависит от React, DOM и Chrome API.
- `domain/search/filters.ts` содержит типы и чистые предикаты поиска для bookmark, recent и tab записей.
- `browser` изолирует прямой доступ к `chrome.tabs`, `chrome.history` и `chrome.bookmarks`. Модули могут зависеть от domain-типов, но не от React-компонентов.
- `ui/dom` содержит функции, работающие с DOM: роли, выбранные элементы, прокрутка, безопасная HTML-подсветка и DOM-предикаты.
- `ui/color/Color.ts` содержит только класс преобразования цвета; `palette.ts` — палитры и цветовые константы.
- `import-export/adapters.ts` валидирует и нормализует JSON-формат backup. `dashboardImportExport.ts` собирает и разбирает dashboard/space backup; обращение к Chrome bookmark API остаётся в `browser/bookmarks.ts`.
- `shared/math.ts` объединяет геометрические типы и чистые математические функции. `shared/timing.ts` экспортирует `debounce` и `throttle`.
- JSX-функции меню перенесены из общего слоя: настройки живут рядом с `TopBar`, меню перемещения — в UI-feature, общем для его потребителей.

## Перенос legacy-файлов

| Исходный файл | Целевой файл |
| --- | --- |
| `helpers/types.ts` | `domain/dashboard/types.ts` |
| `helpers/v3Traversal.ts` | `domain/dashboard/traversal.ts` |
| `helpers/fractionalIndexes.ts` | `domain/dashboard/fractionalIndexes.ts` |
| чистые функции из `state/dashboard/itemUtils.ts` | `domain/dashboard/itemUtils.ts` |
| tab/recent-преобразования из `state/dashboard/itemUtils.ts` | `browser/tabs.ts` |
| `helpers/ensureDefaultSpace.ts` | `domain/dashboard/ensureDefaultSpace.ts` |
| `helpers/dataFormatAdapters.ts` | `import-export/adapters.ts` |
| `helpers/importExportHelpers.ts` | `import-export/dashboardImportExport.ts` и `browser/bookmarks.ts` |
| `helpers/recentHistoryUtils.ts` | `browser/history.ts` |
| `helpers/faviconUtils.ts` | `browser/favicons.ts` |
| tab-функции из `helpers/utils.ts` | `browser/tabs.ts` |
| search-функции из `helpers/utils.ts` | `domain/search/filters.ts` |
| palette и folder-константы из `helpers/utils.ts` | `ui/color/palette.ts` |
| `helpers/color.ts` | `ui/color/Color.ts` |
| `helpers/domRoles.ts` | `ui/dom/roles.ts` |
| `helpers/selectionUtils.ts` | `ui/dom/selection.ts` |
| DOM-функции из `helpers/utils.ts` | `ui/dom/scroll.ts` и `ui/dom/html.ts` |
| `helpers/mathTypes.ts`, `helpers/mathUtils.ts` | `shared/math.ts` |
| timing-функции из `helpers/utils.ts` | `shared/timing.ts` |
| `helpers/handleBookmarksKeyDown.ts` | `feature/bookmarks/handleBookmarksKeyDown.ts` |
| `helpers/moveToHelpers.tsx` | `feature/move-to/moveToMenu.tsx` |
| `helpers/settingsOptions.tsx` | `components/common/TopBar/settingsOptions.tsx` |

Оставшиеся чистые общие функции из `utils.ts` распределяются по единственному потребителю или ближайшему ответственному модулю; не создаётся новый общий "utils"-файл.

## Совместимость и миграция

- Публичные сигнатуры функций сохраняются, если изменение имени не требуется новым расположением.
- Старые пути не получают compatibility re-export: все импорты production-кода и Jest-моков обновляются в одной серии изменений.
- Browser-модули не импортируются domain-модулями.
- JSX остаётся только в компонентах и `feature`; в новых `domain`, `browser`, `shared`, `import-export` используется `.ts`.

## Проверка

1. `rg` не находит импортов `@/newtab/helpers` и файлов в `src/newtab/helpers`.
2. Целевые unit-тесты для search, traversal, import/export, selection и drag-and-drop проходят после обновления путей.
3. `npm run typecheck` проходит.
4. `npm test -- --runInBand` проходит.
5. `npm run build` проходит.

## Риски

- Jest-моки привязаны к абсолютным путям: их надо переносить одновременно с production-импортами.
- `chrome.*` недоступен в части тестов: browser-границы должны оставаться легко мокируемыми.
- Функции, использующие DOM, не должны попасть в `domain` или `shared`.
