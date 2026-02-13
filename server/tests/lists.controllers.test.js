const originalGlobals = {
  sails: global.sails,
  BoardMembership: global.BoardMembership,
  List: global.List,
  User: global.User,
  Card: global.Card,
  CardLink: global.CardLink,
  CardMembership: global.CardMembership,
  CardLabel: global.CardLabel,
  TaskList: global.TaskList,
  Task: global.Task,
  Attachment: global.Attachment,
  CustomFieldGroup: global.CustomFieldGroup,
  CustomField: global.CustomField,
  CustomFieldValue: global.CustomFieldValue,
  CardSubscription: global.CardSubscription,
  _: global._,
};

const makeInterceptable = (value, codeToThrow, shouldThrow = () => true) => ({
  intercept(code, handler) {
    if (code === codeToThrow && shouldThrow()) {
      throw handler();
    }

    return value;
  },
});

const buildCardTypeChain = (value, shouldThrow) => ({
  with() {
    return {
      intercept(code, handler) {
        if (code === 'notFound' && shouldThrow()) {
          throw handler();
        }
        return value;
      },
    };
  },
});

const mapRecords = (records, key = 'id', filterFalsy = false, unique = false) => {
  const mapped = records.map((record) => record[key]);
  const filtered = filterFalsy ? mapped.filter((value) => Boolean(value)) : mapped;
  return unique ? [...new Set(filtered)] : filtered;
};

