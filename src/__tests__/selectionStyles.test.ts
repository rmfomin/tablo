import fs from "fs";
import path from "path";

const readStyle = (relativePath: string) =>
  fs.readFileSync(path.join(__dirname, relativePath), "utf8");

test("bookmark hover and selection share the row background pseudo-element", () => {
  const bookmarkStyles = readStyle(
    "../newtab/03-widgets/dashboard/FolderItem/FolderItem.module.scss",
  );

  expect(bookmarkStyles).toContain(
    '&:not([data-selection-active="true"]):not(.searchTarget):hover::before',
  );
  expect(bookmarkStyles).toContain('&[data-selected="true"]::before');
  expect(bookmarkStyles).toContain('&.searchTarget::before');
  expect(bookmarkStyles).toContain(
    'inset: 0 var(--folder-item-background-right, 0)\n      0 var(--folder-item-background-left, 0);',
  );
  expect(bookmarkStyles).toContain('background: color-mix(in srgb, var(--selection-accent-color) 12%, transparent 88%);');
  expect(bookmarkStyles).not.toContain('&[data-selected="true"]::after');
});
