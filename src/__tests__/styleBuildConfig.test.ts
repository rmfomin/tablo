const fs = require("fs");
const path = require("path");
const { getCommonConfig } = require("../../webpack/webpack.common");

export {};

describe("style build configuration", () => {
  test("source and production manifests do not request host permissions", () => {
    const sourceManifests = [
      path.join(__dirname, "../../public/manifest-normal.json"),
      path.join(__dirname, "../../public/manifest-overrideless.json"),
    ];
    const productionManifest = path.join(__dirname, "../../dist/manifest.json");

    [...sourceManifests, productionManifest].forEach((manifestPath) => {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      expect(manifest.optional_host_permissions).toBeUndefined();
      expect(JSON.stringify(manifest)).not.toContain("<all_urls>");
    });
  });

  test("newtab html keeps linking the compiled style.css asset", () => {
    const htmlPath = path.join(__dirname, "../../public/newtab.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain('href="style.css"');
  });

  test("scss is the only source stylesheet for the compiled asset", () => {
    const scssPath = path.join(__dirname, "../../src/styles/index.scss");
    const legacyPublicScssPath = path.join(
      __dirname,
      "../../public/style.scss"
    );
    const legacyScssDirPath = path.join(__dirname, "../../public/scss");
    const legacyCssPath = path.join(__dirname, "../../public/style.css");

    expect(fs.existsSync(scssPath)).toBe(true);
    expect(fs.existsSync(legacyPublicScssPath)).toBe(false);
    expect(fs.existsSync(legacyScssDirPath)).toBe(false);
    expect(fs.existsSync(legacyCssPath)).toBe(false);
  });

  test("webpack supports component scss modules", () => {
    const config = getCommonConfig({});
    const moduleRule = config.module.rules.find((rule: { test?: RegExp }) =>
      String(rule.test).includes("module")
    );

    expect(moduleRule).toBeDefined();
  });

  test("webpack svg loader preserves viewBox for css resizing", () => {
    const config = getCommonConfig({});
    const svgRule = config.module.rules.find((rule: { test?: RegExp }) =>
      String(rule.test).includes("svg")
    );

    expect(svgRule).toBeDefined();
    expect(svgRule.use[0].loader).toBe("@svgr/webpack");
    expect(svgRule.use[0].options.svgoConfig.plugins).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "preset-default",
          params: expect.objectContaining({
            overrides: expect.objectContaining({
              removeViewBox: false,
            }),
          }),
        }),
      ])
    );
  });

  test("notification uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/Notification/Notification.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Notification.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("spaces list uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/SpacesList/SpacesList.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SpacesList.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("top bar uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/TopBar/TopBar.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/TopBar.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar item uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/SidebarItem/SidebarItem.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarItem.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar open tabs uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/SidebarOpenTabs/SidebarOpenTabs.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarOpenTabs.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar recent uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/SidebarRecent/SidebarRecent.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/SidebarRecent.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("folder item uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/FolderItem/FolderItem.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/FolderItem.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("folder group uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/FolderGroup/FolderGroup.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/FolderGroup.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("folder uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/Folder/Folder.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Folder.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("sidebar uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/Sidebar/Sidebar.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Sidebar.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("bookmarks uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/Bookmarks/Bookmarks.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Bookmarks.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("editable title uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/EditableTitle/EditableTitle.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/EditableTitle.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("bookmarks importer uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/BookmarksImporter/BookmarksImporter.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/BookmarksImporter.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("import bookmarks from settings uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/ImportBookmarksFromSettings/ImportBookmarksFromSettings.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/ImportBookmarksFromSettings.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("keyboard and mouse manager stays shared in the flat structure", () => {
    const sharedComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/root/useKeyboardAndMouseManager.tsx"
    );

    expect(fs.existsSync(sharedComponentPath)).toBe(true);
  });

  test("canvas widget runtime was removed", () => {
    const sharedComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Canvas.tsx"
    );
    const canvasDirPath = path.join(
      __dirname,
      "../../src/newtab/components/canvas"
    );

    expect(fs.existsSync(sharedComponentPath)).toBe(false);
    expect(fs.existsSync(canvasDirPath)).toBe(false);
  });

  test("settings options stays shared in the flat structure", () => {
    const sharedComponentPath = path.join(
      __dirname,
      "../../src/newtab/helpers/settingsOptions.tsx"
    );

    expect(fs.existsSync(sharedComponentPath)).toBe(true);
  });

  test("dropdown menu uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/DropdownMenu/DropdownMenu.tsx"
    );
    const legacyDirPath = path.join(
      __dirname,
      "../../src/newtab/components/dropdown"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(legacyDirPath)).toBe(false);
  });

  test("folder item menu uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/common/FolderItemMenu/FolderItemMenu.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
  });

  test("modal components use the folder-based component structure", () => {
    const modalPath = path.join(
      __dirname,
      "../../src/newtab/components/common/Modal/Modal.tsx"
    );
    const importConfirmationPath = path.join(
      __dirname,
      "../../src/newtab/components/common/ImportConfirmationModal/ImportConfirmationModal.tsx"
    );
    const shortcutsPath = path.join(
      __dirname,
      "../../src/newtab/components/common/ShortcutsModal/ShortcutsModal.tsx"
    );
    const legacyDirPath = path.join(
      __dirname,
      "../../src/newtab/components/modals"
    );

    expect(fs.existsSync(modalPath)).toBe(true);
    expect(fs.existsSync(importConfirmationPath)).toBe(true);
    expect(fs.existsSync(shortcutsPath)).toBe(true);
    expect(fs.existsSync(legacyDirPath)).toBe(false);
  });

  test("move helpers stay shared with camelCase naming", () => {
    const sharedHelperPath = path.join(
      __dirname,
      "../../src/newtab/helpers/moveToHelpers.tsx"
    );
    const legacyHelperPath = path.join(
      __dirname,
      "../../src/newtab/components/dropdown/moveToHelpers.tsx"
    );

    expect(fs.existsSync(sharedHelperPath)).toBe(true);
    expect(fs.existsSync(legacyHelperPath)).toBe(false);
  });

  test("toolbar component was removed", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/Toolbar/Toolbar.tsx"
    );
    const stylesheetPath = path.join(
      __dirname,
      "../../src/newtab/components/Toolbar/Toolbar.module.scss"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(false);
    expect(fs.existsSync(stylesheetPath)).toBe(false);
  });

  test("bookmarks local helpers are colocated with bookmarks", () => {
    const colocatedViewStatePath = path.join(
      __dirname,
      "../../src/newtab/components/common/Bookmarks/getBookmarksViewState.ts"
    );
    const legacyViewStatePath = path.join(
      __dirname,
      "../../src/newtab/components/getBookmarksViewState.ts"
    );
    const colocatedEmptyStatePath = path.join(
      __dirname,
      "../../src/newtab/components/common/Bookmarks/isEmptyDashboard.ts"
    );
    const legacyEmptyStatePath = path.join(
      __dirname,
      "../../src/newtab/components/isEmptyDashboard.ts"
    );

    expect(fs.existsSync(colocatedViewStatePath)).toBe(true);
    expect(fs.existsSync(legacyViewStatePath)).toBe(false);
    expect(fs.existsSync(colocatedEmptyStatePath)).toBe(true);
    expect(fs.existsSync(legacyEmptyStatePath)).toBe(false);
  });

  test("folder local helpers are colocated with folder", () => {
    const colocatedHelperPath = path.join(
      __dirname,
      "../../src/newtab/components/common/Folder/getFolderDisplayItems.ts"
    );
    const legacyHelperPath = path.join(
      __dirname,
      "../../src/newtab/components/getFolderDisplayItems.ts"
    );

    expect(fs.existsSync(colocatedHelperPath)).toBe(true);
    expect(fs.existsSync(legacyHelperPath)).toBe(false);
  });
});
