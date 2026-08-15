import { SpaceV3 } from "@/newtab/helpers/types";

const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(global, "__OVERRIDE_NEWTAB", {
  value: false,
  configurable: true,
});

Object.defineProperty(global, "BroadcastChannel", {
  value: class {
    postMessage() {}
    close() {}
  },
  configurable: true,
});

Object.defineProperty(global, "window", {
  value: {
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  },
  configurable: true,
});

const {
  createExportBackupV3,
  createExportSpaceBackupV3,
  parseDashboardImportJson,
  parseSpaceImportJson,
  importFromJsonWithCallbacks,
  importSpaceFromJsonWithCallback,
  createBrowserBookmarksFolderInputs,
  onExportJson,
} = require("../newtab/helpers/importExportHelpers");
const { normalizeBackupV3 } = require("../newtab/helpers/dataFormatAdapters");
const v3ExportFixture = require("../../docs/fixtures/v3-dashboard-backup.json");

function mockFileReaderWithContents(fileContents: string) {
  Object.defineProperty(global, "FileReader", {
    value: class {
      onload: ((event: { target: { result: string } }) => void) | null = null;

      readAsText() {
        this.onload?.({ target: { result: fileContents } });
      }
    },
    configurable: true,
  });
}

test("onExportJson downloads a backup with the current date in its filename", () => {
  const anchor = {
    setAttribute: jest.fn(),
    click: jest.fn(),
    remove: jest.fn(),
  };
  Object.defineProperty(global, "document", {
    value: {
      createElement: () => anchor,
      body: { appendChild: jest.fn() },
    },
    configurable: true,
  });
  const currentDate = new Date().toISOString().slice(0, 10);

  onExportJson([]);

  expect(anchor.setAttribute).toHaveBeenCalledWith(
    "download",
    `backup_tablo_${currentDate}.json`,
  );
});

test("createExportBackupV3 preserves grouped and collapsed v3 structure", () => {
  const spaces: SpaceV3[] = [
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
          title: "Folder",
          color: "#ffcc00",
          collapsed: true,
          items: [
            {
              id: 100,
              position: "a0",
              type: "group",
              objectType: "group",
              title: "Group",
              collapsed: true,
              groupItems: [
                {
                  id: 101,
                  position: "a0",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Grafana",
                  url: "https://grafana.example",
                  favIconUrl: "https://grafana.example/favicon.ico",
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  expect(createExportBackupV3(spaces)).toEqual({
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
            title: "Folder",
            color: "#ffcc00",
            collapsed: true,
            items: [
              {
                id: 100,
                position: "a0",
                type: "group",
                objectType: "group",
                title: "Group",
                collapsed: true,
                groupItems: [
                  {
                    id: 101,
                    position: "a0",
                    type: "bookmark",
                    objectType: "bookmark",
                    title: "Grafana",
                    url: "https://grafana.example",
                    favIconUrl: "https://grafana.example/favicon.ico",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  });
});

test("createExportBackupV3 is compatible with the committed v3 backup fixture", () => {
  expect(createExportBackupV3(v3ExportFixture.spaces).spaces).toEqual(
    normalizeBackupV3(v3ExportFixture).spaces
  );
});

test("createExportSpaceBackupV3 exports one normalized v3 space", () => {
  const space: SpaceV3 = {
    id: 1,
    position: "a0",
    objectType: "space",
    title: "Main",
    folders: [
      {
        id: 10,
        position: "a0",
        objectType: "folder",
        title: "Folder",
        items: [
          {
            id: 100,
            position: "a0",
            type: "group",
            objectType: "group",
            title: "Group",
            groupItems: [
              {
                id: 101,
                position: "a0",
                type: "bookmark",
                objectType: "bookmark",
                title: "Grafana",
                url: "https://grafana.example",
                favIconUrl: "https://grafana.example/favicon.ico",
              },
            ],
          },
        ],
      },
    ],
  };

  expect(createExportSpaceBackupV3(space)).toEqual({
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Main",
      folders: [
        {
          id: 10,
          position: "a0",
          objectType: "folder",
          title: "Folder",
          items: [
            {
              id: 100,
              position: "a0",
              type: "group",
              objectType: "group",
              title: "Group",
              groupItems: [
                {
                  id: 101,
                  position: "a0",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Grafana",
                  url: "https://grafana.example",
                  favIconUrl: "https://grafana.example/favicon.ico",
                },
              ],
            },
          ],
        },
      ],
    },
  });
});

test("parseDashboardImportJson accepts appVersion1-branded v3 backups", () => {
  const result = parseDashboardImportJson(JSON.stringify({
    isAppVersion1: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [],
      },
    ],
  }));

  expect(result).toEqual({
    ok: true,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [],
      },
    ],
  });
});

test("parseDashboardImportJson accepts appVersion3-branded v3 backups", () => {
  const result = parseDashboardImportJson(JSON.stringify({
    isAppVersion3: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [],
      },
    ],
  }));

  expect(result).toEqual({
    ok: true,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [],
      },
    ],
  });
});

