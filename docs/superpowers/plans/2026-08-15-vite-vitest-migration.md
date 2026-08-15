# Vite and Vitest Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Replace Tablo's Webpack and Jest/ts-jest tooling with Vite and Vitest while preserving both Chrome-extension build variants and existing test behavior.

**Architecture:** Vite builds the new-tab and service-worker entries and copies static public assets into `dist`. A small Vite plugin selects the requested manifest and emits it as `dist/manifest.json`. Vitest uses the existing test source files, with `happy-dom` only for tests requiring browser DOM APIs.

**Tech Stack:** Vite, `vite-plugin-svgr`, Vitest, happy-dom, TypeScript, Prettier, Volta.

## Global Constraints

- Preserve `dist` as the unpacked extension directory.
- Preserve `js/newtab.js`, `js/background.js`, `style.css`, and both manifest variants.
- Do not add e2e tests, CI, linting, or git hooks.
- Do not change application behavior or Chrome-extension permissions.
- Do not create commits or stage files without explicit user approval.

---

### Task 1: Add a Vite build configuration

**Files:**
- Create: `vite.config.ts`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Test: `src/__tests__/styleBuildConfig.test.ts`

**Interfaces:**
- Consumes: `BUILD_TYPE=normal|overrideless`, `public/manifest-normal.json`, and `public/manifest-overrideless.json`.
- Produces: `dist/manifest.json`, `dist/js/newtab.js`, `dist/js/background.js`, and `dist/style.css`.

- [x] **Step 1: Write the failing build-contract test**

Update the configuration contract test to load `vite.config.ts` and assert the Vite configuration contains the new-tab and background Rollup inputs and resolves `@` to `src`.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- styleBuildConfig.test.ts --runInBand`

Expected: FAIL because `vite.config.ts` does not exist.

- [x] **Step 3: Implement the Vite configuration**

Create `vite.config.ts` with React, SVGR and static manifest selection. Configure Rollup inputs:

```ts
input: {
  newtab: path.resolve(__dirname, 'public/newtab.html'),
  background: path.resolve(__dirname, 'src/background.ts'),
}
```

Emit stable filenames under `js/`, extract the global stylesheet to `style.css`, copy `public/`, and replace only the output manifest according to `BUILD_TYPE`.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- styleBuildConfig.test.ts --runInBand`

Expected: PASS.

- [x] **Step 5: Run normal and overrideless builds**

Run: `npm run build:normal && npm run build:overrideless`

Expected: both commands exit 0; the normal output has `chrome_url_overrides`, while the overrideless output does not.

### Task 2: Replace Jest with Vitest

**Files:**
- Create: `vitest.config.ts`
- Modify: `package.json`
- Modify: `src/__tests__/styleBuildConfig.test.ts`
- Delete: `jest.config.js`

**Interfaces:**
- Consumes: existing tests in `src/__tests__` and TypeScript alias `@`.
- Produces: `npm test` and `npm run test:watch` commands backed by Vitest.

- [x] **Step 1: Write a failing Vitest configuration test**

Add a configuration test that imports `vitest.config.ts` and asserts alias `@` resolves to `src` and DOM tests use `happy-dom`.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npx vitest run src/__tests__/styleBuildConfig.test.ts`

Expected: FAIL because Vitest and its config are absent.

- [x] **Step 3: Implement Vitest configuration and adapt test APIs**

Add Vitest and happy-dom, configure `globals: true`, compatible `@` aliases, and happy-dom for `*.dom.test.ts`. Replace imports/references to Jest where required with Vitest equivalents. Remove Jest, ts-jest, `@types/jest`, and `jest.config.js`.

- [x] **Step 4: Run all unit and DOM tests**

Run: `npm test`

Expected: 47 test suites and 180 tests pass, with no Jest runtime dependency.

### Task 3: Preserve publishing and add developer checks

**Files:**
- Modify: `package.json`
- Modify: `webpack/publish.js`
- Modify: `README.md`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: `npm run build:normal`, `npm run build:overrideless`, and `dist`.
- Produces: `npm run check`, `npm run publish`, `npm run publish-patch`, and reproducible Node/npm setup.

- [x] **Step 1: Write a failing package-script contract test**

Extend `styleBuildConfig.test.ts` to assert `check` is `typecheck && test && build`, publishing invokes both named build variants, and `package.json.volta` pins Node and npm.

- [x] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- styleBuildConfig.test.ts`

Expected: FAIL because the scripts and Volta metadata are absent.

- [x] **Step 3: Implement package scripts and publication changes**

Add `build:normal`, `build:overrideless`, `test:watch`, and `check`. Update `webpack/publish.js` to call explicit build scripts. Add Volta metadata matching the supported local Node/npm versions. Update README to use `npm ci` and list the new commands. Do not add formatting commands: the existing codebase has no uniform Prettier baseline.

- [x] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- styleBuildConfig.test.ts`

Expected: PASS.

- [x] **Step 5: Install lockfile changes and run final verification**

Run: `npm install && npm run typecheck && npm test && npm run build && npm run build:overrideless && npm run check`

Expected: all commands exit 0; `package-lock.json` has no Webpack or Jest packages and contains the Vite/Vitest toolchain.
