import type { ChromeRuntimeController } from "@/newtab/01-app/model/chrome-runtime/controller";

/**
 * Команда — тонкая точка входа для UI. В отличие от legacy reducer она не
 * смешивает Chrome effect с изменением state: controller вызывает API, затем
 * синхронно обновляет runtime store.
 */
export function closeChromeTabs(
  controller: ChromeRuntimeController,
  tabIds: number[],
): void {
  controller.closeTabs(tabIds);
}
