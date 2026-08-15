let onMouseMove: ((event: MouseEvent, mouseMoved: boolean) => void) | undefined;

const dropArea = {
  objectId: 10,
  element: {
    closest: vi.fn(() => null),
  },
  itemRects: [],
};

vi.mock("@/newtab/04-features/dragging/model/dragAndDropUtils", () => ({
  setScrollByDummyClientY: vi.fn(),
  subscribeMouseEvents: vi.fn(
    (_event, onMove: (event: MouseEvent, mouseMoved: boolean) => void) => {
      onMouseMove = onMove;
      return vi.fn();
    }
  ),
}));

vi.mock("@/newtab/01-app/model/selection", () => ({
  unselectAllItems: vi.fn(),
}));

vi.mock("@/newtab/04-features/dragging/model/dragAndDrop", () => ({
  calculateFoldersDropAreas: vi.fn(() => [dropArea]),
  createDropPreview: vi.fn(() => [{}]),
  createTabDummy: vi.fn(() => ({ style: {} })),
  getDragLayoutElement: vi.fn((element) => element),
  getFolderId: vi.fn(() => 10),
  getIdsFromElements: vi.fn(() => [101]),
  getItemDropAreaElements: vi.fn(() => []),
  getItemIdByIndex: vi.fn(),
  getNewPlacementForItem: vi.fn(() => ({ index: 0, placeholderY: 0 })),
  getOverlappedDropArea: vi.fn(() => dropArea),
  placeDropPreview: vi.fn(),
  removeDropPreview: vi.fn(),
  setDragSourceHidden: vi.fn(() => vi.fn()),
}));

import { placeDropPreview } from "@/newtab/04-features/dragging/model/dragAndDrop";
import { processItemDragAndDrop } from "@/newtab/04-features/dragging/model/processItemDragAndDrop";

test("first drag movement renders preview at current cursor position", () => {
  const body = {
    classList: { add: vi.fn(), remove: vi.fn() },
    append: vi.fn(),
  };
  (global as any).document = {
    body,
    querySelectorAll: vi.fn(() => []),
  };

  processItemDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      isFolderItem: false,
      onClick: vi.fn(),
      onCancel: vi.fn(),
      onDragStarted: vi.fn(() => true),
      onDrop: vi.fn(),
    },
    [({ dataset: {}, parentElement: null } as unknown) as HTMLElement],
    { selectedItemIds: [], clearSelectedItemIds: vi.fn() }
  );

  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);

  expect(placeDropPreview).toHaveBeenCalledTimes(1);
});
