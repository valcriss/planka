const lodash = require('lodash');

const cardsCreateController = require('../api/controllers/cards/create');
const cardsDeleteController = require('../api/controllers/cards/delete');
const cardsShowController = require('../api/controllers/cards/show');
const cardsShowByNumberController = require('../api/controllers/cards/show-by-number');
const cardsUpdateController = require('../api/controllers/cards/update');
const cardsIndexController = require('../api/controllers/cards/index');
const cardsDuplicateController = require('../api/controllers/cards/duplicate');
const cardsReadNotificationsController = require('../api/controllers/cards/read-notifications');

const originalGlobals = {
  sails: global.sails,
  BoardMembership: global.BoardMembership,
  User: global.User,
  Card: global.Card,
  Label: global.Label,
  CardMembership: global.CardMembership,
  CardLabel: global.CardLabel,
  CardSubscription: global.CardSubscription,
  List: global.List,
  TaskList: global.TaskList,
  Task: global.Task,
  Attachment: global.Attachment,
  CustomFieldGroup: global.CustomFieldGroup,
  CustomField: global.CustomField,
  CustomFieldValue: global.CustomFieldValue,
  CardLink: global.CardLink,
  _: global._,
};

const makeInterceptable = (promise) => ({
  intercept: (code, handler) =>
    makeInterceptable(
      promise.catch((error) => {
        if (error === code || (error && error.code === code)) {
          throw handler();
        }
        throw error;
      }),
    ),
  then: (...args) => promise.then(...args),
  catch: (...args) => promise.catch(...args),
  finally: (...args) => promise.finally(...args),
});

const buildError = (code) => {
  const error = new Error(code);
  error.code = code;
  return error;
};

