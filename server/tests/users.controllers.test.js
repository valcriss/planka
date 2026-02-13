jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('../utils/remote-address', () => ({
  getRemoteAddress: jest.fn(() => '127.0.0.1'),
}));

let bcrypt;

let createController;
let deleteController;
let indexController;
let showController;
let updateController;
let updateAvatarController;
let updateEmailController;
let updatePasswordController;
let updateUsernameController;

const originalSails = global.sails;
const originalNotificationService = global.NotificationService;
const originalSession = global.Session;
const originalUser = global.User;
const originalLodash = global._;

const makeChainable = (result, codeToThrow) => {
  const chain = {
    intercept(code, handler) {
      if (code === codeToThrow) {
        throw handler();
      }

      return chain;
    },
    then: (...args) => Promise.resolve(result).then(...args),
    catch: (...args) => Promise.resolve(result).catch(...args),
    finally: (...args) => Promise.resolve(result).finally(...args),
  };

  return chain;
};

describe('users controllers', () => {
  beforeEach(() => {
    jest.resetModules();
    // Re-require bcrypt after resetModules so controllers and tests share the mock.
    // eslint-disable-next-line global-require
    bcrypt = require('bcrypt');
    bcrypt.compare.mockReset();

    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      config: {
        custom: {
          oidcEnforced: false,
          oidcIgnoreRoles: false,
          oidcIgnoreUsername: false,
          defaultAdminEmail: 'admin@example.com',
        },
      },
      helpers: {
        users: {
          createOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
          updateOne: {
            with: jest.fn(),
          },
          presentOne: jest.fn((user) => ({ id: user.id })),
          presentMany: jest.fn((users) => users.map((user) => ({ id: user.id }))),
          processUploadedAvatarFile: jest.fn(),
          isAdminOrProjectOwner: jest.fn(),
        },
        utils: {
          receiveFile: jest.fn(),
          createJwtToken: jest.fn(() => ({ token: 'token-1' })),
        },
      },
      sockets: {
        join: jest.fn(),
      },
    };

    global.NotificationService = {
      qm: {
        getByUserId: jest.fn(),
      },
    };

    global.Session = {
      qm: {
        createOne: jest.fn(),
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
        MEMBER: 'member',
      },
      LANGUAGES: ['en', 'fr'],
      EditorModes: {
        DEFAULT: 'default',
      },
      HomeViews: {
        BOARDS: 'boards',
      },
      ProjectOrders: {
        NAME: 'name',
      },
      PERSONAL_FIELD_NAMES: [
        'language',
        'subscribeToOwnCards',
        'subscribeToCardWhenCommenting',
        'turnOffRecentCardHighlighting',
        'enableFavoritesByDefault',
        'defaultEditorMode',
        'defaultHomeView',
        'defaultProjectsOrder',
      ],
      qm: {
        getOneById: jest.fn(),
        getAll: jest.fn(),
      },
    };

    /* eslint-disable global-require */
    createController = require('../api/controllers/users/create');
    deleteController = require('../api/controllers/users/delete');
    indexController = require('../api/controllers/users/index');
    showController = require('../api/controllers/users/show');
    updateController = require('../api/controllers/users/update');
    updateAvatarController = require('../api/controllers/users/update-avatar');
    updateEmailController = require('../api/controllers/users/update-email');
    updatePasswordController = require('../api/controllers/users/update-password');
    updateUsernameController = require('../api/controllers/users/update-username');
    /* eslint-enable global-require */
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.NotificationService = originalNotificationService;
    global.Session = originalSession;
    global.User = originalUser;
    global._ = originalLodash;
  });

  test('users/create rejects when OIDC is enforced', async () => {
    sails.config.custom.oidcEnforced = true;

    await expect(
      createController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        {
          email: 'user@example.com',
          password: 'secret',
          role: 'member',
          name: 'User',
        },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/create maps createOne intercepts', async () => {
    sails.helpers.users.createOne.with.mockReturnValue(makeChainable(null, 'emailAlreadyInUse'));

    await expect(
      createController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        {
          email: 'user@example.com',
          password: 'secret',
          role: 'member',
          name: 'User',
        },
      ),
    ).rejects.toEqual({
      emailAlreadyInUse: 'Email already in use',
    });
  });

  test('users/create returns presented user', async () => {
    sails.helpers.users.createOne.with.mockReturnValue(makeChainable({ id: 'u2' }));

    const result = await createController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      {
        email: 'user@example.com',
        password: 'secret',
        role: 'member',
        name: 'User',
      },
    );

    expect(result).toEqual({ item: { id: 'u2' } });
  });

  test('users/index rejects when requester lacks rights', async () => {
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(false);

    await expect(indexController.fn.call({ req: { currentUser: { id: 'u1' } } })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/index returns presented users', async () => {
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    User.qm.getAll.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);

    const result = await indexController.fn.call({ req: { currentUser: { id: 'u1' } } });

    expect(result).toEqual({ items: [{ id: 'u1' }, { id: 'u2' }] });
  });

  test('users/show returns current user and joins socket', async () => {
    NotificationService.qm.getByUserId.mockResolvedValue([{ id: 'ns1' }]);

    const req = { currentUser: { id: 'u1' }, isSocket: true };
    const result = await showController.fn.call({ req }, { id: 'me', subscribe: true });

    expect(sails.sockets.join).toHaveBeenCalledWith(req, 'user:u1');
    expect(result).toEqual({
      item: { id: 'u1' },
      included: { notificationServices: [{ id: 'ns1' }] },
    });
  });

  test('users/show rejects when non-admin requests other user', async () => {
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(false);

    await expect(
      showController.fn.call({ req: { currentUser: { id: 'u1', role: 'member' } } }, { id: 'u2' }),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('users/show returns another user for admin', async () => {
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });

    const result = await showController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'admin' } } },
      { id: 'u2' },
    );

    expect(result).toEqual({
      item: { id: 'u2' },
      included: { notificationServices: [] },
    });
  });

  test('users/delete handles not found and protected user', async () => {
    User.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      deleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'u2' }),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });

    User.qm.getOneById.mockResolvedValueOnce({ id: 'u2', email: 'admin@example.com' });
    await expect(
      deleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'u2' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/delete rejects when deleteOne returns null', async () => {
    User.qm.getOneById.mockResolvedValue({ id: 'u2', email: 'user@example.com' });
    sails.helpers.users.deleteOne.with.mockResolvedValue(null);

    await expect(
      deleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'u2' }),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('users/delete returns presented user', async () => {
    User.qm.getOneById.mockResolvedValue({ id: 'u2', email: 'user@example.com' });
    sails.helpers.users.deleteOne.with.mockResolvedValue({ id: 'u2' });

    const result = await deleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'u2' },
    );

    expect(result).toEqual({ item: { id: 'u2' } });
  });

  test('users/update rejects for unauthorized fields', async () => {
    await expect(
      updateController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', role: 'admin' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/update rejects for default admin restrictions', async () => {
    User.qm.getOneById.mockResolvedValue({ id: 'u2', email: 'admin@example.com' });

    await expect(
      updateController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'admin' } } },
        { id: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/update rejects for sso role changes', async () => {
    User.qm.getOneById.mockResolvedValue({ id: 'u2', email: 'user@example.com', isSsoUser: true });

    await expect(
      updateController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'admin' } } },
        { id: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/update maps activeLimitReached', async () => {
    User.qm.getOneById.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
    sails.helpers.users.updateOne.with.mockReturnValue(makeChainable(null, 'activeLimitReached'));

    await expect(
      updateController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', name: 'New Name' },
      ),
    ).rejects.toEqual({
      activeLimitReached: 'Active limit reached',
    });
  });

  test('users/update returns presented user', async () => {
    User.qm.getOneById.mockResolvedValue({ id: 'u1', email: 'user@example.com' });
    sails.helpers.users.updateOne.with.mockReturnValue(makeChainable({ id: 'u1' }));

    const result = await updateController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'member' } } },
      { id: 'u1', name: 'New Name' },
    );

    expect(result).toEqual({ item: { id: 'u1' } });
  });

  test('users/update-avatar rejects when non-admin targets others', async () => {
    await expect(
      updateAvatarController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u2' },
        { success: jest.fn(), uploadError: jest.fn() },
      ),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('users/update-avatar returns upload error via exits', async () => {
    sails.helpers.utils.receiveFile.mockRejectedValue(new Error('boom'));
    const exits = { success: jest.fn(), uploadError: jest.fn() };

    await updateAvatarController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'member' } } },
      { id: 'u1' },
      exits,
    );

    expect(exits.uploadError).toHaveBeenCalledWith('boom');
  });

  test('users/update-avatar rejects when file is missing or invalid', async () => {
    sails.helpers.utils.receiveFile.mockResolvedValueOnce([]);

    await expect(
      updateAvatarController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1' },
        { success: jest.fn(), uploadError: jest.fn() },
      ),
    ).rejects.toEqual({
      noFileWasUploaded: 'No file was uploaded',
    });

    sails.helpers.utils.receiveFile.mockResolvedValueOnce([{ fd: 'file-1' }]);
    sails.helpers.users.processUploadedAvatarFile.mockReturnValue(
      makeChainable(null, 'fileIsNotImage'),
    );

    await expect(
      updateAvatarController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1' },
        { success: jest.fn(), uploadError: jest.fn() },
      ),
    ).rejects.toEqual({
      fileIsNotImage: 'File is not image',
    });
  });

  test('users/update-avatar updates avatar and returns user', async () => {
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.utils.receiveFile.mockResolvedValue([{ fd: 'file-1' }]);
    sails.helpers.users.processUploadedAvatarFile.mockReturnValue(
      makeChainable({ id: 'avatar-1' }),
    );
    sails.helpers.users.updateOne.with.mockResolvedValue({ id: 'u2' });

    const exits = { success: jest.fn(), uploadError: jest.fn() };

    await updateAvatarController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'admin' } } },
      { id: 'u2' },
      exits,
    );

    expect(exits.success).toHaveBeenCalledWith({ item: { id: 'u2' } });
  });

  test('users/update-email rejects invalid current password', async () => {
    await expect(
      updateEmailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', email: 'new@example.com' },
      ),
    ).rejects.toEqual({
      invalidCurrentPassword: 'Invalid current password',
    });
  });

  test('users/update-email rejects when not admin updating other user', async () => {
    await expect(
      updateEmailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u2', email: 'new@example.com' },
      ),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('users/update-email rejects for protected users', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u1',
      email: 'admin@example.com',
      isSsoUser: false,
    });

    await expect(
      updateEmailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', email: 'new@example.com', currentPassword: 'secret' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/update-email rejects invalid current password value', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hashed',
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      updateEmailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', email: 'new@example.com', currentPassword: 'secret' },
      ),
    ).rejects.toEqual({
      invalidCurrentPassword: 'Invalid current password',
    });
  });

  test('users/update-email maps emailAlreadyInUse', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hashed',
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(true);
    sails.helpers.users.updateOne.with.mockReturnValue(makeChainable(null, 'emailAlreadyInUse'));

    await expect(
      updateEmailController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', email: 'new@example.com', currentPassword: 'secret' },
      ),
    ).rejects.toEqual({
      emailAlreadyInUse: 'Email already in use',
    });
  });

  test('users/update-email returns presented user', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u2',
      email: 'user@example.com',
      password: 'hashed',
      isSsoUser: false,
    });
    sails.helpers.users.updateOne.with.mockReturnValue(makeChainable({ id: 'u2' }));

    const result = await updateEmailController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'admin' } } },
      { id: 'u2', email: 'new@example.com' },
    );

    expect(result).toEqual({ item: { id: 'u2' } });
  });

  test('users/update-password validates current password', async () => {
    await expect(
      updatePasswordController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', password: 'secret' },
      ),
    ).rejects.toEqual({
      invalidCurrentPassword: 'Invalid current password',
    });
  });

  test('users/update-password rejects when not admin updating other user', async () => {
    await expect(
      updatePasswordController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u2', password: 'secret' },
      ),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('users/update-password rejects for protected users', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u1',
      email: 'admin@example.com',
      isSsoUser: false,
    });

    await expect(
      updatePasswordController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', password: 'secret', currentPassword: 'current' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('users/update-password rejects when current password is invalid', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hashed',
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      updatePasswordController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' }, headers: {} } },
        { id: 'u1', password: 'secret', currentPassword: 'current' },
      ),
    ).rejects.toEqual({
      invalidCurrentPassword: 'Invalid current password',
    });
  });

  test('users/update-password returns access token for self', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hashed',
      passwordChangedAt: 100,
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(true);
    sails.helpers.users.updateOne.with.mockResolvedValue({ id: 'u1', passwordChangedAt: 200 });

    const req = {
      currentUser: { id: 'u1', role: 'member' },
      currentSession: { httpOnlyToken: 'http-only' },
      headers: { 'user-agent': 'jest' },
    };

    const result = await updatePasswordController.fn.call(
      { req },
      { id: 'u1', password: 'secret', currentPassword: 'current' },
    );

    expect(Session.qm.createOne).toHaveBeenCalledWith({
      accessToken: 'token-1',
      httpOnlyToken: 'http-only',
      userId: 'u1',
      remoteAddress: '127.0.0.1',
      userAgent: 'jest',
    });
    expect(result).toEqual({
      item: { id: 'u1' },
      included: { accessTokens: ['token-1'] },
    });
  });

  test('users/update-username rejects for protected users and invalid password', async () => {
    User.qm.getOneById.mockResolvedValueOnce({
      id: 'u1',
      email: 'admin@example.com',
      isSsoUser: false,
    });

    await expect(
      updateUsernameController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', username: 'new', currentPassword: 'current' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    User.qm.getOneById.mockResolvedValueOnce({
      id: 'u1',
      email: 'user@example.com',
      password: 'hashed',
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(false);

    await expect(
      updateUsernameController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', username: 'new', currentPassword: 'current' },
      ),
    ).rejects.toEqual({
      invalidCurrentPassword: 'Invalid current password',
    });
  });

  test('users/update-username maps usernameAlreadyInUse', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u1',
      email: 'user@example.com',
      password: 'hashed',
      isSsoUser: false,
    });
    bcrypt.compare.mockResolvedValue(true);
    sails.helpers.users.updateOne.with.mockReturnValue(makeChainable(null, 'usernameAlreadyInUse'));

    await expect(
      updateUsernameController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'u1', username: 'new', currentPassword: 'current' },
      ),
    ).rejects.toEqual({
      usernameAlreadyInUse: 'Username already in use',
    });
  });

  test('users/update-username returns presented user', async () => {
    User.qm.getOneById.mockResolvedValue({
      id: 'u2',
      email: 'user@example.com',
      isSsoUser: true,
    });
    sails.helpers.users.updateOne.with.mockReturnValue(makeChainable({ id: 'u2' }));
    sails.config.custom.oidcIgnoreUsername = true;

    const result = await updateUsernameController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'admin' } } },
      { id: 'u2', username: 'new' },
    );

    expect(result).toEqual({ item: { id: 'u2' } });
  });
});
