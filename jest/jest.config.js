module.exports = {
  testEnvironment: "node",
  testMatch: ["**/*.test.ts"],
  rootDir: "../",
  transform: {
    "^.+\\.(t|j)sx?$": "@swc-node/jest"
  },
  setupFiles: ["dotenv/config"],
  setupFilesAfterEnv: ["<rootDir>/jest/setupAfterEnv.ts"],
  transformIgnorePatterns: ["node_modules/(?!(filter-obj)/)"]
};
