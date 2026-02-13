const lodash = require('lodash');
const createNotification = require('../api/helpers/notifications/create-one');
const readAllForUser = require('../api/helpers/notifications/read-all-for-user');
const updateNotification = require('../api/helpers/notifications/update-one');

const originalSails = global.sails;
const originalNotification = global.Notification;
const originalNotificationService = global.NotificationService;
const originalUser = global.User;
const originalWebhook = global.Webhook;
const originalLodash = global._;
describe('helpers/notifications', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      config: {
        custom: {
          baseUrl: 'https://example.test',
        },
      },
      hooks: {
        smtp: {
          isEnabled: jest.fn().mockReturnValue(false),
        },
      },
      helpers: {
        lists: {
          makeName: jest.fn((list) => list.name || list.id),
        },
        users: {
          presentOne: jest.fn((user) => ({ id: user.id })),
        },
        utils: {
          makeTranslator: jest.fn(
            () =>
              (value, ...args) =>
                [value, ...args].join(' '),
          ),
          sendNotifications: jest.fn().mockResolvedValue(),
          sendEmail: {
            with: jest.fn().mockResolvedValue(),
          },
          sendWebhooks: {
            with: jest.fn(),
          },
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
      log: {
        warn: jest.fn(),
      },
    };
    global.Notification = {
      Types: {
        MOVE_CARD: 'moveCard',
        COMMENT_CARD: 'commentCard',
        ADD_MEMBER_TO_CARD: 'addMemberToCard',
        MENTION_IN_COMMENT: 'mentionInComment',
      },
      qm: {
        createOne: jest.fn(),
        update: jest.fn(),
        updateOne: jest.fn(),
      },
    };
    global.NotificationService = {
      qm: {
        getByUserId: jest.fn(),
      },
    };
    global.User = {
      qm: {
        getOneById: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        NOTIFICATION_CREATE: 'notificationCreate',
        NOTIFICATION_UPDATE: 'notificationUpdate',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalNotification === 'undefined') {
      delete global.Notification;
    } else {
      global.Notification = originalNotification;
    }
    if (typeof originalNotificationService === 'undefined') {
      delete global.NotificationService;
    } else {
      global.NotificationService = originalNotificationService;
    }
    if (typeof originalUser === 'undefined') {
      delete global.User;
    } else {
      global.User = originalUser;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates comment notification and sends services webhooks', async () => {
    Notification.qm.createOne.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      type: Notification.Types.COMMENT_CARD,
      data: { text: 'Hi there' },
    });
    NotificationService.qm.getByUserId.mockResolvedValue([
      {
        url: 'https://notify.test',
        format: 'json',
      },
    ]);
    const values = {
      type: Notification.Types.COMMENT_CARD,
      comment: { id: 'comment-1', text: 'Hi there' },
      action: { id: 'action-1' },
      creatorUser: { id: 'user-2', name: 'Actor', language: 'en' },
      user: { id: 'user-1', email: 'target@example.com', language: 'en' },
      card: { id: 'card-1', boardId: 'board-1', name: 'Card Name' },
      data: { text: 'Hi there' },
    };
    const result = await createNotification.fn({
      values,
      project: { id: 'project-1' },
      board: { id: 'board-1', name: 'Board Name' },
      list: { id: 'list-1', name: 'List Name' },
      webhooks: [{ id: 'wh-1' }],
    });
    expect(result).toEqual({
      id: 'notif-1',
      userId: 'user-1',
      type: Notification.Types.COMMENT_CARD,
      data: { text: 'Hi there' },
    });
    expect(Notification.qm.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        creatorUserId: 'user-2',
        boardId: 'board-1',
        cardId: 'card-1',
        commentId: 'comment-1',
      }),
    );
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-1',
      'notificationCreate',
      expect.any(Object),
    );
    const webhookCall = sails.helpers.utils.sendWebhooks.with.mock.calls[0][0];
    expect(webhookCall.event).toBe(Webhook.Events.NOTIFICATION_CREATE);
    expect(webhookCall.buildData().included.comments).toEqual([values.comment]);
    expect(sails.helpers.utils.sendNotifications).toHaveBeenCalledWith(
      [{ url: 'https://notify.test', format: 'json' }],
      expect.any(String),
      expect.any(Object),
    );
    expect(sails.helpers.utils.sendEmail.with).not.toHaveBeenCalled();
  });
  test('sends email when smtp is enabled and no services exist', async () => {
    sails.hooks.smtp.isEnabled.mockReturnValue(true);
    Notification.qm.createOne.mockResolvedValue({
      id: 'notif-2',
      userId: 'user-1',
      type: Notification.Types.ADD_MEMBER_TO_CARD,
      data: {},
    });
    NotificationService.qm.getByUserId.mockResolvedValue([]);
    User.qm.getOneById.mockResolvedValue({
      id: 'user-1',
      email: 'target@example.com',
      language: 'en',
      name: 'Target',
    });
    const result = await createNotification.fn({
      values: {
        type: Notification.Types.ADD_MEMBER_TO_CARD,
        action: { id: 'action-1' },
        creatorUser: { id: 'user-2', name: 'Actor', language: 'en' },
        card: { id: 'card-2', boardId: 'board-2', name: 'Card Name' },
        data: {},
      },
      project: { id: 'project-2' },
      board: { id: 'board-2', name: 'Board Name' },
      list: { id: 'list-2', name: 'List Name' },
      webhooks: [{ id: 'wh-2' }],
    });
    expect(result).toEqual({
      id: 'notif-2',
      userId: 'user-1',
      type: Notification.Types.ADD_MEMBER_TO_CARD,
      data: {},
    });
    expect(User.qm.getOneById).toHaveBeenCalledWith('user-1');
    expect(Notification.qm.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        actionId: 'action-1',
      }),
    );
    expect(sails.helpers.utils.sendNotifications).not.toHaveBeenCalled();
    expect(sails.helpers.utils.sendEmail.with).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'target@example.com',
      }),
    );
  });
  test('marks all notifications as read for a user', async () => {
    Notification.qm.update.mockResolvedValue([
      { id: 'notif-1', userId: 'user-1', isRead: true },
      { id: 'notif-2', userId: 'user-1', isRead: true },
    ]);
    const result = await readAllForUser.fn({
      user: { id: 'user-1' },
      request: { id: 'request-1' },
    });
    expect(result).toHaveLength(2);
    expect(sails.sockets.broadcast).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledTimes(2);
  });
  test('updates notification and sends webhooks when found', async () => {
    Notification.qm.updateOne.mockResolvedValue({
      id: 'notif-3',
      userId: 'user-3',
    });
    const result = await updateNotification.fn({
      record: { id: 'notif-3', userId: 'user-3' },
      values: { isRead: true },
      actorUser: { id: 'actor-1' },
      request: { id: 'request-2' },
    });
    expect(result).toEqual({ id: 'notif-3', userId: 'user-3' });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'user:user-3',
      'notificationUpdate',
      { item: { id: 'notif-3', userId: 'user-3' } },
      { id: 'request-2' },
    );
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
    const call = sails.helpers.utils.sendWebhooks.with.mock.calls[0][0];
    expect(call.buildPrevData().item).toEqual({
      id: 'notif-3',
      userId: 'user-3',
    });
  });
  test('returns null when notification update fails', async () => {
    Notification.qm.updateOne.mockResolvedValue(null);
    const result = await updateNotification.fn({
      record: { id: 'notif-4', userId: 'user-4' },
      values: { isRead: true },
      actorUser: { id: 'actor-2' },
    });
    expect(result).toBeNull();
    expect(sails.helpers.utils.sendWebhooks.with).not.toHaveBeenCalled();
  });
});
