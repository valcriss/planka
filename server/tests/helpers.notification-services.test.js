const lodash = require('lodash');
const createInBoard = require('../api/helpers/notification-services/create-one-in-board');
const createInUser = require('../api/helpers/notification-services/create-one-in-user');
const deleteInBoard = require('../api/helpers/notification-services/delete-one-in-board');
const deleteInUser = require('../api/helpers/notification-services/delete-one-in-user');
const updateInBoard = require('../api/helpers/notification-services/update-one-in-board');
const updateInUser = require('../api/helpers/notification-services/update-one-in-user');
const getPathToUserById = require('../api/helpers/notification-services/get-path-to-user-by-id');
const testOne = require('../api/helpers/notification-services/test-one');

const originalSails = global.sails;
const originalNotificationService = global.NotificationService;
const originalWebhook = global.Webhook;
const originalUser = global.User;
const originalLodash = global._;
describe('helpers/notification-services', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        boards: {
          getNotificationServicesTotal: jest.fn(),
          getPathToProjectById: jest.fn(),
        },
        projects: {
          makeScoper: {
            with: jest.fn(),
          },
        },
        users: {
          getNotificationServicesTotal: jest.fn(),
        },
        utils: {
          sendWebhooks: {
            with: jest.fn(),
          },
          sendNotifications: {
            with: jest.fn().mockResolvedValue(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.NotificationService = {
      qm: {
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        getOneById: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        NOTIFICATION_SERVICE_CREATE: 'notificationServiceCreate',
        NOTIFICATION_SERVICE_UPDATE: 'notificationServiceUpdate',
        NOTIFICATION_SERVICE_DELETE: 'notificationServiceDelete',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
    global.User = {
      qm: {
        getOneById: jest.fn(),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalNotificationService === 'undefined') {
      delete global.NotificationService;
    } else {
      global.NotificationService = originalNotificationService;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalUser === 'undefined') {
      delete global.User;
    } else {
      global.User = originalUser;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates board notification service and broadcasts to related users', async () => {
    sails.helpers.boards.getNotificationServicesTotal.mockResolvedValue(2);
    NotificationService.qm.createOne.mockResolvedValue({
      id: 'service-1',
      boardId: 'board-1',
    });
    const scoper = {
      getNotificationServiceRelatedUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    const result = await createInBoard.fn({
      values: {
        board: { id: 'board-1' },
        url: 'https://notify.test',
        format: 'json',
      },
      project: { id: 'project-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toEqual({ id: 'service-1', boardId: 'board-1' });
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledWith(
      expect.objectContaining({
        event: Webhook.Events.NOTIFICATION_SERVICE_CREATE,
      }),
    );
  });
  test('throws when board notification service limit reached', async () => {
    sails.helpers.boards.getNotificationServicesTotal.mockResolvedValue(5);
    await expect(
      createInBoard.fn({
        values: { board: { id: 'board-1' } },
        project: { id: 'project-1' },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('limitReached');
  });
  test('creates user notification service and broadcasts to user', async () => {
    sails.helpers.users.getNotificationServicesTotal.mockResolvedValue(1);
    NotificationService.qm.createOne.mockResolvedValue({
      id: 'service-2',
      userId: 'user-1',
    });
    const result = await createInUser.fn({
      values: {
        user: { id: 'user-1' },
        url: 'https://notify.test',
        format: 'json',
      },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'service-2', userId: 'user-1' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-1',
      'notificationServiceCreate',
      { item: { id: 'service-2', userId: 'user-1' } },
      { id: 'req-2' },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('throws when user notification service limit reached', async () => {
    sails.helpers.users.getNotificationServicesTotal.mockResolvedValue(5);
    await expect(
      createInUser.fn({
        values: { user: { id: 'user-1' } },
        actorUser: { id: 'actor-1' },
      }),
    ).rejects.toBe('limitReached');
  });
  test('updates board notification service and sends webhooks', async () => {
    NotificationService.qm.updateOne.mockResolvedValue({
      id: 'service-3',
      boardId: 'board-2',
    });
    const scoper = {
      getNotificationServiceRelatedUserIds: jest.fn().mockResolvedValue(['user-3']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    const result = await updateInBoard.fn({
      record: { id: 'service-3' },
      values: { name: 'Updated' },
      board: { id: 'board-2' },
      project: { id: 'project-2' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'service-3', boardId: 'board-2' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-3',
      'notificationServiceUpdate',
      { item: { id: 'service-3', boardId: 'board-2' } },
      { id: 'req-3' },
    );
    const webhookCall = sails.helpers.utils.sendWebhooks.with.mock.calls[0][0];
    expect(webhookCall.buildPrevData().item).toEqual({ id: 'service-3' });
  });
  test('returns null when board notification service update fails', async () => {
    NotificationService.qm.updateOne.mockResolvedValue(null);
    const result = await updateInBoard.fn({
      record: { id: 'service-4' },
      values: { name: 'Updated' },
      board: { id: 'board-3' },
      project: { id: 'project-3' },
      actorUser: { id: 'actor-1' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('updates user notification service and sends webhooks', async () => {
    NotificationService.qm.updateOne.mockResolvedValue({
      id: 'service-5',
      userId: 'user-5',
    });
    const result = await updateInUser.fn({
      record: { id: 'service-5', userId: 'user-5' },
      values: { name: 'Updated' },
      user: { id: 'user-5' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-4' },
    });
    expect(result).toEqual({ id: 'service-5', userId: 'user-5' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-5',
      'notificationServiceUpdate',
      { item: { id: 'service-5', userId: 'user-5' } },
      { id: 'req-4' },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('returns null when user notification service update fails', async () => {
    NotificationService.qm.updateOne.mockResolvedValue(null);
    const result = await updateInUser.fn({
      record: { id: 'service-6', userId: 'user-6' },
      values: { name: 'Updated' },
      user: { id: 'user-6' },
      actorUser: { id: 'actor-1' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('deletes board notification service and sends webhooks', async () => {
    NotificationService.qm.deleteOne.mockResolvedValue({
      id: 'service-7',
      boardId: 'board-4',
    });
    const scoper = {
      getNotificationServiceRelatedUserIds: jest.fn().mockResolvedValue(['user-7']),
    };
    sails.helpers.projects.makeScoper.with.mockReturnValue(scoper);
    const result = await deleteInBoard.fn({
      record: { id: 'service-7' },
      board: { id: 'board-4' },
      project: { id: 'project-4' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-5' },
    });
    expect(result).toEqual({ id: 'service-7', boardId: 'board-4' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-7',
      'notificationServiceDelete',
      { item: { id: 'service-7', boardId: 'board-4' } },
      { id: 'req-5' },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('returns null when board notification service delete fails', async () => {
    NotificationService.qm.deleteOne.mockResolvedValue(null);
    const result = await deleteInBoard.fn({
      record: { id: 'service-8' },
      board: { id: 'board-5' },
      project: { id: 'project-5' },
      actorUser: { id: 'actor-1' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('deletes user notification service and sends webhooks', async () => {
    NotificationService.qm.deleteOne.mockResolvedValue({
      id: 'service-9',
      userId: 'user-9',
    });
    const result = await deleteInUser.fn({
      record: { id: 'service-9' },
      user: { id: 'user-9' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-6' },
    });
    expect(result).toEqual({ id: 'service-9', userId: 'user-9' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-9',
      'notificationServiceDelete',
      { item: { id: 'service-9', userId: 'user-9' } },
      { id: 'req-6' },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('returns null when user notification service delete fails', async () => {
    NotificationService.qm.deleteOne.mockResolvedValue(null);
    const result = await deleteInUser.fn({
      record: { id: 'service-10', userId: 'user-10' },
      user: { id: 'user-10' },
      actorUser: { id: 'actor-1' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
  test('returns path for notification service with user', async () => {
    NotificationService.qm.getOneById.mockResolvedValue({
      id: 'service-11',
      userId: 'user-11',
    });
    User.qm.getOneById.mockResolvedValue({ id: 'user-11' });
    const result = await getPathToUserById.fn({ id: 'service-11' });
    expect(result).toEqual({
      notificationService: { id: 'service-11', userId: 'user-11' },
      user: { id: 'user-11' },
    });
  });
  test('throws pathNotFound when notification service missing', async () => {
    NotificationService.qm.getOneById.mockResolvedValue(null);
    await expect(getPathToUserById.fn({ id: 'service-12' })).rejects.toBe('pathNotFound');
  });
  test('throws pathNotFound when user for notification service missing', async () => {
    NotificationService.qm.getOneById.mockResolvedValue({
      id: 'service-13',
      userId: 'user-13',
    });
    User.qm.getOneById.mockResolvedValue(null);
    await expect(getPathToUserById.fn({ id: 'service-13' })).rejects.toEqual({
      pathNotFound: {
        notificationService: { id: 'service-13', userId: 'user-13' },
      },
    });
  });
  test('returns path for notification service with board', async () => {
    NotificationService.qm.getOneById.mockResolvedValue({
      id: 'service-14',
      boardId: 'board-14',
    });
    sails.helpers.boards.getPathToProjectById.mockReturnValue({
      intercept: jest.fn().mockResolvedValue({ board: { id: 'board-14' } }),
    });
    const result = await getPathToUserById.fn({ id: 'service-14' });
    expect(result).toEqual({
      notificationService: { id: 'service-14', boardId: 'board-14' },
      board: { id: 'board-14' },
    });
  });
  test('throws pathNotFound when board path is missing', async () => {
    NotificationService.qm.getOneById.mockResolvedValue({
      id: 'service-15',
      boardId: 'board-15',
    });
    sails.helpers.boards.getPathToProjectById.mockReturnValue({
      intercept: jest
        .fn()
        .mockImplementation((_name, handler) =>
          Promise.reject(handler({ board: { id: 'board-15' } })),
        ),
    });
    await expect(getPathToUserById.fn({ id: 'service-15' })).rejects.toEqual({
      pathNotFound: {
        notificationService: { id: 'service-15', boardId: 'board-15' },
        board: { id: 'board-15' },
      },
    });
  });
  test('sends a test notification for a service', async () => {
    await testOne.fn({
      record: { id: 'service-16', url: 'https://notify.test', format: 'json' },
      i18n: { __: jest.fn((value) => value) },
    });
    expect(sails.helpers.utils.sendNotifications.with).toHaveBeenCalledWith(
      expect.objectContaining({
        services: [{ url: 'https://notify.test', format: 'json' }],
      }),
    );
  });
});
