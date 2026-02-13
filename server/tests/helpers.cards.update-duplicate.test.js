const lodash = require('lodash');
const updateCard = require('../api/helpers/cards/update-one');
const duplicateCard = require('../api/helpers/cards/duplicate-one');

const originalSails = global.sails;
const originalCard = global.Card;
const originalWebhook = global.Webhook;
const originalCardSubscription = global.CardSubscription;
const originalList = global.List;
const originalAction = global.Action;
const originalLodash = global._;
const originalModels = {};
const modelNames = [
  'CardLink',
  'CardSubscription',
  'CardMembership',
  'CardLabel',
  'TaskList',
  'Task',
  'Attachment',
  'CustomFieldGroup',
  'CustomField',
  'CustomFieldValue',
  'Label',
  'Sprint',
  'SprintCard',
];
describe('helpers/cards update-one and duplicate-one', () => {
  beforeEach(() => {
    global._ = lodash;
    global.sails = {
      helpers: {
        lists: {
          isFinite: jest.fn().mockReturnValue(true),
          isArchiveOrTrash: jest.fn().mockReturnValue(false),
        },
        actions: {
          createOne: {
            with: jest.fn(),
          },
        },
        utils: {
          insertToPositionables: jest.fn().mockReturnValue({ position: 10, repositions: [] }),
          mapRecords: jest.fn().mockReturnValue([]),
          generateIds: jest.fn().mockResolvedValue([]),
          sendWebhooks: {
            with: jest.fn(),
          },
        },
        users: {
          isCardSubscriber: jest.fn().mockResolvedValue(false),
        },
      },
      sockets: {
        broadcast: jest.fn(),
      },
      sendNativeQuery: jest.fn().mockResolvedValue({ rows: [{ next: 3 }] }),
    };
    global.Card = {
      qm: {
        getByListId: jest.fn().mockResolvedValue([]),
        getByIds: jest.fn().mockResolvedValue([]),
        updateOne: jest.fn().mockResolvedValue({ id: 'card-1' }),
        createOne: jest.fn().mockResolvedValue({ id: 'card-2', boardId: 'board-1' }),
      },
    };
    global.CardSubscription = {
      qm: {
        createOne: jest.fn(),
        deleteOne: jest.fn(),
      },
    };
    global.List = {
      Types: {
        CLOSED: 'closed',
        ARCHIVE: 'archive',
        TRASH: 'trash',
      },
    };
    global.Action = {
      Types: {
        CREATE_CARD: 'createCard',
      },
    };
    modelNames.forEach((name) => {
      originalModels[name] = global[name];
      global[name] = {
        qm: {
          getByCardId: jest.fn().mockResolvedValue([]),
          getByTaskListId: jest.fn().mockResolvedValue([]),
          getByTaskListIds: jest.fn().mockResolvedValue([]),
          getByCustomFieldGroupIds: jest.fn().mockResolvedValue([]),
          getByBoardId: jest.fn().mockResolvedValue([]),
          getByIds: jest.fn().mockResolvedValue([]),
          getByProjectId: jest.fn().mockResolvedValue([]),
          getOneById: jest.fn().mockResolvedValue(null),
          getForCardId: jest.fn().mockResolvedValue([]),
          createOne: jest.fn().mockResolvedValue({ id: 'id-1' }),
          create: jest.fn().mockResolvedValue([]),
          updateOne: jest.fn().mockResolvedValue({ id: 'id-1' }),
          update: jest.fn().mockResolvedValue([]),
          delete: jest.fn().mockResolvedValue([]),
        },
      };
    });
    global.Webhook = {
      Events: {
        CARD_UPDATE: 'cardUpdate',
        CARD_CREATE: 'cardCreate',
      },
      qm: {
        getAll: jest.fn().mockResolvedValue([{ id: 'wh-1' }]),
      },
    };
    global.sails.helpers.attachments = {
      presentMany: jest.fn().mockReturnValue([]),
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
    if (typeof originalList === 'undefined') {
      delete global.List;
    } else {
      global.List = originalList;
    }
    if (typeof originalAction === 'undefined') {
      delete global.Action;
    } else {
      global.Action = originalAction;
    }
    modelNames.forEach((name) => {
      if (typeof originalModels[name] === 'undefined') {
        delete global[name];
      } else {
        global[name] = originalModels[name];
      }
    });
    if (typeof originalLodash === 'undefined') {
      delete global._;
    } else {
      global._ = originalLodash;
    }
  });
  test('throws when cover attachment lacks image', async () => {
    const inputs = {
      record: { id: 'card-1' },
      values: { coverAttachment: { id: 'att-1', data: { image: false } } },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1', boardId: 'board-1' },
      actorUser: { id: 'actor-1' },
    };
    await expect(updateCard.fn(inputs)).rejects.toBe('coverAttachmentInValuesMustContainImage');
  });
  test('updates subscription status without other changes', async () => {
    const record = { id: 'card-2', boardId: 'board-1' };
    const result = await updateCard.fn({
      record,
      values: { isSubscribed: true },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1', boardId: 'board-1' },
      actorUser: { id: 'actor-1' },
      request: { id: 'req-1' },
    });
    expect(result).toBe(record);
    expect(CardSubscription.qm.createOne).toHaveBeenCalledWith({
      cardId: 'card-2',
      userId: 'actor-1',
    });
  });
  test('throws when position missing for finite list on duplicate', async () => {
    const inputs = {
      record: { id: 'card-3', boardId: 'board-1' },
      values: { creatorUser: { id: 'user-1' } },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
    };
    await expect(duplicateCard.fn(inputs)).rejects.toBe('positionMustBeInValues');
  });
  test('duplicates card with minimal related records', async () => {
    sails.helpers.lists.isFinite.mockReturnValue(false);
    const result = await duplicateCard.fn({
      record: { id: 'card-4', boardId: 'board-1', listId: 'list-1' },
      values: { creatorUser: { id: 'user-1' } },
      project: { id: 'project-1' },
      board: { id: 'board-1' },
      list: { id: 'list-1' },
      request: { id: 'req-2' },
    });
    expect(result).toEqual({
      card: { id: 'card-2', boardId: 'board-1' },
      cardMemberships: [],
      cardLabels: [],
      taskLists: [],
      tasks: [],
      attachments: [],
      customFieldGroups: [],
      customFields: [],
      customFieldValues: [],
    });
    expect(sails.helpers.utils.sendWebhooks.with).toHaveBeenCalled();
  });
});
