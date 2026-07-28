import {
  moveFolder,
  selectSpace,
  updateFolder,
} from "@/newtab/state/dashboard/domain";
import type { DashboardState } from "@/newtab/state/dashboard/types";

function createDashboardState(): DashboardState {
  return {
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
            title: "Инструменты",
            color: "#ffcc00",
            collapsed: true,
            items: [
              {
                id: 100,
                position: "a0",
                objectType: "group",
                type: "group",
                title: "Мониторинг",
                groupItems: [
                  {
                    id: 101,
                    position: "a0",
                    objectType: "bookmark",
                    type: "bookmark",
                    title: "Grafana",
                    url: "https://grafana.example",
                    favIconUrl: "https://grafana.example/favicon.ico",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 2,
        position: "b0",
        objectType: "space",
        title: "Личное",
        folders: [],
      },
    ],
  };
}

test("selectSpace выбирает существующий space", () => {
  const result = selectSpace(createDashboardState(), 2);

  expect(result.currentSpaceId).toBe(2);
});

test("selectSpace выбирает первый space, когда id не существует", () => {
  const result = selectSpace(createDashboardState(), 999);

  expect(result.currentSpaceId).toBe(1);
});

test("updateFolder обновляет folder без мутации исходного state", () => {
  const state = createDashboardState();
  const result = updateFolder(state, 10, { title: "Рабочие инструменты" });

  expect(result.spaces[0].folders[0].title).toBe("Рабочие инструменты");
  expect(state.spaces[0].folders[0].title).toBe("Инструменты");
});

test("moveFolder переносит folder вместе с вложенной группой в target space", () => {
  const result = moveFolder(createDashboardState(), {
    folderId: 10,
    targetSpaceId: 2,
  });

  expect(result.spaces[0].folders).toEqual([]);
  expect(result.spaces[1].folders).toEqual([
    expect.objectContaining({
      id: 10,
      title: "Инструменты",
      items: [
        expect.objectContaining({
          id: 100,
          groupItems: [expect.objectContaining({ id: 101, title: "Grafana" })],
        }),
      ],
    }),
  ]);
});

test("moveFolder не меняет state, когда folder не найден", () => {
  const state = createDashboardState();
  const result = moveFolder(state, { folderId: 999, targetSpaceId: 2 });

  expect(result).toBe(state);
});
