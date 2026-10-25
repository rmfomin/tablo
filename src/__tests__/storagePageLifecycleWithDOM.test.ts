// @vitest-environment happy-dom
import { bindStoragePageLifecycle } from "@/newtab/01-app/model/storage-sync/pageLifecycle";

function pageTransition(type: "pagehide" | "pageshow", persisted: boolean) {
  // happy-dom пока не переносит persisted из PageTransitionEventInit
  return Object.assign(new Event(type), { persisted });
}

test("a page restored from back-forward cache keeps persistence active on repeated visits", () => {
  const controller = { flush: vi.fn(async () => true), stop: vi.fn() };
  const unbind = bindStoragePageLifecycle(controller);
  try {
    window.dispatchEvent(pageTransition("pagehide", true));
    window.dispatchEvent(pageTransition("pageshow", true));
    window.dispatchEvent(pageTransition("pagehide", true));
    expect(controller.flush).toHaveBeenCalledTimes(2);
    expect(controller.stop).not.toHaveBeenCalled();
  } finally { unbind(); }
});

test("leaving a page permanently flushes and stops subscriptions", () => {
  const controller = { flush: vi.fn(async () => true), stop: vi.fn() };
  const unbind = bindStoragePageLifecycle(controller);
  window.dispatchEvent(pageTransition("pagehide", false));
  expect(controller.flush).toHaveBeenCalledOnce();
  expect(controller.stop).toHaveBeenCalledOnce();
  unbind();
  window.dispatchEvent(pageTransition("pagehide", false));
  expect(controller.flush).toHaveBeenCalledOnce();
});
