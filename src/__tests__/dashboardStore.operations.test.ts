import { createDashboardStore } from "@/newtab/01-app/model/dashboard/dashboardStore";
import type { DashboardState } from "@/newtab/01-app/model/dashboard/types";

const stateWithGroup: DashboardState = {
  currentSpaceId: 1,
  spaces: [
    {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Работа",
      folders: [
        {
          id: 10,
          position: "a0",
          objectType: "folder",
          title: "Инфраструктура",
          items: [
            {
              id: 200,
              position: "a0",
              objectType: "group",
              type: "group",
              title: "Мониторинг",
              groupItems: [
                {
                  id: 201,
                  position: "a0",
                  objectType: "bookmark",
                  type: "bookmark",
                  title: "Grafana",
                  url: "https://grafana.example",
                  favIconUrl: "",
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

test("dashboard store восстанавливает удалённую группу через undo", () => {
  const store = createDashboardStore(stateWithGroup);

  store.getState().deleteFolderGroup(200);
  expect(store.getState().spaces[0].folders[0].items).not.toContainEqual(
    expect.objectContaining({ id: 200 }),
  );

  store.getState().undo();

  expect(store.getState().spaces[0].folders[0].items).toEqual(
    stateWithGroup.spaces[0].folders[0].items,
  );
});

test("dashboard store moves items and restores the preceding dashboard snapshot with undo", () => {
  const store = createDashboardStore({
    currentSpaceId: 1,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Работа",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Первый",
            items: [
              {
                id: 100,
                position: "a0",
                objectType: "bookmark",
                type: "bookmark",
                title: "Grafana",
                url: "https://grafana.example",
                favIconUrl: "",
              },
            ],
          },
          { id: 20, position: "b0", objectType: "folder", title: "Второй", items: [] },
        ],
      },
    ],
  });

  store.getState().moveFolderItems({ itemIds: [100], targetFolderId: 20 });

  expect(store.getState().spaces[0].folders[1].items).toEqual([
    expect.objectContaining({ id: 100 }),
  ]);

  store.getState().undo();

  expect(store.getState().spaces[0].folders[0].items).toEqual([
    expect.objectContaining({ id: 100 }),
  ]);
  expect(store.getState().spaces[0].folders[1].items).toEqual([]);
});

test("dashboard store exposes update and delete actions for space, folder and item", () => {
  const store = createDashboardStore({ spaces: [], currentSpaceId: -1 });

  store.getState().createSpace({ id: 1, title: "Работа" });
  store.getState().updateSpace(1, { title: "Проекты" });
  store.getState().createFolder({ id: 10, title: "Инструменты" });
  store.getState().createFolderItem({
    folderId: 10,
    item: { id: 100, title: "Grafana", url: "https://grafana.example", favIconUrl: "" },
  });
  store.getState().updateFolderItem(100, { title: "Grafana Cloud" });
  store.getState().deleteFolder(10);
  store.getState().deleteSpace(1);

  expect(store.getState().spaces).toEqual([]);
});
