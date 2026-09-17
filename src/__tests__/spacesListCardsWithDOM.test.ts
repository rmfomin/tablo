// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SpacesList } from "@/newtab/03-widgets/spaces-list/SpacesList/SpacesList";
import { dashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";

test("space cards select an existing space and the new card creates one in edit mode", () => {
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

    const cards = host.querySelectorAll<HTMLElement>('[data-role="space-item"]');
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute("aria-pressed")).toBe("true");

    flushSync(() => cards[1].click());
    expect(dashboardStore.getState().currentSpaceId).toBe(2);
    expect(cards[1].getAttribute("aria-pressed")).toBe("true");

    const newCard = host.querySelector<HTMLButtonElement>(
      'button[aria-label="Create new space"]',
    );
    expect(newCard).not.toBeNull();

    flushSync(() => newCard!.click());
    const createdSpace = dashboardStore.getState().spaces.at(-1);
    expect(createdSpace?.title).toBe("New space");
    expect(dashboardStore.getState().currentSpaceId).toBe(createdSpace?.id);
    expect(uiStore.getState().itemInEdit).toBe(createdSpace?.id);
  } finally {
    flushSync(() => root.unmount());
    host.remove();
    dashboardStore.getState().hydrate({ spaces: [], currentSpaceId: -1 });
    uiStore.getState().setItemInEdit(undefined);
  }
});
