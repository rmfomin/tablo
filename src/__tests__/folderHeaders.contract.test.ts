const fs = require("fs");
const path = require("path");

export {};

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

describe("folder and group header contracts", () => {
  test("folder and group use independent chevrons with their own color rules", () => {
    const folderSource = readSource("newtab/03-widgets/dashboard/Folder/Folder.tsx");
    const groupSource = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.tsx"
    );
    const groupStyles = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss"
    );
    const folderChevron = readSource(
      "newtab/03-widgets/dashboard/Folder/icons/folder-chevron.svg"
    );
    const groupChevron = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/icons/group-chevron.svg"
    );

    expect(folderSource).toContain(
      'import FolderChevronIcon from "./icons/folder-chevron.svg";'
    );
    expect(groupSource).toContain(
      'import GroupChevronIcon from "./icons/group-chevron.svg";'
    );
    expect(folderChevron).toContain('stroke="#242424"');
    expect(groupChevron).toContain('stroke="currentColor"');
    expect(groupStyles).toContain(
      "color: var(--icon-color-group-chevron);"
    );
  });

  test("group header styles keep the title row aligned with inner items", () => {
    const source = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss"
    );

    expect(source).toContain("padding-left: 22px;");
  });

  test("group hover background is drawn with an inset pseudo element", () => {
    const source = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss"
    );

    expect(source).toContain("&::before");
    expect(source).toContain("inset: 0 0 0 15px;");
    expect(source).toContain("z-index: 0;");
    expect(source).toContain(".header {");
    expect(source).toContain(".items {");
  });

  test("folder title enters edit mode via double click instead of single click", () => {
    const source = readSource("newtab/03-widgets/dashboard/Folder/Folder.tsx");

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
  });

  test("folder header hides its menu button and closes the menu while renaming", () => {
    const source = readSource("newtab/03-widgets/dashboard/Folder/Folder.tsx");

    expect(source).toMatch(
      /p\.folder\.id !== p\.itemInEdit \? \([\s\S]*className=\{cn\(styles\.menuButton/,
    );
    expect(source).toMatch(
      /function setEditing\(val: boolean\) \{\s*if \(val\) \{\s*setShowMenu\(false\);\s*\}/,
    );
  });

  test("group header supports a context menu with rename and open-all actions", () => {
    const source = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.tsx"
    );

    expect(source).toContain("onDoubleClick={() => setEditing(true)}");
    expect(source).not.toContain("onClick={() => setEditing(true)}");
    expect(source).toMatch(
      /<button[\s\S]*className=\{cn\(styles\.toggle[\s\S]*<\/button>[\s\S]*<EditableTitle/
    );
    expect(source).toContain("Rename");
    expect(source).toContain("Open all tabs");
    expect(source).toContain("onContextMenu={onHeaderContextMenu}");
  });

  test("group rename uses a compact single-line input", () => {
    const groupSource = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.tsx"
    );
    const editableTitleSource = readSource(
      "newtab/03-widgets/ui/EditableTitle/EditableTitle.tsx"
    );
    const groupStyles = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss"
    );

    expect(groupSource).toMatch(/<EditableTitle[\s\S]*singleLine/);
    expect(editableTitleSource).toContain("singleLine?: boolean;");
    expect(editableTitleSource).toMatch(
      /p\.singleLine \? \(\s*<input[\s\S]*?\) : \(\s*<textarea/
    );
    expect(groupStyles).toMatch(
      /\.header input\.title \{[\s\S]*background: none;/
    );
  });

  test("group open-all action opens non-archived group bookmarks in background tabs", () => {
    const source = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.tsx"
    );

    const openAllFunction = source.match(
      /function onOpenAllTabs\(\) \{([\s\S]*?)\n  \}/
    )?.[1];

    expect(openAllFunction).toContain("p.items.forEach");
    expect(openAllFunction).toContain("!item.archived");
    expect(openAllFunction).toContain(
      "createTab({ url: item.url, active: false })"
    );
    expect(openAllFunction).toContain("setShowMenu(false)");
  });

  test("group header menu confirms before deleting the group", () => {
    const source = readSource(
      "newtab/03-widgets/dashboard/FolderGroup/FolderGroup.tsx"
    );

    const deleteFunction = source.match(
      /function onDelete\(\) \{([\s\S]*?)\n  \}/,
    )?.[1];

    expect(source).toMatch(
      /className="dropdown-menu__button dropdown-menu__button--dander focusable"[\s\S]*?Delete group/,
    );
    expect(deleteFunction).toMatch(
      /if \(confirm\([^)]*\)\) \{\s*deleteFolderGroup\(p\.group\.id\);\s*\}/,
    );
  });
});
