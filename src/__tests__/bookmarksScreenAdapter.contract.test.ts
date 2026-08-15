import fs from "fs";
import path from "path";

const projectRoot = path.join(__dirname, "..");
const componentSource = fs.readFileSync(
  path.join(projectRoot, "newtab/03-widgets/dashboard/Bookmarks/Bookmarks.tsx"),
  "utf8",
);

test("Bookmarks gets screen state through the feature adapter instead of Zustand stores", () => {
  expect(componentSource).toContain('from "@/newtab/04-features/bookmarks/model/useBookmarksScreen"');
  expect(componentSource).toContain("useBookmarksScreen()");
  expect(componentSource).not.toContain('from "@/newtab/01-app/model/dashboard/dashboardStore"');
  expect(componentSource).not.toContain('from "@/newtab/01-app/model/ui/uiStore"');
  expect(componentSource).not.toContain('from "@/newtab/01-app/model/chrome-runtime/chromeRuntimeStore"');
});
