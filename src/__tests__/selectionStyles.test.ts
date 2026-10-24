import fs from "fs";
import path from "path";

const readStyle = (relativePath: string) =>
  fs.readFileSync(path.join(__dirname, relativePath), "utf8");

test("bookmark hover and selection use the same square row bounds", () => {
  const bookmarkStyles = readStyle(
    "../newtab/03-widgets/dashboard/FolderItem/FolderItem.module.scss",
  );

  expect(bookmarkStyles).toContain(
    '&:not([data-selection-active="true"]):hover::before',
  );
  expect(bookmarkStyles).toContain('&[data-selected="true"]::before');
  expect(bookmarkStyles).toContain('&[data-selected="true"]::after');
  expect(bookmarkStyles).toContain(
    'inset: 0 var(--folder-item-background-right, 0)\n      0 var(--folder-item-background-left, 0);',
  );
  expect(bookmarkStyles).toContain(
    'border: 1px solid color-mix(in srgb, var(--accent-color) 35%, transparent);',
  );
  expect(bookmarkStyles).not.toContain('border-radius: inherit;');
  expect(bookmarkStyles).not.toContain('.selected {');
});
