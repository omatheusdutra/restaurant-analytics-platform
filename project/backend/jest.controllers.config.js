const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: ['src/controllers/**/*.ts'],
  coverageThreshold: {
    global: { branches: 100, functions: 100, lines: 100, statements: 100 },
  },
};
