module.exports = {
  "roots": [
    "./src/test"
  ],
  "testMatch": [
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      { tsconfig: 'tsconfig.test.json' }
    ]
  },
  "testPathIgnorePatterns": [
    "<rootDir>/models",
    "do-not-commit.*"
  ],
  "collectCoverageFrom": [
    "!**/models/**",
    "!**/data/**",
    "!**/do-not-commit*",
    "!**/open-project/**"
  ]
}
