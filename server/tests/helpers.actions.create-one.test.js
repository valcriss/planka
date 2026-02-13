const lodash = require('lodash');
const { format } = require('util');
const createAction = require('../api/helpers/actions/create-one');

const originalSails = global.sails;
const originalAction = global.Action;
const originalWebhook = global.Webhook;
const originalNotificationService = global.NotificationService;
const originalLodash = global._;
describe('helpers/actions/create-one', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      config: {
        custom: {
          baseUrl: 'http://localhost',
        },
      },
      helpers: {
        lists: {
          makeName: jest.fn((list) => list.name || 'List'),
        },
        utils: {
          sendNotifications: jest.fn(),
          sendWebhooks: {
            with: jest.fn(),
          },
          makeTranslator: jest.fn().mockReturnValue((message, ...args) => format(message, ...args)),
        },
        notifications: {
          createOne: {
            with: jest.fn(),
          },
        },
        cards: {
          getSubscriptionUserIds: jest.fn(),
        },
        boards: {
          getSubscriptionUserIds: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
    };
    global.Action = {
      Types: {
        CREATE_CARD: 'create_card',
        MOVE_CARD: 'move_card',
      },
      INTERNAL_NOTIFIABLE_TYPES: ['create_card', 'move_card'],
      PERSONAL_NOTIFIABLE_TYPES: ['create_card'],
      EXTERNAL_NOTIFIABLE_TYPES: ['create_card'],
      qm: {
        createOne: jest.fn(),
      },
    };
    global.Webhook = {
      Events: {
        ACTION_CREATE: 'actionCreate',
      },
    };
    global.NotificationService = {
      qm: {
        getByBoardId: jest.fn(),
      },
    };
  });
  afterAll(() => {
    if (typeof originalSails === 'undefined') {
      delete global.sails;
    } else {
      global.sails = originalSails;
    }
    if (typeof originalAction === 'undefined') {
      delete global.Action;
    } else {
      global.Action = originalAction;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalNotificationService === 'undefined') {
      delete global.NotificationService;
    } else {
      global.NotificationService = originalNotificationService;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('creates action and sends personal notifications + external services', async () => {
    const action = {
      id: 'action-1',
      type: Action.Types.CREATE_CARD,
      data: {
        list: { id: 'list-1', name: 'Todo' },
        user: { id: 'user-2', name: 'Target' },
      },
      cardId: 'card-1',
      userId: 'user-1',
    };
    Action.qm.createOne.mockResolvedValue(action);
    NotificationService.qm.getByBoardId.mockResolvedValue([
      { url: 'http://service', format: 'markdown' },
    ]);
    const inputs = {
      values: {
        type: Action.Types.CREATE_CARD,
        data: action.data,
        card: { id: 'card-1', boardId: 'board-1', name: 'Card 1' },
        user: { id: 'user-1', name: 'Actor' },
      },
      project: { id: 'project-1' },
      board: { id: 'board-1', name: 'Board 1' },
      list: { id: 'list-1', name: 'Todo' },
      webhooks: [{ id: 'wh-1' }],
      request: { id: 'req-1' },
    };
    const result = await createAction.fn(inputs);
    expect(result).toBe(action);
    expect(Action.qm.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: Action.Types.CREATE_CARD,
        boardId: 'board-1',
        cardId: 'card-1',
        userId: 'user-1',
      }),
    );
    expect(sails.sockets.broadcast).toHaveBeenCalledWith(
      'board:board-1',
      'actionCreate',
      { item: action },
      inputs.request,
    );
    expect(sails.helpers.notifications.createOne.with).toHaveBeenCalledTimes(1);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalledTimes(1);
    expect(sails.helpers.utils.sendNotifications).toHaveBeenCalledTimes(1);
  });
  test('creates notifications for subscription users on non-personal actions', async () => {
    const action = {
      id: 'action-2',
      type: Action.Types.MOVE_CARD,
      data: {
        fromList: { id: 'list-1', name: 'Todo' },
        toList: { id: 'list-2', name: 'Doing' },
      },
      cardId: 'card-2',
      userId: 'user-1',
    };
    Action.qm.createOne.mockResolvedValue(action);
    NotificationService.qm.getByBoardId.mockResolvedValue([]);
    sails.helpers.cards.getSubscriptionUserIds.mockResolvedValue(['user-2']);
    sails.helpers.boards.getSubscriptionUserIds.mockResolvedValue(['user-2', 'user-3']);
    const inputs = {
      values: {
        type: Action.Types.MOVE_CARD,
        data: action.data,
        card: { id: 'card-2', boardId: 'board-1', name: 'Card 2' },
        user: { id: 'user-1', name: 'Actor' },
      },
      project: { id: 'project-1' },
      board: { id: 'board-1', name: 'Board 1' },
      list: { id: 'list-2', name: 'Doing' },
      webhooks: [],
      request: { id: 'req-2' },
    };
    await createAction.fn(inputs);
    expect(sails.helpers.cards.getSubscriptionUserIds).toHaveBeenCalledWith('card-2', 'user-1');
    expect(sails.helpers.boards.getSubscriptionUserIds).toHaveBeenCalledWith('board-1', 'user-1');
    expect(sails.helpers.notifications.createOne.with).toHaveBeenCalledTimes(2);
    expect(sails.helpers.utils.sendNotifications).not.toHaveBeenCalled();
  });
});
