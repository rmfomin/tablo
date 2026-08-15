import { ensureDefaultSpace } from "@/newtab/05-entities/dashboard/model/ensureDefaultSpace";

test("creates default bookmarks space when spaces are empty", () => {
  const state: any = {
    spaces: [],
    currentSpaceId: -1,
  };

  ensureDefaultSpace(state);

  expect(state.spaces).toEqual([
    {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Default bookmarks",
      folders: [],
    },
  ]);
  expect(state.currentSpaceId).toBe(1);
});

test("does not overwrite existing spaces", () => {
  const state: any = {
    spaces: [
      {
        id: 10,
        position: "b0",
        objectType: "space",
        title: "Work",
        folders: [],
      },
    ],
    currentSpaceId: 10,
  };

  ensureDefaultSpace(state);

  expect(state.spaces).toHaveLength(1);
  expect(state.spaces[0].title).toBe("Work");
  expect(state.currentSpaceId).toBe(10);
});
