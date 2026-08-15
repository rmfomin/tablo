export type SelectionRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

export type SelectionCandidate = {
  id: number;
  groupId?: number;
  rect: SelectionRect;
};

export function normalizeSelectionRect(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): SelectionRect {
  return {
    left: Math.min(startX, endX),
    top: Math.min(startY, endY),
    right: Math.max(startX, endX),
    bottom: Math.max(startY, endY),
  };
}

export function isRectIntersecting(
  a: SelectionRect,
  b: SelectionRect,
): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function resolveAreaSelection(
  selection: SelectionRect,
  candidates: SelectionCandidate[],
): number[] {
  const selectedCandidates = candidates.filter((candidate) =>
    isRectIntersecting(selection, candidate.rect),
  );
  const selectedGroupIds = new Set(
    selectedCandidates.flatMap((candidate) =>
      candidate.groupId === undefined ? [] : [candidate.groupId],
    ),
  );
  const shouldPromoteGroups =
    selectedCandidates.some(
      (candidate) => candidate.groupId !== undefined && candidate.id === candidate.groupId,
    ) ||
    selectedCandidates.some((candidate) => candidate.groupId === undefined) ||
    selectedGroupIds.size > 1;

  return [
    ...new Set(
      selectedCandidates.map((candidate) =>
        shouldPromoteGroups && candidate.groupId !== undefined
          ? candidate.groupId
          : candidate.id,
      ),
    ),
  ];
}
