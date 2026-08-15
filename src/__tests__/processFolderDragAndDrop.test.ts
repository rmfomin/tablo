let onMouseMove: ((event: MouseEvent, mouseMoved: boolean) => void) | undefined;

const dropArea = {
  objectId: 20,
  element: {
    parentElement: {
      children: [],
    },
    getBoundingClientRect: jest.fn(),
  },
  rect: { left: 0, width: 200 },
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
  calculateSpacesDropAreas: jest.fn(() => []),
  calculateTargetInsertBeforeFolderId: jest.fn(),
  createFolderDropIndicator: jest.fn(() => ({ style: {}, remove: jest.fn() })),
  createDropPreview: jest.fn(() => [{}]),
  createFolderDummy: jest.fn(() => ({ style: {} })),
  getFolderId: jest.fn(() => 10),
  getOverlappedDropArea: jest.fn(() => dropArea),
  getOverlappedSpaceDropArea: jest.fn(),
  placeFolderDropIndicator: jest.fn(),
  placeDropPreview: jest.fn(),
  removeFolderDropIndicator: jest.fn(),
  removeDropPreview: jest.fn(),
  setDragSourceHidden: jest.fn(() => jest.fn()),
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
    classList: { add: jest.fn(), remove: jest.fn() },
    append: jest.fn(),
  };
  (createFolderDropIndicator as jest.Mock).mockClear();
  (createDropPreview as jest.Mock).mockClear();
  (placeFolderDropIndicator as jest.Mock).mockClear();
  (global as any).document = {
    body,
    querySelectorAll: jest.fn(() => []),
  };

  processFolderDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      onChangeSpace: jest.fn(),
      onDragStarted: jest.fn(() => true),
      onCancel: jest.fn(),
      onDrop: jest.fn(),
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
    classList: { add: jest.fn(), remove: jest.fn() },
    append: jest.fn(),
  };
  const source = { dataset: {}, style: {} } as unknown as HTMLElement;
  const sibling = { dataset: {}, style: {} } as unknown as HTMLElement;
  (global as any).document = {
    body,
    querySelectorAll: jest.fn(() => [source, sibling]),
  };
  (calculateFoldersDropAreas as jest.Mock).mockClear();

  processFolderDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      onChangeSpace: jest.fn(),
      onDragStarted: jest.fn(() => true),
      onCancel: jest.fn(),
      onDrop: jest.fn(),
    },
    source
  );

  onMouseMove!({ clientX: 10, clientY: 0 } as MouseEvent, true);

  expect(calculateFoldersDropAreas).toHaveBeenCalledTimes(2);
  expect((calculateFoldersDropAreas as jest.Mock).mock.calls[1][0]).toEqual([
    sibling,
  ]);
});

test("stable folder target does not recreate preview on every mouse move", () => {
  const body = {
    classList: { add: jest.fn(), remove: jest.fn() },
    append: jest.fn(),
  };
  (global as any).document = {
    body,
    querySelectorAll: jest.fn(() => []),
  };
  (createDropPreview as jest.Mock).mockClear();

  processFolderDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      onChangeSpace: jest.fn(),
      onDragStarted: jest.fn(() => true),
      onCancel: jest.fn(),
      onDrop: jest.fn(),
    },
    ({ dataset: {}, style: {} } as unknown) as HTMLElement
  );

  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);
  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);

  expect(createDropPreview).not.toHaveBeenCalled();
});
