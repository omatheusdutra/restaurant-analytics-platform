import { getCustomersAtRisk } from '@/controllers/metricsController';
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
});
