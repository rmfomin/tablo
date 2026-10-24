import type { BookmarkItemV3, GroupV3 } from "@/newtab/05-entities/dashboard/model/types";
import type { FolderDisplayItem } from "./getFolderDisplayItems";

export type FolderColumnItem =
  | { type: "bookmark"; item: BookmarkItemV3 }
  | { type: "group"; group: GroupV3; items: BookmarkItemV3[]; continuation: boolean; insertBeforeItemId?: number };

export type FolderColumn = {
  items: FolderColumnItem[];
  height: number;
  insertBeforeItemId?: number;
};

export type FolderColumnMeasurements = {
  folderHeaderHeight: number;
  itemHeights?: ReadonlyMap<number, number>;
  groupHeaderHeights?: ReadonlyMap<number, number>;
};

export function distributeFolderItems(
  items: FolderDisplayItem[],
  columnCount: number,
  measurements: FolderColumnMeasurements,
): FolderColumn[] {
  const count = Number.isFinite(columnCount) ? Math.max(1, Math.floor(columnCount)) : 1;
  const headerHeight = Math.max(0, Math.ceil(measurements.folderHeaderHeight));
  type Atom = { item?: BookmarkItemV3; group?: GroupV3; height: number };
  const atoms: Atom[] = [];
  const groupItems = new Map<number, BookmarkItemV3[]>();
  const groupHeight = (group: GroupV3) =>
    measurements.groupHeaderHeights?.get(group.id) ?? 44;
  const itemHeight = (item: BookmarkItemV3) =>
    measurements.itemHeights?.get(item.id) ?? (item.isSection ? 46 : 56);

  items.forEach((item) => {
    if (item.type === "bookmark") {
      atoms.push({ item: item.item, height: itemHeight(item.item) });
    } else {
      groupItems.set(item.group.id, item.items);
      if (item.items.length === 0) {
        atoms.push({ group: item.group, height: item.group.collapsed ? 0 : 18 });
      } else {
        item.items.forEach((child) => atoms.push({ item: child, group: item.group, height: itemHeight(child) }));
      }
    }
  });

  function partition(limit: number) {
    const columns: { atoms: Atom[]; height: number }[] = Array.from(
      { length: count }, (_, index) => ({ atoms: [], height: index === 0 ? headerHeight : 0 }),
    );
    let index = 0;
    let fits = headerHeight <= limit;
    for (const atom of atoms) {
      let column = columns[index];
      const cost = () => atom.height + (
        atom.group && column.atoms.at(-1)?.group?.id !== atom.group.id
          ? groupHeight(atom.group) : 0
      );
      if (column.height + cost() > limit && index < count - 1) {
        column = columns[++index];
      }
      column.height += cost();
      column.atoms.push(atom);
      if (column.height > limit) fits = false;
    }
    return { columns, fits };
  }

  let low = headerHeight;
  let high = Math.ceil(headerHeight + atoms.reduce(
    (height, atom) => height + atom.height + (atom.group ? groupHeight(atom.group) : 0), 0,
  ));
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (partition(middle).fits) high = middle;
    else low = middle + 1;
  }

  const seenGroups = new Set<number>();
  const columns: FolderColumn[] = partition(high).columns.map((column) => {
    const result: FolderColumnItem[] = [];
    column.atoms.forEach((atom) => {
      if (!atom.group) {
        result.push({ type: "bookmark", item: atom.item! });
        return;
      }
      let fragment = result.at(-1);
      if (fragment?.type !== "group" || fragment.group.id !== atom.group.id) {
        fragment = { type: "group", group: atom.group, items: [], continuation: seenGroups.has(atom.group.id) };
        result.push(fragment);
        seenGroups.add(atom.group.id);
      }
      if (atom.item) fragment.items.push(atom.item);
    });
    result.forEach((fragment) => {
      if (fragment.type !== "group" || fragment.items.length === 0) return;
      const children = groupItems.get(fragment.group.id)!;
      const lastIndex = children.indexOf(fragment.items.at(-1)!);
      fragment.insertBeforeItemId = children[lastIndex + 1]?.id;
    });
    return { items: result, height: column.height };
  });
  columns.forEach((column, index) => {
    const next = columns.slice(index + 1).find((candidate) => candidate.items.length > 0)?.items[0];
    column.insertBeforeItemId = next?.type === "group" ? next.group.id : next?.item.id;
  });
  return columns;
}
