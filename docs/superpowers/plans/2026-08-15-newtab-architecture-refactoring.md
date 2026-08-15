# План рефакторинга архитектуры Newtab

> **Для агентных исполнителей:** использовать `superpowers:subagent-driven-development` (если доступны субагенты) либо `superpowers:executing-plans`. Шаги отмечаются чекбоксами.

**Цель:** Восстановить воспроизводимый test baseline и сделать границы newtab явными, не меняя пользовательское поведение.

**Архитектура:** Zustand stores остаются границей состояния. Browser- и DOM-эффекты изолируются в адаптерах и feature-level координаторах; компоненты получают view model и обработчики. В v3 runtime-модели normalizing legacy-данных происходит на границе импорта.

**Стек:** TypeScript, React 18, Zustand vanilla stores, Jest, Chrome Extension APIs, Webpack.

## Часть 1: Baseline и источник истины

### Задача 1: Восстановить fixture импорта/экспорта v3

**Файлы:**
- Создать: `docs/fixtures/v3-dashboard-backup.json`
- Изменить: `src/__tests__/importExportHelpers.v3.test.ts:50`

- [x] **Шаг 1: Изменить тест до RED-состояния**

Импорт fixture заменён на `../../docs/fixtures/v3-dashboard-backup.json`; существующая проверка round-trip сохранена.

- [x] **Шаг 2: Убедиться в RED-состоянии**

Выполнено: `npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand`. До создания fixture тест падал с `Cannot find module ../../docs/fixtures/v3-dashboard-backup.json`.

- [x] **Шаг 3: Создать минимальную реализацию**

Создан валидный fixture version 3: `isTablo: true`, space → folder → group → вложенная bookmark; у каждого объекта есть канонический `objectType`.

- [x] **Шаг 4: Убедиться в GREEN-состоянии**

Выполнено: тот же тест проходит, 14/14.

### Задача 2: Заменить устаревшую документацию запуска

**Файлы:**
- Изменить: `docs/app-startup-flow.md`
- Создать: `src/__tests__/appStartupDocumentation.test.ts`

- [ ] **Шаг 1: Написать падающий контрактный тест**

Тест читает `docs/app-startup-flow.md`. Он требует ссылки на `newtab/index.tsx`, `state/storage-sync/controller.ts`, `state/dashboard/dashboardStore.ts` и `state/chrome-runtime/controller.ts`; не допускает удалённые `newtab.tsx`, `state/actions.ts` и `state/storage.ts`.

- [ ] **Шаг 2: Проверить RED-состояние**

Запустить: `npm test -- --runInBand src/__tests__/appStartupDocumentation.test.ts`. Ожидается падение из-за описания legacy flow.

- [ ] **Шаг 3: Минимально обновить документ**

Зафиксировать порядок: manifest → background → HTML → импорт `index.tsx` (создаются singleton stores) → `startNewtab()` создаёт adapters/controllers → hydrate stores → favicon/theme → persistence start → mount `App` → `App.useEffect` запускает chrome-runtime controller. Отдельно описать владельцев dashboard, UI и chrome-runtime состояния.

- [ ] **Шаг 4: Проверить GREEN-состояние**

Запустить команду шага 2; ожидается PASS.

## Часть 2: Модель v3 и граница импорта

### Задача 3: Канонизировать discriminator items в runtime

