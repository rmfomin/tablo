import { DOM_ROLE, roleSelector } from "@/newtab/06-shared/lib/dom/roles";

const DAD_THRESHOLD = 4;

export function subscribeMouseEvents(
  mouseDownEvent: React.MouseEvent,
  onMouseMove: (
    e: MouseEvent,
    mouseMoved: boolean,
    mouseMovedFirstTime: boolean,
  ) => void,
  onMouseUp: (e: MouseEvent, mouseMoved: boolean) => void,
  onViewportScrolled?: () => void, // invoked before onMouseMove
  onCancel?: () => void,
): () => void {
  let mouseMoved = false;
  let mouseMovedFirstTimeReported = false;
  let subscribed = true;

  function onMouseMoveWrapper(e: MouseEvent) {
    if (!mouseMoved) {
      mouseMoved =
        Math.abs(mouseDownEvent.clientX - e.clientX) > DAD_THRESHOLD ||
        Math.abs(mouseDownEvent.clientY - e.clientY) > DAD_THRESHOLD;
    }
    const mouseMovedFirstTime = mouseMoved && !mouseMovedFirstTimeReported;
    if (mouseMovedFirstTime) {
      mouseMovedFirstTimeReported = true;
    }
    if (onViewportScrolled && viewportWasScrolled) {
      onViewportScrolled();
    }
    viewportWasScrolled = false;
    setScrollByDummyClientY(undefined);
    onMouseMove(e, mouseMoved, mouseMovedFirstTime);
  }

  function onMouseUpWrapper(e: MouseEvent) {
    setScrollByDummyClientY(undefined);
    unsubscribeEvents();
    onMouseUp(e, mouseMoved);
  }

  function unsubscribeEvents() {
    subscribed = false;
    document.removeEventListener("mousemove", onMouseMoveWrapper);
    document.removeEventListener("mouseup", onMouseUpWrapper);
    document.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("blur", cancel);
    setScrollByDummyClientY(undefined);
  }

  function cancel() {
    if (!subscribed) return;
    unsubscribeEvents();
    onCancel?.();
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && onCancel) {
      event.preventDefault();
      cancel();
    }
  }

  document.addEventListener("mousemove", onMouseMoveWrapper);
  document.addEventListener("mouseup", onMouseUpWrapper);
  if (onCancel) {
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("blur", cancel);
  }

  return onCancel ? cancel : unsubscribeEvents;
}

export function notifyDragState(dragging: boolean) {
  document.dispatchEvent(new CustomEvent("tablo-drag-state", { detail: dragging }));
}

////////////////////////////////////////////////////////
// VIEWPORT SCROLLING
////////////////////////////////////////////////////////

let viewportWasScrolled = false; //performance optimization
let scrollByDummyClientY: number | undefined = undefined;

const MAX_SCROLL_SPEED = 18;
const SCROLL_THRESHOLD = 60;

function getBookmarksElement(): HTMLElement | null {
  return document.querySelector(
    roleSelector(DOM_ROLE.bookmarks),
  ) as HTMLElement;
}

function tryToScrollViewport() {
  viewportWasScrolled = false;
  if (typeof scrollByDummyClientY === "number") {
    // Check if the element is too close to the bottom edge of the viewport
    const bottomThreshold = window.innerHeight - SCROLL_THRESHOLD;
    if (scrollByDummyClientY > bottomThreshold) {
      // scroll down
      const speed = Math.min(
        ((scrollByDummyClientY - bottomThreshold) / SCROLL_THRESHOLD) *
          MAX_SCROLL_SPEED,
        MAX_SCROLL_SPEED,
      );
      getBookmarksElement()?.scrollBy(0, speed);
      viewportWasScrolled = true;
    } else if (scrollByDummyClientY < SCROLL_THRESHOLD) {
      // scroll up
      const speed = Math.min(
        ((SCROLL_THRESHOLD - scrollByDummyClientY) / SCROLL_THRESHOLD) *
          MAX_SCROLL_SPEED,
        MAX_SCROLL_SPEED,
      );
      getBookmarksElement()?.scrollBy(0, -speed);
      viewportWasScrolled = true;
    }
  }

  requestAnimationFrame(tryToScrollViewport);
}

export function setScrollByDummyClientY(val: number | undefined) {
  scrollByDummyClientY = val;
}

requestAnimationFrame(tryToScrollViewport);
