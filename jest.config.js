module.exports = {
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  },
  "roots": [
    "./src/test"
  ],
  "testMatch": [
    "**/?(*.)+(spec|test).+(ts|tsx|js)"
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
}
