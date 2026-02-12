const cardLabelsCreateController = require('../api/controllers/card-labels/create');
const cardLabelsDeleteController = require('../api/controllers/card-labels/delete');

const originalGlobals = {
  sails: global.sails,
  BoardMembership: global.BoardMembership,
  Label: global.Label,
  CardLabel: global.CardLabel,
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

describe('card-labels controllers', () => {
  beforeEach(() => {
    global.BoardMembership = {
      Roles: { EDITOR: 'editor' },
      qm: { getOneByBoardIdAndUserId: jest.fn() },
    };

    global.Label = {
      qm: { getOneById: jest.fn() },
    };

    global.CardLabel = {
      qm: { getOneByCardIdAndLabelId: jest.fn() },
    };

    global.sails = {
      helpers: {
        cards: {
          getPathToProjectById: jest.fn(),
        },
        cardLabels: {
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
    global.Label = originalGlobals.Label;
    global.CardLabel = originalGlobals.CardLabel;
  });

  test('card-labels/create throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardLabelsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-labels/create throws when board membership missing', async () => {
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
      cardLabelsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-labels/create throws when member lacks rights', async () => {
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
      cardLabelsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('card-labels/create throws when label not found', async () => {
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
    Label.qm.getOneById.mockResolvedValue(null);

    await expect(
      cardLabelsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      labelNotFound: 'Label not found',
    });
  });

  test('card-labels/create throws when label already in card', async () => {
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
    Label.qm.getOneById.mockResolvedValue({ id: 'l1' });
    sails.helpers.cardLabels.createOne.with.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('labelAlreadyInCard'))),
    );

    await expect(
      cardLabelsCreateController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      labelAlreadyInCard: 'Label already in card',
    });
  });

  test('card-labels/create returns created card label', async () => {
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
    Label.qm.getOneById.mockResolvedValue({ id: 'l1' });
    sails.helpers.cardLabels.createOne.with.mockReturnValue(
      makeInterceptable(Promise.resolve({ id: 'cl1' })),
    );

    const result = await cardLabelsCreateController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { cardId: 'c1', labelId: 'l1' },
    );

    expect(sails.helpers.cardLabels.createOne.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      board: { id: 'b1' },
      list: { id: 'l1' },
      values: { card: { id: 'c1' }, label: { id: 'l1' } },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'cl1' } });
  });

  test('card-labels/delete throws when card path is missing', async () => {
    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable(Promise.reject(buildError('pathNotFound'))),
    );

    await expect(
      cardLabelsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-labels/delete throws when board membership missing', async () => {
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
      cardLabelsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('card-labels/delete throws when member lacks rights', async () => {
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
      cardLabelsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('card-labels/delete throws when label not in card', async () => {
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
    CardLabel.qm.getOneByCardIdAndLabelId.mockResolvedValue(null);

    await expect(
      cardLabelsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      labelNotInCard: 'Label not in card',
    });
  });

  test('card-labels/delete throws when deleteOne returns null', async () => {
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
    CardLabel.qm.getOneByCardIdAndLabelId.mockResolvedValue({ id: 'cl1' });
    sails.helpers.cardLabels.deleteOne.with.mockResolvedValue(null);

    await expect(
      cardLabelsDeleteController.fn.call(
        { req: { currentUser: { id: 'u1' } } },
        { cardId: 'c1', labelId: 'l1' },
      ),
    ).rejects.toEqual({
      labelNotInCard: 'Label not in card',
    });
  });

  test('card-labels/delete returns deleted card label', async () => {
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
    CardLabel.qm.getOneByCardIdAndLabelId.mockResolvedValue({ id: 'cl1' });
    sails.helpers.cardLabels.deleteOne.with.mockResolvedValue({ id: 'cl1' });

    const result = await cardLabelsDeleteController.fn.call(
      { req: { currentUser: { id: 'u1' } } },
      { cardId: 'c1', labelId: 'l1' },
    );

    expect(sails.helpers.cardLabels.deleteOne.with).toHaveBeenCalledWith({
      project: { id: 'p1' },
      board: { id: 'b1' },
      list: { id: 'l1' },
      card: { id: 'c1' },
      record: { id: 'cl1' },
      actorUser: { id: 'u1' },
      request: { currentUser: { id: 'u1' } },
    });
    expect(result).toEqual({ item: { id: 'cl1' } });
  });
});
