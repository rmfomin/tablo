const fs = require("fs");
const path = require("path");

export {};

test("startup documentation describes the current application modules", () => {
  const document = fs.readFileSync(
    path.join(__dirname, "../../docs/app-startup-flow.md"),
    "utf8"
  );

  [
    "newtab/01-app/index.tsx",
    "01-app/model/storage-sync/controller.ts",
    "01-app/model/dashboard/dashboardStore.ts",
    "01-app/model/chrome-runtime/controller.ts",
    "02-pages/newtab/ui/NewtabPage.tsx",
  ].forEach((modulePath) => expect(document).toContain(modulePath));

  expect(document).toContain("## Последовательность запуска");
  expect(document).toContain("## Владение состоянием");

  const startupSteps = [
    "newtab/01-app/index.tsx",
    "await storageSync.hydrate()",
    "storageSync.start()",
    "mountApp()",
    "App.useEffect",
    "controller.start()",
  ];
  const positions = startupSteps.map((step) => document.indexOf(step));

  positions.forEach((position) => expect(position).toBeGreaterThanOrEqual(0));
  positions.slice(1).forEach((position, index) => {
    expect(position).toBeGreaterThan(positions[index]);
  });
});
