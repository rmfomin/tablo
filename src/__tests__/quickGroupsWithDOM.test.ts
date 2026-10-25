// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { Bookmarks } from "@/newtab/03-widgets/dashboard/Bookmarks/Bookmarks";
import { dashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";
import { createTabGroup } from "@/newtab/06-shared/api/chrome/tabs";

vi.mock("@/newtab/06-shared/api/chrome/tabs", async (original) => ({
  ...await original<typeof import("@/newtab/06-shared/api/chrome/tabs")>(),
  createTabGroup: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/newtab/03-widgets/dashboard/Bookmarks/wrench.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/03-widgets/dashboard/Bookmarks/folder-kanban.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/03-widgets/dashboard/Folder/Folder", () => ({ Folder: () => null }));
vi.mock("@/newtab/03-widgets/dashboard/Folder/NewFolderPlaceholder", () => ({ NewFolderPlaceholder: () => null }));
vi.mock("@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon", () => ({ DropdownMenuIcon: () => React.createElement("svg") }));
vi.mock("@/newtab/04-features/area-selection/ui/useAreaSelection", () => ({ useAreaSelection: () => ({ onMouseDown: () => false, selectionRect: undefined }) }));

let host: HTMLDivElement;
let root: Root;
const configs = () => dashboardStore.getState().spaces[0].quickGroups!;
beforeEach(() => {
  vi.mocked(createTabGroup).mockReset().mockResolvedValue(undefined);
  dashboardStore.getState().hydrate({ currentSpaceId: 1, spaces: [{
    id: 1, position: "a0", title: "Main", objectType: "space", folders: [],
    quickGroups: [{ title: "Work", color: "blue", urls: [" https://example.com ", "", "https://docs.test"] }],
  }] });
  uiStore.getState().hideNotification();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  flushSync(() => root.render(React.createElement(Bookmarks)));
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  dashboardStore.getState().hydrate({ spaces: [], currentSpaceId: -1 });
});

test("opens only nonempty trimmed URLs and preserves group metadata", async () => {
  const open = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "Work")!;
  await flushSync(() => open.click());
  expect(createTabGroup).toHaveBeenCalledWith(["https://example.com", "https://docs.test"], "Work", "blue");
});

test("persists a selected group color without changing URLs or title", () => {
  flushSync(() => host.querySelector<HTMLButtonElement>('[aria-label="Work settings"]')!.click());
  const red = document.querySelector<HTMLButtonElement>('.dropdown-menu [aria-label="Red"]')!;
  flushSync(() => red.click());
  expect(configs()[0]).toEqual({ title: "Work", color: "red", urls: [" https://example.com ", "", "https://docs.test"] });
  expect(document.querySelector('[aria-label="Red"]')?.getAttribute("aria-pressed")).toBe("true");
});

test("adds an empty group, refuses to open it, and deletes only that group", () => {
  flushSync(() => host.querySelector<HTMLButtonElement>('[aria-label="Add group"]')!.click());
  expect(configs()).toHaveLength(2);
  const open = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "New group")!;
  flushSync(() => open.click());
  expect(createTabGroup).not.toHaveBeenCalled();
  expect(uiStore.getState().notification).toMatchObject({ isError: true, message: "Add at least one URL to the tab group" });
  flushSync(() => host.querySelector<HTMLButtonElement>('[aria-label="New group settings"]')!.click());
  const remove = Array.from(document.querySelectorAll<HTMLButtonElement>(".dropdown-menu button")).find(button => button.textContent?.includes("Delete group"))!;
  flushSync(() => remove.click());
  expect(configs()).toHaveLength(1);
  expect(configs()[0].title).toBe("Work");
});

test("editing the last URL preserves previous URLs and adds a new empty row", () => {
  flushSync(() => host.querySelector<HTMLButtonElement>('[aria-label="Work settings"]')!.click());
  const lastUrl = document.querySelector<HTMLTextAreaElement>('[aria-label="URL 3"]')!;
  lastUrl.value = "https://new.test";
  flushSync(() => Simulate.change(lastUrl));
  expect(configs()[0].urls).toEqual([" https://example.com ", "", "https://new.test", ""]);
  expect(document.querySelector<HTMLTextAreaElement>('[aria-label="URL 4"]')?.value).toBe("");
  const title = document.querySelector<HTMLTextAreaElement>('[aria-label="Title"]')!;
  title.value = "New title";
  flushSync(() => Simulate.change(title));
  expect(configs()[0].title).toBe("New title");
  expect(configs()[0].color).toBe("blue");
});

test("reports a tab group API failure without deleting the saved group", async () => {
  vi.mocked(createTabGroup).mockRejectedValueOnce(new Error("Tab limit"));
  const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    const open = Array.from(host.querySelectorAll("button")).find(button => button.textContent === "Work")!;
    await flushSync(() => open.click());
    expect(uiStore.getState().notification).toMatchObject({ isError: true, message: "Could not open the tab group: Tab limit" });
    expect(configs()[0].title).toBe("Work");
  } finally { consoleError.mockRestore(); }
});
