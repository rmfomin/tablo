// @vitest-environment happy-dom
import type React from "react";
import { createDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { processSpacesDragAndDrop } from "@/newtab/04-features/dragging/model/processSpacesDragAndDrop";

let host: HTMLDivElement;
let cancel: (() => void) | undefined;
let store: ReturnType<typeof createDashboardStore>;
let clearSelectedItemIds: () => void;

beforeEach(() => {
  store = createDashboardStore({
    currentSpaceId: 1,
    spaces: [1, 2, 3, 4].map((id) => ({
      id, position: `a${id}`, title: `Space ${id}`, objectType: "space", folders: [],
    })),
  });
  clearSelectedItemIds = vi.fn();
  host = document.createElement("div");
  host.dataset.role = "spaces-list";
  host.innerHTML = store.getState().spaces.map((space) =>
    `<div data-role="space-item" data-space-id="${space.id}" data-position="${space.position}"><span>${space.title}</span></div>`,
  ).join("");
  document.body.append(host);
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height } as DOMRect);
  vi.spyOn(host, "getBoundingClientRect").mockReturnValue(rect(0, 0, 165, 105));
  Array.from(host.children).forEach((card, index) => {
    vi.spyOn(card, "getBoundingClientRect").mockReturnValue(rect(index % 2 * 85, Math.floor(index / 2) * 55, 80, 50));
  });
});

afterEach(() => {
  cancel?.();
  cancel = undefined;
  host.remove();
  document.body.classList.remove("dragging", "space-sorting");
  vi.restoreAllMocks();
});

function start(id = 1) {
  const target = host.querySelector<HTMLElement>(`[data-space-id="${id}"] span`)!;
  const { left, top } = target.parentElement!.getBoundingClientRect();
  cancel = processSpacesDragAndDrop({
    target, button: 0, clientX: left + 20, clientY: top + 20,
  } as unknown as React.MouseEvent, {
    canSortSpaces: () => true,
    onChangeSpacePosition: (spaceId, position) => store.getState().updateSpace(spaceId, { position }),
  }, { selectedItemIds: [], clearSelectedItemIds });
}

const move = (clientX: number, clientY: number) => document.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY }));
const drop = (clientX: number, clientY: number) => document.dispatchEvent(new MouseEvent("mouseup", { clientX, clientY }));
const order = () => store.getState().spaces.map((space) => space.id);
const visibleOrder = () => Array.from(host.children)
  .filter((card) => (card as HTMLElement).style.display !== "none")
  .map((card) => Number((card as HTMLElement).dataset.spaceId));

test("shows a moving copy and an insertion preview across rows, saving only on release", () => {
  start();
  move(20, 75);
  expect(host.querySelector<HTMLElement>('[data-space-id="1"]:not([data-dad-preview])')?.style.display).toBe("none");
  expect(document.querySelector<HTMLElement>(".dad-dummy--space")?.style.transform).toBe("translate(20px, 75px)");
  expect(host.querySelector('[data-dad-preview="true"]')?.getAttribute("data-space-id")).toBe("1");
  expect(visibleOrder()).toEqual([2, 3, 1, 4]);
  expect(order()).toEqual([1, 2, 3, 4]);
  drop(20, 75);
  expect(order()).toEqual([2, 3, 1, 4]);
  expect(store.getState().currentSpaceId).toBe(1);
  expect(store.getState().undoSteps).toHaveLength(1);
  expect(host.querySelector('[data-dad-preview="true"]')).toBeNull();
  expect(document.querySelector(".dad-dummy--space")).toBeNull();
  expect(visibleOrder()).toEqual([1, 2, 3, 4]);
});

test("removes the space from the list outside the drop area and restores its preview on return", () => {
  start();
  move(200, 200);
  expect(visibleOrder()).toEqual([2, 3, 4]);
  expect(host.querySelector('[data-dad-preview="true"]')).toBeNull();
  expect(document.querySelector(".dad-dummy--space")).not.toBeNull();
  move(110, 75);
  expect(visibleOrder()).toEqual([2, 3, 4, 1]);
  move(20, 75);
  expect(visibleOrder()).toEqual([2, 3, 1, 4]);
  drop(20, 75);
  expect(order()).toEqual([2, 3, 1, 4]);
});

test("moves a space backwards to the destination slot and undo restores the order", () => {
  start(4);
  move(20, 20);
  drop(20, 20);
  expect(order()).toEqual([4, 1, 2, 3]);
  store.getState().undo();
  expect(order()).toEqual([1, 2, 3, 4]);
});

test("uses the release position when it differs from the last mouse move", () => {
  start();
  move(20, 75);
  drop(110, 75);
  expect(order()).toEqual([2, 3, 4, 1]);
});

test.each(["outside", "source", "escape", "blur", "dispose"])("cancels without changing order on %s", (reason) => {
  start();
  move(20, 75);
  if (reason === "escape") document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  if (reason === "blur") window.dispatchEvent(new Event("blur"));
  if (reason === "dispose") cancel?.();
  if (reason === "outside") drop(200, 200);
  else if (reason === "source") drop(20, 20);
  else drop(20, 75);
  expect(order()).toEqual([1, 2, 3, 4]);
  expect(store.getState().undoSteps).toHaveLength(0);
  expect(host.querySelector('[data-dad-preview="true"]')).toBeNull();
  expect(document.querySelector(".dad-dummy--space")).toBeNull();
  expect(visibleOrder()).toEqual([1, 2, 3, 4]);
  expect(document.body.classList.contains("space-sorting")).toBe(false);
});

test("a press without movement remains an ordinary click", () => {
  start();
  move(22, 22);
  drop(22, 22);
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  host.firstElementChild!.dispatchEvent(click);
  expect(click.defaultPrevented).toBe(false);
  expect(order()).toEqual([1, 2, 3, 4]);
  expect(store.getState().undoSteps).toHaveLength(0);
});

test("a completed drag suppresses its follow-up click", () => {
  start();
  move(110, 20);
  drop(110, 20);
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  host.children[1].dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(order()).toEqual([2, 1, 3, 4]);
});

test("Escape suppresses the held gesture's click after restoring the source", () => {
  start(2);
  move(20, 75);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  drop(110, 20);
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  host.children[1].dispatchEvent(click);
  expect(click.defaultPrevented).toBe(true);
  expect(order()).toEqual([1, 2, 3, 4]);
});

test("the next ordinary press clears click suppression if cancellation lost the mouse release", () => {
  start();
  move(110, 20);
  window.dispatchEvent(new Event("blur"));
  host.children[1].dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
  const click = new MouseEvent("click", { bubbles: true, cancelable: true });
  host.children[1].dispatchEvent(click);
  expect(click.defaultPrevented).toBe(false);
});

test.each([true, false])("disposing a finished gesture preserves a later bookmark drag (moved: %s)", (moved) => {
  start();
  if (moved) move(110, 20);
  drop(110, 20);
  document.body.classList.add("dragging");
  cancel?.();
  expect(document.body.classList.contains("dragging")).toBe(true);
});
