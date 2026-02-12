const commentsCreateController = require('../api/controllers/comments/create');
const commentsDeleteController = require('../api/controllers/comments/delete');
const commentsIndexController = require('../api/controllers/comments/index');
const commentsUpdateController = require('../api/controllers/comments/update');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalComment = global.Comment;
const originalUser = global.User;
const originalLodash = global._;

const makeInterceptable = (value, shouldThrowPathNotFound = false) => ({
  intercept(code, handler) {
    if (shouldThrowPathNotFound && code === 'pathNotFound') {
      throw handler();
    }

    return value;
  },
});

describe('comments controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        cards: {
          getPathToProjectById: jest.fn(),
        },
        comments: {
          getPathToProjectById: jest.fn(),
          createOne: {
            with: jest.fn(),
          },
          deleteOne: {
            with: jest.fn(),
          },
          updateOne: {
            with: jest.fn(),
          },
        },
        users: {
          isProjectManager: jest.fn(),
          presentMany: jest.fn(),
        },
        utils: {
          mapRecords: jest.fn(),
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

    global.Comment = {
      qm: {
        getByCardId: jest.fn(),
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
    global.BoardMembership = originalBoardMembership;
    global.Comment = originalComment;
    global.User = originalUser;
    global._ = originalLodash;
  });

  test('comments/create handles missing card path and permission checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(null, true));
    await expect(
      commentsCreateController.fn.call({ req }, { cardId: 'c1', text: 'Hello' }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      commentsCreateController.fn.call({ req }, { cardId: 'c1', text: 'Hello' }),
    ).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'viewer',
      canComment: false,
    });
    await expect(
      commentsCreateController.fn.call({ req }, { cardId: 'c1', text: 'Hello' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('comments/create creates comment when user can comment', async () => {
    const req = { currentUser: { id: 'u1' } };
    const card = { id: 'c1' };
    const list = { id: 'l1' };
    const board = { id: 'b1' };
    const project = { id: 'p1' };
    const created = { id: 'cm1', text: 'Hello' };

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable({ card, list, board, project }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: 'viewer',
      canComment: true,
    });
    sails.helpers.comments.createOne.with.mockResolvedValue(created);

    const result = await commentsCreateController.fn.call({ req }, { cardId: 'c1', text: 'Hello' });

    expect(sails.helpers.comments.createOne.with).toHaveBeenCalledWith({
      project,
      board,
      list,
      values: {
        text: 'Hello',
        card,
        user: req.currentUser,
      },
      request: req,
    });
    expect(result).toEqual({ item: created });
  });

  test('comments/create allows editors without canComment flag', async () => {
    const req = { currentUser: { id: 'u1' } };
    const card = { id: 'c1' };
    const list = { id: 'l1' };
    const board = { id: 'b1' };
    const project = { id: 'p1' };
    const created = { id: 'cm2', text: 'Editor comment' };

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable({ card, list, board, project }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({
      role: 'editor',
      canComment: false,
    });
    sails.helpers.comments.createOne.with.mockResolvedValue(created);

    const result = await commentsCreateController.fn.call(
      { req },
      { cardId: 'c1', text: 'Editor comment' },
    );

    expect(result).toEqual({ item: created });
  });

  test('comments/delete handles missing path and forbidden variants', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(makeInterceptable(null, true));
    await expect(commentsDeleteController.fn.call({ req }, { id: 'cm1' })).rejects.toEqual({
      commentNotFound: 'Comment not found',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        comment: { id: 'cm1', userId: 'u2' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(commentsDeleteController.fn.call({ req }, { id: 'cm1' })).rejects.toEqual({
      commentNotFound: 'Comment not found',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        comment: { id: 'cm1', userId: 'u2' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'viewer',
      canComment: true,
    });
    await expect(commentsDeleteController.fn.call({ req }, { id: 'cm1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        comment: { id: 'cm1', userId: 'u1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'viewer',
      canComment: false,
    });
    await expect(commentsDeleteController.fn.call({ req }, { id: 'cm1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('comments/delete deletes and returns comment', async () => {
    const req = { currentUser: { id: 'u1' } };
    const path = {
      comment: { id: 'cm1', userId: 'u2' },
      card: { id: 'c1' },
      list: { id: 'l1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.comments.deleteOne.with.mockResolvedValueOnce(null);
    await expect(commentsDeleteController.fn.call({ req }, { id: 'cm1' })).rejects.toEqual({
      commentNotFound: 'Comment not found',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(true);
    sails.helpers.comments.deleteOne.with.mockResolvedValueOnce({ id: 'cm1' });
    const result = await commentsDeleteController.fn.call({ req }, { id: 'cm1' });

    expect(result).toEqual({ item: { id: 'cm1' } });
  });

  test('comments/index handles missing card and missing membership', async () => {
    const req = { currentUser: { id: 'u1', role: 'member' } };

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(makeInterceptable(null, true));
    await expect(commentsIndexController.fn.call({ req }, { cardId: 'c1' })).rejects.toEqual({
      cardNotFound: 'Card not found',
    });

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        card: { id: 'c1', boardId: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(commentsIndexController.fn.call({ req }, { cardId: 'c1' })).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('comments/index requires access when project has owner manager', async () => {
    const req = { currentUser: { id: 'u1', role: 'admin' } };

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        card: { id: 'c1', boardId: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: 'pm1' },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);

    await expect(commentsIndexController.fn.call({ req }, { cardId: 'c1' })).rejects.toEqual({
      cardNotFound: 'Card not found',
    });
  });

  test('comments/index returns comments and included users', async () => {
    const req = { currentUser: { id: 'u1', role: 'admin' } };
    const comments = [{ id: 'cm1', userId: 'u1' }];
    const users = [{ id: 'u1' }];

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        card: { id: 'c1', boardId: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    Comment.qm.getByCardId.mockResolvedValue(comments);
    sails.helpers.utils.mapRecords.mockReturnValue(['u1']);
    User.qm.getByIds.mockResolvedValue(users);
    sails.helpers.users.presentMany.mockReturnValue(users);

    const result = await commentsIndexController.fn.call(
      { req },
      { cardId: 'c1', beforeId: 'cm99' },
    );

    expect(Comment.qm.getByCardId).toHaveBeenCalledWith('c1', {
      beforeId: 'cm99',
    });
    expect(result).toEqual({
      items: comments,
      included: {
        users,
      },
    });
  });

  test('comments/update handles ownership and permissions', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(makeInterceptable(null, true));
    await expect(
      commentsUpdateController.fn.call({ req }, { id: 'cm1', text: 'X' }),
    ).rejects.toEqual({
      commentNotFound: 'Comment not found',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        comment: { id: 'cm1', userId: 'u2' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    await expect(
      commentsUpdateController.fn.call({ req }, { id: 'cm1', text: 'X' }),
    ).rejects.toEqual({
      commentNotFound: 'Comment not found',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        comment: { id: 'cm1', userId: 'u1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(
      commentsUpdateController.fn.call({ req }, { id: 'cm1', text: 'X' }),
    ).rejects.toEqual({
      commentNotFound: 'Comment not found',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        comment: { id: 'cm1', userId: 'u1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'viewer',
      canComment: false,
    });
    await expect(
      commentsUpdateController.fn.call({ req }, { id: 'cm1', text: 'X' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('comments/update updates and returns comment', async () => {
    const req = { currentUser: { id: 'u1' } };
    const path = {
      comment: { id: 'cm1', userId: 'u1' },
      card: { id: 'c1' },
      list: { id: 'l1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'editor',
      canComment: true,
    });
    sails.helpers.comments.updateOne.with.mockResolvedValueOnce(null);
    await expect(
      commentsUpdateController.fn.call({ req }, { id: 'cm1', text: 'X' }),
    ).rejects.toEqual({
      commentNotFound: 'Comment not found',
    });

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'editor',
      canComment: true,
    });
    sails.helpers.comments.updateOne.with.mockResolvedValueOnce({ id: 'cm1', text: 'Updated' });
    const result = await commentsUpdateController.fn.call({ req }, { id: 'cm1', text: 'Updated' });

    expect(result).toEqual({
      item: { id: 'cm1', text: 'Updated' },
    });
  });

  test('comments/update allows editors without canComment flag', async () => {
    const req = { currentUser: { id: 'u1' } };
    const path = {
      comment: { id: 'cm1', userId: 'u1' },
      card: { id: 'c1' },
      list: { id: 'l1' },
      board: { id: 'b1' },
      project: { id: 'p1' },
    };

    sails.helpers.comments.getPathToProjectById.mockReturnValueOnce(makeInterceptable(path));
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({
      role: 'editor',
      canComment: false,
    });
    sails.helpers.comments.updateOne.with.mockResolvedValueOnce({ id: 'cm1', text: 'Editor' });

    const result = await commentsUpdateController.fn.call({ req }, { id: 'cm1', text: 'Editor' });

    expect(result).toEqual({
      item: { id: 'cm1', text: 'Editor' },
    });
  });
});
