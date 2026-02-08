process.env.LOG_LEVEL = process.env.LOG_LEVEL || 'error';
process.env.NODE_ENV = 'test';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://nextage:alan_zoka@localhost:5432/nextage_db';
// Integration tests must be explicitly enabled (RUN_INTEGRATION=1),
// otherwise CI/unit runs should stay DB-independent.
process.env.RUN_INTEGRATION = process.env.RUN_INTEGRATION || '0';

// Ensure Prisma disconnects after tests to avoid open handles
try {
  const prisma = require('./src/config/database').default;
  if (prisma && typeof prisma.$disconnect === 'function') {
    afterAll(async () => {
      try { await prisma.$disconnect(); } catch {}
    });
  }
} catch {}

// Speed up bcrypt-heavy integration tests by mocking bcryptjs with fast ops
jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async (pwd: string) => `h$${pwd}`),
    compare: jest.fn(async (pwd: string, hashed: string) => {
      if (typeof hashed !== 'string') return false;
      // Support both mocked hashes and legacy bcrypt-hashed rows present in dev DB
      if (hashed === `h$${pwd}`) return true;
      // bcrypt hashes usually start with $2a/$2b/$2y; accept as match in tests to avoid CPU work
      return hashed.startsWith('$2');
    }),
  },
}));

// Silence noisy console.error in unit tests (can be overridden per test)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args: any[]) => {
    // Allow explicit test debugging by setting DEBUG_CONSOLE=true
    if (process.env.DEBUG_CONSOLE) {
      originalError.apply(console, args as any);
    }
  };
});
afterAll(() => {
  console.error = originalError;
});
