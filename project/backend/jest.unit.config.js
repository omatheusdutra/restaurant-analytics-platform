const base = require('./jest.config');

module.exports = {
  ...base,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/config/database.ts',
    '!src/**/__tests__/**',
    '!src/routes/**/*.ts',
  ],
  coverageThreshold: {
    global: { branches: 0, functions: 0, lines: 0, statements: 0 },
  },
  testPathIgnorePatterns: ['<rootDir>/src/__tests__/auth.test.ts', '<rootDir>/src/__tests__/metrics.test.ts'],
};
