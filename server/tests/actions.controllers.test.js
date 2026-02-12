const actionsIndexInBoardController = require('../api/controllers/actions/index-in-board');
const actionsIndexInCardController = require('../api/controllers/actions/index-in-card');

const originalSails = global.sails;
const originalAction = global.Action;
const originalBoardMembership = global.BoardMembership;
const originalUser = global.User;

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

describe('actions controllers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(),
        },
        cards: {
          getPathToProjectById: jest.fn(),
        },
        users: {
          isProjectManager: jest.fn(),
          presentMany: jest.fn((users) => users),
        },
        utils: {
          mapRecords: jest.fn(),
        },
      },
    };

    global.Action = {
      qm: {
        getByBoardId: jest.fn(),
        getByCardId: jest.fn(),
      },
    };

    global.BoardMembership = {
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
      },
    };

    global.User = {
      Roles: {
        ADMIN: 'admin',
      },
      qm: {
        getByIds: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.Action = originalAction;
    global.BoardMembership = originalBoardMembership;
    global.User = originalUser;
  });

  test('actions/index-in-board throws when board is missing', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      actionsIndexInBoardController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { boardId: 'b1' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('actions/index-in-board throws when user lacks access', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          board: { id: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      actionsIndexInBoardController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { boardId: 'b1' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('actions/index-in-board returns actions with included users', async () => {
    const currentUser = { id: 'u1', role: 'user' };
    const actions = [{ id: 'a1', userId: 'u2' }];

    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          board: { id: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ id: 'bm1' });
    Action.qm.getByBoardId.mockResolvedValue(actions);
    sails.helpers.utils.mapRecords.mockReturnValue(['u2']);
    User.qm.getByIds.mockResolvedValue([{ id: 'u2' }]);
    sails.helpers.users.presentMany.mockReturnValue([{ id: 'u2', name: 'User' }]);

    const result = await actionsIndexInBoardController.fn.call(
      { req: { currentUser } },
      { boardId: 'b1', beforeId: 'a2' },
    );

    expect(Action.qm.getByBoardId).toHaveBeenCalledWith('b1', { beforeId: 'a2' });
    expect(User.qm.getByIds).toHaveBeenCalledWith(['u2']);
    expect(result).toEqual({
      items: actions,
      included: {
        users: [{ id: 'u2', name: 'User' }],
      },
    });
  });

  test('actions/index-in-card throws when card is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      actionsIndexInCardController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { cardId: 'c1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('actions/index-in-card throws when user lacks access', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1', boardId: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      actionsIndexInCardController.fn.call(
        { req: { currentUser: { id: 'u1', role: 'user' } } },
        { cardId: 'c1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('actions/index-in-card returns actions with included users', async () => {
    const currentUser = { id: 'u1', role: 'user' };
    const actions = [{ id: 'a1', userId: 'u2' }];

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          card: { id: 'c1', boardId: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: null },
        }),
      ),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ id: 'bm1' });
    Action.qm.getByCardId.mockResolvedValue(actions);
    sails.helpers.utils.mapRecords.mockReturnValue(['u2']);
    User.qm.getByIds.mockResolvedValue([{ id: 'u2' }]);
    sails.helpers.users.presentMany.mockReturnValue([{ id: 'u2', name: 'User' }]);

    const result = await actionsIndexInCardController.fn.call(
      { req: { currentUser } },
      { cardId: 'c1', beforeId: 'a2' },
    );

    expect(Action.qm.getByCardId).toHaveBeenCalledWith('c1', { beforeId: 'a2' });
    expect(User.qm.getByIds).toHaveBeenCalledWith(['u2']);
    expect(result).toEqual({
      items: actions,
      included: {
        users: [{ id: 'u2', name: 'User' }],
      },
    });
  });
});
