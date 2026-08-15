const fs = require("fs");
const path = require("path");

export {};

test("spaces list keeps data-role drag-and-drop hooks", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/03-widgets/spaces-list/SpacesList/SpacesList.tsx"
    ),
    "utf8"
  );

  expect(source).toContain("DOM_ROLE.spacesList");
  expect(source).toContain("DOM_ROLE.spaceItem");
  expect(source).toContain("DOM_ROLE.spaceDelete");
});

test("spaces list exposes single-space import and export controls", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/03-widgets/spaces-list/SpacesList/SpacesList.tsx"
    ),
    "utf8"
  );

  expect(source).toContain("Export space");
  expect(source).toContain("onExportSpaceJson");
  expect(source).toContain("Import space");
  expect(source).toContain("importSpaceFromJson");
  expect(source).toContain('type="file"');
});
