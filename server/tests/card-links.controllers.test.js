const lodash = require('lodash');

const originalGlobals = {
  sails: global.sails,
  BoardMembership: global.BoardMembership,
  CardLink: global.CardLink,
  Card: global.Card,
  List: global.List,
  _: global._,
};

const cardLinkCreatableTypes = ['relates'];

global.CardLink = {
  ...(global.CardLink || {}),
  CreatableTypes: cardLinkCreatableTypes,
};

const cardLinksCreateController = require('../api/controllers/card-links/create');
const cardLinksDeleteController = require('../api/controllers/card-links/delete');
const cardLinksSearchController = require('../api/controllers/card-links/search');

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

describe('card-links controllers', () => {
  beforeEach(() => {
    global._ = lodash;

    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: { getOneByBoardIdAndUserId: jest.fn() },
    };

    global.Card = {
      qm: { getOneById: jest.fn() },
    };

    global.CardLink = {
      CreatableTypes: cardLinkCreatableTypes,
      qm: {
        getOneById: jest.fn(),
        getForCardId: jest.fn(),
      },
    };

    global.List = {
      qm: {
        getOneById: jest.fn(),
        getByIds: jest.fn(),
      },
    };

    global.sails = {
      helpers: {
        cards: {
          getPathToProjectById: jest.fn(),
        },
        boards: {
          getPathToProjectById: jest.fn(),
        },
        cardLinks: {
          createOne: { with: jest.fn() },
          deleteOne: { with: jest.fn() },
        },
      },
      sendNativeQuery: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalGlobals.sails;
    global.BoardMembership = originalGlobals.BoardMembership;
    global.CardLink = originalGlobals.CardLink;
    global.Card = originalGlobals.Card;
    global.List = originalGlobals.List;
    global._ = originalGlobals._;
  });

  test('card-links/create throws when linking card to itself', async () => {
    await expect(
      cardLinksCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', linkedCardId: 'c1', type: 'relates' },
      ),
    ).rejects.toEqual({
      cardCannotLinkToItself: 'Card cannot link to itself',
    });
  });

  test('card-links/create throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardLinksCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', linkedCardId: 'c2', type: 'relates' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-links/create throws when board membership missing', async () => {
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
      cardLinksCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', linkedCardId: 'c2', type: 'relates' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-links/create throws when member lacks rights', async () => {
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
      cardLinksCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', linkedCardId: 'c2', type: 'relates' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('card-links/create throws when linked card not found', async () => {
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
    Card.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardLinksCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', linkedCardId: 'c2', type: 'relates' },
      ),
    ).rejects.toEqual({
      linkedCardNotFound: 'Linked card not found',
    });
  });

  test('card-links/create throws when linked list not found', async () => {
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
    Card.qm.getOneById.mockResolvedValue({ id: 'c2', boardId: 'b1', listId: 'l2' });
    List.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardLinksCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', linkedCardId: 'c2', type: 'relates' },
      ),
    ).rejects.toEqual({
      linkedCardNotFound: 'Linked card not found',
    });
  });

  test('card-links/create throws when card link already exists', async () => {
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
    Card.qm.getOneById.mockResolvedValue({ id: 'c2', boardId: 'b1', listId: 'l2' });
    List.qm.getOneById.mockResolvedValue({ id: 'l2' });
    sails.helpers.cardLinks.createOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('cardLinkAlreadyExists'))),
    );

    await expect(
      cardLinksCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', linkedCardId: 'c2', type: 'relates' },
      ),
    ).rejects.toEqual({
      cardLinkAlreadyExists: 'Card link already exists',
    });
  });

  test('card-links/create returns created card link', async () => {
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
    Card.qm.getOneById.mockResolvedValue({ id: 'c2', boardId: 'b1', listId: 'l2' });
    List.qm.getOneById.mockResolvedValue({ id: 'l2' });
    sails.helpers.cardLinks.createOne.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'cl1' })),
    );

    const result = await cardLinksCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { cardId: 'c1', linkedCardId: 'c2', type: 'relates' },
    );

    expect(sails.helpers.cardLinks.createOne.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      board: { id: 'b1' },
      list: { id: 'l1' },
      linkedList: { id: 'l2' },
      values: {
        card: { id: 'c1' },
        linkedCard: { id: 'c2', boardId: 'b1', listId: 'l2' },
        type: 'relates',
      },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'cl1' } });
  });

  test('card-links/delete throws when card link is missing', async () => {
    CardLink.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardLinksDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'cl1' }),
    ).rejects.toEqual({
      cardLinkNotFound: 'Card link not found',
    });
  });

  test('card-links/delete throws when card path is missing', async () => {
    CardLink.qm.getOneById.mockResolvedValue({ id: 'cl1', cardId: 'c1', linkedCardId: 'c2' });
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardLinksDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'cl1' }),
    ).rejects.toEqual({
      cardLinkNotFound: 'Card link not found',
    });
  });

  test('card-links/delete throws when board membership missing', async () => {
    CardLink.qm.getOneById.mockResolvedValue({ id: 'cl1', cardId: 'c1', linkedCardId: 'c2' });
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
      cardLinksDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'cl1' }),
    ).rejects.toEqual({
      cardLinkNotFound: 'Card link not found',
    });
  });

  test('card-links/delete throws when member lacks rights', async () => {
    CardLink.qm.getOneById.mockResolvedValue({ id: 'cl1', cardId: 'c1', linkedCardId: 'c2' });
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
      cardLinksDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'cl1' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('card-links/delete throws when linked card not found', async () => {
    CardLink.qm.getOneById.mockResolvedValue({ id: 'cl1', cardId: 'c1', linkedCardId: 'c2' });
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
    Card.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardLinksDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'cl1' }),
    ).rejects.toEqual({
      cardLinkNotFound: 'Card link not found',
    });
  });

  test('card-links/delete throws when linked list not found', async () => {
    CardLink.qm.getOneById.mockResolvedValue({ id: 'cl1', cardId: 'c1', linkedCardId: 'c2' });
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
    Card.qm.getOneById.mockResolvedValue({ id: 'c2', boardId: 'b1', listId: 'l2' });
    List.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardLinksDeleteController.fn.call({ req: { currentUser: { id: 'u1' } } }, { id: 'cl1' }),
    ).rejects.toEqual({
      cardLinkNotFound: 'Card link not found',
    });
  });

  test('card-links/delete returns deleted card link', async () => {
    CardLink.qm.getOneById.mockResolvedValue({ id: 'cl1', cardId: 'c1', linkedCardId: 'c2' });
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
    Card.qm.getOneById.mockResolvedValue({ id: 'c2', boardId: 'b1', listId: 'l2' });
    List.qm.getOneById.mockResolvedValue({ id: 'l2' });
    sails.helpers.cardLinks.deleteOne.with.mockResolvedValue({ id: 'cl1' });

    const result = await cardLinksDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { id: 'cl1' },
    );

    expect(sails.helpers.cardLinks.deleteOne.with).toHaveBeenCalledWith({
      record: { id: 'cl1', cardId: 'c1', linkedCardId: 'c2' },
      card: { id: 'c1' },
      linkedCard: { id: 'c2', boardId: 'b1', listId: 'l2' },
      project: { id: 'p1' },
      board: { id: 'b1' },
      list: { id: 'l1' },
      linkedList: { id: 'l2' },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'cl1', cardId: 'c1', linkedCardId: 'c2' } });
  });

  test('card-links/search throws when board path is missing', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardLinksSearchController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', cardId: 'c1', search: 'test' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('card-links/search throws when board membership missing', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' } })),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue(null);

    await expect(
      cardLinksSearchController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', cardId: 'c1', search: 'test' },
      ),
    ).rejects.toEqual({
      boardNotFound: 'Board not found',
    });
  });

  test('card-links/search throws when card not found', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' } })),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    Card.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardLinksSearchController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', cardId: 'c1', search: 'test' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-links/search throws when card is not on board', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' } })),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    Card.qm.getOneById.mockResolvedValue({ id: 'c1', boardId: 'b2' });

    await expect(
      cardLinksSearchController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { boardId: 'b1', cardId: 'c1', search: 'test' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-links/search returns matching cards and lists', async () => {
    sails.helpers.boards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.resolve({ board: { id: 'b1' } })),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: BoardMembership.Roles.EDITOR,
    });
    Card.qm.getOneById.mockResolvedValue({ id: 'c1', boardId: 'b1' });
    CardLink.qm.getForCardId.mockResolvedValue([
      { id: 'cl1', cardId: 'c1', linkedCardId: 'c2' },
      { id: 'cl2', cardId: 'c3', linkedCardId: 'c1' },
    ]);
    sails.sendNativeQuery.mockResolvedValue({
      rows: [
        {
          id: 'c9',
          name: 'Alpha',
          description: null,
          number: 42,
          list_id: 'l9',
          board_id: 'b1',
        },
      ],
    });
    List.qm.getByIds.mockResolvedValue([{ id: 'l9' }]);

    const result = await cardLinksSearchController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { boardId: 'b1', cardId: 'c1', search: '#42' },
    );

    expect(sails.sendNativeQuery).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY card.name ASC LIMIT 20'),
      ['b1', 'c1', 'c2', 'c3', 42],
    );
    expect(sails.sendNativeQuery.mock.calls[0][0]).toContain('card.number');
    expect(List.qm.getByIds).toHaveBeenCalledWith(['l9']);
    expect(result).toEqual({
      items: [
        {
          id: 'c9',
          name: 'Alpha',
          description: null,
          number: 42,
          listId: 'l9',
          boardId: 'b1',
        },
      ],
      included: {
        lists: [{ id: 'l9' }],
      },
    });
  });
});
