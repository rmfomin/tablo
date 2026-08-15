# FSD-архитектура newtab

## Цель

Перестроить `src/newtab` по FSD, удалить legacy-каталог `helpers` и закрепить понятные границы между моделью dashboard, пользовательскими действиями, UI-блоками и Chrome API.

## Целевая структура

```text
src/newtab/
  01-app/
    App.tsx
    index.tsx
  02-pages/
    newtab/
  03-widgets/
    dashboard/
    sidebar/
    top-bar/
    spaces-list/
  04-features/
    bookmark-search/
    bookmarks-import/
    bookmarks-export/
    move-to-folder/
    area-selection/
    dragging/
  05-entities/
    dashboard/
      model/
        types.ts
        traversal.ts
        fractionalIndexes.ts
        itemUtils.ts
        ensureDefaultSpace.ts
      lib/
  06-shared/
    api/
      chrome/
        tabs.ts
        history.ts
        bookmarks.ts
        favicons.ts
    lib/
      dom/
        roles.ts
        selection.ts
        scroll.ts
        html.ts
      color/
        Color.ts
        palette.ts
      math.ts
      timing.ts
    ui/
```

## Границы слоёв

- `01-app` создаёт приложение, stores и глобальные side effects; он может собирать нижележащие слои.
- `02-pages` описывает страницу новой вкладки. Если отдельный page-слой пока не приносит пользы, он может быть минимальным адаптером над widgets.
- `03-widgets` содержат крупные повторно используемые UI-блоки и их локальные компоненты: dashboard, sidebar, top bar и spaces list.
- `04-features` содержат завершённые пользовательские действия: поиск, импорт, экспорт, перемещение, area selection и drag-and-drop. Feature может использовать entity и shared, но не импортирует widget.
- `05-entities/dashboard` — только dashboard-модель и чистые операции. Она не зависит от React, DOM или Chrome API.
- `06-shared/api/chrome` — единственный слой прямого доступа к `chrome.tabs`, `chrome.history`, `chrome.bookmarks` и favicon-данным браузера.
- `06-shared/lib` — технические нейтральные функции: DOM, цвет, математика и timing. Он не зависит от features, entities или widgets.

## Миграция уже выделенных модулей

| Промежуточный путь | FSD-путь |
| --- | --- |
| промежуточные entity-модули | `05-entities/dashboard/model/*` |
| search filters | `04-features/bookmark-search/model/filters.ts` |
| browser adapters | `06-shared/api/chrome/{tabs,history,bookmarks,favicons}.ts` |
| DOM/color/math/timing | `06-shared/lib/*` |
| import/export | `04-features/bookmarks-import/*` и `04-features/bookmarks-export/*` |
| bookmark/move-to helpers | `04-features/bookmarks/*` и `04-features/move-to-folder/*` |
| TopBar settings | `03-widgets/top-bar/model/settingsOptions.tsx` |

## Компоненты

- `Folder`, `FolderItem`, `FolderGroup`, `Bookmarks` и их local helpers относятся к `03-widgets/dashboard`.
- `Sidebar`, `SidebarItem`, `SidebarOpenTabs`, `SidebarRecent` относятся к `03-widgets/sidebar`.
- `TopBar` и настройки относятся к `03-widgets/top-bar`.
- `SpacesList` относится к `03-widgets/spaces-list`.
- `SearchInput` становится UI-частью `04-features/bookmark-search`.

Декомпозиция крупных компонентов выполняется только после перемещения: локальные подкомпоненты, hooks и view-model остаются в каталоге соответствующего widget или feature.

## Проверка

1. В `src/newtab` нет `helpers`, `domain`, `browser`, `ui` или `import-export` как верхнеуровневых каталогов.
2. Нет импортов `@/newtab/helpers/*` и промежуточных путей.
3. `05-entities/dashboard` не импортирует React, DOM или `chrome.*`.
4. Прямой `chrome.*` находится только в `06-shared/api/chrome` и app-level runtime adapters.
5. `npm run typecheck`, `npm test -- --runInBand` и `npm run build` завершаются успешно.
