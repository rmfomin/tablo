const fs = require("fs");
const path = require("path");

export {};

const newtabRoot = path.join(__dirname, "../newtab");
const expectedTopLevelDirectories = [
  "01-app",
  "02-pages",
  "03-widgets",
  "04-features",
  "05-entities",
  "06-shared",
];

test("newtab exposes only the final numbered FSD layers", () => {
  expect(fs.readdirSync(newtabRoot).sort()).toEqual(
    expectedTopLevelDirectories.sort(),
  );
  expect(
    fs.existsSync(path.join(newtabRoot, "01-app", "index.tsx")),
  ).toBe(true);
  expect(
    fs.existsSync(path.join(newtabRoot, "02-pages", "newtab", "ui", "NewtabPage.tsx")),
  ).toBe(true);
});
