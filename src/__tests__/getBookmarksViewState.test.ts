import { getBookmarksViewState } from "@/newtab/components/common/Bookmarks/getBookmarksViewState";
import type { BookmarksViewStateInput } from "@/newtab/components/common/Bookmarks/getBookmarksViewState";

function createViewState(): BookmarksViewStateInput {
  return {
    currentSpaceId: 1,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Visible folder",
            items: [],
          },
          {
            id: 11,
            position: "a1",
            objectType: "folder",
            title: "Archived folder",
            archived: true,
            items: [],
          },
        ],
      },
      {
        id: 2,
        position: "b0",
        objectType: "space",
        title: "Other",
        folders: [
          {
            id: 20,
            position: "a0",
            objectType: "folder",
            title: "Searchable folder",
            items: [
              {
                id: 200,
                position: "a0",
                type: "group",
                title: "Ops",
                groupItems: [
                  {
                    id: 201,
                    position: "a0",
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
    ],
    search: "",
    showArchived: false,
  };
}

test("getBookmarksViewState uses current v3 space when search is empty", () => {
  const appState = createViewState();

  expect(getBookmarksViewState(appState)).toEqual({
    folders: [
      {
        id: 10,
        position: "a0",
        objectType: "folder",
        title: "Visible folder",
        items: [],
      },
    ],
  });
});

test("getBookmarksViewState searches through v3 folders across spaces", () => {
  const appState = createViewState();
  appState.search = "graf";

  expect(getBookmarksViewState(appState)).toEqual({
    folders: [
      {
        id: 20,
        position: "a0",
        objectType: "folder",
        title: "Searchable folder",
        items: [
          {
            id: 200,
            position: "a0",
            type: "group",
            title: "Ops",
            groupItems: [
              {
                id: 201,
                position: "a0",
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
  });
});
