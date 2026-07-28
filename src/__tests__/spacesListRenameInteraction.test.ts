const fs = require("fs");
const path = require("path");

export {};

test("space rename starts on double click, while single click only selects", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/components/common/SpacesList/SpacesList.tsx"
    ),
    "utf8"
  );

  const onSpaceClickMatch = source.match(
    /const onSpaceClick = \(spaceId: number\) => \{([\s\S]*?)\n  \};/
  );

  expect(onSpaceClickMatch?.[1]).toContain("setCurrentSpace(spaceId)");
  expect(onSpaceClickMatch?.[1]).not.toContain("setEditingSpaceId");
  expect(source).toContain("onClick={() => onSpaceClick(space.id)}");
  expect(source).toContain("onDoubleClick={() => setEditingSpaceId(space.id)}");
});
