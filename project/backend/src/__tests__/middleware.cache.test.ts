import { cacheMiddleware } from '@/middleware/cache';

function mockReqRes(method = 'GET', path = '/x', query: any = {}) {
  const req: any = { method, path, query };
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  const next = jest.fn();
  return { req, res, next };
}

describe('cacheMiddleware', () => {
  it('bypasses non-GET methods', () => {
    const { req, res, next } = mockReqRes('POST');
    cacheMiddleware()(req as any, res as any, next);
    expect(next).toHaveBeenCalled();
  });

  it('caches GET responses and serves from cache', () => {
    const { req, res, next } = mockReqRes('GET', '/abc', { a: '1' });
    const mw = cacheMiddleware(60_000);

    // First pass: override res.json and cache the value
    mw(req as any, res as any, next);
    expect(next).toHaveBeenCalledTimes(1);
    res.json({ ok: true });

    // Second pass: should hit cache and not call next
    const { req: req2, res: res2, next: next2 } = mockReqRes('GET', '/abc', { a: '1' });
    mw(req2 as any, res2 as any, next2);
    expect(res2.json).toHaveBeenCalledWith({ ok: true });
    expect(next2).not.toHaveBeenCalled();
  });

  it('expires cache according to duration', async () => {
    const mw = cacheMiddleware(1); // 1ms
    const { req, res, next } = mockReqRes('GET', '/exp', {});
    mw(req as any, res as any, next);
    res.json({ v: 1 });

    await new Promise(r => setTimeout(r, 5));
    const { req: rq2, res: rs2, next: nx2 } = mockReqRes('GET', '/exp', {});
    mw(rq2 as any, rs2 as any, nx2);
    expect(nx2).toHaveBeenCalled();
  });

  it('background sweeper clears old entries', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    // Ensure cache module (and its setInterval) is registered under fake timers
    jest.resetModules();
    const mod = await import('@/middleware/cache');
    const mw = mod.cacheMiddleware(); // default 5 min duration

    // Seed cache at T0
    const { req, res, next } = mockReqRes('GET', '/sweep', {});
    mw(req as any, res as any, next);
    res.json({ v: 1 });

    // Advance clock beyond cache duration so entry is stale
    jest.setSystemTime(new Date('2024-01-01T00:06:00Z')); // +6 min
    // Trigger setInterval sweep (runs every 10 minutes)
    jest.advanceTimersByTime(10 * 60 * 1000);

    // Now request again: should not return cached (will call next)
    const { req: rq2, res: rs2, next: nx2 } = mockReqRes('GET', '/sweep', {});
    mw(rq2 as any, rs2 as any, nx2);
    expect(nx2).toHaveBeenCalled();

    jest.useRealTimers();
  });

  it('clearCache() removes all cached entries immediately', async () => {
    jest.resetModules();
    const mod = await import('@/middleware/cache');
    const mw = mod.cacheMiddleware(60_000);
    const { req, res, next } = mockReqRes('GET', '/clear', { q: '1' });
    // Seed a cached response
    mw(req as any, res as any, next);
    res.json({ ok: true });

    // Sanity: second call should be served from cache now
    const { req: r2, res: s2, next: n2 } = mockReqRes('GET', '/clear', { q: '1' });
    mw(r2 as any, s2 as any, n2);
    expect(s2.json).toHaveBeenCalledWith({ ok: true });

    // Import and invoke clearCache then ensure next() runs (no cache)
    mod.clearCache();

    const { req: r3, res: s3, next: n3 } = mockReqRes('GET', '/clear', { q: '1' });
    mw(r3 as any, s3 as any, n3);
    expect(n3).toHaveBeenCalled();
  });
});
