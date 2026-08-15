import { createUiStore } from "@/newtab/01-app/model/ui/uiStore";
import { getSelectedItemsIds, unselectAllItems } from "@/newtab/01-app/model/selection";
import { uiStore } from "@/newtab/01-app/model/ui/uiStore";

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
