const cardMembershipsCreateController = require('../api/controllers/card-memberships/create');
const cardMembershipsDeleteController = require('../api/controllers/card-memberships/delete');

const originalGlobals = {
  sails: global.sails,
  BoardMembership: global.BoardMembership,
  CardMembership: global.CardMembership,
  User: global.User,
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

describe('card-memberships controllers', () => {
  beforeEach(() => {
    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: { getOneByBoardIdAndUserId: jest.fn() },
    };

    global.CardMembership = {
      qm: { getOneByCardIdAndUserId: jest.fn() },
    };

    global.User = {
      qm: { getOneById: jest.fn() },
    };

    global.sails = {
      helpers: {
        cards: {
          getPathToProjectById: jest.fn(),
        },
        users: {
          isBoardMember: jest.fn(),
        },
        cardMemberships: {
          createOne: { with: jest.fn() },
          deleteOne: { with: jest.fn() },
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
    global.CardMembership = originalGlobals.CardMembership;
    global.User = originalGlobals.User;
  });

  test('card-memberships/create throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-memberships/create throws when board membership missing', async () => {
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
      cardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-memberships/create throws when member lacks rights', async () => {
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
      cardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('card-memberships/create throws when user not found', async () => {
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
    User.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('card-memberships/create throws when user is not board member', async () => {
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
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.users.isBoardMember.mockResolvedValue(false);

    await expect(
      cardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      userNotFound: 'User not found',
    });
  });

  test('card-memberships/create throws when user already card member', async () => {
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
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.users.isBoardMember.mockResolvedValue(true);
    sails.helpers.cardMemberships.createOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('userAlreadyCardMember'))),
    );

    await expect(
      cardMembershipsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      userAlreadyCardMember: 'User already card member',
    });
  });

  test('card-memberships/create returns created card membership', async () => {
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
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.users.isBoardMember.mockResolvedValue(true);
    sails.helpers.cardMemberships.createOne.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'cm1' })),
    );

    const result = await cardMembershipsCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { cardId: 'c1', userId: 'u2' },
    );

    expect(sails.helpers.cardMemberships.createOne.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      board: { id: 'b1' },
      list: { id: 'l1' },
      values: { card: { id: 'c1' }, user: { id: 'u2' } },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'cm1' } });
  });

  test('card-memberships/delete throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-memberships/delete throws when board membership missing', async () => {
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
      cardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-memberships/delete throws when member lacks rights', async () => {
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
      cardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('card-memberships/delete throws when user is not card member', async () => {
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
    CardMembership.qm.getOneByCardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      userNotCardMember: 'User not card member',
    });
  });

  test('card-memberships/delete throws when deleteOne returns null', async () => {
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
    CardMembership.qm.getOneByCardIdAndUserId.mockResolvedValue({ id: 'cm1', userId: 'u2' });
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.cardMemberships.deleteOne.with.mockResolvedValue(null);

    await expect(
      cardMembershipsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', userId: 'u2' },
      ),
    ).rejects.toEqual({
      userNotCardMember: 'User not card member',
    });
  });

  test('card-memberships/delete returns deleted card membership', async () => {
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
    CardMembership.qm.getOneByCardIdAndUserId.mockResolvedValue({ id: 'cm1', userId: 'u2' });
    User.qm.getOneById.mockResolvedValue({ id: 'u2' });
    sails.helpers.cardMemberships.deleteOne.with.mockResolvedValue({ id: 'cm1' });

    const result = await cardMembershipsDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { cardId: 'c1', userId: 'u2' },
    );

    expect(sails.helpers.cardMemberships.deleteOne.with).toHaveBeenCalledWith({
      user: { id: 'u2' },
      project: { id: 'p1' },
      board: { id: 'b1' },
      list: { id: 'l1' },
      card: { id: 'c1' },
      record: { id: 'cm1', userId: 'u2' },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'cm1' } });
  });
});
