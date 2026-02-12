const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalList = global.List;
const originalLodash = global._;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('lists clear/move-cards/sort controllers', () => {
  let clearController;
  let moveCardsController;
  let sortController;

  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        users: {
          isProjectManager: jest.fn(),
        },
        lists: {
          getPathToProjectById: jest.fn(),
          clearOne: {
            with: jest.fn(),
          },
          moveCards: {
            with: jest.fn(),
          },
          sortOne: {
            with: jest.fn(),
          },
          isFinite: jest.fn(),
        },
      },
    };

    global.BoardMembership = {
      Roles: {
        EDITOR: 'editor',
      },
      qm: {
        getOneByBoardIdAndUserId: jest.fn(),
      },
    };

    global.List = {
      Types: {
        TRASH: 'trash',
      },
      SortFieldNames: {
        CREATED_AT: 'createdAt',
      },
      SortOrders: {
        ASC: 'asc',
        DESC: 'desc',
      },
      qm: {
        getOneById: jest.fn(),
      },
    };

    // eslint-disable-next-line global-require
    clearController = require('../api/controllers/lists/clear');
    // eslint-disable-next-line global-require
    moveCardsController = require('../api/controllers/lists/move-cards');
    // eslint-disable-next-line global-require
    sortController = require('../api/controllers/lists/sort');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.BoardMembership = originalBoardMembership;
    global.List = originalList;
    global._ = originalLodash;
  });

  test('lists/clear handles path, rights and list type checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(clearController.fn.call({ req }, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1', type: 'trash' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(clearController.fn.call({ req }, { id: 'l1' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1', type: 'trash' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'viewer',
    });
    await expect(clearController.fn.call({ req }, { id: 'l1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1', type: 'active' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    await expect(clearController.fn.call({ req }, { id: 'l1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('lists/clear clears trash list successfully', async () => {
    const req = { currentUser: { id: 'u1' } };
    const list = { id: 'l1', type: 'trash' };
    const board = { id: 'b1' };
    const project = { id: 'p1' };

    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable({ list, board, project }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValue(true);
    sails.helpers.lists.clearOne.with.mockResolvedValue(undefined);

    const result = await clearController.fn.call({ req }, { id: 'l1' });
    expect(result).toEqual({ item: list });
  });

  test('lists/move-cards handles access checks and missing target list', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(moveCardsController.fn.call({ req }, { id: 'l1', listId: 'l2' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(moveCardsController.fn.call({ req }, { id: 'l1', listId: 'l2' })).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'viewer',
    });
    await expect(moveCardsController.fn.call({ req }, { id: 'l1', listId: 'l2' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'editor',
    });
    List.qm.getOneById.mockResolvedValueOnce(null);
    await expect(moveCardsController.fn.call({ req }, { id: 'l1', listId: 'l2' })).rejects.toEqual({
      listNotFound: 'List not found',
    });
  });

  test('lists/move-cards moves cards and returns included payload', async () => {
    const req = { currentUser: { id: 'u1' } };
    const list = { id: 'l1' };
    const board = { id: 'b1' };
    const project = { id: 'p1' };
    const nextList = { id: 'l2', boardId: 'b1' };
    const cards = [{ id: 'c1' }];
    const actions = [{ id: 'a1' }];

    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable({ list, board, project }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: 'editor',
    });
    List.qm.getOneById.mockResolvedValue(nextList);
    sails.helpers.lists.isFinite.mockReturnValue(true);
    sails.helpers.lists.moveCards.with.mockResolvedValue({ cards, actions });

    const result = await moveCardsController.fn.call({ req }, { id: 'l1', listId: 'l2' });

    expect(sails.helpers.lists.moveCards.with).toHaveBeenCalledWith({
      project,
      board,
      record: list,
      values: {
        list: nextList,
      },
      allowFiniteList: true,
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({
      item: list,
      included: {
        cards,
        actions,
      },
    });
  });

  test('lists/sort handles access checks and endless-list restriction', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      sortController.fn.call({ req }, { id: 'l1', fieldName: 'createdAt' }),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      sortController.fn.call({ req }, { id: 'l1', fieldName: 'createdAt' }),
    ).rejects.toEqual({
      listNotFound: 'List not found',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'viewer',
    });
    await expect(
      sortController.fn.call({ req }, { id: 'l1', fieldName: 'createdAt' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.lists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'editor',
    });
    sails.helpers.lists.sortOne.with.mockReturnValueOnce(
      makeInterceptable([], 'cannotBeSortedAsEndlessList'),
    );
    await expect(
      sortController.fn.call({ req }, { id: 'l1', fieldName: 'createdAt' }),
    ).rejects.toEqual({
      cannotBeSortedAsEndlessList: 'Cannot be sorted as endless list',
    });
  });

  test('lists/sort sorts cards and returns included payload', async () => {
    const req = { currentUser: { id: 'u1' } };
    const list = { id: 'l1' };
    const board = { id: 'b1' };
    const project = { id: 'p1' };
    const cards = [{ id: 'c1' }];

    sails.helpers.lists.getPathToProjectById.mockReturnValue(
      makeInterceptable({ list, board, project }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: 'editor',
    });
    sails.helpers.lists.sortOne.with.mockReturnValue(makeInterceptable(cards));

    const result = await sortController.fn.call(
      { req },
      { id: 'l1', fieldName: 'createdAt', order: 'asc' },
    );

    expect(sails.helpers.lists.sortOne.with).toHaveBeenCalledWith({
      options: {
        fieldName: 'createdAt',
        order: 'asc',
      },
      project,
      board,
      record: list,
      actorUser: req.currentUser,
      request: req,
    });
    expect(result).toEqual({
      item: list,
      included: {
        cards,
      },
    });
  });
});
