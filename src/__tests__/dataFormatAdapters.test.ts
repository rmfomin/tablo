import {
  isDataBackupV3Input,
  normalizeBackupV3,
} from "@/newtab/04-features/bookmarks-import/model/adapters";
import { DataBackupV3Input } from "@/newtab/05-entities/dashboard/model/types";

test("legacy v3 item becomes a runtime item with a canonical objectType", () => {
  const legacyBackup: unknown = {
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Pinned",
            items: [
              {
                id: 100,
                position: "a0",
                type: "bookmark",
                title: "Bookmark",
                url: "https://example.com",
                favIconUrl: "",
              },
            ],
          },
        ],
      },
    ],
  };

  expect(isDataBackupV3Input(legacyBackup)).toBe(true);
  if (!isDataBackupV3Input(legacyBackup)) {
    throw new Error("legacy backup must pass the input adapter");
  }

  const item = normalizeBackupV3(legacyBackup).spaces[0].folders[0].items[0];
  const requiresCanonicalDiscriminator = (value: {
    objectType: "bookmark" | "group";
  }) => value.objectType;

  expect(requiresCanonicalDiscriminator(item)).toBe("bookmark");
});

test("normalizeBackupV3 retains only local v3 fields at every entity level", () => {
  const backup = {
    isTablo: true,
    version: 3,
    unexpectedBackupProperty: "discard me",
    spaces: [
      {
        id: 2,
        remoteId: 200,
        position: "z0",
        objectType: "space",
        title: "Later",
        unexpectedSpaceProperty: true,
        folders: [
          {
            id: 20,
            remoteId: 2000,
            position: "z0",
            objectType: "folder",
            title: "Later folder",
            unexpectedFolderProperty: true,
            items: [
              {
                id: 200,
                remoteId: 20000,
                position: "z0",
                type: "bookmark",
                title: "Later item",
                url: "https://later.example",
                favIconUrl: "",
                unexpectedBookmarkProperty: true,
              },
            ],
          },
        ],
      },
      {
        id: 1,
        remoteId: 100,
        position: "a0",
        objectType: "space",
        title: "Earlier",
        folders: [
          {
            id: 10,
            remoteId: 1000,
            position: "a0",
            objectType: "folder",
            title: "First folder",
            items: [
              {
                id: 100,
                remoteId: 10000,
                position: "a0",
                type: "group",
                title: "Grouped",
                groupItems: [
                  {
                    id: 1002,
                    remoteId: 10002,
                    position: "z0",
                    type: "bookmark",
                    title: "Second grouped item",
                    url: "https://group-second.example",
                    favIconUrl: "",
                  },
                  {
                    id: 1001,
                    remoteId: 10001,
                    position: "a0",
                    type: "bookmark",
                    title: "First grouped item",
                    url: "https://group-first.example",
                    favIconUrl: "",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const result = normalizeBackupV3(backup as DataBackupV3Input);

  expect(result).toEqual({
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Earlier",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "First folder",
            items: [
              {
                id: 100,
                position: "a0",
                type: "group",
                objectType: "group",
                title: "Grouped",
                groupItems: [
                  {
                    id: 1001,
                    position: "a0",
                    type: "bookmark",
                    objectType: "bookmark",
                    title: "First grouped item",
                    url: "https://group-first.example",
                    favIconUrl: "",
                  },
                  {
                    id: 1002,
                    position: "z0",
                    type: "bookmark",
                    objectType: "bookmark",
                    title: "Second grouped item",
                    url: "https://group-second.example",
                    favIconUrl: "",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        position: "z0",
        objectType: "space",
        title: "Later",
        folders: [
          {
            id: 20,
            position: "z0",
            objectType: "folder",
            title: "Later folder",
            items: [
              {
                id: 200,
                position: "z0",
                type: "bookmark",
                objectType: "bookmark",
                title: "Later item",
                url: "https://later.example",
                favIconUrl: "",
              },
            ],
          },
        ],
      },
    ],
  });
});

test("isDataBackupV3Input distinguishes an invalid backup from a valid empty backup", () => {
  expect(
    isDataBackupV3Input({
      isTablo: true,
      version: 3,
      spaces: [],
    })
  ).toBe(true);

  expect(
    isDataBackupV3Input({
      isTablo: true,
      version: 3,
      spaces: [
        {
          id: 1,
          position: "a0",
          title: "Missing object type",
          folders: [],
        },
      ],
    })
  ).toBe(false);
});

test("normalizeBackupV3 sorts positions by code unit order", () => {
  const result = normalizeBackupV3({
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Lowercase",
        folders: [],
      },
      {
        id: 2,
        position: "Z0",
        objectType: "space",
        title: "Uppercase",
        folders: [],
      },
    ],
  });

  expect(result.spaces.map((space) => space.position)).toEqual(["Z0", "a0"]);
});

test("normalizeBackupV3 canonicalizes missing optional item objectType", () => {
  const result = normalizeBackupV3({
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Pinned",
            items: [
              {
                id: 100,
                position: "a0",
                type: "bookmark",
                title: "Bookmark",
                url: "https://example.com",
                favIconUrl: "",
              },
            ],
          },
        ],
      },
    ],
  });

  expect(result.spaces[0].folders[0].items[0].objectType).toBe("bookmark");
});
