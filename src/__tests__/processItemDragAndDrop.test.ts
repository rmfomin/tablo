let onMouseMove: ((event: MouseEvent, mouseMoved: boolean) => void) | undefined;

const dropArea = {
  objectId: 10,
  element: {
    closest: jest.fn(() => null),
  },
  itemRects: [],
};

jest.mock("@/newtab/04-features/dragging/model/dragAndDropUtils", () => ({
  setScrollByDummyClientY: jest.fn(),
  subscribeMouseEvents: jest.fn(
    (_event, onMove: (event: MouseEvent, mouseMoved: boolean) => void) => {
      onMouseMove = onMove;
      return jest.fn();
    }
  ),
}));

jest.mock("@/newtab/01-app/model/selection", () => ({
  unselectAllItems: jest.fn(),
}));

jest.mock("@/newtab/04-features/dragging/model/dragAndDrop", () => ({
  calculateFoldersDropAreas: jest.fn(() => [dropArea]),
  createDropPreview: jest.fn(() => [{}]),
  createTabDummy: jest.fn(() => ({ style: {} })),
  getDragLayoutElement: jest.fn((element) => element),
  getFolderId: jest.fn(() => 10),
  getIdsFromElements: jest.fn(() => [101]),
  getItemDropAreaElements: jest.fn(() => []),
  getItemIdByIndex: jest.fn(),
  getNewPlacementForItem: jest.fn(() => ({ index: 0, placeholderY: 0 })),
  getOverlappedDropArea: jest.fn(() => dropArea),
  placeDropPreview: jest.fn(),
  removeDropPreview: jest.fn(),
  setDragSourceHidden: jest.fn(() => jest.fn()),
}));

import { placeDropPreview } from "@/newtab/04-features/dragging/model/dragAndDrop";
import { processItemDragAndDrop } from "@/newtab/04-features/dragging/model/processItemDragAndDrop";

test("first drag movement renders preview at current cursor position", () => {
  const body = {
    classList: { add: jest.fn(), remove: jest.fn() },
    append: jest.fn(),
  };
  (global as any).document = {
    body,
    querySelectorAll: jest.fn(() => []),
  };

  processItemDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      isFolderItem: false,
      onClick: jest.fn(),
      onCancel: jest.fn(),
      onDragStarted: jest.fn(() => true),
      onDrop: jest.fn(),
    },
    [({ dataset: {}, parentElement: null } as unknown) as HTMLElement],
    { selectedItemIds: [], clearSelectedItemIds: jest.fn() }
  );

  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);

  expect(placeDropPreview).toHaveBeenCalledTimes(1);
});
