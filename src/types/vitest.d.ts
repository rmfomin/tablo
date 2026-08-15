import type { Mock, Mocked } from "vitest";

declare global {
  type VitestMock = Mock;
  type VitestMocked<T> = Mocked<T>;
}

export {};
