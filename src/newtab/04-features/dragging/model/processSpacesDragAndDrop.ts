import {
  createDropPreview,
  setDragSourceHidden,
  type PConfigItemDependencies,
  type PConfigSpaces,
} from "@/newtab/04-features/dragging/model/dragAndDrop";
import { notifyDragState, subscribeMouseEvents } from "@/newtab/04-features/dragging/model/dragAndDropUtils";
import { insertBetween } from "@/newtab/05-entities/dashboard/model/fractionalIndexes";
import { DOM_ROLE, roleSelector } from "@/newtab/06-shared/lib/dom/roles";

type SpaceSlot = { x: number; y: number };

export function processSpacesDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigSpaces,
  dependencies: PConfigItemDependencies,
) {
  const target = (mouseDownEvent.target as HTMLElement).closest<HTMLElement>(
    roleSelector(DOM_ROLE.spaceItem),
  );
  const list = target?.closest<HTMLElement>(roleSelector(DOM_ROLE.spacesList));
  if (!target || !list || mouseDownEvent.button !== 0 || !config.canSortSpaces()) return;

  let dragging = false;
  let finished = false;
  let dummy: HTMLElement | undefined;
  let preview: HTMLElement | undefined;
  let slots: SpaceSlot[] = [];
  let insertionIndex: number | undefined;
  let restoreSource = () => {};
  let originalMinHeight = list.style.minHeight;
  let clickTimer: number | undefined;
  const getItems = () => Array.from(list.querySelectorAll<HTMLElement>(roleSelector(DOM_ROLE.spaceItem)))
    .filter((item) => item.dataset.dadPreview !== "true");

  function updatePreview(event: MouseEvent) {
    if (!dummy || !preview) return;
    dummy.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
    const bounds = list!.getBoundingClientRect();
    const inside = event.clientX >= bounds.left && event.clientX <= bounds.right &&
      event.clientY >= bounds.top && event.clientY <= bounds.bottom;
    if (!inside) {
      preview.remove();
      insertionIndex = undefined;
      return;
    }

    const x = event.clientX - bounds.left + list!.scrollLeft;
    const y = event.clientY - bounds.top + list!.scrollTop;
    let nearestIndex = 0;
    let nearestDistance = Infinity;
    slots.forEach((slot, index) => {
      const distance = (slot.x - x) ** 2 + (slot.y - y) ** 2;
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });
    if (nearestIndex === insertionIndex && preview.parentElement === list) return;
    insertionIndex = nearestIndex;
    const remaining = getItems().filter((item) => item !== target);
    list!.insertBefore(preview, remaining[insertionIndex] ?? null);
  }

  function removeClickSuppression() {
    document.removeEventListener("click", suppressClick, true);
    document.removeEventListener("mouseup", releaseClickSuppression, true);
    document.removeEventListener("mousedown", removeClickSuppression, true);
    window.clearTimeout(clickTimer);
    clickTimer = undefined;
  }

  function releaseClickSuppression() {
    clickTimer = window.setTimeout(removeClickSuppression, 0);
  }

  function suppressClick(event: MouseEvent) {
    event.preventDefault();
    event.stopImmediatePropagation();
    removeClickSuppression();
  }

  function cleanup() {
    if (!dragging) return;
    dummy?.remove();
    preview?.remove();
    restoreSource();
    list!.style.minHeight = originalMinHeight;
    document.body.classList.remove("space-sorting", "dragging");
    if (dragging) notifyDragState(false);
    dragging = false;
  }

  function cancel() {
    finished = true;
    const wasDragging = dragging;
    cleanup();
    if (wasDragging) {
      document.addEventListener("mouseup", releaseClickSuppression, { capture: true, once: true });
      document.addEventListener("mousedown", removeClickSuppression, { capture: true, once: true });
    } else {
      removeClickSuppression();
    }
  }

  const onMouseMove = (event: MouseEvent, mouseMoved: boolean) => {
    if (finished || !mouseMoved) return;
    if (!dragging) {
      const bounds = list.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      // Фиксируем места до изменения DOM, чтобы превью не меняло собственную цель
      slots = getItems().map((item) => {
        const itemRect = item.getBoundingClientRect();
        return {
          x: itemRect.left + itemRect.width / 2 - bounds.left + list.scrollLeft,
          y: itemRect.top + itemRect.height / 2 - bounds.top + list.scrollTop,
        };
      });
      dummy = target.cloneNode(true) as HTMLElement;
      dummy.classList.add("dad-dummy", "dad-dummy--space");
      dummy.setAttribute("aria-hidden", "true");
      dummy.style.width = `${rect.width}px`;
      dummy.style.height = `${rect.height}px`;
      dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`;
      dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`;
      preview = createDropPreview([target])[0];
      preview.setAttribute("aria-hidden", "true");
      originalMinHeight = list.style.minHeight;
      list.style.minHeight = `${bounds.height}px`;
      restoreSource = setDragSourceHidden([target]);
      dragging = true;
      dependencies.clearSelectedItemIds();
      document.body.append(dummy);
      document.body.classList.add("space-sorting", "dragging");
      document.addEventListener("click", suppressClick, true);
      notifyDragState(true);
    }
    updatePreview(event);
  };

  const onMouseUp = (event: MouseEvent) => {
    if (finished) return;
    finished = true;
    if (!dragging) return;
    updatePreview(event);
    const items = getItems();
    const remaining = items.filter((item) => item !== target);
    const shouldMove = insertionIndex !== undefined && insertionIndex !== items.indexOf(target) &&
      target.isConnected && config.canSortSpaces();
    const position = shouldMove ? insertBetween(
      remaining[insertionIndex! - 1]?.dataset.position ?? "",
      remaining[insertionIndex!]?.dataset.position ?? "",
    ) : undefined;
    cleanup();
    clickTimer = window.setTimeout(removeClickSuppression, 0);
    if (position !== undefined) config.onChangeSpacePosition(Number(target.dataset.spaceId), position);
  };

  const unsubscribe = subscribeMouseEvents(mouseDownEvent, onMouseMove, onMouseUp, undefined, cancel);
  return () => {
    unsubscribe();
    cleanup();
    removeClickSuppression();
  };
}
