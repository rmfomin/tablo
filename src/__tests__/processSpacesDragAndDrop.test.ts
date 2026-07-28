let onMouseMove:
  | ((event: MouseEvent, mouseMoved: boolean) => void)
  | undefined;
let onMouseUp: (() => void) | undefined;

jest.mock("@/newtab/feature/dragging/dragAndDropUtils", () => ({
  subscribeMouseEvents: jest.fn((_event, onMove, onUp) => {
    onMouseMove = onMove;
    onMouseUp = onUp;
    return jest.fn();
  }),
}));

jest.mock("@/newtab/helpers/selectionUtils", () => ({
  unselectAllItems: jest.fn(),
}));

import {
  processSpacesDragAndDrop,
  shouldUpdateSpaceInsertPreview,
} from "@/newtab/feature/dragging/processSpacesDragAndDrop";

test("space source keeps its place while hidden until the drag ends", () => {
  const source = createSpaceElement("1", "a", { left: 100, right: 150 });
  const spacesList = {
    getBoundingClientRect: () =>
      ({
        left: 100,
        right: 300,
        top: 0,
        bottom: 40,
        width: 200,
        height: 40,
      }) as DOMRect,
    querySelectorAll: () => [source],
    cloneNode: () => createSpacesListClone(),
  } as unknown as HTMLElement;
  const body = {
    appendChild: jest.fn(),
    classList: { add: jest.fn(), remove: jest.fn() },
  };
  (global as any).document = {
    body,
    querySelector: jest.fn(() => spacesList),
  };

  processSpacesDragAndDrop(
    {
      clientX: 110,
      clientY: 20,
      target: { closest: () => source },
    } as unknown as React.MouseEvent,
    { canSortSpaces: jest.fn(() => true), onChangeSpacePosition: jest.fn() }
  );

  onMouseMove!({ clientX: 160, clientY: 20 } as MouseEvent, true);

  expect(source.style).toMatchObject({ display: "", visibility: "hidden" });

  onMouseUp!();

  expect(source.style).toMatchObject({ display: "", visibility: "" });
});

test("dragged space returns to its initial position below the spaces list", () => {
  const source = createSpaceElement("1", "a", { left: 100, right: 150 });
  const spacesList = {
    getBoundingClientRect: () =>
      ({
        left: 100,
        right: 300,
        top: 0,
        bottom: 40,
        width: 200,
        height: 40,
      }) as DOMRect,
    querySelectorAll: () => [source],
    cloneNode: () => createSpacesListClone(),
  } as unknown as HTMLElement;
  const body = {
    appendChild: jest.fn(),
    classList: { add: jest.fn(), remove: jest.fn() },
  };
  (global as any).document = {
    body,
    querySelector: jest.fn(() => spacesList),
  };

  processSpacesDragAndDrop(
    {
      clientX: 110,
      clientY: 20,
      target: { closest: () => source },
    } as unknown as React.MouseEvent,
    { canSortSpaces: jest.fn(() => true), onChangeSpacePosition: jest.fn() }
  );

  onMouseMove!({ clientX: 160, clientY: 20 } as MouseEvent, true);
  const clonedSpacesList = body.appendChild.mock.calls[0][0] as HTMLElement;
  const draggedSpace = (clonedSpacesList.append as jest.Mock).mock
    .calls[0][0] as HTMLElement;

  onMouseMove!({ clientX: 170, clientY: 20 } as MouseEvent, true);
  onMouseMove!({ clientX: 170, clientY: 100 } as MouseEvent, true);

  expect(draggedSpace.style.left).toBe("0px");
  expect(body.classList.add).toHaveBeenCalledWith("spaces-drag-outside");
});

test("space drag preview updates when the hovered space changes", () => {
  const previous = {} as HTMLElement;
  const next = {} as HTMLElement;

  expect(
    shouldUpdateSpaceInsertPreview(previous, "before", next, "before")
  ).toBe(true);
});

test("space drag preview updates when insert side changes on the same space", () => {
  const space = {} as HTMLElement;

  expect(shouldUpdateSpaceInsertPreview(space, "before", space, "after")).toBe(
    true
  );
});

test("space drag preview stays unchanged for the same space and insert side", () => {
  const space = {} as HTMLElement;

  expect(shouldUpdateSpaceInsertPreview(space, "before", space, "before")).toBe(
    false
  );
});

function createSpaceElement(
  spaceId: string,
  position: string,
  rect: { left: number; right: number }
) {
  const element = {
    dataset: { spaceId, position },
    style: { display: "", visibility: "" },
    classList: { add: jest.fn() },
    getBoundingClientRect: () =>
      ({ ...rect, width: rect.right - rect.left }) as DOMRect,
  } as unknown as HTMLElement;
  element.cloneNode = () => createSpaceElement(spaceId, position, rect);
  return element;
}

function createSpacesListClone() {
  return {
    style: {},
    classList: { add: jest.fn() },
    append: jest.fn(),
    remove: jest.fn(),
  } as unknown as HTMLElement;
}