describe('cards controllers', () => {
  beforeEach(() => {
    global._ = lodash;

    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
        getByBoardId: jest.fn(),
      },
    };

    global.User = {
      Roles: { ADMIN: 'admin' },
      qm: { getByIds: jest.fn() },
    };

    global.Card = {
      qm: {
        getByIds: jest.fn(),
        getOneByProjectCodeAndNumber: jest.fn(),
        getByEndlessListId: jest.fn(),
      },
    };

    global.Label = {
      qm: { getByBoardId: jest.fn() },
    };

    global.CardMembership = {
      qm: {
        getByCardId: jest.fn(),
        getByCardIds: jest.fn(),
      },
    };

    global.CardLabel = {
      qm: {
        getByCardId: jest.fn(),
        getByCardIds: jest.fn(),
      },
    };

    global.CardSubscription = {
      qm: { getByCardIdsAndUserId: jest.fn() },
    };

    global.List = {
      qm: { getOneById: jest.fn() },
    };

    global.TaskList = {
      qm: {
        getByCardId: jest.fn(),
        getByCardIds: jest.fn(),
      },
    };

    global.Task = {
      qm: { getByTaskListIds: jest.fn() },
    };

    global.Attachment = {
      Types: { FILE: 'file' },
      qm: {
        getByCardId: jest.fn(),
        getByCardIds: jest.fn(),
        getOneById: jest.fn(),
      },
    };

    global.CustomFieldGroup = {
      qm: {
        getByCardId: jest.fn(),
        getByCardIds: jest.fn(),
      },
    };

    global.CustomField = {
      qm: { getByCustomFieldGroupIds: jest.fn() },
    };

    global.CustomFieldValue = {
      qm: {
        getByCardId: jest.fn(),
        getByCardIds: jest.fn(),
      },
    };

    global.CardLink = {
      qm: {
        getForCardId: jest.fn(),
        getForCardIds: jest.fn(),
      },
    };

    global.sails = {
      helpers: {
        cards: {
          getPathToProjectById: jest.fn(),
          createOne: { with: jest.fn() },
          deleteOne: { with: jest.fn() },
          updateOne: { with: jest.fn() },
          duplicateOne: { with: jest.fn() },
          readNotificationsForUser: { with: jest.fn() },
        },
        boards: {
          getPathToProjectById: jest.fn(),
        },
        lists: {
          getPathToProjectById: jest.fn(),
          isFinite: jest.fn(),
        },
        users: {
          isProjectManager: jest.fn(),
          isCardSubscriber: jest.fn(),
          presentMany: jest.fn((users) => users),
        },
        attachments: {
          presentMany: jest.fn((attachments) => attachments),
        },
        utils: {
          mapRecords: jest.fn((records, key, unique, compact) => {
            if (!records) {
              return [];
            }

            const values = records.map((record) => (key ? record[key] : record.id));
            const filtered = compact ? values.filter(Boolean) : values;
            return unique ? Array.from(new Set(filtered)) : filtered;
          }),
        },
        cardTypes: {
          getOrCreateForProject: { with: jest.fn() },
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalGlobals.sails;
    global.BoardMembership = originalGlobals.BoardMembership;
    global.User = originalGlobals.User;
    global.Card = originalGlobals.Card;
    global.Label = originalGlobals.Label;
    global.CardMembership = originalGlobals.CardMembership;
    global.CardLabel = originalGlobals.CardLabel;
    global.CardSubscription = originalGlobals.CardSubscription;
    global.List = originalGlobals.List;
    global.TaskList = originalGlobals.TaskList;
    global.Task = originalGlobals.Task;
    global.Attachment = originalGlobals.Attachment;
    global.CustomFieldGroup = originalGlobals.CustomFieldGroup;
    global.CustomField = originalGlobals.CustomField;
    global.CustomFieldValue = originalGlobals.CustomFieldValue;
    global.CardLink = originalGlobals.CardLink;
    global._ = originalGlobals._;
  });

  test('cards/create throws when list path is missing', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { listId: 'l1', name: 'Card' },
      ),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('cards/create throws when board membership missing', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { listId: 'l1', name: 'Card' },
      ),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('cards/create throws when member lacks rights', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'viewer' });

    await expect(
      cardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { listId: 'l1', name: 'Card' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('cards/create throws when card type not found', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cardTypes.getOrCreateForProject.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('notFound'))),
    );

    await expect(
      cardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { listId: 'l1', name: 'Card', cardTypeId: 'ct1' },
      ),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('cards/create throws when position is missing', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cards.createOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('positionMustBeInValues'))),
    );

    await expect(
      cardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { listId: 'l1', name: 'Card', position: null },
      ),
    ).rejects.toEqual({
      positionMustBePresent: 'Position must be present',
    });
  });

  test('cards/create returns created card', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cardTypes.getOrCreateForProject.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'ct1', name: 'Bug' })),
    );
    sails.helpers.cards.createOne.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'c1' })),
    );

    const result = await cardsCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { listId: 'l1', name: 'Card', cardTypeId: 'ct1', description: 'Desc' },
    );

    expect(sails.helpers.cardTypes.getOrCreateForProject.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      id: 'ct1',
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(sails.helpers.cards.createOne.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      values: {
        type: 'Bug',
        cardTypeId: 'ct1',
        name: 'Card',
        description: 'Desc',
        board: { id: 'b1' },
        list: { id: 'l1' },
        creatorUser: { id: 'u1' },
      },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'c1' } });
  });

  test('cards/delete throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardsDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'c1' }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/delete throws when board membership missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardsDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'c1' }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/delete throws when member lacks rights', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'viewer' });

    await expect(
      cardsDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'c1' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('cards/delete throws when delete returns null', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cards.deleteOne.with.mockResolvedValue(null);

    await expect(
      cardsDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'c1' }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/delete returns deleted card', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cards.deleteOne.with.mockResolvedValue({ id: 'c1' });

    const result = await cardsDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'c1' },
    );

    expect(sails.helpers.cards.deleteOne.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      board: { id: 'b1' },
      list: { id: 'l1' },
      record: { id: 'c1' },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'c1' } });
  });

  test('cards/show throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardsShowController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { id: 'c1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/show throws when member lacks access', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1', boardId: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardsShowController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { id: 'c1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/show returns card with included data', async () => {
    const card = { id: 'c1', boardId: 'b1', creatorUserId: 'u2' };
    const project = { id: 'p1', ownerProjectManagerId: null };

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ card, project })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isCardSubscriber.mockResolvedValue(true);

    User.qm.getByIds.mockResolvedValue([{ id: 'u2' }]);
    CardMembership.qm.getByCardId.mockResolvedValue([{ id: 'cm1' }]);
    CardLabel.qm.getByCardId.mockResolvedValue([{ id: 'cl1' }]);

    TaskList.qm.getByCardId.mockResolvedValue([{ id: 'tl1' }]);
    Task.qm.getByTaskListIds.mockResolvedValue([{ id: 't1' }]);
    Attachment.qm.getByCardId.mockResolvedValue([{ id: 'a1' }]);

    CustomFieldGroup.qm.getByCardId.mockResolvedValue([{ id: 'cfg1' }]);
    CustomField.qm.getByCustomFieldGroupIds.mockResolvedValue([{ id: 'cf1' }]);
    CustomFieldValue.qm.getByCardId.mockResolvedValue([{ id: 'cfv1' }]);

    CardLink.qm.getForCardId.mockResolvedValue([
      { id: 'clnk1', cardId: 'c1', linkedCardId: 'c2' },
      { id: 'clnk2', cardId: 'c3', linkedCardId: 'c1' },
    ]);
    Card.qm.getByIds.mockResolvedValue([{ id: 'c2' }, { id: 'c3' }]);

    const result = await cardsShowController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'user' } } },
      { id: 'c1' },
    );

    expect(sails.helpers.users.isCardSubscriber).toHaveBeenCalledWith('u1', 'c1');
    expect(result).toEqual({
      item: { ...card, isSubscribed: true },
      included: {
        cardLinks: [
          { id: 'clnk1', cardId: 'c1', linkedCardId: 'c2' },
          { id: 'clnk2', cardId: 'c3', linkedCardId: 'c1' },
        ],
        cardMemberships: [{ id: 'cm1' }],
        cardLabels: [{ id: 'cl1' }],
        taskLists: [{ id: 'tl1' }],
        tasks: [{ id: 't1' }],
        customFieldGroups: [{ id: 'cfg1' }],
        customFields: [{ id: 'cf1' }],
        customFieldValues: [{ id: 'cfv1' }],
        linkedCards: [{ id: 'c2' }, { id: 'c3' }],
        users: [{ id: 'u2' }],
        attachments: [{ id: 'a1' }],
      },
    });
  });

  test('cards/show-by-number throws when card is missing', async () => {
    Card.qm.getOneByProjectCodeAndNumber.mockResolvedValue(null);

    await expect(
      cardsShowByNumberController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { projectCode: 'P', number: 1 },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/show-by-number throws when member lacks access', async () => {
    const card = { id: 'c1', boardId: 'b1' };

    Card.qm.getOneByProjectCodeAndNumber.mockResolvedValue(card);
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card,
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardsShowByNumberController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { projectCode: 'P', number: 1 },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/show-by-number returns card with included data', async () => {
    const card = { id: 'c1', boardId: 'b1', creatorUserId: 'u2' };
    const project = { id: 'p1', ownerProjectManagerId: null };

    Card.qm.getOneByProjectCodeAndNumber.mockResolvedValue(card);
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ card, project })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isCardSubscriber.mockResolvedValue(false);

    User.qm.getByIds.mockResolvedValue([{ id: 'u2' }]);
    CardMembership.qm.getByCardId.mockResolvedValue([{ id: 'cm1' }]);
    CardLabel.qm.getByCardId.mockResolvedValue([{ id: 'cl1' }]);

    TaskList.qm.getByCardId.mockResolvedValue([{ id: 'tl1' }]);
    Task.qm.getByTaskListIds.mockResolvedValue([{ id: 't1' }]);
    Attachment.qm.getByCardId.mockResolvedValue([{ id: 'a1' }]);

    CustomFieldGroup.qm.getByCardId.mockResolvedValue([{ id: 'cfg1' }]);
    CustomField.qm.getByCustomFieldGroupIds.mockResolvedValue([{ id: 'cf1' }]);
    CustomFieldValue.qm.getByCardId.mockResolvedValue([{ id: 'cfv1' }]);

    CardLink.qm.getForCardId.mockResolvedValue([{ id: 'clnk1', cardId: 'c1', linkedCardId: 'c2' }]);
    Card.qm.getByIds.mockResolvedValue([{ id: 'c2' }]);

    const result = await cardsShowByNumberController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'user' } } },
      { projectCode: 'P', number: 1 },
    );

    expect(result).toEqual({
      item: { ...card, isSubscribed: false },
      included: {
        cardLinks: [{ id: 'clnk1', cardId: 'c1', linkedCardId: 'c2' }],
        cardMemberships: [{ id: 'cm1' }],
        cardLabels: [{ id: 'cl1' }],
        taskLists: [{ id: 'tl1' }],
        tasks: [{ id: 't1' }],
        customFieldGroups: [{ id: 'cfg1' }],
        customFields: [{ id: 'cf1' }],
        customFieldValues: [{ id: 'cfv1' }],
        linkedCards: [{ id: 'c2' }],
        users: [{ id: 'u2' }],
        attachments: [{ id: 'a1' }],
      },
    });
  });

  test('cards/update throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', name: 'New' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/update throws when member lacks rights', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'viewer' });

    await expect(
      cardsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', name: 'New' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('cards/update throws when list is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    List.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', listId: 'l2' },
      ),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('cards/update throws when cover attachment missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    Attachment.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', coverAttachmentId: 'a1' },
      ),
    ).rejects.toEqual({
      coverAttachmentNotFound: 'Cover attachment not found',
    });
  });

  test('cards/update throws when card type missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cardTypes.getOrCreateForProject.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('notFound'))),
    );

    await expect(
      cardsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', cardTypeId: 'ct1' },
      ),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('cards/update throws when position is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cards.updateOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('positionMustBeInValues'))),
    );

    await expect(
      cardsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', position: null },
      ),
    ).rejects.toEqual({
      positionMustBePresent: 'Position must be present',
    });
  });

  test('cards/update throws when list is missing in values', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cards.updateOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('listMustBeInValues'))),
    );

    await expect(
      cardsUpdateController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'c1' }),
    ).rejects.toEqual({
      listMustBePresent: 'List must be present',
    });
  });

  test('cards/update throws when cover attachment must contain image', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    Attachment.qm.getOneById.mockResolvedValue({ id: 'a1', type: Attachment.Types.FILE });
    sails.helpers.cards.updateOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('coverAttachmentInValuesMustContainImage'))),
    );

    await expect(
      cardsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', coverAttachmentId: 'a1' },
      ),
    ).rejects.toEqual({
      coverAttachmentMustContainImage: 'Cover attachment must contain image',
    });
  });

  test('cards/update returns updated card', async () => {
    const card = { id: 'c1' };
    const list = { id: 'l1' };
    const board = { id: 'b1' };
    const project = { id: 'p1' };

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ card, list, board, project })),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.cardTypes.getOrCreateForProject.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'ct1', name: 'Bug' })),
    );
    sails.helpers.cards.updateOne.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'c1', name: 'Next' })),
    );

    const result = await cardsUpdateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'c1', name: 'Next', cardTypeId: 'ct1' },
    );

    expect(sails.helpers.cards.updateOne.with).toHaveBeenCalledWith({
      project,
      board,
      list,
      record: card,
      values: {
        cardTypeId: 'ct1',
        name: 'Next',
        type: 'Bug',
        project: undefined,
        board: undefined,
        list: undefined,
        coverAttachment: undefined,
      },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'c1', name: 'Next' } });
  });

  test('cards/index throws when list path is missing', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardsIndexController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { listId: 'l1' },
      ),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('cards/index throws when member lacks access', async () => {
    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({ list: { id: 'l1', boardId: 'b1' }, project: { id: 'p1' } }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardsIndexController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { listId: 'l1' },
      ),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('cards/index returns cards with included data', async () => {
    const list = { id: 'l1', boardId: 'b1' };
    const project = { id: 'p1', ownerProjectManagerId: null };

    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ list, project })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);

    BoardMembership.qm.getByBoardId.mockResolvedValue([{ id: 'bm1', userId: 'u2' }]);
    Label.qm.getByBoardId.mockResolvedValue([{ id: 'lab1' }]);

    Card.qm.getByEndlessListId.mockResolvedValue([
      { id: 'c1', creatorUserId: 'u2' },
      { id: 'c2', creatorUserId: 'u2' },
    ]);
    CardLink.qm.getForCardIds.mockResolvedValue([{ id: 'cl1', cardId: 'c1', linkedCardId: 'c3' }]);
    Card.qm.getByIds.mockResolvedValue([{ id: 'c3' }]);

    User.qm.getByIds.mockResolvedValue([{ id: 'u2' }]);
    CardSubscription.qm.getByCardIdsAndUserId.mockResolvedValue([{ cardId: 'c1' }]);
    CardMembership.qm.getByCardIds.mockResolvedValue([{ id: 'cm1' }]);
    CardLabel.qm.getByCardIds.mockResolvedValue([{ id: 'clb1' }]);
    TaskList.qm.getByCardIds.mockResolvedValue([{ id: 'tl1' }]);
    Task.qm.getByTaskListIds.mockResolvedValue([{ id: 't1' }]);
    Attachment.qm.getByCardIds.mockResolvedValue([{ id: 'a1' }]);
    CustomFieldGroup.qm.getByCardIds.mockResolvedValue([{ id: 'cfg1' }]);
    CustomField.qm.getByCustomFieldGroupIds.mockResolvedValue([{ id: 'cf1' }]);
    CustomFieldValue.qm.getByCardIds.mockResolvedValue([{ id: 'cfv1' }]);

    const result = await cardsIndexController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'user' } } },
      { listId: 'l1', filterUserIds: 'u1,u2', filterLabelIds: 'lab1,lab2' },
    );

    expect(Card.qm.getByEndlessListId).toHaveBeenCalledWith('l1', {
      filterUserIds: ['u2'],
      filterLabelIds: ['lab1'],
      before: undefined,
      search: undefined,
    });
    expect(result).toEqual({
      items: [
        { id: 'c1', creatorUserId: 'u2', isSubscribed: true },
        { id: 'c2', creatorUserId: 'u2', isSubscribed: false },
      ],
      included: {
        cardLinks: [{ id: 'cl1', cardId: 'c1', linkedCardId: 'c3' }],
        cardMemberships: [{ id: 'cm1' }],
        cardLabels: [{ id: 'clb1' }],
        taskLists: [{ id: 'tl1' }],
        tasks: [{ id: 't1' }],
        customFieldGroups: [{ id: 'cfg1' }],
        customFields: [{ id: 'cf1' }],
        customFieldValues: [{ id: 'cfv1' }],
        linkedCards: [{ id: 'c3' }],
        users: [{ id: 'u2' }],
        attachments: [{ id: 'a1' }],
      },
    });
  });

  test('cards/duplicate throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardsDuplicateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', position: 1, name: 'Copy' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/duplicate throws when list is not finite', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.lists.isFinite.mockReturnValue(false);

    await expect(
      cardsDuplicateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'c1', position: 1, name: 'Copy' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('cards/duplicate returns duplicated card', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1' },
          list: { id: 'l1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    sails.helpers.lists.isFinite.mockReturnValue(true);
    sails.helpers.cards.duplicateOne.with.mockResolvedValue({
      card: { id: 'c2' },
      cardMemberships: [{ id: 'cm1' }],
      cardLabels: [{ id: 'cl1' }],
      taskLists: [{ id: 'tl1' }],
      tasks: [{ id: 't1' }],
      attachments: [{ id: 'a1' }],
      customFieldGroups: [{ id: 'cfg1' }],
      customFields: [{ id: 'cf1' }],
      customFieldValues: [{ id: 'cfv1' }],
    });

    const result = await cardsDuplicateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'c1', position: 1, name: 'Copy' },
    );

    expect(result).toEqual({
      item: { id: 'c2' },
      included: {
        cardLinks: [],
        linkedCards: [],
        cardMemberships: [{ id: 'cm1' }],
        cardLabels: [{ id: 'cl1' }],
        taskLists: [{ id: 'tl1' }],
        tasks: [{ id: 't1' }],
        customFieldGroups: [{ id: 'cfg1' }],
        customFields: [{ id: 'cf1' }],
        customFieldValues: [{ id: 'cfv1' }],
        attachments: [{ id: 'a1' }],
      },
    });
  });

  test('cards/read-notifications throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardsReadNotificationsController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { id: 'c1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/read-notifications throws when member lacks access', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1', boardId: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardsReadNotificationsController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { id: 'c1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('cards/read-notifications returns notifications', async () => {
    const card = { id: 'c1', boardId: 'b1' };
    const project = { id: 'p1', ownerProjectManagerId: null };

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ card, project })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cards.readNotificationsForUser.with.mockResolvedValue([{ id: 'n1' }]);

    const result = await cardsReadNotificationsController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'user' } } },
      { id: 'c1' },
    );

    expect(result).toEqual({
      item: card,
      included: {
        notifications: [{ id: 'n1' }],
      },
    });
  });
});
