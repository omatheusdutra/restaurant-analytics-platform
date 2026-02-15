import { authMiddleware } from '@/middleware/auth';
import jwt from 'jsonwebtoken';

jest.mock('jsonwebtoken', () => ({
  __esModule: true,
  verify: jest.fn(() => ({ userId: 42 })),
  default: { verify: jest.fn(() => ({ userId: 42 })) },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authMiddleware', () => {
  it('rejects when no token is present', () => {
    const req: any = { headers: {} };
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts a valid token and sets req.userId', () => {
    const req: any = { headers: { authorization: 'Bearer abc' } };
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req, res as any, next);
    expect(req.userId).toBe(42);
    expect(next).toHaveBeenCalled();
  });

  it('rejects an invalid token', () => {
    const v = (jwt as any).verify || (jwt as any).default.verify;
    v.mockImplementationOnce(() => { throw new Error('bad'); });
    const req: any = { headers: { authorization: 'Bearer bad' } };
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
    expect(next).not.toHaveBeenCalled();
  });

  it('uses JWT_SECRET from env', () => {
    const req: any = { headers: { authorization: 'Bearer abc' } };
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req, res as any, next);
    const v = (jwt as any).verify || (jwt as any).default.verify;
    expect(v).toHaveBeenCalledWith('abc', 'test-secret');
  });

  it('accepts token from auth cookie and decodes URI component', () => {
    const req: any = { headers: { cookie: 'nextage_auth=abc%20123; other=1' } };
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req, res as any, next);
    expect(next).toHaveBeenCalled();
    const v = (jwt as any).verify || (jwt as any).default.verify;
    expect(v).toHaveBeenCalledWith('abc 123', 'test-secret');
  });

  it('rejects when cookie does not contain expected auth cookie', () => {
    const req: any = { headers: { cookie: 'other=token' } };
    const res = mockRes();
    const next = jest.fn();
    authMiddleware(req, res as any, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

});
