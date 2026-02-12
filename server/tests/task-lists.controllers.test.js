const createController = require('../api/controllers/task-lists/create');
const deleteController = require('../api/controllers/task-lists/delete');
const showController = require('../api/controllers/task-lists/show');
const updateController = require('../api/controllers/task-lists/update');

const originalSails = global.sails;
const originalBoardMembership = global.BoardMembership;
const originalUser = global.User;
const originalTask = global.Task;
const originalLodash = global._;

const makeInterceptable = (value, codeToThrow) => ({
  intercept(code, handler) {
    if (code === codeToThrow) {
      throw handler();
    }

    return value;
  },
});

describe('task-lists controllers', () => {
  beforeEach(() => {
    global._ = require('lodash'); // eslint-disable-line global-require

    global.sails = {
      helpers: {
        cards: {
          getPathToProjectById: jest.fn(),
        },
        taskLists: {
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

    global.User = {
      Roles: {
        ADMIN: 'admin',
      },
    };

    global.Task = {
      qm: {
        getByTaskListId: jest.fn(),
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.sails = originalSails;
    global.BoardMembership = originalBoardMembership;
    global.User = originalUser;
    global.Task = originalTask;
    global._ = originalLodash;
  });

  test('task-lists/create handles path and rights checks', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.cards.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(
      createController.fn.call({ req }, { cardId: 'c1', position: 0, name: 'Todo' }),
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
      createController.fn.call({ req }, { cardId: 'c1', position: 0, name: 'Todo' }),
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
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(
      createController.fn.call({ req }, { cardId: 'c1', position: 0, name: 'Todo' }),
    ).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });
  });

  test('task-lists/create creates task list', async () => {
    const req = { currentUser: { id: 'u1' } };
    const card = { id: 'c1' };
    const list = { id: 'l1' };
    const board = { id: 'b1' };
    const project = { id: 'p1' };
    const created = { id: 'tl1' };

    sails.helpers.cards.getPathToProjectById.mockReturnValue(
      makeInterceptable({ card, list, board, project }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'editor' });
    sails.helpers.taskLists.createOne.with.mockResolvedValue(created);

    const result = await createController.fn.call(
      { req },
      { cardId: 'c1', position: 0, name: 'Todo', showOnFrontOfCard: true },
    );

    expect(result).toEqual({ item: created });
  });

  test('task-lists/delete handles path/rights and missing delete result', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(deleteController.fn.call({ req }, { id: 'tl1' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(deleteController.fn.call({ req }, { id: 'tl1' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(deleteController.fn.call({ req }, { id: 'tl1' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.taskLists.deleteOne.with.mockResolvedValueOnce(null);
    await expect(deleteController.fn.call({ req }, { id: 'tl1' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });
  });

  test('task-lists/delete deletes task list', async () => {
    const req = { currentUser: { id: 'u1' } };
    const taskList = { id: 'tl1' };

    sails.helpers.taskLists.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        taskList,
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'editor' });
    sails.helpers.taskLists.deleteOne.with.mockResolvedValue(taskList);

    const result = await deleteController.fn.call({ req }, { id: 'tl1' });
    expect(result).toEqual({ item: taskList });
  });

  test('task-lists/show handles path and access checks', async () => {
    const req = { currentUser: { id: 'u1', role: 'member' } };

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(showController.fn.call({ req }, { id: 'tl1' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        board: { id: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    sails.helpers.users.isProjectManager.mockResolvedValueOnce(false);
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(showController.fn.call({ req }, { id: 'tl1' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });
  });

  test('task-lists/show returns task list with tasks', async () => {
    const req = { currentUser: { id: 'u1', role: 'admin' } };
    const taskList = { id: 'tl1' };
    const tasks = [{ id: 't1' }];

    sails.helpers.taskLists.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        taskList,
        board: { id: 'b1' },
        project: { id: 'p1', ownerProjectManagerId: null },
      }),
    );
    Task.qm.getByTaskListId.mockResolvedValue(tasks);

    const result = await showController.fn.call({ req }, { id: 'tl1' });
    expect(result).toEqual({
      item: taskList,
      included: { tasks },
    });
  });

  test('task-lists/update handles path/rights and missing update result', async () => {
    const req = { currentUser: { id: 'u1' } };

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({}, 'pathNotFound'),
    );
    await expect(updateController.fn.call({ req }, { id: 'tl1', name: 'Next' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'tl1', name: 'Next' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'viewer' });
    await expect(updateController.fn.call({ req }, { id: 'tl1', name: 'Next' })).rejects.toEqual({
      notEnoughRights: 'Not enough rights',
    });

    sails.helpers.taskLists.getPathToProjectById.mockReturnValueOnce(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValueOnce({ role: 'editor' });
    sails.helpers.taskLists.updateOne.with.mockResolvedValueOnce(null);
    await expect(updateController.fn.call({ req }, { id: 'tl1', name: 'Next' })).rejects.toEqual({
      taskListNotFound: 'Task list not found',
    });
  });

  test('task-lists/update updates task list', async () => {
    const req = { currentUser: { id: 'u1' } };
    const updated = { id: 'tl1', name: 'Next' };

    sails.helpers.taskLists.getPathToProjectById.mockReturnValue(
      makeInterceptable({
        taskList: { id: 'tl1' },
        card: { id: 'c1' },
        list: { id: 'l1' },
        board: { id: 'b1' },
        project: { id: 'p1' },
      }),
    );
    BoardMembership.qm.getOneByBoardIdAndUserId.mockResolvedValue({ role: 'editor' });
    sails.helpers.taskLists.updateOne.with.mockResolvedValue(updated);

    const result = await updateController.fn.call(
      { req },
      { id: 'tl1', name: 'Next', showOnFrontOfCard: true },
    );
    expect(result).toEqual({ item: updated });
  });
});
