const lodash = require('lodash');

let boardsCreateController;
let boardsDeleteController;
let boardsShowController;
let boardsShowBySlugController;

const originalGlobals = {
  _: global._,
  sails: global.sails,
  Project: global.Project,
  Board: global.Board,
  User: global.User,
  BoardMembership: global.BoardMembership,
  Label: global.Label,
  List: global.List,
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

describe('boards controllers', () => {
  beforeEach(() => {
    global._ = lodash;

    global.Project = {
      qm: {
        getOneById: jest.fn(),
        getOneByCode: jest.fn(),
      },
    };

    global.Board = {
      ImportTypes: { TRELLO: 'trello', PLANNER: 'planner' },
      Views: { KANBAN: 'kanban' },
      qm: {
        getOneByProjectIdAndSlug: jest.fn(),
      },
    };

    global.User = {
      Roles: { ADMIN: 'admin' },
      qm: {
        getByIds: jest.fn().mockResolvedValue([]),
      },
    };

    global.BoardMembership = {
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
        getByBoardId: jest.fn().mockResolvedValue([]),
      },
    };

    global.Label = { qm: { getByBoardId: jest.fn().mockResolvedValue([]) } };
    global.List = { qm: { getByBoardId: jest.fn().mockResolvedValue([]) } };
    global.Card = { qm: { getByListIds: jest.fn().mockResolvedValue([]), getByIds: jest.fn() } };
    global.CardLink = { qm: { getForCardIds: jest.fn().mockResolvedValue([]) } };
    global.CardMembership = { qm: { getByCardIds: jest.fn().mockResolvedValue([]) } };
    global.CardLabel = { qm: { getByCardIds: jest.fn().mockResolvedValue([]) } };
    global.TaskList = { qm: { getByCardIds: jest.fn().mockResolvedValue([]) } };
    global.Task = { qm: { getByTaskListIds: jest.fn().mockResolvedValue([]) } };
    global.Attachment = { qm: { getByCardIds: jest.fn().mockResolvedValue([]) } };
    global.CustomFieldGroup = {
      qm: {
        getByBoardId: jest.fn().mockResolvedValue([]),
        getByCardIds: jest.fn().mockResolvedValue([]),
      },
    };
    global.CustomField = {
      qm: { getByCustomFieldGroupIds: jest.fn().mockResolvedValue([]) },
    };
    global.CustomFieldValue = { qm: { getByCardIds: jest.fn().mockResolvedValue([]) } };
    global.CardSubscription = {
      qm: { getByCardIdsAndUserId: jest.fn().mockResolvedValue([]) },
    };

    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(),
          createOne: { with: jest.fn() },
          deleteOne: { with: jest.fn() },
          processUploadedTrelloImportFile: jest.fn(),
          processUploadedPlannerImportFile: jest.fn(),
        },
        users: {
          isProjectManager: jest.fn(),
          isBoardSubscriber: jest.fn().mockResolvedValue(false),
          presentMany: jest.fn((users) => users),
        },
        lists: {
          isFinite: jest.fn(() => true),
        },
        utils: {
          receiveFile: jest.fn(),
          mapRecords: jest.fn((records, key = 'id') => records.map((record) => record[key])),
        },
        attachments: {
          presentMany: jest.fn((attachments) => attachments),
        },
        cardTypes: {
          getOrCreateForProject: { with: jest.fn() },
        },
      },
      sockets: {
        join: jest.fn(),
      },
    };

    /* eslint-disable global-require */
    boardsCreateController = require('../api/controllers/boards/create');
    boardsDeleteController = require('../api/controllers/boards/delete');
    boardsShowController = require('../api/controllers/boards/show');
    boardsShowBySlugController = require('../api/controllers/boards/show-by-slug');
    /* eslint-enable global-require */
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global._ = originalGlobals._;
    global.sails = originalGlobals.sails;
    global.Project = originalGlobals.Project;
    global.Board = originalGlobals.Board;
    global.User = originalGlobals.User;
    global.BoardMembership = originalGlobals.BoardMembership;
    global.Label = originalGlobals.Label;
    global.List = originalGlobals.List;
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
  });

  test('boards/create throws when project is missing', async () => {
    Project.qm.getOneById.mockResolvedValue(null);

    await expect(
      boardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1', position: 0, name: 'Board', requestId: 'r1' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('boards/create throws when user lacks access', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      boardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { projectId: 'p1', position: 0, name: 'Board', requestId: 'r1' },
      ),
    ).rejects.toEqual({
      projectNotFound: 'Project not found',
    });
  });

  test('boards/create throws when import file is missing', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.utils.receiveFile.mockResolvedValue([]);

    await expect(
      boardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        {
          projectId: 'p1',
          position: 0,
          name: 'Board',
          importType: Board.ImportTypes.TRELLO,
          requestId: 'r1',
        },
      ),
    ).rejects.toEqual({
      noImportFileWasUploaded: 'No import file was uploaded',
    });
  });

  test('boards/create throws when import file is invalid', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.utils.receiveFile.mockResolvedValue([{ name: 'import.json' }]);
    sails.helpers.boards.processUploadedTrelloImportFile.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('invalidFile'))),
    );

    await expect(
      boardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        {
          projectId: 'p1',
          position: 0,
          name: 'Board',
          importType: Board.ImportTypes.TRELLO,
          requestId: 'r1',
        },
      ),
    ).rejects.toEqual({
      invalidImportFile: 'Invalid import file',
    });
  });

  test('boards/create throws when card type is missing', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.getOrCreateForProject.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('notFound'))),
    );

    await expect(
      boardsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        {
          projectId: 'p1',
          position: 0,
          name: 'Board',
          defaultCardTypeId: 'ct-missing',
          requestId: 'r1',
        },
      ),
    ).rejects.toEqual({
      cardTypeNotFound: 'Card type not found',
    });
  });

  test('boards/create returns created board and membership', async () => {
    Project.qm.getOneById.mockResolvedValue({ id: 'p1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.cardTypes.getOrCreateForProject.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'ct1', name: 'Bug' })),
    );
    sails.helpers.boards.createOne.with.mockResolvedValue({
      board: { id: 'b1' },
      boardMembership: { id: 'bm1' },
    });

    const result = await boardsCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      {
        projectId: 'p1',
        position: 0,
        name: 'Board',
        defaultCardTypeId: 'ct1',
        requestId: 'r1',
      },
    );

    expect(sails.helpers.boards.createOne.with).toHaveBeenCalledWith({
      values: {
        position: 0,
        name: 'Board',
        defaultCardType: 'Bug',
        defaultCardTypeId: 'ct1',
        project: { id: 'p1' },
      },
      import: undefined,
      actorUser: { id: 'u1' },
      requestId: 'r1',
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({
      item: { id: 'b1' },
      included: { boardMemberships: [{ id: 'bm1' }] },
    });
  });

  test('boards/delete throws when board path is missing', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      boardsDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'b1' }),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/delete throws when user lacks access', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      boardsDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'b1' }),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/delete throws when deleteOne returns null', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.boards.deleteOne.with.mockResolvedValue(null);

    await expect(
      boardsDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'b1' }),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/delete returns deleted board', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.boards.deleteOne.with.mockResolvedValue({ id: 'b1' });

    const result = await boardsDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'b1' },
    );

    expect(result).toEqual({ item: { id: 'b1' } });
  });

  test('boards/show throws when board path is missing', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      boardsShowController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'b1' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/show throws when user lacks access', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      boardsShowController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { id: 'b1' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/show returns board details and joins socket', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          board: { id: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    sails.helpers.users.isBoardSubscriber.mockResolvedValue(true);

    const result = await boardsShowController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'admin' }, isSocket: true } },
      { id: 'b1', subscribe: true },
    );

    expect(sails.sockets.join).toHaveBeenCalledWith(expect.any(Object), 'board:b1');
    expect(result).toMatchObject({
      item: { id: 'b1', isSubscribed: true },
      included: {
        boardMemberships: [],
        labels: [],
        lists: [],
        cards: [],
        cardLinks: [],
        cardMemberships: [],
        cardLabels: [],
        taskLists: [],
        tasks: [],
        customFieldGroups: [],
        customFields: [],
        customFieldValues: [],
        users: [],
        projects: [{ id: 'p1', ownerProjectManagerId: null }],
        attachments: [],
      },
    });
  });

  test('boards/show includes linked cards referenced by card links outside current board', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          board: { id: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    List.qm.getByBoardId.mockResolvedValue([{ id: 'l1', boardId: 'b1', type: 'active' }]);
    Card.qm.getByListIds.mockResolvedValue([{ id: 'c1', listId: 'l1', boardId: 'b1' }]);
    CardLink.qm.getForCardIds.mockResolvedValue([{ id: 'cl1', cardId: 'c1', linkedCardId: 'c2' }]);
    Card.qm.getByIds.mockResolvedValue([{ id: 'c2', name: 'Linked card', boardId: 'b2' }]);

    const result = await boardsShowController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'admin' } } },
      { id: 'b1' },
    );

    expect(Card.qm.getByIds).toHaveBeenCalledWith(['c2']);
    expect(result.included.linkedCards).toEqual([{ id: 'c2', name: 'Linked card', boardId: 'b2' }]);
  });

  test('boards/show-by-slug throws when project is missing', async () => {
    Project.qm.getOneByCode.mockResolvedValue(null);

    await expect(
      boardsShowBySlugController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { projectCode: 'P1', slug: 'board-1' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/show-by-slug throws when board is missing', async () => {
    Project.qm.getOneByCode.mockResolvedValue({ id: 'p1' });
    Board.qm.getOneByProjectIdAndSlug.mockResolvedValue(null);

    await expect(
      boardsShowBySlugController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { projectCode: 'P1', slug: 'board-1' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/show-by-slug throws when user lacks access', async () => {
    Project.qm.getOneByCode.mockResolvedValue({ id: 'p1' });
    Board.qm.getOneByProjectIdAndSlug.mockResolvedValue({ id: 'b1' });
    sails.helpers.users.isProjectManager.mockResolvedValue(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      boardsShowBySlugController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'member' } } },
        { projectCode: 'P1', slug: 'board-1' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('boards/show-by-slug returns board details', async () => {
    Project.qm.getOneByCode.mockResolvedValue({ id: 'p1', ownerProjectManagerId: null });
    Board.qm.getOneByProjectIdAndSlug.mockResolvedValue({ id: 'b1' });
    sails.helpers.users.isBoardSubscriber.mockResolvedValue(false);

    const result = await boardsShowBySlugController.fn.call(
      { req: { currentUser: { id: 'u1', role: 'admin' } } },
      { projectCode: 'P1', slug: 'board-1' },
    );

    expect(result).toMatchObject({
      item: { id: 'b1', isSubscribed: false },
      included: {
        boardMemberships: [],
        labels: [],
        lists: [],
        cards: [],
        cardLinks: [],
        cardMemberships: [],
        cardLabels: [],
        taskLists: [],
        tasks: [],
        customFieldGroups: [],
        customFields: [],
        customFieldValues: [],
        users: [],
        projects: [{ id: 'p1', ownerProjectManagerId: null }],
        attachments: [],
      },
    });
  });
});
