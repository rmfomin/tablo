import type React from "react";

export function hlSearch(str: string, search: string): { __html: string } {
  if (search) {
    const searchRE = new RegExp(escapeRegex(search), "i");
    return {
      __html: sanitizeHTML(
        str.replace(searchRE, (match) => `<span class="searched">${match}</span>`),
      ),
    };
  }

  return { __html: sanitizeHTML(str) };
}

export function sanitizeHTML(html: string): string {
  return html
    .replace(/<script.*?>.*?<\/script>/gi, "")
    .replace(/on\w+=".*?"/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/\n/g, "<br>");
}

function escapeRegex(s: string): string {
  return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, "\\$&");
}

export function blurSearch(_e: React.MouseEvent) {
  if (
    document.activeElement &&
    document.activeElement === document.querySelector("input.search")
  ) {
    (document.activeElement as HTMLElement).blur();
  }
}

export function isTargetSupportsDragAndDrop(
  e: React.MouseEvent,
  ignoreElementWithClass?: string,
): boolean {
  const target = e.target as HTMLElement;
  if (
    ignoreElementWithClass &&
    target.classList.contains(ignoreElementWithClass)
  ) {
    return false;
  }
  return !isTargetInputOrTextArea(target);
}

export function isTargetInputOrTextArea(target: Element): boolean {
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA";
}

export function isSomeParentHaveClass(
  targetElement: Element | null,
  classOnParent: string | string[],
): boolean {
  let el = targetElement;
  const classNames = Array.isArray(classOnParent)
    ? classOnParent
    : [classOnParent];
  while (el) {
    if (classNames.some((className) => el!.classList.contains(className))) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

export function findParentWithClass(
  targetElement: Element | null,
  classOnParent: string,
): HTMLElement | undefined {
  let el = targetElement;
  while (el) {
    if (el.classList.contains(classOnParent)) {
      return el as HTMLElement;
    }
    el = el.parentElement;
  }
  return undefined;
}
