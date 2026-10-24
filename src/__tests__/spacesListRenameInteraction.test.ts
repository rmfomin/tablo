// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SpacesList } from "@/newtab/03-widgets/spaces-list/SpacesList/SpacesList";
import { dashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";

test("single click selects a space and double-click starts renaming it", () => {
  dashboardStore.getState().hydrate({
    currentSpaceId: 1,
    spaces: [
      { id: 1, objectType: "space", title: "Work", position: "a0", folders: [] },
      { id: 2, objectType: "space", title: "Personal", position: "a1", folders: [] },
    ],
  });
  uiStore.getState().setItemInEdit(undefined);

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(React.createElement(SpacesList)));
    const personalSpace = host.querySelector<HTMLElement>('[data-space-id="2"]');
    expect(personalSpace).not.toBeNull();

    flushSync(() => personalSpace!.click());
    expect(dashboardStore.getState().currentSpaceId).toBe(2);
    expect(uiStore.getState().itemInEdit).toBeUndefined();

    flushSync(() => personalSpace!.dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(uiStore.getState().itemInEdit).toBe(2);
    expect(host.querySelector<HTMLInputElement>("input")?.value).toBe("Personal");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
    dashboardStore.getState().hydrate({ spaces: [], currentSpaceId: -1 });
    uiStore.getState().setItemInEdit(undefined);
  }
});
