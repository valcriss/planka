const indexController = require('../api/controllers/notifications/index');
const readAllController = require('../api/controllers/notifications/read-all');
const showController = require('../api/controllers/notifications/show');
const updateController = require('../api/controllers/notifications/update');

const originalSails = global.sails;
const originalNotification = global.Notification;
const originalUser = global.User;
const originalLodash = global._;

describe('notifications controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        users: {
          presentMany: jest.fn((users) => users),
        },
        utils: {
          mapRecords: jest.fn((records, key) => records.map((record) => record[key])),
        },
        notifications: {
          updateOne: {
            with: jest.fn(),
          },
          readAllForUser: {
            with: jest.fn(),
          },
        },
      },
    };

    global.Notification = {
      qm: {
        getUnreadByUserId: jest.fn(),
        getOneById: jest.fn(),
      },
    };

    global.User = {
      qm: {
        getByIds: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Notification = originalNotification;
    global.User = originalUser;
    global._ = originalLodash;
  });

  test('notifications/index returns unread notifications with included users', async () => {
    const req = { currentUser: { id: 'u1' } };
    const notifications = [
      { id: 'n1', creatorUserId: 'u2' },
      { id: 'n2', creatorUserId: 'u3' },
    ];
    const users = [{ id: 'u2' }, { id: 'u3' }];

    Notification.qm.getUnreadByUserId.mockResolvedValue(notifications);
    sails.helpers.utils.mapRecords.mockReturnValue(['u2', 'u3']);
    User.qm.getByIds.mockResolvedValue(users);

    const result = await indexController.fn.call({ req });

    expect(Notification.qm.getUnreadByUserId).toHaveBeenCalledWith('u1');
    expect(User.qm.getByIds).toHaveBeenCalledWith(['u2', 'u3']);
    expect(result).toEqual({
      items: notifications,
      included: {
        users,
      },
    });
  });

  test('notifications/show enforces ownership and returns notification', async () => {
    const req = { currentUser: { id: 'u1' } };

    Notification.qm.getOneById.mockResolvedValueOnce(null);
    await expect(showController.fn.call({ req }, { id: 'n1' })).rejects.toEqual({
      notificationNotFound: 'Notification not found',
    });

    Notification.qm.getOneById.mockResolvedValueOnce({ id: 'n2', creatorUserId: 'u2' });
    User.qm.getByIds.mockResolvedValueOnce([{ id: 'u2' }]);

    const result = await showController.fn.call({ req }, { id: 'n2' });

    expect(User.qm.getByIds).toHaveBeenCalledWith(['u2']);
    expect(result).toEqual({
      item: { id: 'n2', creatorUserId: 'u2' },
      included: {
        users: [{ id: 'u2' }],
      },
    });
  });

  test('notifications/show returns empty included users when no creator', async () => {
    const req = { currentUser: { id: 'u1' } };

    Notification.qm.getOneById.mockResolvedValue({ id: 'n3', creatorUserId: null });

    const result = await showController.fn.call({ req }, { id: 'n3' });

    expect(result).toEqual({
      item: { id: 'n3', creatorUserId: null },
      included: {
        users: [],
      },
    });
  });

  test('notifications/update enforces ownership and update result', async () => {
    const req = { currentUser: { id: 'u1' } };

    Notification.qm.getOneById.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'n1', isRead: true })).rejects.toEqual({
      notificationNotFound: 'Notification not found',
    });

    Notification.qm.getOneById.mockResolvedValueOnce({ id: 'n2' });
    sails.helpers.notifications.updateOne.with.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'n2', isRead: true })).rejects.toEqual({
      notificationNotFound: 'Notification not found',
    });

    Notification.qm.getOneById.mockResolvedValueOnce({ id: 'n3' });
    sails.helpers.notifications.updateOne.with.mockResolvedValueOnce({ id: 'n3', isRead: true });

    const result = await updateController.fn.call({ req }, { id: 'n3', isRead: true });

    expect(result).toEqual({ item: { id: 'n3', isRead: true } });
  });

  test('notifications/read-all reads all notifications for user', async () => {
    const req = { currentUser: { id: 'u1' } };
    const notifications = [{ id: 'n1' }, { id: 'n2' }];

    sails.helpers.notifications.readAllForUser.with.mockResolvedValue(notifications);

    const result = await readAllController.fn.call({ req });

    expect(sails.helpers.notifications.readAllForUser.with).toHaveBeenCalledWith({
      user: req.currentUser,
      request: req,
    });
    expect(result).toEqual({ items: notifications });
  });
});
