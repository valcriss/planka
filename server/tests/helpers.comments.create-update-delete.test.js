const lodash = require('lodash');
const createComment = require('../api/helpers/comments/create-one');
const updateComment = require('../api/helpers/comments/update-one');
const deleteComment = require('../api/helpers/comments/delete-one');

const originalSails = global.sails;
const originalComment = global.Comment;
const originalWebhook = global.Webhook;
const originalNotification = global.Notification;
const originalNotificationService = global.NotificationService;
const originalCardSubscription = global.CardSubscription;
const originalLodash = global._;
describe('helpers/comments create/update/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      config: {
        custom: {
          baseUrl: 'http://localhost',
        },
      },
      helpers: {
        users: {
          presentOne: jest.fn((user) => ({ id: user.id })),
        },
        boards: {
          getMemberUserIds: jest.fn().mockResolvedValue(['user-1', 'user-2']),
          getSubscriptionUserIds: jest.fn().mockResolvedValue(['user-3']),
        },
        cards: {
          getSubscriptionUserIds: jest.fn().mockResolvedValue(['user-2']),
        },
        notifications: {
          createOne: {
            with: jest.fn(),
          },
        },
        utils: {
          sendWebhooks: {
            with: jest.fn(),
          },
          sendNotifications: jest.fn(),
          makeTranslator: jest.fn().mockReturnValue((msg) => msg),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.Comment = {
      qm: {
        createOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        COMMENT_CREATE: 'commentCreate',
        COMMENT_UPDATE: 'commentUpdate',
        COMMENT_DELETE: 'commentDelete',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
    global.Notification = {
      Types: {
        MENTION_IN_COMMENT: 'mention',
        COMMENT_CARD: 'comment',
      },
    };
    global.NotificationService = {
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([]),
      },
    };
    global.CardSubscription = {
      qm: {
        createOne: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalComment === 'undefined') {
      delete global.Comment;
    } else {
      global.Comment = originalComment;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
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
    if (typeof originalCardSubscription === 'undefined') {
      delete global.CardSubscription;
    } else {
      global.CardSubscription = originalCardSubscription;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates comment and notifies subscribers', async () => {
    const comment = {
      id: 'comment-1',
      cardId: 'card-1',
      userId: 'user-1',
      text: 'Hi',
    };
    Comment.qm.createOne.mockResolvedValue(comment);
    const inputs = {
      values: {
        card: { id: 'card-1', name: 'Card 1' },
        user: {
          id: 'user-1',
          name: 'Alex',
          subscribeToCardWhenCommenting: true,
        },
        text: 'Hi',
      },
      project: { id: 'project-1' },
      board: { id: 'board-1', name: 'Board 1' },
      list: { id: 'list-1' },
      request: { id: 'req-1' },
    };
    const result = await createComment.fn(inputs);
    expect(result).toBe(comment);
    expect(sails.helpers.notifications.createOne.with).toHaveBeenCalledTimes(2);
    expect(CardSubscription.qm.createOne).toHaveBeenCalledWith({
      cardId: 'card-1',
      userId: 'user-1',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith('user:user-1', 'cardUpdate', {
      item: { id: 'card-1', isSubscribed: true },
    });
  });
  test('updates comment and sends webhooks', async () => {
    Comment.qm.updateOne.mockResolvedValue({ id: 'comment-2' });
    const result = await updateComment.fn({
      record: { id: 'comment-2' },
      values: { text: 'Updated' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({ id: 'comment-2' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
  test('deletes comment and sends webhooks', async () => {
    Comment.qm.deleteOne.mockResolvedValue({ id: 'comment-3' });
    const result = await deleteComment.fn({
      record: { id: 'comment-3' },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      card: { id: 'card-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-3' },
    });
    expect(result).toEqual({ id: 'comment-3' });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
