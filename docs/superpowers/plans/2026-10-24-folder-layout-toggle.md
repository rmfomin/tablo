# Переключатель раскладки папок — план реализации

> **Для исполнителя:** выполнять план последовательно в текущей задаче; отмечать пункты по мере выполнения.

**Цель:** Добавить в настройки переключатель свободной раскладки папок и выравнивания по строкам.

**Архитектура:** Хранить режим как глобальную настройку интерфейса, используя существующее сохранение настроек. При выравнивании отключать вычисление индивидуального размера строк для masonry и позволять CSS Grid задавать высоту строки по самой высокой папке.

**Технологии:** TypeScript, React, Zustand, CSS Modules / SCSS.

**Спецификация:** `docs/superpowers/specs/2026-10-24-folder-layout-toggle-design.md`

## Общие ограничения

- Настройка по умолчанию — `false`, то есть текущая свободная раскладка.
- Свитчер расположен после «Show group backgrounds».
- Выравнивание применяется ко всем пространствам и сохраняется между запусками и в настройках экспорта.
- Порядок папок, число колонок, адаптивность и drag-and-drop остаются прежними.

## На что обратить внимание при проверке изменений

- Отсутствующая или некорректная настройка должна нормализоваться в `false`.
- После переключения должны сбрасываться инлайновые `grid-row-end` от свободного режима.
- Изменение числа колонок должно сохранять стандартное выравнивание по высоте каждой строки.

## Файлы и ответственность

- `src/newtab/05-entities/preferences/model/preferences.ts` — тип, значение по умолчанию и экспорт настройки.
- `src/newtab/01-app/model/ui/uiStore.ts` — действие переключения настройки.
- `src/newtab/03-widgets/top-bar/TopBar/settingsOptions.tsx` — свитчер после «Show group backgrounds».
- `src/newtab/03-widgets/dashboard/Bookmarks/Bookmarks.tsx` — передача режима в раскладку и выбор алгоритма расчёта.
- `src/newtab/03-widgets/dashboard/Bookmarks/Bookmarks.module.scss` — естественная высота строк Grid в выровненном режиме.

## План задач

### Task 1: Добавить сохраняемую настройку и свитчер

**Файлы:**
- Изменить `src/newtab/05-entities/preferences/model/preferences.ts`.
- Изменить `src/newtab/01-app/model/ui/uiStore.ts`.
- Изменить `src/newtab/03-widgets/top-bar/TopBar/settingsOptions.tsx`.

- [x] Добавить в `UiPreferences` булево поле `alignFolderRows`; задать ему `defaultValue: false`, валидатор `isBoolean` и `includeInBackup: true`.
- [x] Добавить действие `setAlignFolderRows(alignFolderRows: boolean)` в UI store.
- [x] Добавить настройку «Align folders in rows» сразу после «Show group backgrounds»; значение свитчера связано с `alignFolderRows`.

### Task 2: Переключить раскладку Grid

**Файлы:**
- Изменить `src/newtab/03-widgets/dashboard/Bookmarks/Bookmarks.tsx`.
- Изменить `src/newtab/03-widgets/dashboard/Bookmarks/Bookmarks.module.scss`.

- [x] Подписать `Bookmarks` на `alignFolderRows` и добавить состояние режима к элементу сетки.
- [x] При выключенном режиме сохранить текущий `updateMasonryLayout`; при включённом очищать у дочерних элементов инлайновый `grid-row-end`, созданный masonry-режимом.
- [x] Перезапускать наблюдение/перерасчёт раскладки при смене настройки, сохраняя очистку observers и слушателей при размонтировании.
- [x] Для выровненного режима задать `grid-auto-rows: auto`, чтобы высота строки определялась самой высокой папкой.

## Ограничения выполнения

Тесты, lint, prettier и build не запускать без отдельной просьбы пользователя, согласно правилам проекта. Коммиты и staging не выполнять.
