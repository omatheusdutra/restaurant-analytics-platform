import { getInsights } from '@/controllers/insightsController';
import prisma from '@/config/database';

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    sale: { aggregate: jest.fn(), groupBy: jest.fn(), findMany: jest.fn(), count: jest.fn() },
    productSale: { groupBy: jest.fn() },
    product: { findUnique: jest.fn() },
    channel: { findUnique: jest.fn() },
  },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('insightsController unit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getInsights returns insights summary and optional cards', async () => {
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000, totalAmountItems: 1200, totalDiscount: 300 }, _count: { id: 200 }, _avg: { totalAmount: 5 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 1, _sum: { quantity: 10, totalPrice: 300 } },
      { productId: 2, _sum: { quantity: 8, totalPrice: 200 } },
      { productId: 3, _sum: { quantity: 5, totalPrice: 150 } },
    ]);
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 7, _sum: { totalAmount: 700 }, _count: { id: 100 } },
    ]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: new Date('2024-01-01T10:00:00Z') },
      { createdAt: new Date('2024-01-01T11:00:00Z') },
    ]);
    // cancellationRate >= 0.08 and discountRate >= 0.2
    (prisma as any).sale.count.mockResolvedValueOnce(220).mockResolvedValueOnce(20);
    (prisma as any).product.findUnique.mockResolvedValueOnce({ id: 1, name: 'Burger', category: { name: 'Food' } });
    (prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 7, name: 'App' });

    const res = mockRes();
    await getInsights({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getInsights covers all conditional branches', async () => {
    // avgTicket < 50, totalOrders > 100, channelsData length > 1, top3 > 60%
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000, totalAmountItems: 1200, totalDiscount: 250 }, _count: { id: 200 }, _avg: { totalAmount: 40 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 1, _sum: { quantity: 20, totalPrice: 400 } },
      { productId: 2, _sum: { quantity: 10, totalPrice: 300 } },
      { productId: 3, _sum: { quantity: 5, totalPrice: 250 } },
    ]);
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 7, _sum: { totalAmount: 700 }, _count: { id: 100 } },
      { channelId: 8, _sum: { totalAmount: 300 }, _count: { id: 100 } },
    ]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: new Date('2024-01-01T10:00:00Z') },
      { createdAt: new Date('2024-01-01T11:00:00Z') },
      { createdAt: new Date('2024-01-01T10:30:00Z') },
    ]);
    (prisma as any).sale.count.mockResolvedValueOnce(250).mockResolvedValueOnce(30);
    (prisma as any).product.findUnique.mockResolvedValueOnce({ id: 1, name: 'Top', category: { name: 'Cat' } });
    (prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 7, name: 'App' });

    const res = mockRes();
    await getInsights({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });

  it('getInsights handles error', async () => {
    (prisma as any).sale.aggregate.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getInsights({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getInsights with empty dataset yields minimal payload', async () => {
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 0, totalAmountItems: 0, totalDiscount: 0 }, _count: { id: 0 }, _avg: { totalAmount: 0 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([]);
    (prisma as any).sale.groupBy.mockResolvedValueOnce([{ channelId: 1, _sum: { totalAmount: 0 }, _count: { id: 0 } }]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const res = mockRes();
    await getInsights({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });

  it('getInsights growth branch for medium activity (20<avg<=50)', async () => {
    // 300 orders over ~10 days → 30/day
    const startDate = '2024-01-01';
    const endDate = '2024-01-11';
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000, totalAmountItems: 1200, totalDiscount: 100 }, _count: { id: 300 }, _avg: { totalAmount: 40 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([]);
    (prisma as any).sale.groupBy.mockResolvedValueOnce([{ channelId: 1, _sum: { totalAmount: 500 }, _count: { id: 300 } }]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(300).mockResolvedValueOnce(5);
    const res = mockRes();
    await getInsights({ query: { startDate, endDate } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });

  it('getInsights growth branch for low activity (<=20/day) and no risk concentration', async () => {
    // 50 orders over 10 days → 5/day; top3 percentage below 60%
    const startDate = '2024-01-01';
    const endDate = '2024-01-11';
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000, totalAmountItems: 1200, totalDiscount: 50 }, _count: { id: 50 }, _avg: { totalAmount: 80 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 1, _sum: { quantity: 10, totalPrice: 200 } },
      { productId: 2, _sum: { quantity: 5, totalPrice: 150 } },
      { productId: 3, _sum: { quantity: 4, totalPrice: 100 } },
    ]);
    (prisma as any).sale.groupBy.mockResolvedValueOnce([{ channelId: 1, _sum: { totalAmount: 500 }, _count: { id: 50 } }]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(50).mockResolvedValueOnce(2);
    (prisma as any).product.findUnique.mockResolvedValueOnce({ id: 1, name: 'Prod', category: { name: 'Cat' } });
    const res = mockRes();
    await getInsights({ query: { startDate, endDate } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });

  it('getInsights handles null product details and excellent growth path (>50/day)', async () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-02'; // 1 day
    // 120 orders in 1 day -> 120/day (>50)
    ;(prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 2000, totalAmountItems: 2300, totalDiscount: 200 }, _count: { id: 120 }, _avg: { totalAmount: 60 } });
    ;(prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 1, _sum: { quantity: 30, totalPrice: 900 } },
      { productId: 2, _sum: { quantity: 10, totalPrice: 200 } },
      { productId: 3, _sum: { quantity: 5, totalPrice: 100 } },
    ]);
    ;(prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 7, _sum: { totalAmount: 1500 }, _count: { id: 90 } },
      { channelId: 8, _sum: { totalAmount: 500 }, _count: { id: 30 } },
    ]);
    ;(prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: new Date('2024-01-01T10:00:00Z') },
      { createdAt: new Date('2024-01-01T11:00:00Z') },
      { createdAt: new Date('2024-01-01T19:00:00Z') },
    ]);
    ;(prisma as any).sale.count.mockResolvedValueOnce(130).mockResolvedValueOnce(5);
    // Null product details branch
    ;(prisma as any).product.findUnique.mockResolvedValueOnce(null);
    ;(prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 7, name: 'App' });

    const res = mockRes();
    await getInsights({ query: { startDate, endDate } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });

  it('getInsights applies channelId/storeId filters and does not compute channel card when only one channel', async () => {
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 500, totalAmountItems: 600, totalDiscount: 50 }, _count: { id: 10 }, _avg: { totalAmount: 50 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([]);
    // only one channel -> should not call channel.findUnique
    (prisma as any).sale.groupBy.mockResolvedValueOnce([{ channelId: 9, _sum: { totalAmount: 500 }, _count: { id: 10 } }]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(10).mockResolvedValueOnce(1);
    const res = mockRes();
    const query = { channelId: '5', storeId: '7' } as any;
    await getInsights({ query } as any, res as any);
    // first aggregate call must include parsed filters
    const call = (prisma as any).sale.aggregate.mock.calls[0][0];
    expect(call.where.channelId).toBe(5);
    expect(call.where.storeId).toBe(7);
    // because only one channel in groupBy, channel.findUnique must not be called
    expect((prisma as any).channel.findUnique).not.toHaveBeenCalled();
  });

  it('getInsights with no peaks, avgTicket >= 50, and top3 exactly 60% (no risk)', async () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-11';
    // totalRevenue = 1000, avgTicket = 50 -> no upsell card
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000, totalAmountItems: 1200, totalDiscount: 100 }, _count: { id: 20 }, _avg: { totalAmount: 50 } });
    // top3 total = 600 => exactly 60%
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 1, _sum: { quantity: 10, totalPrice: 300 } },
      { productId: 2, _sum: { quantity: 5, totalPrice: 200 } },
      { productId: 3, _sum: { quantity: 1, totalPrice: 100 } },
    ]);
    // channelsData empty
    (prisma as any).sale.groupBy.mockResolvedValueOnce([]);
    // timeDistribution empty -> no peak hours
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(20).mockResolvedValueOnce(0);
    (prisma as any).product.findUnique.mockResolvedValueOnce({ id: 1, name: 'Top', category: { name: 'Cat' } });
    const res = mockRes();
    await getInsights({ query: { startDate, endDate } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });

  it('channel_performance card with null channel details (fallback Unknown)', async () => {
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000, totalAmountItems: 1200, totalDiscount: 50 }, _count: { id: 200 }, _avg: { totalAmount: 60 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([]);
    // two channels to enter the branch
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 11, _sum: { totalAmount: 700 }, _count: { id: 100 } },
      { channelId: 12, _sum: { totalAmount: 300 }, _count: { id: 100 } },
    ]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(200).mockResolvedValueOnce(4);
    // channel details null -> Unknown
    (prisma as any).channel.findUnique.mockResolvedValueOnce(null);
    const res = mockRes();
    await getInsights({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ insights: expect.arrayContaining([ expect.objectContaining({ type: 'channel_performance' }) ]) })
    );
  });



  it('handles invalid filter ids and fallback numeric values in channel/top3 branches', async () => {
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 100, totalAmountItems: 100, totalDiscount: 0 }, _count: { id: 5 }, _avg: { totalAmount: 20 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 1, _sum: { quantity: 2, totalPrice: null } },
      { productId: 2, _sum: { quantity: 1, totalPrice: 30 } },
      { productId: 3, _sum: { quantity: 1, totalPrice: 20 } },
    ]);
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 1, _sum: { totalAmount: null }, _count: { id: 2 } },
      { channelId: 2, _sum: { totalAmount: 50 }, _count: { id: 3 } },
    ]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(10).mockResolvedValueOnce(0);
    (prisma as any).product.findUnique.mockResolvedValueOnce({ id: 1, name: 'Top', category: { name: 'Cat' } });
    (prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 1, name: 'Canal X' });

    const res = mockRes();
    await getInsights({ query: { channelId: '0', storeId: '-1' } } as any, res as any);

    const aggregateCall = (prisma as any).sale.aggregate.mock.calls.at(-1)[0];
    expect(aggregateCall.where.channelId).toBeUndefined();
    expect(aggregateCall.where.storeId).toBeUndefined();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });

  it('top_product card with productDetails defined and missing totalPrice uses 0', async () => {
    (prisma as any).sale.aggregate.mockResolvedValueOnce({ _sum: { totalAmount: 1000, totalAmountItems: 1100, totalDiscount: 0 }, _count: { id: 10 }, _avg: { totalAmount: 100 } });
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 2, _sum: { /* no totalPrice */ } },
    ]);
    (prisma as any).product.findUnique.mockResolvedValueOnce({ id: 2, name: 'Prod', category: { name: 'Cat' } });
    (prisma as any).sale.groupBy.mockResolvedValueOnce([]);
    (prisma as any).sale.findMany.mockResolvedValueOnce([]);
    (prisma as any).sale.count.mockResolvedValueOnce(10).mockResolvedValueOnce(0);
    const res = mockRes();
    await getInsights({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ insights: expect.any(Array) }));
  });
});
