import fs from "fs";
import path from "path";

jest.mock("@/newtab/01-app/model/selection", () => ({
  getSelectedItemsElements: jest.fn(() => []),
  unselectAllItems: jest.fn(),
}));

jest.mock("@/newtab/04-features/dragging/model/processFolderDragAndDrop", () => ({
  processFolderDragAndDrop: jest.fn(),
}));

jest.mock("@/newtab/04-features/dragging/model/processItemDragAndDrop", () => ({
  processItemDragAndDrop: jest.fn(),
}));

jest.mock("@/newtab/04-features/dragging/model/processSpacesDragAndDrop", () => ({
  processSpacesDragAndDrop: jest.fn(),
}));

import {
  calculateFoldersDropAreas,
  getDropAreaFolderId,
  getDropAreaGroupId,
  createTabDummy,
  createDropPreview,
  getDragPreviewElement,
  getItemIdByIndex,
  getOverlappedDropArea,
  placeDropPreview,
  removeDropPreview,
  setDragSourceHidden,
} from "@/newtab/04-features/dragging/model/dragAndDrop";
import { DOM_ROLE, roleSelector } from "@/newtab/06-shared/lib/dom/roles";

test("getItemIdByIndex returns group id for top-level group drop target", () => {
  const groupEl = {
    querySelector: jest.fn((selector: string) => {
      if (selector.includes(roleSelector(DOM_ROLE.groupHeader))) {
        return { dataset: { id: "100" } };
      }
      if (selector.includes(roleSelector(DOM_ROLE.folderItem))) {
        return { dataset: { id: "101" } };
      }
      return undefined;
    }),
  };
  const folderItemsBox = ({
    children: {
      length: 1,
      item: jest.fn(() => groupEl),
    },
  } as unknown) as HTMLElement;

  expect(getItemIdByIndex(folderItemsBox, 0)).toBe(100);
});

test("getItemIdByIndex returns bookmark id for top-level bookmark drop target", () => {
  const bookmarkEl = {
    querySelector: jest.fn(() => ({ dataset: { id: "102" } })),
  };
  const folderItemsBox = ({
    children: {
      length: 1,
      item: jest.fn(() => bookmarkEl),
    },
  } as unknown) as HTMLElement;

  expect(getItemIdByIndex(folderItemsBox, 0)).toBe(102);
});

test("temporary preview is ignored when resolving the next item id", () => {
  const item = (id: string) => ({
    dataset: {},
    querySelector: jest.fn(() => ({ dataset: { id } })),
  });
  const preview = { dataset: { dadPreview: "true" } };
  const children = [item("101"), preview, item("102")];
  const container = ({
    children: {
      length: children.length,
      item: (index: number) => children[index],
    },
  } as unknown) as HTMLElement;

  expect(getItemIdByIndex(container, 1)).toBe(102);
});

test("preview occupies a target position while source is hidden and is restored on cleanup", () => {
  const previewStyle = {
    display: "none",
    removeProperty(property: string) {
      if (property === "display") {
        this.display = "";
      }
    },
  };
  const preview = ({
    dataset: {},
    classList: { add: jest.fn() },
    style: previewStyle,
    remove: jest.fn(),
  } as unknown) as HTMLElement;
  const source = ({
    dataset: {},
    style: { display: "" },
    cloneNode: jest.fn(() => preview),
  } as unknown) as HTMLElement;
  const target = ({
    children: { length: 0, item: jest.fn() },
    insertBefore: jest.fn(),
  } as unknown) as HTMLElement;
  const restoreSource = setDragSourceHidden([source]);
  const previews = createDropPreview([source]);

  placeDropPreview(target, previews, 0);

  expect(source.style.display).toBe("none");
  expect(preview.dataset.dadPreview).toBe("true");
  expect(preview.style.display).toBe("");
  expect(target.insertBefore).toHaveBeenCalledWith(preview, null);

  removeDropPreview(previews);
  restoreSource();

  expect(preview.remove).toHaveBeenCalledTimes(2);
  expect(source.style.display).toBe("");
});

