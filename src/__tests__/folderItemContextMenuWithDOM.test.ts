// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { FolderItem } from "@/newtab/03-widgets/dashboard/FolderItem/FolderItem";
import type { BookmarkItemV3 } from "@/newtab/05-entities/dashboard/model/types";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";

vi.mock("@/newtab/03-widgets/dashboard/FolderItemMenu/FolderItemMenu", () => ({
  FolderItemMenu: ({ position }: { position?: { x: number; y: number } }) =>
    `Bookmark menu at ${position?.x},${position?.y}`,
}));

test("repeated right click on a bookmark toggles its context menu", () => {
  uiStore.getState().clearSelectedItemIds();
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const item: BookmarkItemV3 = {
    id: 1,
    position: "a0",
    type: "bookmark",
    objectType: "bookmark",
    title: "Example",
    url: "https://example.com",
    favIconUrl: "",
  };

  flushSync(() => {
    root.render(
      React.createElement(FolderItem, {
        spaces: [],
        item,
        inEdit: false,
        tabs: [],
        recentItems: [],
        showNotUsed: false,
        search: "",
        hiddenFeatureIsEnabled: false,
      }),
    );
  });

  const bookmark = host.querySelector<HTMLAnchorElement>(
    'a[data-role="folder-item"]',
  );
  expect(bookmark).not.toBeNull();

  const rightClick = () => {
    const event = new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      button: 2,
      clientX: 120,
      clientY: 75,
    });
    flushSync(() => bookmark!.dispatchEvent(event));
    expect(event.defaultPrevented).toBe(true);
  };

  rightClick();
  expect(host.textContent).toContain("Bookmark menu at 120,75");
  expect(uiStore.getState().selectedItemIds).toEqual([1]);
  expect(bookmark?.dataset.selected).toBe("true");

  rightClick();
  expect(host.textContent).not.toContain("Bookmark menu");
  expect(uiStore.getState().selectedItemIds).toEqual([1]);
  expect(bookmark?.dataset.selected).toBe("true");

  rightClick();
  expect(host.textContent).toContain("Bookmark menu");

  flushSync(() => root.unmount());
  host.remove();
  uiStore.getState().clearSelectedItemIds();
});

test("right click on a selected bookmark preserves the complete selection", () => {
  uiStore.getState().setSelectedItemIds([1, 2]);
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  const item: BookmarkItemV3 = {
    id: 1,
    position: "a0",
    type: "bookmark",
    objectType: "bookmark",
    title: "Example",
    url: "https://example.com",
    favIconUrl: "",
  };

  flushSync(() => {
    root.render(
      React.createElement(FolderItem, {
        spaces: [],
        item,
        inEdit: false,
        tabs: [],
        recentItems: [],
        showNotUsed: false,
        search: "",
        hiddenFeatureIsEnabled: false,
      }),
    );
  });

  const bookmark = host.querySelector<HTMLAnchorElement>(
    'a[data-role="folder-item"]',
  );
  const event = new MouseEvent("contextmenu", {
    bubbles: true,
    cancelable: true,
    button: 2,
  });
  flushSync(() => bookmark!.dispatchEvent(event));

  expect(uiStore.getState().selectedItemIds).toEqual([1, 2]);

  flushSync(() => root.unmount());
  host.remove();
  uiStore.getState().clearSelectedItemIds();
});
