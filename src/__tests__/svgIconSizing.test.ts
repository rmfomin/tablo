const fs = require("fs");
const path = require("path");

export {};

function read(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, relativePath), "utf8");
}

function expectRuleWithSize(
  scss: string,
  selector: string,
  width: string,
  height: string
) {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const rule = new RegExp(`${escapedSelector}\\s*\\{[^}]*\\}`, "gm");
  const matches = scss.match(rule) ?? [];
  const match = matches.find(
    (candidate) =>
      candidate.includes(`width: ${width};`) &&
      candidate.includes(`height: ${height};`)
  );

  expect(match).toContain(`width: ${width};`);
  expect(match).toContain(`height: ${height};`);
}

function expectNestedRuleWithSize(
  scss: string,
  parentSelector: string,
  childSelector: string,
  width: string,
  height: string,
) {
  const parentStart = scss.indexOf(parentSelector);
  const childStart = scss.indexOf(`${childSelector} {`, parentStart);
  const childEnd = scss.indexOf("}", childStart);
  const nestedRule = childStart >= 0 && childEnd >= 0
    ? scss.slice(childStart, childEnd)
    : "";

  expect(nestedRule).toContain(`width: ${width};`);
  expect(nestedRule).toContain(`height: ${height};`);
}

describe("svg icon sizing", () => {
  test("search input keeps its current global selector and accessible hint", () => {
    const component = read(
      "../newtab/04-features/bookmark-search/ui/SearchInput.tsx"
    );

    expect(component).toContain('className="search"');
    expect(component).toContain('placeholder="Search in Tablo"');
  });

  test("space context menu uses the shared remove icon for delete", () => {
    const component = read(
      "../newtab/03-widgets/spaces-list/SpacesList/SpacesList.tsx"
    );

    expect(component).toContain("Delete space");
    expect(component).toContain('<DropdownMenuIcon name="remove" />');
    expect(component).not.toContain("DeleteIcon");
  });

  test("shared icon buttons fix the current 24px svg size in css", () => {
    const scss = read("../styles/_shared-controls.scss");

    expectRuleWithSize(scss, ".btn__icon svg", "24px", "24px");
  });

  test("component icons and controls keep their current rendered size in css", () => {
    const componentRules: Array<{
      file: string;
      selector: string;
      size: string;
      width?: string;
      height?: string;
      parentSelector?: string;
    }> = [
      {
        file: "../newtab/03-widgets/spaces-list/SpacesList/SpacesList.module.scss",
        selector: ".deleteButton",
        size: "16px",
      },
      {
        file: "../newtab/03-widgets/dashboard/Folder/Folder.module.scss",
        parentSelector: ".folderIcon",
        selector: "svg",
        size: "20px",
      },
      {
        file: "../newtab/03-widgets/dashboard/Folder/Folder.module.scss",
        parentSelector: ".collapseToggle,\n.menuButton",
        selector: "svg",
        size: "14px",
      },
      {
        file: "../newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss",
        parentSelector: ".toggle",
        selector: "svg",
        size: "14px",
      },
      {
        file: "../newtab/03-widgets/sidebar/SidebarItem/SidebarItem.module.scss",
        selector: ".savedTabIcon",
        size: "16px",
      },
      {
        file: "../newtab/04-features/bookmark-search/ui/SearchInput.module.scss",
        selector: ".clearSearchButton",
        size: "28px",
      },
      {
        file: "../newtab/03-widgets/ui/Notification/Notification.module.scss",
        selector: ".notification svg",
        size: "24px",
      },
    ];

    componentRules.forEach(({ file, parentSelector, selector, size, width, height }) => {
      const scss = read(file);
      if (parentSelector) {
        expectNestedRuleWithSize(
          scss,
          parentSelector,
          selector,
          width ?? size,
          height ?? size,
        );
      } else {
        expectRuleWithSize(scss, selector, width ?? size, height ?? size);
      }
    });
  });
});
