# Bookmark Context Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Keep a right-clicked bookmark highlighted after its menu closes and make hover and selection rectangular and visually consistent.

**Architecture:** Store context selection in the existing `selectedItemIds` UI state. Render hover and selection on the same bookmark row bounds, with distinct colors and no rounded outline.

**Tech Stack:** React, Zustand, SCSS modules, Vitest, happy-dom.

**Spec:** `docs/superpowers/specs/2026-10-24-bookmark-context-selection-design.md`

## Global Constraints

- Preserve existing multi-selection when right-clicking one of its selected bookmarks.
- Right-click on an unselected bookmark selects only that bookmark.
- Closing the context menu does not clear selection.
- Build the project after the implementation iteration.

## Review Focus

- Right-click a selected member of a multi-selection preserves every selected id — test in the FolderItem DOM test.
- Closing the context menu leaves the bookmark selected — test in the FolderItem DOM test.
- Clicking empty space and clicking another bookmark clear selection through existing area-selection and drag-click cleanup paths.
- Hover and selection use the same rectangular bounds — assert in the selection styles test.
- Existing selected styling for drag previews and opened bookmarks remains intact — verify target tests and build.

---

### Task 1: Context-menu selection and bookmark visuals

**Files:**
- Modify: `src/newtab/03-widgets/dashboard/FolderItem/FolderItem.tsx`
- Modify: `src/newtab/03-widgets/dashboard/FolderItem/FolderItem.module.scss`
- Test: `src/__tests__/folderItemContextMenuWithDOM.test.ts`
- Test: `src/__tests__/selectionStyles.test.ts`

- [x] Add DOM coverage for right-click selection, preserving an existing multi-selection, and persistence after menu close.
- [x] Run the focused DOM test and confirm it fails on missing selection behavior.
- [x] Update the context-menu handler to select the clicked bookmark only when it is not already selected; opening/closing the menu remains independent.
- [x] Move selected paint to the same rectangular row pseudo-element used by hover, with a distinct fill and subtle square outline.
- [x] Run the focused tests, TypeScript check, build, and `git diff --check`.

**Verification:** `npm test -- folderItemContextMenuWithDOM selectionStyles areaSelection` — 13 passed; `npm run typecheck` — passed; `npm run build` — passed (181 modules); `git diff --check` — passed.

**Review:** Independent review found no behavioral or styling defects. Direct integration coverage for clearing via a click on blank space or another bookmark was not added; existing cleanup paths were left unchanged.