**Файлы:**
- Изменить: `src/newtab/helpers/types.ts`
- Изменить: `src/newtab/helpers/dataFormatAdapters.ts`
- Изменить: `src/newtab/helpers/importExportHelpers.ts`
- Изменить: все runtime/test fixtures, которые создают `ItemV3`
- Проверить: `src/__tests__/dataFormatAdapters.test.ts`, `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Шаг 1: Написать падающие тесты**

Добавить проверку: legacy JSON item только с `type` допускается на входе адаптера; после `normalizeBackupV3` и при export у каждого item есть совпадающий `objectType`.

- [ ] **Шаг 2: Проверить RED-состояние**

Запустить: `npm test -- --runInBand src/__tests__/dataFormatAdapters.test.ts src/__tests__/importExportHelpers.v3.test.ts`. Ожидается падение для требования обязательного `objectType`.

- [ ] **Шаг 3: Минимально реализовать границу совместимости**

Сделать `objectType` обязательным у `BookmarkItemV3` и `GroupV3`. Сохранить `type` как временное compatibility-поле, пока потребители не мигрированы. Runtime guard принимает legacy JSON без `objectType`; адаптер дополняет discriminator до формирования runtime `ItemV3`. Обновить все типизированные literals и fixtures.

- [ ] **Шаг 4: Проверить GREEN-состояние**

Запустить тесты шага 2 и `npm run typecheck`; ожидается PASS.

## Часть 3: Границы UI и browser-эффектов

### Задача 4: Извлечь чистую фабрику данных экрана bookmarks

**Файлы:**
- Создать: `src/newtab/feature/bookmarks/bookmarksScreenModel.ts`
- Изменить: `src/newtab/components/common/Bookmarks/Bookmarks.tsx`
- Создать: `src/__tests__/bookmarksScreenModel.test.ts`

- [ ] **Шаг 1: Написать падающий тест чистой фабрики**

Проверить, что фабрика принимает dashboard/UI/runtime snapshot и возвращает ровно данные экрана и команды, необходимые `Bookmarks`; selection-reset остаётся прежним. Не тестировать React-hook без renderer/jsdom.

- [ ] **Шаг 2: Проверить RED-состояние**

Запустить: `npm test -- --runInBand src/__tests__/bookmarksScreenModel.test.ts`. Ожидается ошибка отсутствующего модуля.

- [ ] **Шаг 3: Минимально реализовать фабрику**

Вынести чистое формирование props и command-bundle из `Bookmarks.tsx`. Zustand selectors остаются в тонком hook/компоненте; DOM listener lifecycle и JSX не переносятся в domain.

- [ ] **Шаг 4: Проверить GREEN-состояние**

Запустить тест шага 2, `src/__tests__/getBookmarksViewState.test.ts` и `src/__tests__/uiStore.selection.test.ts`; ожидается PASS.

### Задача 5: Убрать singleton UI store из drag-and-drop

**Файлы:**
- Изменить: `src/newtab/feature/dragging/dragAndDrop.ts`
- Изменить: вызовы в `src/newtab/components/common/Bookmarks/Bookmarks.tsx`
- Изменить: вызовы в `src/newtab/components/common/Sidebar/Sidebar.tsx`
- Создать: `src/newtab/feature/dragging/selectionCommands.ts`
- Изменить/создать: unit-тесты для чистого resolver dependency

- [ ] **Шаг 1: Написать падающий unit-тест**

Вынести чистую функцию, которая получает selected ids и command clear-selection. Тест доказывает, что конфигурация drag-and-drop строится без импорта singleton `uiStore`, не моделируя DOM mouse traversal.

- [ ] **Шаг 2: Проверить RED-состояние**

Запустить новый тест; ожидается ошибка отсутствующего модуля/экспорта.

- [ ] **Шаг 3: Минимально реализовать dependency object**

Передавать в `bindDADItemEffect` маленький объект `{ selectedItemIds, clearSelectedItemIds }`. Вызовы `Bookmarks` и `Sidebar` передают значения из selector. DOM-алгоритм и semantics drop не меняются.

- [ ] **Шаг 4: Проверить GREEN-состояние**

Запустить новый test и все `src/__tests__/dragAndDrop*.test.ts`; ожидается PASS.

## Финальная проверка

- [ ] Выполнить `npm run typecheck`.
- [ ] Выполнить `npm test -- --runInBand`.
- [ ] Выполнить `git diff --check` и `git status --short`.
- [ ] Не выполнять `git add` и commit: это запрещено инструкциями проекта.
