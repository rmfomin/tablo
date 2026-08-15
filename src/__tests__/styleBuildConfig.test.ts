const fs = require("fs");
const path = require("path");

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
    const htmlPath = path.join(__dirname, "../../newtab.html");
    const html = fs.readFileSync(htmlPath, "utf8");

    expect(html).toContain('src="/src/newtab/01-app/index.tsx"');
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

  test("vite config keeps extension entry points and SVG viewBox", () => {
    const configPath = path.join(__dirname, "../../vite.config.ts");
    const config = fs.readFileSync(configPath, "utf8");

    expect(config).toContain('newtab: path.resolve(__dirname, "newtab.html")');
    expect(config).toContain('background: path.resolve(__dirname, "src/background.ts")');
    expect(config).toContain('alias: { "@": path.resolve(__dirname, "src") }');
    expect(config).toContain("removeViewBox: false");
  });

  test("vitest config keeps the source alias and isolates DOM tests", () => {
    const configPath = path.join(__dirname, "../../vitest.config.ts");
    const config = fs.readFileSync(configPath, "utf8");

    expect(config).toContain('alias: { "@": path.resolve(__dirname, "src") }');
    expect(config).toContain('"**/*WithDOM.test.ts", "happy-dom"');
  });

  test("package scripts provide reproducible Vite checks and publishing", () => {
    const packagePath = path.join(__dirname, "../../package.json");
    const publishPath = path.join(__dirname, "../../webpack/publish.js");
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const publishSource = fs.readFileSync(publishPath, "utf8");

    expect(packageJson.scripts.check).toBe(
      "npm run typecheck && npm test && npm run build",
    );
    expect(packageJson.scripts["build:normal"]).toBe("vite build --mode normal");
    expect(packageJson.scripts["build:overrideless"]).toBe(
      "vite build --mode overrideless",
    );
    expect(packageJson.volta).toEqual({ node: "24.15.0", npm: "11.12.1" });
    expect(publishSource).toContain("npm run build:${buildType}");
    expect(publishSource).toContain('buildProject("normal")');
    expect(publishSource).toContain('buildProject("overrideless")');
  });

  test("notification uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/03-widgets/ui/Notification/Notification.tsx"
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
      "../../src/newtab/03-widgets/spaces-list/SpacesList/SpacesList.tsx"
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
      "../../src/newtab/03-widgets/top-bar/TopBar/TopBar.tsx"
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
      "../../src/newtab/03-widgets/sidebar/SidebarItem/SidebarItem.tsx"
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
      "../../src/newtab/03-widgets/sidebar/SidebarOpenTabs/SidebarOpenTabs.tsx"
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
      "../../src/newtab/03-widgets/sidebar/SidebarRecent/SidebarRecent.tsx"
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
      "../../src/newtab/03-widgets/dashboard/FolderItem/FolderItem.tsx"
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
      "../../src/newtab/03-widgets/dashboard/FolderGroup/FolderGroup.tsx"
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
      "../../src/newtab/03-widgets/dashboard/Folder/Folder.tsx"
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
      "../../src/newtab/03-widgets/sidebar/Sidebar/Sidebar.tsx"
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
      "../../src/newtab/03-widgets/dashboard/Bookmarks/Bookmarks.tsx"
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
      "../../src/newtab/03-widgets/ui/EditableTitle/EditableTitle.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/EditableTitle.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("bookmarks importer belongs to the import feature", () => {
    const featureComponentPath = path.join(
      __dirname,
      "../../src/newtab/04-features/bookmarks-import/ui/BookmarksImporter.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/BookmarksImporter.tsx"
    );

    expect(fs.existsSync(featureComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("import bookmarks from settings belongs to the import feature", () => {
    const featureComponentPath = path.join(
      __dirname,
      "../../src/newtab/04-features/bookmarks-import/ui/ImportBookmarksFromSettings.tsx"
    );
    const flatComponentPath = path.join(
      __dirname,
      "../../src/newtab/components/ImportBookmarksFromSettings.tsx"
    );

    expect(fs.existsSync(featureComponentPath)).toBe(true);
    expect(fs.existsSync(flatComponentPath)).toBe(false);
  });

  test("keyboard and mouse manager belongs to the app layer", () => {
    const appComponentPath = path.join(
      __dirname,
      "../../src/newtab/01-app/ui/KeyboardAndMouseManager.tsx"
    );

    expect(fs.existsSync(appComponentPath)).toBe(true);
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

  test("settings options are colocated with the top bar", () => {
    const sharedComponentPath = path.join(
      __dirname,
      "../../src/newtab/03-widgets/top-bar/TopBar/settingsOptions.tsx"
    );

    expect(fs.existsSync(sharedComponentPath)).toBe(true);
  });

  test("dropdown menu uses the folder-based component structure", () => {
    const folderComponentPath = path.join(
      __dirname,
      "../../src/newtab/06-shared/ui/DropdownMenu/DropdownMenu.tsx"
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
      "../../src/newtab/03-widgets/dashboard/FolderItemMenu/FolderItemMenu.tsx"
    );

    expect(fs.existsSync(folderComponentPath)).toBe(true);
  });

  test("modal components use the folder-based component structure", () => {
    const modalPath = path.join(
      __dirname,
      "../../src/newtab/06-shared/ui/Modal/Modal.tsx"
    );
    const importConfirmationPath = path.join(
      __dirname,
      "../../src/newtab/04-features/bookmarks-import/ui/ImportConfirmationModal.tsx"
    );
    const shortcutsPath = path.join(
      __dirname,
      "../../src/newtab/03-widgets/ui/ShortcutsModal/ShortcutsModal.tsx"
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

  test("move helpers belong to the move-to-folder feature", () => {
    const featureHelperPath = path.join(
      __dirname,
      "../../src/newtab/04-features/move-to-folder/ui/moveToHelpers.tsx"
    );
    const legacyHelperPath = path.join(
      __dirname,
      "../../src/newtab/components/dropdown/moveToHelpers.tsx"
    );

    expect(fs.existsSync(featureHelperPath)).toBe(true);
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
      "../../src/newtab/03-widgets/dashboard/Bookmarks/getBookmarksViewState.ts"
    );
    const legacyViewStatePath = path.join(
      __dirname,
      "../../src/newtab/components/getBookmarksViewState.ts"
    );
    const colocatedEmptyStatePath = path.join(
      __dirname,
      "../../src/newtab/03-widgets/dashboard/Bookmarks/isEmptyDashboard.ts"
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
      "../../src/newtab/03-widgets/dashboard/Folder/getFolderDisplayItems.ts"
    );
    const legacyHelperPath = path.join(
      __dirname,
      "../../src/newtab/components/getFolderDisplayItems.ts"
    );

    expect(fs.existsSync(colocatedHelperPath)).toBe(true);
    expect(fs.existsSync(legacyHelperPath)).toBe(false);
  });
});
