import {
  createDashboard,
  getDashboards,
  getDashboard,
  updateDashboard,
  deleteDashboard,
  getSharedDashboard,
} from '@/controllers/dashboardController';
import prisma from '@/config/database';

jest.mock('@/config/database', () => ({
  __esModule: true,
  default: {
    dashboard: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('dashboardController unit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('createDashboard 400 without name/layout', async () => {
    const req: any = { userId: 1, body: {} };
    const res = mockRes();
    await createDashboard(req, res as any);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('createDashboard 201 success with public shareToken', async () => {
    (prisma as any).dashboard.create.mockResolvedValueOnce({ id: 1, name: 'Dash', shareToken: 'tok' });
    const req: any = { userId: 1, body: { name: 'Dash', layout: {}, isPublic: true } };
    const res = mockRes();
    await createDashboard(req, res as any);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('createDashboard 500 on error', async () => {
    (prisma as any).dashboard.create.mockRejectedValueOnce(new Error('x'));
    const req: any = { userId: 1, body: { name: 'Dash', layout: {} } };
    const res = mockRes();
    await createDashboard(req, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getDashboards ok', async () => {
    (prisma as any).dashboard.findMany.mockResolvedValueOnce([{ id: 1 }]);
    const res = mockRes();
    await getDashboards({ userId: 1 } as any, res as any);
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  it('getDashboards 500 on error', async () => {
    (prisma as any).dashboard.findMany.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getDashboards({ userId: 1 } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getDashboard 404 when missing', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce(null);
    const res = mockRes();
    await getDashboard({ userId: 1, params: { id: '9' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getDashboard ok', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 9 });
    const res = mockRes();
    await getDashboard({ userId: 1, params: { id: '9' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith({ id: 9 });
  });

  it('getDashboard 500 on error', async () => {
    (prisma as any).dashboard.findFirst.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getDashboard({ userId: 1, params: { id: '9' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('updateDashboard not found', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce(null);
    const res = mockRes();
    await updateDashboard({ userId: 1, params: { id: '1' }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('updateDashboard success toggling public false clears shareToken', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 1, name: 'D', layout: {}, isPublic: true, shareToken: 'x' });
    (prisma as any).dashboard.update.mockResolvedValueOnce({ id: 1, name: 'D2' });
    const res = mockRes();
    await updateDashboard({ userId: 1, params: { id: '1' }, body: { isPublic: false } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith({ id: 1, name: 'D2' });
  });

  it('updateDashboard sets shareToken when making public', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 1, name: 'D', layout: {}, isPublic: false, shareToken: null });
    (prisma as any).dashboard.update.mockResolvedValueOnce({ id: 1, isPublic: true, shareToken: 'generated' });
    const res = mockRes();
    await updateDashboard({ userId: 1, params: { id: '1' }, body: { isPublic: true } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isPublic: true }));
  });

  it('updateDashboard updates description when provided (ternary branch)', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 1, name: 'D', layout: {}, isPublic: false, shareToken: null, description: 'old' });
    (prisma as any).dashboard.update.mockResolvedValueOnce({ id: 1, description: 'new' });
    const res = mockRes();
    await updateDashboard({ userId: 1, params: { id: '1' }, body: { description: 'new' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ description: 'new' }));
  });

  it('updateDashboard keeps existing shareToken when already public', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 1, name: 'D', layout: {}, isPublic: true, shareToken: 'keep' });
    (prisma as any).dashboard.update.mockResolvedValueOnce({ id: 1, name: 'D', isPublic: true, shareToken: 'keep' });
    const res = mockRes();
    await updateDashboard({ userId: 1, params: { id: '1' }, body: { isPublic: true } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ shareToken: 'keep' }));
  });

  it('updateDashboard 500 on error', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 1, name: 'D', layout: {}, isPublic: false, shareToken: null });
    (prisma as any).dashboard.update.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await updateDashboard({ userId: 1, params: { id: '1' }, body: {} } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('deleteDashboard not found', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce(null);
    const res = mockRes();
    await deleteDashboard({ userId: 1, params: { id: '1' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deleteDashboard success', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 1 });
    (prisma as any).dashboard.delete.mockResolvedValueOnce({});
    const res = mockRes();
    await deleteDashboard({ userId: 1, params: { id: '1' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith({ message: 'Dashboard deleted successfully' });
  });

  it('deleteDashboard 500 on error', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({ id: 1 });
    (prisma as any).dashboard.delete.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await deleteDashboard({ userId: 1, params: { id: '1' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('getSharedDashboard not found', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce(null);
    const res = mockRes();
    await getSharedDashboard({ params: { shareToken: 'nope' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('getSharedDashboard success', async () => {
    (prisma as any).dashboard.findFirst.mockResolvedValueOnce({
      id: 2,
      name: 'Public',
      description: 'd',
      layout: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { name: 'Alice' },
    });
    const res = mockRes();
    await getSharedDashboard({ params: { shareToken: 'ok' } } as any, res as any);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ name: 'Public', createdBy: 'Alice' }));
  });

  it('getSharedDashboard 500 on error', async () => {
    (prisma as any).dashboard.findFirst.mockRejectedValueOnce(new Error('x'));
    const res = mockRes();
    await getSharedDashboard({ params: { shareToken: 'ok' } } as any, res as any);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
