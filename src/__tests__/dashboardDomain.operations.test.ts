import {
  createFolder,
  createSpace,
  createFolderItem,
  deleteFolderGroup,
  deleteFolderItems,
  moveFolderItems,
} from "@/newtab/01-app/model/dashboard/domain";
import type { DashboardState } from "@/newtab/01-app/model/dashboard/types";

const state: DashboardState = { spaces: [], currentSpaceId: -1 };
const stateWithBookmarkAndGroup: DashboardState = {
  currentSpaceId: 1,
  spaces: [
    {
      id: 1,
      title: "Работа",
      position: "a",
      objectType: "space",
      folders: [
        {
          id: 10,
          title: "Инфраструктура",
          position: "a",
          objectType: "folder",
          items: [
            {
              id: 100,
              title: "Before",
              url: "https://before.example",
              favIconUrl: "",
              position: "a",
              type: "bookmark",
              objectType: "bookmark",
            },
            {
              id: 200,
              title: "Group",
              position: "b",
              type: "group",
              objectType: "group",
              groupItems: [
                {
                  id: 201,
                  title: "First in group",
                  url: "https://first.example",
                  favIconUrl: "",
                  position: "a",
                  type: "bookmark",
                  objectType: "bookmark",
                },
                {
                  id: 202,
                  title: "Second in group",
                  url: "https://second.example",
                  favIconUrl: "",
                  position: "b",
                  type: "bookmark",
                  objectType: "bookmark",
                },
              ],
            },
            {
              id: 300,
              title: "After",
              url: "https://after.example",
              favIconUrl: "",
              position: "c",
              type: "bookmark",
              objectType: "bookmark",
            },
          ],
        },
      ],
    },
  ],
};

test("dashboard domain создаёт space, folder и bookmark item", () => {
  const withSpace = createSpace(state, { id: 1, title: "Работа" });
  const withFolder = createFolder(withSpace, { id: 10, spaceId: 1, title: "Инфраструктура", color: "#fff" });
  const result = createFolderItem(withFolder, {
    folderId: 10,
    item: { id: 100, title: "Grafana", url: "https://grafana.example", favIconUrl: "" },
  });

  expect(result.spaces[0].folders[0].items[0]).toEqual(expect.objectContaining({ id: 100, type: "bookmark" }));
});

test("deleteFolderItems удаляет bookmark из folder", () => {
  const withSpace = createSpace(state, { id: 1, title: "Работа" });
  const withFolder = createFolder(withSpace, { id: 10, spaceId: 1, title: "Инфраструктура", color: "#fff" });
  const withItem = createFolderItem(withFolder, {
    folderId: 10,
    item: { id: 100, title: "Grafana", url: "https://grafana.example", favIconUrl: "" },
  });

  expect(deleteFolderItems(withItem, [100]).spaces[0].folders[0].items).toEqual([]);
});

test("moveFolderItems оставляет дерево без изменений, если папка назначения не существует", () => {
  const withSpace = createSpace(state, { id: 1, title: "Работа" });
  const withFolder = createFolder(withSpace, { id: 10, spaceId: 1, title: "Инфраструктура", color: "#fff" });
  const withItem = createFolderItem(withFolder, {
    folderId: 10,
    item: { id: 100, title: "Grafana", url: "https://grafana.example", favIconUrl: "" },
  });

  expect(moveFolderItems(withItem, { itemIds: [100], targetFolderId: 999 })).toBe(withItem);
});

test("deleteFolderGroup переносит закладки группы в конец папки", () => {
  const result = deleteFolderGroup(stateWithBookmarkAndGroup, 200);

  expect(result.spaces[0].folders[0].items).toEqual([
    expect.objectContaining({ id: 100, type: "bookmark", title: "Before" }),
    expect.objectContaining({ id: 300, type: "bookmark", title: "After" }),
    expect.objectContaining({ id: 201, type: "bookmark", title: "First in group" }),
    expect.objectContaining({ id: 202, type: "bookmark", title: "Second in group" }),
  ]);
});
