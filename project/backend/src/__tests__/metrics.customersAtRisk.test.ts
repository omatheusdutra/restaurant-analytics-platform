import { getCustomersAtRisk, __private as metricsPrivate } from '@/controllers/metricsController';
import prisma from '@/config/database';

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    $queryRaw: jest.fn(),
  },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('metricsController - customers at risk', () => {

  it('private helper coverage: maskEmail and escapeCsvCell', () => {
    expect(metricsPrivate.maskEmail('ab@example.com')).toBe('a@example.com');
    expect(metricsPrivate.maskEmail('alice@example.com')).toBe('al***@example.com');
    expect(metricsPrivate.escapeCsvCell(undefined)).toBe('""');
    expect(metricsPrivate.escapeCsvCell('=1+1')).toBe("\"\'=1+1\"");
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns customers meeting criteria', async () => {
    const last = new Date('2024-01-10T00:00:00Z');
    (prisma as any).$queryRaw.mockResolvedValueOnce([
      { id: 7, name: 'Ana', email: 'ana@example.com', orders: 4, last_order: last, total_spent: 250 },
    ]);
    const res = mockRes();
    await getCustomersAtRisk({ query: { minPurchases: '3', daysSince: '30', limit: '10' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ customerId: 7, name: 'Ana', orders: 4, lastOrder: last, totalSpent: 250 }),
    ]);
  });

  it('handles errors gracefully', async () => {
    (prisma as any).$queryRaw.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getCustomersAtRisk({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('maps missing numeric fields to zero', async () => {
    (prisma as any).$queryRaw.mockResolvedValueOnce([
      { id: 9, name: 'Bob', email: '', orders: null, last_order: null, total_spent: null },
    ]);
    const res = mockRes();
    await getCustomersAtRisk({ query: { minPurchases: '1', daysSince: '1', limit: '1' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ customerId: 9, orders: 0, totalSpent: 0 }),
    ]);
  });

  it('rejects limit above max', async () => {
    const res = mockRes();
    await getCustomersAtRisk({ query: { limit: '9999' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects invalid limit <= 0', async () => {
    const res = mockRes();
    await getCustomersAtRisk({ query: { limit: '0' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('masks malformed emails as empty string', async () => {
    (prisma as any).$queryRaw.mockResolvedValueOnce([
      { id: 1, name: 'A', email: 'invalid-email', orders: 1, last_order: null, total_spent: 10 },
      { id: 2, name: 'B', email: '@example.com', orders: 1, last_order: null, total_spent: 20 },
    ]);
    const res = mockRes();
    await getCustomersAtRisk({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ customerId: 1, email: '' }),
      expect.objectContaining({ customerId: 2, email: '' }),
    ]);
  });

});
