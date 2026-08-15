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
  getItemDropAreaElements,
  getSelectedTargetRoots,
} from "@/newtab/04-features/dragging/model/dragAndDrop";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";

test("uses every selected root in store order when dragging a selected bookmark", () => {
  const bookmark = {
    dataset: { id: "1" },
    closest: jest.fn(() => null),
  } as unknown as HTMLElement;
  const group = { dataset: { id: "10" } } as unknown as HTMLElement;
  const root = {
    querySelector: jest.fn((selector: string) =>
      selector.includes('data-id="1"') ? bookmark : group,
    ),
  } as unknown as ParentNode;

  expect(getSelectedTargetRoots(bookmark, [1, 10], root)).toEqual([
    bookmark,
    group,
  ]);
});

test("dragging a child of a selected group moves the group root", () => {
  const group = { dataset: { groupId: "10", id: "10" } } as unknown as HTMLElement;
  const groupChild = {
    dataset: { id: "11" },
    closest: jest.fn(() => group),
  } as unknown as HTMLElement;
  const root = {
    querySelector: jest.fn(() => group),
  } as unknown as ParentNode;

  expect(getSelectedTargetRoots(groupChild, [10], root)).toEqual([group]);
});

test("dragging a selected group child keeps all individually selected children", () => {
  const group = { dataset: { groupId: "10" } } as unknown as HTMLElement;
  const firstChild = {
    dataset: { id: "11" },
    closest: jest.fn(() => group),
  } as unknown as HTMLElement;
  const secondChild = {
    dataset: { id: "12" },
  } as unknown as HTMLElement;
  const root = {
    querySelector: jest.fn((selector: string) =>
      selector.includes('data-id="11"') ? firstChild : secondChild,
    ),
  } as unknown as ParentNode;

  expect(getSelectedTargetRoots(firstChild, [11, 12], root)).toEqual([
    firstChild,
    secondChild,
  ]);
});

test("omits all group destinations when a selected group is dragged", () => {
  const folderItems = {
    dataset: { role: DOM_ROLE.folderItems },
  } as unknown as Element;
  const root = {
    querySelectorAll: jest.fn(() => [folderItems]),
  } as unknown as ParentNode;

  expect(getItemDropAreaElements(root, false)).toEqual([folderItems]);
  expect(root.querySelectorAll).toHaveBeenCalledWith(
    `[data-role="${DOM_ROLE.folderItems}"]`,
  );
});
