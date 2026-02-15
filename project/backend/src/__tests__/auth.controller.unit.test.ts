import { register, login, getProfile, updateProfile, changePassword } from '@/controllers/authController';
import prisma from '@/config/database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('bcryptjs', () => ({
  __esModule: true,
  default: {
    hash: jest.fn(async () => 'hash'),
    compare: jest.fn(async () => true),
  },
}));

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  default: {
    sign: jest.fn(() => 'token'),
  },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authController unit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('register returns 400 when user already exists', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 1 });
    const req: any = { body: { email: 'a@a.com', password: '123456', name: 'A' } };
    const res = mockRes();
    await register(req, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('register success returns 201 with token', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    (prisma as any).user.create.mockResolvedValueOnce({ id: 1, email: 'a@a.com', name: 'A' });
    const req: any = { body: { email: 'a@a.com', password: '123456', name: 'A' } };
    const res = mockRes();
    await register(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it('register handles prisma error (500)', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    (prisma as any).user.create.mockRejectedValueOnce(new Error('db'));
    const req: any = { body: { email: 'a@a.com', password: '123456', name: 'A' } };
    const res = mockRes();
    await register(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('login handles prisma error (500)', async () => {
    (prisma as any).user.findUnique.mockRejectedValueOnce(new Error('db'));
    const req: any = { body: { email: 'a@a.com', password: '123456' } };
    const res = mockRes();
    await login(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('login success returns user and token', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 1, email: 'a@a.com', name: 'A', password: 'hash' });
    (bcrypt as any).compare.mockResolvedValueOnce(true);
    const req: any = { body: { email: 'a@a.com', password: '123456' } };
    const res = mockRes();
    await login(req as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));
  });

  it('login 401 when user not found', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    const req: any = { body: { email: 'a@a.com', password: '123456' } };
    const res = mockRes();
    await login(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('login 401 when password invalid', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 1, password: 'hash' });
    (bcrypt as any).compare.mockResolvedValueOnce(false);
    const req: any = { body: { email: 'a@a.com', password: 'bad' } };
    const res = mockRes();
    await login(req as any, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('getProfile 404 when user not found', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    const req: any = { userId: 999 };
    const res = mockRes();
    await getProfile(req, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getProfile 500 on prisma error', async () => {
    (prisma as any).user.findUnique.mockRejectedValueOnce(new Error('db'));
    const req: any = { userId: 1 };
    const res = mockRes();
    await getProfile(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getProfile success', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 1, email: 'a@a.com', name: 'A', createdAt: new Date() });
    const req: any = { userId: 1 };
    const res = mockRes();
    await getProfile(req, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ email: 'a@a.com' }));
  });


  it('updateProfile success', async () => {
    (prisma as any).user.update.mockResolvedValueOnce({ id: 1, email: 'a@a.com', name: 'B' });
    const req: any = { userId: 1, body: { name: 'B' } };
    const res = mockRes();
    await updateProfile(req, res as any);
    expect(res.json).toHaveBeenCalledWith({ id: 1, email: 'a@a.com', name: 'B' });
  });

  it('updateProfile 500 on prisma error path', async () => {
    (prisma as any).user.update.mockRejectedValueOnce(new Error('db'));
    const req: any = { userId: 1, body: { name: 'B' } };
    const res = mockRes();
    await updateProfile(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  

  it('changePassword 401 when current password invalid', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 1, password: 'hash' });
    (bcrypt as any).compare.mockResolvedValueOnce(false);
    const req: any = { userId: 1, body: { currentPassword: 'x', newPassword: '123456' } };
    const res = mockRes();
    await changePassword(req, res as any);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('changePassword 404 when user not found', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    const req: any = { userId: 1, body: { currentPassword: 'x', newPassword: '123456' } };
    const res = mockRes();
    await changePassword(req, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });


  

  it('changePassword success', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 1, password: 'hash' });
    (bcrypt as any).compare.mockResolvedValueOnce(true);
    (bcrypt as any).hash.mockResolvedValueOnce('h2');
    (prisma as any).user.update.mockResolvedValueOnce({});
    const req: any = { userId: 1, body: { currentPassword: 'x', newPassword: '123456' } };
    const res = mockRes();
    await changePassword(req, res as any);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('changePassword 500 on prisma error', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 1, password: 'hash' });
    (bcrypt as any).compare.mockResolvedValueOnce(true);
    (bcrypt as any).hash.mockResolvedValueOnce('h2');
    (prisma as any).user.update.mockRejectedValueOnce(new Error('db'));
    const req: any = { userId: 1, body: { currentPassword: 'x', newPassword: '123456' } };
    const res = mockRes();
    await changePassword(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });



  it('register returns 403 when registration is disabled in production', async () => {
    const prevAllow = env.ALLOW_REGISTRATION;
    const prevNode = env.NODE_ENV;
    env.ALLOW_REGISTRATION = false as any;
    env.NODE_ENV = 'production' as any;

    const req: any = { body: { email: 'a@a.com', password: '123456', name: 'A' } };
    const res = mockRes();
    await register(req, res as any);

    expect(res.status).toHaveBeenCalledWith(403);
    env.ALLOW_REGISTRATION = prevAllow as any;
    env.NODE_ENV = prevNode as any;
  });

  it('sets auth cookie on register/login and clears on logout', async () => {
    const prevSecure = env.AUTH_COOKIE_SECURE;
    env.AUTH_COOKIE_SECURE = true as any;

    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    (prisma as any).user.create.mockResolvedValueOnce({ id: 11, email: 'cookie@x.com', name: 'Cookie' });
    const resReg: any = mockRes();
    resReg.cookie = jest.fn();
    await register({ body: { email: 'cookie@x.com', password: '123456', name: 'Cookie' } } as any, resReg);
    expect(resReg.cookie).toHaveBeenCalledWith(
      env.AUTH_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ sameSite: 'none', secure: true, httpOnly: true })
    );

    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 11, email: 'cookie@x.com', name: 'Cookie', password: 'hash' });
    (bcrypt as any).compare.mockResolvedValueOnce(true);
    const resLogin: any = mockRes();
    resLogin.cookie = jest.fn();
    await login({ body: { email: 'cookie@x.com', password: '123456' } } as any, resLogin);
    expect(resLogin.cookie).toHaveBeenCalled();

    const { logout } = await import('@/controllers/authController');
    const resLogout: any = mockRes();
    resLogout.clearCookie = jest.fn();
    await logout({} as any, resLogout);
    expect(resLogout.clearCookie).toHaveBeenCalledWith(
      env.AUTH_COOKIE_NAME,
      expect.objectContaining({ sameSite: 'none', secure: true, httpOnly: true })
    );

    const resLogoutNoFn: any = mockRes();
    await logout({} as any, resLogoutNoFn);
    expect(resLogoutNoFn.json).toHaveBeenCalledWith({ success: true });

    env.AUTH_COOKIE_SECURE = prevSecure as any;
  });



  it('uses lax sameSite cookie options when secure cookie is disabled', async () => {
    const prevSecure = env.AUTH_COOKIE_SECURE;
    env.AUTH_COOKIE_SECURE = false as any;

    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    (prisma as any).user.create.mockResolvedValueOnce({ id: 21, email: 'lax@x.com', name: 'Lax' });
    const res: any = mockRes();
    res.cookie = jest.fn();
    await register({ body: { email: 'lax@x.com', password: '123456', name: 'Lax' } } as any, res);

    expect(res.cookie).toHaveBeenCalledWith(
      env.AUTH_COOKIE_NAME,
      expect.any(String),
      expect.objectContaining({ sameSite: 'lax', secure: false })
    );

    const { logout } = await import('@/controllers/authController');
    const resLogout: any = mockRes();
    resLogout.clearCookie = jest.fn();
    await logout({} as any, resLogout);
    expect(resLogout.clearCookie).toHaveBeenCalledWith(
      env.AUTH_COOKIE_NAME,
      expect.objectContaining({ sameSite: 'lax', secure: false })
    );

    env.AUTH_COOKIE_SECURE = prevSecure as any;
  });

  it('register/login use JWT_SECRET from env', async () => {
    (prisma as any).user.findUnique.mockResolvedValueOnce(null);
    (prisma as any).user.create.mockResolvedValueOnce({ id: 7, email: 'x@x.com', name: 'X' });
    const reqReg: any = { body: { email: 'x@x.com', password: '123456', name: 'X' } };
    const resReg = mockRes();
    await register(reqReg as any, resReg as any);
    const js: any = (jwt as any).default || (jwt as any);
    expect(js.sign).toHaveBeenCalledWith(expect.any(Object), 'test-secret', expect.any(Object));

    jest.clearAllMocks();
    (prisma as any).user.findUnique.mockResolvedValueOnce({ id: 7, email: 'x@x.com', name: 'X', password: 'hash' });
    (bcrypt as any).compare.mockResolvedValueOnce(true);
    const reqLog: any = { body: { email: 'x@x.com', password: '123456' } };
    const resLog = mockRes();
    await login(reqLog as any, resLog as any);
    expect(js.sign).toHaveBeenCalledWith(expect.any(Object), 'test-secret', expect.any(Object));
  });
});
