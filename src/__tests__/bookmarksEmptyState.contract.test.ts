const fs = require("fs");
const path = require("path");

export {};

test("empty bookmarks area offers new folder instead of JSON import", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../newtab/03-widgets/dashboard/Bookmarks/Bookmarks.tsx"),
    "utf8"
  );

  expect(source).not.toContain("Import from JSON");
  expect(source).toContain("<NewFolderPlaceholder onCreate={onCreateFolder} />");
});
