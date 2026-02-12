const notificationsShowController = require('../api/controllers/notifications/show');
const notificationsUpdateController = require('../api/controllers/notifications/update');
const accessTokensDeleteController = require('../api/controllers/access-tokens/delete');
const epicsDeleteController = require('../api/controllers/epics/delete');

const originalSails = global.sails;
const originalSession = global.Session;
const originalNotification = global.Notification;
const originalUser = global.User;
const originalEpic = global.Epic;
const originalLodash = global._;

describe('notifications/access-token/epic controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        notifications: {
          updateOne: {
            with: jest.fn(),
          },
        },
        users: {
          isProjectManager: jest.fn(),
        },
        utils: {
          clearHttpOnlyTokenCookie: jest.fn(),
        },
      },
      sockets: {
        leaveAll: jest.fn(),
        broadcast: jest.fn(),
      },
    };

    global.Session = {
      qm: {
        deleteOneById: jest.fn(),
      },
    };

    global.Notification = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.User = {
      qm: {
        getByIds: jest.fn(),
      },
    };

    global.Epic = {
      qm: {
        getOneById: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Session = originalSession;
    global.Notification = originalNotification;
    global.User = originalUser;
    global.Epic = originalEpic;
    global._ = originalLodash;
  });

  test('notifications/show throws when notification is missing', async () => {
    Notification.qm.getOneById.mockResolvedValue(null);

    await expect(
      notificationsShowController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'n1' }),
    ).rejects.toEqual({
      notificationNotFound: 'Notification not found',
    });
  });

  test('notifications/show returns item and creator user when available', async () => {
    const notification = { id: 'n1', creatorUserId: 'u2' };
    Notification.qm.getOneById.mockResolvedValue(notification);
    User.qm.getByIds.mockResolvedValue([{ id: 'u2' }]);

    const result = await notificationsShowController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'n1' },
    );

    expect(Notification.qm.getOneById).toHaveBeenCalledWith('n1', { userId: 'u1' });
    expect(User.qm.getByIds).toHaveBeenCalledWith(['u2']);
    expect(result).toEqual({
      item: notification,
      included: {
        users: [{ id: 'u2' }],
      },
    });
  });

  test('notifications/show returns empty included users when creator is absent', async () => {
    const notification = { id: 'n1', creatorUserId: null };
    Notification.qm.getOneById.mockResolvedValue(notification);

    const result = await notificationsShowController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'n1' },
    );

    expect(User.qm.getByIds).not.toHaveBeenCalled();
    expect(result).toEqual({
      item: notification,
      included: {
        users: [],
      },
    });
  });

  test('notifications/update handles missing original and missing updated notification', async () => {
    const req = { currentUser: { id: 'u1' } };

    Notification.qm.getOneById.mockResolvedValueOnce(null);
    await expect(
      notificationsUpdateController.fn.call({ req }, { id: 'n1', isRead: true }),
    ).rejects.toEqual({
      notificationNotFound: 'Notification not found',
    });

    Notification.qm.getOneById.mockResolvedValueOnce({ id: 'n1', isRead: false });
    sails.helpers.notifications.updateOne.with.mockResolvedValueOnce(null);
    await expect(
      notificationsUpdateController.fn.call({ req }, { id: 'n1', isRead: true }),
    ).rejects.toEqual({
      notificationNotFound: 'Notification not found',
    });
  });

  test('notifications/update returns updated notification', async () => {
    const req = { currentUser: { id: 'u1' } };
    Notification.qm.getOneById.mockResolvedValue({ id: 'n1', isRead: false });
    sails.helpers.notifications.updateOne.with.mockResolvedValue({ id: 'n1', isRead: true });

    const result = await notificationsUpdateController.fn.call({ req }, { id: 'n1', isRead: true });

    expect(sails.helpers.notifications.updateOne.with).toHaveBeenCalledWith({
      values: { isRead: true },
      record: { id: 'n1', isRead: false },
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({ item: { id: 'n1', isRead: true } });
  });

  test('access-tokens/delete clears session and socket room', async () => {
    const req = {
      currentSession: {
        id: 's1',
        accessToken: 'token-1',
        httpOnlyToken: false,
      },
      isSocket: false,
    };

    const result = await accessTokensDeleteController.fn.call({ req }, {});

    expect(Session.qm.deleteOneById).toHaveBeenCalledWith('s1');
    expect(sails.sockets.leaveAll).toHaveBeenCalledWith('@accessToken:token-1');
    expect(sails.helpers.utils.clearHttpOnlyTokenCookie).not.toHaveBeenCalled();
    expect(result).toEqual({ item: 'token-1' });
  });

  test('access-tokens/delete clears httpOnly cookie only for non-socket requests', async () => {
    const req = {
      currentSession: {
        id: 's1',
        accessToken: 'token-1',
        httpOnlyToken: true,
      },
      isSocket: false,
    };
    const res = {};

    await accessTokensDeleteController.fn.call({ req, res }, {});
    expect(sails.helpers.utils.clearHttpOnlyTokenCookie).toHaveBeenCalledWith(res);

    sails.helpers.utils.clearHttpOnlyTokenCookie.mockClear();
    await accessTokensDeleteController.fn.call({ req: { ...req, isSocket: true }, res }, {});
    expect(sails.helpers.utils.clearHttpOnlyTokenCookie).not.toHaveBeenCalled();
  });

  test('epics/delete enforces existence and manager rights, then deletes and broadcasts', async () => {
    const req = { currentUser: { id: 'u1' } };

    Epic.qm.getOneById.mockResolvedValueOnce(null);
    await expect(epicsDeleteController.fn.call({ req }, { id: 'e1' })).rejects.toEqual({
      epicNotFound: 'Epic not found',
    });

    Epic.qm.getOneById.mockResolvedValueOnce({ id: 'e1', projectId: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    await expect(epicsDeleteController.fn.call({ req }, { id: 'e1' })).rejects.toEqual({
      epicNotFound: 'Epic not found',
    });

    const epic = { id: 'e1', projectId: 'p1' };
    Epic.qm.getOneById.mockResolvedValueOnce(epic);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);

    const result = await epicsDeleteController.fn.call({ req }, { id: 'e1' });

    expect(Epic.qm.deleteOne).toHaveBeenCalledWith({ id: 'e1' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'project:p1',
      'epicDelete',
      { item: epic },
      req,
    );
    expect(result).toEqual({ item: epic });
  });
});
