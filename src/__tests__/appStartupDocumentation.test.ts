const fs = require("fs");
const path = require("path");

export {};

test("startup documentation describes the current application modules", () => {
  const document = fs.readFileSync(
    path.join(__dirname, "../../docs/app-startup-flow.md"),
    "utf8"
  );

  [
    "newtab/index.tsx",
    "state/storage-sync/controller.ts",
    "state/dashboard/dashboardStore.ts",
    "state/chrome-runtime/controller.ts",
  ].forEach((modulePath) => expect(document).toContain(modulePath));

  expect(document).toContain("## Последовательность запуска");
  expect(document).toContain("## Владение состоянием");

  const startupSteps = [
    "newtab/index.tsx",
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
