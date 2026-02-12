const lodash = require('lodash');

const originalGlobals = {
  _: global._,
  BoardMembership: global.BoardMembership,
  User: global.User,
  sails: global.sails,
};

global._ = lodash;

global.BoardMembership = global.BoardMembership || {
  Roles: { MEMBER: 'member', OBSERVER: 'observer' },
};

global.User = global.User || { qm: {} };

const boardMembershipsCreateController = require('../api/controllers/board-memberships/create');
const boardMembershipsDeleteController = require('../api/controllers/board-memberships/delete');
const boardMembershipsUpdateController = require('../api/controllers/board-memberships/update');

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

describe('board-memberships controllers', () => {
  beforeEach(() => {
    global.sails = {
      helpers: {
        boards: {
          getPathToProjectById: jest.fn(),
        },
        users: {
          isProjectManager: jest.fn(),
          isAdminOrProjectOwner: jest.fn(),
        },
        boardMemberships: {
          createOne: { with: jest.fn() },
          getPathToProjectById: jest.fn(),
          deleteOne: { with: jest.fn() },
          updateOne: { with: jest.fn() },
        },
      },
    };

    global.User = {
      qm: {
        getOneById: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global._ = originalGlobals._;
    global.BoardMembership = originalGlobals.BoardMembership;
    global.User = originalGlobals.User;
    global.sails = originalGlobals.sails;
  });

  test('board-memberships/create throws when board path is missing', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      boardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', userId: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('board-memberships/create throws when user lacks access', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      boardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', userId: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('board-memberships/create throws when owner manager adds someone else', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          board: { id: 'b1' },
          project: { id: 'p1', ownerProjectManagerId: 'pm1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);

    await expect(
      boardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', userId: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('board-memberships/create throws when non-admin adds someone else', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(false);

    await expect(
      boardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', userId: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('board-memberships/create throws when user is missing', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    User.qm.getOneById.mockResolvedValue(null);

    await expect(
      boardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', userId: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('board-memberships/create throws when user already a member', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.boardMemberships.createOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('userAlreadyBoardMember'))),
    );

    await expect(
      boardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', userId: 'u2', role: 'member' },
      ),
    ).rejects.toEqual({
      userAlreadyBoardMember: 'User already board member',
    });
  });

  test('board-memberships/create returns created item', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' }, project: { id: 'p1' } })),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.users.isAdminOrProjectOwner.mockReturnValue(true);
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.boardMemberships.createOne.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'bm1' })),
    );

    const result = await boardMembershipsCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { boardId: 'b1', userId: 'u2', role: 'member', canComment: true },
    );

    expect(sails.helpers.boardMemberships.createOne.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      values: {
        role: 'member',
        canComment: true,
        board: { id: 'b1' },
        user: { id: 'u2' },
      },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'bm1' } });
  });

  test('board-memberships/delete throws for missing path', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      boardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bm1' },
      ),
    ).rejects.toEqual({
      boardMembershipNotFound: 'Board membership not found',
    });
  });

  test('board-memberships/delete throws when non-manager deletes someone else', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          boardMembership: { id: 'bm1', userId: 'u2' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      boardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bm1' },
      ),
    ).rejects.toEqual({
      boardMembershipNotFound: 'Board membership not found',
    });
  });

  test('board-memberships/delete throws when deleteOne returns null', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          boardMembership: { id: 'bm1', userId: 'u1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    User.qm.getOneById.mockResolvedValue({ id: 'u1' });
    sails.helpers.boardMemberships.deleteOne.with.mockResolvedValue(null);

    await expect(
      boardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bm1' },
      ),
    ).rejects.toEqual({
      boardMembershipNotFound: 'Board membership not found',
    });
  });

  test('board-memberships/delete returns deleted item', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          boardMembership: { id: 'bm1', userId: 'u1' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    User.qm.getOneById.mockResolvedValue({ id: 'u1' });
    sails.helpers.boardMemberships.deleteOne.with.mockResolvedValue({ id: 'bm1' });

    const result = await boardMembershipsDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'bm1' },
    );

    expect(result).toEqual({ item: { id: 'bm1' } });
  });

  test('board-memberships/update throws for missing path', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      boardMembershipsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bm1', role: 'member' },
      ),
    ).rejects.toEqual({
      boardMembershipNotFound: 'Board membership not found',
    });
  });

  test('board-memberships/update throws when user lacks access', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          boardMembership: { id: 'bm1', userId: 'u2' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(false);

    await expect(
      boardMembershipsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bm1', role: 'member' },
      ),
    ).rejects.toEqual({
      boardMembershipNotFound: 'Board membership not found',
    });
  });

  test('board-memberships/update throws when updateOne returns null', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          boardMembership: { id: 'bm1', userId: 'u2' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.boardMemberships.updateOne.with.mockResolvedValue(null);

    await expect(
      boardMembershipsUpdateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { id: 'bm1', role: 'member', canComment: true },
      ),
    ).rejects.toEqual({
      boardMembershipNotFound: 'Board membership not found',
    });
  });

  test('board-memberships/update returns updated item', async () => {
    sails.helpers.boardMemberships.getPathToProjectById.mockReturnValue(
      makeInterceptable(
        Promise.resolve({
          boardMembership: { id: 'bm1', userId: 'u2' },
          board: { id: 'b1' },
          project: { id: 'p1' },
        }),
      ),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.boardMemberships.updateOne.with.mockResolvedValue({ id: 'bm1' });

    const result = await boardMembershipsUpdateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'bm1', role: 'member', canComment: true },
    );

    expect(sails.helpers.boardMemberships.updateOne.with).toHaveBeenCalledWith({
      values: { role: 'member', canComment: true },
      project: { id: 'p1' },
      board: { id: 'b1' },
      record: { id: 'bm1', userId: 'u2' },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'bm1' } });
  });
});
