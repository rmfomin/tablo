import fs from "fs";
import path from "path";

const readStyle = (relativePath: string) =>
  fs.readFileSync(path.join(__dirname, relativePath), "utf8");

test("bookmark selection uses the same subtle highlight as group selection", () => {
  const bookmarkStyles = readStyle(
    "../newtab/03-widgets/dashboard/FolderItem/FolderItem.module.scss",
  );
  const groupStyles = readStyle(
    "../newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss",
  );

  expect(bookmarkStyles).toContain(
    '[data-selected="true"] {\n    outline: 1px solid var(--colors-blue-500);\n    background: color-mix(in srgb, var(--colors-blue-500) 12%, transparent 88%);',
  );
  expect(groupStyles).toContain(
    '[data-selected="true"]::before {\n    outline: 1px solid var(--colors-blue-500);\n    background: color-mix(in srgb, var(--colors-blue-500) 12%, transparent 88%);',
  );
});
