import fs from "fs";
import path from "path";

const projectRoot = path.join(__dirname, "..");
const componentSource = fs.readFileSync(
  path.join(projectRoot, "newtab/components/common/Bookmarks/Bookmarks.tsx"),
  "utf8",
);

test("Bookmarks gets screen state through the feature adapter instead of Zustand stores", () => {
  expect(componentSource).toContain('from "@/newtab/feature/bookmarks/useBookmarksScreen"');
  expect(componentSource).toContain("useBookmarksScreen()");
  expect(componentSource).not.toContain('from "@/newtab/state/dashboard/dashboardStore"');
  expect(componentSource).not.toContain('from "@/newtab/state/ui/uiStore"');
  expect(componentSource).not.toContain('from "@/newtab/state/chrome-runtime/chromeRuntimeStore"');
});
