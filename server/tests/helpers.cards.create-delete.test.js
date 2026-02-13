const lodash = require('lodash');
const createCard = require('../api/helpers/cards/create-one');
const deleteCard = require('../api/helpers/cards/delete-one');

const originalSails = global.sails;
const originalCard = global.Card;
const originalWebhook = global.Webhook;
const originalCardSubscription = global.CardSubscription;
const originalAction = global.Action;
const originalList = global.List;
const originalLodash = global._;
describe('helpers/cards create/delete', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        lists: {
          isFinite: jest.fn().mockReturnValue(true),
        },
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({
            position: 1000,
            repositions: [
              {
                record: { id: 'card-r1', listId: 'list-1' },
                position: 500,
              },
            ],
          }),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        actions: {
          createOne: {
            with: jest.fn(),
          },
        },
        cards: {
          deleteRelated: jest.fn(),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
      sendNativeQuery: jest.fn().mockResolvedValue({ rows: [{ next: 7 }] }),
    };
    global.Card = {
      qm: {
        getByListId: jest.fn().mockResolvedValue([]),
        updateOne: jest.fn().mockResolvedValue({ id: 'card-r1' }),
        createOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.CardSubscription = {
      qm: {
        createOne: jest.fn().mockResolvedValue({ id: 'sub-1' }),
      },
    };
    global.Action = {
      Types: {
        CREATE_CARD: 'create_card',
      },
    };
    global.List = {
      Types: {
        CLOSED: 'closed',
      },
    };
    global.Webhook = {
      Events: {
        CARD_CREATE: 'cardCreate',
        CARD_DELETE: 'cardDelete',
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
    if (typeof originalCard === 'undefined') {
      delete global.Card;
    } else {
      global.Card = originalCard;
    }
    if (typeof originalWebhook === 'undefined') {
      delete global.Webhook;
    } else {
      global.Webhook = originalWebhook;
    }
    if (typeof originalCardSubscription === 'undefined') {
      delete global.CardSubscription;
    } else {
      global.CardSubscription = originalCardSubscription;
    }
    if (typeof originalAction === 'undefined') {
      delete global.Action;
    } else {
      global.Action = originalAction;
    }
    if (typeof originalList === 'undefined') {
      delete global.List;
    } else {
      global.List = originalList;
    }
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('throws when position is missing for finite list', async () => {
    const inputs = {
      values: {
        list: { id: 'list-1', type: 'open' },
      },
      project: { id: 'project-1' },
    };
    await expect(createCard.fn(inputs)).rejects.toBe('positionMustBeInValues');
  });
  test('creates card, repositions, subscribes, and sends webhooks', async () => {
    const card = {
      id: 'card-1',
      boardId: 'board-1',
      listId: 'list-1',
      creatorUserId: 'user-1',
    };
    Card.qm.createOne.mockResolvedValue(card);
    const inputs = {
      values: {
        position: 10,
        list: { id: 'list-1', type: 'closed' },
        board: { id: 'board-1' },
        creatorUser: { id: 'user-1', subscribeToOwnCards: true },
      },
      project: { id: 'project-1' },
      request: { id: 'req-1' },
    };
    const result = await createCard.fn(inputs);
    expect(result).toBe(card);
    expect(Card.qm.updateOne).toHaveBeenCalledWith(
      { id: 'card-r1', listId: 'list-1' },
      { position: 500 },
    );
    expect(Card.qm.createOne).toHaveBeenCalledWith(
      expect.objectContaining({
        number: 7,
        boardId: 'board-1',
        listId: 'list-1',
        creatorUserId: 'user-1',
        closedAt: expect.any(String),
      }),
    );
    expect(sails.helpers.actions.createOne.with).toHaveBeenCalled();
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
    expect(CardSubscription.qm.createOne).toHaveBeenCalledWith({
      cardId: 'card-1',
      userId: 'user-1',
    });
    expect(sails.sockets.broadcast).toHaveBeenCalledWith('user:user-1', 'cardUpdate', {
      item: { id: 'card-1', isSubscribed: true },
    });
  });
  test('deletes card and sends webhooks when record exists', async () => {
    const record = { id: 'card-1', boardId: 'board-1' };
    Card.qm.deleteOne.mockResolvedValue(record);
    const result = await deleteCard.fn({
      record,
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-2' },
    });
    expect(result).toBe(record);
    expect(sails.helpers.cards.deleteRelated).toHaveBeenCalledWith(record);
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
