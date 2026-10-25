import type { StorageSyncController } from "./controller";

export function bindStoragePageLifecycle(
  controller: Pick<StorageSyncController, "flush" | "stop">,
  target: Window = window,
) {
  const onPageHide = (event: PageTransitionEvent) => {
    void controller.flush();
    if (!event.persisted) controller.stop();
  };
  target.addEventListener("pagehide", onPageHide);
  return () => target.removeEventListener("pagehide", onPageHide);
}