test("group header drag preview uses the whole group element", () => {
  const group = {} as HTMLElement;
  const header = ({
    dataset: {
      role: DOM_ROLE.groupHeader,
    },
    parentElement: group,
  } as unknown) as HTMLElement;

  expect(getDragPreviewElement(header)).toBe(group);
  expect(createTabDummy).toBeDefined();
});

test("drop area ids include folder id and optional group id", () => {
  const groupItemsBox = ({
    dataset: {
      folderId: "10",
      groupId: "100",
    },
  } as unknown) as HTMLElement;

  expect(getDropAreaFolderId(groupItemsBox)).toBe(10);
  expect(getDropAreaGroupId(groupItemsBox)).toBe(100);
});

test("overlapped drop area prefers nested group area over parent folder area", () => {
  const folderArea = {
    objectId: 10,
    element: {} as HTMLElement,
    rect: { left: 0, right: 300, top: 0, bottom: 300, width: 300, height: 300 },
    itemRects: [],
  } as any;
  const groupArea = {
    objectId: 10,
    groupId: 100,
    element: {} as HTMLElement,
    rect: {
      left: 20,
      right: 280,
      top: 80,
      bottom: 140,
      width: 260,
      height: 60,
    },
    itemRects: [],
  } as any;
  const event = { clientX: 100, clientY: 100 } as MouseEvent;

  expect(getOverlappedDropArea([folderArea, groupArea], event)).toBe(groupArea);
});

test("overlapped drop area prefers group header when cursor is inside its real rect", () => {
  const groupHeaderArea = {
    objectId: 10,
    groupId: 100,
    insertAtEnd: true,
    element: {} as HTMLElement,
    rect: {
      left: 20,
      right: 280,
      top: 80,
      bottom: 108,
      width: 260,
      height: 28,
    },
    itemRects: [],
  } as any;
  const emptyGroupItemsArea = {
    objectId: 10,
    groupId: 100,
    element: {} as HTMLElement,
    rect: {
      left: 20,
      right: 280,
      top: 110,
      bottom: 128,
      width: 260,
      height: 18,
    },
    itemRects: [],
  } as any;
  const event = { clientX: 100, clientY: 92 } as MouseEvent;

  expect(
    getOverlappedDropArea([groupHeaderArea, emptyGroupItemsArea], event)
  ).toBe(groupHeaderArea);
});

test("empty group items keep a stable drop zone before dragging starts", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss"
    ),
    "utf8"
  );

  const baseRule = source.match(/\.items \{[^}]*\}/)?.[0];

  expect(baseRule).toContain("min-height: 18px;");
});

test("group header can be used as a drop area that inserts into group end", () => {
  const header = ({
    dataset: {
      folderId: "10",
      groupId: "100",
      dropInsert: "end",
    },
    children: [],
    getBoundingClientRect: jest.fn(
      () =>
        ({
          left: 10,
          right: 200,
          top: 20,
          bottom: 48,
          width: 190,
          height: 28,
          x: 10,
          y: 20,
          toJSON: jest.fn(),
        } as DOMRect)
    ),
  } as unknown) as Element;

  expect(calculateFoldersDropAreas([header], true)).toEqual([
    expect.objectContaining({
      objectId: 10,
      groupId: 100,
      insertAtEnd: true,
      itemRects: [],
    }),
  ]);
});

test("temporary preview is excluded from drop areas", () => {
  const preview = ({
    closest: jest.fn(() => ({ dataset: { dadPreview: "true" } })),
  } as unknown) as Element;

  expect(calculateFoldersDropAreas([preview], true)).toEqual([]);
});

test("group drop target style outlines the whole group", () => {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "../newtab/03-widgets/dashboard/FolderGroup/FolderGroup.module.scss"
    ),
    "utf8"
  );

  expect(source).toContain('[data-drop-target="true"]');
  expect(source).toContain("outline:");
});

test("drag preview has no selected-item background", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../newtab/04-features/dragging/dragAndDrop.scss"),
    "utf8"
  );

  expect(source).toContain(".dad-drop-preview");
  expect(source).toContain("opacity: 0.18");
  expect(source).toContain('.dad-dummy [data-selected="true"]');
  expect(source).toContain("background-color: transparent !important;");
});
