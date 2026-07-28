import {
  getFolderDisplayItems,
  getVisibleFolderDisplayItems,
} from "@/newtab/components/common/Folder/getFolderDisplayItems";
import { FolderV3 } from "@/newtab/helpers/types";

function createFolder(overrides: Partial<FolderV3> = {}): FolderV3 {
  return {
    id: 10,
    position: "a0",
    objectType: "folder",
    title: "Folder",
    items: [
      {
        id: 1,
        position: "a0",
        type: "bookmark",
        objectType: "bookmark",
        title: "Top",
        url: "https://top.example",
        favIconUrl: "https://top.example/favicon.ico",
      },
      {
        id: 2,
        position: "a1",
        type: "group",
        objectType: "group",
        title: "Group",
        groupItems: [
          {
            id: 21,
            position: "a0",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested A",
            url: "https://a.example",
            favIconUrl: "https://a.example/favicon.ico",
          },
          {
            id: 22,
            position: "a1",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested B",
            url: "https://b.example",
            favIconUrl: "https://b.example/favicon.ico",
            archived: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}

test("folder collapsed: true hides all folder items", () => {
  const folder = createFolder({ collapsed: true });

  expect(getFolderDisplayItems(folder)).toEqual([]);
});

test("group is returned as a separate view item container and is not flattened", () => {
  const folder = createFolder();

  expect(getFolderDisplayItems(folder)).toEqual([
    {
      type: "bookmark",
      item: {
        id: 1,
        position: "a0",
        type: "bookmark",
        objectType: "bookmark",
        title: "Top",
        url: "https://top.example",
        favIconUrl: "https://top.example/favicon.ico",
      },
    },
    {
      type: "group",
      group: {
        id: 2,
        position: "a1",
        type: "group",
        objectType: "group",
        title: "Group",
        groupItems: [
          {
            id: 21,
            position: "a0",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested A",
            url: "https://a.example",
            favIconUrl: "https://a.example/favicon.ico",
          },
          {
            id: 22,
            position: "a1",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested B",
            url: "https://b.example",
            favIconUrl: "https://b.example/favicon.ico",
            archived: true,
          },
        ],
      },
      items: [
        {
          id: 21,
          position: "a0",
          type: "bookmark",
          objectType: "bookmark",
          title: "Nested A",
          url: "https://a.example",
          favIconUrl: "https://a.example/favicon.ico",
        },
        {
          id: 22,
          position: "a1",
          type: "bookmark",
          objectType: "bookmark",
          title: "Nested B",
          url: "https://b.example",
          favIconUrl: "https://b.example/favicon.ico",
          archived: true,
        },
      ],
    },
  ]);
});

test("group collapsed: true hides nested groupItems in view model", () => {
  const folder = createFolder({
    items: [
      {
        id: 2,
        position: "a1",
        type: "group",
        objectType: "group",
        title: "Group",
        collapsed: true,
        groupItems: [
          {
            id: 21,
            position: "a0",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested A",
            url: "https://a.example",
            favIconUrl: "https://a.example/favicon.ico",
          },
        ],
      },
    ],
  });

  expect(getFolderDisplayItems(folder)).toEqual([
    {
      type: "group",
      group: {
        id: 2,
        position: "a1",
        type: "group",
        objectType: "group",
        title: "Group",
        collapsed: true,
        groupItems: [
          {
            id: 21,
            position: "a0",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested A",
            url: "https://a.example",
            favIconUrl: "https://a.example/favicon.ico",
          },
        ],
      },
      items: [],
    },
  ]);
});

test("search keeps group as a separate container and filters nested groupItems", () => {
  const folder = createFolder();

  expect(getVisibleFolderDisplayItems(folder, "nested b")).toEqual([
    {
      type: "group",
      group: {
        id: 2,
        position: "a1",
        type: "group",
        objectType: "group",
        title: "Group",
        groupItems: [
          {
            id: 21,
            position: "a0",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested A",
            url: "https://a.example",
            favIconUrl: "https://a.example/favicon.ico",
          },
          {
            id: 22,
            position: "a1",
            type: "bookmark",
            objectType: "bookmark",
            title: "Nested B",
            url: "https://b.example",
            favIconUrl: "https://b.example/favicon.ico",
            archived: true,
          },
        ],
      },
      items: [
        {
          id: 22,
          position: "a1",
          type: "bookmark",
          objectType: "bookmark",
          title: "Nested B",
          url: "https://b.example",
          favIconUrl: "https://b.example/favicon.ico",
          archived: true,
        },
      ],
    },
  ]);
});
