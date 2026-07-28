module.exports = {
  roots: ["src"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  moduleNameMapper: {
    "^@/.*\\.module\\.scss$": "<rootDir>/src/test-utils/scssModuleMock.js",
    "^.+\\.module\\.scss$": "<rootDir>/src/test-utils/scssModuleMock.js",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
