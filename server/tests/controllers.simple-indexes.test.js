const webhooksIndexController = require('../api/controllers/webhooks/index');
const notificationsReadAllController = require('../api/controllers/notifications/read-all');
const notificationsIndexController = require('../api/controllers/notifications/index');
const repositoriesIndexController = require('../api/controllers/repositories/index');
const epicsIndexController = require('../api/controllers/epics/index');
const usersIndexController = require('../api/controllers/users/index');

const originalSails = global.sails;
const originalWebhook = global.Webhook;
const originalNotification = global.Notification;
const originalProject = global.Project;
const originalRepository = global.Repository;
const originalEpic = global.Epic;
const originalUser = global.User;

describe('simple index/read-all controllers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        notifications: {
          readAllForUser: {
            with: jest.fn(),
          },
        },
        users: {
          presentMany: jest.fn((users) => users),
          isProjectManager: jest.fn(),
          isAdminOrProjectOwner: jest.fn(),
        },
        utils: {
          mapRecords: jest.fn(),
        },
      },
    };

    global.Webhook = {
      qm: {
        getAll: jest.fn(),
      },
    };

    global.Notification = {
      qm: {
        getUnreadByUserId: jest.fn(),
      },
    };

    global.Project = {
      qm: {
        getOneById: jest.fn(),
      },
    };

    global.Repository = {
      qm: {
        getByProjectId: jest.fn(),
      },
    };

    global.Epic = {
      qm: {
        getByProjectId: jest.fn(),
      },
    };

    global.User = {
      qm: {
        getAll: jest.fn(),
        getByIds: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Webhook = originalWebhook;
    global.Notification = originalNotification;
    global.Project = originalProject;
    global.Repository = originalRepository;
    global.Epic = originalEpic;
    global.User = originalUser;
  });

  test('webhooks/index returns all webhooks', async () => {
    Webhook.qm.getAll.mockResolvedValue([{ id: 'w1' }]);

    const result = await webhooksIndexController.fn.call({ req: {} }, {});

    expect(Webhook.qm.getAll).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ items: [{ id: 'w1' }] });
  });

  test('notifications/read-all calls helper with current request and user', async () => {
    const currentUser = { id: 'u1' };
    sails.helpers.notifications.readAllForUser.with.mockResolvedValue([{ id: 'n1' }]);
    const req = { currentUser };

    const result = await notificationsReadAllController.fn.call({ req }, {});

    expect(sails.helpers.notifications.readAllForUser.with).toHaveBeenCalledWith({
      user: currentUser,
      request: req,
    });
    expect(result).toEqual({ items: [{ id: 'n1' }] });
  });

  test('notifications/index returns unread notifications with included users', async () => {
    const currentUser = { id: 'u1' };
    const notifications = [
      { id: 'n1', creatorUserId: 'u2' },
      { id: 'n2', creatorUserId: 'u3' },
    ];

    Notification.qm.getUnreadByUserId.mockResolvedValue(notifications);
    sails.helpers.utils.mapRecords.mockReturnValue(['u2', 'u3']);
    User.qm.getByIds.mockResolvedValue([{ id: 'u2' }, { id: 'u3' }]);
    sails.helpers.users.presentMany.mockReturnValue([{ id: 'u2', name: 'Bob' }]);

    const result = await notificationsIndexController.fn.call({ req: { currentUser } }, {});

    expect(Notification.qm.getUnreadByUserId).toHaveBeenCalledWith('u1');
    expect(sails.helpers.utils.mapRecords).toHaveBeenCalledWith(
      notifications,
      'creatorUserId',
      true,
      true,
    );
    expect(User.qm.getByIds).toHaveBeenCalledWith(['u2', 'u3']);
    expect(sails.helpers.users.presentMany).toHaveBeenCalledWith(
      [{ id: 'u2' }, { id: 'u3' }],
      currentUser,
    );
    expect(result).toEqual({
      items: notifications,
      included: {
        users: [{ id: 'u2', name: 'Bob' }],
      },
    });
  });

  test('repositories/index enforces project existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Project.qm.getOneById.mockResolvedValue(null);
    await expect(repositoriesIndexController.fn.call({ req }, { projectId: 'p1' })).rejects.toEqual(
      {
        projectNotFound: 'Project not found',
      },
    );

    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    await expect(repositoriesIndexController.fn.call({ req }, { projectId: 'p1' })).rejects.toEqual(
      {
        projectNotFound: 'Project not found',
      },
    );

    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Repository.qm.getByProjectId.mockResolvedValue([{ id: 'r1' }]);
    const result = await repositoriesIndexController.fn.call({ req }, { projectId: 'p1' });

    expect(result).toEqual({ items: [{ id: 'r1' }] });
  });

  test('epics/index enforces project existence and manager rights', async () => {
    const req = { currentUser: { id: 'u1' } };

    Project.qm.getOneById.mockResolvedValue(null);
    await expect(epicsIndexController.fn.call({ req }, { projectId: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    await expect(epicsIndexController.fn.call({ req }, { projectId: 'p1' })).rejects.toEqual({
      projectNotFound: 'Project not found',
    });

    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    Epic.qm.getByProjectId.mockResolvedValue([{ id: 'e1' }]);
    const result = await epicsIndexController.fn.call({ req }, { projectId: 'p1' });

    expect(result).toEqual({ items: [{ id: 'e1' }] });
  });

  test('users/index enforces admin/project-owner rights and presents users', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(false);
    await expect(usersIndexController.fn.call({ req }, {})).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    User.qm.getAll.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
    sails.helpers.users.presentMany.mockReturnValue([{ id: 'u1', name: 'Alice' }]);

    const result = await usersIndexController.fn.call({ req }, {});

    expect(User.qm.getAll).toHaveBeenCalledTimes(1);
    expect(sails.helpers.users.presentMany).toHaveBeenCalledWith(
      [{ id: 'u1' }, { id: 'u2' }],
      req.currentUser,
    );
    expect(result).toEqual({
      items: [{ id: 'u1', name: 'Alice' }],
    });
  });
});
