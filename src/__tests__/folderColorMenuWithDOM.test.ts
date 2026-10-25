// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { Folder } from "@/newtab/03-widgets/dashboard/Folder/Folder";
import { dashboardStore, useDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { colors } from "@/newtab/06-shared/lib/color/palette";

vi.mock("@/newtab/03-widgets/dashboard/Folder/icons/menu.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/03-widgets/dashboard/Folder/icons/folder-chevron.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/03-widgets/dashboard/Folder/icons/folder.svg", () => ({ default: () => React.createElement("svg") }));
vi.mock("@/newtab/06-shared/ui/DropdownMenu/DropdownMenuIcon", () => ({ DropdownMenuIcon: () => React.createElement("svg") }));

function Fixture() {
  const spaces = useDashboardStore(state => state.spaces);
  return React.createElement(Folder, { spaces, folder: spaces[0].folders[0], tabs: [], recentItems: [], showNotUsed: false, search: "", searchFilters: [], searchFilterMode: "or", itemInEdit: undefined });
}

test("folder color menu commits a preset and undo restores the previous color", () => {
  const originalBlend = window.pSBC;
  window.pSBC = () => "#333333";
  dashboardStore.getState().hydrate({ currentSpaceId: 1, spaces: [{ id: 1, objectType: "space", title: "Main", position: "a0", folders: [{ id: 10, objectType: "folder", title: "Folder", position: "a0", color: "#112233", items: [] }] }] });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(React.createElement(Fixture)));
    flushSync(() => host.querySelector("h2 > span")!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 10, clientY: 10 })));
    const presets = document.querySelectorAll<HTMLButtonElement>(".dropdown-menu__preset_color");
    expect(presets).toHaveLength(7);
    flushSync(() => presets[1].click());
    expect(dashboardStore.getState().spaces[0].folders[0].color).toBe(colors[1]);
    flushSync(() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
    expect(document.querySelector(".dropdown-menu__colors-row")).toBeNull();
    flushSync(() => dashboardStore.getState().undo());
    expect(dashboardStore.getState().spaces[0].folders[0].color).toBe("#112233");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
    dashboardStore.getState().hydrate({ currentSpaceId: -1, spaces: [] });
    window.pSBC = originalBlend;
  }
});
