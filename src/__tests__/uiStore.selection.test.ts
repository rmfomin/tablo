import { createUiStore } from "@/newtab/state/ui/uiStore";
import { getSelectedItemsIds, unselectAllItems } from "@/newtab/helpers/selectionUtils";
import { uiStore } from "@/newtab/state/ui/uiStore";

test("keeps area selection transient and clears it on demand", () => {
  const store = createUiStore();

  store.getState().setSelectedItemIds([1, 10, 10]);
  expect(store.getState().selectedItemIds).toEqual([1, 10]);

  store.getState().clearSelectedItemIds();
  expect(store.getState().selectedItemIds).toEqual([]);
});

test("legacy selection consumers read transient ids from the UI store", () => {
  uiStore.getState().setSelectedItemIds([1, 10]);

  expect(getSelectedItemsIds()).toEqual([1, 10]);

  unselectAllItems();
});
