// @vitest-environment happy-dom
import React from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import { Folder } from "@/newtab/03-widgets/dashboard/Folder/Folder";
import { dashboardStore, useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import type { BookmarkItemV3, FolderV3, GroupV3 } from "@/newtab/05-entities/dashboard/model/types";

vi.mock("@/newtab/03-widgets/dashboard/Folder/icons/menu.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/03-widgets/dashboard/Folder/icons/folder-chevron.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/03-widgets/dashboard/Folder/icons/folder.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/03-widgets/dashboard/FolderGroup/icons/group-chevron.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon", () => ({ DropdownMenuIcon: () => React.createElement("svg") }));

let root: Root;
let host: HTMLDivElement;
const bookmarks: BookmarkItemV3[] = Array.from({ length: 12 }, (_, index) => ({ id: index + 1, position: `a${String(index).padStart(2, "0")}`, title: `Item ${index + 1}`, type: "bookmark", objectType: "bookmark", url: `https://example.com/${index}`, favIconUrl: "" }));
const group: GroupV3 = { id: 100, title: "Work", position: "a0", type: "group", objectType: "group", groupItems: bookmarks };

function Fixture({ availableColumns }: { availableColumns: number }) {
  const spaces = useDashboardStore((state) => state.spaces);
  return React.createElement(Folder, {
    spaces, folder: spaces[0].folders[0], availableColumns,
    tabs: [], recentItems: [], showNotUsed: false,
    search: "", searchFilters: [], searchFilterMode: "or", itemInEdit: undefined,
  });
}

beforeEach(() => {
  const folder: FolderV3 = { id: 10, position: "a0", title: "Folder", objectType: "folder", columnSpan: 3, items: [group] };
  dashboardStore.getState().hydrate({ currentSpaceId: 1, spaces: [{ id: 1, title: "Space", objectType: "space", position: "a0", folders: [folder] }] });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  flushSync(() => root.unmount());
  host.remove();
  dashboardStore.getState().hydrate({ currentSpaceId: -1, spaces: [] });
  vi.unstubAllGlobals();
});
const render = (availableColumns = 3) => flushSync(() => root.render(React.createElement(Fixture, { availableColumns })));
const folderState = () => dashboardStore.getState().spaces[0].folders[0];

test("renders one bookmark once while a single group continues across three columns", () => {
  render();
  expect(host.querySelector('[data-role="folder"]')?.getAttribute("data-column-span")).toBe("3");
  expect(host.querySelectorAll('[data-role="folder-items"]')).toHaveLength(3);
  expect(host.querySelectorAll('[data-role="group-header"]')).toHaveLength(3);
  expect(host.textContent).toContain("continued");
  expect(Array.from(host.querySelectorAll('[data-role="folder-item"]')).map((element) => Number(element.getAttribute("data-id")))).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test("collapse uses one column and expand restores the preferred width without altering JSON data", () => {
  render();
  flushSync(() => host.querySelector<HTMLButtonElement>('button[aria-label="Collapse folder"]')!.click());
  expect(host.querySelector('[data-role="folder"]')?.getAttribute("data-column-span")).toBe("1");
  expect(folderState().columnSpan).toBe(3);
  flushSync(() => host.querySelector<HTMLButtonElement>('button[aria-label="Expand folder"]')!.click());
  expect(host.querySelector('[data-role="folder"]')?.getAttribute("data-column-span")).toBe("3");
  render(2);
  expect(host.querySelector('[data-role="folder"]')?.getAttribute("data-column-span")).toBe("2");
  expect(folderState().columnSpan).toBe(3);
  render(4);
  expect(host.querySelector('[data-role="folder"]')?.getAttribute("data-column-span")).toBe("3");
});

test("collapsing a continuation controls the whole group", () => {
  render();
  const toggles = host.querySelectorAll<HTMLButtonElement>('button[title="Collapse group"]');
  expect(toggles.length).toBeGreaterThan(1);
  flushSync(() => toggles[1].click());
  expect((folderState().items[0] as GroupV3).collapsed).toBe(true);
  expect(host.querySelectorAll('[data-role="group-header"]')).toHaveLength(1);
  expect(host.querySelectorAll('[data-role="folder-item"]')).toHaveLength(0);
});

test("keyboard resizing changes the saved width once and undo restores it", () => {
  render();
  const handle = host.querySelector<HTMLElement>('[aria-label="Resize folder"]');
  expect(handle).not.toBeNull();
  flushSync(() => handle!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true })));
  expect(folderState().columnSpan).toBe(2);
  expect(dashboardStore.getState().undoSteps).toHaveLength(1);
  flushSync(() => dashboardStore.getState().undo());
  expect(folderState().columnSpan).toBe(3);
});

test("folder deletion asks for confirmation even when it contains no hidden items", () => {
  const confirm = vi.fn(() => false);
  const originalDeleteFolder = dashboardStore.getState().deleteFolder;
  const deleteFolder = vi.fn();
  dashboardStore.setState({ deleteFolder });
  vi.stubGlobal("confirm", confirm);
  render();

  try {
    flushSync(() => host.querySelector<HTMLButtonElement>('button[aria-label="Folder actions"]')!.click());
    const deleteButton = Array.from(document.querySelectorAll<HTMLButtonElement>(".dropdown-menu button"))
      .find((button) => button.textContent?.includes("Delete"));
    expect(deleteButton).toBeDefined();
    flushSync(() => deleteButton!.click());

    expect(confirm).toHaveBeenCalledWith("Delete folder 'Folder'?");
    expect(deleteFolder).not.toHaveBeenCalled();
  } finally {
    dashboardStore.setState({ deleteFolder: originalDeleteFolder });
  }
});

test("open all from a continuation opens the whole logical group", () => {
  const createTab = vi.fn();
  vi.stubGlobal("chrome", { tabs: { create: createTab } });
  const children = bookmarks;
  const state = dashboardStore.getState();
  state.hydrate({
    currentSpaceId: state.currentSpaceId,
    spaces: state.spaces.map((space) => ({
      ...space,
      folders: [{ ...folderState(), items: [{ ...group, groupItems: children }] }],
    })),
  });
  render();
  const headers = host.querySelectorAll<HTMLElement>('[data-role="group-header"]');
  expect(headers.length).toBeGreaterThan(1);
  flushSync(() => headers[1].dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 100, clientY: 100 })));
  const openAll = Array.from(document.querySelectorAll<HTMLButtonElement>(".dropdown-menu button")).find((button) => button.textContent?.includes("Open all tabs"));
  expect(openAll).toBeDefined();
  flushSync(() => openAll!.click());
  expect(createTab.mock.calls.map(([properties]) => properties)).toEqual([
    { url: "https://example.com/0", active: false },
    { url: "https://example.com/1", active: false },
    { url: "https://example.com/2", active: false },
    { url: "https://example.com/3", active: false },
    { url: "https://example.com/4", active: false },
    { url: "https://example.com/5", active: false },
    { url: "https://example.com/6", active: false },
    { url: "https://example.com/7", active: false },
    { url: "https://example.com/8", active: false },
    { url: "https://example.com/9", active: false },
    { url: "https://example.com/10", active: false },
    { url: "https://example.com/11", active: false },
  ]);
});
