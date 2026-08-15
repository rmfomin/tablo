# FSD-миграция newtab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Привести `src/newtab` к FSD-структуре и удалить legacy `helpers` без изменения поведения расширения.

**Architecture:** Модель dashboard находится в `05-entities`; пользовательские сценарии — в `04-features`; крупные UI-блоки — в `03-widgets`; точечная интеграция Chrome API и нейтральные утилиты — в `06-shared`; запуск приложения — в `01-app`. Промежуточные каталоги заменяются конечными нумерованными FSD-путями.

**Tech Stack:** TypeScript, React, Zustand, Chrome Extensions API, Jest, Webpack.

## Global Constraints

- Не менять пользовательское поведение и публичные сигнатуры переносимых функций.
- Не оставлять `src/newtab/helpers`, `domain`, `browser`, `ui` или `import-export` как верхнеуровневые каталоги.
- `05-entities/dashboard` не зависит от React, DOM или `chrome.*`.
- Прямой Chrome API расположен только в `06-shared/api/chrome` и существующих app-level runtime adapters.
- Feature не импортирует widget; `shared` не импортирует feature, entity или widget.
- Не выполнять `git add` и не создавать коммиты без отдельного разрешения пользователя.

### Task 1: Перенести entity и shared foundation

**Files:**
- Move: intermediate entity modules → `src/newtab/05-entities/dashboard/model/*`
- Move: intermediate Chrome adapters → `src/newtab/06-shared/api/chrome/*`
- Move: intermediate DOM/color/math/timing modules → `src/newtab/06-shared/lib/*`
- Modify: все imports и Jest mocks этих модулей
- Test: `src/__tests__/{v3Traversal,dashboardItemUtils,ensureDefaultSpace,utils.searchFilters,browserTabs,chromeRuntimeController,uiStore.selection,dragAndDrop.areaSelection,useAreaSelection}.test.ts`

**Interfaces:**
- Produces: прежние named exports из новых FSD-путей.

- [ ] **Step 1: Перевести test imports на FSD-пути**

```ts
import type { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";
import { findTabsByURL } from "@/newtab/06-shared/api/chrome/tabs";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";
```

- [ ] **Step 2: Запустить тесты для RED**

Run: `npm test -- --runInBand src/__tests__/v3Traversal.test.ts src/__tests__/browserTabs.test.ts src/__tests__/uiStore.selection.test.ts`

Expected: FAIL с отсутствующими FSD-модулями.

- [ ] **Step 3: Переместить модули и обновить imports**

```ts
import { faviconsStorage } from "@/newtab/06-shared/api/chrome/favicons";
import { debounce } from "@/newtab/06-shared/lib/timing";
```

Перенести файлы без изменения экспортов; обновить production imports и mocks. Удалить пустые промежуточные каталоги только после отсутствия их imports.

- [ ] **Step 4: Выполнить проверки**

Run: `npm test -- --runInBand src/__tests__/v3Traversal.test.ts src/__tests__/dashboardItemUtils.test.ts src/__tests__/browserTabs.test.ts src/__tests__/utils.searchFilters.test.ts src/__tests__/uiStore.selection.test.ts src/__tests__/dragAndDrop.areaSelection.test.ts src/__tests__/useAreaSelection.test.ts && npm run typecheck && git diff --check`

Expected: PASS.

### Task 2: Выделить features

**Files:**
- Move: search filters and `SearchInput` → `src/newtab/04-features/bookmark-search/`
- Move: import parser/adapter/UI → `src/newtab/04-features/bookmarks-import/`
- Move: export functions/UI action → `src/newtab/04-features/bookmarks-export/`
- Move: move-to JSX helper → `src/newtab/04-features/move-to-folder/`
- Move: keyboard and bookmark action helpers → `src/newtab/04-features/bookmarks/`
- Move: area selection and dragging → `src/newtab/04-features/{area-selection,dragging}/`
- Test: current search, import/export, area selection and drag-and-drop tests

**Interfaces:**
- Consumes: entity dashboard model and shared modules only.
- Produces: feature-local public functions/components consumed by widgets and app.

- [ ] **Step 1: Перевести feature-тесты на будущие импорты**

```ts
import { parseDashboardImportJson } from "@/newtab/04-features/bookmarks-import/model/dashboardImportExport";
import { getSearchFilterRegexError } from "@/newtab/04-features/bookmark-search/model/filters";
```

- [ ] **Step 2: Запустить RED**

Run: `npm test -- --runInBand src/__tests__/utils.searchFilters.test.ts src/__tests__/importExportHelpers.v3.test.ts src/__tests__/dragAndDrop.areaSelection.test.ts`

Expected: FAIL с отсутствующими feature-модулями.

- [ ] **Step 3: Переместить feature-код и отделить import/export API**

