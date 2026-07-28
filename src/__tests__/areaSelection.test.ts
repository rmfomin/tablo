import {
  isRectIntersecting,
  resolveAreaSelection,
  type SelectionCandidate,
} from "@/newtab/feature/selection/areaSelection";

const rect = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  right: left + width,
  bottom: top + height,
});

test("resolves grouped bookmarks to one group while preserving top-level bookmarks", () => {
  const candidates: SelectionCandidate[] = [
    { id: 1, rect: rect(0, 0, 20, 20) },
    { id: 11, groupId: 10, rect: rect(30, 0, 20, 20) },
    { id: 12, groupId: 10, rect: rect(60, 0, 20, 20) },
    { id: 21, groupId: 20, rect: rect(90, 0, 20, 20) },
  ];

  expect(resolveAreaSelection(rect(0, 0, 100, 20), candidates)).toEqual([
    1,
    10,
    20,
  ]);
});

test("keeps selected bookmarks separate when the selection stays within one group", () => {
  const candidates: SelectionCandidate[] = [
    { id: 11, groupId: 10, rect: rect(0, 0, 20, 20) },
    { id: 12, groupId: 10, rect: rect(30, 0, 20, 20) },
  ];

  expect(resolveAreaSelection(rect(0, 0, 50, 20), candidates)).toEqual([
    11,
    12,
  ]);
});

test("promotes a group when its header is selected", () => {
  const candidates: SelectionCandidate[] = [
    { id: 10, groupId: 10, rect: rect(0, 0, 20, 20) },
    { id: 11, groupId: 10, rect: rect(30, 0, 20, 20) },
  ];

  expect(resolveAreaSelection(rect(0, 0, 20, 20), candidates)).toEqual([10]);
});

test("detects overlap but does not select elements that only touch the border", () => {
  expect(isRectIntersecting(rect(0, 0, 10, 10), rect(9, 9, 10, 10))).toBe(
    true,
  );
  expect(isRectIntersecting(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(
    false,
  );
});
