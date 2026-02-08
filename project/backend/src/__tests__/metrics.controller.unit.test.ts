import {
  getOverview,
  getTopProducts,
  getSalesByChannel,
  getSalesByStore,
  getHourlyHeatmap,
  getTimeSeries,
  getCategories,
  getFilters,
  exportToCSV,
} from '@/controllers/metricsController';
import prisma from '@/config/database';

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    sale: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    productSale: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    product: { findUnique: jest.fn() },
    channel: { findUnique: jest.fn(), findMany: jest.fn() },
    store: { findUnique: jest.fn(), findMany: jest.fn() },
    category: { findMany: jest.fn() },
    $queryRaw: jest.fn(),
  },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.send = jest.fn();
  return res;
}

describe('metricsController unit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getOverview returns computed metrics', async () => {
    (prisma as any).sale.aggregate
      .mockResolvedValueOnce({
        _sum: { totalAmount: 200, totalDiscount: 10, totalAmountItems: 240, deliveryFee: 5 },
        _count: { id: 4 },
        _avg: { totalAmount: 50, productionSeconds: 120, deliverySeconds: 300 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 100 }, _count: { id: 2 } });
    (prisma as any).sale.count.mockResolvedValueOnce(10).mockResolvedValueOnce(2);
    const req: any = { query: {} };
    const res = mockRes();
    await getOverview(req, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getOverview handles zero-previous branch (growth 0)', async () => {
    (prisma as any).sale.aggregate
      .mockResolvedValueOnce({
        _sum: { totalAmount: 50, totalDiscount: 0, totalAmountItems: 50, deliveryFee: 0 },
        _count: { id: 1 },
        _avg: { totalAmount: 50, productionSeconds: 0, deliverySeconds: 0 },
      })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } });
    (prisma as any).sale.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const res = mockRes();
    await getOverview({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getOverview handles error', async () => {
    (prisma as any).sale.aggregate.mockRejectedValueOnce(new Error('x'));
    const req: any = { query: {} };
    const res = mockRes();
    await getOverview(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getTopProducts returns mapped list', async () => {
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 1, _sum: { quantity: 3, totalPrice: 75 } },
    ]);
    (prisma as any).product.findUnique.mockResolvedValueOnce({
      id: 1,
      name: 'Burger',
      category: { name: 'Food' },
    });
    const req: any = { query: {} };
    const res = mockRes();
    await getTopProducts(req, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ productName: 'Burger', categoryName: 'Food' }),
    ]);
  });

  it('getTopProducts rejects invalid limit', async () => {
    const res = mockRes();
    await getTopProducts({ query: { limit: '0' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('getTopProducts rejects limit above max', async () => {
    const res = mockRes();
    await getTopProducts({ query: { limit: '9999' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('getTopProducts with filters channel/store', async () => {
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 2, _sum: { quantity: 1, totalPrice: 10 } },
    ]);
    (prisma as any).product.findUnique.mockResolvedValueOnce({ id: 2, name: 'Soda', category: { name: 'Drinks' } });
    const res = mockRes();
    await getTopProducts({ query: { channelId: '1', storeId: '2' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ productName: 'Soda', categoryName: 'Drinks' }),
    ]);
  });

  it('getTopProducts handles error', async () => {
    (prisma as any).productSale.groupBy.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getTopProducts({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getSalesByChannel maps details', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 9, _sum: { totalAmount: 50 }, _count: { id: 2 }, _avg: { totalAmount: 25 } },
    ]);
    (prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 9, name: 'App', type: 'D' });
    const res = mockRes();
    await getSalesByChannel({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ channelName: 'App', totalOrders: 2, averageTicket: 25 }),
    ]);
  });

  it('getSalesByChannel with store filter', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 1, _sum: { totalAmount: 10 }, _count: { id: 1 }, _avg: { totalAmount: 10 } },
    ]);
    (prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 1, name: 'BalcÃ£o', type: 'P' });
    const res = mockRes();
    await getSalesByChannel({ query: { storeId: '5' } } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getSalesByChannel handles error', async () => {
    (prisma as any).sale.groupBy.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getSalesByChannel({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getSalesByStore maps details', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { storeId: 3, _sum: { totalAmount: 80 }, _count: { id: 4 }, _avg: { totalAmount: 20 } },
    ]);
    (prisma as any).store.findUnique.mockResolvedValueOnce({ id: 3, name: 'Loja A', city: 'SP' });
    const res = mockRes();
    await getSalesByStore({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ storeName: 'Loja A', averageTicket: 20 }),
    ]);
  });

  it('getSalesByStore with channel filter', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { storeId: 5, _sum: { totalAmount: 40 }, _count: { id: 2 }, _avg: { totalAmount: 20 } },
    ]);
    (prisma as any).store.findUnique.mockResolvedValueOnce({ id: 5, name: 'Loja 5', city: 'RJ' });
    const res = mockRes();
    await getSalesByStore({ query: { channelId: '9' } } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getSalesByStore handles error', async () => {
    (prisma as any).sale.groupBy.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getSalesByStore({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getHourlyHeatmap aggregates by day/hour', async () => {
    const now = new Date();
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10), totalAmount: 10 },
      { createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10), totalAmount: 5 },
    ]);
    const res = mockRes();
    await getHourlyHeatmap({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getHourlyHeatmap handles error', async () => {
    (prisma as any).sale.findMany.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getHourlyHeatmap({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getTimeSeries groups by hour and day', async () => {
    const d1 = new Date('2024-01-01T10:00:00Z');
    const d2 = new Date('2024-01-01T11:00:00Z');
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: d1, totalAmount: 10, totalAmountItems: 12, totalDiscount: 2, saleStatusDesc: 'COMPLETED' },
      { createdAt: d2, totalAmount: 15, totalAmountItems: 20, totalDiscount: 0, saleStatusDesc: 'CANCELLED' },
    ]);
    const res1 = mockRes();
    await getTimeSeries({ query: { groupBy: 'hour' } } as any, res1 as any);
    expect(res1.json).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ orders: 1 })])
    );

    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: d1, totalAmount: 10 },
      { createdAt: d2, totalAmount: 15 },
    ]);
    const res2 = mockRes();
    await getTimeSeries({ query: {} } as any, res2 as any);
    expect(res2.json).toHaveBeenCalled();
  });

  it('getTimeSeries groups by month', async () => {
    const d = new Date('2024-02-15T10:00:00Z');
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: d, totalAmount: 10, totalAmountItems: 10, totalDiscount: 0, saleStatusDesc: null },
    ]);
    const res = mockRes();
    await getTimeSeries({ query: { groupBy: 'month' } } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getTimeSeries groups by week', async () => {
    const d = new Date('2024-02-15T10:00:00Z');
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: d, totalAmount: 10, totalAmountItems: 12, totalDiscount: 2, saleStatusDesc: 'COMPLETED' },
    ]);
    const res = mockRes();
    await getTimeSeries({ query: { groupBy: 'week' } } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getTimeSeries handles zero amounts in completed sales', async () => {
    const d = new Date('2024-02-20T10:00:00Z');
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: d, totalAmount: 0, totalAmountItems: 0, totalDiscount: 0, saleStatusDesc: 'COMPLETED' },
    ]);
    const res = mockRes();
    await getTimeSeries({ query: { groupBy: 'day' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ revenue: 0, grossRevenue: 0, discountRate: 0 }),
    ]);
  });

  it('getTimeSeries handles error', async () => {
    (prisma as any).sale.findMany.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getTimeSeries({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getCategories aggregates by category', async () => {
    (prisma as any).productSale.findMany.mockResolvedValueOnce([
      { quantity: 2, totalPrice: 30, product: { categoryId: 1, category: { name: 'Bebidas' } } },
      { quantity: 1, totalPrice: 10, product: { categoryId: 1, category: { name: 'Bebidas' } } },
    ]);
    const res = mockRes();
    await getCategories({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'Bebidas', quantity: 3 }),
    ]);
  });

  it('getCategories with filters', async () => {
    (prisma as any).productSale.findMany.mockResolvedValueOnce([
      { quantity: 1, totalPrice: 5, product: { categoryId: 0, category: null } },
    ]);
    const res = mockRes();
    await getCategories({ query: { channelId: '1', storeId: '2' } } as any, res as any);
    expect(res.json).toHaveBeenCalled();
  });

  it('getCategories handles error', async () => {
    (prisma as any).productSale.findMany.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getCategories({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getCategories sorts categories by revenue (covers sort path)', async () => {
    (prisma as any).productSale.findMany.mockResolvedValueOnce([
      { quantity: 1, totalPrice: 10, product: { categoryId: 1, category: { name: 'A' } } },
      { quantity: 1, totalPrice: 50, product: { categoryId: 2, category: { name: 'B' } } },
    ]);
    const res = mockRes();
    await getCategories({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ name: 'B' }),
      expect.objectContaining({ name: 'A' }),
    ]);
  });

  it('getFilters returns lists', async () => {
    (prisma as any).channel.findMany.mockResolvedValueOnce([{ id: 1, name: 'App', type: 'D' }]);
    (prisma as any).store.findMany.mockResolvedValueOnce([{ id: 2, name: 'Loja', city: 'SP', state: 'SP' }]);
    (prisma as any).category.findMany.mockResolvedValueOnce([{ id: 3, name: 'Cat' }]);
    const res = mockRes();
    await getFilters({} as any, res as any);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ channels: expect.any(Array), stores: expect.any(Array), categories: expect.any(Array) })
    );
  });

  it('getFilters handles error', async () => {
    (prisma as any).channel.findMany.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getFilters({} as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('normalizes channel name App Proprio to aiqfome in filters', async () => {
    (prisma as any).channel.findMany.mockResolvedValueOnce([{ id: 1, name: 'App Proprio', type: 'D' }]);
    (prisma as any).store.findMany.mockResolvedValueOnce([]);
    (prisma as any).category.findMany.mockResolvedValueOnce([]);

    const res = mockRes();
    await getFilters({} as any, res as any);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.channels[0].name).toBe('aiqfome');
  });

  it('keeps non-matching channel names unchanged in filters', async () => {
    (prisma as any).channel.findMany.mockResolvedValueOnce([{ id: 2, name: 'iFood', type: 'D' }]);
    (prisma as any).store.findMany.mockResolvedValueOnce([]);
    (prisma as any).category.findMany.mockResolvedValueOnce([]);

    const res = mockRes();
    await getFilters({} as any, res as any);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.channels[0].name).toBe('iFood');
  });

  it('handles undefined channel name (stripAccents fallback)', async () => {
    // Simula canal com nome indefinido para cobrir ramo (s || "") em stripAccents
    (prisma as any).channel.findMany.mockResolvedValueOnce([{ id: 3, name: undefined, type: 'D' }]);
    (prisma as any).store.findMany.mockResolvedValueOnce([]);
    (prisma as any).category.findMany.mockResolvedValueOnce([]);

    const res = mockRes();
    await getFilters({} as any, res as any);
    const payload = (res.json as any).mock.calls[0][0];
    expect(payload.channels[0].name).toBeUndefined();
  });

  it('getFilters applies state and city filters', async () => {
    (prisma as any).channel.findMany.mockResolvedValueOnce([]);
    (prisma as any).store.findMany.mockResolvedValueOnce([]);
    (prisma as any).category.findMany.mockResolvedValueOnce([]);

    const res = mockRes();
    await getFilters({ query: { state: 'pr', city: 'Curitiba' } } as any, res as any);

    const callArg = (prisma as any).store.findMany.mock.calls[0][0];
    expect(callArg.where).toEqual(expect.objectContaining({ isActive: true, state: 'PR', city: 'Curitiba' }));
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ channels: expect.any(Array), stores: expect.any(Array), categories: expect.any(Array) })
    );
  });

  it('applies channelId/storeId filters in getOverview', async () => {
    (prisma as any).sale.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 0, totalDiscount: 0, totalAmountItems: 0, deliveryFee: 0 }, _count: { id: 0 }, _avg: { totalAmount: 0, productionSeconds: 0, deliverySeconds: 0 } })
      .mockResolvedValueOnce({ _sum: { totalAmount: 0 }, _count: { id: 0 } });
    (prisma as any).sale.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    const res = mockRes();
    await getOverview({ query: { channelId: '2', storeId: '3' } } as any, res as any);
    const call = (prisma as any).sale.aggregate.mock.calls[0][0];
    expect(call.where.channelId).toBe(2);
    expect(call.where.storeId).toBe(3);
  });

  it('applies filters in getTimeSeries and exportToCSV', async () => {
    const d = new Date('2024-02-15T10:00:00Z');
    // getTimeSeries: minimal sale
    (prisma as any).sale.findMany.mockResolvedValueOnce([{ createdAt: d, totalAmount: 10 }]);
    const res1 = mockRes();
    await getTimeSeries({ query: { channelId: '4', storeId: '5', groupBy: 'day' } } as any, res1 as any);
    const call1 = (prisma as any).sale.findMany.mock.calls[0][0];
    expect(call1.where.channelId).toBe(4);
    expect(call1.where.storeId).toBe(5);

    // exportToCSV: minimal sale with productSales
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      {
        id: 10,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        productionSeconds: 120,
        deliverySeconds: 600,
        totalDiscount: 0,
        deliveryFee: 0,
        totalAmount: 50,
        saleStatusDesc: 'COMPLETED',
        channel: { name: 'App' },
        store: { name: 'Loja' },
        customerName: 'C1',
        productSales: [
          { quantity: 1, basePrice: 10, totalPrice: 10, product: { name: 'P', category: { name: 'Cat' } } },
        ],
      },
    ]);
    const res2 = mockRes();
    await exportToCSV({ query: { channelId: '6', storeId: '7', limit: '1' } } as any, res2 as any);
    const call2 = (prisma as any).sale.findMany.mock.calls.at(-1)[0];
    expect(call2.where.channelId).toBe(6);
    expect(call2.where.storeId).toBe(7);
    expect(res2.setHeader).toHaveBeenCalled();
    expect(res2.send).toHaveBeenCalled();
  });

  it('getTopProducts falls back to Unknown when product lookup returns null', async () => {
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 99, _sum: { quantity: 2, totalPrice: 20 } },
    ]);
    (prisma as any).product.findUnique.mockResolvedValueOnce(null);
    const res = mockRes();
    await getTopProducts({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ productName: 'Unknown', categoryName: 'Unknown' }),
    ]);
  });

  it('getTopProducts uses 0 when _sum fields are missing', async () => {
    (prisma as any).productSale.groupBy.mockResolvedValueOnce([
      { productId: 77, _sum: { /* totalPrice missing */ } },
    ]);
    (prisma as any).product.findUnique.mockResolvedValueOnce(null);
    const res = mockRes();
    await getTopProducts({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ totalRevenue: 0, totalQuantity: 0 }),
    ]);
  });

  it('getSalesByChannel falls back to Unknown channel info', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 123, _sum: { totalAmount: 10 }, _count: { id: 1 }, _avg: { totalAmount: 10 } },
    ]);
    (prisma as any).channel.findUnique.mockResolvedValueOnce(null);
    const res = mockRes();
    await getSalesByChannel({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ channelName: 'Unknown', channelType: 'Unknown' }),
    ]);
  });

  it('getSalesByChannel uses 0 when _avg missing', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 9, _sum: { totalAmount: 5 }, _count: { id: 1 }, _avg: {} },
    ]);
    (prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 9, name: 'C', type: 'D' });
    const res = mockRes();
    await getSalesByChannel({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ averageTicket: 0 }),
    ]);
  });

  it('getSalesByChannel uses 0 when _sum missing', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { channelId: 10, _sum: {}, _count: { id: 0 }, _avg: { totalAmount: 0 } },
    ]);
    (prisma as any).channel.findUnique.mockResolvedValueOnce({ id: 10, name: 'C2', type: 'P' });
    const res = mockRes();
    await getSalesByChannel({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ totalRevenue: 0 }),
    ]);
  });

  it('getSalesByStore falls back to Unknown store info', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { storeId: 321, _sum: { totalAmount: 10 }, _count: { id: 1 }, _avg: { totalAmount: 10 } },
    ]);
    (prisma as any).store.findUnique.mockResolvedValueOnce(null);
    const res = mockRes();
    await getSalesByStore({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ storeName: 'Unknown', city: 'Unknown' }),
    ]);
  });

  it('getSalesByStore uses 0 when _sum/_avg missing', async () => {
    (prisma as any).sale.groupBy.mockResolvedValueOnce([
      { storeId: 1, _sum: {}, _count: { id: 2 }, _avg: {} },
    ]);
    (prisma as any).store.findUnique.mockResolvedValueOnce({ id: 1, name: 'S', city: 'X' });
    const res = mockRes();
    await getSalesByStore({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ totalRevenue: 0, averageTicket: 0 }),
    ]);
  });

  it('getHourlyHeatmap returns matrix and applies filters', async () => {
    const d1 = new Date('2024-02-12T10:05:00Z');
    const d2 = new Date('2024-02-13T11:15:00Z');
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      { createdAt: d1, totalAmount: 10 },
      { createdAt: d2, totalAmount: 20 },
    ]);
    const res = mockRes();
    await getHourlyHeatmap({ query: { channelId: '1', storeId: '2' } } as any, res as any);
    const call = (prisma as any).sale.findMany.mock.calls[0][0];
    expect(call.where.channelId).toBe(1);
    expect(call.where.storeId).toBe(2);
    expect(res.json).toHaveBeenCalled();
  });

  it('exportToCSV includes Unknown fallbacks when fields are missing', async () => {
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      {
        id: 5,
        createdAt: new Date('2024-01-01T12:00:00Z'),
        productionSeconds: null,
        deliverySeconds: null,
        totalDiscount: null,
        deliveryFee: null,
        totalAmount: 20,
        saleStatusDesc: null,
        channel: null,
        store: null,
        customerName: null,
        productSales: [
          { quantity: 1, basePrice: 10, totalPrice: 10, product: { name: null, category: null } },
        ],
      },
    ]);
    const res = mockRes();
    await exportToCSV({ query: {} } as any, res as any);
    expect(res.setHeader).toHaveBeenCalled();
    expect(res.send).toHaveBeenCalled();
  });

  it('exportToCSV rejects invalid limit', async () => {
    const res = mockRes();
    await exportToCSV({ query: { limit: '0' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('exportToCSV rejects limit above max', async () => {
    const res = mockRes();
    await exportToCSV({ query: { limit: '999999' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('exportToCSV streams CSV content', async () => {
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      {
        id: 1,
        createdAt: new Date('2024-01-01T10:00:00Z'),
        productionSeconds: 120,
        deliverySeconds: 600,
        totalDiscount: 0,
        deliveryFee: 0,
        totalAmount: 50,
        saleStatusDesc: 'COMPLETED',
        channel: { name: 'App' },
        store: { name: 'Loja' },
        customerName: 'JoÃ£o',
        productSales: [
          { quantity: 2, basePrice: 10, totalPrice: 20, product: { name: 'Burger', category: { name: 'Food' } } },
        ],
      },
    ]);
    const res = mockRes();
    await exportToCSV({ query: {} } as any, res as any);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.send).toHaveBeenCalled();
  });

  it('exportToCSV when no productSales still returns header', async () => {
    (prisma as any).sale.findMany.mockResolvedValueOnce([
      {
        id: 2,
        createdAt: new Date('2024-01-02T10:00:00Z'),
        productionSeconds: null,
        deliverySeconds: null,
        totalDiscount: 0,
        deliveryFee: 0,
        totalAmount: 10,
        saleStatusDesc: 'COMPLETED',
        channel: { name: 'App' },
        store: { name: 'Loja' },
        customerName: 'Bob',
        productSales: [],
      },
    ]);
    const res = mockRes();
    await exportToCSV({ query: {} } as any, res as any);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.send).toHaveBeenCalled();
  });

  it('exportToCSV handles error', async () => {
    (prisma as any).sale.findMany.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await exportToCSV({ query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getDataQualitySummary returns numeric counters', async () => {
    (prisma as any).$queryRaw.mockResolvedValueOnce([{
      total_sales_audited: 686698,
      total_items_audited: 1601821,
      total_customers_audited: 10000,
      sales_missing_store: 1,
      sales_missing_channel: 2,
      sales_missing_created_at: 0,
      negative_total_amount: 0,
      non_positive_item_qty: 3,
      orphan_product_sales: 4,
      customers_missing_email: 5,
      customers_invalid_email: 6,
    }]);
    const res = mockRes();
    const { getDataQualitySummary } = await import('@/controllers/metricsController');
    await getDataQualitySummary({} as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalSalesAudited: 686698,
      totalItemsAudited: 1601821,
      totalCustomersAudited: 10000,
      salesMissingStore: 1,
      salesMissingChannel: 2,
      nonPositiveItemQty: 3,
      customersInvalidEmail: 6,
    }));
  });

  it('getDataQualityTrend returns time series rows', async () => {
    (prisma as any).$queryRaw.mockResolvedValueOnce([
      {
        date: '2025-01-01',
        sales_missing_store: 1,
        sales_missing_channel: 0,
        sales_missing_created_at: 0,
        negative_total_amount: 0,
        non_positive_item_qty: 2,
        orphan_product_sales: 0,
        customers_missing_email: 0,
        customers_invalid_email: 1,
      },
    ]);
    const res = mockRes();
    const { getDataQualityTrend } = await import('@/controllers/metricsController');
    await getDataQualityTrend({ query: { days: '7' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ date: '2025-01-01', customersInvalidEmail: 1 }),
    ]);
  });

  it('getDataQualityTrend maps falsy numeric fields to 0', async () => {
    (prisma as any).$queryRaw.mockResolvedValueOnce([
      {
        date: '2025-01-02',
        sales_missing_store: 0,
        sales_missing_channel: 0,
        sales_missing_created_at: 0,
        negative_total_amount: 0,
        non_positive_item_qty: 0,
        orphan_product_sales: 0,
        customers_missing_email: 0,
        customers_invalid_email: 0,
      },
    ]);
    const res = mockRes();
    const { getDataQualityTrend } = await import('@/controllers/metricsController');
    await getDataQualityTrend({ query: { days: '7' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({
        date: '2025-01-02',
        salesMissingStore: 0,
        nonPositiveItemQty: 0,
        customersInvalidEmail: 0,
      }),
    ]);
  });

  it('getDataQualitySummary handles error', async () => {
    (prisma as any).$queryRaw.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    const { getDataQualitySummary } = await import('@/controllers/metricsController');
    await getDataQualitySummary({} as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getDataQualitySummary handles empty rows', async () => {
    (prisma as any).$queryRaw.mockResolvedValueOnce(null);
    const res = mockRes();
    const { getDataQualitySummary } = await import('@/controllers/metricsController');
    await getDataQualitySummary({} as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      totalSalesAudited: 0,
      totalItemsAudited: 0,
      totalCustomersAudited: 0,
      salesMissingStore: 0,
      customersInvalidEmail: 0,
    }));
  });

  it('getDataQualityTrend handles error', async () => {
    (prisma as any).$queryRaw.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    const { getDataQualityTrend } = await import('@/controllers/metricsController');
    await getDataQualityTrend({ query: { days: '7' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getDataQualityTrend handles missing days and empty rows', async () => {
    (prisma as any).$queryRaw.mockResolvedValueOnce(null);
    const res = mockRes();
    const { getDataQualityTrend } = await import('@/controllers/metricsController');
    await getDataQualityTrend({ query: {} } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([]);
  });
});