describe('lists create/delete/show controllers', () => {
  let createController;
  let deleteController;
  let showController;
  let boardPathNotFound;
  let listPathNotFound;
  let cardTypeNotFound;
  let currentUser;
  let boardRecord;
  let projectRecord;
  let listRecord;

  beforeEach(() => {
    // eslint-disable-next-line global-require
    global._ = require('lodash');

    boardPathNotFound = false;
    listPathNotFound = false;
    cardTypeNotFound = false;

    currentUser = { id: 'u1', role: 'member' };
    boardRecord = { id: 'b1' };
    projectRecord = { id: 'p1', ownerProjectManagerId: null };
    listRecord = { id: 'l1', boardId: 'b1', type: 'active' };

    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(() =>
            makeInterceptable(
              { board: boardRecord, project: projectRecord },
              'pathNotFound',
              () => boardPathNotFound,
            ),
          ),
        },
        lists: {
          getPathToProjectById: jest.fn(() =>
            makeInterceptable(
              { list: listRecord, board: boardRecord, project: projectRecord },
              'pathNotFound',
              () => listPathNotFound,
            ),
          ),
          createOne: {
            with: jest.fn().mockResolvedValue({ id: 'l2', name: 'Backlog' }),
          },
          deleteOne: {
            with: jest.fn().mockResolvedValue({ list: listRecord, cards: [] }),
          },
          isFinite: jest.fn().mockReturnValue(true),
        },
        cardTypes: {
          getOrCreateForProject: buildCardTypeChain(
            { id: 'ct1', name: 'Bug' },
            () => cardTypeNotFound,
          ),
        },
        users: {
          isProjectManager: jest.fn().mockResolvedValue(true),
          presentMany: jest.fn((users) => users),
        },
        attachments: {
          presentMany: jest.fn((attachments) => attachments),
        },
        utils: {
          mapRecords,
        },
      },
    };

    global.List = {
      FINITE_TYPES: ['active', 'closed'],
      COLORS: ['red', 'green'],
    };

    global.BoardMembership = {
      Roles: { EDITOR: 'editor', VIEWER: 'viewer' },
      qm: {
        getOneByBoardIdAndUserId: jest.fn().mockResolvedValue({ id: 'bm1', role: 'editor' }),
      },
    };

    global.User = {
      Roles: { ADMIN: 'admin' },
      qm: { getByIds: jest.fn().mockResolvedValue([]) },
    };

    global.Card = {
      qm: {
        getByListId: jest.fn().mockResolvedValue([{ id: 'c1', creatorUserId: 'u2' }]),
        getByIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.CardLink = {
      qm: {
        getForCardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.CardMembership = {
      qm: {
        getByCardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.CardLabel = {
      qm: {
        getByCardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.TaskList = {
      qm: {
        getByCardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.Task = {
      qm: {
        getByTaskListIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.Attachment = {
      qm: {
        getByCardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.CustomFieldGroup = {
      qm: {
        getByCardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.CustomField = {
      qm: {
        getByCustomFieldGroupIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.CustomFieldValue = {
      qm: {
        getByCardIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.CardSubscription = {
      qm: {
        getByCardIdsAndUserId: jest.fn().mockResolvedValue([{ cardId: 'c1' }]),
      },
    };

    // eslint-disable-next-line global-require
    createController = require('../api/controllers/lists/create');
    // eslint-disable-next-line global-require
    deleteController = require('../api/controllers/lists/delete');
    // eslint-disable-next-line global-require
    showController = require('../api/controllers/lists/show');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalGlobals.sails;
    global.BoardMembership = originalGlobals.BoardMembership;
    global.List = originalGlobals.List;
    global.User = originalGlobals.User;
    global.Card = originalGlobals.Card;
    global.CardLink = originalGlobals.CardLink;
    global.CardMembership = originalGlobals.CardMembership;
    global.CardLabel = originalGlobals.CardLabel;
    global.TaskList = originalGlobals.TaskList;
    global.Task = originalGlobals.Task;
    global.Attachment = originalGlobals.Attachment;
    global.CustomFieldGroup = originalGlobals.CustomFieldGroup;
    global.CustomField = originalGlobals.CustomField;
    global.CustomFieldValue = originalGlobals.CustomFieldValue;
    global.CardSubscription = originalGlobals.CardSubscription;
    global._ = originalGlobals._;
  });

  const call = (controller, inputs, userOverrides = {}) =>
    controller.fn.call({ req: { currentUser: { ...currentUser, ...userOverrides } } }, inputs);

  test('lists/create handles path and membership checks', async () => {
    boardPathNotFound = true;
    await expect(
      call(createController, { boardId: 'b1', type: 'active', position: 0, name: 'Backlog' }),
    ).rejects.toEqual({ boardNotFound: 'Board not found' });

    boardPathNotFound = false;
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      call(createController, { boardId: 'b1', type: 'active', position: 0, name: 'Backlog' }),
    ).rejects.toEqual({ boardNotFound: 'Board not found' });

    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      call(createController, { boardId: 'b1', type: 'active', position: 0, name: 'Backlog' }),
    ).rejects.toEqual({ notEnoughRights: 'Not enough rights' });
  });

  test('lists/create handles card type resolution and success', async () => {
    cardTypeNotFound = true;
    await expect(
      call(createController, {
        boardId: 'b1',
        type: 'active',
        position: 0,
        name: 'Backlog',
        defaultCardTypeId: 'ct1',
      }),
    ).rejects.toEqual({ cardTypeNotFound: 'Card type not found' });

    cardTypeNotFound = false;
    const result = await call(createController, {
      boardId: 'b1',
      type: 'active',
      position: 1,
      name: 'Backlog',
      defaultCardTypeId: 'ct1',
    });

    expect(sails.helpers.lists.createOne.with).toHaveBeenCalledWith({
      project: projectRecord,
      values: {
        board: boardRecord,
        type: 'active',
        position: 1,
        name: 'Backlog',
        defaultCardTypeId: 'ct1',
        defaultCardType: 'Bug',
      },
      actorUser: currentUser,
      request: expect.anything(),
    });
    expect(result).toEqual({ item: { id: 'l2', name: 'Backlog' } });
  });

  test('lists/delete handles path and rights checks', async () => {
    listPathNotFound = true;
    await expect(call(deleteController, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    listPathNotFound = false;
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(call(deleteController, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.isFinite.mockReturnValueOnce(false);
    await expect(call(deleteController, { id: 'l1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(call(deleteController, { id: 'l1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('lists/delete handles missing delete result and success', async () => {
    sails.helpers.lists.deleteOne.with.mockResolvedValueOnce({ list: null, cards: [] });
    await expect(call(deleteController, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.deleteOne.with.mockResolvedValueOnce({ list: listRecord, cards: [] });
    const result = await call(deleteController, { id: 'l1' });

    expect(result).toEqual({
      item: listRecord,
      included: {
        cards: [],
      },
    });
  });

  test('lists/show handles path, finite list and access checks', async () => {
    listPathNotFound = true;
    await expect(call(showController, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    listPathNotFound = false;
    sails.helpers.lists.isFinite.mockReturnValueOnce(false);
    await expect(call(showController, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.isFinite.mockReturnValueOnce(true);
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(call(showController, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('lists/show returns list with included data', async () => {
    const result = await call(showController, { id: 'l1' }, { role: 'admin' });

    expect(result.item).toEqual(listRecord);
    expect(result.included.cards).toEqual([{ id: 'c1', creatorUserId: 'u2', isSubscribed: true }]);
    expect(result.included.cardLinks).toEqual([]);
    expect(result.included.users).toEqual([]);
  });
});
