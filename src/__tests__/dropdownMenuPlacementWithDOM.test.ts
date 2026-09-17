// @vitest-environment happy-dom
import React from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { DropdownMenu, getPointerPosition } from "@/newtab/06-shared/ui/DropdownMenu/DropdownMenu";

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  };
}

test("right-aligned dropdown opens beneath its row without shifting to the right", async () => {
  const getRect = vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockImplementation(function (this: HTMLElement) {
      if (this.classList.contains("dropdown-menu__anchor")) {
        return rect(500, 120, 0, 0);
      }
      if (this.classList.contains("dropdown-menu")) {
        return rect(0, 0, 200, 150);
      }
      return rect(0, 0, 0, 0);
    });

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  try {
    flushSync(() => {
      root.render(
        React.createElement(DropdownMenu, {
          onClose: () => {},
          alignRight: true,
          offset: { top: 52 },
          children: "Menu",
        }),
      );
    });

    const menu = document.querySelector<HTMLElement>(".dropdown-menu");
    const anchor = host.querySelector<HTMLElement>(".dropdown-menu__anchor");
    await vi.waitFor(() => expect(menu?.style.top).toBe("172px"));
    expect(anchor?.style.top).toBe("0px");
    expect(menu?.style.left).toBe("300px");
  } finally {
    flushSync(() => root.unmount());
    host.remove();
    getRect.mockRestore();
  }
});

test.each(["center", "bottom-right"])(
  "pointer dropdown stays near the click at %s",
  async (placement) => {
    const getRect = vi
      .spyOn(HTMLElement.prototype, "getBoundingClientRect")
      .mockImplementation(function (this: HTMLElement) {
        if (this.classList.contains("dropdown-menu")) {
          return rect(0, 0, 200, 150);
        }
        return rect(0, 0, 0, 0);
      });
    const host = document.createElement("div");
    document.body.append(host);
    const root = createRoot(host);
    const point =
      placement === "center"
        ? { x: 250, y: 180 }
        : { x: window.innerWidth - 2, y: window.innerHeight - 2 };

    try {
      flushSync(() => {
        root.render(
          React.createElement(DropdownMenu, {
            onClose: () => {},
            absPosition: point,
            children: "Menu",
          }),
        );
      });

      const menu = document.querySelector<HTMLElement>(".dropdown-menu");
      const expectedLeft =
        placement === "center" ? 258 : window.innerWidth - 208;
      const expectedTop =
        placement === "center" ? 188 : point.y - 158;
      await vi.waitFor(() => expect(menu?.style.top).toBe(`${expectedTop}px`));
      expect(menu?.style.left).toBe(`${expectedLeft}px`);
    } finally {
      flushSync(() => root.unmount());
      host.remove();
      getRect.mockRestore();
    }
  },
);

test("keyboard menu activation uses the triggering element", () => {
  const button = document.createElement("button");
  document.body.append(button);
  vi.spyOn(button, "getBoundingClientRect").mockReturnValue(
    rect(100, 50, 30, 20),
  );
  let position: { x: number; y: number } | undefined;
  button.addEventListener("click", (event) => {
    position = getPointerPosition(event);
  });

  button.dispatchEvent(new MouseEvent("click", { bubbles: true }));

  expect(position).toEqual({ x: 115, y: 70 });
  button.remove();
});
