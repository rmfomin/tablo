import { distributeFolderItems } from "@/newtab/03-widgets/dashboard/Folder/distributeFolderItems";
import type { BookmarkItemV3, GroupV3 } from "@/newtab/05-entities/dashboard/model/types";
import type { FolderDisplayItem } from "@/newtab/03-widgets/dashboard/Folder/getFolderDisplayItems";

const bookmark = (id: number): BookmarkItemV3 => ({
  id, title: String(id), position: String(id), type: "bookmark", objectType: "bookmark", url: `https://example.com/${id}`, favIconUrl: "",
});
const display = (id: number): FolderDisplayItem => ({ type: "bookmark", item: bookmark(id) });
const group = (ids: number[], collapsed = false): FolderDisplayItem => {
  const items = ids.map(bookmark);
  const value: GroupV3 = { id: 100, position: "a", title: "Group", type: "group", objectType: "group", groupItems: items, collapsed };
  return { type: "group", group: value, items: collapsed ? [] : items };
};

test("balances by height with space reserved for the folder title only in the first column", () => {
  const columns = distributeFolderItems([1, 2, 3, 4, 5].map(display), 2, {
    folderHeaderHeight: 50,
    itemHeights: new Map([1, 2, 3, 4, 5].map((id) => [id, 50])),
  });
  expect(columns.map((column) => column.items.map((item) => item.type === "bookmark" ? item.item.id : item.group.id))).toEqual([[1, 2], [3, 4, 5]]);
  expect(columns.map((column) => column.height)).toEqual([150, 150]);
  expect(columns[0].insertBeforeItemId).toBe(3);
  expect(columns[1].insertBeforeItemId).toBeUndefined();
});

test("splits one logical group without duplicating or losing bookmarks and exposes fragment insertion boundaries", () => {
  const columns = distributeFolderItems([group([1, 2, 3, 4])], 2, {
    folderHeaderHeight: 0,
    itemHeights: new Map([1, 2, 3, 4].map((id) => [id, 50])),
    groupHeaderHeights: new Map([[100, 30]]),
  });
  expect(columns.map((column) => column.height)).toEqual([130, 130]);
  const first = columns[0].items[0];
  const second = columns[1].items[0];
  expect(first).toMatchObject({ type: "group", continuation: false, items: [{ id: 1 }, { id: 2 }], insertBeforeItemId: 3 });
  expect(second).toMatchObject({ type: "group", continuation: true, items: [{ id: 3 }, { id: 4 }] });
  expect(columns[0].insertBeforeItemId).toBe(100);
  expect(second.type === "group" && second.insertBeforeItemId).toBeUndefined();
});

test("does not leave a group title without its first bookmark at a column boundary", () => {
  const columns = distributeFolderItems([display(1), group([2, 3])], 2, {
    folderHeaderHeight: 0,
    itemHeights: new Map([[1, 80], [2, 30], [3, 30]]),
    groupHeaderHeights: new Map([[100, 20]]),
  });
  expect(columns[0].items).toMatchObject([{ type: "bookmark", item: { id: 1 } }]);
  expect(columns[1].items).toMatchObject([{ type: "group", items: [{ id: 2 }, { id: 3 }] }]);
  expect(columns.map((column) => column.height)).toEqual([80, 80]);
});

test("collapsed groups produce one header and no continuations", () => {
  const columns = distributeFolderItems([group([1, 2, 3], true)], 3, { folderHeaderHeight: 0 });
  const fragments = columns.flatMap((column) => column.items);
  expect(fragments).toHaveLength(1);
  expect(fragments[0]).toMatchObject({ type: "group", continuation: false, items: [] });
});

test("keeps empty columns as drop targets and leaves the input data unchanged", () => {
  const input = [group([1]), display(2)];
  const snapshot = JSON.stringify(input);
  const columns = distributeFolderItems(input, 4, { folderHeaderHeight: 50 });
  expect(columns).toHaveLength(4);
  expect(columns.flatMap((column) => column.items.flatMap((item) => item.type === "group" ? item.items.map((child) => child.id) : [item.item.id]))).toEqual([1, 2]);
  expect(JSON.stringify(input)).toBe(snapshot);
  expect(distributeFolderItems([], 2, { folderHeaderHeight: 50 }).map((column) => column.items)).toEqual([[], []]);
});
