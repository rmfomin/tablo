let onMouseMove: ((event: MouseEvent, mouseMoved: boolean) => void) | undefined;

const dropArea = {
  objectId: 20,
  element: {
    parentElement: {
      children: [],
    },
    getBoundingClientRect: vi.fn(),
  },
  rect: { left: 0, width: 200 },
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
  calculateSpacesDropAreas: vi.fn(() => []),
  calculateTargetInsertBeforeFolderId: vi.fn(),
  createFolderDropIndicator: vi.fn(() => ({ style: {}, remove: vi.fn() })),
  createDropPreview: vi.fn(() => [{}]),
  createFolderDummy: vi.fn(() => ({ style: {} })),
  getFolderId: vi.fn(() => 10),
  getOverlappedDropArea: vi.fn(() => dropArea),
  getOverlappedSpaceDropArea: vi.fn(),
  placeFolderDropIndicator: vi.fn(),
  placeDropPreview: vi.fn(),
  removeFolderDropIndicator: vi.fn(),
  removeDropPreview: vi.fn(),
  setDragSourceHidden: vi.fn(() => vi.fn()),
}));

import {
  calculateFoldersDropAreas,
  createFolderDropIndicator,
  createDropPreview,
  placeFolderDropIndicator,
} from "@/newtab/04-features/dragging/model/dragAndDrop";
import { processFolderDragAndDrop } from "@/newtab/04-features/dragging/model/processFolderDragAndDrop";

test("folder drag does not insert a preview into the folder layout", () => {
  const body = {
    classList: { add: vi.fn(), remove: vi.fn() },
    append: vi.fn(),
  };
  (createFolderDropIndicator as VitestMock).mockClear();
  (createDropPreview as VitestMock).mockClear();
  (placeFolderDropIndicator as VitestMock).mockClear();
  (global as any).document = {
    body,
    querySelectorAll: vi.fn(() => []),
  };

  processFolderDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      onChangeSpace: vi.fn(),
      onDragStarted: vi.fn(() => true),
      onCancel: vi.fn(),
      onDrop: vi.fn(),
    },
    ({ dataset: {}, style: {} } as unknown) as HTMLElement
  );

  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);

  expect(createDropPreview).not.toHaveBeenCalled();
  expect(createFolderDropIndicator).toHaveBeenCalledTimes(1);
  expect(placeFolderDropIndicator).toHaveBeenCalledTimes(1);
});

test("folder drag recalculates target geometry after removing its source", () => {
  const body = {
    classList: { add: vi.fn(), remove: vi.fn() },
    append: vi.fn(),
  };
  const source = { dataset: {}, style: {} } as unknown as HTMLElement;
  const sibling = { dataset: {}, style: {} } as unknown as HTMLElement;
  (global as any).document = {
    body,
    querySelectorAll: vi.fn(() => [source, sibling]),
  };
  (calculateFoldersDropAreas as VitestMock).mockClear();

  processFolderDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      onChangeSpace: vi.fn(),
      onDragStarted: vi.fn(() => true),
      onCancel: vi.fn(),
      onDrop: vi.fn(),
    },
    source
  );

  onMouseMove!({ clientX: 10, clientY: 0 } as MouseEvent, true);

  expect(calculateFoldersDropAreas).toHaveBeenCalledTimes(2);
  expect((calculateFoldersDropAreas as VitestMock).mock.calls[1][0]).toEqual([
    sibling,
  ]);
});

test("stable folder target does not recreate preview on every mouse move", () => {
  const body = {
    classList: { add: vi.fn(), remove: vi.fn() },
    append: vi.fn(),
  };
  (global as any).document = {
    body,
    querySelectorAll: vi.fn(() => []),
  };
  (createDropPreview as VitestMock).mockClear();

  processFolderDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      onChangeSpace: vi.fn(),
      onDragStarted: vi.fn(() => true),
      onCancel: vi.fn(),
      onDrop: vi.fn(),
    },
    ({ dataset: {}, style: {} } as unknown) as HTMLElement
  );

  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);
  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);

  expect(createDropPreview).not.toHaveBeenCalled();
});
