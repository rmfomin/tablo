const fs = require("fs");
const path = require("path");

export {};

describe("compiled style selectors", () => {
  test("build emits dist/style.css", () => {
    const cssPath = path.join(__dirname, "../../dist/style.css");

    expect(fs.existsSync(cssPath)).toBe(true);
  });

  test("build does not emit an unused js companion for styles", () => {
    const styleJsPath = path.join(__dirname, "../../dist/js/style.js");

    expect(fs.existsSync(styleJsPath)).toBe(false);
  });

  test("compiled css contains critical newtab selectors", () => {
    const cssPath = path.join(__dirname, "../../dist/style.css");
    const css = fs.readFileSync(cssPath, "utf8");

    expect(css).toContain(".app");
    expect(css).toContain(".btn__setting");
    expect(css).toContain(".dropdown-menu");
    expect(css).toContain(".modal-wrapper");
  });

  test("bookmarks module keeps component-owned selectors local", () => {
    const modulePath = path.join(
      __dirname,
      "../newtab/03-widgets/dashboard/Bookmarks/Bookmarks.module.scss"
    );
    const moduleScss = fs.readFileSync(modulePath, "utf8");

    expect(moduleScss).not.toMatch(/:global\(\.bookmarks-box\)/);
    expect(moduleScss).not.toMatch(/:global\(\.empty-dashboard/);
    expect(moduleScss).not.toContain(":global");
  });

  test("component modules avoid global and BEM selectors after migration", () => {
    const migratedModules = [
      "../newtab/03-widgets/dashboard/Bookmarks/Bookmarks.module.scss",
      "../newtab/03-widgets/dashboard/Folder/Folder.module.scss",
      "../newtab/03-widgets/dashboard/FolderItem/FolderItem.module.scss",
      "../newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss",
      "../newtab/03-widgets/sidebar/SidebarItem/SidebarItem.module.scss",
      "../newtab/03-widgets/sidebar/Sidebar/Sidebar.module.scss",
      "../newtab/03-widgets/sidebar/SidebarOpenTabs/SidebarOpenTabs.module.scss",
      "../newtab/03-widgets/sidebar/SidebarRecent/SidebarRecent.module.scss",
      "../newtab/03-widgets/top-bar/TopBar/TopBar.module.scss",
    ];

    migratedModules.forEach((relativePath) => {
      const modulePath = path.join(__dirname, relativePath);
      const moduleScss = fs.readFileSync(modulePath, "utf8");

      expect(moduleScss).not.toContain(":global");
      expect(moduleScss).not.toMatch(/\.[A-Za-z0-9-]+__[A-Za-z0-9-]+/);
      expect(moduleScss).not.toMatch(/\.[A-Za-z0-9-]+--[A-Za-z0-9-]+/);
    });
  });

  test("component-local files use relative imports", () => {
    const componentsRoot = path.join(__dirname, "../newtab/03-widgets");
    const filesToCheck: Array<{
      componentName: string;
      layerName: string;
      filePath: string;
    }> = fs
      .readdirSync(componentsRoot, { withFileTypes: true })
      .filter((layer: { isDirectory: () => boolean }) => layer.isDirectory())
      .flatMap((layer: { name: string }) => {
        const layerDir = path.join(componentsRoot, layer.name);
        return fs
          .readdirSync(layerDir, { withFileTypes: true })
          .filter((entry: { isDirectory: () => boolean }) => entry.isDirectory())
          .flatMap((entry: { name: string }) => {
            const componentDir = path.join(layerDir, entry.name);
            return fs
              .readdirSync(componentDir)
              .filter((fileName: string) => /\.(ts|tsx)$/.test(fileName))
              .map((fileName: string) => ({
                componentName: entry.name,
                layerName: layer.name,
                filePath: path.join(componentDir, fileName),
              }));
          });
      });

    filesToCheck.forEach(({ componentName, layerName, filePath }) => {
      const source = fs.readFileSync(filePath, "utf8");
      const ownAbsoluteImport = new RegExp(
        `from "@/newtab/03-widgets/${layerName}/${componentName}/`,
        "g"
      );

      expect(source).not.toMatch(ownAbsoluteImport);
    });
  });

  test("folder item does not render a menu button", () => {
    const componentPath = path.join(
      __dirname,
      "../newtab/03-widgets/dashboard/FolderItem/FolderItem.tsx"
    );
    const modulePath = path.join(
      __dirname,
      "../newtab/03-widgets/dashboard/FolderItem/FolderItem.module.scss"
    );
    const componentSource = fs.readFileSync(componentPath, "utf8");
    const moduleScss = fs.readFileSync(modulePath, "utf8");

    expect(componentSource).not.toContain("folderItemMenu");
    expect(componentSource).not.toContain("IconMore");
    expect(moduleScss).not.toContain(".menu");
  });

  test("folder item keeps the old menu gutter without rendering a button", () => {
    const modulePath = path.join(
      __dirname,
      "../newtab/03-widgets/dashboard/FolderItem/FolderItem.module.scss"
    );
    const moduleScss = fs.readFileSync(modulePath, "utf8");

    expect(moduleScss).toMatch(/\.root\s*\{[^}]*padding-left:\s*24px;/);
  });
});
