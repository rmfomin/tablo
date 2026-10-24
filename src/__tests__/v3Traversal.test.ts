import { collectBookmarksV3 } from "@/newtab/05-entities/dashboard/model/traversal";
import { SpaceV3 } from "@/newtab/05-entities/dashboard/model/types";

function createSpacesFixture(): SpaceV3[] {
  return [
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
          title: "Folder",
          items: [
            {
              id: 100,
              position: "a0",
              type: "bookmark",
              objectType: "bookmark",
              title: "Top level",
              url: "https://top.example",
              favIconUrl: "https://top.example/favicon.ico",
            },
            {
              id: 200,
              position: "a1",
              type: "group",
              objectType: "group",
              title: "Grouped",
              groupItems: [
                {
                  id: 201,
                  position: "a0",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Nested A",
                  url: "https://a.example",
                  favIconUrl: "https://a.example/favicon.ico",
                },
                {
                  id: 202,
                  position: "a1",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Nested B",
                  url: "https://b.example",
                  favIconUrl: "https://b.example/favicon.ico",
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

test("collectBookmarksV3 returns top-level and nested group bookmarks", () => {
  expect(collectBookmarksV3(createSpacesFixture())).toEqual([
    {
      id: 100,
      position: "a0",
      type: "bookmark",
      objectType: "bookmark",
      title: "Top level",
      url: "https://top.example",
      favIconUrl: "https://top.example/favicon.ico",
    },
    {
      id: 201,
      position: "a0",
      type: "bookmark",
      objectType: "bookmark",
      title: "Nested A",
      url: "https://a.example",
      favIconUrl: "https://a.example/favicon.ico",
    },
    {
      id: 202,
      position: "a1",
      type: "bookmark",
      objectType: "bookmark",
      title: "Nested B",
      url: "https://b.example",
      favIconUrl: "https://b.example/favicon.ico",
    },
  ]);
});
