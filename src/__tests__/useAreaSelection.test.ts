import { collectAreaSelectionCandidates } from "@/newtab/04-features/area-selection/ui/useAreaSelection";
import { DOM_ROLE } from "@/newtab/06-shared/lib/dom/roles";

function element(
  id: number,
  left: number,
  groupId?: number,
): HTMLElement {
  return {
    dataset: { id: String(id) },
    getBoundingClientRect: () => ({
      left,
      top: 10,
      right: left + 20,
      bottom: 30,
    }),
    closest: vi.fn(() =>
      groupId === undefined ? null : { dataset: { groupId: String(groupId) } },
    ),
  } as unknown as HTMLElement;
}

test("maps bookmark children and group headers to their movable root ids", () => {
  expect(
    collectAreaSelectionCandidates(
      [element(1, 0), element(11, 30, 10)],
      [element(10, 60)],
    ),
  ).toEqual([
    { id: 1, rect: { left: 0, top: 10, right: 20, bottom: 30 } },
    {
      id: 11,
      groupId: 10,
      rect: { left: 30, top: 10, right: 50, bottom: 30 },
    },
    {
      id: 10,
      groupId: 10,
      rect: { left: 60, top: 10, right: 80, bottom: 30 },
    },
  ]);
});

test("uses the folder-group role to find a bookmark parent group", () => {
  const child = element(11, 30, 10);
  collectAreaSelectionCandidates([child], []);

  expect(child.closest).toHaveBeenCalledWith(
    `[data-role="${DOM_ROLE.folderGroup}"]`,
  );
});
