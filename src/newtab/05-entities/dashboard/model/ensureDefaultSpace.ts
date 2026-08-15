import type { SpaceV3 } from "./types";

const DEFAULT_SPACE_ID = 1;

/** Минимальный изменяемый снимок, нужный startup-предобработке. */
export type DashboardStateForInitialization = {
  spaces: SpaceV3[];
  currentSpaceId: number | undefined;
};

export function ensureDefaultSpace(state: DashboardStateForInitialization): void {
  if (state.spaces.length > 0) {
    return;
  }

  state.spaces = [
    {
      id: DEFAULT_SPACE_ID,
      position: "a0",
      objectType: "space",
      title: "Default bookmarks",
      folders: [],
    },
  ];

  state.currentSpaceId = DEFAULT_SPACE_ID;
}
