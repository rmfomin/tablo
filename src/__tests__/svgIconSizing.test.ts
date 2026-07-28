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

describe("svg icon sizing", () => {
  test("search icon receives the fixed-size class on the svg element", () => {
    const component = read(
      "../newtab/components/common/SearchInput/SearchInput.tsx"
    );

    expect(component).toContain('<IconSearch className={styles.searchIcon} />');
    expect(component).not.toContain('<div className={styles.searchIcon}>');
  });

  test("space context menu delete action is rendered as a text danger action", () => {
    const component = read(
      "../newtab/components/common/SpacesList/SpacesList.tsx"
    );

    expect(component).toContain("<span>Delete space</span>");
    expect(component).not.toContain("DeleteIcon");
  });

  test("shared icon buttons fix the current 24px svg size in css", () => {
    const scss = read("../styles/_shared-controls.scss");

    expectRuleWithSize(scss, ".btn__icon svg", "24px", "24px");
  });

  test("component svg icons keep their current rendered size in css", () => {
    const componentRules = [
      {
        file: "../newtab/components/common/SpacesList/SpacesList.module.scss",
        selector: ".deleteButton svg",
        size: "24px",
      },
      {
        file: "../newtab/components/common/SpacesList/SpacesList.module.scss",
        selector: ".menuButton svg",
        size: "24px",
      },
      {
        file: "../newtab/components/common/Folder/Folder.module.scss",
        selector: ".menuButton svg",
        size: "20px",
      },
      {
        file: "../newtab/components/common/Folder/Folder.module.scss",
        selector: ".collapseToggle svg",
        size: "16px",
      },
      {
        file: "../newtab/components/common/FolderGroup/FolderGroup.module.scss",
        selector: ".toggle svg",
        size: "16px",
      },
      {
        file: "../newtab/components/common/FolderItem/FolderItem.module.scss",
        selector: ".closeButton svg",
        size: "10px",
      },
      {
        file: "../newtab/components/common/SidebarItem/SidebarItem.module.scss",
        selector: ".savedTabIcon",
        width: "10px",
        height: "9px",
      },
      {
        file: "../newtab/components/common/SearchInput/SearchInput.module.scss",
        selector: ".searchIcon",
        size: "16px",
      },
      {
        file: "../newtab/components/common/SearchInput/SearchInput.module.scss",
        selector: ".filterToggleButton svg",
        size: "14px",
      },
      {
        file: "../newtab/components/common/SearchInput/SearchInput.module.scss",
        selector: ".filterButton svg",
        size: "16px",
      },
      {
        file: "../newtab/components/common/Notification/Notification.module.scss",
        selector: ".notification svg",
        size: "24px",
      },
    ];

    componentRules.forEach(({ file, selector, size, width, height }) => {
      const scss = read(file);
      expectRuleWithSize(scss, selector, width ?? size, height ?? size);
    });
  });
});
