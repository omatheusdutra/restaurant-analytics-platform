describe('env extras', () => {
  const OLD = { ...process.env } as any;
  afterEach(() => { process.env = { ...OLD }; jest.resetModules(); });

  it('PORT parses to number and LOG_LEVEL defaults to info', async () => {
    delete process.env.PORT;
    delete process.env.LOG_LEVEL;
    const mod1 = await import('@/config/env');
    expect(mod1.env.PORT).toBe(3001);
    expect(mod1.env.LOG_LEVEL).toBe('info');

    jest.resetModules();
    process.env.PORT = '3010';
    const mod2 = await import('@/config/env');
    expect(mod2.env.PORT).toBe(3010);
  });

  it('NODE_ENV is lowercased and LOG_LEVEL uses provided value', async () => {
    process.env.NODE_ENV = 'PRODUCTION';
    process.env.LOG_LEVEL = 'warn';
    const mod = await import('@/config/env');
    expect(mod.env.NODE_ENV).toBe('production');
    expect(mod.env.LOG_LEVEL).toBe('warn');
  });

  it('defaults kick in when env vars are set but empty', async () => {
    process.env.PORT = '' as any;
    process.env.LOG_LEVEL = '' as any;
    process.env.NODE_ENV = '' as any;
    const mod = await import('@/config/env');
    expect(mod.env.PORT).toBe(3001);
    expect(mod.env.LOG_LEVEL).toBe('info');
    expect(mod.env.NODE_ENV).toBe('development');
  });

  it('log falls back to console.log when console[level] is missing', async () => {
    process.env.LOG_LEVEL = 'debug';
    const mod = await import('@/config/env');
    const original = (console as any).debug;
    // delete console.debug to force fallback
    // @ts-ignore
    (console as any).debug = undefined;
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined as any);
    mod.log('debug', 'x');
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
    // restore
    (console as any).debug = original;
  });
});
