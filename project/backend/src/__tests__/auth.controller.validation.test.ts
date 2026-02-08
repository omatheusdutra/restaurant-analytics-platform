describe('authController validation branches', () => {
  it('register/login/updateProfile/changePassword return 400 when validator reports errors', async () => {
    jest.isolateModules(async () => {
      jest.doMock('express-validator', () => ({
        __esModule: true,
        body: () => ({
          isEmail: () => ({ withMessage: () => ({}) }),
          isLength: () => ({ withMessage: () => ({}) }),
          notEmpty: () => ({ withMessage: () => ({}) }),
        }),
        validationResult: () => ({ isEmpty: () => false, array: () => [{ msg: 'err' }] }),
      }));
      const { register, login, updateProfile, changePassword } = await import('@/controllers/authController');
      const res: any = { status: jest.fn().mockReturnValueThis?.() || null, json: jest.fn() };
      if (!res.status) { res.status = jest.fn().mockReturnValue(res); }
      const reqRegister: any = { body: { email: 'bad', password: '1', name: '' } };
      await register(reqRegister, res);
      expect(res.status).toHaveBeenCalledWith(400);

      const reqLogin: any = { body: { email: 'bad', password: '' } };
      await login(reqLogin, res);
      expect(res.status).toHaveBeenCalledWith(400);
      const reqUpdate: any = { userId: 1, body: { name: '' } };
      await updateProfile(reqUpdate, res);
      expect(res.status).toHaveBeenCalledWith(400);

      const reqChange: any = { userId: 1, body: { currentPassword: '', newPassword: '' } };
      await changePassword(reqChange, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
