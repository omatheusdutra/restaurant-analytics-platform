describe('env config', () => {
  const OLD = { ...process.env } as any;
  afterEach(() => { process.env = { ...OLD }; jest.resetModules(); });

  it('throws in development when critical envs are missing', async () => {
    process.env.NODE_ENV = 'development';
    process.env.DATABASE_URL = '';
    process.env.JWT_SECRET = '';
    process.env.CORS_ORIGIN = '';
    const mod = await import('@/config/env');
    expect(() => mod.validateEnv()).toThrow();
  });

  it('throws in production when critical envs are missing', async () => {
    process.env.NODE_ENV = 'production';
    process.env.DATABASE_URL = '';
    process.env.JWT_SECRET = '';
    const mod = await import('@/config/env');
    expect(() => mod.validateEnv()).toThrow();
  });

  it('warns (does not throw) in test when critical envs are missing', async () => {
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = '';
    process.env.JWT_SECRET = '';
    process.env.CORS_ORIGIN = '';
    const spy = jest.spyOn(console, 'warn').mockImplementation(() => undefined as any);
    const mod = await import('@/config/env');
    expect(() => mod.validateEnv()).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('log respects LOG_LEVEL and calls appropriate console methods', async () => {
    process.env.LOG_LEVEL = 'debug';
    const mod = await import('@/config/env');
    const spyErr = jest.spyOn(console, 'error').mockImplementation(() => undefined as any);
    const spyWarn = jest.spyOn(console, 'warn').mockImplementation(() => undefined as any);
    const spyInfo = jest.spyOn(console, 'info').mockImplementation(() => undefined as any);
    const consoleAny: any = console as any;
    const hasDebug = typeof consoleAny.debug === 'function';
    const spyDebug = hasDebug
      ? jest.spyOn(consoleAny, 'debug').mockImplementation(() => undefined as any)
      : jest.spyOn(console, 'log').mockImplementation(() => undefined as any);
    mod.log('error', 'e');
    mod.log('warn', 'w');
    mod.log('info', 'i');
    mod.log('debug', 'd');
    expect(spyErr).toHaveBeenCalled();
    expect(spyWarn).toHaveBeenCalled();
    expect(spyInfo).toHaveBeenCalled();
    expect(spyDebug).toHaveBeenCalled();
    spyErr.mockRestore();
    spyWarn.mockRestore();
    spyInfo.mockRestore();
    spyDebug.mockRestore();
  });

  it('parses CORS_ORIGIN default and single origin string', async () => {
    // Ensure dotenv does not override our desired state
    process.env.CORS_ORIGIN = '';
    jest.resetModules();
    const mod1 = await import('@/config/env');
    expect(mod1.env.CORS_ORIGIN).toBe('http://localhost:3000');

    jest.resetModules();
    process.env.CORS_ORIGIN = 'http://localhost:3000';
    const mod2 = await import('@/config/env');
    expect(mod2.env.CORS_ORIGIN).toBe('http://localhost:3000');
  });

  it('parses CORS_ORIGIN list into array', async () => {
    process.env.CORS_ORIGIN = 'http://a.com, http://b.com ,http://c.com';
    const mod = await import('@/config/env');
    expect(Array.isArray(mod.env.CORS_ORIGIN)).toBe(true);
    expect(mod.env.CORS_ORIGIN).toEqual([
      'http://a.com',
      'http://b.com',
      'http://c.com',
    ]);
  });
});

