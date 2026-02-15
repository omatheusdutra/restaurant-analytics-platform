import { runExploreQuery, __private as explorePrivate } from '@/controllers/exploreController';
import prisma from '@/config/database';
import { Prisma } from '@prisma/client';

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
  res.setHeader = jest.fn();
  res.send = jest.fn();
  return res;
}

function mockCountAndRows(rows: any[]) {
  (prisma as any).$queryRaw
    .mockResolvedValueOnce([{ total: BigInt(rows.length) }])
    .mockResolvedValueOnce(rows);
}

describe('exploreController unit', () => {

  it('escapeCsvCell helper handles nullish and formula prefixes', () => {
    expect(explorePrivate.escapeCsvCell(undefined)).toBe('""');
    expect(explorePrivate.escapeCsvCell('=1+1')).toBe("\"\'=1+1\"");
  });

  beforeEach(() => jest.clearAllMocks());

  it('returns JSON rows for simple query without dimension', async () => {
    mockCountAndRows([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: 100, orders: 2 }]);
    const req: any = {
      method: 'POST',
      body: {
        measures: ['revenue'],
        time_grain: 'day',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        storeIds: [1],
        channelIds: [2],
      },
      query: {},
    };
    const res = mockRes();
    await runExploreQuery(req, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ revenue: 100 })]),
        total: 1,
        page: 1,
        pageSize: 50,
      })
    );
  });

  it('accepts measures as a single string', async () => {
    mockCountAndRows([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: 10 }]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: 'revenue', time_grain: 'day' },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ revenue: 10 })]),
      })
    );
  });

  it('returns JSON rows with dimension and respects top', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(100) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-01-01T00:00:00Z'), dim: 'iFood', orders: 5 }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['orders'], time_grain: 'week', dimension: 'channel', top: 10 },
      query: {},
    } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ dim: 'iFood' })]),
        total: 10,
      })
    );
  });

  it('supports CSV export via format=csv', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-02-01T00:00:00Z'), revenue: 200 }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'month' },
      query: { format: 'csv' },
    } as any, res as any);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('revenue'));
  });

  it('includes product joins when needed (dimension=product)', async () => {
    mockCountAndRows([{ ts: new Date('2024-03-01T00:00:00Z'), dim: 'Burger', revenue: 300 }]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'month', dimension: 'product', categoryIds: [1, 2] },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ dim: 'Burger' })]),
      })
    );
  });

  it('validates time_grain', async () => {
    const res = mockRes();
    await runExploreQuery({ method: 'POST', body: { measures: ['revenue'], time_grain: 'bad' }, query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid time_grain' }));
  });

  it('validates dimension', async () => {
    const res = mockRes();
    await runExploreQuery({ method: 'POST', body: { measures: ['revenue'], time_grain: 'day', dimension: 'bad' }, query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid dimension' }));
  });

  it('validates measures', async () => {
    const res = mockRes();
    await runExploreQuery({ method: 'POST', body: { measures: ['foo'], time_grain: 'day' }, query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('invalid measure') }));
  });

  it('handles internal error', async () => {
    (prisma as any).$queryRaw.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await runExploreQuery({ method: 'POST', body: { measures: ['revenue'], time_grain: 'day' }, query: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('accepts GET with defaults (covers query branch and defaults)', async () => {
    mockCountAndRows([]);
    const res = mockRes();
    await runExploreQuery({ method: 'GET', query: {} } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rows: [] }));
  });

  it('CSV export with dimension triggers dim header/quoting', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-02-01T00:00:00Z'), dim: 'Canal "X"', orders: 3 }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['orders'], time_grain: 'day', dimension: 'channel' },
      query: { format: 'csv' },
    } as any, res as any);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('dim'));
  });

  it('ignores empty id lists (addIdList early return)', async () => {
    mockCountAndRows([]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { storeIds: '', channelIds: undefined, measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rows: [] }));
  });

  it('accepts array ids for storeIds/channelIds', async () => {
    mockCountAndRows([]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', storeIds: [1, 2], channelIds: [3] },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rows: [] }));
  });

  it('accepts string ids ("1,2")', async () => {
    mockCountAndRows([]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['orders'], time_grain: 'day', storeIds: '1,2', channelIds: '3' },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rows: [] }));
  });

  it('ignores non-numeric ids in list (ids length == 0)', async () => {
    mockCountAndRows([]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['orders'], time_grain: 'day', storeIds: 'a,b' },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rows: [] }));
  });

  it('sets both CSV headers (Content-Type and Content-Disposition)', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-04-01T00:00:00Z'), revenue: 1 }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: { format: 'csv' },
    } as any, res as any);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      expect.stringMatching(/^attachment; filename=explore-/)
    );
  });

  it('needsProduct=true with empty categoryIds still works (early return in addIdList)', async () => {
    mockCountAndRows([]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['net_revenue'], time_grain: 'day', categoryIds: '' },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rows: [] }));
  });

  it('rejects too many measures', async () => {
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue', 'orders', 'avg_ticket', 'cancels', 'avg_delivery_minutes', 'net_revenue', 'revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'too many measures' }));
  });

  it('rejects invalid top (<= 0)', async () => {
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['orders'], time_grain: 'day', dimension: 'channel', top: 0 },
      query: {},
    } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid top' }));
  });

  it('rejects top greater than max', async () => {
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['orders'], time_grain: 'day', dimension: 'channel', top: 1000 },
      query: {},
    } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'top exceeds max' }));
  });

  it('rejects too many ids in filter list', async () => {
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', storeIds: Array.from({ length: 101 }, (_, i) => i + 1) },
      query: {},
    } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('too many ids') }));
  });

  it('rejects invalid page and pageSize', async () => {
    const res1 = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', page: 0 },
      query: {},
    } as any, res1 as any);
    expect(res1.status).toHaveBeenCalledWith(400);
    expect(res1.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid page' }));

    const res2 = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', pageSize: 500 },
      query: {},
    } as any, res2 as any);
    expect(res2.status).toHaveBeenCalledWith(400);
    expect(res2.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid pageSize' }));
  });
  it('rejects invalid startDate', async () => {
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', startDate: 'not-a-date' },
      query: {},
    } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid startDate' }));
  });

  it('rejects invalid endDate', async () => {
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', endDate: 'also-not-a-date' },
      query: {},
    } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'invalid endDate' }));
  });

  it('normalizes Prisma.Decimal values in rows', async () => {
    const decimalValue = new Prisma.Decimal('12.34');
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: decimalValue }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ revenue: 12.34 })]),
      })
    );
  });

  it('normalizes decimal-like objects using toNumber/toString fallback', async () => {
    class DecimalLike {
      toNumber() {
        return Number.POSITIVE_INFINITY;
      }
      toString() {
        return '999999999999999999.99';
      }
    }

    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: new DecimalLike() }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ revenue: '999999999999999999.99' })]),
      })
    );
  });
  it('normalizes unsafe bigint totals (non safe integer branch)', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt('9007199254740993') }])
      .mockResolvedValueOnce([]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 9007199254740992,
      })
    );
  });

  it('normalizes Prisma.Decimal non-finite values using toString fallback', async () => {
    const hugeDecimal = new Prisma.Decimal('1e9999');
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: hugeDecimal }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(typeof payload.rows[0].revenue).toBe('string');
  });

  it('does not treat non-decimal classes as decimal-like', async () => {
    class NumberLike {
      toNumber() {
        return 7;
      }
      toString() {
        return '7';
      }
    }

    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: new NumberLike() }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.rows[0].revenue).toEqual({});
  });
  it('handles decimal-like object with missing constructor name', async () => {
    const decimalLikeNoCtor = {
      constructor: undefined,
      toNumber: () => 55,
      toString: () => '55',
    };

    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: decimalLikeNoCtor }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    const payload = (res.json as jest.Mock).mock.calls[0][0];
    expect(payload.rows[0].revenue).toEqual(expect.objectContaining({ constructor: undefined }));
  });

  it('normalizes decimal-like classes with finite toNumber', async () => {
    class DecimalFinite {
      toNumber() {
        return 42;
      }
      toString() {
        return '42';
      }
    }

    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-01-01T00:00:00Z'), revenue: new DecimalFinite() }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rows: expect.arrayContaining([expect.objectContaining({ revenue: 42 })]),
      })
    );
  });

  it('handles empty array id lists and keeps query running', async () => {
    mockCountAndRows([]);
    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', storeIds: [] },
      query: {},
    } as any, res as any);
    expect((prisma as any).$queryRaw).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ rows: [] }));
  });

  it('handles empty count result using nullish fallback', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day' },
      query: {},
    } as any, res as any);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        total: 0,
        rows: [],
      })
    );
  });



  it('CSV escapes formula-like values to prevent injection', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-06-01T00:00:00Z'), dim: '=2+2', revenue: 10 }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', dimension: 'channel' },
      query: { format: 'csv' },
    } as any, res as any);

    const csv = (res.send as jest.Mock).mock.calls[0][0] as string;    expect(csv).toContain("\"'=2+2\"");
  });

  it('covers CSV null fallbacks for dim and measure values', async () => {
    (prisma as any).$queryRaw
      .mockResolvedValueOnce([{ total: BigInt(1) }])
      .mockResolvedValueOnce([{ ts: new Date('2024-05-01T00:00:00Z'), dim: null }]);

    const res = mockRes();
    await runExploreQuery({
      method: 'POST',
      body: { measures: ['revenue'], time_grain: 'day', dimension: 'channel' },
      query: { format: 'csv' },
    } as any, res as any);

    const csv = (res.send as jest.Mock).mock.calls[0][0] as string;
    expect(csv).toContain('""');
    expect(csv).toContain(',0');
  });
});


