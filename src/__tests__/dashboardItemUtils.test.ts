import {
  findBookmarkItem,
  getTemporaryFaviconUrl,
  toUrl,
} from "@/newtab/05-entities/dashboard/model/itemUtils";

test("findBookmarkItem finds bookmarks nested in a group", () => {
  const item = findBookmarkItem({
    spaces: [{
      id: 1,
      objectType: "space",
      position: "a0",
      title: "Default",
      folders: [{
        id: 2,
        objectType: "folder",
        position: "a0",
        title: "Folder",
        items: [{
          id: 3,
          type: "group",
          objectType: "group",
          position: "a0",
          title: "Section",
          groupItems: [{
            id: 4,
            type: "bookmark",
            objectType: "bookmark",
            position: "a0",
            title: "Nested",
            url: "https://example.com/docs",
            favIconUrl: "",
          }],
        }],
      }],
    }],
  }, 4);

  expect(item?.title).toBe("Nested");
});

test("URL helpers return a temporary favicon only for valid URLs", () => {
  expect(toUrl("not a url")).toBeUndefined();
  expect(getTemporaryFaviconUrl("https://example.com/docs")).toBe(
    "https://example.com/favicon.ico#by-tablo",
  );
});