```ts
import { createExportBackupV3 } from "@/newtab/04-features/bookmarks-export/model/dashboardExport";
import { parseDashboardImportJson } from "@/newtab/04-features/bookmarks-import/model/dashboardImportExport";
```

Разделить прежний `dashboardImportExport.ts`: JSON parse/import находится в bookmarks-import, создание и загрузка JSON export — в bookmarks-export. Обновить consumers, imports и Jest mocks.

- [ ] **Step 4: Проверить feature-граф**

Run: `rg -n '@/newtab/03-widgets' src/newtab/04-features || true`

Expected: пустой вывод.

Run: `npm test -- --runInBand src/__tests__/utils.searchFilters.test.ts src/__tests__/importExportHelpers.v3.test.ts src/__tests__/dataFormatAdapters.test.ts src/__tests__/dragAndDrop.areaSelection.test.ts src/__tests__/processFolderDragAndDrop.test.ts && npm run typecheck`

Expected: PASS.

### Task 3: Собрать widgets и app/page entry points

**Files:**
- Move: `components/common/Bookmarks`, `Folder`, `FolderItem`, `FolderGroup` → `widgets/dashboard/`
- Move: `components/common/Sidebar*` → `widgets/sidebar/`
- Move: `components/common/TopBar` → `widgets/top-bar/`
- Move: `components/common/SpacesList` → `widgets/spaces-list/`
- Move: `components/root/{App,useKeyboardAndMouseManager}.tsx` → `app/`
- Move: `index.tsx` → `app/index.tsx`; create minimal `pages/newtab/` composition entry only if required by imports
- Modify: imports, styles and style-build path contracts
- Test: widget contract, style and app startup tests

**Interfaces:**
- Consumes: features, entities, shared.
- Produces: `app/index.tsx` mounts the newtab application; widgets expose their current components through local paths.

- [ ] **Step 1: Update app/widget contract tests to FSD paths**

```ts
expect(source).toContain("src/newtab/03-widgets/top-bar");
expect(source).not.toContain("src/newtab/components/common/TopBar");
```

- [ ] **Step 2: Run RED**

Run: `npm test -- --runInBand src/__tests__/styleBuildConfig.test.ts src/__tests__/appStartupDocumentation.test.ts src/__tests__/bookmarksScreenAdapter.contract.test.ts`

Expected: FAIL until paths are moved.

- [ ] **Step 3: Move widget and app directories, preserving local styles/assets**

```ts
import { Sidebar } from "@/newtab/03-widgets/sidebar/Sidebar";
import { TopBar } from "@/newtab/03-widgets/top-bar/TopBar";
```

Переместить каждый компонент вместе с `.module.scss`, `.global.scss`, `icons/`, local hooks и pure local helpers. Обновить aliases in source/tests; не менять CSS selectors и DOM roles.

- [ ] **Step 4: Run widget and app verification**

Run: `npm test -- --runInBand src/__tests__/styleBuildConfig.test.ts src/__tests__/styleSelectors.test.ts src/__tests__/appStartupDocumentation.test.ts src/__tests__/bookmarksScreenAdapter.contract.test.ts && npm run typecheck`

Expected: PASS.

### Task 4: Удалить legacy paths и проверить FSD boundaries

**Files:**
- Delete: `src/newtab/helpers/**`, empty old top-level directories, empty `components/` and old `feature/` directories
- Modify: all remaining imports/tests
- Test: entire suite

- [ ] **Step 1: Verify no legacy and intermediate imports remain**

Run: `rg -n '@/newtab/(helpers|domain|browser|ui|import-export|components|feature)/|newtab/(helpers|domain|browser|ui|import-export|components|feature)/' src`

Expected: empty output, except intentionally retained non-newtab root tooling paths.

- [ ] **Step 2: Delete only validated empty/legacy directories**

Run: `find src/newtab/helpers src/newtab/domain src/newtab/browser src/newtab/ui src/newtab/import-export -type f -print 2>/dev/null`

Expected: empty output before removing directories.

- [ ] **Step 3: Check FSD architecture constraints**

Run: `rg -n 'chrome\.' src/newtab/05-entities src/newtab/04-features src/newtab/03-widgets || true`

Expected: empty output.

Run: `rg -n '@/newtab/03-widgets' src/newtab/04-features src/newtab/05-entities src/newtab/06-shared || true`

Expected: empty output.

- [ ] **Step 4: Full verification**

Run: `npm run typecheck && npm test -- --runInBand && npm run build && git diff --check`

Expected: exit code 0 for every command.

- [ ] **Step 5: Handoff**

Report moved layers, final verification output and any deliberate compatibility decision. Do not stage or commit without user authorization.

## Self-review

- Plan covers entity/shared, feature, widget/app and cleanup layers from the approved FSD design.
- Every planned transitional top-level directory is deleted only after imports and tests point to FSD paths.
- No compatibility re-export or new catch-all helper directory is created.
