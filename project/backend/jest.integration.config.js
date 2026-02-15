const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverage: false,
  coverageThreshold: undefined,
  setupFiles: ['<rootDir>/jest.integration.setup.js'],
  testMatch: ['**/__tests__/auth.test.ts', '**/__tests__/metrics.test.ts'],
};
