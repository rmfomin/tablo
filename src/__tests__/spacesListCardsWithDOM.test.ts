// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { SpacesList } from "@/newtab/03-widgets/spaces-list/SpacesList/SpacesList";
import { dashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";

test("space cards select an existing space and double-click enters edit mode", () => {
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

    expect(host.querySelector("input")).toBeNull();
    flushSync(() => cards[1].dispatchEvent(new MouseEvent("dblclick", { bubbles: true })));
    expect(uiStore.getState().itemInEdit).toBe(2);
    expect(host.querySelector<HTMLInputElement>("input")?.value).toBe("Personal");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
    dashboardStore.getState().hydrate({ spaces: [], currentSpaceId: -1 });
    uiStore.getState().setItemInEdit(undefined);
  }
});

test("dragging a space shows an insertion preview and saves the new card order without selecting it", () => {
  dashboardStore.getState().hydrate({
    currentSpaceId: 1,
    spaces: [1, 2, 3].map((id) => ({
      id, objectType: "space", title: `Space ${id}`, position: `a${id}`, folders: [],
    })),
  });
  uiStore.getState().setItemInEdit(undefined);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    flushSync(() => root.render(React.createElement(SpacesList)));
    const list = host.querySelector<HTMLElement>('[data-role="spaces-list"]')!;
    const cards = Array.from(host.querySelectorAll<HTMLElement>('[data-role="space-item"]'));
    const rect = (left: number, width: number) =>
      ({ left, right: left + width, top: 0, bottom: 50, width, height: 50 } as DOMRect);
    vi.spyOn(list, "getBoundingClientRect").mockReturnValue(rect(0, 250));
    cards.forEach((card, index) => vi.spyOn(card, "getBoundingClientRect").mockReturnValue(rect(index * 85, 80)));
    flushSync(() => cards[0].querySelector("span")!.dispatchEvent(new MouseEvent("mousedown", {
      bubbles: true, clientX: 20, clientY: 20,
    })));
    flushSync(() => document.dispatchEvent(new MouseEvent("mousemove", { clientX: 190, clientY: 20 })));
    expect(cards[0].style.display).toBe("none");
    expect(list.querySelector('[data-dad-preview="true"]')?.getAttribute("data-space-id")).toBe("1");
    expect(document.querySelector(".dad-dummy--space")).not.toBeNull();
    expect(dashboardStore.getState().spaces.map((space) => space.id)).toEqual([1, 2, 3]);
    flushSync(() => document.dispatchEvent(new MouseEvent("mouseup", { clientX: 190, clientY: 20 })));
    flushSync(() => cards[2].click());
    expect(dashboardStore.getState().currentSpaceId).toBe(1);
    expect(Array.from(list.children).map((card) => (card as HTMLElement).dataset.spaceId)).toEqual(["2", "3", "1"]);
    expect(host.querySelector('[data-dad-preview="true"]')).toBeNull();
    expect(document.querySelector(".dad-dummy--space")).toBeNull();
  } finally {
    flushSync(() => root.unmount());
    host.remove();
    dashboardStore.getState().hydrate({ spaces: [], currentSpaceId: -1 });
    uiStore.getState().setItemInEdit(undefined);
    vi.restoreAllMocks();
  }
});
