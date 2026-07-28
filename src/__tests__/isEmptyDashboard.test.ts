import { isEmptyDashboard } from "@/newtab/components/common/Bookmarks/isEmptyDashboard";

test("returns true when there is no current space", () => {
  expect(
    isEmptyDashboard({
      spaces: [],
      currentSpaceId: -1,
      search: "",
    }),
  ).toBe(true);
});

test("returns true when current space has no folders", () => {
  expect(
    isEmptyDashboard({
      spaces: [
        {
          id: 1,
          position: "a",
          objectType: "space",
          title: "Space",
          folders: [],
        },
      ],
      currentSpaceId: 1,
      search: "",
    }),
  ).toBe(true);
});

test("returns false when current space has folders", () => {
  expect(
    isEmptyDashboard({
      spaces: [
        {
          id: 1,
          position: "a",
          objectType: "space",
          title: "Space",
          folders: [
            {
              id: 2,
              position: "a",
              objectType: "folder",
              title: "Folder",
              items: [],
            },
          ],
        },
      ],
      currentSpaceId: 1,
      search: "",
    }),
  ).toBe(false);
});

test("returns false when search is active", () => {
  expect(
    isEmptyDashboard({
      spaces: [],
      currentSpaceId: -1,
      search: "abc",
    }),
  ).toBe(false);
});
