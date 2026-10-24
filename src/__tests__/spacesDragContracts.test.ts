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

test("spaces list exposes a single-space export control", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/03-widgets/spaces-list/SpacesList/SpacesList.tsx"
    ),
    "utf8"
  );

  expect(source).toContain("Export space");
  expect(source).toContain('import { onExportSpaceJson } from "@/newtab/04-features/bookmarks-export/model/dashboardExport";');
  expect(source).toContain("onExportSpace(space)");
  expect(source).toContain("Export space");
});