test("parseDashboardImportJson tells users to use Import space for space backups", () => {
  const result = parseDashboardImportJson(JSON.stringify({
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Main",
      folders: [],
    },
  }));

  expect(result).toEqual({
    ok: false,
    message: "This is a space backup. Use Import space button to add it.",
  });
});

test("parseDashboardImportJson rejects structurally invalid v3 backups", () => {
  const result = parseDashboardImportJson(JSON.stringify({
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
              title: "Invalid item",
              items: [{ id: 100, position: "a0", title: "Missing type" }],
            },
          ],
        },
      ],
    }));

  expect(result).toEqual({
    ok: false,
    message: "Unsupported JSON format",
  });
});

test("importFromJsonWithCallbacks hydrates through callback and resets input", () => {
  mockFileReaderWithContents(JSON.stringify({
    isTablo: true,
    version: 3,
    spaces: [{
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Main",
      folders: [],
    }],
  }));
  const onImported = jest.fn();
  const onMessage = jest.fn();
  const event = { target: { files: [{}], value: "backup.json" } };

  importFromJsonWithCallbacks(event, onImported, onMessage);

  expect(onImported).toHaveBeenCalledWith(expect.arrayContaining([
    expect.objectContaining({ title: "Main" }),
  ]));
  expect(onMessage).toHaveBeenCalledWith("Backup has been imported");
  expect(event.target.value).toBe("");
});

test("parseSpaceImportJson remaps one imported space backup", () => {
  const existingSpaces: SpaceV3[] = [
    {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Existing",
      folders: [],
    },
  ];
  const fileContents = JSON.stringify({
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Imported",
      folders: [
        {
          id: 10,
          position: "a0",
          objectType: "folder",
          title: "Folder",
          items: [
            {
              id: 100,
              position: "a0",
              type: "group",
              objectType: "group",
              title: "Group",
              groupItems: [
                {
                  id: 101,
                  position: "a0",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Grafana",
                  url: "https://grafana.example",
                  favIconUrl: "https://grafana.example/favicon.ico",
                },
              ],
            },
          ],
        },
      ],
    },
  });

  const result = parseSpaceImportJson(fileContents, existingSpaces);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);

  const importedSpace = result.space;
  const importedFolder = importedSpace.folders[0];
  const importedGroup = importedFolder.items[0];
  const importedBookmark = importedGroup.groupItems[0];

  expect(importedSpace.title).toBe("Imported");
  expect(importedSpace.id).not.toBe(1);
  expect(importedFolder.id).not.toBe(10);
  expect(importedGroup.id).not.toBe(100);
  expect(importedBookmark.id).not.toBe(101);
});

test("parseSpaceImportJson accepts a v3 backup with exactly one space", () => {
  const fileContents = JSON.stringify({
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 2,
        position: "a0",
        objectType: "space",
        title: "Single",
        folders: [],
      },
    ],
  });

  const result = parseSpaceImportJson(fileContents, []);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.message);
  expect(result.space.title).toBe("Single");
});

test("importSpaceFromJsonWithCallback reports an invalid file through callback", () => {
  mockFileReaderWithContents("not json");
  const onImported = jest.fn();
  const onError = jest.fn();
  const event = { target: { files: [{}], value: "broken.json" } };

  importSpaceFromJsonWithCallback(event, [], onImported, onError);

  expect(onImported).not.toHaveBeenCalled();
  expect(onError).toHaveBeenCalledWith("Unsupported space JSON format");
  expect(event.target.value).toBe("");
});

test("parseSpaceImportJson rejects v3 backups with multiple spaces", () => {
  const fileContents = JSON.stringify({
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "First",
        folders: [],
      },
      {
        id: 2,
        position: "a1",
        objectType: "space",
        title: "Second",
        folders: [],
      },
    ],
  });

  expect(parseSpaceImportJson(fileContents, [])).toEqual({
    ok: false,
    message: "Unsupported space JSON format",
  });
});

test("createBrowserBookmarksFolderInputs keeps selected bookmarks only", () => {
  const inputs = createBrowserBookmarksFolderInputs([
    {
      breadcrumbs: [],
      folder: {
        id: "folder-1",
        title: "Work",
        checked: true,
        children: [
          { id: "a", title: "Selected", url: "https://selected.example", checked: true },
          { id: "b", title: "Skipped", url: "https://skipped.example", checked: false },
        ],
      },
    },
    {
      breadcrumbs: [],
      folder: { id: "folder-2", title: "Unchecked", checked: false, children: [] },
    },
  ], false);

  expect(inputs).toHaveLength(1);
  expect(inputs[0]).toMatchObject({
    title: "Work",
    items: [{ title: "Selected", url: "https://selected.example" }],
  });
});
