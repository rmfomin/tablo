// @vitest-environment happy-dom
import React, { useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { useFolderResize } from "@/newtab/03-widgets/dashboard/Folder/useFolderResize";

let root: Root;
let host: HTMLDivElement;
let commit = vi.fn<(span: number) => void>();

type FixtureProps = { columnSpan?: number; availableColumns?: number; collapsed?: boolean; onCommit?: (span: number) => void };
function Fixture({ columnSpan = 2, availableColumns = 4, collapsed = false, onCommit = commit }: FixtureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const resize = useFolderResize({ folderId: 10, columnSpan, availableColumns, collapsed, rootRef: ref, onCommit });
  return React.createElement("div", { "data-grid": true, style: { columnGap: "20px" } },
    React.createElement("div", { ref, "data-preview": resize.previewColumnSpan ?? "none", "data-resizing": resize.isResizing },
      React.createElement("button", { onMouseDown: resize.onMouseDown, onKeyDown: resize.onKeyDown }, "Resize")));
}
const render = (props: FixtureProps = {}) => flushSync(() => root.render(React.createElement(Fixture, props)));
const folder = () => host.querySelector<HTMLElement>("[data-preview]")!;
function start(clientX = 100, button = 0) {
  const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true, clientX, button });
  flushSync(() => host.querySelector("button")!.dispatchEvent(event));
  return event;
}
const move = (clientX: number) => flushSync(() => document.dispatchEvent(new MouseEvent("mousemove", { clientX })));
const finish = () => flushSync(() => document.dispatchEvent(new MouseEvent("mouseup")));
const key = (value: string) => flushSync(() => host.querySelector("button")!.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true })));

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  commit = vi.fn();
  render();
  Object.defineProperty(host.querySelector("[data-grid]")!, "clientWidth", { value: 780, configurable: true });
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  document.body.classList.remove("folder-resizing");
  vi.restoreAllMocks();
});

test("previews rounded grid steps locally and commits once on release", () => {
  expect(start().defaultPrevented).toBe(true);
  expect(document.body.classList.contains("folder-resizing")).toBe(true);
  move(199);
  expect(folder().dataset.preview).toBe("2");
  move(200);
  expect(folder().dataset.preview).toBe("3");
  expect(commit).not.toHaveBeenCalled();
  move(10000);
  expect(folder().dataset.preview).toBe("4");
  finish();
  finish();
  expect(commit).toHaveBeenCalledExactlyOnceWith(4);
  expect(folder().dataset.preview).toBe("none");
  expect(folder().dataset.resizing).toBe("false");
  expect(document.body.classList.contains("folder-resizing")).toBe(false);
});

test("cancels via Escape and blur without committing or leaving listeners active", () => {
  start();
  move(-1000);
  expect(folder().dataset.preview).toBe("1");
  flushSync(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));
  finish();
  expect(commit).not.toHaveBeenCalled();
  expect(folder().dataset.preview).toBe("none");
  start();
  move(1000);
  flushSync(() => window.dispatchEvent(new Event("blur")));
  move(10000);
  finish();
  expect(commit).not.toHaveBeenCalled();
  expect(folder().dataset.resizing).toBe("false");
  expect(document.body.classList.contains("folder-resizing")).toBe(false);
});

test("unmount cancels the gesture and removes global listeners", () => {
  const removeDocument = vi.spyOn(document, "removeEventListener");
  const removeWindow = vi.spyOn(window, "removeEventListener");
  start();
  move(1000);
  flushSync(() => root.render(null));
  finish();
  expect(commit).not.toHaveBeenCalled();
  expect(document.body.classList.contains("folder-resizing")).toBe(false);
  expect(removeDocument.mock.calls.map(([type]) => type)).toEqual(expect.arrayContaining(["mousemove", "mouseup", "keydown"]));
  expect(removeWindow.mock.calls.map(([type]) => type)).toContain("blur");
});

test("rerender retains the gesture listeners and uses the latest commit callback", () => {
  start();
  const addDocument = vi.spyOn(document, "addEventListener");
  const latestCommit = vi.fn();
  render({ onCommit: latestCommit });
  move(300);
  expect(addDocument.mock.calls.filter(([type]) => ["mousemove", "mouseup", "keydown"].includes(type))).toHaveLength(0);
  finish();
  expect(commit).not.toHaveBeenCalled();
  expect(latestCommit).toHaveBeenCalledExactlyOnceWith(3);
});

test("zero movement and returning to the initial effective width preserve a larger saved size", () => {
  render({ columnSpan: 8, availableColumns: 4 });
  start();
  finish();
  start();
  move(-100);
  move(100);
  finish();
  key("End");
  expect(commit).not.toHaveBeenCalled();
});

test("falls back to measured grid width when clientWidth is unavailable", () => {
  const grid = host.querySelector<HTMLElement>("[data-grid]")!;
  Object.defineProperty(grid, "clientWidth", { value: 0 });
  vi.spyOn(grid, "getBoundingClientRect").mockReturnValue({ width: 780 } as DOMRect);
  start();
  move(300);
  finish();
  expect(commit).toHaveBeenCalledExactlyOnceWith(3);
});

test.each([["ArrowLeft", 1], ["ArrowRight", 3], ["ArrowDown", 1], ["ArrowUp", 3], ["Home", 1], ["End", 4]] as const)("keyboard %s commits one clamped change", (value, expected) => {
  key(value);
  expect(commit).toHaveBeenCalledExactlyOnceWith(expected);
  expect(document.body.classList.contains("folder-resizing")).toBe(false);
});

test("collapsed folders and secondary mouse buttons cannot resize", () => {
  start(100, 2);
  move(1000);
  finish();
  expect(commit).not.toHaveBeenCalled();
  render({ collapsed: true });
  start();
  move(1000);
  finish();
  key("ArrowRight");
  expect(commit).not.toHaveBeenCalled();
  expect(folder().dataset.resizing).toBe("false");
});

test("Escape from the handle cancels without bubbling into dashboard shortcuts", () => {
  start();
  move(300);
  const dashboardShortcut = vi.fn();
  document.addEventListener("keydown", dashboardShortcut);
  key("Escape");
  document.removeEventListener("keydown", dashboardShortcut);
  finish();
  expect(dashboardShortcut).not.toHaveBeenCalled();
  expect(commit).not.toHaveBeenCalled();
  expect(folder().dataset.resizing).toBe("false");
});

test("collapsing during a gesture cancels its pending change", () => {
  start();
  move(300);
  render({ collapsed: true });
  finish();
  expect(commit).not.toHaveBeenCalled();
  expect(document.body.classList.contains("folder-resizing")).toBe(false);
});

test("keyboard boundary and unrelated keys leave the saved size untouched", () => {
  render({ columnSpan: 1 });
  key("ArrowLeft");
  key("Home");
  render({ columnSpan: 4 });
  key("ArrowRight");
  key("End");
  key("Enter");
  expect(commit).not.toHaveBeenCalled();
});
