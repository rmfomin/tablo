const fs = require("fs");
const path = require("path");

export {};

const legacyModuleNames = ["actions", "state", "storage", "actionHelpers"];
const sourceExtensions = new Set([".ts", ".tsx"]);
const sourceRoot = path.join(__dirname, "../newtab");
const legacyStateDir = path.join(sourceRoot, "state");

function getSourceFiles(directory: string): string[] {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry: any) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getSourceFiles(entryPath);
      }

      return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
    });
}

function getLegacyImports(): string[] {
  const legacyImportPattern = new RegExp(
    `(?:from\\s*["']|import\\s*["'])@/newtab/state/(${legacyModuleNames.join(
      "|"
    )})["']`
  );

  return getSourceFiles(sourceRoot).flatMap((filePath) => {
    const source = fs.readFileSync(filePath, "utf8");

    return legacyImportPattern.test(source)
      ? [path.relative(sourceRoot, filePath)]
      : [];
  });
}

/**
 * Финальный контракт миграции на Zustand.
 *
 * Не позволяет незаметно вернуть reducer-зависимость после миграции.
 */
test("legacy reducer modules and imports are removed", () => {
  for (const moduleName of legacyModuleNames) {
    expect(fs.existsSync(path.join(legacyStateDir, `${moduleName}.ts`))).toBe(
      false
    );
  }

  expect(getLegacyImports()).toEqual([]);
});
