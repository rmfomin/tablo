import { createUiStore } from "@/newtab/01-app/model/ui/uiStore";
import {
  persistedPreferencesSelector,
  searchControllerSelector,
  searchStateSelector,
} from "@/newtab/01-app/model/ui/selectors";

test("ui store меняет transient state и сохраняемые preferences через именованные actions", () => {
  const store = createUiStore();

  store.getState().setSearch("grafana");
  store.getState().setColorTheme("dark");
  store.getState().setItemInEdit(101);

  expect(store.getState()).toMatchObject({
    search: "grafana",
    colorTheme: "dark",
    itemInEdit: 101,
  });
});

test("ui store показывает и скрывает notification без side effect", () => {
  const store = createUiStore();

  store.getState().showNotification({
    message: "Закладка сохранена",
    isLoading: true,
  });
  expect(store.getState().notification).toEqual({
    visible: true,
    message: "Закладка сохранена",
    isLoading: true,
    button: undefined,
    isError: undefined,
  });

  store.getState().hideNotification();

  expect(store.getState().notification.visible).toBe(false);
});

test("hydratePreferences не перезаписывает transient UI state", () => {
  const store = createUiStore();
  store.getState().setSearch("grafana");

  store.getState().hydratePreferences({
    sidebarCollapsed: true,
    openBookmarksInNewTab: true,
    colorTheme: "light",
    showRecent: true,
    showNotUsed: true,
  });

  expect(store.getState()).toMatchObject({
    search: "grafana",
    sidebarCollapsed: true,
    openBookmarksInNewTab: true,
    colorTheme: "light",
    showRecent: true,
    showNotUsed: true,
  });
});

test("ui selectors возвращают только нужный срез state", () => {
  const store = createUiStore();
  store.getState().setSearch("grafana");

  expect(searchStateSelector(store.getState())).toEqual({
    search: "grafana",
    searchFilters: [],
    searchFilterMode: "or",
  });
  expect(persistedPreferencesSelector(store.getState())).not.toHaveProperty("showArchived");
});

test("search controller selector объединяет search state и commands", () => {
  const store = createUiStore();
  const searchController = searchControllerSelector(store.getState());

  expect(searchController).toEqual(expect.objectContaining({
    search: "",
    searchFilters: [],
    searchFilterMode: "or",
    setSearch: expect.any(Function),
    setSearchFilters: expect.any(Function),
    setSearchFilterMode: expect.any(Function),
  }));

  searchController.setSearch("grafana");

  expect(store.getState().search).toBe("grafana");
});
